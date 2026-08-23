#import "LXCryptoModule.h"
#import <React/RCTBridgeModule.h>
#import <CommonCrypto/CommonCrypto.h>
#import <Security/Security.h>

#pragma mark - base64 helpers

static NSData *LXBase64Decode(NSString *str) {
  if (!str) return nil;
  return [[NSData alloc] initWithBase64EncodedString:str
                                             options:NSDataBase64DecodingIgnoreUnknownCharacters];
}

static NSString *LXBase64Encode(NSData *data) {
  if (!data) return @"";
  // options:0 => no line breaks (equivalent to Android Base64.NO_WRAP)
  return [data base64EncodedStringWithOptions:0];
}

#pragma mark - ASN.1 DER helpers

static void LXAppendDERLength(NSMutableData *out, NSUInteger length) {
  if (length < 0x80) {
    uint8_t b = (uint8_t)length;
    [out appendBytes:&b length:1];
  } else if (length <= 0xFF) {
    uint8_t header = 0x81;
    uint8_t b = (uint8_t)length;
    [out appendBytes:&header length:1];
    [out appendBytes:&b length:1];
  } else {
    uint8_t header = 0x82;
    uint8_t hi = (uint8_t)((length >> 8) & 0xFF);
    uint8_t lo = (uint8_t)(length & 0xFF);
    [out appendBytes:&header length:1];
    [out appendBytes:&hi length:1];
    [out appendBytes:&lo length:1];
  }
}

static NSData *LXDERSequence(NSData *content) {
  NSMutableData *out = [NSMutableData data];
  uint8_t seqTag = 0x30;  // SEQUENCE
  [out appendBytes:&seqTag length:1];
  LXAppendDERLength(out, content.length);
  [out appendData:content];
  return out;
}

// rsaEncryption OID 1.2.840.113549.1.1.1, NULL
static NSData *LXRSAAlgorithmIdentifier(void) {
  // SEQUENCE { OID 1.2.840.113549.1.1.1, NULL }
  uint8_t bytes[] = {
      0x30, 0x0D,
      0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01,
      0x05, 0x00};
  return [NSData dataWithBytes:bytes length:sizeof(bytes)];
}

// Wrap a PKCS#1 RSA public key DER into an X.509 SubjectPublicKeyInfo.
static NSData *LXPublicKeyToX509(NSData *pkcs1) {
  NSMutableData *content = [NSMutableData data];
  [content appendData:LXRSAAlgorithmIdentifier()];
  // BIT STRING <pkcs1>  (leading unused-bits byte = 0)
  uint8_t bitStringTag = 0x03;
  NSMutableData *bitString = [NSMutableData data];
  uint8_t unusedBits = 0x00;
  [bitString appendBytes:&unusedBits length:1];
  [bitString appendData:pkcs1];
  [content appendBytes:&bitStringTag length:1];
  LXAppendDERLength(content, bitString.length);
  [content appendData:bitString];
  return LXDERSequence(content);
}

// Wrap a PKCS#1 RSA private key DER into a PKCS#8 PrivateKeyInfo.
static NSData *LXPrivateKeyToPKCS8(NSData *pkcs1) {
  NSMutableData *content = [NSMutableData data];
  // version INTEGER 0
  uint8_t version[] = {0x02, 0x01, 0x00};
  [content appendBytes:version length:sizeof(version)];
  [content appendData:LXRSAAlgorithmIdentifier()];
  // OCTET STRING <pkcs1>
  uint8_t octetTag = 0x04;
  [content appendBytes:&octetTag length:1];
  LXAppendDERLength(content, pkcs1.length);
  [content appendData:pkcs1];
  return LXDERSequence(content);
}

@implementation LXCryptoModule

RCT_EXPORT_MODULE(CryptoModule)

#pragma mark - key generation

