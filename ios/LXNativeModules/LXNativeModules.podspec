Pod::Spec.new do |s|
  s.name         = 'LXNativeModules'
  s.version      = '1.0.0'
  s.summary      = 'LX Music native modules for iOS'
  s.homepage     = 'https://github.com/WalnutBai/lx-lxwalnut-music-mobile'
  s.license      = { :type => 'Apache-2.0' }
  s.authors      = { 'WalnutBai' => 'WalnutHyper@foxmail.com' }
  s.platform     = :ios, '13.0'
  s.source       = { :path => '.' }
  s.source_files = '**/*.{h,m,mm}'
  s.dependency 'React-Core'
  s.dependency 'React'
  s.frameworks    = 'Security', 'MobileCoreServices', 'WebKit', 'MediaPlayer', 'UIKit', 'Foundation'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.swift_version = '5.0'
end
