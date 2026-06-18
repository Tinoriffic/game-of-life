/*
 * Generates src/appVersion.js from package.json so the UI's displayed version
 * has a single source of truth. Runs via the pre-start / pre-build / pre-test
 * npm hooks, so the displayed version always tracks package.json "version".
 */
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const out = path.join(__dirname, '..', 'src', 'appVersion.js');
const body =
  '// AUTO-GENERATED from package.json by scripts/genVersion.js — do not edit.\n' +
  `export const APP_VERSION = '${pkg.version}';\n`;

fs.writeFileSync(out, body);
