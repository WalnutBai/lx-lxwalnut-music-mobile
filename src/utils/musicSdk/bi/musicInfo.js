/**
 * 小哔音乐取流逻辑
 * B 站视频 DASH 音频流 -> 播放 URL
 */
import { biliFetch, getCid } from './util'

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

  const audio = data.data.dash?.audio ?? []
  // type 为 128k 时选最低码率，其余选最高码率
  const sorted = [...audio].sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0))
  const selected = type === '128k' ? sorted[sorted.length - 1] : sorted[0]

  let url
  if (selected) {
    url = selected.baseUrl || selected.base_url || selected.url
  }

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
  if (url.startsWith('//')) url = `https:${url}`

  return { url, type }
}

/**
 * 获取歌曲详情页 URL
 */
export const getMusicDetailPageUrl = (songInfo) => {
  const bvid = songInfo._biData?.bvid || songInfo.songmid
  return bvid ? `https://www.bilibili.com/video/${bvid}` : ''
}
