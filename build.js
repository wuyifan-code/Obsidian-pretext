const esbuild = require('esbuild');
const fs = require('fs');

// Read Pretext bundle
const pretextBundle = fs.readFileSync('./lib/pretext/bundle.js', 'utf8');

// Build main.js
esbuild.build({
  entryPoints: ['main.ts'],
  bundle: true,
  outfile: 'main.js',
  external: ['obsidian', '@codemirror/view'],
  platform: 'browser',
  target: 'es2016',
  define: {
    'INJECT_PRETEXT_BUNDLE': JSON.stringify(pretextBundle)
  },

  logLevel: 'info'
}).catch(() => process.exit(1));
