import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { KioskModeManager } from '../kioskModeManager';

/**
 * **Feature: raspberry-pi-kiosk, Property 9: Firefox kiosk mode compatibility**
 * **Validates: Requirements 2.5**
 * 
 * Property: For any webapp functionality, when running in Firefox kiosk mode, 
 * all features should work optimally in full-screen display
 */

// Mock DOM environment for testing
const mockWindow = (config: {
  userAgent: string;
  outerWidth: number;
  outerHeight: number;
  screenWidth: number;
  screenHeight: number;
  availWidth: number;
  availHeight: number;
  historyLength: number;
  hasToolbar: boolean;
  hasMenubar: boolean;
  hasStatusbar: boolean;
  touchSupported: boolean;
  fullscreenElement?: Element | null;
}) => {
  // Mock navigator
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value: config.userAgent,
  });

  Object.defineProperty(navigator, 'maxTouchPoints', {
    writable: true,
    configurable: true,
    value: config.touchSupported ? 5 : 0,
  });

  // Mock window properties
  Object.defineProperty(window, 'outerWidth', {
    writable: true,
    configurable: true,
    value: config.outerWidth,
  });

  Object.defineProperty(window, 'outerHeight', {
    writable: true,
    configurable: true,
    value: config.outerHeight,
  });

  // Mock screen properties
  Object.defineProperty(window, 'screen', {
    writable: true,
    configurable: true,
    value: {
      width: config.screenWidth,
      height: config.screenHeight,
      availWidth: config.availWidth,
      availHeight: config.availHeight,
    },
  });

  // Mock history
  Object.defineProperty(window, 'history', {
    writable: true,
    configurable: true,
    value: {
      length: config.historyLength,
    },
  });

  // Mock window features (Firefox kiosk mode indicators)
  Object.defineProperty(window, 'toolbar', {
    writable: true,
    configurable: true,
    value: config.hasToolbar ? { visible: true } : { visible: false },
  });

  Object.defineProperty(window, 'menubar', {
    writable: true,
    configurable: true,
    value: config.hasMenubar ? { visible: true } : { visible: false },
  });

  Object.defineProperty(window, 'statusbar', {
    writable: true,
    configurable: true,
    value: config.hasStatusbar ? { visible: true } : { visible: false },
  });

  // Mock fullscreen API
  Object.defineProperty(document, 'fullscreenElement', {
    writable: true,
    configurable: true,
    value: config.fullscreenElement || null,
  });

  // Mock touch support
  if (config.touchSupported) {
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: {},
    });
  } else {
    delete (window as any).ontouchstart;
  }

  // Mock matchMedia for pointer detection
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: query.includes('pointer: fine') ? !config.touchSupported : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Mock document methods
const mockDocument = () => {
  const mockAddEventListener = vi.fn();
  const mockRemoveEventListener = vi.fn();
  const mockSetProperty = vi.fn();
  const mockClassListAdd = vi.fn();
  const mockClassListRemove = vi.fn();

  Object.defineProperty(document, 'addEventListener', {
    writable: true,
    configurable: true,
    value: mockAddEventListener,
  });

  Object.defineProperty(document, 'removeEventListener', {
    writable: true,
    configurable: true,
    value: mockRemoveEventListener,
  });

  Object.defineProperty(document, 'documentElement', {
    writable: true,
    configurable: true,
    value: {
      style: {
        setProperty: mockSetProperty,
      },
      requestFullscreen: vi.fn().mockResolvedValue(undefined),
    },
  });

  Object.defineProperty(document, 'body', {
    writable: true,
    configurable: true,
    value: {
      style: {
        userSelect: '',
        webkitUserSelect: '',
        overflow: '',
      },
      classList: {
        add: mockClassListAdd,
        remove: mockClassListRemove,
        contains: vi.fn(),
        toggle: vi.fn(),
      },
    },
  });

  return {
    mockAddEventListener,
    mockRemoveEventListener,
    mockSetProperty,
    mockClassListAdd,
    mockClassListRemove,
  };
};

