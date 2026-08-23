/**
 * 统计页工具函数:日期、时长格式化、热力色阶
 */

export const DAY = 24 * 60 * 60 * 1000

export const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

export const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return '0分钟'
  const totalMinutes = Math.floor(seconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}分钟`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours}小时${minutes}分` : `${hours}小时`
}

export const formatDurationFull = (seconds: number): string => {
  if (seconds <= 0) return '0分钟'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h <= 0) return `${m}分钟`
  return `${h}小时${m}分`
}

export const formatNumber = (n: number): string => {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, '')}万`
  return `${n}`
}

export const getTodayText = () => toDateText(new Date())

export const toDateText = (date: Date) => {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const parseDateText = (text: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const [y, m, d] = text.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

export const toMonthText = (date: Date) => `${date.getFullYear()}年${date.getMonth() + 1}月`

export const changeMonth = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1)

export interface MonthDay {
  date: Date
  dateText: string
  isCurrentMonth: boolean
}

/**
 * 生成一个月历网格(固定 42 格,周一起始)
 */
export const getMonthDays = (monthDate: Date): MonthDay[] => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7))

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      date,
      dateText: toDateText(date),
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    }
  })
}

/**
 * 热力色阶:绿 → 黄 → 橙 → 红(HSL 插值)
 * @param duration 当天时长(秒)
 * @param maxDuration 满色基准(当月最大时长)
 */
export const getClassicHeatColor = (duration: number, maxDuration: number, isDark = false): string => {
  if (duration <= 0) return 'rgba(128,128,128,0.12)'
  const ratio = Math.min(1, Math.sqrt(duration / Math.max(maxDuration, 1)))
  // hue: 145(绿) -> 0(红)
  const hue = Math.round(145 - 145 * ratio)
  const sat = 65 + Math.round(20 * ratio)
  // 暗色主题下高值要更亮,否则高值发黑、低值反而刺眼
  const light = isDark ? 30 + Math.round(25 * ratio) : 45 - Math.round(15 * ratio)
  return `hsl(${hue}, ${sat}%, ${light}%)`
}

export type HeatColorMode = LX.AppSetting['stats.heatColorMode']

const parseRgb = (color: string): [number, number, number] | null => {
  const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  let hex = color.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
}

const mixRgb = (base: [number, number, number], target: [number, number, number], weight: number): string => {
  const r = Math.round(base[0] + (target[0] - base[0]) * weight)
  const g = Math.round(base[1] + (target[1] - base[1]) * weight)
  const b = Math.round(base[2] + (target[2] - base[2]) * weight)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * 主题色 5 级色阶(由浅到深)
 */
export const getThemeHeatColors = (primaryColor: string, isDark = false): string[] => {
  const primary = parseRgb(primaryColor) ?? [77, 175, 124]
  if (isDark) {
    return [
      mixRgb(primary, [0, 0, 0], 0.44),
      mixRgb(primary, [0, 0, 0], 0.24),
      mixRgb(primary, [255, 255, 255], 0),
      mixRgb(primary, [255, 255, 255], 0.36),
      mixRgb(primary, [255, 255, 255], 0.72),
    ]
  }
  return [
    mixRgb(primary, [255, 255, 255], 0.72),
    mixRgb(primary, [255, 255, 255], 0.36),
    mixRgb(primary, [255, 255, 255], 0),
    mixRgb(primary, [0, 0, 0], 0.24),
    mixRgb(primary, [0, 0, 0], 0.44),
  ]
}

const rgbToHsl = ([r, g, b]: [number, number, number]): [number, number, number] => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return [h, s, l]
}

const hslToCss = (h: number, s: number, l: number) =>
  `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`

/**
 * 莫奈取色(Android 12 Monet 动态配色风格)
 * 基于种子色生成 Material You 风格的 5 级 tonal palette(由浅到深)。
 * 种子色取当前主题色;真实 Android 12 会从壁纸提取种子色,这里用 App 主题色作为种子。
 */
export const getMonetHeatColors = (seedColor: string, isDark = false): string[] => {
  const seed = parseRgb(seedColor) ?? [77, 175, 124]
  const [h, s] = rgbToHsl(seed)
  const tones = isDark ? [10, 30, 50, 70, 90] : [90, 70, 50, 30, 10]
  return tones.map((tone) => {
    const l = tone / 100
    // Material You tonal palette 在两端降饱和,中间保持较高彩度
    const sat = s * (1 - Math.abs(tone - 50) / 100)
    return hslToCss(h, Math.max(0.08, sat), l)
  })
}

/**
 * 统一热力取色
 * @param mode theme = 主题色5级 / classic = 绿到红连续 / monet = 莫奈5级
 */
export const getHeatColor = (
  duration: number,
  maxDuration: number,
  mode: HeatColorMode = 'classic',
  primaryColor = 'rgb(77, 175, 124)',
  isDark = false
): string => {
  if (duration <= 0) return 'rgba(128,128,128,0.12)'
  if (mode === 'classic') return getClassicHeatColor(duration, maxDuration, isDark)

  const colors = mode === 'monet' ? getMonetHeatColors(primaryColor, isDark) : getThemeHeatColors(primaryColor, isDark)
  const ratio = Math.sqrt(duration / Math.max(maxDuration, 1))
  const index = Math.max(0, Math.min(colors.length - 1, Math.floor(ratio * colors.length)))
  return colors[index]
}

export const hasHeatData = (duration: number) => duration > 0
