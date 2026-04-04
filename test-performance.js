// Performance test script for Pretext plugin
// This script can be run in Obsidian's developer console

(function() {
  console.log('=== Testing Performance Optimization ===');
  
  // Test 1: Check if plugin is loaded
  const plugin = app.plugins.getPlugin('obsidian-pretext');
  if (!plugin) {
    console.log('✗ Plugin is not loaded');
    return;
  }
  
  console.log('✓ Plugin is loaded');
  
  // Test 2: Check if PretextManager is ready
  if (!plugin.pretextManager || !plugin.pretextManager.isReady()) {
    console.log('✗ PretextManager is not ready');
    return;
  }
  
  console.log('✓ PretextManager is ready');
  
  // Test 3: Measure scrolling performance
  console.log('\n3. Measuring scrolling performance:');
  
  // Function to measure scroll time
  function measureScrollPerformance() {
    const startTime = performance.now();
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Scroll to bottom in steps
    const totalHeight = document.body.scrollHeight;
    const step = 500;
    
    for (let i = 0; i < totalHeight; i += step) {
      window.scrollTo(0, i);
    }
    
    // Scroll back to top
    window.scrollTo(0, 0);
    
    const endTime = performance.now();
    return endTime - startTime;
  }
  
  // Run performance test
  console.log('Measuring scroll performance...');
  const scrollTime = measureScrollPerformance();
  console.log(`Scrolling took ${scrollTime.toFixed(2)}ms`);
  
  if (scrollTime < 1000) {
    console.log('✓ Good scrolling performance');
  } else if (scrollTime < 2000) {
    console.log('⚠️  Average scrolling performance');
  } else {
    console.log('✗ Poor scrolling performance');
  }
  
  // Test 4: Check optimization coverage
  console.log('\n4. Checking optimization coverage:');
  
  const heavySelectors = [
    '.callout',
    '.callout-content',
    'blockquote',
    'table td'
  ];
  
  let totalElements = 0;
  let optimizedElements = 0;
  
  heavySelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      totalElements++;
      if (el.hasAttribute('data-pretext-optimized')) {
        optimizedElements++;
      }
    });
  });
  
  console.log(`Total heavy elements: ${totalElements}`);
  console.log(`Optimized elements: ${optimizedElements}`);
  console.log(`Optimization rate: ${(optimizedElements / totalElements * 100).toFixed(2)}%`);
  
  if (optimizedElements / totalElements > 0.8) {
    console.log('✓ High optimization coverage');
  } else if (optimizedElements / totalElements > 0.5) {
    console.log('⚠️  Moderate optimization coverage');
  } else {
    console.log('✗ Low optimization coverage');
  }
  
  // Test 5: Check cache usage
  console.log('\n5. Checking cache usage:');
  if (plugin.measurementCache) {
    console.log(`Cache size: ${plugin.measurementCache.size}`);
    if (plugin.measurementCache.size > 0) {
      console.log('✓ Cache is being used effectively');
    } else {
      console.log('✗ Cache is not being used');
    }
  }
  
  // Test 6: User experience assessment
  console.log('\n6. User experience assessment:');
  console.log('Please evaluate the following:');
  console.log('1. Is scrolling smooth?');
  console.log('2. Is editing responsive?');
  console.log('3. Are there any visual glitches?');
  
  // Test 7: Performance comparison
  console.log('\n7. Performance comparison:');
  console.log('To compare performance with and without the plugin:');
  console.log('1. Disable the plugin');
  console.log('2. Open this document again');
  console.log('3. Run this test again');
  console.log('4. Compare the scroll times');
  
  console.log('\n=== Performance test completed ===');
})();