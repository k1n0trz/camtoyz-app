module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated/plugin DEBE ir al final (gesto de alta frecuencia).
    plugins: [
      ['module-resolver', { alias: { '@': './src' }, extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] }],
      'react-native-reanimated/plugin',
    ],
  };
};
