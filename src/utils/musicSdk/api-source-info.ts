const sources: Array<{
  id: string
  name: string
  disabled: boolean
  supportQualitys: Partial<Record<LX.OnlineSource, LX.Quality[]>>
}> = [
  // {
  //   id: 'mobi',
  //   name: 'Mobi(酷我破解版用的接口)',
  //   disabled: false,
  //   supportQualitys: {
  //     kw: ['128k', '320k', 'flac', 'hires'],
  //   },
  // },
  {
    id: 'bi',
    name: '小哔音乐',
    disabled: false,
    supportQualitys: {
      bi: ['128k', '320k'],
    },
  },
]

export default sources
