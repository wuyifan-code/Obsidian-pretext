const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const pretextBundlePath = path.join(__dirname, 'lib', 'pretext', 'bundle.js');
const pretextBundle = fs.readFileSync(pretextBundlePath, 'utf8');

// Inject Pretext bundle as a string that gets executed on load
esbuild.build({
  entryPoints: ['main.ts'],
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  format: 'cjs',
  outfile: 'main.js',
  sourcemap: false,
  minify: false,
  external: ['obsidian', '@codemirror/view', '@codemirror/state'],
  loader: {
    '.ts': 'ts',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    // Replace the placeholder with actual Pretext bundle
    'INJECT_PRETEXT_BUNDLE': JSON.stringify(pretextBundle),
  },
  banner: {
    js: `/* Pretext Bundle Injected */`,
  },
}).then(() => {
  console.log('Build complete: main.js with inlined Pretext');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
