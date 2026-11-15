'use strict';
/**
 * Builds manifest.json from providers.json. The version is injected by the
 * caller (see scripts/version.js); it is never stored in the source.
 */
const providers = require('../providers.json');

function build(version) {
  return {
    name: providers.name,
    version: version,
    author: providers.author,
    description: providers.description,
    scrapers: providers.providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      version: version,
      author: providers.author,
      filename: 'providers/' + provider.id + '.js',
      supportedTypes: provider.supportedTypes,
      enabled: provider.enabled !== false,
      contentLanguage: provider.contentLanguage || ['tr'],
      formats: provider.formats,
      supportsExternalPlayer: provider.supportsExternalPlayer !== false
    }))
  };
}

module.exports = { build };

if (require.main === module) {
  const { compute } = require('./version');
  process.stdout.write(JSON.stringify(build(compute()), null, 2) + '\n');
}
