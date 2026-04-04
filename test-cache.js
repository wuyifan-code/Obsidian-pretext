// Test script for measurement cache
// This script can be run in Obsidian's developer console

(function() {
  console.log('=== Testing Measurement Cache ===');
  
  // Test 1: Check if plugin is loaded
  const plugin = app.plugins.getPlugin('obsidian-pretext');
  if (!plugin) {
    console.log('✗ Plugin is not loaded');
    return;
  }
  
  console.log('✓ Plugin is loaded');
  
  // Test 2: Check if MeasurementCache exists
  console.log('\n2. Checking MeasurementCache:');
  if (!plugin.measurementCache) {
    console.log('✗ MeasurementCache is not initialized');
    return;
  }
  
  console.log('✓ MeasurementCache exists');
  console.log(`Initial cache size: ${plugin.measurementCache.size}`);
  
  // Test 3: Test cache functionality
  console.log('\n3. Testing cache functionality:');
  
  // Test data
  const testText = 'This is a test text for cache functionality. Let\'s make it long enough to be processed.';
  const testFont = {
    fontFamily: 'sans-serif',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 24
  };
  const testMaxWidth = 700;
  const testLineHeight = 1.5;
  
  // First call - should not be in cache
  console.log('First cache get (should return null):');
  const firstResult = plugin.measurementCache.get(
    testText,
    testFont.fontFamily,
    testFont.fontSize,
    testFont.fontWeight,
    testMaxWidth,
    testLineHeight
  );
  console.log(`Result: ${firstResult}`);
  
  // Set a value in cache
  console.log('\nSetting value in cache:');
  const testValue = { height: 100, lineCount: 3 };
  plugin.measurementCache.set(
    testText,
    testFont.fontFamily,
    testFont.fontSize,
    testFont.fontWeight,
    testMaxWidth,
    testLineHeight,
    testValue
  );
  console.log(`Cache size after set: ${plugin.measurementCache.size}`);
  
  // Second call - should be in cache
  console.log('\nSecond cache get (should return cached value):');
  const secondResult = plugin.measurementCache.get(
    testText,
    testFont.fontFamily,
    testFont.fontSize,
    testFont.fontWeight,
    testMaxWidth,
    testLineHeight
  );
  console.log(`Result:`, secondResult);
  
  // Test 4: Test cache eviction
  console.log('\n4. Testing cache eviction:');
  
  // Fill the cache with test entries
  console.log('Filling cache with test entries...');
  for (let i = 0; i < 100; i++) {
    plugin.measurementCache.set(
      `Test text ${i}`,
      testFont.fontFamily,
      testFont.fontSize,
      testFont.fontWeight,
      testMaxWidth,
      testLineHeight,
      { height: 50 + i, lineCount: 2 }
    );
  }
  
  console.log(`Cache size after filling: ${plugin.measurementCache.size}`);
  console.log('Cache should be limited to 1000 entries (as configured)');
  
  // Test 5: Test cache clear
  console.log('\n5. Testing cache clear:');
  plugin.measurementCache.clear();
  console.log(`Cache size after clear: ${plugin.measurementCache.size}`);
  
  // Test 6: Test PretextManager cache integration
  console.log('\n6. Testing PretextManager cache integration:');
  if (plugin.pretextManager && plugin.pretextManager.isReady()) {
    console.log('✓ PretextManager is ready');
    
    // Clear both caches
    plugin.pretextManager.clearCache();
    console.log('✓ Both caches cleared');
  }
  
  console.log('\n=== Cache test completed ===');
})();