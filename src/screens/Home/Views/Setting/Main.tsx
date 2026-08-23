import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Animated,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import Text from '@/components/common/Text'
import Section from './components/Section'
import { useBackHandler } from '@/utils/hooks/useBackHandler'
import commonState from '@/store/common/state'
import { setNavActiveId } from '@/core/common'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'

import IsStartupAutoPlay from './settings/Basic/IsStartupAutoPlay'
import IsHomePageScroll from './settings/Basic/IsHomePageScroll'
import StartupNav from './settings/Basic/StartupNav'
import IsUseSystemFileSelector from './settings/Basic/IsUseSystemFileSelector'
import IsAlwaysKeepStatusbarHeight from './settings/Basic/IsAlwaysKeepStatusbarHeight'
import DrawerLayoutPosition from './settings/Basic/DrawerLayoutPosition'
import Language from './settings/Basic/Language'
import FontSize from './settings/Basic/FontSize'
import ShareType from './settings/Basic/ShareType'
import NavMenu from './settings/Basic/NavMenu'
import HideNavigationBar from './settings/Basic/HideNavigationBar'
import IsShowStartupGreeting from './settings/Other/IsShowStartupGreeting'

import ThemeGroup from './settings/Theme'

import Source from './settings/Basic/Source'
import SourceName from './settings/Basic/SourceName'
import WyCookie from './settings/Basic/WyCookie'

import PlayHighQuality from './settings/Player/PlayHighQuality'

import IsSavePlayTime from './settings/Player/IsSavePlayTime'
import IsSwipeToShowPlaylist from './settings/Player/IsSwipeToShowPlaylist'
import IsAutoCleanPlayedList from './settings/Player/IsAutoCleanPlayedList'
import IsHandleAudioFocus from './settings/Player/IsHandleAudioFocus'
import IsEnableAudioOffload from './settings/Player/IsEnableAudioOffload'
import IsShowNotificationImage from './settings/Player/IsShowNotificationImage'
import IsShowBluetoothLyric from './settings/Player/IsShowBluetoothLyric'
import IsShowLyricTranslation from './settings/Player/IsShowLyricTranslation'
import IsShowLyricRoma from './settings/Player/IsShowLyricRoma'
import IsS2T from './settings/Player/IsS2T'
import MaxCache from './settings/Player/MaxCache'

import LyricDesktopIsShow from './settings/LyricDesktop/IsShowLyric'
import LyricDesktopIsLock from './settings/LyricDesktop/IsLockLyric'
import LyricDesktopIsToggleAnima from './settings/LyricDesktop/IsShowToggleAnima'
import LyricDesktopIsSingleLine from './settings/LyricDesktop/IsSingleLine'
import LyricDesktopTheme from './settings/LyricDesktop/Theme'
import LyricDesktopTextSize from './settings/LyricDesktop/TextSize'
import LyricDesktopViewWidth from './settings/LyricDesktop/ViewWidth'
import LyricDesktopMaxLineNum from './settings/LyricDesktop/MaxLineNum'
import LyricDesktopTextOpacity from './settings/LyricDesktop/TextOpacity'
import LyricDesktopTextPositionX from './settings/LyricDesktop/TextPositionX'
import LyricDesktopTextPositionY from './settings/LyricDesktop/TextPositionY'

import IsClickPlayList from './settings/List/IsClickPlayList'
import IsShowAlbumName from './settings/List/IsShowAlbumName'
import IsShowInterval from './settings/List/IsShowInterval'
import IsShowMyListSubMenu from './settings/List/IsShowMyListSubMenu'
import IsAutoSaveDailyRec from './settings/List/IsAutoSaveDailyRec'
import AddMusicLocationType from './settings/List/AddMusicLocationType'
import MenuSettings from './settings/List/MenuSettings'

import DownloadPath from './settings/Download/DownloadPath'
import IsWriteTags from './settings/Download/IsWriteTags'
import IsWriteAlias from './settings/Download/IsWriteAlias'
import IsWriteLyrics from './settings/Download/IsWriteLyrics'
import IsWriteRomaLyrics from './settings/Download/IsWriteRomaLyrics'
import IsWriteEmbedLyrics from './settings/Download/IsWriteEmbedLyrics'
import IsWriteCover from './settings/Download/IsWriteCover'
import FileNameFormat from './settings/Download/FileNameFormat'

