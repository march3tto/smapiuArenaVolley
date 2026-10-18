const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

/** Activity principale abilitata al Picture in Picture, senza ricrearsi quando cambia dimensione */
module.exports = function withPipDiretta(config) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    activity.$['android:supportsPictureInPicture'] = 'true';
    activity.$['android:resizeableActivity'] = 'true';
    const changes = new Set((activity.$['android:configChanges'] ?? '').split('|').filter(Boolean));
    ['screenSize', 'smallestScreenSize', 'screenLayout', 'orientation'].forEach((c) => changes.add(c));
    activity.$['android:configChanges'] = [...changes].join('|');
    return cfg;
  });
};