// Generators for property-based testing
const firefoxUserAgentArbitrary = fc.oneof(
  fc.constant('Mozilla/5.0 (X11; Linux armv7l) Gecko/20100101 Firefox/91.0'), // Raspberry Pi Firefox
  fc.constant('Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/102.0'), // Desktop Firefox
  fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/108.0'), // Windows Firefox
  fc.constant('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) Gecko/20100101 Firefox/115.0'), // macOS Firefox
);

const nonFirefoxUserAgentArbitrary = fc.oneof(
  fc.constant('Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'), // Raspberry Pi Chrome
  fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'), // Chrome
  fc.constant('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'), // macOS Chrome
);

const kioskModeConfigArbitrary = fc.record({
  userAgent: fc.oneof(firefoxUserAgentArbitrary, nonFirefoxUserAgentArbitrary),
  outerWidth: fc.integer({ min: 800, max: 3840 }),
  outerHeight: fc.integer({ min: 600, max: 2160 }),
  screenWidth: fc.integer({ min: 800, max: 3840 }),
  screenHeight: fc.integer({ min: 600, max: 2160 }),
  availWidth: fc.integer({ min: 800, max: 3840 }),
  availHeight: fc.integer({ min: 600, max: 2160 }),
  historyLength: fc.integer({ min: 1, max: 10 }),
  hasToolbar: fc.boolean(),
  hasMenubar: fc.boolean(),
  hasStatusbar: fc.boolean(),
  touchSupported: fc.boolean(),
  isFullscreen: fc.boolean(),
}).map(config => ({
  ...config,
  // Ensure screen dimensions are consistent
  availWidth: Math.min(config.availWidth, config.screenWidth),
  availHeight: Math.min(config.availHeight, config.screenHeight),
  // Kiosk mode typically has window dimensions matching screen
  outerWidth: config.hasToolbar && config.hasMenubar ? config.screenWidth - 100 : config.screenWidth,
  outerHeight: config.hasToolbar && config.hasMenubar ? config.screenHeight - 100 : config.screenHeight,
}));

