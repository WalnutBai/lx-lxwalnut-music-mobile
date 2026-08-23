# 洛雪音乐助手（LX Music）iOS 工程说明

本文档说明 iOS 平台的工程结构、构建方式、签名限制与原生模块对照关系。
仓库基于 React Native **0.73.11** / React 18.2 / Hermes / **旧架构**（newArchEnabled=false），
导航使用 **react-native-navigation v7.39.2**。

## 1. 工程结构

```
ios/
├── LXMusic.xcodeproj/        # 主工程（由 RN 0.73.11 模板重命名 HelloWorld → LXMusic）
├── LXMusic/                  # AppDelegate（RNN v7 接入）、Info.plist、资源
├── LXMusicTests/             # 单元测试 target
├── Podfile                   # 引用 LXNativeModules 本地 pod + RNN（use_native_modules! 自动链接）
├── ExportOptions.plist       # 参考用导出配置（manual / ad-hoc）
├── LXNativeModules/          # 本地 CocoaPods pod，包含 6 个原生模块（见下表）
│   ├── LXNativeModules.podspec
│   ├── LXCryptoModule.{h,m}
│   ├── LXCacheModule.{h,m}
│   ├── LXUtilsModule.{h,m}
│   ├── LXMusicWidgetModule.{h,m}
│   ├── LXLyricModule.{h,m}
│   └── LXUserApiModule.{h,m}
└── README-iOS.md
```

Bundle Identifier：`com.lxnetease.music.mobile`（与 Android 一致）。

### 为什么用本地 pod

6 个自定义原生模块放在 `ios/LXNativeModules/` 本地 pod 中，由 CocoaPods 编译，
**完全不需要手动修改主工程 `project.pbxproj` 的文件引用**，新增/调整模块只改本地 pod 即可。

## 2. 依赖与签名

- 最低系统版本：**iOS 13+**（Podfile 沿用 RN 0.73 的 `min_ios_version_supported`）。
- 导航：`react-native-navigation` 通过 `use_native_modules!` 自动链接，无需额外 pod 行；
  旧架构下**不需要** `use_frameworks!`。
- 播放：`react-native-track-player`（lyswhut fork，已含 iOS pod）。
- **未签名说明**：本仓库提供的 CI 产出的是**未签名 IPA**，仅可用于侧载（AltStore / Sideloadly），
  **不能上架 App Store**（NSAllowsArbitraryLoads=true 会被拒）。
- 如需真机签名：准备 Apple ID（免费 7 天）或付费证书，用 Xcode 自动管理签名，
  或参考 `ExportOptions.plist` + `fastlane`/`xcodebuild -exportArchive` 走 manual + ad-hoc。

## 3. 本地运行（需 macOS + Xcode）

```bash
npm install
cd ios && pod install
npx react-native run-ios
```

## 4. CI 出包（未签名 IPA）

1. 在仓库 **Actions** 页手动触发 **Build iOS (unsigned)**（`workflow_dispatch`）；
   推送到 `ios-port` 分支也会自动触发（不会触发到 `main`，避免与 Android workflow 冲突）。
2. 下载产物 artifact（文件名含版本号，如 `LXMusic-unsigned-26.08.19.ipa`）。
3. 用 **AltStore** 或 **Sideloadly** 侧载安装到设备。

工作流步骤：`checkout` → `setup-node` → `npm ci` → `pod install --repo-update`
→ `xcodebuild archive`（CODE_SIGNING_ALLOWED=NO）→ 从 `.xcarchive` 打 `Payload/*.app` 为 zip IPA
→ `upload-artifact`。

## 5. 已知限制（iOS v1）

- **桌面悬浮歌词（LyricModule）**：iOS 无等价悬浮窗，所有方法为安全 no-op（resolve true），
  调用不会崩溃，但功能不可用。
- **用户自定义音源（UserApiModule / QuickJS）**：iOS v1 不含 QuickJS 运行时，
  `loadScript` 仅回显 init 事件让 UI 认为脚本已加载，`sendAction` 返回 false。
  **内置音源（网易 / QQ / 酷狗等）走 CryptoModule + musicSdk，不依赖 UserApiModule，核心播放正常。**
- 后台播放已开启 `UIBackgroundModes: audio`；锁屏控制中心的播放/暂停/上一首/下一首会回传 JS 事件。

## 6. 原生模块对照表

| JS 模块名 | iOS 类 | 类型 | 状态 | 说明 |
|---|---|---|---|---|
| `CryptoModule` | `LXCryptoModule` | NSObject | ✅ 完整 | AES(CBC/ECB) / RSA(OAEP-SHA1, NoPadding) / SHA1，base64 入出，与 Android 字节级一致 |
| `CacheModule` | `LXCacheModule` | NSObject | ✅ 完整 | 统计并清理 Caches + Tmp 目录 |
| `UtilsModule` | `LXUtilsModule` | RCTEventEmitter | ✅ 完整 | 设备名/区域/IP/窗口尺寸等；发 `screen-state` 事件；分享/省电等 |
| `MusicWidgetModule` | `LXMusicWidgetModule` | RCTEventEmitter | ✅ 完整 | 更新锁屏 Now Playing；发 `widget-play-pause`/`widget-prev`/`widget-next` |
| `LyricModule` | `LXLyricModule` | RCTEventEmitter | ⚠️ 桩 | 桌面歌词 iOS 不可用，全部 no-op |
| `UserApiModule` | `LXUserApiModule` | RCTEventEmitter | ⚠️ 桩 | 用户脚本 iOS 不可用，仅回显 init 事件 |

### CryptoModule 算法要点（必须与 Android 一致）

- 所有 `text`/`key`/`iv` 入参为 **base64 字符串**，先解码再运算，结果再 base64 编码返回。
- **AES**：CommonCrypto `CCCrypt`。CBC → `kCCOptionPKCS7Padding`，IV 取 iv 前 16 字节（不足补零）；
  ECB（`mode=="AES"`）→ `kCCOptionECBMode`，不使用 IV。
- **RSA**：Security.framework `SecKey`。公钥 X.509 SPKI、私钥 PKCS#8；
  OAEP → `kSecKeyAlgorithmRSAEncryptionOAEPSHA1`，NoPadding → `kSecKeyAlgorithmRSAEncryptionRaw`。
- **generateRsaKey**：生成 RSA 2048，将 PKCS#1 分别包装为 X.509 / PKCS#8 后 base64 返回。
- `sha1`：`CC_SHA1` 输出小写 hex。
