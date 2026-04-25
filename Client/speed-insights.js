// Speed Insights initialization for ProConnect
// This script loads and initializes Vercel Speed Insights

(function() {
  'use strict';
  
  // Initialize the Speed Insights queue
  if (!window.si) {
    window.si = function() {
      (window.siq = window.siq || []).push(arguments);
    };
  }
  
  // Load the Speed Insights script
  function loadSpeedInsights() {
    if (window.sil) return; // Already loaded
    window.sil = true;
    
    const script = document.createElement('script');
    script.src = '/_vercel/speed-insights/script.js';
    script.defer = true;
    
    // Set SDK metadata
    script.setAttribute('data-sdkn', '@vercel/speed-insights');
    script.setAttribute('data-sdkv', '2.0.0');
    
    script.onerror = function() {
      console.error('[Speed Insights] Failed to load script');
      window.sil = false;
    };
    
    // Append to head
    const head = document.head || document.getElementsByTagName('head')[0];
    if (head) {
      head.appendChild(script);
    }
  }
  
  // Load immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSpeedInsights);
  } else {
    loadSpeedInsights();
  }
})();
