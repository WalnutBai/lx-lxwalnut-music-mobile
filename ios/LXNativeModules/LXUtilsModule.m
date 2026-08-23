#import "LXUtilsModule.h"
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <UIKit/UIKit.h>
#import <sys/socket.h>
#import <netinet/in.h>
#import <arpa/inet.h>
#import <ifaddrs.h>

@implementation LXUtilsModule

RCT_EXPORT_MODULE(UtilsModule)

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

#pragma mark - events

- (NSArray<NSString *> *)supportedEvents {
  return @[@"screen-state"];
}

- (void)startObserving {
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(lx_appDidBecomeActive)
                                               name:UIApplicationDidBecomeActiveNotification
                                             object:nil];
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(lx_appWillResignActive)
                                               name:UIApplicationWillResignActiveNotification
                                             object:nil];
}

- (void)stopObserving {
  [[NSNotificationCenter defaultCenter] removeObserver:self
                                                  name:UIApplicationDidBecomeActiveNotification
                                                object:nil];
  [[NSNotificationCenter defaultCenter] removeObserver:self
                                                  name:UIApplicationWillResignActiveNotification
                                                object:nil];
}

- (void)lx_appDidBecomeActive {
  [self sendEventWithName:@"screen-state" body:@{@"state": @"ON"}];
}

- (void)lx_appWillResignActive {
  [self sendEventWithName:@"screen-state" body:@{@"state": @"OFF"}];
}

#pragma mark - exported methods

RCT_EXPORT_METHOD(getSupportedAbis:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject) {
  resolve(@[@"arm64"]);
}

RCT_EXPORT_METHOD(getDeviceName:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject) {
  resolve([[UIDevice currentDevice] name]);
}

RCT_EXPORT_METHOD(getSystemLocales:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject) {
  resolve([[NSLocale currentLocale] localeIdentifier]);
}

RCT_EXPORT_METHOD(getWIFIIPV4Address:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject) {
  NSString *ip = @"0.0.0.0";
  struct ifaddrs *interfaces = NULL;
  if (getifaddrs(&interfaces) == 0) {
    struct ifaddrs *ifa = interfaces;
    while (ifa != NULL) {
      if (ifa->ifa_addr && ifa->ifa_addr->sa_family == AF_INET) {
        NSString *name = [NSString stringWithUTF8String:ifa->ifa_name];
        if ([name isEqualToString:@"en0"]) {
          struct sockaddr_in *sin = (struct sockaddr_in *)ifa->ifa_addr;
          char addr[INET_ADDRSTRLEN];
          if (inet_ntop(AF_INET, &(sin->sin_addr), addr, INET_ADDRSTRLEN)) {
            ip = [NSString stringWithUTF8String:addr];
          }
          break;
        }
      }
      ifa = ifa->ifa_next;
    }
    freeifaddrs(interfaces);
  }
  resolve(ip);
}

RCT_EXPORT_METHOD(getWindowSize:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject) {
  CGRect bounds = UIScreen.mainScreen.bounds;
  CGFloat scale = UIScreen.mainScreen.scale;
  resolve(@{
    @"width": @(bounds.size.width * scale),
    @"height": @(bounds.size.height * scale),
  });
}

RCT_EXPORT_METHOD(screenkeepAwake) {
  [UIApplication sharedApplication].idleTimerDisabled = YES;
}

RCT_EXPORT_METHOD(screenUnkeepAwake) {
  [UIApplication sharedApplication].idleTimerDisabled = NO;
}

RCT_EXPORT_METHOD(shareText:(NSString *)shareTitle
                     title:(NSString *)title
                      text:(NSString *)text) {
  NSArray *items = @[text ?: @""];
  UIActivityViewController *controller =
      [[UIActivityViewController alloc] initWithActivityItems:items applicationActivities:nil];
  dispatch_async(dispatch_get_main_queue(), ^{
    UIViewController *root = [self lx_topViewController];
    if (!root) return;
    if (controller.popoverPresentationController != nil) {
      controller.popoverPresentationController.sourceView = root.view;
      controller.popoverPresentationController.sourceRect = CGRectMake(0, 0, 1, 1);
    }
    [root presentViewController:controller animated:YES completion:nil];
  });
}

RCT_EXPORT_METHOD(getUiMode:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject) {
  BOOL dark = (UITraitCollection.currentTraitCollection.userInterfaceStyle == UIUserInterfaceStyleDark);
  resolve(@(dark ? 2 : 1));
}

RCT_EXPORT_METHOD(isNotificationsEnabled:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject) {
  resolve(@YES);
}

RCT_EXPORT_METHOD(openNotificationPermissionActivity:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject) {
  resolve(@NO);
}

RCT_EXPORT_METHOD(isIgnoringBatteryOptimization:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject) {
  resolve(@YES);
}

RCT_EXPORT_METHOD(requestIgnoreBatteryOptimization:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject) {
  resolve(@NO);
}

RCT_EXPORT_METHOD(installApk:(NSString *)filePath
              fileProviderAuthority:(NSString *)fileProviderAuthority
                           resolve:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject) {
  reject(@"UNSUPPORTED", @"installApk is not supported on iOS", nil);
}

RCT_EXPORT_METHOD(exitApp) {
  // iOS does not permit apps to terminate themselves; intentionally a no-op.
}

RCT_EXPORT_METHOD(adjustSystemMediaVolume:(NSString *)direction) {
  // iOS manages media volume through the system; intentionally a no-op.
}

RCT_EXPORT_METHOD(listenWindowSizeChanged) {
  // Window size change observation is not implemented on iOS; no-op.
}

#pragma mark - helpers

- (UIViewController *)lx_topViewController {
  UIViewController *root = nil;
  if (@available(iOS 13.0, *)) {
    for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
      if ([scene isKindOfClass:[UIWindowScene class]] &&
          scene.activationState == UISceneActivationStateForegroundActive) {
        UIWindowScene *ws = (UIWindowScene *)scene;
        for (UIWindow *w in ws.windows) {
          if (w.isKeyWindow) {
            root = w.rootViewController;
            break;
          }
        }
      }
      if (root) break;
    }
  } else {
    root = UIApplication.sharedApplication.keyWindow.rootViewController;
  }
  while (root.presentedViewController) {
    root = root.presentedViewController;
  }
  return root;
}

@end
