// Test script for CodeMirror extension
// This script can be run in Obsidian's developer console

(function() {
  console.log('=== Testing CodeMirror Extension ===');
  
  // Test 1: Check if plugin is loaded
  const plugin = app.plugins.getPlugin('obsidian-pretext');
  if (!plugin) {
    console.log('✗ Plugin is not loaded');
    return;
  }
  
  console.log('✓ Plugin is loaded');
  
  // Test 2: Check Obsidian version compatibility
  console.log('\n2. Checking Obsidian version:');
  const appVersion = app.version;
  console.log(`Current Obsidian version: ${appVersion}`);
  
  const versionParts = appVersion.split('.').map(Number);
  const isVersion15Plus = versionParts[0] > 1 || (versionParts[0] === 1 && versionParts[1] >= 5);
  
  if (isVersion15Plus) {
    console.log('✓ Obsidian version 1.5+ detected (supports CodeMirror extension)');
  } else {
    console.log('✗ Obsidian version < 1.5 (CodeMirror extension not supported)');
    console.log('=== Test completed ===');
    return;
  }
  
  // Test 3: Check if registerCodeMirrorExtension method exists
  console.log('\n3. Checking registerCodeMirrorExtension method:');
  if (typeof plugin.registerCodeMirrorExtension === 'function') {
    console.log('✓ registerCodeMirrorExtension method exists');
  } else {
    console.log('✗ registerCodeMirrorExtension method not found');
    console.log('=== Test completed ===');
    return;
  }
  
  // Test 4: Check if PretextManager is ready
  console.log('\n4. Checking PretextManager status:');
  if (plugin.pretextManager && plugin.pretextManager.isReady()) {
    console.log('✓ PretextManager is ready');
  } else {
    console.log('✗ PretextManager is not ready');
    console.log('=== Test completed ===');
    return;
  }
  
  // Test 5: Check if CodeMirror extension is registered
  console.log('\n5. Checking CodeMirror extension registration:');
  
  // Note: We can't directly check if the extension is registered
  // but we can check the console logs for registration messages
  console.log('Please check the console logs for "CodeMirror extension registered" message');
  
  // Test 6: Test extension functionality
  console.log('\n6. Testing extension functionality:');
  console.log('Open a file in edit mode and scroll through it to trigger the extension');
  console.log('The extension should warm up the cache for visible lines');
  
  // Test 7: Check cache after scrolling
  console.log('\n7. Testing cache usage after scrolling:');
  console.log('After scrolling, run this command to check cache size:');
  console.log('app.plugins.getPlugin(\'obsidian-pretext\').measurementCache.size');
  
  console.log('\n=== CodeMirror extension test completed ===');
})();