- (void)generateRsaKey:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  NSDictionary *attrs = @{
    (__bridge id)kSecAttrKeyType: (__bridge id)kSecAttrKeyTypeRSA,
    (__bridge id)kSecAttrKeySizeInBits: @2048,
  };
  SecKeyRef publicKey = NULL;
  SecKeyRef privateKey = NULL;
  OSStatus status = SecKeyGeneratePair((__bridge CFDictionaryRef)attrs, &publicKey, &privateKey);
  if (status != errSecSuccess || !publicKey || !privateKey) {
    if (publicKey) CFRelease(publicKey);
    if (privateKey) CFRelease(privateKey);
    reject(@"-1", @"Failed to generate RSA key pair", nil);
    return;
  }

  CFErrorRef error = NULL;
  NSData *publicPKCS1 = (NSData *)CFBridgingRelease(SecKeyCopyExternalRepresentation(publicKey, &error));
  NSData *privatePKCS1 = (NSData *)CFBridgingRelease(SecKeyCopyExternalRepresentation(privateKey, &error));
  CFRelease(publicKey);
  CFRelease(privateKey);

  if (!publicPKCS1 || !privatePKCS1) {
    reject(@"-1", @"Failed to export RSA key", (__bridge NSError *)error);
    return;
  }

  resolve(@{
    @"publicKey": LXBase64Encode(LXPublicKeyToX509(publicPKCS1)),
    @"privateKey": LXBase64Encode(LXPrivateKeyToPKCS8(privatePKCS1)),
  });
}

#pragma mark - RSA helpers

- (SecKeyRef)LXKeyFromBase64:(NSString *)base64 class:(CFTypeRef)keyClass {
  NSData *der = LXBase64Decode(base64);
  if (!der) return NULL;
  NSDictionary *attrs = @{
    (__bridge id)kSecAttrKeyType: (__bridge id)kSecAttrKeyTypeRSA,
    (__bridge id)keyClass: (__bridge id)keyClass,
  };
  CFErrorRef error = NULL;
  SecKeyRef key = SecKeyCreateWithData((__bridge CFDataRef)der,
                                       (__bridge CFDictionaryRef)attrs,
                                       &error);
  if (error) {
    CFRelease(error);
    return NULL;
  }
  return key;
}

- (NSString *)rsaEncryptText:(NSString *)text key:(NSString *)key padding:(NSString *)padding {
  SecKeyRef publicKey = [self LXKeyFromBase64:key class:kSecAttrKeyClassPublic];
  if (!publicKey) return nil;
  SecKeyAlgorithm alg = [padding isEqualToString:@"RSA/ECB/OAEPWithSHA1AndMGF1Padding"]
      ? kSecKeyAlgorithmRSAEncryptionOAEPSHA1
      : kSecKeyAlgorithmRSAEncryptionRaw;
  NSData *plain = LXBase64Decode(text);
  if (!plain) {
    CFRelease(publicKey);
    return nil;
  }
  CFErrorRef error = NULL;
  NSData *cipher = (NSData *)CFBridgingRelease(
      SecKeyCreateEncryptedData(publicKey, alg, (__bridge CFDataRef)plain, &error));
  CFRelease(publicKey);
  if (error) {
    CFRelease(error);
    return nil;
  }
  return LXBase64Encode(cipher);
}

- (NSString *)rsaDecryptText:(NSString *)text key:(NSString *)key padding:(NSString *)padding {
  SecKeyRef privateKey = [self LXKeyFromBase64:key class:kSecAttrKeyClassPrivate];
  if (!privateKey) return nil;
  SecKeyAlgorithm alg = [padding isEqualToString:@"RSA/ECB/OAEPWithSHA1AndMGF1Padding"]
      ? kSecKeyAlgorithmRSAEncryptionOAEPSHA1
      : kSecKeyAlgorithmRSAEncryptionRaw;
  NSData *cipher = LXBase64Decode(text);
  if (!cipher) {
    CFRelease(privateKey);
    return nil;
  }
  CFErrorRef error = NULL;
  NSData *plain = (NSData *)CFBridgingRelease(
      SecKeyCreateDecryptedData(privateKey, alg, (__bridge CFDataRef)cipher, &error));
  CFRelease(privateKey);
  if (error) {
    CFRelease(error);
    return nil;
  }
  // Android returns `new String(decryptedBytes)` (UTF-8).
  return [[NSString alloc] initWithData:plain encoding:NSUTF8StringEncoding] ?: @"";
}

#pragma mark - AES helpers

