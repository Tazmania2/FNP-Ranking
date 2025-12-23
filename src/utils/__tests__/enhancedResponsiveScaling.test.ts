import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResponsiveDisplayManager } from '../responsiveDisplayManager';

// Mock window object for testing
const mockWindow = (width: number, height: number, pixelRatio: number = 1) => {
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
    value: pixelRatio,
  });
};

describe('Enhanced Responsive Scaling for TV Displays', () => {
  let displayManager: ResponsiveDisplayManager;

  beforeEach(() => {
    // Reset singleton instance
    // @ts-ignore - Access private constructor for testing
    ResponsiveDisplayManager.instance = undefined;
    displayManager = ResponsiveDisplayManager.getInstance();
    
    // Mock document methods
    vi.spyOn(document.documentElement.style, 'setProperty').mockImplementation(() => {});
    vi.spyOn(document.body.classList, 'add').mockImplementation(() => {});
  });

  it('should apply aggressive scaling for 4K TV displays', () => {
    mockWindow(3840, 2160, 1); // 4K TV
    
    const config = displayManager.detectAndConfigure();
    
    expect(config.scaleFactor).toBeGreaterThanOrEqual(2.4);
    expect(config.layoutDensity).toBe('spacious');
    expect(config.preferredFontSize).toBeGreaterThanOrEqual(38); // 16 * 2.4
  });

  it('should apply strong scaling for 1080p TV displays', () => {
    mockWindow(1920, 1080, 1); // 1080p TV
    
    const config = displayManager.detectAndConfigure();
    
    expect(config.scaleFactor).toBeGreaterThanOrEqual(2.0);
    expect(config.layoutDensity).toBe('spacious');
    expect(config.preferredFontSize).toBeGreaterThanOrEqual(32); // 16 * 2.0
  });

  it('should apply moderate scaling for large monitors', () => {
    mockWindow(2560, 1440, 1.5); // 1440p monitor with higher DPI
    
    const config = displayManager.detectAndConfigure();
    
    // High DPI monitors should get aggressive scaling for TV-like viewing
    expect(config.scaleFactor).toBeGreaterThanOrEqual(2.0);
    expect(config.layoutDensity).toBe('spacious');
  });

  it('should use normal scaling for standard laptop displays', () => {
    mockWindow(1366, 768, 1); // Standard laptop
    
    const config = displayManager.detectAndConfigure();
    
    expect(config.scaleFactor).toBeGreaterThanOrEqual(1.0);
    expect(config.scaleFactor).toBeLessThan(1.6);
    expect(config.layoutDensity).toBe('normal');
  });

  it('should detect TV displays and apply appropriate optimizations', () => {
    mockWindow(1920, 1080, 1); // TV-like characteristics
    
    const config = displayManager.detectAndConfigure();
    
    // Should detect as TV-sized and apply aggressive scaling
    expect(config.scaleFactor).toBeGreaterThanOrEqual(2.0);
    expect(config.touchTargetSize).toBeGreaterThanOrEqual(72);
  });

  it('should handle ultra-wide displays appropriately', () => {
    mockWindow(3440, 1440, 1); // Ultra-wide monitor
    
    const config = displayManager.detectAndConfigure();
    
    expect(config.scaleFactor).toBeGreaterThanOrEqual(2.0);
    expect(config.layoutDensity).toBe('spacious');
  });

  it('should provide larger touch targets for TV displays', () => {
    mockWindow(3840, 2160, 1); // 4K TV
    
    const config = displayManager.detectAndConfigure();
    
    // Should provide larger touch targets, but within reasonable bounds
    expect(config.touchTargetSize).toBeGreaterThanOrEqual(72);
    expect(config.touchTargetSize).toBeLessThanOrEqual(120);
  });

  it('should estimate diagonal size more accurately for TV displays', () => {
    mockWindow(1920, 1080, 1); // 1080p with TV characteristics
    
    // Access private method for testing
    // @ts-ignore
    const dimensions = displayManager.getDisplayDimensions();
    
    // Should estimate a reasonable TV diagonal size
    expect(dimensions.diagonal).toBeGreaterThanOrEqual(32);
  });
});