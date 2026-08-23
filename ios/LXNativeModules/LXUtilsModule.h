#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

/**
 * UtilsModule — device / system utilities. Emits a `screen-state` event when
 * the app moves to the foreground / background. Mirrors
 * com.lxnetease.music.mobile.utils.UtilsModule.
 */
@interface LXUtilsModule : RCTEventEmitter <RCTBridgeModule>
@end
