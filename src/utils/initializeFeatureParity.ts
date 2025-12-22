/**
 * Feature Parity Initialization
 * 
 * Utility to initialize feature parity monitoring in the application
 */

import { initializeFeatureParityMonitoring } from '../services/featureParityService';

/**
 * Initialize feature parity validation system
 * Call this during application startup
 */
export function initFeatureParitySystem(): void {
  // Initialize monitoring
  initializeFeatureParityMonitoring();
  
  // Add global error handler for feature parity issues
  window.addEventListener('error', (event) => {
    // Log feature parity related errors
    if (event.error?.message?.includes('feature') || 
        event.error?.message?.includes('compatibility')) {
      console.warn('🔍 Potential feature parity issue detected:', event.error);
    }
  });
  
  // Add performance observer for monitoring
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const slowEntries = entries.filter(entry => entry.duration > 1000);
        
        if (slowEntries.length > 0) {
          console.warn('🔍 Slow performance detected:', slowEntries);
        }
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      // Performance observer not supported, continue silently
    }
  }
  
  console.log('🔍 Feature parity system initialized');
}

/**
 * Check if current environment needs special optimizations
 */
export function shouldEnableOptimizations(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();
  
  // Check for Raspberry Pi
  const isRaspberryPi = /armv\d+l|aarch64/i.test(platform) || 
                       /raspberry|rpi/i.test(userAgent) ||
                       /linux.*arm/i.test(userAgent);
  
  // Check for low memory
  const hasLowMemory = (navigator as any).deviceMemory && 
                      (navigator as any).deviceMemory <= 4;
  
  return isRaspberryPi || hasLowMemory;
}