import Sync from './settings/Sync'
import BackupPart from './settings/Backup/Part'
import ResourceCache from './settings/Other/ResourceCache'
import MetaCache from './settings/Other/MetaCache'
import DislikeList from './settings/Other/DislikeList'
import Log from './settings/Other/Log'
import Version from './settings/Version'
import About from './settings/About'

export const SETTING_SCREENS = [
  'basic',
  'theme',
  'source',
  'quality',
  'player',
  'lyric_desktop',
  'list',
  'download',
  'sync',
  'backup',
  'other',
  'about',
] as const

export type SettingScreenIds = (typeof SETTING_SCREENS)[number]

const normalizeSettingId = (id: string): SettingScreenIds => {
  if ((SETTING_SCREENS as readonly string[]).includes(id)) return id as SettingScreenIds
  if (id === 'version' || id === 'search') return 'basic'
  return 'basic'
}

interface SettingItem {
  id: string
  category: SettingScreenIds
  keywords: string[]
  component: React.ComponentType
}

const SETTING_ITEMS: SettingItem[] = [
  { id: 'startup_auto_play', category: 'basic', keywords: ['启动', '自动播放', 'startup', 'auto play'], component: IsStartupAutoPlay },
  { id: 'home_page_scroll', category: 'basic', keywords: ['每日推荐', '首页', '滑动', 'home', 'scroll'], component: IsHomePageScroll },
  { id: 'startup_nav', category: 'basic', keywords: ['启动', '主页', '打开', '启动页面', 'startup', 'home'], component: StartupNav },
  { id: 'system_file_selector', category: 'basic', keywords: ['文件选择器', '系统', 'file selector'], component: IsUseSystemFileSelector },
  { id: 'statusbar_height', category: 'basic', keywords: ['状态栏', 'statusbar'], component: IsAlwaysKeepStatusbarHeight },
  { id: 'drawer_position', category: 'basic', keywords: ['抽屉', '侧边栏', 'drawer'], component: DrawerLayoutPosition },
  { id: 'language', category: 'basic', keywords: ['语言', 'language'], component: Language },
  { id: 'font_size', category: 'basic', keywords: ['字体', '字号', 'font'], component: FontSize },
  { id: 'share_type', category: 'basic', keywords: ['分享', 'share'], component: ShareType },
  { id: 'nav_menu', category: 'basic', keywords: ['导航', '菜单', 'nav', 'menu'], component: NavMenu },
  { id: 'hide_navigation_bar', category: 'basic', keywords: ['导航栏', '隐藏', 'navigation bar'], component: HideNavigationBar },
  { id: 'startup_greeting', category: 'basic', keywords: ['欢迎语', '启动问候', 'greeting'], component: IsShowStartupGreeting },

  { id: 'theme_group', category: 'theme', keywords: ['主题', '背景', '动态背景', '模糊', '封面', 'theme', 'background', 'blur'], component: ThemeGroup },

  { id: 'api_source', category: 'source', keywords: ['音源', 'api', 'source', '网易云', '酷狗', '酷我', '咪咕'], component: Source },
  { id: 'source_name', category: 'source', keywords: ['音源名称', '别名', 'source name'], component: SourceName },
  { id: 'wy_cookie', category: 'source', keywords: ['Cookie', '网易云', '网页登录', 'SerpApi'], component: WyCookie },

  { id: 'play_quality', category: 'quality', keywords: ['音质', 'quality', '320k', '128k', '无损'], component: PlayHighQuality },

  { id: 'save_play_time', category: 'player', keywords: ['播放进度', '保存', 'save play time'], component: IsSavePlayTime },
  { id: 'swipe_show_playlist', category: 'player', keywords: ['上滑', '播放列表', 'swipe'], component: IsSwipeToShowPlaylist },
  { id: 'auto_clean_played', category: 'player', keywords: ['已播放列表', '随机', '清空', 'auto clean'], component: IsAutoCleanPlayedList },
  { id: 'audio_focus', category: 'player', keywords: ['音频焦点', '自动暂停', 'audio focus'], component: IsHandleAudioFocus },
  { id: 'audio_offload', category: 'player', keywords: ['音频卸载', '省电', 'audio offload'], component: IsEnableAudioOffload },
  { id: 'notification_image', category: 'player', keywords: ['通知栏', '歌曲图片', 'notification'], component: IsShowNotificationImage },
  { id: 'bluetooth_lyric', category: 'player', keywords: ['蓝牙', '歌词', 'bluetooth'], component: IsShowBluetoothLyric },
  { id: 'lyric_translation', category: 'player', keywords: ['歌词翻译', '翻译', 'translation'], component: IsShowLyricTranslation },
  { id: 'lyric_roma', category: 'player', keywords: ['罗马音', '罗马歌词', 'roma'], component: IsShowLyricRoma },
  { id: 's2t', category: 'player', keywords: ['繁体', '简体', 's2t'], component: IsS2T },
  { id: 'max_cache', category: 'player', keywords: ['缓存', '缓存大小', 'cache'], component: MaxCache },

  { id: 'desktop_lyric_enable', category: 'lyric_desktop', keywords: ['桌面歌词', '歌词', 'desktop lyric'], component: LyricDesktopIsShow },
  { id: 'desktop_lyric_lock', category: 'lyric_desktop', keywords: ['桌面歌词', '锁定', 'lock'], component: LyricDesktopIsLock },
  { id: 'desktop_lyric_anima', category: 'lyric_desktop', keywords: ['桌面歌词', '动画', 'anima'], component: LyricDesktopIsToggleAnima },
  { id: 'desktop_lyric_single_line', category: 'lyric_desktop', keywords: ['桌面歌词', '单行', 'single line'], component: LyricDesktopIsSingleLine },
  { id: 'desktop_lyric_theme', category: 'lyric_desktop', keywords: ['桌面歌词', '主题', '颜色'], component: LyricDesktopTheme },
  { id: 'desktop_lyric_text_size', category: 'lyric_desktop', keywords: ['桌面歌词', '字体', '大小'], component: LyricDesktopTextSize },
  { id: 'desktop_lyric_view_width', category: 'lyric_desktop', keywords: ['桌面歌词', '宽度'], component: LyricDesktopViewWidth },
  { id: 'desktop_lyric_max_line', category: 'lyric_desktop', keywords: ['桌面歌词', '行数'], component: LyricDesktopMaxLineNum },
  { id: 'desktop_lyric_opacity', category: 'lyric_desktop', keywords: ['桌面歌词', '透明度'], component: LyricDesktopTextOpacity },
  { id: 'desktop_lyric_pos_x', category: 'lyric_desktop', keywords: ['桌面歌词', '水平', '位置'], component: LyricDesktopTextPositionX },
  { id: 'desktop_lyric_pos_y', category: 'lyric_desktop', keywords: ['桌面歌词', '垂直', '位置'], component: LyricDesktopTextPositionY },

  { id: 'list_click_action', category: 'list', keywords: ['列表', '双击', '播放', 'click'], component: IsClickPlayList },
  { id: 'list_show_album', category: 'list', keywords: ['列表', '专辑', 'album'], component: IsShowAlbumName },
  { id: 'list_show_interval', category: 'list', keywords: ['列表', '时长', 'interval'], component: IsShowInterval },
  { id: 'list_show_submenu', category: 'list', keywords: ['列表', '子菜单', 'submenu'], component: IsShowMyListSubMenu },
  { id: 'list_auto_save_daily', category: 'list', keywords: ['列表', '每日推荐', '自动保存'], component: IsAutoSaveDailyRec },
  { id: 'list_add_location', category: 'list', keywords: ['列表', '添加位置', '顶部', '底部'], component: AddMusicLocationType },
  { id: 'list_menu_settings', category: 'list', keywords: ['列表', '菜单', '菜单设置'], component: MenuSettings },

  { id: 'download_path', category: 'download', keywords: ['下载', '路径', 'download path'], component: DownloadPath },
  { id: 'download_write_tags', category: 'download', keywords: ['下载', '元数据', '标签', 'tags'], component: IsWriteTags },
  { id: 'download_write_alias', category: 'download', keywords: ['下载', '别名', 'alias'], component: IsWriteAlias },
  { id: 'download_write_lyric', category: 'download', keywords: ['下载', '歌词', 'lyric'], component: IsWriteLyrics },
  { id: 'download_write_roma', category: 'download', keywords: ['下载', '罗马音', 'roma'], component: IsWriteRomaLyrics },
  { id: 'download_embed_lyric', category: 'download', keywords: ['下载', '内嵌歌词', 'embed lyric'], component: IsWriteEmbedLyrics },
  { id: 'download_write_cover', category: 'download', keywords: ['下载', '封面', 'cover'], component: IsWriteCover },
  { id: 'download_file_name', category: 'download', keywords: ['下载', '文件名', '命名'], component: FileNameFormat },

  { id: 'sync', category: 'sync', keywords: ['同步', 'WebDAV', '歌单', 'sync'], component: Sync },

  { id: 'backup', category: 'backup', keywords: ['备份', '恢复', '导入', '导出', 'backup'], component: BackupPart },

  { id: 'resource_cache', category: 'other', keywords: ['缓存', '资源', '清理', 'cache'], component: ResourceCache },
  { id: 'meta_cache', category: 'other', keywords: ['缓存', '元数据', '清理'], component: MetaCache },
  { id: 'dislike_list', category: 'other', keywords: ['不喜欢', '黑名单', 'dislike'], component: DislikeList },
  { id: 'log', category: 'other', keywords: ['日志', 'log'], component: Log },

  { id: 'version', category: 'about', keywords: ['版本', '更新', '检查更新', 'version'], component: Version },
  { id: 'about', category: 'about', keywords: ['关于', 'about'], component: About },
]

