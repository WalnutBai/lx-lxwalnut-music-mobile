/**
 * 小哔音乐歌词
 * 优先使用 B 站 CC 字幕（人工中文 > AI 中文 > 其他），转 LRC
 */
import { biliFetch, getCid, signWbiParams, subtitleToLrc, normalizeUrl, EMPTY_LRC } from './util'

const pickSubtitles = (subtitles) => {
  const usable = (subtitles || [])
    .filter((s) => s.subtitle_url && s.lan)
    .map((s) => ({
      ...s,
      isAi: Boolean(s.ai_status || s.ai_type || String(s.lan).startsWith('ai-')),
      lang: String(s.lan).replace(/^ai-/, '').split('-')[0].toLowerCase(),
    }))
  if (usable.length === 0) return []

  const human = usable.filter((s) => !s.isAi)
  const ai = usable.filter((s) => s.isAi)
  const pick = (pool, lang) => pool.find((s) => s.lang === lang)

  const primary = pick(human, 'zh') ?? human[0] ?? pick(ai, 'zh') ?? ai[0] ?? null
  if (!primary) return []

  const primaryLang = primary.lang
  const translation =
    human.find((s) => s.lang !== primaryLang && s.lang === 'en') ??
    human.find((s) => s.lang !== primaryLang) ??
    ai.find((s) => s.lang !== primaryLang && s.lang === 'en') ??
    ai.find((s) => s.lang !== primaryLang) ??
    null

  return translation ? [primary, translation] : [primary]
}

const fetchSubtitleLrc = async (subtitleUrl, referer) => {
  const url = normalizeUrl(subtitleUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: referer,
      },
      signal: controller.signal,
    })
    const text = await res.text()
    if (!res.ok) return ''
    const data = JSON.parse(text)
    return subtitleToLrc(data.body || data)
  } catch (err) {
    console.log('[bi] 字幕获取失败:', err.message)
    return ''
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 获取歌词
 * @param {object} songInfo 旧版 musicInfo
 */
export const getLyric = async (songInfo) => {
  const bvid = songInfo._biData?.bvid || songInfo.songmid
  if (!bvid) {
    return { lyric: EMPTY_LRC, tlyric: null, rlyric: null, lxlyric: null }
  }

  try {
    const referer = `https://www.bilibili.com/video/${bvid}`
    const cid = await getCid(bvid)
    const query = await signWbiParams({ bvid, cid })
    const data = await biliFetch(`/x/player/wbi/v2?${query}`, { referer })
    if (data.code !== 0 || !data.data) {
      throw new Error(`获取字幕列表失败: ${data.message || data.code}`)
    }

    const subtitles = pickSubtitles(data.data.subtitle?.subtitles)
    if (subtitles.length === 0) {
      return { lyric: EMPTY_LRC, tlyric: null, rlyric: null, lxlyric: null }
    }

    const [primary, translation] = subtitles
    const lyric = (await fetchSubtitleLrc(primary.subtitle_url, referer)) || EMPTY_LRC
    const tlyric = translation
      ? (await fetchSubtitleLrc(translation.subtitle_url, referer)) || null
      : null

    return {
      lyric,
      tlyric,
      rlyric: null,
      lxlyric: null,
    }
  } catch (err) {
    console.log('[bi] 歌词获取失败，返回空歌词:', err.message)
    return { lyric: EMPTY_LRC, tlyric: null, rlyric: null, lxlyric: null }
  }
}
