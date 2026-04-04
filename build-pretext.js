const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const pretextDistPath = path.join(__dirname, 'lib', 'pretext');

// Bundle Pretext's ESM modules into a single file
async function buildPretext() {
  // First, check that all files exist
  const files = ['analysis.js', 'bidi.js', 'layout.js', 'line-break.js', 'measurement.js'];
  for (const f of files) {
    const p = path.join(pretextDistPath, f);
    if (!fs.existsSync(p)) {
      console.error(`Missing Pretext file: ${p}`);
      process.exit(1);
    }
  }

  // Bundle Pretext modules into a single IIFE
  const result = await esbuild.build({
    entryPoints: [path.join(pretextDistPath, 'layout.js')],
    bundle: true,
    platform: 'browser',
    target: 'es2020',
    format: 'iife',
    globalName: 'Pretext',
    outfile: 'lib/pretext/bundle.js',
    sourcemap: false,
    minify: false,
  });

  if (result.errors.length > 0) {
    console.error('Pretext bundle errors:', result.errors);
    process.exit(1);
  }

  console.log('Pretext bundle created: lib/pretext/bundle.js');
  return result;
}

buildPretext().catch(err => {
  console.error(err);
  process.exit(1);
});
