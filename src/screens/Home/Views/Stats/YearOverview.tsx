import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, TouchableOpacity, View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { createStyle } from '@/utils/tools'
import { getStatsDailyByRange, getStatsOverview } from '@/core/player/stats'
import { formatDurationFull, getHeatColor, getMonthDays, getTodayText, WEEK_LABELS } from './utils'

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const HeatMonthCard = memo(
  ({
    monthName,
    monthDate,
    dayDurations,
    maxDayDuration,
    todayText,
    visible,
    colorMode,
    primaryColor,
    isDark,
  }: {
    monthName: string
    monthDate: Date
    dayDurations: Map<string, number>
    maxDayDuration: number
    todayText: string
    visible: boolean
    colorMode: LX.AppSetting['stats.heatColorMode']
    primaryColor: string
    isDark: boolean
  }) => {
    const theme = useTheme()
    const anim = useRef(new Animated.Value(0)).current

    useEffect(() => {
      if (!visible) return
      Animated.timing(anim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start()
    }, [visible, anim])

    const days = useMemo(() => getMonthDays(monthDate), [monthDate])

    return (
      <Animated.View
        style={[
          styles.heatMonthCard,
          {
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          },
        ]}
      >
        <Text size={11} color={theme['c-font']} style={styles.heatMonthTitle}>{monthName}</Text>
        <View style={styles.heatWeekRow}>
          {WEEK_LABELS.map((label) => (
            <Text key={label} size={8} color={theme['c-500']} style={styles.heatWeekLabel}>{label}</Text>
          ))}
        </View>
        <View style={styles.heatDayGrid}>
          {days.map(({ dateText, isCurrentMonth }) => {
            const duration = dayDurations.get(dateText) ?? 0
            const isToday = dateText === todayText
            return (
              <View
                key={dateText}
                style={[
                  styles.heatDayCell,
                  {
                    backgroundColor: isCurrentMonth ? getHeatColor(duration, maxDayDuration, colorMode, primaryColor, isDark) : 'transparent',
                    borderColor: isToday ? theme['c-primary'] : 'transparent',
                    borderWidth: isToday ? 1 : 0,
                  },
                ]}
              />
            )
          })}
        </View>
      </Animated.View>
    )
  }
)

/**
 * 年度总览:12 个月时长条 + 年度合计
 */
const YearOverview = memo(() => {
  const theme = useTheme()
  const heatColorMode = useSettingValue('stats.heatColorMode')
  const year = new Date().getFullYear()
  const [monthDurations, setMonthDurations] = useState<number[]>(new Array(12).fill(0))
  const [dayDurations, setDayDurations] = useState<Map<string, number>>(new Map())
  const [yearOverview, setYearOverview] = useState<LX.Stats.Overview>({ totalPlays: 0, totalDuration: 0, activeDays: 0 })
  const [viewMode, setViewMode] = useState<'bar' | 'heat'>('bar')
  const [visibleMonths, setVisibleMonths] = useState(0)

  const loadYear = useCallback(() => {
    const start = new Date(year, 0, 1).getTime()
    const end = new Date(year + 1, 0, 1).getTime() - 1
    void getStatsDailyByRange(start, end).then((daily) => {
      const durations = new Array(12).fill(0)
      const dayMap = new Map<string, number>()
      for (const item of daily) {
        const month = Number(item.date.slice(5, 7)) - 1
        if (month >= 0 && month < 12) durations[month] += item.duration
        dayMap.set(item.date, item.duration)
      }
      setMonthDurations(durations)
      setDayDurations(dayMap)
    })
    void getStatsOverview(start, end).then(setYearOverview)
  }, [year])

  useEffect(() => {
    loadYear()
  }, [loadYear])

  // 热力视图逐月渐入:先清空,再每 90ms 显示一个月,避免一次性渲染 12 个月造成卡顿
  useEffect(() => {
    if (viewMode !== 'heat') return
    setVisibleMonths(0)
    const timer = setInterval(() => {
      setVisibleMonths((prev) => {
        if (prev >= 12) {
          clearInterval(timer)
          return 12
        }
        return prev + 1
      })
    }, 90)
    return () => clearInterval(timer)
  }, [viewMode])

  useEffect(() => {
    const handleStatsUpdated = () => loadYear()
    global.app_event.on('statsUpdated', handleStatsUpdated)
    return () => {
      global.app_event.off('statsUpdated', handleStatsUpdated)
    }
  }, [loadYear])

  const maxMonthDuration = useMemo(() => Math.max(1, ...monthDurations), [monthDurations])
  const maxDayDuration = useMemo(() => Math.max(1, ...Array.from(dayDurations.values())), [dayDurations])
  const todayText = getTodayText()

  return (
    <View style={[styles.card, { backgroundColor: theme['c-primary-background'] }]}>
      <View style={styles.header}>
        <View>
          <Text size={16} color={theme['c-font']} style={styles.title}>{year} 年</Text>
          <Text size={11} color={theme['c-500']}>全年累计 {formatDurationFull(yearOverview.totalDuration)} · {yearOverview.totalPlays} 次有效收听</Text>
        </View>
        <View style={styles.activeDaysChip}>
          <Text size={11} color={theme['c-primary']}>{yearOverview.activeDays} 天活跃</Text>
        </View>
      </View>

      <View style={styles.viewSwitch}>
        <TouchableOpacity
          style={[styles.viewSwitchBtn, viewMode === 'bar' && { backgroundColor: theme['c-primary-alpha-900'] }]}
          onPress={() => setViewMode('bar')}
        >
          <Text size={12} color={viewMode === 'bar' ? theme['c-primary'] : theme['c-500']}>条形</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewSwitchBtn, viewMode === 'heat' && { backgroundColor: theme['c-primary-alpha-900'] }]}
          onPress={() => setViewMode('heat')}
        >
          <Text size={12} color={viewMode === 'heat' ? theme['c-primary'] : theme['c-500']}>热力</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'bar' ? (
      <View style={styles.bars}>
        {monthDurations.map((duration, index) => {
          const ratio = duration / maxMonthDuration
          const isCurrentMonth = index === new Date().getMonth()
          return (
            <View key={index} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(4, Math.round(ratio * 100))}%`,
                      backgroundColor: isCurrentMonth ? theme['c-primary'] : theme['c-primary-alpha-500'],
                    },
                  ]}
                />
              </View>
              <Text size={9} color={isCurrentMonth ? theme['c-primary'] : theme['c-500']} style={styles.barLabel}>
                {MONTH_NAMES[index]}
              </Text>
            </View>
          )
        })}
      </View>
      ) : (
      <View style={styles.heatGrid}>
        {MONTH_NAMES.map((monthName, monthIndex) => {
          return (
            <HeatMonthCard
              key={monthName}
              monthName={monthName}
              monthDate={new Date(year, monthIndex, 1)}
              dayDurations={dayDurations}
              maxDayDuration={maxDayDuration}
              todayText={todayText}
              visible={monthIndex < visibleMonths}
              colorMode={heatColorMode}
              primaryColor={theme['c-primary']}
              isDark={theme.isDark}
            />
          )
        })}
      </View>
      )}
    </View>
  )
})

const styles = createStyle({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontWeight: '700',
  },
  activeDaysChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(77,175,124,0.12)',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    width: 12,
    height: 90,
    borderRadius: 6,
    backgroundColor: 'rgba(128,128,128,0.12)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    textAlign: 'center',
  },
  viewSwitch: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  viewSwitchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  heatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heatMonthCard: {
    width: '47%',
    flexGrow: 1,
  },
  heatMonthTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  heatWeekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  heatWeekLabel: {
    flex: 1,
    textAlign: 'center',
  },
  heatDayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  heatDayCell: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
})

export default YearOverview
