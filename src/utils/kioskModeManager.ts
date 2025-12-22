/**
 * Kiosk Mode Manager for Firefox Kiosk Mode Compatibility
 * Handles detection, optimization, and adaptive behavior for kiosk deployment
 */

export interface KioskModeConfig {
  isKioskMode: boolean;
  isFullscreen: boolean;
  browserInfo: {
    isFirefox: boolean;
    version: string;
    userAgent: string;
  };
  displayInfo: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    isFullscreenCapable: boolean;
  };
  inputCapabilities: {
    touchSupported: boolean;
    mouseSupported: boolean;
    keyboardSupported: boolean;
  };
}

export interface KioskOptimizations {
  disableContextMenu: boolean;
  disableTextSelection: boolean;
  disableScrollBars: boolean;
  enableFullscreenAPI: boolean;
  optimizeForTouch: boolean;
  preventNavigation: boolean;
}

/**
 * Kiosk Mode Manager for Firefox compatibility and optimization
 */
export class KioskModeManager {
  private static instance: KioskModeManager;
  private config: KioskModeConfig | null = null;
  private optimizations: KioskOptimizations | null = null;
  private listeners: Array<() => void> = [];

  private constructor() {}

  public static getInstance(): KioskModeManager {
    if (!KioskModeManager.instance) {
      KioskModeManager.instance = new KioskModeManager();
    }
    return KioskModeManager.instance;
  }

  /**
   * Detect if running in kiosk mode and gather system information
   */
  public detectKioskMode(): KioskModeConfig {
    if (this.config) {
      return this.config;
    }

    // Detect Firefox browser
    const userAgent = navigator.userAgent;
    const isFirefox = /Firefox\/(\d+)/.test(userAgent);
    const firefoxVersion = isFirefox ? userAgent.match(/Firefox\/(\d+)/)?.[1] || 'unknown' : 'N/A';

    // Detect fullscreen state
    const isFullscreen = this.isCurrentlyFullscreen();

    // Detect kiosk mode indicators
    const isKioskMode = this.detectKioskModeIndicators();

    // Get display information
    const displayInfo = {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      isFullscreenCapable: this.isFullscreenAPISupported(),
    };

    // Detect input capabilities
    const inputCapabilities = {
      touchSupported: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      mouseSupported: window.matchMedia('(pointer: fine)').matches,
      keyboardSupported: true, // Assume keyboard is always available
    };

    this.config = {
      isKioskMode,
      isFullscreen,
      browserInfo: {
        isFirefox,
        version: firefoxVersion,
        userAgent,
      },
      displayInfo,
      inputCapabilities,
    };

    return this.config;
  }

  /**
   * Apply kiosk mode optimizations
   */
  public applyKioskOptimizations(): void {
    const config = this.detectKioskMode();
    
    if (!config.isKioskMode && !config.isFullscreen) {
      return; // No optimizations needed for regular mode
    }

    this.optimizations = {
      disableContextMenu: true,
      disableTextSelection: true,
      disableScrollBars: config.isFullscreen,
      enableFullscreenAPI: config.displayInfo.isFullscreenCapable,
      optimizeForTouch: config.inputCapabilities.touchSupported,
      preventNavigation: config.isKioskMode,
    };

    this.applyOptimizations();
  }

  /**
   * Remove kiosk mode optimizations
   */
  public removeKioskOptimizations(): void {
    this.removeOptimizations();
    this.optimizations = null;
  }

  /**
   * Get current kiosk mode configuration
   */
  public getConfig(): KioskModeConfig | null {
    return this.config;
  }

  /**
   * Check if currently in fullscreen mode
   */
  public isCurrentlyFullscreen(): boolean {
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  }

  /**
   * Request fullscreen mode
   */
  public async requestFullscreen(element?: HTMLElement): Promise<boolean> {
    const targetElement = element || document.documentElement;
    
    try {
      if (targetElement.requestFullscreen) {
        await targetElement.requestFullscreen();
      } else if ((targetElement as any).webkitRequestFullscreen) {
        await (targetElement as any).webkitRequestFullscreen();
      } else if ((targetElement as any).mozRequestFullScreen) {
        await (targetElement as any).mozRequestFullScreen();
      } else if ((targetElement as any).msRequestFullscreen) {
        await (targetElement as any).msRequestFullscreen();
      } else {
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Failed to request fullscreen:', error);
      return false;
    }
  }

  /**
   * Exit fullscreen mode
   */
  public async exitFullscreen(): Promise<boolean> {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      } else {
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Failed to exit fullscreen:', error);
      return false;
    }
  }

