/**
 * B 站音源验证脚本（Node 18+，无需额外依赖）
 * 用法: node scripts/verify-bilibili.mjs [关键词] [页大小]
 * 示例: node scripts/verify-bilibili.mjs 周杰伦 3
 *
 * 链路: bilibili.com 首页拿 cookie -> 搜索视频 -> view 拿 cid -> playurl 拿音频流 -> 验证音频 URL 可下载
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const BASE = 'https://api.bilibili.com'
const KEYWORD = process.argv[2] ?? '周杰伦'
const PAGE_SIZE = Number(process.argv[3] ?? 3)

// ---------- cookie ----------
async function getBilibiliCookie() {
  const res = await fetch('https://www.bilibili.com/', {
    headers: { 'User-Agent': UA },
  })
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  const jar = new Map()
  for (const c of setCookies) {
    const [pair] = c.split(';')
    const idx = pair.indexOf('=')
    if (idx <= 0) continue
    const name = pair.slice(0, idx).trim()
    const value = pair.slice(idx + 1).trim()
    if (name && value) jar.set(name, value)
  }
  const keep = ['buvid3', 'buvid4', 'b_nut', '_uuid']
  const cookie = keep
    .filter((k) => jar.has(k))
    .map((k) => `${k}=${jar.get(k)}`)
    .join('; ')
  if (!cookie) {
    console.warn('[cookie] 首页未返回任何 cookie，搜索可能被 412 风控')
  } else {
    console.log('[cookie] 已获取:', cookie)
  }
  return cookie
}

async function biliFetch(path, { cookie, referer = 'https://www.bilibili.com/' } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'User-Agent': UA,
      Referer: referer,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  })
  const text = await res.text()
  if (!res.ok) {
    const preview = text.replace(/\s+/g, ' ').slice(0, 200)
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${preview}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    const preview = text.replace(/\s+/g, ' ').slice(0, 200)
    throw new Error(`响应不是 JSON: ${preview}`)
  }
}

const stripTags = (s = '') =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()

const formatDuration = (s) => {
  if (typeof s !== 'number' || !isFinite(s)) return s || '?'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ---------- 1. 搜索 ----------
async function searchVideos(cookie, keyword, pageSize) {
  const path = `/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(
    keyword
  )}&page=1&page_size=${pageSize}`
  console.log(`\n[1] 搜索: ${keyword}`)
  const data = await biliFetch(path, { cookie })
  if (data.code !== 0) throw new Error(`搜索接口 code=${data.code} message=${data.message}`)
  const items = (data.data?.result ?? [])
    .filter((i) => i.type === 'video' && i.bvid)
    .slice(0, pageSize)
  console.log(`  命中 ${data.data?.numResults} 条，取前 ${items.length} 条:`)
  items.forEach((it, idx) => {
    console.log(
      `  [${idx}] ${stripTags(it.title)} | UP: ${it.author} | bvid=${it.bvid} | 时长=${formatDuration(it.duration)}`
    )
  })
  return items
}

// ---------- 2. 视频详情取 cid ----------
async function getCid(cookie, bvid) {
  console.log(`\n[2] 获取视频详情 cid: ${bvid}`)
  const data = await biliFetch(`/x/web-interface/view?bvid=${bvid}`, {
    cookie,
    referer: `https://www.bilibili.com/video/${bvid}`,
  })
  if (data.code !== 0) throw new Error(`view 接口 code=${data.code} message=${data.message}`)
  const page = data.data?.pages?.[0]
  const cid = page?.cid ?? data.data?.cid
  if (!cid) throw new Error('未取到 cid')
  const info = {
    cid,
    title: stripTags(data.data?.title),
    pic: data.data?.pic,
    duration: data.data?.duration,
    owner: data.data?.owner?.name,
    part: page?.part || '',
  }
  console.log(
    `  cid=${info.cid} | 标题=${info.title}${info.part ? ' | 分P=' + stripTags(info.part) : ''} | UP=${info.owner} | 时长=${formatDuration(info.duration)}`
  )
  console.log(`  封面: ${info.pic}`)
  return info
}

// ---------- 3. 取音频流 ----------
async function getAudioUrls(cookie, bvid, cid) {
  const referer = `https://www.bilibili.com/video/${bvid}`
  console.log(`\n[3] 获取播放地址 (DASH fnval=16): bvid=${bvid} cid=${cid}`)
  const data = await biliFetch(`/x/player/playurl?fnval=16&bvid=${bvid}&cid=${cid}`, {
    cookie,
    referer,
  })
  if (data.code !== 0) throw new Error(`playurl 接口 code=${data.code} message=${data.message}`)
  const dash = data.data?.dash
  const audio = dash?.audio ?? []
  console.log(`  DASH 音轨数: ${audio.length}`)
  const sorted = [...audio].sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0))
  sorted.forEach((a, idx) => {
    const url = (a.baseUrl || a.base_url || a.url || '').slice(0, 100)
    console.log(
      `  [${idx}] id=${a.id} | ${a.mimeType || '?'} | bandwidth=${a.bandwidth || '?'} | url=${url}...`
    )
  })
  const selected = sorted[0]
  if (!selected) {
    console.log('  DASH 无音轨，尝试 durl (fnval=0)...')
    const durlData = await biliFetch(`/x/player/playurl?fnval=0&bvid=${bvid}&cid=${cid}`, {
      cookie,
      referer,
    })
    if (durlData.code !== 0) throw new Error(`playurl durl code=${durlData.code} message=${durlData.message}`)
    const durl = durlData.data?.durl?.[0]
    if (!durl?.url) throw new Error('durl 也未取到音频地址')
    return { url: durl.url, quality: 'durl', format: 'flv/mp4 分段' }
  }
  const rawUrl = selected.baseUrl || selected.base_url || selected.url
  return {
    url: rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl,
    quality: selected.id,
    format: selected.mimeType,
    bandwidth: selected.bandwidth,
  }
}

// ---------- 4. 验证音频 URL 可下载 ----------
async function verifyAudioUrl(url, cookie, referer) {
  console.log(`\n[4] 验证音频 URL 可访问性:`)
  console.log(`  url: ${url.slice(0, 120)}...`)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Referer: referer,
        Range: 'bytes=0-2047',
        ...(cookie ? { Cookie: cookie } : {}),
      },
    })
    const type = res.headers.get('content-type') ?? '?'
    const len = res.headers.get('content-length') ?? '?'
    const range = res.headers.get('content-range') ?? '-'
    console.log(
      `  HTTP ${res.status} | Content-Type=${type} | Content-Length=${len} | Content-Range=${range}`
    )
    const buf = new Uint8Array(await res.arrayBuffer())
    console.log(`  实际读取字节数: ${buf.byteLength}`)
    if (!(res.status === 200 || res.status === 206)) {
      throw new Error('音频 URL 不可访问')
    }
    const head = new TextDecoder().decode(buf.slice(0, 16)).replace(/[^\x20-\x7e]/g, '.')
    console.log(`  文件头嗅探: ${head}`)
    return true
  } catch (err) {
    console.error('  验证失败:', err.message)
    return false
  }
}

// ---------- main ----------
async function main() {
  console.log('======== B 站音源链路验证 ========')
  console.log(`关键词: ${KEYWORD} | 时间: ${new Date().toISOString()}`)
  const cookie = await getBilibiliCookie()

  const items = await searchVideos(cookie, KEYWORD, PAGE_SIZE)
  if (!items.length) throw new Error('搜索无结果，请更换关键词')

  const first = items[0]
  const info = await getCid(cookie, first.bvid)
  const audio = await getAudioUrls(cookie, first.bvid, info.cid)
  const ok = await verifyAudioUrl(audio.url, cookie, `https://www.bilibili.com/video/${first.bvid}`)

  console.log('\n======== 验证结果 ========')
  console.log(`  搜索: ✅ 取到 ${items.length} 条视频`)
  console.log(`  cid: ✅ bvid=${first.bvid} -> cid=${info.cid}`)
  console.log(
    `  取流: ✅ quality=${audio.quality} format=${audio.format}${audio.bandwidth ? ` bandwidth=${audio.bandwidth}` : ''}`
  )
  console.log(`  下载验证: ${ok ? '✅ 音频 URL 可访问' : '❌ 音频 URL 不可访问'}`)
  process.exit(ok ? 0 : 1)
}

main().catch((err) => {
  console.error('\n❌ 验证失败:', err.message)
  process.exit(1)
})
