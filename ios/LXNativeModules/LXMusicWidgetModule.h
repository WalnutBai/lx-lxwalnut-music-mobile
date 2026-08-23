#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

/**
 * MusicWidgetModule — updates the lock-screen / control-center "Now Playing"
 * info and forwards remote command center playback actions (play/pause,
 * next, previous) to JavaScript as events. Mirrors
 * com.lxnetease.music.mobile.widget.MusicWidgetModule.
 */
@interface LXMusicWidgetModule : RCTEventEmitter <RCTBridgeModule>
@end
