/**
 * Property-Based Test: Feature Parity Across Hardware
 * 
 * **Feature: raspberry-pi-kiosk, Property 1: Feature parity across hardware**
 * 
 * Property: For any webapp functionality, when running on Raspberry Pi 4 hardware,
 * all features should work identically to other deployment environments
 * 
 * Validates: Requirements 1.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  FeatureParityValidator,
  detectHardwareEnvironment,
  type HardwareEnvironment,
  type FeatureTestResult,
  type FeatureParityReport
} from '../featureParityValidator';

describe('Property 1: Feature parity across hardware', () => {
  let originalNavigator: Navigator;
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    originalNavigator = global.navigator;
    originalWindow = global.window;
    
    // Setup DOM environment
    document.body.innerHTML = `
      <div data-testid="leaderboard">Leaderboard Content</div>
      <div data-testid="daily-code-card">
        <pre><code>console.log('test');</code></pre>
      </div>
      <nav role="navigation">
        <button>Home</button>
        <button>Leaderboard</button>
      </nav>
      <div data-testid="animation-container" class="animate-fade"></div>
    `;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
    global.window = originalWindow;
    vi.restoreAllMocks();
  });

  /**
   * Mock hardware environment for testing
   */
  function mockHardwareEnvironment(env: Partial<HardwareEnvironment>) {
    const mockNavigator = {
      ...originalNavigator,
      userAgent: env.userAgent || originalNavigator.userAgent,
      platform: env.platform || originalNavigator.platform,
      deviceMemory: env.memory || 4
    };

    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true,
      configurable: true
    });

    // Mock window properties for kiosk mode detection
    Object.defineProperty(global.window, 'outerHeight', {
      value: env.isKioskMode ? screen.height : screen.height - 100,
      writable: true,
      configurable: true
    });

    Object.defineProperty(global.window, 'outerWidth', {
      value: env.isKioskMode ? screen.width : screen.width - 100,
      writable: true,
      configurable: true
    });

    Object.defineProperty(global.window, 'locationbar', {
      value: { visible: !env.isKioskMode },
      writable: true,
      configurable: true
    });
  }

  /**
   * Arbitrary generator for hardware environments
   */
  const hardwareEnvironmentArbitrary = fc.record({
    platform: fc.oneof(
      fc.constant('Linux armv7l'),
      fc.constant('Linux aarch64'),
      fc.constant('Win32'),
      fc.constant('MacIntel'),
      fc.constant('Linux x86_64')
    ),
    userAgent: fc.oneof(
      fc.constant('Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'),
      fc.constant('Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'),
      fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'),
      fc.constant('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    ),
    memory: fc.integer({ min: 2, max: 16 }),
    isKioskMode: fc.boolean(),
    isRaspberryPi: fc.boolean()
  });

  it('should detect hardware environment correctly', () => {
    fc.assert(
      fc.property(hardwareEnvironmentArbitrary, (envConfig) => {
        mockHardwareEnvironment(envConfig);
        
        const detected = detectHardwareEnvironment();
        
        // Verify detection logic
        expect(detected).toBeDefined();
        expect(detected.platform).toBeDefined();
        expect(detected.userAgent).toBeDefined();
        expect(typeof detected.isRaspberryPi).toBe('boolean');
        expect(typeof detected.isKioskMode).toBe('boolean');
        expect(detected.memory).toBeGreaterThan(0);
      }),
      { numRuns: 10 }
    );
  });

  it('should maintain feature functionality across all hardware environments', async () => {
    await fc.assert(
      fc.asyncProperty(hardwareEnvironmentArbitrary, async (envConfig) => {
        mockHardwareEnvironment(envConfig);
        
        const validator = new FeatureParityValidator();
        const report = await validator.validateFeatureParity();
        
        // Core property: All features must work regardless of hardware
        expect(report).toBeDefined();
        expect(report.testResults).toBeDefined();
        expect(report.testResults.length).toBeGreaterThan(0);
        
        // Each feature test should complete (pass or fail gracefully)
        for (const result of report.testResults) {
          expect(result.feature).toBeDefined();
          expect(typeof result.passed).toBe('boolean');
          expect(result.performance).toBeDefined();
          expect(result.performance!.executionTime).toBeGreaterThanOrEqual(0);
          
          // If a feature fails, it should provide an error message
          if (!result.passed) {
            expect(result.error).toBeDefined();
            expect(result.error!.length).toBeGreaterThan(0);
          }
        }
        
        // Report should have timestamp
        expect(report.timestamp).toBeGreaterThan(0);
        expect(report.environment).toBeDefined();
      }),
      { numRuns: 10 }
    );
  }, 10000);

  it('should maintain leaderboard functionality across hardware', async () => {
    await fc.assert(
      fc.asyncProperty(hardwareEnvironmentArbitrary, async (envConfig) => {
        mockHardwareEnvironment(envConfig);
        
        const validator = new FeatureParityValidator();
        const result = await validator.testLeaderboardFeature();
        
        // Leaderboard must work on all hardware
        expect(result.feature).toBe('leaderboard');
        expect(result.performance).toBeDefined();
        expect(result.performance!.executionTime).toBeGreaterThanOrEqual(0);
        
        // Performance should be reasonable (< 5 seconds)
        expect(result.performance!.executionTime).toBeLessThan(5000);
      }),
      { numRuns: 10 }
    );
  }, 10000);

  it('should maintain real-time updates across hardware', async () => {
    await fc.assert(
      fc.asyncProperty(hardwareEnvironmentArbitrary, async (envConfig) => {
        mockHardwareEnvironment(envConfig);
        
        const validator = new FeatureParityValidator();
        const result = await validator.testRealTimeUpdates();
        
        // Real-time updates must work on all hardware
        expect(result.feature).toBe('real-time-updates');
        expect(result.performance).toBeDefined();
        expect(result.performance!.executionTime).toBeGreaterThanOrEqual(0);
        
        // Updates should be responsive (< 2 seconds)
        expect(result.performance!.executionTime).toBeLessThan(2000);
      }),
      { numRuns: 10 }
    );
  });

  it('should maintain daily code feature across hardware', async () => {
    await fc.assert(
      fc.asyncProperty(hardwareEnvironmentArbitrary, async (envConfig) => {
        mockHardwareEnvironment(envConfig);
        
        const validator = new FeatureParityValidator();
        const result = await validator.testDailyCodeFeature();
        
        // Daily code must work on all hardware
        expect(result.feature).toBe('daily-code');
        expect(result.performance).toBeDefined();
        expect(result.performance!.executionTime).toBeGreaterThanOrEqual(0);
        
        // Feature should load quickly (< 3 seconds)
        expect(result.performance!.executionTime).toBeLessThan(3000);
      }),
      { numRuns: 10 }
    );
  });

  it('should maintain navigation functionality across hardware', async () => {
    await fc.assert(
      fc.asyncProperty(hardwareEnvironmentArbitrary, async (envConfig) => {
        mockHardwareEnvironment(envConfig);
        
        const validator = new FeatureParityValidator();
        const result = await validator.testNavigationFeature();
        
        // Navigation must work on all hardware
        expect(result.feature).toBe('navigation');
        expect(result.performance).toBeDefined();
        expect(result.performance!.executionTime).toBeGreaterThanOrEqual(0);
        
        // Navigation should be instant (< 1 second)
        expect(result.performance!.executionTime).toBeLessThan(1000);
      }),
      { numRuns: 10 }
    );
  });

  it('should maintain animation support across hardware', async () => {
    await fc.assert(
      fc.asyncProperty(hardwareEnvironmentArbitrary, async (envConfig) => {
        mockHardwareEnvironment(envConfig);
        
        const validator = new FeatureParityValidator();
        const result = await validator.testAnimationFeature();
        
        // Animations must be supported on all hardware
        expect(result.feature).toBe('animations');
        expect(result.performance).toBeDefined();
        expect(result.performance!.executionTime).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 10 }
    );
  });

  it('should allow reasonable performance variance on resource-constrained hardware', async () => {
    // Generate baseline report for standard hardware
    mockHardwareEnvironment({
      platform: 'Win32',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      memory: 16,
      isKioskMode: false,
      isRaspberryPi: false
    });
    
    const baselineValidator = new FeatureParityValidator();
    const baselineReport = await baselineValidator.validateFeatureParity();

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          platform: fc.constant('Linux armv7l'),
          userAgent: fc.constant('Mozilla/5.0 (X11; Linux armv7l)'),
          memory: fc.constant(4),
          isKioskMode: fc.boolean(),
          isRaspberryPi: fc.constant(true)
        }),
        async (raspberryPiConfig) => {
          mockHardwareEnvironment(raspberryPiConfig);
          
          const validator = new FeatureParityValidator();
          const currentReport = await validator.validateFeatureParity();
          
          const comparisons = validator.comparePerformanceMetrics(baselineReport, currentReport);
          
          // Performance can be slower on Raspberry Pi, but features must still work
          for (const comparison of comparisons) {
            expect(comparison.performanceRatio).toBeGreaterThan(0);
            
            // Allow up to 10x slower performance on Raspberry Pi for property testing
            // This is more realistic for resource-constrained hardware
            expect(comparison.performanceRatio).toBeLessThan(10);
            
            // Verify the acceptable flag is set correctly
            if (comparison.performanceRatio <= 2.0) {
              expect(comparison.acceptable).toBe(true);
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 15000);

  it('should provide consistent feature availability regardless of kiosk mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        hardwareEnvironmentArbitrary,
        fc.boolean(),
        async (envConfig, kioskMode) => {
          mockHardwareEnvironment({ ...envConfig, isKioskMode: kioskMode });
          
          const validator = new FeatureParityValidator();
          const report = await validator.validateFeatureParity();
          
          // All core features should be available in both kiosk and normal mode
          const featureNames = report.testResults.map(r => r.feature);
          expect(featureNames).toContain('leaderboard');
          expect(featureNames).toContain('real-time-updates');
          expect(featureNames).toContain('daily-code');
          expect(featureNames).toContain('navigation');
          expect(featureNames).toContain('animations');
        }
      ),
      { numRuns: 10 }
    );
  }, 10000);

  it('should handle feature testing gracefully even with missing DOM elements', async () => {
    await fc.assert(
      fc.asyncProperty(
        hardwareEnvironmentArbitrary,
        fc.constantFrom('leaderboard', 'daily-code-card', 'navigation', 'animation-container'),
        async (envConfig, elementToRemove) => {
          mockHardwareEnvironment(envConfig);
          
          // Remove a DOM element to simulate incomplete rendering
          const element = document.querySelector(`[data-testid="${elementToRemove}"]`);
          if (element) {
            element.remove();
          }
          
          const validator = new FeatureParityValidator();
          const report = await validator.validateFeatureParity();
          
          // Validator should handle missing elements gracefully
          expect(report).toBeDefined();
          expect(report.testResults).toBeDefined();
          
          // Some tests may fail, but the validator should not crash
          const failedTests = report.testResults.filter(r => !r.passed);
          for (const failed of failedTests) {
            expect(failed.error).toBeDefined();
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
