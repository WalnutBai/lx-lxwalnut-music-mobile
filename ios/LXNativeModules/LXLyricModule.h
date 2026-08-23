#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

/**
 * LyricModule — desktop floating lyric. There is no iOS equivalent of the
 * Android overlay window, so every method is a safe no-op that resolves to
 * `true`. The module still subclasses RCTEventEmitter so the JS
 * NativeEventEmitter subscriptions (set-position / lyric-line-play / set-lock)
 * do not crash; no events are ever emitted on iOS.
 *
 * Mirrors com.lxnetease.music.mobile.lyric.LyricModule (interface only).
 */
@interface LXLyricModule : RCTEventEmitter <RCTBridgeModule>
@end
