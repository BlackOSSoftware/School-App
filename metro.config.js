require('./scripts/node-polyfills');

const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(defaultConfig, {
  resolver: {
    blockList: /node_modules[\/\\].+[\/\\](android|ios)[\/\\]build[\/\\].*/,
    resolveRequest(context, moduleName, platform) {
      if (moduleName === 'axios') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs'),
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
});
