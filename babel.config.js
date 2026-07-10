module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated/plugin DEBE ir al final (gesto de alta frecuencia).
    plugins: ['react-native-reanimated/plugin'],
  };
};
