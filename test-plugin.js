// Test script for Obsidian Pretext plugin
// This script can be run in Obsidian's developer console

(function() {
  console.log('=== Testing Obsidian Pretext Plugin ===');
  
  // Test 1: Check if Pretext is loaded
  console.log('\n1. Testing Pretext library loading:');
  if (window.Pretext) {
    console.log('✓ window.Pretext exists');
    console.log('  Available methods:', Object.keys(window.Pretext));
  } else {
    console.log('✗ window.Pretext is not available');
  }
  
  // Test 2: Check if plugin is loaded
  console.log('\n2. Testing plugin status:');
  const plugin = app.plugins.getPlugin('obsidian-pretext');
  if (plugin) {
    console.log('✓ Plugin is loaded');
    
    // Test 3: Check PretextManager
    console.log('\n3. Testing PretextManager:');
    if (plugin.pretextManager) {
      console.log('✓ PretextManager exists');
      console.log('  isReady():', plugin.pretextManager.isReady());
      console.log('  hasFailed():', plugin.pretextManager.hasFailed());
    } else {
      console.log('✗ PretextManager is not initialized');
    }
    
    // Test 4: Check MeasurementCache
    console.log('\n4. Testing MeasurementCache:');
    if (plugin.measurementCache) {
      console.log('✓ MeasurementCache exists');
      console.log('  Cache size:', plugin.measurementCache.size);
    } else {
      console.log('✗ MeasurementCache is not initialized');
    }
    
  } else {
    console.log('✗ Plugin is not loaded');
  }
  
  console.log('\n=== Test completed ===');
})();