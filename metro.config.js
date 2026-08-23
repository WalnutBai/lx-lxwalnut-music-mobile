const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const exclusionList = require('metro-config/src/defaults/exclusionList')

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      // crypto: require.resolve('react-native-quick-crypto'),
      // stream: require.resolve('stream-browserify'),
      buffer: require.resolve('@craftzdog/react-native-buffer'),
    },
    blockList: exclusionList([
      /\.build-env[\\/].*/,
      /android[\\/]\.gradle[\\/].*/,
    ]),
  },
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)

// gitcode.private.js 为本地私有配置（不入库）。新克隆的仓库没有该文件，
// 这里回退解析到入库的模板 gitcode.private.example.js，保证打包不失败。
const baseResolveRequest = module.exports.resolver?.resolveRequest
module.exports.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === './gitcode.private') {
    try {
      return context.resolveRequest(context, moduleName, platform)
    } catch {
      return context.resolveRequest(context, './gitcode.private.example', platform)
    }
  }
  if (baseResolveRequest) return baseResolveRequest(context, moduleName, platform)
  return context.resolveRequest(context, moduleName, platform)
}
