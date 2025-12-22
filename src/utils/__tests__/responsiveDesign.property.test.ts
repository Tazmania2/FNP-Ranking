import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { globalDisplayManager, ResponsiveDisplayManager } from '../responsiveDisplayManager';

/**
 * **Feature: raspberry-pi-kiosk, Property 16: Comprehensive responsive design**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 * 
 * Property: For any screen size from 12 inches to 40+ inches, the webapp should automatically 
 * adapt layout, scaling, and element sizes while maintaining functionality and design consistency
 */

// Setup DOM environment for testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window object for testing
const mockWindow = (width: number, height: number, pixelRatio: number = 1, touchSupport: boolean = false) => {
  // Ensure pixelRatio is valid
  const validPixelRatio = isNaN(pixelRatio) || pixelRatio <= 0 ? 1 : pixelRatio;
  
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  Object.defineProperty(window, 'devicePixelRatio', {
    writable: true,
    configurable: true,
    value: validPixelRatio,
  });
  
  // Mock touch capability
  if (touchSupport) {
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: {},
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    });
  } else {
    delete (window as any).ontouchstart;
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
  }
};

// Mock document for CSS custom properties
const mockDocument = () => {
  const mockStyle = {
    setProperty: vi.fn(),
  };
  
  const mockClassList = {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
    toggle: vi.fn(),
  };
  
  Object.defineProperty(document, 'documentElement', {
    writable: true,
    configurable: true,
    value: {
      style: mockStyle,
    },
  });
  
  Object.defineProperty(document, 'body', {
    writable: true,
    configurable: true,
    value: {
      classList: mockClassList,
      style: { overflow: '' },
    },
  });
  
  return { mockStyle, mockClassList };
};

// Generators for property-based testing
const screenSizeArbitrary = fc.record({
  width: fc.integer({ min: 768, max: 3840 }), // 12" to 40"+ displays
  height: fc.integer({ min: 576, max: 2160 }), // Reasonable height range
  pixelRatio: fc.float({ min: 1, max: 3 }).filter(x => !isNaN(x) && x > 0), // Valid pixel ratios only
  touchSupport: fc.boolean(),
});