describe('Firefox Kiosk Mode Compatibility Property Tests', () => {
  let mockDom: any;
  let kioskManager: KioskModeManager;

  beforeEach(() => {
    mockDom = mockDocument();
    kioskManager = KioskModeManager.getInstance();
    kioskManager.resetConfig(); // Reset cached config for each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Property 9: Firefox kiosk mode compatibility - Firefox detection accuracy', () => {
    fc.assert(
      fc.property(kioskModeConfigArbitrary, (config) => {
        mockWindow({
          ...config,
          fullscreenElement: config.isFullscreen ? document.createElement('div') : null,
        });

        const detectedConfig = kioskManager.detectKioskMode();
        const isFirefoxUserAgent = /Firefox\/(\d+)/.test(config.userAgent);

        // Property: Firefox detection should be accurate
        expect(detectedConfig.browserInfo.isFirefox).toBe(isFirefoxUserAgent);

        // Property: Firefox version should be extracted correctly
        if (isFirefoxUserAgent) {
          const versionMatch = config.userAgent.match(/Firefox\/(\d+)/);
          const expectedVersion = versionMatch ? versionMatch[1] : 'unknown';
          expect(detectedConfig.browserInfo.version).toBe(expectedVersion);
        } else {
          expect(detectedConfig.browserInfo.version).toBe('N/A');
        }

        // Property: User agent should be preserved
        expect(detectedConfig.browserInfo.userAgent).toBe(config.userAgent);
      }),
      { numRuns: 10 }
    );
  });

  it('Property 9: Firefox kiosk mode compatibility - Kiosk mode detection', () => {
    fc.assert(
      fc.property(kioskModeConfigArbitrary, (config) => {
        mockWindow({
          ...config,
          fullscreenElement: config.isFullscreen ? document.createElement('div') : null,
        });

        const detectedConfig = kioskManager.detectKioskMode();

        // Property: Kiosk mode detection should be consistent
        const expectedKioskIndicators = [
          config.outerWidth === config.screenWidth && config.outerHeight === config.screenHeight,
          config.historyLength <= 1,
          config.isFullscreen,
          !config.hasToolbar,
          !config.hasMenubar,
          !config.hasStatusbar,
        ];

        const positiveIndicators = expectedKioskIndicators.filter(Boolean).length;
        const expectedKioskMode = positiveIndicators >= 2;

        expect(detectedConfig.isKioskMode).toBe(expectedKioskMode);

        // Property: Fullscreen state should be detected correctly
        expect(detectedConfig.isFullscreen).toBe(config.isFullscreen);
      }),
      { numRuns: 10 }
    );
  });

  it('Property 9: Firefox kiosk mode compatibility - Display information accuracy', () => {
    fc.assert(
      fc.property(kioskModeConfigArbitrary, (config) => {
        mockWindow({
          ...config,
          fullscreenElement: config.isFullscreen ? document.createElement('div') : null,
        });

        const detectedConfig = kioskManager.detectKioskMode();

        // Property: Display information should match window/screen properties
        expect(detectedConfig.displayInfo.width).toBe(config.screenWidth);
        expect(detectedConfig.displayInfo.height).toBe(config.screenHeight);
        expect(detectedConfig.displayInfo.availWidth).toBe(config.availWidth);
        expect(detectedConfig.displayInfo.availHeight).toBe(config.availHeight);

        // Property: Fullscreen capability should be detected
        expect(typeof detectedConfig.displayInfo.isFullscreenCapable).toBe('boolean');
      }),
      { numRuns: 10 }
    );
  });

  it('Property 9: Firefox kiosk mode compatibility - Input capabilities detection', () => {
    fc.assert(
      fc.property(kioskModeConfigArbitrary, (config) => {
        mockWindow({
          ...config,
          fullscreenElement: config.isFullscreen ? document.createElement('div') : null,
        });

        const detectedConfig = kioskManager.detectKioskMode();

        // Property: Touch support should be detected correctly
        expect(detectedConfig.inputCapabilities.touchSupported).toBe(config.touchSupported);

        // Property: Mouse support should be inverse of touch (simplified assumption)
        expect(detectedConfig.inputCapabilities.mouseSupported).toBe(!config.touchSupported);

        // Property: Keyboard support should always be true
        expect(detectedConfig.inputCapabilities.keyboardSupported).toBe(true);
      }),
      { numRuns: 10 }
    );
  });

  it('Property 9: Firefox kiosk mode compatibility - Optimization application', () => {
    fc.assert(
      fc.property(kioskModeConfigArbitrary, (config) => {
        mockWindow({
          ...config,
          fullscreenElement: config.isFullscreen ? document.createElement('div') : null,
        });

        const detectedConfig = kioskManager.detectKioskMode();
        
        // Apply optimizations if in kiosk mode
        if (detectedConfig.isKioskMode || detectedConfig.isFullscreen) {
          kioskManager.applyKioskOptimizations();

          // Property: Event listeners should be added for kiosk mode
          expect(mockDom.mockAddEventListener).toHaveBeenCalled();

          // Property: CSS classes should be applied for touch optimization
          if (detectedConfig.inputCapabilities.touchSupported) {
            expect(mockDom.mockClassListAdd).toHaveBeenCalledWith('kiosk-touch-optimized');
          }

          // Property: CSS custom properties should be set
          expect(mockDom.mockSetProperty).toHaveBeenCalled();
        }
      }),
      { numRuns: 10 }
    );
  });

  it('Property 9: Firefox kiosk mode compatibility - Firefox-specific optimizations', () => {
    fc.assert(
      fc.property(
        fc.record({
          screenWidth: fc.integer({ min: 1024, max: 3840 }),
          screenHeight: fc.integer({ min: 768, max: 2160 }),
          touchSupported: fc.boolean(),
          isKioskMode: fc.boolean(),
        }),
        (config) => {
          // Test specifically with Firefox user agent
          const firefoxUserAgent = 'Mozilla/5.0 (X11; Linux armv7l) Gecko/20100101 Firefox/91.0';
          
          mockWindow({
            userAgent: firefoxUserAgent,
            outerWidth: config.screenWidth,
            outerHeight: config.screenHeight,
            screenWidth: config.screenWidth,
            screenHeight: config.screenHeight,
            availWidth: config.screenWidth,
            availHeight: config.screenHeight,
            historyLength: config.isKioskMode ? 1 : 5,
            hasToolbar: !config.isKioskMode,
            hasMenubar: !config.isKioskMode,
            hasStatusbar: !config.isKioskMode,
            touchSupported: config.touchSupported,
            fullscreenElement: config.isKioskMode ? document.createElement('div') : null,
          });

          const detectedConfig = kioskManager.detectKioskMode();

          // Property: Firefox should be detected correctly
          expect(detectedConfig.browserInfo.isFirefox).toBe(true);
          expect(detectedConfig.browserInfo.version).toBe('91');

          // Property: Kiosk mode should be detected based on indicators
          if (config.isKioskMode) {
            expect(detectedConfig.isKioskMode).toBe(true);
            
            // Apply optimizations and verify Firefox-specific behavior
            kioskManager.applyKioskOptimizations();
            
            // Property: Firefox-specific CSS properties should be applied
            expect(document.body.style.userSelect).toBe('none');
            expect(document.body.style.webkitUserSelect).toBe('none');
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 9: Firefox kiosk mode compatibility - Fullscreen API compatibility', () => {
    fc.assert(
      fc.property(
        fc.record({
          hasRequestFullscreen: fc.boolean(),
          hasWebkitRequestFullscreen: fc.boolean(),
          hasMozRequestFullScreen: fc.boolean(),
          hasMsRequestFullscreen: fc.boolean(),
        }),
        (apiSupport) => {
          // Mock fullscreen API methods
          const mockElement = document.createElement('div');
          
          if (apiSupport.hasRequestFullscreen) {
            mockElement.requestFullscreen = vi.fn().mockResolvedValue(undefined);
          }
          if (apiSupport.hasWebkitRequestFullscreen) {
            (mockElement as any).webkitRequestFullscreen = vi.fn().mockResolvedValue(undefined);
          }
          if (apiSupport.hasMozRequestFullScreen) {
            (mockElement as any).mozRequestFullScreen = vi.fn().mockResolvedValue(undefined);
          }
          if (apiSupport.hasMsRequestFullscreen) {
            (mockElement as any).msRequestFullscreen = vi.fn().mockResolvedValue(undefined);
          }

          // Mock document.documentElement with the same API support
          Object.defineProperty(document, 'documentElement', {
            writable: true,
            configurable: true,
            value: mockElement,
          });

          mockWindow({
            userAgent: 'Mozilla/5.0 (X11; Linux armv7l) Gecko/20100101 Firefox/91.0',
            outerWidth: 1920,
            outerHeight: 1080,
            screenWidth: 1920,
            screenHeight: 1080,
            availWidth: 1920,
            availHeight: 1080,
            historyLength: 1,
            hasToolbar: false,
            hasMenubar: false,
            hasStatusbar: false,
            touchSupported: false,
            fullscreenElement: null,
          });

          const detectedConfig = kioskManager.detectKioskMode();

          // Property: Fullscreen capability should be detected correctly
          const expectedCapability = apiSupport.hasRequestFullscreen || 
                                   apiSupport.hasWebkitRequestFullscreen || 
                                   apiSupport.hasMozRequestFullScreen || 
                                   apiSupport.hasMsRequestFullscreen;
          
          expect(detectedConfig.displayInfo.isFullscreenCapable).toBe(expectedCapability);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 9: Firefox kiosk mode compatibility - Touch optimization for kiosk displays', () => {
    fc.assert(
      fc.property(
        fc.record({
          screenSize: fc.integer({ min: 12, max: 55 }), // Screen size in inches (diagonal)
          touchSupported: fc.boolean(),
          isKioskMode: fc.boolean(),
        }),
        (config) => {
          // Calculate approximate screen dimensions based on diagonal size
          const aspectRatio = 16 / 9; // Assume 16:9 aspect ratio
          const diagonalPixels = config.screenSize * 96; // Approximate pixels per inch
          const width = Math.round(diagonalPixels * Math.cos(Math.atan(1 / aspectRatio)));
          const height = Math.round(width / aspectRatio);

          mockWindow({
            userAgent: 'Mozilla/5.0 (X11; Linux armv7l) Gecko/20100101 Firefox/91.0',
            outerWidth: width,
            outerHeight: height,
            screenWidth: width,
            screenHeight: height,
            availWidth: width,
            availHeight: height,
            historyLength: config.isKioskMode ? 1 : 5,
            hasToolbar: !config.isKioskMode,
            hasMenubar: !config.isKioskMode,
            hasStatusbar: !config.isKioskMode,
            touchSupported: config.touchSupported,
            fullscreenElement: config.isKioskMode ? document.createElement('div') : null,
          });

          const detectedConfig = kioskManager.detectKioskMode();

          if (detectedConfig.isKioskMode && detectedConfig.inputCapabilities.touchSupported) {
            kioskManager.applyKioskOptimizations();

            // Property: Touch-optimized class should be applied
            expect(mockDom.mockClassListAdd).toHaveBeenCalledWith('kiosk-touch-optimized');

            // Property: Touch target size should be set appropriately
            expect(mockDom.mockSetProperty).toHaveBeenCalledWith(
              '--kiosk-touch-target-min',
              expect.stringMatching(/\d+px/)
            );

            // Property: Touch spacing should be set
            expect(mockDom.mockSetProperty).toHaveBeenCalledWith(
              '--kiosk-touch-spacing',
              expect.stringMatching(/\d+px/)
            );
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 9: Firefox kiosk mode compatibility - Error handling and cleanup', () => {
    fc.assert(
      fc.property(
        fc.record({
          shouldThrowError: fc.boolean(),
          isKioskMode: fc.boolean(),
        }),
        (config) => {
          mockWindow({
            userAgent: 'Mozilla/5.0 (X11; Linux armv7l) Gecko/20100101 Firefox/91.0',
            outerWidth: 1920,
            outerHeight: 1080,
            screenWidth: 1920,
            screenHeight: 1080,
            availWidth: 1920,
            availHeight: 1080,
            historyLength: config.isKioskMode ? 1 : 5,
            hasToolbar: !config.isKioskMode,
            hasMenubar: !config.isKioskMode,
            hasStatusbar: !config.isKioskMode,
            touchSupported: false,
            fullscreenElement: config.isKioskMode ? document.createElement('div') : null,
          });

          if (config.shouldThrowError) {
            // Mock a method to throw an error
            mockDom.mockAddEventListener.mockImplementation(() => {
              throw new Error('Test error');
            });
          }

          const detectedConfig = kioskManager.detectKioskMode();

          if (detectedConfig.isKioskMode) {
            // Property: Optimization application should handle errors gracefully
            expect(() => {
              kioskManager.applyKioskOptimizations();
            }).not.toThrow();

            // Property: Cleanup should work regardless of errors during setup
            expect(() => {
              kioskManager.removeKioskOptimizations();
            }).not.toThrow();

            // Property: Event listeners should be removed during cleanup
            expect(mockDom.mockRemoveEventListener).toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
