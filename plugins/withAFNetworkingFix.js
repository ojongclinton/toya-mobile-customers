const { withPodfile } = require('@expo/config-plugins');

// iOS 26 SDK build fixes v13 - Firebase-safe module isolation
//
// Historique des versions :
// v10 : DEFINES_MODULE=NO sur tous les pods ObjC sauf pods Swift
//       → cassait ExpoLogBox (Swift) car ses deps ObjC perdaient leur module
// v11 : protege aussi les deps ObjC directes des pods Swift (GoogleUtilities…)
//       → cassait FirebaseCore : FirebaseCoreExtension.h fait @import FirebaseCore
//         mais FirebaseCore n'est pas dep d'un pod Swift, donc non protege
// v12 : protege en plus tous les pods Firebase* et Google* car Firebase 24.x
//       utilise la syntaxe @import dans ses headers ObjC, ce qui requiert que
//       les pods importes restent des modules Clang valides.
//       Les pods React-* et RCT-* (cause reelle du conflit Xcode 26) continuent
//       de recevoir DEFINES_MODULE=NO.
// v13 : protege ReactAppDependencyProvider car AppDelegate.swift l'importe
//       directement (import ReactAppDependencyProvider). Avec DEFINES_MODULE=NO
//       Swift ne peut plus resoudre ce module → erreur "no such module".
const POST_INSTALL_INJECTION = `
  # iOS 26 SDK build fixes v13 - module isolation, Firebase-safe
  begin
    # Etape 1 : pods Swift (detection via fichiers .swift dans source build phase)
    swift_target_names = installer.pods_project.targets.select do |t|
      begin
        t.source_build_phase.files.any? { |f| f.file_ref&.path&.end_with?('.swift') }
      rescue
        false
      end
    end.map(&:name)

    # Etape 2 : dependances ObjC directes des pods Swift (doivent rester modules)
    objc_deps_of_swift = []
    begin
      installer.pod_targets.each do |pt|
        next unless swift_target_names.include?(pt.name)
        pt.dependent_targets.each do |dep|
          next if dep.name.start_with?('React') || dep.name.start_with?('RCT')
          objc_deps_of_swift << dep.name
        end
      end
    rescue => e
      puts "v13: dep graph: #{e.message}"
      objc_deps_of_swift = ['GoogleUtilities', 'nanopb', 'PromisesObjC', 'GoogleDataTransport', 'FirebaseCoreExtension']
    end
    objc_deps_of_swift.uniq!

    # Etape 3 : pods Firebase* et Google* utilisent @import en interne (Firebase 24.x)
    # Ils doivent absolument rester des modules Clang valides.
    # ReactAppDependencyProvider est importe depuis Swift dans AppDelegate.swift.
    firebase_google_pods = installer.pods_project.targets.select do |t|
      t.name.start_with?('Firebase') || t.name.start_with?('Google') ||
      t.name == 'PromisesObjC' || t.name == 'nanopb' ||
      t.name == 'ReactAppDependencyProvider'
    end.map(&:name)

    protected_names = (swift_target_names + objc_deps_of_swift + firebase_google_pods).uniq

    # 1. DEFINES_MODULE=NO + MODULEMAP_FILE='' sur les cibles non-protegees
    installer.pods_project.targets.each do |target|
      next if protected_names.include?(target.name)
      target.build_configurations.each do |cfg|
        cfg.build_settings['DEFINES_MODULE']                = 'NO'
        cfg.build_settings['MODULEMAP_FILE']                = ''
        cfg.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      end
    end

    # 2. Vider les .modulemap des pods non-proteges
    Dir.glob(File.join(__dir__, 'Pods', 'Target Support Files', '**', '*.modulemap')).each do |f|
      next unless File.exist?(f)
      pod_dir = File.basename(File.dirname(f))
      next if protected_names.any? { |n| pod_dir == n || pod_dir.start_with?(n + '-') }
      File.write(f, '')
    end

    # 3. Supprimer MODULEMAP_FILE dans xcconfig des pods non-proteges
    Dir.glob(File.join(__dir__, 'Pods', 'Target Support Files', '**', '*.xcconfig')).each do |f|
      next unless File.exist?(f)
      pod_dir = File.basename(File.dirname(f))
      next if protected_names.any? { |n| pod_dir == n || pod_dir.start_with?(n + '-') }
      content = File.read(f)
      patched = content.lines.reject { |l| l.start_with?('MODULEMAP_FILE') }.join
      File.write(f, patched) if patched != content
    end

    # 4. AFNetworking : CLANG_ENABLE_MODULES=NO (header prive netinet6/in6.h iOS 26)
    installer.pods_project.targets.each do |target|
      if target.name == 'AFNetworking'
        target.build_configurations.each do |cfg|
          cfg.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
        end
      end
    end

    # 5. Patch source AFNetworking (supprime les lignes netinet6/in6.h)
    af_file = File.join(__dir__, 'Pods/AFNetworking/AFNetworking/AFNetworkReachabilityManager.m')
    if File.exist?(af_file)
      content = File.read(af_file)
      patched = content.lines.reject { |l| l.include?('<netinet6/in6.h>') }.join
      File.write(af_file, patched) if patched != content
    end

    # 6. Patch RCTEventDispatcher.h si necessaire
    rct_file = Dir.glob(File.join(__dir__, 'Pods', '**', '*RCTEventDispatcherProtocol*.h')).first
    if rct_file && File.exist?(rct_file)
      content = File.read(rct_file)
      unless content.include?('@class RCTBridge;')
        File.write(rct_file, "@class RCTBridge;\n" + content)
      end
    end
  rescue => e
    puts "withAFNetworkingFix v13 post_install error: #{e.message}"
  end
`;

/**
 * Isolation globale des modules Clang pour Xcode 26.
 * v13 : protege Swift pods + leurs deps ObjC + tous les pods Firebase/Google
 *       + ReactAppDependencyProvider (importe depuis AppDelegate.swift).
 */
function withAFNetworkingFix(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('iOS 26 SDK build fixes v13')) {
      contents = contents.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|\n${POST_INSTALL_INJECTION}`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAFNetworkingFix;