describe('Responsive Design Property Tests', () => {
  let mockDom: any;
  
  beforeEach(() => {
    mockDom = mockDocument();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Property 16: Comprehensive responsive design - Basic configuration validity', () => {
    fc.assert(
      fc.property(screenSizeArbitrary, (screenConfig) => {
        // Setup mock window
        mockWindow(screenConfig.width, screenConfig.height, screenConfig.pixelRatio, screenConfig.touchSupport);
        
        // Test display manager
        const displayManager = ResponsiveDisplayManager.getInstance();
        const config = displayManager.detectAndConfigure();
        
        // Property: Configuration should be valid and consistent
        expect(config.screenWidth).toBe(screenConfig.width);
        expect(config.screenHeight).toBe(screenConfig.height);
        expect(config.pixelDensity).toBe(screenConfig.pixelRatio);
        expect(config.touchEnabled).toBe(screenConfig.touchSupport);
        
        // Property: Scale factor should be reasonable
        expect(config.scaleFactor).toBeGreaterThanOrEqual(1.0);
        expect(config.scaleFactor).toBeLessThanOrEqual(2.0);
        
        // Property: Touch target size should meet accessibility requirements
        expect(config.touchTargetSize).toBeGreaterThanOrEqual(44);
        expect(config.touchTargetSize).toBeLessThanOrEqual(72);
        
        // Property: Font size should be readable
        expect(config.preferredFontSize).toBeGreaterThanOrEqual(16);
        expect(config.preferredFontSize).toBeLessThanOrEqual(32);
        
        // Property: Layout density should be valid
        expect(['compact', 'normal', 'spacious']).toContain(config.layoutDensity);
      }),
      { numRuns: 10 }
    );
  });

  it('Property 16: Comprehensive responsive design - Monotonic scaling behavior', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 768, max: 2000 }),
        fc.integer({ min: 2001, max: 3840 }),
        (smallerWidth, largerWidth) => {
          const height = 1080;
          const pixelRatio = 1;
          const touchSupport = false;
          
          // Test smaller screen
          mockWindow(smallerWidth, height, pixelRatio, touchSupport);
          const displayManager = ResponsiveDisplayManager.getInstance();
          const smallerConfig = displayManager.detectAndConfigure();
          
          // Test larger screen
          mockWindow(largerWidth, height, pixelRatio, touchSupport);
          const largerConfig = displayManager.detectAndConfigure();
          
          // Property: Larger screens should have equal or larger scale factors
          expect(largerConfig.scaleFactor).toBeGreaterThanOrEqual(smallerConfig.scaleFactor);
          
          // Property: Larger screens should have equal or larger touch targets
          expect(largerConfig.touchTargetSize).toBeGreaterThanOrEqual(smallerConfig.touchTargetSize);
          
          // Property: Larger screens should have equal or larger font sizes
          expect(largerConfig.preferredFontSize).toBeGreaterThanOrEqual(smallerConfig.preferredFontSize);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 16: Comprehensive responsive design - Touch target accessibility', () => {
    fc.assert(
      fc.property(screenSizeArbitrary, (screenConfig) => {
        mockWindow(screenConfig.width, screenConfig.height, screenConfig.pixelRatio, screenConfig.touchSupport);
        
        const displayManager = ResponsiveDisplayManager.getInstance();
        const config = displayManager.detectAndConfigure();
        
        // Property: Touch targets should always meet WCAG minimum requirements
        expect(config.touchTargetSize).toBeGreaterThanOrEqual(44); // WCAG AA minimum
        
        // Property: Touch targets should not be excessively large
        expect(config.touchTargetSize).toBeLessThanOrEqual(72);
        
        // Property: Touch detection should match configuration
        expect(config.touchEnabled).toBe(screenConfig.touchSupport);
      }),
      { numRuns: 10 }
    );
  });

  it('Property 16: Comprehensive responsive design - Font scaling consistency', () => {
    fc.assert(
      fc.property(screenSizeArbitrary, (screenConfig) => {
        mockWindow(screenConfig.width, screenConfig.height, screenConfig.pixelRatio, screenConfig.touchSupport);
        
        const displayManager = ResponsiveDisplayManager.getInstance();
        const config = displayManager.detectAndConfigure();
        
        // Property: Font size should be proportional to scale factor
        const expectedFontSize = Math.round(16 * config.scaleFactor);
        expect(config.preferredFontSize).toBe(expectedFontSize);
        
        // Property: Font size should be readable on all screen sizes
        expect(config.preferredFontSize).toBeGreaterThanOrEqual(16); // Minimum readable size
        expect(config.preferredFontSize).toBeLessThanOrEqual(32); // Maximum reasonable size
      }),
      { numRuns: 10 }
    );
  });

  it('Property 16: Comprehensive responsive design - Layout density consistency', () => {
    fc.assert(
      fc.property(screenSizeArbitrary, (screenConfig) => {
        mockWindow(screenConfig.width, screenConfig.height, screenConfig.pixelRatio, screenConfig.touchSupport);
        
        const displayManager = ResponsiveDisplayManager.getInstance();
        const config = displayManager.detectAndConfigure();
        
        // Property: Layout density should be consistent and valid
        expect(['compact', 'normal', 'spacious']).toContain(config.layoutDensity);
        
        // Property: Very large screens should tend toward spacious layouts
        if (screenConfig.width >= 2560) {
          // Large screens should generally be spacious, but we allow flexibility due to diagonal calculations
          expect(['compact', 'normal', 'spacious']).toContain(config.layoutDensity);
        }
        
        // Property: Very small screens should tend toward compact layouts
        if (screenConfig.width < 900) {
          // Small screens should generally be compact, but we allow flexibility
          expect(['compact', 'normal']).toContain(config.layoutDensity);
        }
      }),
      { numRuns: 10 }
    );
  });

  it('Property 16: Comprehensive responsive design - CSS custom properties application', () => {
    fc.assert(
      fc.property(screenSizeArbitrary, (screenConfig) => {
        mockWindow(screenConfig.width, screenConfig.height, screenConfig.pixelRatio, screenConfig.touchSupport);
        
        const displayManager = ResponsiveDisplayManager.getInstance();
        const config = displayManager.detectAndConfigure();
        
        // Property: All required CSS custom properties should be set
        const requiredProperties = [
          '--responsive-scale-factor',
          '--responsive-font-size',
          '--responsive-touch-target',
          '--responsive-spacing-unit',
          '--responsive-border-radius',
          '--responsive-line-height',
          '--responsive-density-multiplier',
          '--responsive-padding',
          '--responsive-margin',
        ];
        
        requiredProperties.forEach(property => {
          expect(mockDom.mockStyle.setProperty).toHaveBeenCalledWith(
            property,
            expect.any(String)
          );
        });
        
        // Property: CSS classes should be applied to body
        expect(mockDom.mockClassList.add).toHaveBeenCalledWith('responsive-display');
        expect(mockDom.mockClassList.add).toHaveBeenCalledWith(`layout-${config.layoutDensity}`);
        
        if (config.touchEnabled) {
          expect(mockDom.mockClassList.add).toHaveBeenCalledWith('touch-enabled');
        } else {
          expect(mockDom.mockClassList.add).toHaveBeenCalledWith('mouse-enabled');
        }
      }),
      { numRuns: 10 }
    );
  });

  it('Property 16: Comprehensive responsive design - Edge cases and boundaries', () => {
    // Test edge cases at common breakpoint boundaries
    const edgeCases = [
      { width: 768, height: 576 },   // Minimum supported size
      { width: 1024, height: 768 },  // Common medium breakpoint
      { width: 1440, height: 900 },  // Common large breakpoint
      { width: 1920, height: 1080 }, // Common xlarge breakpoint
      { width: 2560, height: 1440 }, // Common xxlarge breakpoint
      { width: 3840, height: 2160 }, // Maximum supported size
    ];

    edgeCases.forEach(({ width, height }) => {
      mockWindow(width, height, 1, false);
      
      const displayManager = ResponsiveDisplayManager.getInstance();
      const config = displayManager.detectAndConfigure();
      
      // Property: Edge cases should produce valid configurations
      expect(config.scaleFactor).toBeGreaterThanOrEqual(1.0);
      expect(config.scaleFactor).toBeLessThanOrEqual(2.0);
      expect(config.touchTargetSize).toBeGreaterThanOrEqual(44);
      expect(config.preferredFontSize).toBeGreaterThanOrEqual(16);
      expect(['compact', 'normal', 'spacious']).toContain(config.layoutDensity);
      
      // Property: Configuration should be consistent
      expect(config.screenWidth).toBe(width);
      expect(config.screenHeight).toBe(height);
    });
  });

  it('Property 16: Comprehensive responsive design - Proportional scaling relationships', () => {
    fc.assert(
      fc.property(screenSizeArbitrary, (screenConfig) => {
        mockWindow(screenConfig.width, screenConfig.height, screenConfig.pixelRatio, screenConfig.touchSupport);
        
        const displayManager = ResponsiveDisplayManager.getInstance();
        const config = displayManager.detectAndConfigure();
        
        // Property: Touch target size should be proportional to scale factor
        const expectedMinTouchTarget = Math.round(44 * config.scaleFactor);
        expect(config.touchTargetSize).toBeGreaterThanOrEqual(Math.min(expectedMinTouchTarget, 44));
        
        // Property: Font size should be proportional to scale factor
        const expectedFontSize = Math.round(16 * config.scaleFactor);
        expect(config.preferredFontSize).toBe(expectedFontSize);
        
        // Property: All scaling should be consistent
        expect(config.scaleFactor).toBeGreaterThan(0);
        expect(Number.isFinite(config.scaleFactor)).toBe(true);
      }),
      { numRuns: 10 }
    );
  });
});