- (NSString *)aesTransform:(BOOL)encrypt
                      text:(NSString *)text
                       key:(NSString *)key
                        iv:(NSString *)iv
                      mode:(NSString *)mode {
  NSData *data = LXBase64Decode(text);
  NSData *keyData = LXBase64Decode(key);
  if (!data || !keyData) return nil;

  BOOL isECB = [mode isEqualToString:@"AES"];  // "AES" == ECB NoPadding
  NSData *ivData = isECB ? nil : LXBase64Decode(iv);

  uint8_t ivBytes[16] = {0};
  if (!isECB && ivData && ivData.length > 0) {
    NSUInteger len = MIN(ivData.length, 16);
    memcpy(ivBytes, ivData.bytes, len);
  }

  CCOptions options = isECB ? kCCOptionECBMode : kCCOptionPKCS7Padding;
  size_t keyLength = keyData.length;
  size_t bufferSize = data.length + kCCBlockSizeAES128;
  void *buffer = malloc(bufferSize);
  if (!buffer) return nil;

  size_t outLength = 0;
  CCCryptorStatus status = CCCrypt(encrypt ? kCCEncrypt : kCCDecrypt,
                                   kCCAlgorithmAES,
                                   options,
                                   keyData.bytes,
                                   keyLength,
                                   isECB ? NULL : ivBytes,
                                   data.bytes,
                                   data.length,
                                   buffer,
                                   bufferSize,
                                   &outLength);
  if (status != kCCSuccess) {
    free(buffer);
    return nil;
  }

  NSData *outData = [NSData dataWithBytesNoCopy:buffer length:outLength freeWhenDone:YES];
  if (encrypt) {
    return LXBase64Encode(outData);
  }
  // Android decrypt returns `new String(cipher.doFinal(data), UTF_8)`.
  return [[NSString alloc] initWithData:outData encoding:NSUTF8StringEncoding] ?: @"";
}

#pragma mark - exported methods

RCT_EXPORT_METHOD(rsaEncrypt:(NSString *)text
                      key:(NSString *)key
                   padding:(NSString *)padding
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject) {
  NSString *result = [self rsaEncryptText:text key:key padding:padding];
  if (result) {
    resolve(result);
  } else {
    reject(@"RSA_ENCRYPT_ERROR", @"RSA encrypt failed", nil);
  }
}

RCT_EXPORT_METHOD(rsaDecrypt:(NSString *)text
                      key:(NSString *)key
                   padding:(NSString *)padding
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject) {
  NSString *result = [self rsaDecryptText:text key:key padding:padding];
  if (result) {
    resolve(result);
  } else {
    reject(@"RSA_DECRYPT_ERROR", @"RSA decrypt failed", nil);
  }
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(rsaEncryptSync:(NSString *)text
                                            key:(NSString *)key
                                         padding:(NSString *)padding) {
  return [self rsaEncryptText:text key:key padding:padding] ?: @"";
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(rsaDecryptSync:(NSString *)text
                                            key:(NSString *)key
                                         padding:(NSString *)padding) {
  return [self rsaDecryptText:text key:key padding:padding] ?: @"";
}

RCT_EXPORT_METHOD(aesEncrypt:(NSString *)text
                      key:(NSString *)key
                       iv:(NSString *)iv
                     mode:(NSString *)mode
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject) {
  NSString *result = [self aesTransform:YES text:text key:key iv:iv mode:mode];
  if (result) {
    resolve(result);
  } else {
    reject(@"AES_ENCRYPT_ERROR", @"AES encrypt failed", nil);
  }
}

RCT_EXPORT_METHOD(aesDecrypt:(NSString *)text
                      key:(NSString *)key
                       iv:(NSString *)iv
                     mode:(NSString *)mode
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject) {
  NSString *result = [self aesTransform:NO text:text key:key iv:iv mode:mode];
  if (result) {
    resolve(result);
  } else {
    reject(@"AES_DECRYPT_ERROR", @"AES decrypt failed", nil);
  }
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(aesEncryptSync:(NSString *)text
                                            key:(NSString *)key
                                             iv:(NSString *)iv
                                           mode:(NSString *)mode) {
  return [self aesTransform:YES text:text key:key iv:iv mode:mode] ?: @"";
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(aesDecryptSync:(NSString *)text
                                            key:(NSString *)key
                                             iv:(NSString *)iv
                                           mode:(NSString *)mode) {
  return [self aesTransform:NO text:text key:key iv:iv mode:mode] ?: @"";
}

RCT_EXPORT_METHOD(sha1:(NSString *)text
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  NSData *data = [text dataUsingEncoding:NSUTF8StringEncoding];
  if (!data) {
    reject(@"SHA1_ERROR", @"sha1 failed", nil);
    return;
  }
  uint8_t digest[CC_SHA1_DIGEST_LENGTH];
  CC_SHA1(data.bytes, (CC_LONG)data.length, digest);
  NSMutableString *hex = [NSMutableString stringWithCapacity:CC_SHA1_DIGEST_LENGTH * 2];
  for (int i = 0; i < CC_SHA1_DIGEST_LENGTH; i++) {
    [hex appendFormat:@"%02x", digest[i]];
  }
  resolve(hex);
}

@end
