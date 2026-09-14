#!/usr/bin/env node
/**
 * Flow — Android overlay applier.
 *
 * The android/ project is NOT stored in git. CI generates it fresh from the
 * official Capacitor template (`npx cap add android`), then this script applies
 * Flow's customization on top:
 *
 *   1. Copies every file in android-overlay/files/** into android/**
 *      (manifest, Kotlin sources, values resources).
 *   2. Removes the template's generated Java MainActivity (we ship Kotlin).
 *   3. Patches android/build.gradle to add the Kotlin Gradle plugin.
 *   4. Patches android/app/build.gradle: Kotlin plugin + Java/Kotlin both at 21.
 *
 * Why 21: Capacitor 7 targets Java 21 — its generated capacitor.build.gradle
 * re-asserts compileOptions 21 AFTER our blocks run (later Groovy config wins).
 * So the only consistent setup is Java 21 AND Kotlin jvmTarget 21, matching the
 * JDK 21 that CI uses. Anything else = "Inconsistent JVM-target compatibility".
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
// See the header comment above before changing this.
const JAVA_VERSION = '21';

const REQUIRED_AFTER_COPY = [
  'app/src/main/AndroidManifest.xml',
  'app/src/main/java/com/flow/finance/MainActivity.kt',
  'app/src/main/java/com/flow/finance/core/FlowCorePlugin.kt',
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

// 4) Patch android/app/build.gradle — Kotlin plugin + both targets at 21.
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

// Remove any existing compileOptions / kotlinOptions blocks (the template's or
// a previous run's), then insert ONE consistent pair — both at JAVA_VERSION.
// Capacitor's capacitor.build.gradle (applied last) also sets Java 21, so
// JAVA_VERSION must stay 21 to remain consistent with it.
appGradle = `${appGradle
  .replace(/compileOptions\s*\{[^}]*\}/, '')
  .replace(/kotlinOptions\s*\{[^}]*\}/, '')
  .trimEnd()}\n`;
appGradle = mustReplace(
  appGradle,
  /^android\s*\{/m,
  `android {\n    compileOptions {\n        sourceCompatibility JavaVersion.VERSION_${JAVA_VERSION}\n        targetCompatibility JavaVersion.VERSION_${JAVA_VERSION}\n    }\n    kotlinOptions {\n        jvmTarget = '${JAVA_VERSION}'\n    }`,
  'android/app/build.gradle (android block)',
);
writeFileSync(appGradlePath, appGradle);
console.log(`  ~ android/app/build.gradle: Kotlin enabled · Java ${JAVA_VERSION} · Kotlin target ${JAVA_VERSION}`);

console.log('✓ Overlay applied.');
