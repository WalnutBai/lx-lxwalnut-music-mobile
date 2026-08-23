/**
 * 小哔音乐取流逻辑
 * B 站视频 DASH 音频流 -> 播放 URL
 */
import { biliFetch, getCid } from './util'

/**
 * 将音频 URL 统一转为 https
 */
const toHttps = (url) => {
  if (!url) return ''
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('http://')) return url.replace(/^http:\/\//, 'https://')
  return url
}

/**
 * 从 DASH 响应中提取音频 URL
 */
const pickDashAudioUrl = (data, preferLower) => {
  const dash = data?.dash
  if (!dash) return null

  // 普通 DASH 音轨
  const audio = [...(dash.audio || [])].sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0))
  // 高音质 DASH 音轨（FLAC / Dolby）
  const flacAudio = dash.flac?.audio
  const dolbyAudios = dash.dolby?.audio || []
  const all = [...audio]
  if (flacAudio?.baseUrl || flacAudio?.base_url || flacAudio?.url) all.unshift(flacAudio)
  for (const item of dolbyAudios) {
    if (item.baseUrl || item.base_url || item.url) all.unshift(item)
  }

  const sorted = [...all].sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0))
  const selected = preferLower ? sorted[sorted.length - 1] : sorted[0]
  if (!selected) return null
  return selected.baseUrl || selected.base_url || selected.url || null
}

/**
 * 根据 bvid 获取音频播放地址
 * @param {object} songInfo 旧版 musicInfo（含 songmid = bvid）
 * @param {LX.Quality} type 请求音质
 * @returns {Promise<{url: string, type: LX.Quality}>}
 */
export const getMusicUrl = async (songInfo, type) => {
  const bvid = songInfo._biData?.bvid || songInfo.songmid
  if (!bvid) throw new Error('无效的 B 站视频 ID')

  const referer = `https://www.bilibili.com/video/${bvid}`
  const cid = await getCid(bvid)

  // DASH 优先（fnval=16）
  const data = await biliFetch(`/x/player/playurl?fnval=16&bvid=${encodeURIComponent(bvid)}&cid=${cid}`, { referer })
  if (data.code !== 0 || !data.data) {
    throw new Error(`获取播放地址失败: ${data.message || data.code}`)
  }

  let url = pickDashAudioUrl(data.data, type === '128k')

  // DASH 无音轨时降级 durl (fnval=0)
  if (!url) {
    console.log('[bi] DASH 无音轨，降级 durl')
    const durlData = await biliFetch(`/x/player/playurl?fnval=0&bvid=${encodeURIComponent(bvid)}&cid=${cid}`, { referer })
    if (durlData.code !== 0 || !durlData.data) {
      throw new Error(`获取播放地址失败: ${durlData.message || durlData.code}`)
    }
    url = durlData.data.durl?.[0]?.url
  }

  if (!url) throw new Error('未获取到 B 站音频地址')
  url = toHttps(url)

  return { url, type }
}

/**
 * 获取歌曲详情页 URL
 */
export const getMusicDetailPageUrl = (songInfo) => {
  const bvid = songInfo._biData?.bvid || songInfo.songmid
  return bvid ? `https://www.bilibili.com/video/${bvid}` : ''
}
