#import "LXUserApiModule.h"
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@implementation LXUserApiModule

RCT_EXPORT_MODULE(UserApiModule)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"api-action"];
}

- (void)startObserving {
  // no-op
}

- (void)stopObserving {
  // no-op
}

RCT_EXPORT_METHOD(loadScript:(NSDictionary *)data) {
  NSMutableDictionary *info = [NSMutableDictionary dictionary];
  if (data[@"id"]) info[@"id"] = data[@"id"];
  if (data[@"name"]) info[@"name"] = data[@"name"];
  if (data[@"description"]) info[@"description"] = data[@"description"];
  if (data[@"version"]) info[@"version"] = data[@"version"];
  if (data[@"author"]) info[@"author"] = data[@"author"];
  if (data[@"homepage"]) info[@"homepage"] = data[@"homepage"];

  NSDictionary *dataObj = @{
    @"status": @YES,
    @"errorMessage": @"",
    @"info": info,
  };
  // The JS layer does `JSON.parse(event.data)`, so `data` must be a JSON string
  // (mirrors the Android WritableMap.putString("data", <json string>)).
  NSError *err = nil;
  NSData *jsonData = [NSJSONSerialization dataWithJSONObject:dataObj options:0 error:&err];
  NSString *dataString = err ? @"{}"
      : [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];

  [self sendEventWithName:@"api-action" body:@{
    @"action": @"init",
    @"data": dataString,
  }];
}

RCT_EXPORT_METHOD(sendAction:(NSString *)action
                      info:(NSString *)info
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject) {
  // User script requests are not handled on iOS v1.
  resolve(@NO);
}

RCT_EXPORT_METHOD(destroy) {
  // no-op
}

@end
