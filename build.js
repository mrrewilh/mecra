#!/usr/bin/env node
/**
 * Bundles src/<provider>/index.js into providers/<provider>.js.
 * Nuvio loads the generated CJS bundle, not the source.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

// Keep dependencies inside .deps/ instead of the repo root.
process.env.NODE_PATH = path.join(__dirname, '.deps', 'node_modules');
Module._initPaths();
const esbuild = require('esbuild');

const pkg = require('./package.json');
const srcDir = path.join(__dirname, 'src');
const outDir = path.join(__dirname, 'providers');

function providers() {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
  if (args.length > 0) return args;
  return fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
    .map((entry) => entry.name);
}

async function buildProvider(name, minify) {
  const entry = path.join(srcDir, name, 'index.js');
  const outfile = path.join(outDir, name + '.js');
  if (!fs.existsSync(entry)) {
    console.warn('skip ' + name + ': no src/' + name + '/index.js');
    return false;
  }
  fs.mkdirSync(outDir, { recursive: true });
  try {
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      outfile,
      format: 'cjs',
      platform: 'neutral',
      target: 'es2016',
      minify,
      sourcemap: false,
      banner: {
        js: '/** Mecra provider: ' + name + ' | v' + pkg.version + ' */'
      },
      footer: {
        js:
          '\nif (typeof globalThis !== "undefined" && typeof module !== "undefined" && module.exports) {\n' +
          '  if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;\n' +
          '  if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;\n' +
          '  if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;\n' +
          '  if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;\n' +
          '}\n'
      },
      logLevel: 'warning'
    });
    const size = (fs.statSync(outfile).size / 1024).toFixed(1);
    console.log('built ' + name + ' -> providers/' + name + '.js (' + size + ' KB)');
    return true;
  } catch (error) {
    console.error('failed ' + name + ': ' + error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const minify = args.includes('--minify');
  const watch = args.includes('--watch');
  const names = providers();
  console.log('building ' + names.length + ' provider(s)');
  let ok = 0;
  for (const name of names) {
    if (await buildProvider(name, minify)) ok++;
  }
  console.log('done: ' + ok + '/' + names.length);
  if (watch) {
    console.log('watching src/ ...');
    fs.watch(srcDir, { recursive: true }, (event, filename) => {
      if (!filename || !filename.endsWith('.js')) return;
      const parts = filename.split(path.sep);
      if (parts[0] === 'shared') {
        names.forEach((name) => buildProvider(name, minify));
      } else if (parts[0]) {
        buildProvider(parts[0], minify);
      }
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
