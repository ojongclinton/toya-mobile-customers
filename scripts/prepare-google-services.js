#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const fallbackSource = path.join(projectRoot, "google-services.json");
const source = process.env.GOOGLE_SERVICES_JSON || fallbackSource;
const target = path.join(projectRoot, "android", "app", "google-services.json");
const appConfig = require(path.join(projectRoot, "app.json"));
const expectedPackage = appConfig.expo.android.package;

if (!fs.existsSync(source)) {
  throw new Error(
    "GOOGLE_SERVICES_JSON is unavailable. Upload google-services.json as an EAS file environment variable for this build environment."
  );
}

const googleServices = JSON.parse(fs.readFileSync(source, "utf8"));
const configuredPackages = (googleServices.client || [])
  .map((client) => client?.client_info?.android_client_info?.package_name)
  .filter(Boolean);

if (!configuredPackages.includes(expectedPackage)) {
  throw new Error(
    `Firebase configuration does not contain Android package ${expectedPackage}. Found: ${configuredPackages.join(", ") || "none"}.`
  );
}

fs.mkdirSync(path.dirname(target), { recursive: true });
if (path.resolve(source) !== path.resolve(target)) {
  fs.copyFileSync(source, target);
}

console.log(`Prepared android/app/google-services.json for ${expectedPackage}.`);
