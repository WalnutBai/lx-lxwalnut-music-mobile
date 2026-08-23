import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import {Keyboard, View} from 'react-native'
import Search from '../Views/Search'
import SongList from '../Views/SongList'
import Mylist from '../Views/Mylist'
import Leaderboard from '../Views/Leaderboard'
import Setting from '../Views/Setting'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { createStyle } from '@/utils/tools'
import PagerView, {
  type PageScrollStateChangedNativeEvent,
  type PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view'
import { GestureHandlerRootView, PanGestureHandler, State as GestureState } from 'react-native-gesture-handler'
import { setNavActiveId } from '@/core/common'
import settingState from '@/store/setting/state'
import DailyRec from '../Views/DailyRec'
import MyPlaylist from '../Views/MyPlaylist'
import FollowedArtists from '../Views/FollowedArtists'
import SubscribedAlbums from '../Views/SubscribedAlbums';
import {NAV_MENUS, type NAV_ID_Type} from "@/config/constant.ts";
import {useSettingValue} from "@/store/setting/hook.ts";
import PlayHistory from '../Views/PlayHistory'
import { useTheme } from '@/store/theme/hook'
import OneDrive from '../Views/OneDrive'
import WebDAV from '../Views/WebDAV'
import Stats from '../Views/Stats'
import HomeView from '../Views/Home'

const hideKeys = ['list.isShowAlbumName', 'list.isShowInterval', 'theme.fontShadow'] as Readonly<
  Array<keyof LX.AppSetting>
>

const SearchPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_search')
  const component = useMemo(() => <Search />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_search') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}
const SongListPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_songlist')
  const component = useMemo(() => <SongList />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_songlist') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
  // return activeId == 1 || activeId == 0  ? SongList : null
}
const PlayHistoryOverlay = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_play_history')
  const component = useMemo(() => <PlayHistory />, [])
  const theme = useTheme()
  useEffect(() => {
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      requestAnimationFrame(() => {
        setVisible(id == 'nav_play_history')
      })
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
    }
  }, [])

  return visible ? (
    <View style={{ ...styles.historyOverlay, backgroundColor: theme['c-content-background'] }}>
      {component}
    </View>
  ) : null
}

const isMenuVisible = (id: NAV_ID_Type, navStatus: Partial<Record<NAV_ID_Type, boolean>>) => (
  id !== 'nav_play_history' && (id === 'nav_setting' || (navStatus[id] ?? true))
)
const LeaderboardPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_top')
  const component = useMemo(() => <Leaderboard />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_top') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const DailyRecPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_daily_rec')
  const component = useMemo(() => <DailyRec />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_daily_rec') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const MylistPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_love')
  const component = useMemo(() => <Mylist />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_love') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const MyPlaylistPage = () => {
    const [visible, setVisible] = useState(commonState.navActiveId == 'nav_my_playlist')
    const component = useMemo(() => <MyPlaylist />, [])
    useEffect(() => {
        let currentId: CommonState['navActiveId'] = commonState.navActiveId
          const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
            currentId = id
              if (id == 'nav_my_playlist') {
                requestAnimationFrame(() => {
                    setVisible(true)
                  })
              }
          }
        const handleHide = () => {
            if (currentId != 'nav_setting') return
            setVisible(false)
          }
        const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
            if (keys.some((k) => hideKeys.includes(k))) handleHide()
          }
        global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
        global.state_event.on('themeUpdated', handleHide)
        global.state_event.on('languageChanged', handleHide)
        global.state_event.on('configUpdated', handleConfigUpdated)

        return () => {
            global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
            global.state_event.off('themeUpdated', handleHide)
            global.state_event.off('languageChanged', handleHide)
            global.state_event.off('configUpdated', handleConfigUpdated)
          }
      }, [])

  return visible ? component : null
}

const FollowedArtistsPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_followed_artists')
  const component = useMemo(() => <FollowedArtists />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_followed_artists') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const SubscribedAlbumsPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_subscribed_albums');
  const component = useMemo(() => <SubscribedAlbums />, []);
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId;
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id;
      if (id == 'nav_subscribed_albums') {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      }
    };
    const handleHide = () => {
      if (currentId != 'nav_setting') return;
      setVisible(false);
    };
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, []);
  return visible ? component : null;
};

