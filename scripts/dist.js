'use strict';
/**
 * Stages the publishable tree: manifest.json + providers/*.js. CI pushes this
 * folder to the `dist` branch, which is what Nuvio installs from.
 */
const fs = require('fs');
const path = require('path');
const { compute } = require('./version');
const manifest = require('./manifest');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BUILT = path.join(ROOT, 'providers');

function main() {
  const version = compute();
  const data = manifest.build(version);

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST, 'providers'), { recursive: true });

  let copied = 0;
  for (const provider of data.scrapers) {
    const source = path.join(BUILT, provider.id + '.js');
    if (!fs.existsSync(source)) {
      console.error('missing bundle: providers/' + provider.id + '.js (run node build.js)');
      process.exitCode = 1;
      continue;
    }
    fs.copyFileSync(source, path.join(DIST, provider.filename));
    copied++;
  }

  fs.writeFileSync(path.join(DIST, 'manifest.json'), JSON.stringify(data, null, 2) + '\n');

  const extra = ['cloudstream-repo.json', 'cloudstream-plugins.json'];
  for (const file of extra) {
    const source = path.join(ROOT, file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(DIST, file));
  }

  console.log('dist: ' + copied + '/' + data.scrapers.length + ' providers, version ' + version);
}

main();
