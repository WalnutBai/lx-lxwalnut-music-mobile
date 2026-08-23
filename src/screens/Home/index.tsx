import {useCallback, useEffect, useRef} from 'react'
import { useHorizontalMode } from '@/utils/hooks'
import PageContent from '@/components/PageContent'
import {setComponentId, setNavActiveId} from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import Vertical from './Vertical'
import Horizontal from './Horizontal'
import { navigations } from '@/navigation'
import ArtistSelectorManager from '@/components/ArtistSelectorManager'
import settingState from '@/store/setting/state'
import {useI18n} from "@/lang";
import {BackHandler, View} from "react-native";
import {toast} from "@/utils/tools.ts";
import commonState from '@/store/common/state'
import {useBackHandler} from "@/utils/hooks/useBackHandler.ts";

import { setSearchText as setSearchState } from '@/core/search/search'
import WebLoginManager from "@/components/WebLoginManager.tsx";
import DownloadBall from "@/components/DownloadBall";
import YouTubeLoginManager from "@/components/YouTubeLoginManager.tsx";
import VideoPlayerManager from "@/components/VideoPlayerManager.tsx";
import Oobe from './Views/Oobe';
interface Props {
  componentId: string
}

export default ({ componentId }: Props) => {
  const isHorizontalMode = useHorizontalMode()
  const t = useI18n() // 新增
  const lastBackPressed = useRef(0)
  useEffect(() => {
    setComponentId(COMPONENT_IDS.home, componentId)

    if (settingState.setting['player.startupPushPlayDetailScreen']) {
      navigations.pushPlayDetailScreen(componentId, true)
    }

    const handleGlobalSearch = (text: string) => {
      setSearchState(text)
      setNavActiveId('nav_search')
    }

    global.app_event.on('triggerSearch', handleGlobalSearch)

    return () => {
      global.app_event.off('triggerSearch', handleGlobalSearch)
    }

  }, [componentId])

  useBackHandler(
    useCallback(() => {
      // 侧边栏打开时,先关闭侧边栏
      if (global.lx.isDrawerOpen) {
        global.app_event.changeMenuVisible(false)
        return true
      }

      if (commonState.componentIds.length > 1) {
        return false;
      }

      // 如果当前在设置页面，让设置页面的返回逻辑优先处理
      if (commonState.navActiveId === 'nav_setting') {
        return false
      }

      if (commonState.navActiveId === 'nav_play_history') {
        setNavActiveId(commonState.lastNavActiveId)
        return true
      }

      // 从主页/其他入口进入非启动页时,先返回上一页,而不是直接提示退出
      if (commonState.navActiveId !== commonState.previousNavActiveId) {
        setNavActiveId(commonState.previousNavActiveId)
        return true
      }

      const now = Date.now()
      if (lastBackPressed.current && now - lastBackPressed.current < 2000) {
        BackHandler.exitApp()
        return true
      }

      lastBackPressed.current = now
      toast(t('exit_app_tip_double_press'))
      return true
    }, [t])
  )

  return (
    <View style={{ flex: 1 }}>
      <PageContent>{isHorizontalMode ? <Horizontal componentId={componentId} /> : <Vertical componentId={componentId} />}</PageContent>
      <Oobe />
      <ArtistSelectorManager />
      <WebLoginManager />
      {/*<YouTubeLoginManager />*/}
      <VideoPlayerManager />
      <DownloadBall />
    </View>
  )}
