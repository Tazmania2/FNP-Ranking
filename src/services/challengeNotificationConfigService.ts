/**
 * Configuration Service for Challenge Completion Notifications
 * 
 * Manages configuration settings for the notification system including:
 * - Display duration and positioning
 * - Enabled challenge types
 * - Webhook authentication settings
 * - Hot-reloading of configuration changes
 */

export interface PopupAnimationConfig {
  enterDuration: number;
  exitDuration: number;
  enterEasing: string;
  exitEasing: string;
}

export interface WebhookConfig {
  url: string;
  authToken?: string;
  apiKey?: string;
  signatureSecret?: string;
  timeout: number;
  retryAttempts: number;
}

export interface SSEConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatTimeout: number;
}

export interface NotificationConfig {
  // Display settings
  displayDuration: number;
  position: 'top-right' | 'top-center' | 'center';
  maxQueueSize: number;
  
  // Challenge filtering
  enabledChallengeTypes: string[];
  enabledChallengeCategories: string[];
  
  // Animation settings
  animationConfig: PopupAnimationConfig;
  
  // Infrastructure settings
  webhookConfig: WebhookConfig;
  sseConfig: SSEConfig;
  
  // Feature flags
  enableNotifications: boolean;
  enableSounds: boolean;
  enableVibration: boolean;
  
  // Performance settings
  memoryCleanupInterval: number;
  maxStoredEvents: number;
}

export interface ConfigChangeEvent {
  type: 'config_updated';
  changes: Partial<NotificationConfig>;
  timestamp: Date;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration service with hot-reloading capabilities
 */
export class ChallengeNotificationConfigService {
  private static instance: ChallengeNotificationConfigService;
  private config: NotificationConfig;
  private changeListeners: ((event: ConfigChangeEvent) => void)[] = [];
  private validationListeners: ((result: ConfigValidationResult) => void)[] = [];
  
  private constructor() {
    this.config = this.getDefaultConfig();
    this.loadConfigFromStorage();
  }

  public static getInstance(): ChallengeNotificationConfigService {
    if (!ChallengeNotificationConfigService.instance) {
      ChallengeNotificationConfigService.instance = new ChallengeNotificationConfigService();
    }
    return ChallengeNotificationConfigService.instance;
  }

  /**
   * Reset the singleton instance (for testing purposes only)
   */
  public static resetInstance(): void {
    ChallengeNotificationConfigService.instance = undefined as any;
  }

  /**
   * Get current configuration
   */
  public getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration with hot-reloading
   */
  public updateConfig(updates: Partial<NotificationConfig>): ConfigValidationResult {
    const validation = this.validateConfig({ ...this.config, ...updates });
    
    if (!validation.isValid) {
      this.notifyValidationListeners(validation);
      return validation;
    }

    const previousConfig = { ...this.config };
    this.config = { ...this.config, ...updates };
    
    // Save to storage
    this.saveConfigToStorage();
    
    // Notify listeners of changes
    const changeEvent: ConfigChangeEvent = {
      type: 'config_updated',
      changes: updates,
      timestamp: new Date()
    };
    
    this.notifyChangeListeners(changeEvent);
    
    console.log('Configuration updated:', {
      changes: Object.keys(updates),
      timestamp: changeEvent.timestamp.toISOString()
    });
    
    return validation;
  }

  /**
   * Reset configuration to defaults
   */
  public resetToDefaults(): void {
    const defaultConfig = this.getDefaultConfig();
    this.updateConfig(defaultConfig);
  }

  /**
   * Validate configuration
   */
  public validateConfig(config: Partial<NotificationConfig>): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate display duration
    if (config.displayDuration !== undefined) {
      if (config.displayDuration < 1000) {
        errors.push('Display duration must be at least 1000ms');
      }
      if (config.displayDuration > 30000) {
        warnings.push('Display duration over 30 seconds may be too long');
      }
    }
    
    // Validate position
    if (config.position !== undefined) {
      const validPositions = ['top-right', 'top-center', 'center'];
      if (!validPositions.includes(config.position)) {
        errors.push(`Position must be one of: ${validPositions.join(', ')}`);
      }
    }
    
    // Validate queue size
    if (config.maxQueueSize !== undefined) {
      if (config.maxQueueSize < 1) {
        errors.push('Max queue size must be at least 1');
      }
      if (config.maxQueueSize > 100) {
        warnings.push('Large queue sizes may impact performance');
      }
    }
    
    // Validate animation config
    if (config.animationConfig) {
      const { enterDuration, exitDuration } = config.animationConfig;
      if (enterDuration < 100 || exitDuration < 100) {
        errors.push('Animation durations must be at least 100ms');
      }
    }
    
    // Validate webhook config
    if (config.webhookConfig) {
      const { url, timeout, retryAttempts } = config.webhookConfig;
      
      if (url && !url.startsWith('http') && !url.startsWith('/')) {
        errors.push('Webhook URL must be a valid HTTP/HTTPS URL or relative path');
      }
      
      if (timeout !== undefined && timeout < 1000) {
        errors.push('Webhook timeout must be at least 1000ms');
      }
      
      if (retryAttempts !== undefined && (retryAttempts < 0 || retryAttempts > 10)) {
        errors.push('Retry attempts must be between 0 and 10');
      }
    }
    
