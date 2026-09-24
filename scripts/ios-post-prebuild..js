const fs = require('fs');
const path = require('path');

const PODFILE_PATH = path.join(__dirname, '../ios/Podfile');

// Le contenu du Podfile avec la fix pour GoogleMaps + Firebase
const PODFILE_CONTENT = `
require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")
require File.join(File.dirname(\`node --print "require.resolve('react-native/package.json')"\`), "scripts/react_native_pods")

require 'json'
podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}

ENV['RCT_NEW_ARCH_ENABLED'] = podfile_properties['newArchEnabled'] == 'true' ? '1' : '0'
ENV['EX_DEV_CLIENT_NETWORK_INSPECTOR'] = podfile_properties['EX_DEV_CLIENT_NETWORK_INSPECTOR']

platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'
install! 'cocoapods',
  :deterministic_uuids => false

prepare_react_native_project!

target 'Toya' do
  use_expo_modules!
  config = use_native_modules!

  use_frameworks! :linkage => :static
  
  # Fix pour Firebase avec static frameworks
  use_modular_headers!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
    :app_path => "#{Pod::Config.instance.installation_root}/..",
    :privacy_file_aggregation_enabled => podfile_properties['apple.privacyManifestAggregationEnabled'] != 'false',
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
    )

    # Workaround pour GoogleMaps et Firebase avec static frameworks
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
        
        # Fix spécifique pour GoogleMaps
        if target.name == 'GoogleMaps' || target.name == 'Google-Maps-iOS-Utils'
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end
  end
end
`;

console.log('📝 Modification du Podfile pour corriger les erreurs Firebase/GoogleMaps...');

try {
  fs.writeFileSync(PODFILE_PATH, PODFILE_CONTENT.trim());
  console.log('✅ Podfile modifié avec succès !');
} catch (error) {
  console.error('❌ Erreur lors de la modification du Podfile:', error);
  process.exit(1);
}