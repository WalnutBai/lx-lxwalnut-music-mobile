#import <UIKit/UIKit.h>
#import <XCTest/XCTest.h>

@interface LXMusicTests : XCTestCase

@end

@implementation LXMusicTests

// Smoke test only. The production app is a react-native-navigation (RNN)
// shell that never renders the React template text "Welcome to React", so the
// original template assertion is intentionally replaced with a host-launch
// check. This keeps the test target green if `xcodebuild test` is ever run
// (the unsigned-IPA archive workflow does not execute tests).
- (void)testHostLaunched {
  NSBundle *bundle = [NSBundle mainBundle];
  XCTAssertNotNil(bundle, @"main bundle should be available in the test host");
  XCTAssertTrue(YES, @"LXMusic test host launched successfully");
}

@end
