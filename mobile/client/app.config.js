const { expo } = require('./app.json');
module.exports = () => ({
  ...expo,
  plugins: [
    ...expo.plugins,
    ...(process.env.GOOGLE_MAPS_ANDROID_API_KEY
      ? [['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }]]
      : []),
  ],
});
