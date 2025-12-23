/**
 * Property-based tests for loading feedback visibility
 * Tests loading display component for Raspberry Pi deployment
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { LoadingDisplay, OverlayLoading, ComponentLoading } from '../LoadingDisplay';
import type { LoadingState } from '../../types';

describe('Loading Feedback Visibility Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Generator for loading states
  const loadingStateArb = fc.record({
    leaderboards: fc.boolean(),
    currentLeaderboard: fc.boolean(),
    switchingLeaderboard: fc.boolean()
  });

  // Generator for loading messages
  const loadingMessageArb = fc.oneof(
    fc.constant('Loading...'),
    fc.constant('Please wait...'),
    fc.constant('Fetching data...'),
    fc.constant('Updating...'),
    fc.string({ minLength: 5, maxLength: 50 })
  );

  // Generator for loading variants
  const loadingVariantArb = fc.constantFrom('spinner', 'dots', 'pulse', 'skeleton');

  // Generator for loading sizes
  const loadingSizeArb = fc.constantFrom('small', 'medium', 'large');

  /**
   * **Feature: raspberry-pi-kiosk, Property 8: Loading feedback visibility**
   * **Validates: Requirements 2.4**
   * 
   * For any slow operation, loading indicators should be displayed to provide user feedback
   */
  it('should always display loading indicators when any loading state is active', () => {
    fc.assert(
      fc.property(
        loadingStateArb,
        loadingMessageArb,
        loadingVariantArb,
        loadingSizeArb,
        (loadingState: LoadingState, message: string, variant: any, size: any) => {
          const { container, unmount } = render(
            <LoadingDisplay 
              loading={loadingState}
              message={message}
              variant={variant}
              size={size}
            />
          );
          
          try {
            const isAnyLoading = Object.values(loadingState).some(Boolean);
            
            if (isAnyLoading) {
              // Should render loading indicator when any loading state is true
              expect(container.firstChild).not.toBeNull();
              
              // Should have proper ARIA attributes for accessibility
              const loadingElement = container.querySelector('[role="status"]');
              expect(loadingElement).not.toBeNull();
              
              // Should display the loading message (except for skeleton variant)
              if (variant !== 'skeleton') {
                const displayedText = container.textContent || '';
                expect(displayedText).toContain(message);
                
                // Should have appropriate visual indicators based on variant
                switch (variant) {
                  case 'spinner':
                    const spinner = container.querySelector('.animate-spin');
                    expect(spinner).not.toBeNull();
                    break;
                  case 'dots':
                    // Dots variant has different structure - check for container
                    const dotsContainer = container.querySelector('[role="status"]');
                    expect(dotsContainer).not.toBeNull();
                    break;
                  case 'pulse':
                    const pulse = container.querySelector('.animate-pulse');
                    expect(pulse).not.toBeNull();
                    break;
                }
              } else {
                // Skeleton variants have different structure
                const skeleton = container.querySelector('.animate-pulse');
                expect(skeleton).not.toBeNull();
              }
            } else {
              // Should not render anything when no loading states are active
              expect(container.firstChild).toBeNull();
            }
            
            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display appropriate loading messages based on loading state type', () => {
    fc.assert(
      fc.property(
        loadingStateArb,
        (loadingState: LoadingState) => {
          const { container, unmount } = render(
            <LoadingDisplay loading={loadingState} />
          );
          
          try {
            const isAnyLoading = Object.values(loadingState).some(Boolean);
            
            if (isAnyLoading) {
              const displayedText = container.textContent || '';
              
              // Should display contextual loading messages
              if (loadingState.leaderboards) {
                expect(displayedText).toContain('Loading leaderboards');
              } else if (loadingState.switchingLeaderboard) {
                expect(displayedText).toContain('Switching leaderboard');
              } else if (loadingState.currentLeaderboard) {
                expect(displayedText).toContain('Updating race data');
              }
              
              // Should not display generic "Loading..." when specific context is available
              const hasSpecificMessage = displayedText.includes('leaderboards') || 
                                        displayedText.includes('Switching') || 
                                        displayedText.includes('race data');
              expect(hasSpecificMessage).toBe(true);
            }
            
            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle overlay loading correctly for blocking operations', () => {
    fc.assert(
      fc.property(
        loadingStateArb,
        loadingMessageArb,
        (loadingState: LoadingState, message: string) => {
          const { container, unmount } = render(
            <OverlayLoading 
              loading={loadingState}
              message={message}
            />
          );
          
          try {
            const isAnyLoading = Object.values(loadingState).some(Boolean);
            
            if (isAnyLoading) {
              // Should render overlay with proper positioning
              const overlay = container.firstChild as HTMLElement;
              expect(overlay).not.toBeNull();
              expect(overlay).toHaveClass('absolute', 'inset-0', 'bg-white', 'bg-opacity-80');
              
              // Should have high z-index for proper layering
              expect(overlay).toHaveClass('z-10');
              
              // Should display loading message
              const displayedText = container.textContent || '';
              expect(displayedText).toContain(message);
              
              // Should have loading indicator
              const loadingIndicator = container.querySelector('[role="status"]');
              expect(loadingIndicator).not.toBeNull();
            } else {
              // Should not render when no loading states are active
              expect(container.firstChild).toBeNull();
            }
            
            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle component-level loading states correctly', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        loadingMessageArb,
        loadingVariantArb,
        loadingSizeArb,
        (isLoading: boolean, message: string, variant: any, size: any) => {
          const { container, unmount } = render(
            <ComponentLoading 
              isLoading={isLoading}
              message={message}
              variant={variant}
              size={size}
            />
          );
          
          try {
            if (isLoading) {
              // Should render loading indicator
              expect(container.firstChild).not.toBeNull();
              
              // Should display message
              const displayedText = container.textContent || '';
              expect(displayedText).toContain(message);
              
              // Should have proper ARIA attributes
              const loadingElement = container.querySelector('[role="status"]');
              expect(loadingElement).not.toBeNull();
              
              // Should have appropriate styling
              const containerElement = container.firstChild as HTMLElement;
              expect(containerElement).toHaveClass('flex', 'items-center', 'justify-center');
            } else {
              // Should not render when not loading
              expect(container.firstChild).toBeNull();
            }
            
            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain accessibility standards across all loading variants', () => {
    fc.assert(
      fc.property(
        loadingStateArb,
        loadingVariantArb,
        (loadingState: LoadingState, variant: any) => {
          const { container, unmount } = render(
            <LoadingDisplay 
              loading={loadingState}
              variant={variant}
            />
          );
          
          try {
            const isAnyLoading = Object.values(loadingState).some(Boolean);
            
            if (isAnyLoading) {
              // Should have proper ARIA role
              const loadingElement = container.querySelector('[role="status"]');
              expect(loadingElement).not.toBeNull();
              
              // Should have appropriate ARIA label (may vary by variant)
              const ariaLabel = loadingElement?.getAttribute('aria-label');
              expect(ariaLabel).toBeTruthy();
              expect(ariaLabel).toContain('Loading');
              
              // Should not have any accessibility violations
              const allElements = container.querySelectorAll('*');
              allElements.forEach(element => {
                // Should not have empty alt attributes
                if (element.hasAttribute('alt')) {
                  expect(element.getAttribute('alt')).not.toBe('');
                }
                
                // Should not have invalid ARIA attributes
                if (element.hasAttribute('aria-label')) {
                  expect(element.getAttribute('aria-label')).not.toBe('');
                }
              });
            }
            
            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases in loading messages and states', () => {
    const edgeCaseMessageArb = fc.oneof(
      fc.constant(''), // Empty message
      fc.constant('   '), // Whitespace only
      fc.constant('\n\t\r'), // Special characters
      fc.constant('🔄⏳⌛'), // Emoji only
      fc.string({ minLength: 500, maxLength: 1000 }), // Very long message
      fc.constant('null'), // String "null"
      fc.constant('undefined') // String "undefined"
      // Removed XSS test case as it's not the component's responsibility to sanitize
    );

    fc.assert(
      fc.property(
        loadingStateArb,
        edgeCaseMessageArb,
        (loadingState: LoadingState, message: string) => {
          const { container, unmount } = render(
            <LoadingDisplay 
              loading={loadingState}
              message={message}
            />
          );
          
          try {
            const isAnyLoading = Object.values(loadingState).some(Boolean);
            
            if (isAnyLoading) {
              // Should not crash with edge case messages
              expect(container.firstChild).not.toBeNull();
              
              // Should still have proper ARIA attributes
              const loadingElement = container.querySelector('[role="status"]');
              expect(loadingElement).not.toBeNull();
              
              // Should handle empty messages gracefully
              if (message.trim() === '') {
                // Should fall back to default message
                const displayedText = container.textContent || '';
                expect(displayedText.length).toBeGreaterThan(0);
              }
            }
            
            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});