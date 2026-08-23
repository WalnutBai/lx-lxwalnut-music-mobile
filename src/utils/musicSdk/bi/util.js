/**
 * 小哔音乐（Bilibili 视频音源）工具函数
 * 参考: otter-music / music-lib 的 B 站音源实现
 */
import BackgroundTimer from 'react-native-background-timer'
import { toMD5 } from '../utils'

export const BI_SOURCE = 'bi'
export const BI_SOURCE_NAME = '小哔音乐'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const BASE = 'https://api.bilibili.com'

// ---------- Cookie 管理 ----------
let cookie = ''
let cookiePromise = null

const parseSetCookies = (setCookieHeader) => {
  const jar = {}
  const values = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
  for (const str of values) {
    if (!str) continue
    const parts = String(str).split(/,(?=\s*[A-Za-z0-9_-]+=)/)
    for (const part of parts) {
      const match = part.match(/^\s*([A-Za-z0-9_-]+)=([^;]*)/)
      if (match) jar[match[1]] = match[2]
    }
  }
  return jar
}

/**
 * 获取 B 站风控所需 Cookie（buvid3 等）
 */
export const ensureCookie = async (forceRefresh = false) => {
  if (cookie && !forceRefresh) return cookie
  if (cookiePromise) return cookiePromise

  cookiePromise = (async () => {
    const controller = new AbortController()
    const timer = BackgroundTimer.setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch('https://www.bilibili.com/', {
        headers: { 'User-Agent': UA },
        signal: controller.signal,
      })
      const setCookie =
        res.headers?.map?.['set-cookie'] ??
        (typeof res.headers?.getSetCookie === 'function' ? res.headers.getSetCookie() : null)
      const jar = parseSetCookies(setCookie)
      cookie = ['buvid3', 'buvid4', 'b_nut', '_uuid']
        .filter((k) => jar[k])
        .map((k) => `${k}=${jar[k]}`)
        .join('; ')
      if (!cookie) {
        console.warn('[bi] 首页未返回有效 Cookie，搜索可能被风控拦截')
      } else {
        console.log('[bi] Cookie 已更新')
      }
      return cookie
    } catch (err) {
      console.warn('[bi] 获取 Cookie 失败，使用空 Cookie 尝试:', err.message)
      return cookie || ''
    } finally {
      BackgroundTimer.clearTimeout(timer)
      cookiePromise = null
    }
  })()

  return cookiePromise
}

// ---------- 基础请求 ----------
/**
 * 请求 B 站 API，自动带 UA / Referer / Cookie
 */
export const biliFetch = async (path, { referer = 'https://www.bilibili.com/' } = {}) => {
  const cookieStr = await ensureCookie()
  const controller = new AbortController()
  const timer = BackgroundTimer.setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'User-Agent': UA,
        Referer: referer,
        ...(cookieStr ? { Cookie: cookieStr } : {}),
      },
      signal: controller.signal,
    })
    const text = await res.text()
    if (!res.ok) {
      throw new Error(`B 站请求失败 HTTP ${res.status}`)
    }
    try {
      return JSON.parse(text)
    } catch {
      throw new Error('B 站响应不是有效 JSON')
    }
  } finally {
    BackgroundTimer.clearTimeout(timer)
  }
}

// ---------- 文本与 URL 处理 ----------
export const stripTags = (str = '') =>
  String(str)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()

export const normalizeUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('//')) return `https:${url}`
  return url
}

export const normalizePic = (pic) => normalizeUrl(pic)

// ---------- cid 缓存 ----------
const cidCache = new Map()

/**
 * 根据 bvid 获取默认分 P 的 cid（带缓存）
 */
export const getCid = async (bvid) => {
  if (cidCache.has(bvid)) return cidCache.get(bvid)
  const referer = `https://www.bilibili.com/video/${bvid}`
  const data = await biliFetch(`/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`, { referer })
  if (data.code !== 0 || !data.data) {
    throw new Error(`获取视频详情失败: ${data.message || data.code}`)
  }
  const cid = data.data.pages?.[0]?.cid ?? data.data.cid
  if (!cid) throw new Error('获取视频 cid 失败')
  cidCache.set(bvid, cid)
  return cid
}

// ---------- WBI 签名 ----------
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
]

const getMixinKey = (orig) => {
  let temp = ''
  for (const n of MIXIN_KEY_ENC_TAB) {
    temp += orig[n]
  }
  return temp.slice(0, 32)
}

let wbiKeys = null
let wbiKeysPromise = null

/**
 * 获取 WBI 签名密钥（来自 nav 接口）
 */
export const ensureWbiKeys = async () => {
  if (wbiKeys) return wbiKeys
  if (wbiKeysPromise) return wbiKeysPromise

  wbiKeysPromise = (async () => {
    const data = await biliFetch('/x/web-interface/nav')
    if (data.code !== 0 || !data.data?.wbi_img) {
      throw new Error(`获取 WBI 签名密钥失败: ${data.message || data.code}`)
    }
    const imgUrl = data.data.wbi_img.img_url
    const subUrl = data.data.wbi_img.sub_url
    const imgKey = String(imgUrl).split('/').pop()?.split('.')[0] ?? ''
    const subKey = String(subUrl).split('/').pop()?.split('.')[0] ?? ''
    if (!imgKey || !subKey) throw new Error('WBI 签名密钥为空')
    wbiKeys = { imgKey, subKey }
    return wbiKeys
  })().finally(() => {
    wbiKeysPromise = null
  })

  return wbiKeysPromise
}

/**
 * 对参数做 WBI 签名，返回完整 query string
 */
export const signWbiParams = async (params) => {
  const keys = await ensureWbiKeys()
  const mixinKey = getMixinKey(keys.imgKey + keys.subKey)
  const signed = { ...params, wts: Math.round(Date.now() / 1000) }
  const chrFilter = /[!'()*]/g
  const query = Object.keys(signed)
    .sort()
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(signed[key]).replace(chrFilter, ''))}`
    )
    .join('&')
  const w_rid = toMD5(query + mixinKey)
  return `${query}&w_rid=${w_rid}`
}

// ---------- B 站字幕转 LRC ----------
/**
 * B 站字幕 JSON body 转 LRC 字符串
 */
export const subtitleToLrc = (body) => {
  if (!Array.isArray(body)) return ''
  return body
    .map((item) => {
      const from = item.from
      if (typeof from !== 'number' || !item.content) return ''
      const mins = Math.floor(from / 60)
      const secs = Math.floor(from % 60)
      const ms = Math.round((from - Math.floor(from)) * 100)
      const text = String(item.content).replace(/\s+/g, ' ').trim()
      if (!text) return ''
      return `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}]${text}`
    })
    .filter(Boolean)
    .join('\n')
}

export const EMPTY_LRC = '[00:00:00]暂无歌词'
