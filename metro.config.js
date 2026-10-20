const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Thêm định dạng wasm vào danh sách asset để expo-sqlite hoạt động trên Web
config.resolver.assetExts.push('wasm');

module.exports = config;