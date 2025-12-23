/**
 * Property-based tests for graceful error handling
 * Tests error display component for Raspberry Pi deployment
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ErrorDisplay } from '../ErrorDisplay';
import type { ApiError } from '../../types';

describe('Graceful Error Handling Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Feature: raspberry-pi-kiosk, Property 4: Graceful error handling**
   * **Validates: Requirements 1.4, 2.3**
   * 
   * For any error condition, the webapp should continue functioning 
   * and display user-friendly messages instead of crashing or showing technical details
   */
  it('should display user-friendly error messages for any error type', () => {
    const apiErrorArb = fc.record({
      type: fc.constantFrom('network', 'auth', 'validation', 'config'),
      message: fc.string({ minLength: 5, maxLength: 100 }),
      retryable: fc.boolean(),
      timestamp: fc.integer({ min: Date.now() - 24 * 60 * 60 * 1000, max: Date.now() })
    });

    fc.assert(
      fc.property(apiErrorArb, (error: ApiError) => {
        const { container, unmount } = render(
          <ErrorDisplay error={error} />
        );
        
        try {
          // Should render without crashing
          expect(container.firstChild).not.toBeNull();
          
          // Should have proper ARIA attributes
          const errorElement = container.querySelector('[role="alert"]');
          expect(errorElement).not.toBeNull();
          expect(errorElement).toHaveAttribute('aria-live', 'polite');
          
          // Should display appropriate error title
          const expectedTitles = {
            'network': 'Connection Error',
            'auth': 'Authentication Error', 
            'validation': 'Data Error',
            'config': 'Configuration Error'
          };
          
          const titleElement = container.querySelector('h3');
          expect(titleElement?.textContent).toBe(expectedTitles[error.type]);
          
          // Should display appropriate icon
          const expectedIcons = {
            'network': '🌐',
            'auth': '🔒',
            'validation': '⚠️', 
            'config': '⚙️'
          };
          
          const iconElement = container.querySelector('.text-xl');
          expect(iconElement?.textContent?.trim()).toBe(expectedIcons[error.type]);
          
          return true;
        } finally {
          unmount();
        }
      }),
      { numRuns: 50 }
    );
  });

  it('should handle null errors gracefully', () => {
    const { container } = render(<ErrorDisplay error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should maintain consistent styling across error types', () => {
    const networkError: ApiError = {
      type: 'network',
      message: 'Test error',
      retryable: true,
      timestamp: Date.now()
    };

    const { container } = render(<ErrorDisplay error={networkError} />);
    const errorElement = container.firstChild as HTMLElement;
    
    expect(errorElement).toHaveClass('border', 'rounded-lg', 'shadow-sm');
    expect(errorElement).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800');
  });
});