#import "LXMusicWidgetModule.h"
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <UIKit/UIKit.h>
#import <MediaPlayer/MediaPlayer.h>

@implementation LXMusicWidgetModule {
  BOOL _commandCenterConfigured;
}

RCT_EXPORT_MODULE(MusicWidgetModule)

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"widget-play-pause", @"widget-prev", @"widget-next"];
}

- (void)startObserving {
  [self lx_configureRemoteCommandCenter];
}

- (void)stopObserving {
  // Keep the remote command center wired up; disabling it would break
  // lock-screen / control-center integration for the active session.
}

#pragma mark - remote command center

- (void)lx_configureRemoteCommandCenter {
  // Guard the check-then-set with a lock: startObserving runs on the main
  // thread while updateWidget can be invoked from a background thread, so the
  // naive BOOL guard could otherwise double-register command handlers.
  @synchronized(self) {
    if (_commandCenterConfigured) return;
    _commandCenterConfigured = YES;

    MPRemoteCommandCenter *cc = [MPRemoteCommandCenter sharedCommandCenter];
  __weak typeof(self) weakSelf = self;
  cc.playCommand.enabled = YES;
  cc.pauseCommand.enabled = YES;
  cc.nextTrackCommand.enabled = YES;
  cc.previousTrackCommand.enabled = YES;

  [cc.playCommand addTarget:^MPRemoteCommandHandlerStatus(MPRemoteCommand *command) {
    [weakSelf sendEventWithName:@"widget-play-pause" body:nil];
    return MPRemoteCommandHandlerStatusSuccess;
  }];
  [cc.pauseCommand addTarget:^MPRemoteCommandHandlerStatus(MPRemoteCommand *command) {
    [weakSelf sendEventWithName:@"widget-play-pause" body:nil];
    return MPRemoteCommandHandlerStatusSuccess;
  }];
  [cc.nextTrackCommand addTarget:^MPRemoteCommandHandlerStatus(MPRemoteCommand *command) {
    [weakSelf sendEventWithName:@"widget-next" body:nil];
    return MPRemoteCommandHandlerStatusSuccess;
  }];
  [cc.previousTrackCommand addTarget:^MPRemoteCommandHandlerStatus(MPRemoteCommand *command) {
    [weakSelf sendEventWithName:@"widget-prev" body:nil];
    return MPRemoteCommandHandlerStatusSuccess;
  }];
  }
}

#pragma mark - exported methods

RCT_EXPORT_METHOD(updateWidget:(NSString *)title
                       artist:(NSString *)artist
                    isPlaying:(BOOL)isPlaying
                   artworkUrl:(NSString *)artworkUrl
                      resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject) {
  [self lx_configureRemoteCommandCenter];

  NSMutableDictionary *info = [NSMutableDictionary dictionary];
  if (title) info[MPMediaItemPropertyTitle] = title;
  if (artist) info[MPMediaItemPropertyArtist] = artist;
  info[MPNowPlayingInfoPropertyPlaybackRate] = @(isPlaying ? 1.0 : 0.0);
  info[MPNowPlayingInfoPropertyIsLive] = @NO;

  if (artworkUrl && artworkUrl.length > 0) {
    NSData *imgData = [NSData dataWithContentsOfURL:[NSURL URLWithString:artworkUrl]];
    if (imgData) {
      UIImage *img = [[UIImage alloc] initWithData:imgData];
      if (img) {
        MPMediaItemArtwork *artwork =
            [[MPMediaItemArtwork alloc] initWithBoundsSize:img.size
                                             requestHandler:^UIImage *(CGSize size) { return img; }];
        info[MPMediaItemPropertyArtwork] = artwork;
      }
    }
  }

  [MPNowPlayingInfoCenter defaultCenter].nowPlayingInfo = info;
  resolve(nil);
}

@end
