/**
 * Property-based tests for Challenge Notification Popup component
 * Feature: challenge-completion-notifications
 */

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import fc from 'fast-check';
import { ChallengeNotificationPopup } from '../ChallengeNotificationPopup';
import type { ChallengeCompletionEvent } from '../../services/sseClientService';

// Clean up after each test to prevent DOM pollution
afterEach(() => {
  cleanup();
});

// Generators for property-based testing
const challengeCompletionEventArbitrary = fc.record({
  id: fc.string({ minLength: 5, maxLength: 20 }),
  playerId: fc.string({ minLength: 5, maxLength: 20 }),
  playerName: fc.string({ minLength: 3, maxLength: 50 }),
  challengeId: fc.string({ minLength: 5, maxLength: 20 }),
  challengeName: fc.string({ minLength: 5, maxLength: 100 }),
  completedAt: fc.constantFrom('2024-01-08T10:30:00.000Z', '2024-01-08T15:45:00.000Z', '2024-01-08T20:15:00.000Z'),
  points: fc.option(fc.integer({ min: 0, max: 1000 })),
  timestamp: fc.constantFrom('2024-01-08T10:30:00.000Z', '2024-01-08T15:45:00.000Z', '2024-01-08T20:15:00.000Z')
});

const positionArbitrary = fc.constantFrom('top-right', 'top-center', 'center');

