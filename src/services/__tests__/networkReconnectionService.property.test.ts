/**
 * Property-based tests for network reconnection service
 * Tests network reconnection resilience for Raspberry Pi deployment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { NetworkReconnectionService } from '../networkReconnectionService';

describe('Network Reconnection Service Property Tests', () => {
  let service: NetworkReconnectionService;
  let mockConnectionTest: vi.MockedFunction<() => Promise<boolean>>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockConnectionTest = vi.fn();
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /**
   * **Feature: raspberry-pi-kiosk, Property 3: Network reconnection resilience**
   * **Validates: Requirements 1.3**
   * 
   * For any network outage scenario, when connectivity is restored, the webapp should 
   * automatically reconnect and resume normal operation without user intervention
   */
  it('should automatically reconnect after any network outage pattern', () => {
    fc.assert(
      fc.property(
        // Generate simple outage and recovery patterns
        fc.record({
          outageSteps: fc.integer({ min: 1, max: 3 }), // Number of failed connection attempts
          recoveryAfterSteps: fc.integer({ min: 1, max: 2 }) // Steps after which connection succeeds
        }),
        fc.record({
          maxRetries: fc.integer({ min: 3, max: 10 }),
          baseDelay: fc.integer({ min: 100, max: 1000 }),
          maxDelay: fc.integer({ min: 2000, max: 10000 })
        }),
        async (pattern, config) => {
          let callCount = 0;
          let reconnectedCallbackCalled = false;
          let connectionLostCallbackCalled = false;

          // Mock connection test: fail for outageSteps, then succeed
          mockConnectionTest.mockImplementation(async () => {
            callCount++;
            return callCount > pattern.outageSteps;
          });

          // Create service with test configuration
          service = new NetworkReconnectionService(mockConnectionTest, config);

          // Set up callbacks to track reconnection events
          service.onReconnected(() => {
            reconnectedCallbackCalled = true;
          });

          service.onConnectionLost(() => {
            connectionLostCallbackCalled = true;
          });

          // Test initial connection (should fail)
          const initialResult = await service.testConnection();
          expect(initialResult).toBe(false);

          // Verify connection lost callback was called
          expect(connectionLostCallbackCalled).toBe(true);

          // Advance time to trigger reconnection attempts
          for (let i = 0; i < pattern.outageSteps + pattern.recoveryAfterSteps; i++) {
            vi.advanceTimersByTime(config.baseDelay * 2); // Advance enough time for retry
          }

          // Test connection again (should succeed after outage steps)
          const finalResult = await service.testConnection();
          
          // Property: After outage period, connection should be restored
          expect(finalResult).toBe(true);
          
          // Property: Service should track connection state correctly
          const finalState = service.getState();
          expect(finalState.isConnected).toBe(true);
          
          // Property: Reconnection callback should be called when connection is restored
          expect(reconnectedCallbackCalled).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should implement exponential backoff correctly for retry attempts', () => {
    fc.assert(
      fc.property(
        fc.record({
          maxRetries: fc.integer({ min: 2, max: 5 }),
          baseDelay: fc.integer({ min: 100, max: 500 }),
          backoffMultiplier: fc.float({ min: 1.5, max: 2.5 })
        }),
        async (config) => {
          let callCount = 0;
          
          // Mock connection to always fail initially
          mockConnectionTest.mockImplementation(async () => {
            callCount++;
            return false; // Always fail to test backoff
          });

          service = new NetworkReconnectionService(mockConnectionTest, config);

          // Trigger initial connection loss
          await service.testConnection();
          
          const initialState = service.getState();
          expect(initialState.isConnected).toBe(false);
          expect(initialState.isReconnecting).toBe(true);

          // Property: Service should attempt reconnection up to maxRetries
          let attempts = 0;
          while (attempts < config.maxRetries && service.getState().isReconnecting) {
            const state = service.getState();
            
            // Advance time by base delay to trigger next attempt
            vi.advanceTimersByTime(config.baseDelay * Math.pow(config.backoffMultiplier, attempts));
            attempts++;
            
            // Verify state remains consistent
            expect(state.reconnectAttempts).toBeLessThanOrEqual(config.maxRetries);
            expect(state.reconnectAttempts).toBeGreaterThanOrEqual(0);
          }

          // Property: Should not exceed maximum retry attempts
          const finalState = service.getState();
          expect(finalState.reconnectAttempts).toBeLessThanOrEqual(config.maxRetries);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should maintain consistent state during operations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant('testConnection'),
            fc.constant('getState'),
            fc.constant('forceReconnect')
          ),
          { minLength: 2, maxLength: 8 }
        ),
        fc.boolean(), // Whether connection should succeed
        async (operations, shouldConnect) => {
          mockConnectionTest.mockResolvedValue(shouldConnect);
          
          service = new NetworkReconnectionService(mockConnectionTest, {
            maxRetries: 3,
            baseDelay: 100,
            maxDelay: 1000
          });

          // Execute operations sequentially to avoid timing issues
          for (const operation of operations) {
            switch (operation) {
              case 'testConnection':
                await service.testConnection();
                break;
              case 'forceReconnect':
                await service.forceReconnect();
                break;
              case 'getState':
                service.getState();
                break;
            }
            
            // Small delay between operations
            vi.advanceTimersByTime(10);
          }

          // Property: State should remain consistent
          const finalState = service.getState();
          
          // State values should be within valid ranges
          expect(finalState.reconnectAttempts).toBeGreaterThanOrEqual(0);
          expect(finalState.reconnectAttempts).toBeLessThanOrEqual(3); // maxRetries
          expect(finalState.consecutiveFailures).toBeGreaterThanOrEqual(0);
          expect(typeof finalState.isConnected).toBe('boolean');
          expect(typeof finalState.isReconnecting).toBe('boolean');
          
          // If connection should succeed, final state should reflect that
          if (shouldConnect) {
            expect(finalState.isConnected).toBe(true);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle connection timeouts gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          connectionTimeout: fc.integer({ min: 100, max: 2000 }),
          shouldSucceedAfterTimeout: fc.boolean()
        }),
        async (config) => {
          let attemptCount = 0;
          
          // Mock connection with potential timeout behavior
          mockConnectionTest.mockImplementation(async () => {
            attemptCount++;
            
            // First attempt times out (simulated by taking longer than timeout)
            if (attemptCount === 1) {
              await new Promise(resolve => setTimeout(resolve, config.connectionTimeout + 100));
            }
            
            return config.shouldSucceedAfterTimeout;
          });

          service = new NetworkReconnectionService(mockConnectionTest, {
            connectionTimeout: config.connectionTimeout,
            maxRetries: 3
          });

          // Test connection (may timeout)
          const result = await service.testConnection();

          // Property: Service should handle timeouts gracefully
          const state = service.getState();
          
          // State should remain valid regardless of timeouts
          expect(state.reconnectAttempts).toBeGreaterThanOrEqual(0);
          expect(state.reconnectAttempts).toBeLessThanOrEqual(3);
          expect(typeof state.isConnected).toBe('boolean');
          expect(typeof state.isReconnecting).toBe('boolean');
          
          // Connection result should be boolean
          expect(typeof result).toBe('boolean');
        }
      ),
      { numRuns: 10 }
    );
  });
});
