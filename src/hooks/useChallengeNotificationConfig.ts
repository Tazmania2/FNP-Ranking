/**
 * React hook for managing challenge notification configuration
 * 
 * Provides reactive access to configuration settings with hot-reloading support
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  challengeNotificationConfig,
  type NotificationConfig,
  type ConfigChangeEvent,
  type ConfigValidationResult
} from '../services/challengeNotificationConfigService';

export interface UseConfigResult {
  config: NotificationConfig;
  updateConfig: (updates: Partial<NotificationConfig>) => ConfigValidationResult;
  resetToDefaults: () => void;
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  isLoading: boolean;
}

/**
 * Hook for managing challenge notification configuration
 */
export function useChallengeNotificationConfig(): UseConfigResult {
  const [config, setConfig] = useState<NotificationConfig>(() => 
    challengeNotificationConfig.getConfig()
  );
  const [validationResult, setValidationResult] = useState<ConfigValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });
  const [isLoading, setIsLoading] = useState(false);

  // Update config when service changes
  useEffect(() => {
    const unsubscribe = challengeNotificationConfig.onConfigChange((event: ConfigChangeEvent) => {
      setConfig(challengeNotificationConfig.getConfig());
    });

    return unsubscribe;
  }, []);

  // Listen for validation events
  useEffect(() => {
    const unsubscribe = challengeNotificationConfig.onValidation((result: ConfigValidationResult) => {
      setValidationResult(result);
    });

    return unsubscribe;
  }, []);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<NotificationConfig>): ConfigValidationResult => {
    setIsLoading(true);
    
    try {
      const result = challengeNotificationConfig.updateConfig(updates);
      setValidationResult(result);
      
      if (result.isValid) {
        setConfig(challengeNotificationConfig.getConfig());
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setIsLoading(true);
    
    try {
      challengeNotificationConfig.resetToDefaults();
      setConfig(challengeNotificationConfig.getConfig());
      setValidationResult({ isValid: true, errors: [], warnings: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    config,
    updateConfig,
    resetToDefaults,
    isValid: validationResult.isValid,
    validationErrors: validationResult.errors,
    validationWarnings: validationResult.warnings,
    isLoading
  };
}

/**
 * Hook for specific configuration sections
 */
export function useDisplayConfig() {
  const { config, updateConfig } = useChallengeNotificationConfig();
  
  return {
    displayDuration: config.displayDuration,
    position: config.position,
    maxQueueSize: config.maxQueueSize,
    animationConfig: config.animationConfig,
    updateDisplayDuration: (duration: number) => updateConfig({ displayDuration: duration }),
    updatePosition: (position: 'top-right' | 'top-center' | 'center') => updateConfig({ position }),
    updateMaxQueueSize: (size: number) => updateConfig({ maxQueueSize: size }),
    updateAnimationConfig: (animationConfig: any) => updateConfig({ animationConfig })
  };
}

export function useWebhookConfig() {
  const { config, updateConfig } = useChallengeNotificationConfig();
  
  return {
    webhookConfig: config.webhookConfig,
    updateWebhookConfig: (webhookConfig: any) => updateConfig({ webhookConfig })
  };
}

export function useSSEConfig() {
  const { config, updateConfig } = useChallengeNotificationConfig();
  
  return {
    sseConfig: config.sseConfig,
    updateSSEConfig: (sseConfig: any) => updateConfig({ sseConfig })
  };
}

export function useChallengeFilters() {
  const { config, updateConfig } = useChallengeNotificationConfig();
  
  return {
    enabledChallengeTypes: config.enabledChallengeTypes,
    enabledChallengeCategories: config.enabledChallengeCategories,
    updateEnabledChallengeTypes: (types: string[]) => updateConfig({ enabledChallengeTypes: types }),
    updateEnabledChallengeCategories: (categories: string[]) => updateConfig({ enabledChallengeCategories: categories }),
    shouldNotifyForChallenge: (type?: string, category?: string) => 
      challengeNotificationConfig.shouldNotifyForChallenge(type, category)
  };
}