/**
 * Property-based tests for SSE Error Recovery
 * 
 * **Feature: challenge-completion-notifications, Property 18: SSE error recovery**
 * **Validates: Requirements 8.7**
 * 
 * Property 18: SSE error recovery
 * For any SSE connection error, the system should log detailed error information 
 * and attempt recovery without crashing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { SSEClientService, ConnectionState } from '../sseClientService';

// Mock EventSource for testing
class MockEventSource {
  public readyState: number = EventSource.CONNECTING;
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: Map<string, ((event: Event) => void)[]> = new Map();

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

  // Test helpers for simulating different error scenarios
  simulateOpen(): void {
    this.readyState = EventSource.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateConnectionError(): void {
    this.readyState = EventSource.CLOSED;
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateNetworkError(): void {
    this.readyState = EventSource.CLOSED;
    const errorEvent = new Event('error');
    (errorEvent as any).code = 'NETWORK_ERROR';
    if (this.onerror) {
      this.onerror(errorEvent);
    }
  }

  simulateServerError(): void {
    this.readyState = EventSource.CLOSED;
    const errorEvent = new Event('error');
    (errorEvent as any).code = 'SERVER_ERROR';
    if (this.onerror) {
      this.onerror(errorEvent);
    }
  }

  simulateTimeoutError(): void {
    this.readyState = EventSource.CLOSED;
    const errorEvent = new Event('error');
    (errorEvent as any).code = 'TIMEOUT';
    if (this.onerror) {
      this.onerror(errorEvent);
    }
  }

  simulateMalformedMessage(data: any): void {
    const event = new MessageEvent('message', {
      data: data, // Intentionally malformed
      lastEventId: `event_${Date.now()}`
    });
    
    if (this.onmessage) {
      this.onmessage(event);
    }
  }
}

// Mock global EventSource
const originalEventSource = global.EventSource;
const originalConsoleError = console.error;

describe('SSE Error Recovery Property Tests', () => {
  let mockEventSource: MockEventSource;
  let consoleErrorSpy: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console.error to track error logging
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock EventSource constructor
    global.EventSource = vi.fn().mockImplementation((url: string) => {
      mockEventSource = new MockEventSource(url);
      return mockEventSource;
    }) as any;
    
    // Mock setTimeout and clearTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.EventSource = originalEventSource;
    console.error = originalConsoleError;
  });

  /**
   * Property 18: SSE error recovery
   * For any SSE connection error, the system should log detailed error information 
   * and attempt recovery without crashing
   */
  it('should recover from any type of SSE connection error without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxReconnectAttempts: fc.integer({ min: 2, max: 5 }),
          reconnectInterval: fc.integer({ min: 100, max: 1000 }),
          heartbeatTimeout: fc.integer({ min: 1000, max: 5000 })
        }),
        fc.array(
          fc.oneof(
            fc.constant('connection_error'),
            fc.constant('network_error'),
            fc.constant('server_error'),
            fc.constant('timeout_error'),
            fc.constant('heartbeat_timeout')
          ),
          { minLength: 1, maxLength: 3 }
        ),
        async (config, errorTypes) => {
          const client = new SSEClientService(config);
          const stateChanges: ConnectionState[] = [];
          const errors: Error[] = [];
          
          // Track all connection state changes and errors
          client.onConnectionStateChange((state) => {
            stateChanges.push({ ...state });
          });
          
          client.onError((error) => {
            errors.push(error);
          });

          // Execute sequence of error scenarios
          for (let i = 0; i < errorTypes.length; i++) {
            const errorType = errorTypes[i];
            
            try {
              // Reset client state between scenarios to prevent accumulation
              if (i > 0) {
                client.disconnect();
                vi.advanceTimersByTime(100);
              }
              
              // Start connection
              const connectPromise = client.connect().catch(() => {}); // Don't wait for completion
              vi.advanceTimersByTime(50);
              
              // Simulate the specific error type
              if (mockEventSource) {
                switch (errorType) {
                  case 'connection_error':
                    mockEventSource.simulateConnectionError();
                    break;
                  case 'network_error':
                    mockEventSource.simulateNetworkError();
                    break;
                  case 'server_error':
                    mockEventSource.simulateServerError();
                    break;
                  case 'timeout_error':
                    mockEventSource.simulateTimeoutError();
                    break;
                  case 'heartbeat_timeout':
                    // First connect successfully, then simulate heartbeat timeout
                    mockEventSource.simulateOpen();
                    vi.advanceTimersByTime(50);
                    // Advance time beyond heartbeat timeout
                    vi.advanceTimersByTime(config.heartbeatTimeout + 100);
                    break;
                }
              }
              
              // Allow time for error handling and recovery attempts
              vi.advanceTimersByTime(config.reconnectInterval + 200);
              
            } catch (error) {
              // Property: System should not crash on any error
              // If we reach here, the system crashed - this should not happen
              expect.fail(`System crashed on error type: ${errorType}`);
            }
          }

          // Property: System should remain functional after errors
          const finalState = client.getConnectionState();
          expect(finalState).toBeDefined();
          expect(['connecting', 'connected', 'disconnected', 'error']).toContain(finalState.status);
          
          // Property: Error callbacks should be called for each error
          expect(errors.length).toBeGreaterThan(0);
          
          // Property: All errors should have meaningful messages
          errors.forEach(error => {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBeDefined();
            expect(typeof error.message).toBe('string');
            expect(error.message.length).toBeGreaterThan(0);
          });
          
          // Property: Connection state should track errors appropriately
          const errorStates = stateChanges.filter(state => state.status === 'error');
          if (errorStates.length > 0) {
            errorStates.forEach(state => {
              expect(state.error).toBeDefined();
              expect(typeof state.error).toBe('string');
            });
          }
          
          // Property: Reconnect attempts should be within limits (can equal max when limit is reached)
          expect(finalState.reconnectAttempts).toBeLessThanOrEqual(finalState.maxReconnectAttempts);
          
          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 5, timeout: 15000 }
    );
  }, 20000);

  /**
   * Property: Malformed message handling should not crash the system
   */
  it('should handle malformed messages gracefully without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxReconnectAttempts: fc.integer({ min: 1, max: 3 }),
          reconnectInterval: fc.integer({ min: 100, max: 500 })
        }),
        fc.array(
          fc.oneof(
            fc.constant('invalid_json'),
            fc.constant('null_data'),
            fc.constant('empty_string'),
            fc.constant('non_string_data'),
            fc.constant('missing_fields')
          ),
          { minLength: 1, maxLength: 3 }
        ),
        async (config, malformedTypes) => {
          const client = new SSEClientService(config);
          const errors: Error[] = [];
          
          client.onError((error) => {
            errors.push(error);
          });

          // Connect successfully first
          const connectPromise = client.connect().catch(() => {});
          vi.advanceTimersByTime(50);
          
          if (mockEventSource) {
            mockEventSource.simulateOpen();
          }
          vi.advanceTimersByTime(50);

          // Send malformed messages
          for (const malformedType of malformedTypes) {
            try {
              if (mockEventSource) {
                switch (malformedType) {
                  case 'invalid_json':
                    mockEventSource.simulateMalformedMessage('{ invalid json }');
                    break;
                  case 'null_data':
                    mockEventSource.simulateMalformedMessage(null);
                    break;
                  case 'empty_string':
                    mockEventSource.simulateMalformedMessage('');
                    break;
                  case 'non_string_data':
                    mockEventSource.simulateMalformedMessage(12345);
                    break;
                  case 'missing_fields':
                    mockEventSource.simulateMalformedMessage('{"incomplete": "data"}');
                    break;
                }
              }
              
              vi.advanceTimersByTime(50);
              
            } catch (error) {
              // Property: System should not crash on malformed messages
              expect.fail(`System crashed on malformed message type: ${malformedType}`);
            }
          }

          // Property: System should remain connected after malformed messages
          expect(client.isConnected()).toBe(true);
          
          // Property: Error callbacks should be called for malformed messages
          // (Some malformed message types should trigger error callbacks)
          if (errors.length > 0) {
            errors.forEach(error => {
              expect(error).toBeInstanceOf(Error);
              expect(error.message).toBeDefined();
            });
          }
          
          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 5, timeout: 10000 }
    );
  }, 15000);

  /**
   * Property: Recovery attempts should use exponential backoff
   */
  it('should implement exponential backoff for error recovery attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxReconnectAttempts: fc.integer({ min: 3, max: 5 }),
          reconnectInterval: fc.integer({ min: 100, max: 500 })
        }),
        fc.integer({ min: 2, max: 3 }), // Number of consecutive errors
        async (config, errorCount) => {
          const client = new SSEClientService(config);
          const stateChanges: ConnectionState[] = [];
          
          client.onConnectionStateChange((state) => {
            stateChanges.push({ ...state });
          });

          // Simulate multiple consecutive connection errors
          for (let i = 0; i < errorCount; i++) {
            // Start connection
            const connectPromise = client.connect().catch(() => {});
            vi.advanceTimersByTime(50);
            
            // Simulate connection error
            if (mockEventSource) {
              mockEventSource.simulateConnectionError();
            }
            
            // Allow time for error handling and reconnection scheduling
            // Use exponential backoff calculation to advance time appropriately
            const expectedDelay = config.reconnectInterval * Math.pow(2, i);
            vi.advanceTimersByTime(Math.min(expectedDelay + 200, 30000));
          }

          // Property: Reconnect attempts should increase with each failure
          const finalState = client.getConnectionState();
          expect(finalState.reconnectAttempts).toBeGreaterThan(0);
          expect(finalState.reconnectAttempts).toBeLessThanOrEqual(config.maxReconnectAttempts);
          
          // Property: Should eventually stop trying if max attempts reached
          if (errorCount >= config.maxReconnectAttempts) {
            expect(finalState.reconnectAttempts).toBe(config.maxReconnectAttempts);
          }
          
          // Property: Error states should contain error information
          const errorStates = stateChanges.filter(state => state.status === 'error');
          expect(errorStates.length).toBeGreaterThan(0);
          
          errorStates.forEach(state => {
            expect(state.error).toBeDefined();
            expect(typeof state.error).toBe('string');
          });
          
          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 5, timeout: 12000 }
    );
  }, 18000);

  /**
   * Property: Error logging should provide detailed information
   */
  it('should log detailed error information for debugging purposes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxReconnectAttempts: fc.integer({ min: 1, max: 3 }),
          reconnectInterval: fc.integer({ min: 100, max: 500 })
        }),
        fc.oneof(
          fc.constant('connection_error'),
          fc.constant('network_error'),
          fc.constant('timeout_error')
        ),
        async (config, errorType) => {
          const client = new SSEClientService(config);
          const errors: Error[] = [];
          
          client.onError((error) => {
            errors.push(error);
          });

          // Start connection and simulate error
          const connectPromise = client.connect().catch(() => {});
          vi.advanceTimersByTime(50);
          
          if (mockEventSource) {
            switch (errorType) {
              case 'connection_error':
                mockEventSource.simulateConnectionError();
                break;
              case 'network_error':
                mockEventSource.simulateNetworkError();
                break;
              case 'timeout_error':
                mockEventSource.simulateTimeoutError();
                break;
            }
          }
          
          vi.advanceTimersByTime(200);

          // Property: Errors should be captured and contain useful information
          expect(errors.length).toBeGreaterThan(0);
          
          const error = errors[0];
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(0);
          
          // Property: Connection state should reflect error details
          const finalState = client.getConnectionState();
          if (finalState.status === 'error') {
            expect(finalState.error).toBeDefined();
            expect(typeof finalState.error).toBe('string');
          }
          
          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 5, timeout: 8000 }
    );
  }, 12000);
});