export interface MainType {
  setActiveId: (id: SettingScreenIds) => void
}

interface SettingsViewProps {
  showCategoryNav?: boolean
}

const SettingsView = forwardRef<MainType, SettingsViewProps>(({ showCategoryNav = true }, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const [activeId, setActiveId] = useState<SettingScreenIds | null>(() =>
    showCategoryNav ? null : normalizeSettingId(global.lx.settingActiveId)
  )
  const [searchText, setSearchText] = useState('')
  const [showTop, setShowTop] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const topBtnOpacity = useRef(new Animated.Value(0)).current
  const contentOpacity = useRef(new Animated.Value(1)).current

  const animateContentSwitch = useCallback((update: () => void) => {
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 90,
      useNativeDriver: true,
    }).start(() => {
      update()
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }).start()
    })
  }, [contentOpacity])

  useImperativeHandle(ref, () => ({
    setActiveId(id) {
      setActiveId(normalizeSettingId(id))
    },
  }))

  useEffect(() => {
    if (activeId) global.lx.settingActiveId = activeId
  }, [activeId])

  useBackHandler(
    useCallback(() => {
      if (commonState.componentIds.length > 1) return false
      if (commonState.navActiveId !== 'nav_setting') return false
      // 搜索状态:先清空搜索
      if (searchText) {
        setSearchText('')
        return true
      }
      // 竖屏子级设置页:先退回父级分组列表
      if (showCategoryNav && activeId) {
        animateContentSwitch(() => {
          setActiveId(null)
          setSearchText('')
        })
        return true
      }
      // 设置根级:返回进入设置前的页面
      setNavActiveId(commonState.lastNavActiveId)
      return true
    }, [searchText, showCategoryNav, activeId, animateContentSwitch])
  )

  useEffect(() => {
    Animated.timing(topBtnOpacity, {
      toValue: showTop ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }, [showTop, topBtnOpacity])

  const handleSelectCategory = useCallback((id: SettingScreenIds) => {
    animateContentSwitch(() => {
      setActiveId(id)
      setSearchText('')
      global.lx.settingActiveId = id
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    })
  }, [animateContentSwitch])

  const query = searchText.trim().toLowerCase()

  const searchMatchedItems = useMemo(() => {
    if (!query) return null
    return SETTING_ITEMS.filter((item) => {
      const categoryTitle = t(`setting_${item.category}`).toLowerCase()
      if (categoryTitle.includes(query)) return true
      return item.keywords.some((keyword) => {
        const lower = keyword.toLowerCase()
        return lower.includes(query) || query.includes(lower)
      })
    })
  }, [query, t])

  const groupedMatchedItems = useMemo(() => {
    if (!searchMatchedItems) return null
    const map = new Map<SettingScreenIds, SettingItem[]>()
    for (const item of searchMatchedItems) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return Array.from(map.entries())
  }, [searchMatchedItems])

  const currentItems = useMemo(
    () => SETTING_ITEMS.filter((item) => item.category === activeId),
    [activeId]
  )

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true })
  }, [])

  const renderItem = (item: SettingItem) => {
    const ItemComponent = item.component
    return (
      <View key={item.id} style={styles.item}>
        <ItemComponent />
      </View>
    )
  }

  const renderRootList = () => (
    <View style={styles.rootList}>
      {SETTING_SCREENS.map((id, index) => (
        <TouchableOpacity
          key={id}
          style={[styles.rootRow, index < SETTING_SCREENS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme['c-border-background'] }]}
          onPress={() => handleSelectCategory(id)}
        >
          <Text size={15} color={theme['c-font']} style={styles.rootRowText}>{t(`setting_${id}`)}</Text>
          <Text size={22} color={theme['c-500']}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderCategoryContent = () => (
    <Section title={t(`setting_${activeId ?? 'basic'}`)}>
      {currentItems.map(renderItem)}
    </Section>
  )

  const renderSearchContent = () => {
    if (!groupedMatchedItems) return null
    if (groupedMatchedItems.length === 0) {
      return (
        <View style={styles.emptySearch}>
          <Text size={13} color={theme['c-500']}>没有找到相关设置</Text>
        </View>
      )
    }
    return groupedMatchedItems.map(([category, items]) => (
      <Section key={category} title={t(`setting_${category}`)}>
        {items.map(renderItem)}
      </Section>
    ))
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="搜索设置"
          placeholderTextColor={theme['c-450']}
          style={[
            styles.searchInput,
            {
              backgroundColor: theme['c-primary-input-background'],
              color: theme['c-font'],
              borderColor: theme['c-border-background'],
            },
          ]}
          returnKeyType="search"
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.searchClear}>
            <Text size={13} color={theme['c-500']}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
        {showCategoryNav && activeId && !query ? (
          <View style={[styles.subHeader, { borderBottomColor: theme['c-border-background'] }]}>
            <TouchableOpacity style={styles.subHeaderBack} onPress={() => {
              animateContentSwitch(() => {
                setActiveId(null)
                setSearchText('')
              })
            }}>
              <Text size={15} color={theme['c-primary']}>‹ 返回</Text>
            </TouchableOpacity>
            <Text size={16} color={theme['c-font']} style={styles.subHeaderTitle} numberOfLines={1}>
              {t(`setting_${activeId}`)}
            </Text>
            <View style={styles.subHeaderPlaceholder} />
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="always"
          scrollEventThrottle={16}
          onScroll={(event) => {
            const y = event.nativeEvent.contentOffset.y
            setShowTop(y > 200)
          }}
        >
          {query ? renderSearchContent() : activeId ? renderCategoryContent() : renderRootList()}
        </ScrollView>
      </Animated.View>

      <Animated.View
        style={[styles.topBtn, { opacity: topBtnOpacity }]}
        pointerEvents={showTop ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={[styles.topBtnInner, { backgroundColor: theme['c-primary'], borderColor: theme['c-primary-dark-100'] }]}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <Text size={18} color="#fff" style={styles.topBtnText}>↑</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
})

export default SettingsView

const styles = createStyle({
  container: {
    flex: 1,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  searchClear: {
    position: 'absolute',
    right: 28,
    top: 22,
  },
  rootList: {
    flex: 1,
  },
  rootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rootRowText: {
    flex: 1,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderBottomWidth: 1,
  },
  subHeaderBack: {
    width: 72,
  },
  subHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
  },
  subHeaderPlaceholder: {
    width: 72,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  item: {
    marginBottom: 4,
  },
  emptySearch: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  topBtn: {
    position: 'absolute',
    right: 18,
    bottom: 28,
  },
  topBtnInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  topBtnText: {
    fontWeight: '800',
  },
})