  /**
   * Add listener for kiosk mode changes
   */
  public addChangeListener(callback: () => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove change listener
   */
  public removeChangeListener(callback: () => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Detect kiosk mode indicators
   */
  private detectKioskModeIndicators(): boolean {
    // Check for common kiosk mode indicators
    const indicators = [
      // Window dimensions match screen dimensions (no browser chrome)
      window.outerWidth === window.screen.width && window.outerHeight === window.screen.height,
      
      // No browser navigation available
      window.history.length <= 1,
      
      // Fullscreen state
      this.isCurrentlyFullscreen(),
      
      // Check for kiosk-specific URL parameters or localStorage flags
      new URLSearchParams(window.location.search).has('kiosk'),
      localStorage.getItem('kioskMode') === 'true',
      
      // Firefox kiosk mode specific: limited window features
      !window.toolbar?.visible,
      !window.menubar?.visible,
      !window.statusbar?.visible,
    ];

    // Consider it kiosk mode if multiple indicators are present
    const positiveIndicators = indicators.filter(Boolean).length;
    return positiveIndicators >= 2;
  }

  /**
   * Check if Fullscreen API is supported
   */
  private isFullscreenAPISupported(): boolean {
    return !!(
      document.documentElement.requestFullscreen ||
      (document.documentElement as any).webkitRequestFullscreen ||
      (document.documentElement as any).mozRequestFullScreen ||
      (document.documentElement as any).msRequestFullscreen
    );
  }

  /**
   * Apply the optimizations
   */
  private applyOptimizations(): void {
    if (!this.optimizations) return;

    // Disable context menu
    if (this.optimizations.disableContextMenu) {
      document.addEventListener('contextmenu', this.preventContextMenu);
    }

    // Disable text selection
    if (this.optimizations.disableTextSelection) {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      (document.body.style as any).mozUserSelect = 'none';
      (document.body.style as any).msUserSelect = 'none';
    }

    // Hide scrollbars
    if (this.optimizations.disableScrollBars) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    // Optimize for touch
    if (this.optimizations.optimizeForTouch) {
      document.body.classList.add('kiosk-touch-optimized');
      // Add CSS custom properties for touch optimization
      document.documentElement.style.setProperty('--kiosk-touch-target-min', '44px');
      document.documentElement.style.setProperty('--kiosk-touch-spacing', '8px');
    }

    // Prevent navigation
    if (this.optimizations.preventNavigation) {
      window.addEventListener('beforeunload', this.preventNavigation);
      document.addEventListener('keydown', this.preventNavigationKeys);
    }

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('msfullscreenchange', this.handleFullscreenChange);

    console.log('🖥️ Kiosk mode optimizations applied');
  }

  /**
   * Remove the optimizations
   */
  private removeOptimizations(): void {
    // Remove event listeners
    document.removeEventListener('contextmenu', this.preventContextMenu);
    window.removeEventListener('beforeunload', this.preventNavigation);
    document.removeEventListener('keydown', this.preventNavigationKeys);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('msfullscreenchange', this.handleFullscreenChange);

    // Reset styles
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    (document.body.style as any).mozUserSelect = '';
    (document.body.style as any).msUserSelect = '';
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    // Remove classes
    document.body.classList.remove('kiosk-touch-optimized');

    console.log('🖥️ Kiosk mode optimizations removed');
  }

  /**
   * Prevent context menu
   */
  private preventContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  /**
   * Prevent navigation
   */
  private preventNavigation = (event: BeforeUnloadEvent): void => {
    event.preventDefault();
    event.returnValue = '';
  };

  /**
   * Prevent navigation keys
   */
  private preventNavigationKeys = (event: KeyboardEvent): void => {
    // Prevent common navigation shortcuts
    const preventKeys = [
      'F5', // Refresh
      'F11', // Fullscreen toggle
      'F12', // Developer tools
    ];

    if (preventKeys.includes(event.key)) {
      event.preventDefault();
    }

    // Prevent Ctrl+key combinations
    if (event.ctrlKey) {
      const preventCtrlKeys = ['r', 'R', 'w', 'W', 't', 'T', 'n', 'N'];
      if (preventCtrlKeys.includes(event.key)) {
        event.preventDefault();
      }
    }

    // Prevent Alt+key combinations
    if (event.altKey) {
      const preventAltKeys = ['F4', 'Tab'];
      if (preventAltKeys.includes(event.key)) {
        event.preventDefault();
      }
    }
  };

  /**
   * Handle fullscreen changes
   */
  private handleFullscreenChange = (): void => {
    // Update config
    this.config = null; // Force re-detection
    const newConfig = this.detectKioskMode();
    
    // Notify listeners
    this.listeners.forEach(callback => callback());
    
    console.log('🖥️ Fullscreen state changed:', newConfig.isFullscreen);
  };

  /**
   * Reset cached configuration (for testing purposes)
   */
  public resetConfig(): void {
    this.config = null;
    this.optimizations = null;
  }
}

// Global instance
export const globalKioskModeManager = KioskModeManager.getInstance();