    // Validate SSE config
    if (config.sseConfig) {
      const { reconnectInterval, maxReconnectAttempts, heartbeatTimeout } = config.sseConfig;
      
      if (reconnectInterval !== undefined && reconnectInterval < 1000) {
        errors.push('SSE reconnect interval must be at least 1000ms');
      }
      
      if (maxReconnectAttempts !== undefined && (maxReconnectAttempts < 1 || maxReconnectAttempts > 50)) {
        errors.push('Max reconnect attempts must be between 1 and 50');
      }
      
      if (heartbeatTimeout !== undefined && heartbeatTimeout < 10000) {
        errors.push('Heartbeat timeout must be at least 10000ms');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Subscribe to configuration changes
   */
  public onConfigChange(listener: (event: ConfigChangeEvent) => void): () => void {
    this.changeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to validation events
   */
  public onValidation(listener: (result: ConfigValidationResult) => void): () => void {
    this.validationListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.validationListeners.indexOf(listener);
      if (index > -1) {
        this.validationListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get specific configuration section
   */
  public getDisplayConfig() {
    return {
      displayDuration: this.config.displayDuration,
      position: this.config.position,
      maxQueueSize: this.config.maxQueueSize,
      animationConfig: this.config.animationConfig
    };
  }

  public getWebhookConfig() {
    return { ...this.config.webhookConfig };
  }

  public getSSEConfig() {
    return { ...this.config.sseConfig };
  }

  public getChallengeFilterConfig() {
    return {
      enabledChallengeTypes: [...this.config.enabledChallengeTypes],
      enabledChallengeCategories: [...this.config.enabledChallengeCategories]
    };
  }

  /**
   * Check if a challenge should trigger notifications
   */
  public shouldNotifyForChallenge(challengeType?: string, challengeCategory?: string): boolean {
    if (!this.config.enableNotifications) {
      return false;
    }
    
    // If no filters are set, notify for all challenges
    if (this.config.enabledChallengeTypes.length === 0 && 
        this.config.enabledChallengeCategories.length === 0) {
      return true;
    }
    
    // Check challenge type filter
    if (challengeType && this.config.enabledChallengeTypes.length > 0) {
      if (!this.config.enabledChallengeTypes.includes(challengeType)) {
        return false;
      }
    }
    
    // Check challenge category filter
    if (challengeCategory && this.config.enabledChallengeCategories.length > 0) {
      if (!this.config.enabledChallengeCategories.includes(challengeCategory)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): NotificationConfig {
    return {
      // Display settings
      displayDuration: 4000, // 4 seconds
      position: 'top-right',
      maxQueueSize: 10,
      
      // Challenge filtering
      enabledChallengeTypes: [], // Empty means all types enabled
      enabledChallengeCategories: [], // Empty means all categories enabled
      
      // Animation settings
      animationConfig: {
        enterDuration: 300,
        exitDuration: 300,
        enterEasing: 'ease-out',
        exitEasing: 'ease-in'
      },
      
      // Infrastructure settings
      webhookConfig: {
        url: '/api/challenge-webhook',
        timeout: 5000,
        retryAttempts: 3
      },
      
      sseConfig: {
        url: '/api/challenge-events',
        reconnectInterval: 1000,
        maxReconnectAttempts: 10,
        heartbeatTimeout: 60000
      },
      
      // Feature flags
      enableNotifications: true,
      enableSounds: false,
      enableVibration: false,
      
      // Performance settings
      memoryCleanupInterval: 300000, // 5 minutes
      maxStoredEvents: 100
    };
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfigFromStorage(): void {
    try {
      const stored = localStorage.getItem('challenge-notification-config');
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        const validation = this.validateConfig(parsedConfig);
        
        if (validation.isValid) {
          this.config = { ...this.config, ...parsedConfig };
        } else {
          console.warn('Invalid stored configuration, using defaults:', validation.errors);
        }
      }
    } catch (error) {
      console.error('Error loading configuration from storage:', error);
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfigToStorage(): void {
    try {
      localStorage.setItem('challenge-notification-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving configuration to storage:', error);
    }
  }

  /**
   * Notify change listeners
   */
  private notifyChangeListeners(event: ConfigChangeEvent): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in config change listener:', error);
      }
    });
  }

  /**
   * Notify validation listeners
   */
  private notifyValidationListeners(result: ConfigValidationResult): void {
    this.validationListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Error in validation listener:', error);
      }
    });
  }
}

// Export singleton instance
export const challengeNotificationConfig = ChallengeNotificationConfigService.getInstance();

// Export types for external use
export type {
  NotificationConfig,
  ConfigChangeEvent,
  ConfigValidationResult,
  PopupAnimationConfig,
  WebhookConfig,
  SSEConfig
};