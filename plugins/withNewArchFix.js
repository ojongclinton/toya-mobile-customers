const { withMainApplication, withGradleProperties } = require('@expo/config-plugins');

// New Architecture version of MainApplication.kt — replaces the old-arch template
// that uses ReactNativeHostWrapper (removed in expo-dev-launcher 56.x / RN 0.82+).
const NEW_ARCH_MAIN_APPLICATION = `package com.toya.clientapp

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

import expo.modules.ApplicationLifecycleDispatcher

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> {
          val packages = PackageList(this).packages
          return packages
        }

        override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
`;

function withNewArchFix(config) {
  // Fix 1: gradle.properties — set newArchEnabled=true (suppresses RN 0.82+ warning)
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;
    const idx = props.findIndex(
      (p) => p.type === 'property' && p.key === 'newArchEnabled'
    );
    if (idx >= 0) {
      props[idx] = { type: 'property', key: 'newArchEnabled', value: 'true' };
    } else {
      props.push({ type: 'property', key: 'newArchEnabled', value: 'true' });
    }
    return config;
  });

  // Fix 2: Replace MainApplication.kt content during expo prebuild.
  // withMainApplication is a structured mod that reads/writes MainApplication.kt via
  // the finisher mechanism — guaranteed to run after the template is written to disk
  // and before Gradle compilation. Replaces old-arch ReactNativeHostWrapper usage
  // with the New Architecture DefaultReactNativeHost / DefaultReactHost pattern.
  config = withMainApplication(config, (config) => {
    if (config.modResults.contents.includes('ReactNativeHostWrapper')) {
      config.modResults.contents = NEW_ARCH_MAIN_APPLICATION;
    }
    return config;
  });

  return config;
}

module.exports = withNewArchFix;
