const { readFile, writeFile, copyFile } = require('fs').promises;
const fs = require('fs');

async function runScript() {
  const chalk = await import('chalk');
  console.log(chalk.default.green('here'));

  function log(...args) {
    console.log(chalk.default.yellow('[postinstall]'), ...args);
  }

  async function reactNativeMaps() {
    log('📦 Checking react-native-maps web compatibility...');
    const modulePath = 'node_modules/react-native-maps';

    if (!fs.existsSync(modulePath)) {
      log('⚠️  react-native-maps not found, skipping');
      return;
    }

    // v1.27.2+ expose src/MapView.web.ts nativement — pas besoin de shim
    if (fs.existsSync(`${modulePath}/src/MapView.web.ts`)) {
      log('✅ react-native-maps >= 1.27.2 detected, web shim not needed');
      return;
    }

    // Fallback pour les versions < 1.27.2 (chemin lib/)
    log('📦 Creating web compatibility shim (legacy lib/ path)...');
    await writeFile(`${modulePath}/lib/index.web.js`, 'module.exports = {}', 'utf-8');
    await copyFile(`${modulePath}/lib/index.d.ts`, `${modulePath}/lib/index.web.d.ts`);
    const pkg = JSON.parse(await readFile(`${modulePath}/package.json`));
    pkg['react-native'] = 'lib/index.js';
    pkg['main'] = 'lib/index.web.js';
    await writeFile(`${modulePath}/package.json`, JSON.stringify(pkg, null, 2), 'utf-8');
    log('✅ react-native-maps web shim applied');
  }

  async function fixSslPinning() {
    log('🔧 Checking react-native-ssl-pinning Gradle 9 compatibility...');
    const gradleFile = 'node_modules/react-native-ssl-pinning/android/build.gradle';

    if (!fs.existsSync(gradleFile)) {
      log('⚠️  react-native-ssl-pinning not found, skipping');
      return;
    }

    const content = await readFile(gradleFile, 'utf-8');

    if (!content.includes('jcenter()')) {
      log('✅ react-native-ssl-pinning already compatible with Gradle 9');
      return;
    }

    // Supprime le bloc buildscript { ... } qui appelle jcenter() + AGP 2.3.0
    // Ce bloc est redondant : le projet root fournit déjà AGP via son propre classpath
    const patched = content.replace(/buildscript\s*\{[\s\S]*?\n\}/m, '').trim();
    await writeFile(gradleFile, patched + '\n', 'utf-8');
    log('✅ react-native-ssl-pinning buildscript block removed (Gradle 9 fix)');
  }

  async function fixHermesc() {
    log('🔧 Checking hermesc execute permissions...');
    const hermescPath = 'node_modules/react-native/sdks/hermesc/linux64-bin/hermesc';
    if (!fs.existsSync(hermescPath)) {
      log('⚠️  hermesc not found (non-Linux env), skipping');
      return;
    }
    const mode = fs.statSync(hermescPath).mode;
    if (mode & 0o111) {
      log('✅ hermesc already executable');
      return;
    }
    fs.chmodSync(hermescPath, 0o755);
    log('✅ hermesc chmod 755 applied');
  }

  await reactNativeMaps();
  await fixSslPinning();
  await fixHermesc();
}

runScript();
