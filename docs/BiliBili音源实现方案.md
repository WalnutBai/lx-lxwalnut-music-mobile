# BiliBili（小哔音乐）音源实现方案

> 分支：`feature/bilibili`
> 源标识：`bi`
> 显示名：小哔音乐
> 状态：✅ 真机播放验证通过（2026-08-23）
> 面向：后续接手该音源的开发者

---

## 一、背景与目标

B 站没有官方音乐 API。本音源复用 B 站视频接口，把「视频当音乐用」：

- 搜索：B 站视频搜索 → 视频即歌曲
- 取流：取视频的音频流作为播放 URL
- 歌词：优先使用 B 站 CC 字幕（UP 主上传或 AI 生成），转 LRC

与洛雪移动版其它音源（kw/kg/tx/wy/mg/git）保持同一套 `musicSdk` 接口规范。

---

## 二、源标识与注册

| 项 | 值 |
|---|---|
| 源 id | `bi` |
| 显示名（alias） | 小哔音乐 |
| 显示名（real） | 哔哩哔哩音乐 |

注册位置：

- `src/utils/musicSdk/index.js`：`sources` 数组与顶层对象添加 `bi`
- `src/utils/musicSdk/api-source-info.ts`：声明 `bi` 支持 `128k` / `320k`
- `src/types/common.d.ts`：`OnlineSource` 添加 `'bi'`
- `src/types/music.d.ts`：`MusicInfo_online_common` 添加 `'bi'`
- `src/lang/zh-cn.json` / `zh-tw.json` / `en-us.json`：三语源名称

---

## 三、文件结构

```
src/utils/musicSdk/bi/
├── index.js         # 源入口：getMusicUrl / getLyric / getPic / getMusicDetailPageUrl
├── util.js          # Cookie、biliFetch、cid 缓存、WBI 签名、字幕转 LRC
├── musicSearch.js   # 视频搜索，输出旧版 musicInfo 结构
├── musicInfo.js     # 取流：durl 完整 MP4 优先，DASH 降级
└── lyric.js         # CC 字幕 → LRC
```

其它关键改动：

- `src/plugins/player/playList.ts`：为 `bi` 源设置 B 站 Referer 与现代 UA（播放成败的关键）
- `scripts/verify-bilibili.mjs`：本地链路验证脚本

---

## 四、B 站 API 链路

### 1. Cookie（风控前提）

直接请求 B 站 API 会返回 `HTTP 412`（风控）。需要先访问首页获取 Cookie：

```
GET https://www.bilibili.com/
```

从 `set-cookie` 提取 `buvid3` / `buvid4` / `b_nut` / `_uuid`，后续请求带 `Cookie`。

实现：`util.js` 的 `ensureCookie()`，模块级缓存，失败降级为空 Cookie。

### 2. 搜索

```
GET https://api.bilibili.com/x/web-interface/search/type
    ?search_type=video&keyword={关键词}&page={页码}&page_size={每页数}
Headers:
    User-Agent: Chrome 120（现代桌面 UA）
    Referer: https://www.bilibili.com/
    Cookie: buvid3=...
```

返回 `data.result[]`，取 `type === 'video'` 的条目，映射为旧版 musicInfo：

| B 站字段 | musicInfo 字段 |
|---|---|
| `bvid` | `songmid`（后续转成 `meta.songId`） |
| `title`（含高亮标签） | `name`（需去 HTML 标签） |
| `author` | `singer` |
| `pic` | `img`（`//` 补全为 `https:`） |
| `duration`（字符串 "mm:ss"） | `interval` |

`types` / `_types` 声明 `128k` / `320k` 两档（B 站实际音质由取流时决定）。

### 3. 取 cid（视频详情）

搜索接口不返回 `cid`，播放时再查：

```
GET https://api.bilibili.com/x/web-interface/view?bvid={bvid}
Headers:
    Referer: https://www.bilibili.com/video/{bvid}
```

取 `data.pages[0].cid`（默认第一 P）。实现带模块级缓存（`getCid()`）。

### 4. 取流（核心）

**优先级：durl 完整 MP4 > DASH 纯音频 m4s**

#### 4.1 durl（首选，播放器兼容）

```
GET https://api.bilibili.com/x/player/playurl?fnval=0&bvid={bvid}&cid={cid}
```

返回 `data.durl[0].url`，是**完整 MP4**（`ftyp + moov + free + mdat`），
扩展名 `.mp4`，音视频 mux，ExoPlayer/TrackPlayer 可直接播放。

#### 4.2 DASH（降级）

```
GET https://api.bilibili.com/x/player/playurl?fnval=16&bvid={bvid}&cid={cid}
```

返回 `data.dash.audio[]`，按 `bandwidth` 降序选最高码率。
`128k` 档选最低码率，其余档选最高码率。
同时兼容 `dash.flac.audio` 与 `dash.dolby.audio`。