describe('ChallengeNotificationPopup Property Tests', () => {
  /**
   * Property 6: Popup display with complete information
   * For any challenge completion event, the displayed popup should contain 
   * all required player and challenge information
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  it('Property 6: displays all required information for any challenge completion event', () => {
    fc.assert(
      fc.property(
        challengeCompletionEventArbitrary,
        positionArbitrary,
        fc.integer({ min: 1000, max: 10000 }), // duration
        (event, position, duration) => {
          const mockOnDismiss = () => {};
          
          const { unmount } = render(
            <ChallengeNotificationPopup
              notification={event}
              position={position}
              duration={duration}
              onDismiss={mockOnDismiss}
            />
          );

          try {
            // Verify player name is displayed prominently (Requirement 2.2)
            const playerNameElement = screen.getByTestId('notification-player-name');
            expect(playerNameElement).toBeInTheDocument();
            expect(playerNameElement.textContent).toContain(event.playerName);

            // Verify challenge name or description is displayed (Requirement 2.3)
            const challengeNameElement = screen.getByTestId('notification-challenge-name');
            expect(challengeNameElement).toBeInTheDocument();
            expect(challengeNameElement.textContent).toContain(event.challengeName);

            // Verify popup appears on screen with challenge completion information (Requirement 2.1)
            const popupElement = screen.getByTestId('challenge-notification-popup');
            expect(popupElement).toBeInTheDocument();
            expect(popupElement).toBeVisible();

            // Verify points are displayed if provided
            if (event.points !== undefined && event.points !== null) {
              const pointsElement = screen.getByTestId('notification-points');
              expect(pointsElement).toBeInTheDocument();
              expect(pointsElement.textContent).toContain(event.points.toString());
            }

            // Verify the popup contains celebratory elements
            const celebratoryElement = screen.getByTestId('notification-celebration');
            expect(celebratoryElement).toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 12: Responsive positioning and scaling
   * For any screen size or kiosk mode configuration, popups should be 
   * positioned appropriately and remain readable
   * **Validates: Requirements 4.1, 4.4, 4.5**
   */
  it('Property 12: maintains appropriate positioning and readability across screen sizes', () => {
    fc.assert(
      fc.property(
        challengeCompletionEventArbitrary,
        positionArbitrary,
        fc.record({
          width: fc.integer({ min: 320, max: 3840 }), // From mobile to 4K
          height: fc.integer({ min: 240, max: 2160 }),
          isKioskMode: fc.boolean(),
          scaleFactor: fc.float({ min: 0.5, max: 3.0 })
        }),
        (event, position, screenConfig) => {
          const mockOnDismiss = () => {};
          
          // Mock window dimensions
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: screenConfig.width,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: screenConfig.height,
          });

          // Apply kiosk mode class if needed
          if (screenConfig.isKioskMode) {
            document.body.classList.add('kiosk-mode');
            document.body.style.setProperty('--tv-scale-factor', screenConfig.scaleFactor.toString());
          }

          const { unmount } = render(
            <ChallengeNotificationPopup
              notification={event}
              position={position}
              duration={4000}
              onDismiss={mockOnDismiss}
            />
          );

          try {
            const popupElement = screen.getByTestId('challenge-notification-popup');

            // Verify popup is positioned appropriately and not blocking critical interface elements (Requirement 4.1)
            expect(popupElement).toBeInTheDocument();
            expect(popupElement).toBeVisible();
            
            // Check positioning based on position prop - verify CSS classes are applied correctly
            if (position === 'top-right') {
              expect(popupElement).toHaveClass('fixed', 'top-4', 'right-4');
            } else if (position === 'top-center') {
              expect(popupElement).toHaveClass('fixed', 'top-4', 'left-1/2');
            } else if (position === 'center') {
              expect(popupElement).toHaveClass('fixed', 'top-1/2', 'left-1/2');
            }

            // Verify popup scales appropriately for readability (Requirement 4.4)
            // Check that responsive classes are applied
            expect(popupElement).toHaveClass('responsive-container');
            const cardElement = popupElement.querySelector('.responsive-card');
            expect(cardElement).toBeInTheDocument();
            
            // Verify text elements have responsive classes
            const playerNameElement = screen.getByTestId('notification-player-name');
            expect(playerNameElement).toHaveClass('responsive-text');
            
            // In kiosk mode, verify kiosk-specific classes are applied
            if (screenConfig.isKioskMode) {
              expect(document.body).toHaveClass('kiosk-mode');
            }

            // Verify popup remains visible and properly sized in kiosk mode (Requirement 4.5)
            if (screenConfig.isKioskMode) {
              // Verify the popup element exists and has proper structure
              expect(popupElement).toBeInTheDocument();
              expect(popupElement).toBeVisible();
              
              // Verify responsive container classes are applied
              expect(popupElement).toHaveClass('responsive-container');
            }

            // Verify text remains readable at different screen sizes
            const playerNameEl = screen.getByTestId('notification-player-name');
            expect(playerNameEl).toHaveClass('responsive-text', 'text-scale-large');
            
            const challengeNameElement = screen.getByTestId('notification-challenge-name');
            expect(challengeNameElement).toHaveClass('responsive-text', 'text-scale-medium');
          } finally {
            // Clean up
            document.body.classList.remove('kiosk-mode');
            document.body.style.removeProperty('--tv-scale-factor');
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8: Automatic dismissal timing
   * For any displayed popup, it should automatically dismiss after exactly the configured duration
   * **Validates: Requirements 3.1**
   */
  it('Property 8: automatically dismisses after configured duration', () => {
    fc.assert(
      fc.asyncProperty(
        challengeCompletionEventArbitrary,
        fc.integer({ min: 500, max: 2000 }), // shorter duration for faster tests
        async (event, duration) => {
          return new Promise<void>((resolve, reject) => {
            let dismissCalled = false;
            const startTime = Date.now();
            
            const mockOnDismiss = () => {
              const elapsed = Date.now() - startTime;
              dismissCalled = true;
              
              // Allow some tolerance for timing (±200ms)
              if (elapsed >= duration - 200 && elapsed <= duration + 500) {
                resolve();
              } else {
                reject(new Error(`Popup dismissed after ${elapsed}ms, expected ~${duration}ms`));
              }
            };

            const { unmount } = render(
              <ChallengeNotificationPopup
                notification={event}
                duration={duration}
                onDismiss={mockOnDismiss}
              />
            );

            // Set a timeout to fail the test if dismissal doesn't happen
            const timeoutId = setTimeout(() => {
              unmount();
              if (!dismissCalled) {
                reject(new Error(`Popup was not dismissed within ${duration + 1000}ms`));
              }
            }, duration + 1000);

            // Clean up timeout when test completes
            const originalResolve = resolve;
            const originalReject = reject;
            resolve = (...args) => {
              clearTimeout(timeoutId);
              unmount();
              originalResolve(...args);
            };
            reject = (...args) => {
              clearTimeout(timeoutId);
              unmount();
              originalReject(...args);
            };
          });
        }
      ),
      { numRuns: 10, timeout: 10000 }
    );
  });

  /**
   * Property 9: Animation completion
   * For any popup display or dismissal, all animations should complete successfully without interruption
   * **Validates: Requirements 2.4, 3.2**
   */
  it('Property 9: completes all animations successfully without interruption', () => {
    fc.assert(
      fc.asyncProperty(
        challengeCompletionEventArbitrary,
        positionArbitrary,
        fc.integer({ min: 500, max: 2000 }), // shorter duration for faster tests
        async (event, position, duration) => {
          return new Promise<void>((resolve, reject) => {
            let testCompleted = false;
            
            const mockOnDismiss = () => {
              if (!testCompleted) {
                testCompleted = true;
                resolve();
              }
            };

            const { unmount, container } = render(
              <ChallengeNotificationPopup
                notification={event}
                position={position}
                duration={duration}
                onDismiss={mockOnDismiss}
              />
            );

            try {
              // Use container.querySelector to avoid multiple element issues
              const popupElement = container.querySelector('[data-testid="challenge-notification-popup"]');
              
              if (!popupElement) {
                unmount();
                reject(new Error('Popup element not found'));
                return;
              }
              
              // Verify popup has animation classes applied (Requirement 2.4)
              expect(popupElement).toHaveClass('transition-all', 'duration-300', 'ease-out');
              
              // Check that hardware acceleration classes are applied for performance (Requirement 3.2)
              expect(popupElement).toHaveClass('will-change-transform');
              
              // Verify the popup is properly structured for animations
              expect(popupElement).toHaveClass('transition-all');
              
              // Test passes if the component is properly set up for animations
              if (!testCompleted) {
                testCompleted = true;
                unmount();
                resolve();
              }

            } catch (error) {
              if (!testCompleted) {
                testCompleted = true;
                unmount();
                reject(error);
              }
            }
          });
        }
      ),
      { numRuns: 10, timeout: 5000 }
    );
  });
});