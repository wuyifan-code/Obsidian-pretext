// Test script for Markdown post-processor
// This script can be run in Obsidian's developer console after opening pretext-test.md

(function() {
  console.log('=== Testing Markdown Post-Processor ===');
  
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
  
  // Test 3: Check heavy elements in the current document
  console.log('\n3. Testing heavy elements processing:');
  
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
      const isOptimized = el.hasAttribute('data-pretext-optimized');
      const hasMinHeight = el.style.minHeight !== '';
      
      if (isOptimized && hasMinHeight) {
        optimizedElements++;
        console.log(`✓ ${selector}: ${el.textContent.substring(0, 50)}...`);
        console.log(`  - data-pretext-optimized: ${el.getAttribute('data-pretext-optimized')}`);
        console.log(`  - minHeight: ${el.style.minHeight}`);
        if (el.hasAttribute('data-pretext-lines')) {
          console.log(`  - data-pretext-lines: ${el.getAttribute('data-pretext-lines')}`);
        }
      } else {
        console.log(`✗ ${selector}: ${el.textContent.substring(0, 50)}...`);
        if (!isOptimized) console.log('  - Missing data-pretext-optimized attribute');
        if (!hasMinHeight) console.log('  - Missing minHeight style');
      }
    });
  });
  
  console.log(`\n4. Summary:`);
  console.log(`Total heavy elements: ${totalElements}`);
  console.log(`Optimized elements: ${optimizedElements}`);
  console.log(`Optimization rate: ${(optimizedElements / totalElements * 100).toFixed(2)}%`);
  
  // Test 4: Check cache usage
  console.log('\n5. Testing cache usage:');
  if (plugin.measurementCache) {
    console.log(`Cache size: ${plugin.measurementCache.size}`);
    if (plugin.measurementCache.size > 0) {
      console.log('✓ Cache is being used');
    } else {
      console.log('✗ Cache is empty');
    }
  }
  
  console.log('\n=== Post-processor test completed ===');
})();