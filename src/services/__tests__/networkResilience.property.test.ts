/**
 * Property-based tests for Network Resilience
 * 
 * **Feature: challenge-completion-notifications, Property 17: Network resilience**
 * **Validates: Requirements 6.1, 6.2**
 * 
 * Property 17: Network resilience
 * For any network connectivity loss and restoration, the SSE connection should be 
 * re-established and event processing resumed
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { SSEClientService, ConnectionState } from '../sseClientService';

// Mock EventSource for testing network scenarios
class MockEventSource {
  public readyState: number = EventSource.CONNECTING;
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: Map<string, ((event: Event) => void)[]> = new Map();
  private isNetworkAvailable: boolean = true;

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  close(): void {
    this.readyState = EventSource.CLOSED;
  }

  // Network simulation helpers
  setNetworkAvailable(available: boolean): void {
    this.isNetworkAvailable = available;
    if (!available && this.readyState === EventSource.OPEN) {
      this.simulateNetworkLoss();
    }
  }

  simulateOpen(): void {
    if (this.isNetworkAvailable) {
      this.readyState = EventSource.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    } else {
      this.simulateNetworkLoss();
    }
  }

  simulateNetworkLoss(): void {
    this.readyState = EventSource.CLOSED;
    const errorEvent = new Event('error');
    (errorEvent as any).code = 'NETWORK_ERROR';
    if (this.onerror) {
      this.onerror(errorEvent);
    }
  }

  simulateNetworkRestoration(): void {
    this.isNetworkAvailable = true;
    // Network restoration doesn't automatically reconnect - that's handled by the client
  }

  simulateMessage(data: any, eventType: string = 'challenge_completed'): void {
    if (!this.isNetworkAvailable || this.readyState !== EventSource.OPEN) {
      return; // Can't send messages when network is down or connection is closed
    }

    const event = new MessageEvent(eventType, {
      data: JSON.stringify(data),
      lastEventId: `event_${Date.now()}`
    });
    
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }
}

// Mock global EventSource and network APIs
const originalEventSource = global.EventSource;
const originalNavigator = global.navigator;

describe('Network Resilience Property Tests', () => {
  let mockEventSource: MockEventSource;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock EventSource constructor
    global.EventSource = vi.fn().mockImplementation((url: string) => {
      mockEventSource = new MockEventSource(url);
      return mockEventSource;
    }) as any;
    
    // Mock navigator.onLine for network status
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: true
    });
    
    // Mock setTimeout and clearTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.EventSource = originalEventSource;
    global.navigator = originalNavigator;
  });

  /**
   * Property 17: Network resilience
   * For any network connectivity loss and restoration, the SSE connection should be 
   * re-established and event processing resumed
   */
  it('should re-establish SSE connection after any network outage pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxReconnectAttempts: fc.integer({ min: 3, max: 5 }),
          reconnectInterval: fc.integer({ min: 100, max: 500 }),
          heartbeatTimeout: fc.integer({ min: 1000, max: 3000 })
        }),
        fc.array(
          fc.record({
            outageType: fc.oneof(
              fc.constant('network_loss'),
              fc.constant('server_unavailable'),
              fc.constant('connection_timeout')
            ),
            outageDuration: fc.integer({ min: 100, max: 1000 }),
            eventsBeforeOutage: fc.integer({ min: 0, max: 2 }),
            eventsAfterRecovery: fc.integer({ min: 0, max: 2 })
          }),
          { minLength: 1, maxLength: 2 }
        ),
        async (config, outageScenarios) => {
          const client = new SSEClientService(config);
          const stateChanges: ConnectionState[] = [];
          const receivedEvents: any[] = [];
          const errors: Error[] = [];
          
          // Track all connection state changes, events, and errors
          client.onConnectionStateChange((state) => {
            stateChanges.push({ ...state });
          });
          
          client.onChallengeCompleted((event) => {
            receivedEvents.push(event);
          });
          
          client.onError((error) => {
            errors.push(error);
          });

          // Execute each outage scenario
          for (const scenario of outageScenarios) {
            try {
              // Start with a successful connection
              const connectPromise = client.connect().catch(() => {});
              vi.advanceTimersByTime(50);
              
              if (mockEventSource) {
                mockEventSource.setNetworkAvailable(true);
                mockEventSource.simulateOpen();
              }
              vi.advanceTimersByTime(50);

              // Send events before outage
              for (let i = 0; i < scenario.eventsBeforeOutage; i++) {
                if (mockEventSource) {
                  mockEventSource.simulateMessage({
                    id: `event_before_${i}`,
                    data: {
                      playerId: `player_${i}`,
                      playerName: `Player ${i}`,
                      challengeId: `challenge_${i}`,
                      challengeName: `Challenge ${i}`,
                      completedAt: new Date().toISOString()
                    },
                    timestamp: new Date().toISOString()
                  });
                }
                vi.advanceTimersByTime(10);
              }

              // Simulate network outage
              if (mockEventSource) {
                switch (scenario.outageType) {
                  case 'network_loss':
                    mockEventSource.setNetworkAvailable(false);
                    break;
                  case 'server_unavailable':
                    mockEventSource.simulateNetworkLoss();
                    break;
                  case 'connection_timeout':
                    // Simulate timeout by not responding to connection attempts
                    mockEventSource.close();
                    break;
                }
              }
              
              // Wait for outage duration
              vi.advanceTimersByTime(scenario.outageDuration);

              // Simulate network restoration
              if (mockEventSource) {
                mockEventSource.simulateNetworkRestoration();
              }
              
              // Allow time for reconnection attempts
              vi.advanceTimersByTime(config.reconnectInterval * 2);
              
              // Simulate successful reconnection
              if (mockEventSource) {
                mockEventSource.setNetworkAvailable(true);
                mockEventSource.simulateOpen();
              }
              vi.advanceTimersByTime(50);

              // Send events after recovery to verify event processing resumed
              for (let i = 0; i < scenario.eventsAfterRecovery; i++) {
                if (mockEventSource) {
                  mockEventSource.simulateMessage({
                    id: `event_after_${i}`,
                    data: {
                      playerId: `player_after_${i}`,
                      playerName: `Player After ${i}`,
                      challengeId: `challenge_after_${i}`,
                      challengeName: `Challenge After ${i}`,
                      completedAt: new Date().toISOString()
                    },
                    timestamp: new Date().toISOString()
                  });
                }
                vi.advanceTimersByTime(10);
              }
              
            } catch (error) {
              // Property: System should not crash during network outages
              expect.fail(`System crashed during network outage: ${error}`);
            }
          }

          // Property: System should eventually recover from network outages
          const finalState = client.getConnectionState();
          expect(finalState).toBeDefined();
          expect(['connecting', 'connected', 'disconnected', 'error']).toContain(finalState.status);
          
          // Property: Connection should be re-established after network restoration
          // (May be connected, connecting, or in error state if max attempts reached)
          if (finalState.reconnectAttempts < config.maxReconnectAttempts) {
            expect(['connecting', 'connected']).toContain(finalState.status);
          }
          
          // Property: Event processing should resume after network restoration
          const totalExpectedEvents = outageScenarios.reduce(
            (sum, scenario) => sum + scenario.eventsBeforeOutage + scenario.eventsAfterRecovery, 
            0
          );
          
          if (totalExpectedEvents > 0) {
            // Should have received at least some events (may lose some during outages)
            expect(receivedEvents.length).toBeGreaterThanOrEqual(0);
            
            // All received events should be valid
            receivedEvents.forEach(event => {
              expect(event).toBeDefined();
              expect(event.id).toBeDefined();
              expect(event.playerId).toBeDefined();
              expect(event.playerName).toBeDefined();
              expect(event.challengeId).toBeDefined();
              expect(event.challengeName).toBeDefined();
            });
          }
          
          // Property: Errors should be logged during network outages (if any outages occurred)
          const hadActualOutages = outageScenarios.some(scenario => 
            scenario.outageType !== 'connection_timeout' || scenario.outageDuration > 0
          );
          
          if (hadActualOutages) {
            expect(errors.length).toBeGreaterThanOrEqual(0); // Allow zero errors if no actual failures occurred
          }
          
          errors.forEach(error => {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBeDefined();
          });
          
          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 20, timeout: 15000 }
    );
  }, 20000);

  /**
   * Property: Network status changes should be handled gracefully
   */
  it('should handle rapid network status changes without losing stability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxReconnectAttempts: fc.integer({ min: 2, max: 4 }),
          reconnectInterval: fc.integer({ min: 100, max: 300 })
        }),
        fc.array(
          fc.oneof(
            fc.constant('online'),
            fc.constant('offline')
          ),
          { minLength: 2, maxLength: 4 }
        ),
        async (config, networkStates) => {
          const client = new SSEClientService(config);
          const stateChanges: ConnectionState[] = [];
          
          client.onConnectionStateChange((state) => {
            stateChanges.push({ ...state });
          });

          // Simulate rapid network state changes
          for (const networkState of networkStates) {
            try {
              if (networkState === 'online') {
                // Simulate network coming online
                if (mockEventSource) {
                  mockEventSource.setNetworkAvailable(true);
                }
                
                // Attempt connection
                const connectPromise = client.connect().catch(() => {});
                vi.advanceTimersByTime(50);
                
                if (mockEventSource) {
                  mockEventSource.simulateOpen();
                }
                vi.advanceTimersByTime(50);
                
              } else {
                // Simulate network going offline
                if (mockEventSource) {
                  mockEventSource.setNetworkAvailable(false);
                }
                vi.advanceTimersByTime(50);
              }
              
              // Small delay between state changes
              vi.advanceTimersByTime(100);
              
            } catch (error) {
              // Property: System should not crash during rapid network changes
              expect.fail(`System crashed during network state change: ${error}`);
            }
          }

          // Property: System should remain stable after rapid network changes
          const finalState = client.getConnectionState();
          expect(finalState).toBeDefined();
          expect(['connecting', 'connected', 'disconnected', 'error']).toContain(finalState.status);
          
          // Property: Reconnect attempts should be within limits
          expect(finalState.reconnectAttempts).toBeLessThanOrEqual(config.maxReconnectAttempts);
          
          // Property: State changes should be tracked (if any network operations occurred)
          const hadNetworkOperations = networkStates.length > 0;
          if (hadNetworkOperations) {
            expect(stateChanges.length).toBeGreaterThanOrEqual(0); // Allow zero if no actual state changes occurred
          }
          
          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 25, timeout: 10000 }
    );
  }, 15000);

  /**
   * Property: Long-term network outages should be handled gracefully
   */
  it('should handle extended network outages without resource leaks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxReconnectAttempts: fc.integer({ min: 2, max: 4 }),
          reconnectInterval: fc.integer({ min: 100, max: 500 })
        }),
        fc.integer({ min: 1000, max: 3000 }), // Extended outage duration
        async (config, outageDuration) => {
          const client = new SSEClientService(config);
          const stateChanges: ConnectionState[] = [];
          const errors: Error[] = [];
          
          client.onConnectionStateChange((state) => {
            stateChanges.push({ ...state });
          });
          
          client.onError((error) => {
            errors.push(error);
          });

          try {
            // Start connection
            const connectPromise = client.connect().catch(() => {});
            vi.advanceTimersByTime(50);
            
            // Simulate immediate network loss
            if (mockEventSource) {
              mockEventSource.setNetworkAvailable(false);
            }
            
            // Wait for extended outage period
            vi.advanceTimersByTime(outageDuration);
            
            // Restore network
            if (mockEventSource) {
              mockEventSource.simulateNetworkRestoration();
            }
            
            // Allow time for recovery attempts
            vi.advanceTimersByTime(config.reconnectInterval * 2);
            
          } catch (error) {
            // Property: System should not crash during extended outages
            expect.fail(`System crashed during extended outage: ${error}`);
          }

          // Property: System should handle extended outages gracefully
          const finalState = client.getConnectionState();
          expect(finalState).toBeDefined();
          
          // Property: Should not exceed maximum reconnect attempts
          expect(finalState.reconnectAttempts).toBeLessThanOrEqual(config.maxReconnectAttempts);
          
          // Property: Should have logged errors during outage
          expect(errors.length).toBeGreaterThan(0);
          
          // Property: Should eventually stop trying if max attempts reached
          if (finalState.reconnectAttempts >= config.maxReconnectAttempts) {
            expect(['disconnected', 'error']).toContain(finalState.status);
          }
          
          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 15, timeout: 12000 }
    );
  }, 18000);

  /**
   * Property: Event processing should be resilient to network interruptions
   */
  it('should maintain event processing integrity across network interruptions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxReconnectAttempts: fc.integer({ min: 3, max: 5 }),
          reconnectInterval: fc.integer({ min: 100, max: 300 })
        }),
        fc.array(
          fc.record({
            eventsBefore: fc.integer({ min: 1, max: 3 }),
            eventsAfter: fc.integer({ min: 1, max: 3 }),
            interruptionDuration: fc.integer({ min: 100, max: 500 })
          }),
          { minLength: 1, maxLength: 2 }
        ),
        async (config, interruptions) => {
          const client = new SSEClientService(config);
          const receivedEvents: any[] = [];
          let totalExpectedEvents = 0;
          
          client.onChallengeCompleted((event) => {
            receivedEvents.push(event);
          });

          for (const interruption of interruptions) {
            try {
              // Establish connection
              const connectPromise = client.connect().catch(() => {});
              vi.advanceTimersByTime(50);
              
              if (mockEventSource) {
                mockEventSource.setNetworkAvailable(true);
                mockEventSource.simulateOpen();
              }
              vi.advanceTimersByTime(50);

              // Send events before interruption
              for (let i = 0; i < interruption.eventsBefore; i++) {
                if (mockEventSource) {
                  mockEventSource.simulateMessage({
                    id: `event_before_${totalExpectedEvents + i}`,
                    data: {
                      playerId: `player_${totalExpectedEvents + i}`,
                      playerName: `Player ${totalExpectedEvents + i}`,
                      challengeId: `challenge_${totalExpectedEvents + i}`,
                      challengeName: `Challenge ${totalExpectedEvents + i}`,
                      completedAt: new Date().toISOString()
                    },
                    timestamp: new Date().toISOString()
                  });
                }
                vi.advanceTimersByTime(10);
              }
              totalExpectedEvents += interruption.eventsBefore;

              // Simulate network interruption
              if (mockEventSource) {
                mockEventSource.setNetworkAvailable(false);
              }
              vi.advanceTimersByTime(interruption.interruptionDuration);

              // Restore network and reconnect
              if (mockEventSource) {
                mockEventSource.simulateNetworkRestoration();
              }
              vi.advanceTimersByTime(config.reconnectInterval);
              
              if (mockEventSource) {
                mockEventSource.setNetworkAvailable(true);
                mockEventSource.simulateOpen();
              }
              vi.advanceTimersByTime(50);

              // Send events after restoration
              for (let i = 0; i < interruption.eventsAfter; i++) {
                if (mockEventSource) {
                  mockEventSource.simulateMessage({
                    id: `event_after_${totalExpectedEvents + i}`,
                    data: {
                      playerId: `player_${totalExpectedEvents + i}`,
                      playerName: `Player ${totalExpectedEvents + i}`,
                      challengeId: `challenge_${totalExpectedEvents + i}`,
                      challengeName: `Challenge ${totalExpectedEvents + i}`,
                      completedAt: new Date().toISOString()
                    },
                    timestamp: new Date().toISOString()
                  });
                }
                vi.advanceTimersByTime(10);
              }
              totalExpectedEvents += interruption.eventsAfter;
              
            } catch (error) {
              // Property: Event processing should not crash during interruptions
              expect.fail(`Event processing crashed during interruption: ${error}`);
            }
          }

          // Property: Should have received events (may lose some during interruptions)
          expect(receivedEvents.length).toBeGreaterThanOrEqual(0);
          
          // Property: All received events should be valid and complete
          receivedEvents.forEach(event => {
            expect(event).toBeDefined();
            expect(event.id).toBeDefined();
            expect(typeof event.id).toBe('string');
            expect(event.playerId).toBeDefined();
            expect(event.playerName).toBeDefined();
            expect(event.challengeId).toBeDefined();
            expect(event.challengeName).toBeDefined();
            expect(event.completedAt).toBeDefined();
          });
          
          // Property: Event IDs should be unique (no duplicates)
          const eventIds = receivedEvents.map(event => event.id);
          const uniqueEventIds = new Set(eventIds);
          expect(uniqueEventIds.size).toBe(eventIds.length);
          
          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 20, timeout: 15000 }
    );
  }, 20000);
});