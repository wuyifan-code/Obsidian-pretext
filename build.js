const esbuild = require('esbuild');

// Build main.js
esbuild.build({
  entryPoints: ['main.ts'],
  bundle: true,
  outfile: 'main.js',
  external: ['obsidian', '@codemirror/view', '@codemirror/state'],
  format: 'cjs',
  target: 'es2018',
  minify: false,
  treeShaking: true,

  logLevel: 'info'
}).catch(() => process.exit(1));
