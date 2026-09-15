#!/usr/bin/env node
/**
 * Flow — Android overlay applier.
 *
 * The android/ project is NOT stored in git. CI generates it fresh from the
 * official Capacitor template (`npx cap add android`), then this script applies
 * Flow's customization on top:
 *
 *   1. Copies every file in android-overlay/files/** into android/**
 *      (manifest, Kotlin sources, unit tests, values resources).
 *   2. Removes the template's generated Java MainActivity (we ship Kotlin).
 *   3. Patches android/build.gradle to add the Kotlin Gradle plugin.
 *   4. Patches android/app/build.gradle: Kotlin plugin + Java/Kotlin at 21
 *      (21 matches Capacitor 7's own Java level and the CI JDK).
 *   5. Adds JUnit dependencies AND verbose test logging, so unit-test
 *      failures (messages + stdout) are fully visible in the CI log.
 *   6. Patches res/values/styles.xml: opts OUT of Android 15 edge-to-edge so
 *      the WebView lays out BELOW the status bar.
 *
 * Deterministic + idempotent: safe to run again over an already-patched tree.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILES_DIR = join(ROOT, 'android-overlay/files');
const ANDROID_DIR = join(ROOT, 'android');
const KOTLIN_VERSION = '2.1.20';
// MUST be 21: matches Capacitor 7's own Java level and the CI JDK.
const JAVA_VERSION = '21';

const REQUIRED_AFTER_COPY = [
  'app/src/main/AndroidManifest.xml',
  'app/src/main/java/com/flow/finance/MainActivity.kt',
  'app/src/main/java/com/flow/finance/core/FlowCorePlugin.kt',
  'app/src/main/java/com/flow/finance/core/parser/TransactionParser.kt',
  'app/src/main/java/com/flow/finance/core/sms/SmsReader.kt',
  'app/src/test/java/com/flow/finance/core/parser/TransactionParserTest.kt',
  'app/src/main/res/values/flow_colors.xml',
];

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function copyTree(srcDir, destDir) {
  let count = 0;
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) {
      count += copyTree(src, dest);
    } else {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      count += 1;
      console.log(`  + ${relative(ROOT, dest)}`);
    }
  }
  return count;
}

function mustReplace(content, pattern, replacement, label) {
  const out = content.replace(pattern, replacement);
  if (out === content) fail(`Could not patch ${label} — template format changed?`);
  return out;
}

console.log('▸ Applying Flow Android overlay…');

if (!existsSync(ANDROID_DIR)) {
  fail('android/ not found. Run `npx cap add android` first.');
}
if (!existsSync(FILES_DIR)) {
  fail('android-overlay/files/ not found.');
}

// 1) Copy overlay files into the generated project.
const copied = copyTree(FILES_DIR, ANDROID_DIR);
console.log(`  ${copied} file(s) copied.`);

for (const rel of REQUIRED_AFTER_COPY) {
  if (!existsSync(join(ANDROID_DIR, rel))) {
    fail(`Overlay incomplete: ${rel} missing after copy`);
  }
}

// 2) Remove the template's Java MainActivity — we replace it with Kotlin.
const templateActivity = join(ANDROID_DIR, 'app/src/main/java/com/flow/finance/MainActivity.java');
if (existsSync(templateActivity)) {
  rmSync(templateActivity);
  console.log('  − removed template MainActivity.java (replaced by Kotlin)');
}

// 3) Patch android/build.gradle — add the Kotlin Gradle plugin.
const rootGradlePath = join(ANDROID_DIR, 'build.gradle');
if (!existsSync(rootGradlePath)) fail('android/build.gradle not found.');
let rootGradle = readFileSync(rootGradlePath, 'utf8');
if (!rootGradle.includes('kotlin-gradle-plugin')) {
  rootGradle = mustReplace(
    rootGradle,
    /(classpath\s+['"]com\.android\.tools\.build:gradle:[^'"]+['"])/,
    `$1\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}'`,
    'android/build.gradle (AGP classpath)',
  );
  writeFileSync(rootGradlePath, rootGradle);
  console.log('  ~ android/build.gradle: Kotlin plugin added');
}

// 4) + 5) Patch android/app/build.gradle — Kotlin plugin, targets at 21,
//    JUnit + verbose test logging.
const appGradlePath = join(ANDROID_DIR, 'app/build.gradle');
if (!existsSync(appGradlePath)) fail('android/app/build.gradle not found.');
let appGradle = readFileSync(appGradlePath, 'utf8');

if (!appGradle.includes('org.jetbrains.kotlin.android')) {
  appGradle = mustReplace(
    appGradle,
    /apply plugin:\s+['"]com\.android\.application['"]/,
    `apply plugin: 'com.android.application'\napply plugin: 'org.jetbrains.kotlin.android'`,
    'android/app/build.gradle (application plugin)',
  );
}

appGradle = `${appGradle
  .replace(/compileOptions\s*\{[^}]*\}/, '')
  .replace(/kotlinOptions\s*\{[^}]*\}/, '')
  .trimEnd()}\n`;
appGradle = mustReplace(
  appGradle,
  /^android\s*\{/m,
  `android {\n    compileOptions {\n        sourceCompatibility JavaVersion.VERSION_${JAVA_VERSION}\n        targetCompatibility JavaVersion.VERSION_${JAVA_VERSION}\n    }\n    kotlinOptions {\n        jvmTarget = '${JAVA_VERSION}'\n    }\n    testOptions {\n        unitTests.all {\n            testLogging {\n                events "failed", "passed", "skipped"\n                showStandardStreams = true\n                exceptionFormat "full"\n            }\n        }\n    }`,
  'android/app/build.gradle (android block)',
);

if (!appGradle.includes('junit:junit')) {
  appGradle = mustReplace(
    appGradle,
    /dependencies\s*\{/,
    `dependencies {\n    testImplementation 'junit:junit:4.13.2'`,
    'android/app/build.gradle (dependencies)',
  );
  console.log('  ~ android/app/build.gradle: JUnit added for the parser test suite');
}
writeFileSync(appGradlePath, appGradle);
console.log(`  ~ android/app/build.gradle: Kotlin enabled · Java ${JAVA_VERSION} · Kotlin target ${JAVA_VERSION} · verbose test logging`);

// 6) Patch res/values/styles.xml — opt out of Android 15+ edge-to-edge.
const stylesPath = join(ANDROID_DIR, 'app/src/main/res/values/styles.xml');
if (!existsSync(stylesPath)) {
  console.log('  ! res/values/styles.xml not found — skipping edge-to-edge patch');
} else {
  let styles = readFileSync(stylesPath, 'utf8');
  if (!styles.includes('windowOptOutEdgeToEdgeEnforcement')) {
    let patched = 0;
    for (const styleName of ['AppTheme.NoActionBar', 'AppTheme.NoActionBarLaunch']) {
      const re = new RegExp(`(<style\\s+name="${styleName}"[^>]*>)`);
      if (re.test(styles)) {
        styles = styles.replace(
          re,
          `$1\n        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>`,
        );
        patched += 1;
      }
    }
    if (patched === 0) fail('Could not patch styles.xml — no AppTheme styles found');
    writeFileSync(stylesPath, styles);
    console.log(`  ~ styles.xml: edge-to-edge opted out (${patched} theme${patched === 1 ? '' : 's'})`);
  }
}

console.log('✓ Overlay applied.');
