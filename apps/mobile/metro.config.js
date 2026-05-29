const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

// Retrieve the default Expo config
const config = getDefaultConfig(__dirname);

// Wrap the configuration with NativeWind and point it to your global CSS file
module.exports = withNativeWind(config, { input: './global.css' });
