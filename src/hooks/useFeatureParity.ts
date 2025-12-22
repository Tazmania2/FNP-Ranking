/**
 * Feature Parity Hook
 * 
 * React hook for integrating feature parity validation into components
 */

import { useState, useEffect, useCallback } from 'react';
import { featureParityService, type FeatureParityConfig } from '../services/featureParityService';
import { type FeatureParityReport, type HardwareEnvironment } from '../utils/featureParityValidator';

export interface UseFeatureParityReturn {
  lastReport: FeatureParityReport | undefined;
  isValidating: boolean;
  environment: HardwareEnvironment | undefined;
  isPerformanceAcceptable: boolean;
  recommendations: string[];
  runValidation: () => Promise<void>;
  config: FeatureParityConfig;
  updateConfig: (newConfig: Partial<FeatureParityConfig>) => void;
}

/**
 * Hook for feature parity validation and monitoring
 */
export function useFeatureParity(): UseFeatureParityReturn {
  const [lastReport, setLastReport] = useState<FeatureParityReport | undefined>(
    featureParityService.getLastReport()
  );
  const [isValidating, setIsValidating] = useState(false);
  const [config, setConfig] = useState(featureParityService.getConfig());

  // Run validation manually
  const runValidation = useCallback(async () => {
    setIsValidating(true);
    try {
      const report = await featureParityService.runValidation();
      setLastReport(report);
    } catch (error) {
      console.error('Feature parity validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<FeatureParityConfig>) => {
    featureParityService.updateConfig(newConfig);
    setConfig(featureParityService.getConfig());
  }, []);

  // Check for updates periodically
  useEffect(() => {
    const checkForUpdates = () => {
      const currentReport = featureParityService.getLastReport();
      if (currentReport && currentReport !== lastReport) {
        setLastReport(currentReport);
      }
    };

    const interval = setInterval(checkForUpdates, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [lastReport]);

  // Derived values
  const environment = lastReport?.environment;
  const isPerformanceAcceptable = featureParityService.isPerformanceAcceptable();
  const recommendations = featureParityService.getPerformanceRecommendations();

  return {
    lastReport,
    isValidating,
    environment,
    isPerformanceAcceptable,
    recommendations,
    runValidation,
    config,
    updateConfig
  };
}

/**
 * Hook for checking if current environment is Raspberry Pi
 */
export function useIsRaspberryPi(): boolean {
  const { environment } = useFeatureParity();
  return environment?.isRaspberryPi ?? false;
}

/**
 * Hook for checking if current environment is in kiosk mode
 */
export function useIsKioskMode(): boolean {
  const { environment } = useFeatureParity();
  return environment?.isKioskMode ?? false;
}

/**
 * Hook for getting performance recommendations
 */
export function usePerformanceRecommendations(): string[] {
  const { recommendations } = useFeatureParity();
  return recommendations;
}