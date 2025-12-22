/**
 * Feature Parity Status Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeatureParityStatus, FeatureParityIndicator } from '../FeatureParityStatus';
import { featureParityService } from '../../services/featureParityService';

// Mock the service
vi.mock('../../services/featureParityService', () => ({
  featureParityService: {
    getLastReport: vi.fn(),
    runValidation: vi.fn(),
    isPerformanceAcceptable: vi.fn(),
    getPerformanceRecommendations: vi.fn(),
    getConfig: vi.fn()
  }
}));

describe('FeatureParityStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup DOM for feature validation
    document.body.innerHTML = `
      <div data-testid="leaderboard">Test Leaderboard</div>
      <div data-testid="daily-code-card">
        <pre><code>console.log('test');</code></pre>
      </div>
      <nav role="navigation">
        <button>Home</button>
      </nav>
    `;
  });

  it('should render run validation button when no report exists', () => {
    (featureParityService.getLastReport as any).mockReturnValue(undefined);
    (featureParityService.getConfig as any).mockReturnValue({});

    render(<FeatureParityStatus />);

    expect(screen.getByText('Run Feature Validation')).toBeInTheDocument();
  });

  it('should show loading state during validation', () => {
    (featureParityService.getLastReport as any).mockReturnValue(undefined);
    (featureParityService.getConfig as any).mockReturnValue({});
    (featureParityService.runValidation as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<FeatureParityStatus />);
    
    const button = screen.getByText('Run Feature Validation');
    fireEvent.click(button);

    expect(screen.getByText('Validating features...')).toBeInTheDocument();
  });

  it('should display feature parity report when available', () => {
    const mockReport = {
      environment: {
        platform: 'Linux armv7l',
        isRaspberryPi: true,
        isKioskMode: false,
        memory: 4,
        userAgent: 'test',
        architecture: 'ARM'
      },
      testResults: [
        { feature: 'leaderboard', passed: true, performance: { executionTime: 100 } },
        { feature: 'daily-code', passed: false, error: 'Test error', performance: { executionTime: 200 } }
      ],
      overallPassed: false,
      timestamp: Date.now()
    };

    (featureParityService.getLastReport as any).mockReturnValue(mockReport);
    (featureParityService.isPerformanceAcceptable as any).mockReturnValue(true);
    (featureParityService.getPerformanceRecommendations as any).mockReturnValue([
      'Running on Raspberry Pi - consider enabling performance optimizations'
    ]);
    (featureParityService.getConfig as any).mockReturnValue({});

    render(<FeatureParityStatus showDetails={true} />);

    expect(screen.getByText('Feature Parity: 1/2 passed')).toBeInTheDocument();
    expect(screen.getByText('🥧 Raspberry Pi detected')).toBeInTheDocument();
    expect(screen.getByText('Memory: 4GB')).toBeInTheDocument();
    expect(screen.getByText('• Running on Raspberry Pi - consider enabling performance optimizations')).toBeInTheDocument();
  });

  it('should show performance warning when performance is not acceptable', () => {
    const mockReport = {
      environment: {
        platform: 'Linux armv7l',
        isRaspberryPi: true,
        isKioskMode: false,
        memory: 4,
        userAgent: 'test',
        architecture: 'ARM'
      },
      testResults: [
        { feature: 'leaderboard', passed: true, performance: { executionTime: 100 } }
      ],
      overallPassed: true,
      timestamp: Date.now()
    };

    (featureParityService.getLastReport as any).mockReturnValue(mockReport);
    (featureParityService.isPerformanceAcceptable as any).mockReturnValue(false);
    (featureParityService.getPerformanceRecommendations as any).mockReturnValue([]);
    (featureParityService.getConfig as any).mockReturnValue({});

    render(<FeatureParityStatus />);

    expect(screen.getByText('Performance Warning')).toBeInTheDocument();
  });
});

describe('FeatureParityIndicator', () => {
  it('should render green indicator for passing tests with good performance', () => {
    const mockReport = {
      environment: { platform: 'test', isRaspberryPi: false, isKioskMode: false, memory: 8, userAgent: 'test', architecture: 'x86' },
      testResults: [{ feature: 'test', passed: true, performance: { executionTime: 100 } }],
      overallPassed: true,
      timestamp: Date.now()
    };

    (featureParityService.getLastReport as any).mockReturnValue(mockReport);
    (featureParityService.isPerformanceAcceptable as any).mockReturnValue(true);

    render(<FeatureParityIndicator />);

    const indicator = screen.getByTestId('feature-parity-indicator');
    expect(indicator).toHaveClass('bg-green-500');
  });

  it('should render yellow indicator for passing tests with performance issues', () => {
    const mockReport = {
      environment: { platform: 'test', isRaspberryPi: false, isKioskMode: false, memory: 8, userAgent: 'test', architecture: 'x86' },
      testResults: [{ feature: 'test', passed: true, performance: { executionTime: 100 } }],
      overallPassed: true,
      timestamp: Date.now()
    };

    (featureParityService.getLastReport as any).mockReturnValue(mockReport);
    (featureParityService.isPerformanceAcceptable as any).mockReturnValue(false);

    render(<FeatureParityIndicator />);

    const indicator = screen.getByTestId('feature-parity-indicator');
    expect(indicator).toHaveClass('bg-yellow-500');
  });

  it('should render red indicator for failing tests', () => {
    const mockReport = {
      environment: { platform: 'test', isRaspberryPi: false, isKioskMode: false, memory: 8, userAgent: 'test', architecture: 'x86' },
      testResults: [{ feature: 'test', passed: false, error: 'Test failed', performance: { executionTime: 100 } }],
      overallPassed: false,
      timestamp: Date.now()
    };

    (featureParityService.getLastReport as any).mockReturnValue(mockReport);
    (featureParityService.isPerformanceAcceptable as any).mockReturnValue(true);

    render(<FeatureParityIndicator />);

    const indicator = screen.getByTestId('feature-parity-indicator');
    expect(indicator).toHaveClass('bg-red-500');
  });

  it('should not render when no report is available', () => {
    (featureParityService.getLastReport as any).mockReturnValue(undefined);

    render(<FeatureParityIndicator />);

    expect(screen.queryByTestId('feature-parity-indicator')).not.toBeInTheDocument();
  });
});