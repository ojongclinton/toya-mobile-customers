const { withPodfile } = require('@expo/config-plugins');

// Ruby injecté dans post_install du Podfile
// Fix 1 : CLANG_ENABLE_MODULES = NO sur AFNetworking (contourne la règle "private header" de Xcode 26)
// Fix 2 : Supprime les lignes #import <netinet6/in6.h> du source AFNetworkReachabilityManager.m
//         (pas de regex Ruby pour éviter les problèmes d'échappement JS/Ruby)
const POST_INSTALL_INJECTION = `
  # withGoogleMapsFix - AFNetworking iOS 26 SDK private header fix
  begin
    installer.pods_project.targets.each do |target|
      if target.name == 'AFNetworking'
        target.build_configurations.each do |cfg|
          cfg.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
        end
      end
    end

    af_file = File.join(__dir__, 'Pods/AFNetworking/AFNetworking/AFNetworkReachabilityManager.m')
    if File.exist?(af_file)
      content = File.read(af_file)
      patched = content.lines.reject { |l| l.include?('<netinet6/in6.h>') }.join
      File.write(af_file, patched) if patched != content
    end
  rescue => e
    puts "withGoogleMapsFix post_install error: #{e.message}"
  end
`;

/**
 * Deux corrections iOS pour react-native-maps :
 * 1. Remplace pod 'react-native-google-maps' (supprimé dans rn-maps >= 1.20)
 *    par pod 'react-native-maps/Google' (nouveau nom du sous-spec Google)
 * 2. Injecte le fix AFNetworking dans post_install (header privé netinet6/in6.h iOS 26)
 */
function withGoogleMapsFix(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;

    // Fix pod name
    contents = contents.replace(
      /pod 'react-native-google-maps'/g,
      "pod 'react-native-maps/Google'"
    );

    // Injection post_install (idempotent)
    if (!contents.includes('withGoogleMapsFix - AFNetworking iOS 26 SDK private header fix')) {
      contents = contents.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|\n${POST_INSTALL_INJECTION}`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withGoogleMapsFix;