const OneDrivePage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_onedrive')
  const component = useMemo(() => <OneDrive />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_onedrive') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const WebDAVPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_webdav')
  const component = useMemo(() => <WebDAV />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_webdav') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const HomePage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_home')
  const component = useMemo(() => <HomeView />, [])
  useEffect(() => {
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      if (id == 'nav_home') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (commonState.navActiveId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const StatsPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_stats')
  const component = useMemo(() => <Stats />, [])
  useEffect(() => {
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      if (id == 'nav_stats') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (commonState.navActiveId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const SettingPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_setting')
  const component = useMemo(() => <Setting />, [])
  useEffect(() => {
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      if (id == 'nav_setting') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
    }
  }, [])
  return visible ? component : null
}

const Main = () => {
  const pagerViewRef = useRef<ComponentRef<typeof PagerView>>(null);
  const [activeNavId, setActiveNavIdState] = useState(commonState.navActiveId)
  const navOrder = useSettingValue('common.navOrder'); // 获取菜单排序

  // PagerView 页面列表与侧边栏可见性解耦:
  // 侧边栏隐藏的页面仍保留在 PagerView 中,程序内跳转(如主页点歌单)依旧可达
  const pageNavs = useMemo(() => {
    return navOrder.filter(id => id !== 'nav_play_history')
  }, [navOrder])

  const { viewMap, indexMap } = useMemo(() => {
    const viewMap: Partial<Record<NAV_ID_Type, number>> = {};
    const indexMap: NAV_ID_Type[] = [];
    pageNavs.forEach((id, index) => {
      viewMap[id] = index;
      indexMap.push(id);
    });
    return { viewMap, indexMap };
  }, [pageNavs]);

  // 获取初始索引，如果当前 activeNavId 不在页面列表中，则使用第一个页面
  const getInitialIndex = () => {
    let idx = viewMap[commonState.navActiveId];
    if (idx == null && pageNavs.length > 0) {
      idx = 0;
    }
    return idx ?? 0;
  };
  const activeIndexRef = useRef(getInitialIndex());

  const onPageSelected = useCallback(({ nativeEvent }: PagerViewOnPageSelectedEvent) => {
    activeIndexRef.current = nativeEvent.position;
    const selectedId = indexMap[activeIndexRef.current]
    if (!selectedId) return
    if (selectedId) setActiveNavIdState(selectedId)
    if (activeIndexRef.current !== viewMap[commonState.navActiveId]) {
      setNavActiveId(selectedId);
    }
  }, [indexMap, viewMap]);

  const onPageScrollStateChanged = useCallback(
    ({ nativeEvent }: PageScrollStateChangedNativeEvent) => {
      Keyboard.dismiss();
      const idle = nativeEvent.pageScrollState == 'idle';
      if (global.lx.homePagerIdle != idle) global.lx.homePagerIdle = idle;
    },
    []
  );

  const handlePanGestureState = useCallback((evt: any) => {
    const { state, translationX } = evt.nativeEvent
    if (state === GestureState.END && translationX > 40) {
      global.app_event.changeMenuVisible(true)
    }
  }, [])

  // 当页面列表改变时，确保当前页索引是有效的
  useEffect(() => {
    let index = viewMap[commonState.navActiveId];
    if (index == null && commonState.navActiveId !== 'nav_play_history' && pageNavs.length > 0) {
      index = 0;
      activeIndexRef.current = index;
      if (pageNavs[0]) {
        setNavActiveId(pageNavs[0]);
      }
    } else if (index != null) {
      activeIndexRef.current = index;
      pagerViewRef.current?.setPageWithoutAnimation(index);
    }
  }, [viewMap, pageNavs]);

  useEffect(() => {
    const handleUpdate = (id: CommonState['navActiveId']) => {
      setActiveNavIdState(id)
      pagerViewRef.current?.setScrollEnabled(false);
      if (id === 'nav_play_history') return
      let index = viewMap[id];
      if (index == null && pageNavs.length > 0) {
        index = 0;
      }
      if (index != null && activeIndexRef.current !== index) {
        activeIndexRef.current = index;
        pagerViewRef.current?.setPage(index);
      }
    };
    global.state_event.on('navActiveIdUpdated', handleUpdate);
    return () => {
      global.state_event.off('navActiveIdUpdated', handleUpdate);
    };
  }, [viewMap, pageNavs]);

  // 根据 visibleNavs 动态渲染 PagerView 的子组件
  const pages = useMemo(() => {
    const pageComponents: Partial<Record<NAV_ID_Type, ReactNode>> = {
      nav_home: <HomePage />,
      nav_search: <SearchPage />,
      nav_songlist: <SongListPage />,
      nav_top: <LeaderboardPage />,
      nav_love: <MylistPage />,
      nav_daily_rec: <DailyRecPage />,
      nav_followed_artists: <FollowedArtistsPage />,
      nav_subscribed_albums: <SubscribedAlbumsPage />,
      nav_my_playlist: <MyPlaylistPage />,
      nav_onedrive: <OneDrivePage />,
      nav_webdav: <WebDAVPage />,
      nav_stats: <StatsPage />,
      nav_setting: <SettingPage />,
    };

    return pageNavs.map(id => (
      <View
        collapsable={false}
        key={id}
        style={styles.pageStyle}
      >
        {pageComponents[id] ?? null}
      </View>
    ));
  }, [pageNavs]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <PanGestureHandler
        activeOffsetX={[12, 0]}
        failOffsetY={[-4, 4]}
        onHandlerStateChange={handlePanGestureState}
      >
        <View style={styles.container} collapsable={false}>
          <PagerView
            ref={pagerViewRef}
            initialPage={activeIndexRef.current}
            offscreenPageLimit={1}
            onPageSelected={onPageSelected}
            onPageScrollStateChanged={onPageScrollStateChanged}
            scrollEnabled={false}
            style={styles.pagerView}
          >
            {pages}
          </PagerView>
          <PlayHistoryOverlay />
        </View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = createStyle({
  container: {
    flex: 1,
  },
  pagerView: {
    flex: 1,
    overflow: 'hidden',
  },
  historyOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    elevation: 1,
  },
  pageStyle: {
    // alignItems: 'center',
    // padding: 20,
  },
})

export default Main
