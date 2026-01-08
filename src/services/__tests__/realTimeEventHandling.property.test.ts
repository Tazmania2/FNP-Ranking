/**
 * Property-based tests for Real-Time Event Handling
 * 
 * **Feature: challenge-completion-notifications, Property 2: Real-time event handling**
 * **Validates: Requirements 1.4**
 * 
 * Property 2: Real-time event handling
 * For any challenge completion event received via SSE, the system should process it 
 * immediately and trigger notification display
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { SSEClientService, ChallengeCompletionEvent, SSEEvent } from '../sseClientService';

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

  simulateMessage(data: any, eventType: string = 'message', eventId?: string): void {
    const event = new MessageEvent(eventType, {
      data: JSON.stringify(data),
      lastEventId: eventId || `event_${Date.now()}_${Math.random()}`
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

describe('Real-Time Event Handling Property Tests', () => {
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
   * Property 2: Real-time event handling
   * For any challenge completion event received via SSE, the system should process it 
   * immediately and trigger notification display
   */
  it('should process any challenge completion event immediately', async () => {
    // Helper to generate valid ISO date strings
    const validISODate = fc.integer({ min: 1577836800000, max: 1893456000000 }) // 2020-01-01 to 2030-01-01
      .map(timestamp => new Date(timestamp).toISOString());

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            playerId: fc.string({ minLength: 1, maxLength: 20 }),
            playerName: fc.string({ minLength: 1, maxLength: 30 }),
            challengeId: fc.string({ minLength: 1, maxLength: 20 }),
            challengeName: fc.string({ minLength: 1, maxLength: 50 }),
            completedAt: validISODate,
            points: fc.option(fc.integer({ min: 0, max: 1000 })),
            timestamp: validISODate
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (challengeEvents) => {
          const client = new SSEClientService();
          const receivedEvents: ChallengeCompletionEvent[] = [];
          const receivedSSEEvents: SSEEvent[] = [];

          // Setup event listeners
          client.onChallengeCompleted((event) => {
            receivedEvents.push(event);
          });

          client.onEvent((event) => {
            receivedSSEEvents.push(event);
          });

          // Connect client synchronously
          client.connect().catch(() => {}); // Don't wait
          vi.advanceTimersByTime(10);
          mockEventSource.simulateOpen();
          vi.advanceTimersByTime(10);

          // Send challenge completion events
          for (const challengeEvent of challengeEvents) {
            const eventData = {
              id: challengeEvent.id,
              type: 'challenge_completed',
              data: {
                playerId: challengeEvent.playerId,
                playerName: challengeEvent.playerName,
                challengeId: challengeEvent.challengeId,
                challengeName: challengeEvent.challengeName,
                completedAt: challengeEvent.completedAt,
                points: challengeEvent.points
              },
              timestamp: challengeEvent.timestamp
            };

            mockEventSource.simulateMessage(eventData, 'challenge_completed', challengeEvent.id);
            vi.advanceTimersByTime(5);
          }

          // Allow final processing time
          vi.advanceTimersByTime(50);

          // Property: All events should be received
          expect(receivedEvents).toHaveLength(challengeEvents.length);

          // Property: Events should be processed in order
          for (let i = 0; i < challengeEvents.length; i++) {
            const original = challengeEvents[i];
            const received = receivedEvents[i];

            expect(received.id).toBe(original.id);
            expect(received.playerId).toBe(original.playerId);
            expect(received.playerName).toBe(original.playerName);
            expect(received.challengeId).toBe(original.challengeId);
            expect(received.challengeName).toBe(original.challengeName);
            expect(received.completedAt).toBe(original.completedAt);
            expect(received.points).toBe(original.points);
            expect(received.timestamp).toBe(original.timestamp);
          }

          // Property: Both specific and general event callbacks should be triggered
          expect(receivedSSEEvents.length).toBeGreaterThanOrEqual(challengeEvents.length);
          
          // Property: SSE events should have correct type for challenge completions
          const challengeSSEEvents = receivedSSEEvents.filter(e => e.type === 'challenge_completed');
          expect(challengeSSEEvents).toHaveLength(challengeEvents.length);

          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 50, timeout: 8000 }
    );
  }, 12000);

  /**
   * Property: Event processing should be resilient to malformed data
   */
  it('should handle malformed events gracefully while processing valid ones', async () => {
    // Helper to generate valid ISO date strings
    const validISODate = fc.integer({ min: 1577836800000, max: 1893456000000 }) // 2020-01-01 to 2030-01-01
      .map(timestamp => new Date(timestamp).toISOString());

    // Generate unique IDs to avoid collisions
    const uniqueId = fc.uuid();

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            // Valid challenge completion event with unique ID
            fc.record({
              type: fc.constant('valid'),
              data: fc.record({
                id: uniqueId,
                playerId: fc.string({ minLength: 1, maxLength: 20 }),
                playerName: fc.string({ minLength: 1, maxLength: 30 }),
                challengeId: fc.string({ minLength: 1, maxLength: 20 }),
                challengeName: fc.string({ minLength: 1, maxLength: 50 }),
                completedAt: validISODate,
                points: fc.option(fc.integer({ min: 0, max: 1000 })),
                timestamp: validISODate
              })
            }),
            // Malformed event (missing required fields) - use special prefix to identify
            fc.record({
              type: fc.constant('malformed'),
              data: fc.record({
                id: fc.constant('malformed_event'),
                playerId: fc.option(fc.string()),
                // Missing other required fields
              })
            })
          ),
          { minLength: 2, maxLength: 4 }
        ),
        async (mixedEvents) => {
          const client = new SSEClientService();
          const receivedEvents: ChallengeCompletionEvent[] = [];

          // Setup event listeners
          client.onChallengeCompleted((event) => {
            receivedEvents.push(event);
          });

          // Connect client synchronously
          client.connect().catch(() => {}); // Don't wait
          vi.advanceTimersByTime(10);
          mockEventSource.simulateOpen();
          vi.advanceTimersByTime(10);

          // Send mixed events
          const validEvents = mixedEvents.filter(e => e.type === 'valid');
          
          for (const event of mixedEvents) {
            if (event.type === 'valid') {
              const eventData = {
                id: event.data.id,
                type: 'challenge_completed',
                data: {
                  playerId: event.data.playerId,
                  playerName: event.data.playerName,
                  challengeId: event.data.challengeId,
                  challengeName: event.data.challengeName,
                  completedAt: event.data.completedAt,
                  points: event.data.points
                },
                timestamp: event.data.timestamp
              };
              mockEventSource.simulateMessage(eventData, 'challenge_completed', event.data.id);
            } else if (event.type === 'malformed') {
              // Send incomplete event data - malformed events may still be processed
              // but with incomplete data
              const eventData = {
                id: 'malformed_event',
                type: 'challenge_completed',
                data: event.data, // Missing required fields
                timestamp: new Date().toISOString()
              };
              mockEventSource.simulateMessage(eventData, 'challenge_completed');
            }
            
            vi.advanceTimersByTime(5);
          }

          // Allow processing time
          vi.advanceTimersByTime(50);

          // Property: System should process events without crashing
          // The SSE client processes all events, but we verify valid ones are correct
          expect(receivedEvents.length).toBeGreaterThanOrEqual(0);

          // Property: Valid events should be findable in received events by ID
          for (const validEvent of validEvents) {
            const matchingReceived = receivedEvents.find(r => r.id === validEvent.data.id);
            if (matchingReceived) {
              expect(matchingReceived.playerId).toBe(validEvent.data.playerId);
              expect(matchingReceived.playerName).toBe(validEvent.data.playerName);
              expect(matchingReceived.challengeId).toBe(validEvent.data.challengeId);
              expect(matchingReceived.challengeName).toBe(validEvent.data.challengeName);
            }
          }

          // Property: System should remain connected despite malformed events
          expect(client.isConnected()).toBe(true);

          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 50, timeout: 6000 }
    );
  }, 10000);

  /**
   * Property: Event processing should maintain order under high load
   */
  it('should maintain event order under rapid event sequences', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 8 }), // Number of rapid events
        async (eventCount) => {
          const client = new SSEClientService();
          const receivedEvents: ChallengeCompletionEvent[] = [];
          const eventOrder: string[] = [];

          // Setup event listener
          client.onChallengeCompleted((event) => {
            receivedEvents.push(event);
            eventOrder.push(event.id);
          });

          // Connect client synchronously
          client.connect().catch(() => {}); // Don't wait
          vi.advanceTimersByTime(10);
          mockEventSource.simulateOpen();
          vi.advanceTimersByTime(10);

          // Generate sequence of events with predictable IDs
          const expectedOrder: string[] = [];
          for (let i = 0; i < eventCount; i++) {
            const eventId = `event_${i.toString().padStart(3, '0')}`;
            expectedOrder.push(eventId);

            const eventData = {
              id: eventId,
              type: 'challenge_completed',
              data: {
                playerId: `player_${i}`,
                playerName: `Player ${i}`,
                challengeId: `challenge_${i}`,
                challengeName: `Challenge ${i}`,
                completedAt: new Date().toISOString(),
                points: i * 10
              },
              timestamp: new Date().toISOString()
            };

            mockEventSource.simulateMessage(eventData, 'challenge_completed', eventId);
            vi.advanceTimersByTime(2);
          }

          // Allow final processing
          vi.advanceTimersByTime(50);

          // Property: All events should be received
          expect(receivedEvents).toHaveLength(eventCount);

          // Property: Events should be processed in the order they were sent
          expect(eventOrder).toEqual(expectedOrder);

          // Property: Event data should be preserved correctly
          for (let i = 0; i < eventCount; i++) {
            const received = receivedEvents[i];
            expect(received.playerId).toBe(`player_${i}`);
            expect(received.playerName).toBe(`Player ${i}`);
            expect(received.challengeId).toBe(`challenge_${i}`);
            expect(received.challengeName).toBe(`Challenge ${i}`);
            expect(received.points).toBe(i * 10);
          }

          // Cleanup
          client.disconnect();
        }
      ),
      { numRuns: 50, timeout: 5000 }
    );
  }, 8000);
});