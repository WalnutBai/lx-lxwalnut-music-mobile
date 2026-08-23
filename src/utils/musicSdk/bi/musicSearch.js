/**
 * 小哔音乐搜索
 * B 站视频搜索接口 -> 视频即音乐
 */
import { biliFetch, stripTags, normalizePic, BI_SOURCE } from './util'

export default {
  limit: 30,
  total: 0,
  page: 0,
  allPage: 1,

  /**
   * 将 B 站搜索结果格式化为旧版 musicInfo 结构
   */
  handleResult(rawList) {
    return rawList.map((item) => {
      const bvid = item.bvid
      return {
        name: stripTags(item.title) || '未知标题',
        singer: stripTags(item.author) || '未知UP主',
        source: BI_SOURCE,
        songmid: bvid,
        albumId: '',
        interval: item.duration || '',
        albumName: '',
        lrc: null,
        img: normalizePic(item.pic),
        otherSource: null,
        types: [
          { type: '128k', size: null },
          { type: '320k', size: null },
        ],
        _types: {
          '128k': { size: null },
          '320k': { size: null },
        },
        typeUrl: {},
        // 保留原始信息，供 getMusicUrl / getLyric 使用
        _biData: { bvid },
      }
    })
  },

  /**
   * 搜索音乐
   */
  search(keyword, page = 1, limit, retryNum = 0) {
    if (++retryNum > 3) return Promise.reject(new Error('B站搜索失败，请稍后重试'))
    if (limit == null) limit = this.limit

    const params = `search_type=video&keyword=${encodeURIComponent(keyword)}&page=${page}&page_size=${limit}`
    return biliFetch(`/x/web-interface/search/type?${params}`)
      .then((data) => {
        if (data.code !== 0 || !data.data) {
          throw new Error(`B站搜索失败: ${data.message || data.code}`)
        }
        const rawList = (data.data.result || []).filter(
          (item) => item.type === 'video' && item.bvid
        )
        this.total = data.data.numResults || rawList.length
        this.page = page
        this.allPage = this.total > 0 ? Math.ceil(this.total / limit) : 0
        const list = this.handleResult(rawList)

        return {
          list,
          allPage: this.allPage,
          total: this.total,
          limit,
          source: BI_SOURCE,
        }
      })
      .catch((err) => {
        console.log(`[bi] 搜索出错，重试 ${retryNum}/3:`, err.message)
        return this.search(keyword, page, limit, retryNum)
      })
  },
}
