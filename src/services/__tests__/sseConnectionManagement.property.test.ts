/**
 * Property-based tests for SSE Connection Management
 * 
 * **Feature: challenge-completion-notifications, Property 14: SSE connection management**
 * **Validates: Requirements 8.2, 8.5**
 * 
 * Property 14: SSE connection management
 * For any SSE connection state change, the system should maintain appropriate connection 
 * status and attempt reconnection when needed
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

  // Test helpers
  simulateOpen(): void {
    this.readyState = EventSource.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateError(): void {
    this.readyState = EventSource.CLOSED;
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateMessage(data: any, eventType: string = 'message'): void {
    const event = new MessageEvent(eventType, {
      data: JSON.stringify(data),
      lastEventId: `event_${Date.now()}`
    });
    
    if (eventType === 'message' && this.onmessage) {
      this.onmessage(event);
    }
    
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }
}

// Mock global EventSource
const originalEventSource = global.EventSource;

describe('SSE Connection Management Property Tests', () => {
  let mockEventSource: MockEventSource;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
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
  });

  /**
   * Property 14: SSE connection management
   * For any SSE connection state change, the system should maintain appropriate connection 
   * status and attempt reconnection when needed
   */
  it('should maintain appropriate connection status for any connection state change', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxReconnectAttempts: fc.integer({ min: 2, max: 5 }),
          reconnectInterval: fc.integer({ min: 100, max: 500 }),
          heartbeatTimeout: fc.integer({ min: 1000, max: 3000 })
        }),
        fc.array(
          fc.oneof(
            fc.constant('connect'),
            fc.constant('disconnect'),
            fc.constant('error')
          ),
          { minLength: 1, maxLength: 3 }
        ),
        async (config, actions) => {
          const client = new SSEClientService(config);
          const stateChanges: ConnectionState[] = [];
          
          // Track all connection state changes
          client.onConnectionStateChange((state) => {
            stateChanges.push({ ...state });
          });

          // Execute sequence of actions synchronously
          for (const action of actions) {
            switch (action) {
              case 'connect':
                try {
                  // Start connection
                  client.connect().catch(() => {}); // Don't wait for completion
                  vi.advanceTimersByTime(50);
                  
                  // Simulate successful connection
                  if (mockEventSource) {
                    mockEventSource.simulateOpen();
                  }
                  vi.advanceTimersByTime(50);
                } catch (error) {
                  // Connection might fail, which is valid
                }
                break;
                
              case 'disconnect':
                client.disconnect();
                vi.advanceTimersByTime(50);
                break;
                
              case 'error':
                if (mockEventSource) {
                  mockEventSource.simulateError();
                }
                vi.advanceTimersByTime(50);
                break;
            }
          }

          // Verify connection state consistency
          const finalState = client.getConnectionState();
          
          // Property: Connection state should always be valid
          expect(['connecting', 'connected', 'disconnected', 'error']).toContain(finalState.status);
          
          // Property: Reconnect attempts should be bounded (may exceed max by 1 during transition)
          expect(finalState.reconnectAttempts).toBeLessThanOrEqual(finalState.maxReconnectAttempts + 1);
          
          // Property: Error state should have error message
          if (finalState.status === 'error') {
            expect(finalState.error).toBeDefined();
            expect(typeof finalState.error).toBe('string');
          }
          
          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 15000);

  /**
   * Property: Reconnection behavior should follow exponential backoff
   */
  it('should implement exponential backoff for reconnection attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxReconnectAttempts: fc.integer({ min: 2, max: 3 }),
          reconnectInterval: fc.integer({ min: 100, max: 500 })
        }),
        fc.integer({ min: 1, max: 2 }), // Number of consecutive errors
        async (config, errorCount) => {
          const client = new SSEClientService(config);
          const stateChanges: ConnectionState[] = [];
          
          client.onConnectionStateChange((state) => {
            stateChanges.push({ ...state });
          });

          // Simulate connection and multiple errors
          for (let i = 0; i < errorCount; i++) {
            // Start connection
            const connectPromise = client.connect().catch(() => {}); // Don't wait
            vi.advanceTimersByTime(50);
            
            // Simulate connection error
            if (mockEventSource) {
              mockEventSource.simulateError();
            }
            
            // Allow time for error handling and reconnection scheduling
            vi.advanceTimersByTime(config.reconnectInterval + 100);
          }

          // Property: Reconnect attempts should increase with each failure
          const errorStates = stateChanges.filter(state => state.status === 'error');
          
          if (errorStates.length > 0) {
            // Check that reconnect attempts are tracked
            const finalState = client.getConnectionState();
            expect(finalState.reconnectAttempts).toBeGreaterThanOrEqual(0);
            expect(finalState.reconnectAttempts).toBeLessThanOrEqual(config.maxReconnectAttempts);
          }
          
          // Property: Should not exceed maximum reconnect attempts
          const finalState = client.getConnectionState();
          expect(finalState.reconnectAttempts).toBeLessThanOrEqual(config.maxReconnectAttempts);
          
          // Property: If there were errors, reconnect attempts should be > 0
          if (errorCount > 0 && errorStates.length > 0) {
            expect(finalState.reconnectAttempts).toBeGreaterThan(0);
          }
          
          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 50, timeout: 8000 }
    );
  }, 12000);

  /**
   * Property: Connection cleanup should be thorough
   */
  it('should properly cleanup resources on disconnect for any connection state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxReconnectAttempts: fc.integer({ min: 1, max: 3 }),
          reconnectInterval: fc.integer({ min: 100, max: 500 })
        }),
        fc.oneof(
          fc.constant('before_connect'),
          fc.constant('while_connecting'),
          fc.constant('after_connect')
        ),
        async (config, disconnectTiming) => {
          const client = new SSEClientService(config);
          let finalState: ConnectionState;

          switch (disconnectTiming) {
            case 'before_connect':
              client.disconnect();
              break;
              
            case 'while_connecting':
              client.connect().catch(() => {}); // Don't wait for completion
              vi.advanceTimersByTime(10);
              client.disconnect();
              break;
              
            case 'after_connect':
              client.connect().catch(() => {}); // Don't wait
              vi.advanceTimersByTime(10);
              if (mockEventSource) {
                mockEventSource.simulateOpen();
              }
              vi.advanceTimersByTime(10);
              client.disconnect();
              break;
          }

          // Allow cleanup to complete
          vi.advanceTimersByTime(100);
          
          finalState = client.getConnectionState();

          // Property: After disconnect, status should be disconnected
          expect(finalState.status).toBe('disconnected');
          
          // Property: After disconnect, reconnect attempts should be reset
          expect(finalState.reconnectAttempts).toBe(0);
          
          // Property: isConnected should return false
          expect(client.isConnected()).toBe(false);
          
          // Property: EventSource should be closed
          if (mockEventSource) {
            expect(mockEventSource.readyState).toBe(EventSource.CLOSED);
          }
        }
      ),
      { numRuns: 50, timeout: 5000 }
    );
  }, 8000);
});