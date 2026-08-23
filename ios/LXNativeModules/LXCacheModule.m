#import "LXCacheModule.h"
#import <React/RCTBridgeModule.h>

static unsigned long long LXDirectorySize(NSURL *url) {
  unsigned long long total = 0;
  if (!url) return 0;
  NSFileManager *fm = [NSFileManager defaultManager];
  NSDirectoryEnumerator *enumerator = [fm enumeratorAtURL:url
                               includingPropertiesForKeys:@[NSURLFileSizeKey]
                                                  options:NSDirectoryEnumerationSkipsHiddenFiles
                                             errorHandler:nil];
  for (NSURL *fileURL in enumerator) {
    NSNumber *size;
    if ([fileURL getResourceValue:&size forKey:NSURLFileSizeKey error:nil] && size) {
      total += size.unsignedLongLongValue;
    }
  }
  return total;
}

// Collect every child URL, then remove deepest-first so a parent directory is
// never removed before its children.
static void LXClearDirectory(NSURL *url) {
  if (!url) return;
  NSFileManager *fm = [NSFileManager defaultManager];
  NSMutableArray<NSURL *> *toRemove = [NSMutableArray array];
  NSDirectoryEnumerator *enumerator = [fm enumeratorAtURL:url
                               includingPropertiesForKeys:nil
                                                  options:0
                                             errorHandler:nil];
  for (NSURL *fileURL in enumerator) {
    if ([fileURL isEqual:url]) continue;
    [toRemove addObject:fileURL];
  }
  [toRemove sortUsingComparator:^NSComparisonResult(NSURL *a, NSURL *b) {
    return [@(b.path.length) compare:@(a.path.length)];
  }];
  for (NSURL *fileURL in toRemove) {
    [fm removeItemAtURL:fileURL error:nil];
  }
}

@implementation LXCacheModule

RCT_EXPORT_MODULE(CacheModule)

RCT_EXPORT_METHOD(getAppCacheSize:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject) {
  @try {
    unsigned long long total = 0;
    NSArray<NSString *> *cacheDirs =
        NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
    for (NSString *dir in cacheDirs) {
      total += LXDirectorySize([NSURL fileURLWithPath:dir]);
    }
    total += LXDirectorySize([NSURL fileURLWithPath:NSTemporaryDirectory()]);
    resolve(@(total));
  } @catch (NSException *e) {
    reject(@"CACHE_ERROR", e.reason, nil);
  }
}

RCT_EXPORT_METHOD(clearAppCache:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject) {
  @try {
    NSArray<NSString *> *cacheDirs =
        NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
    for (NSString *dir in cacheDirs) {
      LXClearDirectory([NSURL fileURLWithPath:dir]);
    }
    LXClearDirectory([NSURL fileURLWithPath:NSTemporaryDirectory()]);
    resolve(nil);
  } @catch (NSException *e) {
    reject(@"CACHE_ERROR", e.reason, nil);
  }
}

@end
