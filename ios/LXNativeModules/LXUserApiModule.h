#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

/**
 * UserApiModule — runs user-provided music source scripts via QuickJS on
 * Android. iOS v1 does not bundle the QuickJS runtime, so this is a safe stub:
 *   - loadScript echoes an `api-action` "init" event back to JS (so the UI
 *     believes the script loaded and the built-in sources keep working).
 *   - sendAction returns false (user script requests are not handled on iOS).
 *   - destroy is a no-op.
 *
 * Built-in sources (NetEase / QQ / Kugou ...) go through CryptoModule +
 * musicSdk and do NOT depend on this module, so core playback is unaffected.
 */
@interface LXUserApiModule : RCTEventEmitter <RCTBridgeModule>
@end
