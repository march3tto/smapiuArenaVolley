const { AndroidConfig, withStringsXml } = require('expo/config-plugins');

/*
 * Nome mostrato sul telefono Android, indipendente da expo.name.
 * expo.name deve restare ASCII: eas-cli e il prebuild trattano in modo diverso le lettere accentate,
 * ricavano due nomi di target Xcode diversi e la build iOS fallisce ("Could not find target").
 * Su iOS lo stesso nome sta in ios.infoPlist.CFBundleDisplayName (app.json).
 */
module.exports = function withNomeAndroid(config, nome) {
  return withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [AndroidConfig.Resources.buildResourceItem({ name: 'app_name', value: nome })],
      cfg.modResults,
    );
    return cfg;
  });
};
