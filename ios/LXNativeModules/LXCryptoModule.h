#import <React/RCTBridgeModule.h>

/**
 * CryptoModule exposes AES / RSA / SHA1 primitives to JavaScript.
 *
 * Contract (mirrors src/utils/nativeModules/crypto.ts and the Android
 * com.lxnetease.music.mobile.crypto package):
 *   - All `text` / `key` / `iv` inputs are base64 strings. They are base64
 *     decoded into NSData before any operation, and results are base64
 *     encoded back into strings.
 *   - AES uses CommonCrypto (CBC+PKCS7 or ECB+NoPadding).
 *   - RSA uses Security.framework SecKey (X.509 SPKI public keys, PKCS#8
 *     private keys; OAEP-SHA1 or raw/no-padding).
 *   - generateRsaKey returns X.509 + PKCS#8 DER wrapped keys base64 encoded,
 *     identical to the Android implementation so the JS layer can interoperate
 *     with the music APIs.
 */
@interface LXCryptoModule : NSObject <RCTBridgeModule>
@end
