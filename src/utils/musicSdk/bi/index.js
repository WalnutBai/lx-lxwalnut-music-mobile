import musicSearch from './musicSearch'
import { getMusicUrl, getMusicDetailPageUrl } from './musicInfo'
import { getLyric } from './lyric'
import { normalizePic } from './util'

const bi = {
  musicSearch,

  /**
   * 获取播放 URL
   * @param {object} songInfo 旧版 musicInfo
   * @param {LX.Quality} type 请求音质
   */
  getMusicUrl(songInfo, type) {
    return {
      promise: getMusicUrl(songInfo, type),
    }
  },

  /**
   * 获取歌词
   */
  getLyric(songInfo) {
    return {
      promise: getLyric(songInfo),
    }
  },

  /**
   * 获取封面（搜索时已带 pic，这里兜底）
   */
  getPic(songInfo) {
    return Promise.resolve(normalizePic(songInfo.img))
  },

  /**
   * 获取歌曲详情页 URL
   */
  getMusicDetailPageUrl(songInfo) {
    return getMusicDetailPageUrl(songInfo)
  },
}

export default bi
