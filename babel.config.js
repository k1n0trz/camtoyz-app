module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // El plugin de Worklets debe ir al final para Reanimated 4.
    plugins: [
      ['module-resolver', { alias: { '@': './src' }, extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] }],
      'react-native-worklets/plugin',
    ],
  };
};