> ⚠️ DASH 音频是 `.m4s` 分片（moof+mdat 无数小段），
> 本项目的 TrackPlayer/ExoPlayer 无法播放，**只能作为降级**。

### 5. 歌词（CC 字幕 → LRC）

```
# 5.1 获取 WBI 密钥
GET https://api.bilibili.com/x/web-interface/nav
# 取 data.wbi_img.img_url / sub_url 的文件名作为 img_key / sub_key

# 5.2 带签名请求播放器字幕列表
GET https://api.bilibili.com/x/player/wbi/v2?bvid={bvid}&cid={cid}&wts={秒}&w_rid={签名}
```

- 字幕选择：人工中文 > 人工其它 > AI 中文 > AI 其它
- 翻译轨：优先其它语言（英文优先）
- 字幕 JSON 下载后转 LRC：`[mm:ss.xx]文本`
- 无字幕返回 `[00:00:00]暂无歌词`（满足项目歌词格式校验）

---

## 五、WBI 签名算法

```js
// 固定混淆表
MIXIN_KEY_ENC_TAB = [46,47,18,2,53,8,...]  // 64 项，完整见 util.js

// 1. 混淆
mixinKey = MIXIN_KEY_ENC_TAB 顺序取 (imgKey + subKey) 的前 32 位

// 2. 参数签名
params = { bvid, cid, wts: 当前秒 }
query = Object.keys(params).sort()
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(过滤['()*]))
        .join('&')
w_rid = md5(query + mixinKey)   // 项目用 react-native-quick-md5
```

最终请求：`/x/player/wbi/v2?${query}&w_rid=${w_rid}`

---

## 六、播放器兼容性关键（踩坑）

**现象**：能搜索，但播放时提示
`缓冲中... → URL过期，正在刷新URL → 音频加载出错`

**根因有两个，都要满足：**

1. **文件格式**：DASH `.m4s` 分片 TrackPlayer 不认，必须改用 durl 完整 `.mp4`
2. **请求头**：TrackPlayer 默认用老 UA（Chrome/79）且不带 Referer，被 B 站 CDN 拒绝

**修复**（`src/plugins/player/playList.ts`）：

```ts
// 播放 bi 源 URL 时：
userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ... Chrome/120.0.0.0 Safari/537.36'
headers = { Referer: 'https://www.bilibili.com/' }
```

---

## 七、音乐信息 id 约定

- `songmid = bvid`（如 `BV1FPjy6TEiE`）
- 新结构 `id = bi_BV1FPjy6TEiE`
- 后续如需多 P 拆分，建议 id 改为 `bi_{bvid}_{cid}` 或 `{bvid}|{cid}`

---

## 八、验证方法

电脑端无需 Android 环境即可验证 API 链路：

```bash
node scripts/verify-bilibili.mjs 周杰伦 3
```

输出：搜索 → cid → playurl → 音频 URL 可下载（206/200）。

真机验证：
1. 搜索源切到「小哔音乐」
2. 搜索任意关键词
3. 点歌曲播放

---

## 九、CI 构建说明

- Workflow：`.github/workflows/release-arm64.yml`
- 触发：push 到 `feature/**` 分支或手动 `workflow_dispatch`
- 只构建 `arm64-v8a` Release：`./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`
- 仓库当前未配置签名 secrets，CI 内生成临时 release keystore 自签名
- 正式签名：需要把 `MYAPP_KEYSTORE_BASE64` / `MYAPP_UPLOAD_STORE_FILE` / `MYAPP_UPLOAD_KEY_ALIAS` / `MYAPP_UPLOAD_STORE_PASSWORD` / `MYAPP_UPLOAD_KEY_PASSWORD` 配到仓库 secrets

---

## 十、已知限制与后续优化

| 限制 | 说明 / 优化方向 |
|---|---|
| 只取默认第一 P | 多 P 视频（音乐合集很常见）后续可拆成每 P 一首歌 |
| durl 是音视频 mux | 文件比纯音频大；可探索 B 站纯音频完整 MP4 的接口 |
| 搜索接口未 WBI 签名 | 目前稳定；如遇风控可切 `/x/web-interface/wbi/search/type` |
| 未登录 | 登录 Cookie 可拿更高音质（FLAC/Dolby） |
| 临时签名 | Release 包签名与正式包不一致，升级需卸载重装；配好正式 secrets 后解决 |
| 歌词依赖 CC 字幕 | 无字幕视频返回「暂无歌词」 |

---

## 十一、参考项目

- `DJChanahCJD/otter-music`：B 站音源最完整参考（搜索/取流/WBI/字幕转 LRC）
- `guohuiyuan/music-lib`（`bilibili/` 目录）：音质选择清晰（FLAC id 30251、Dolby id 30250）
- `AprDeci/bili-music`：WBI 搜索与多 P 解析参考
- `flwfdd/MergeMusic`：极简 Python 版参考

---

*文档生成：2026-08-23 · feature/bilibili*
