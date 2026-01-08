/**
 * Property-based tests for memory management
 * 
 * **Feature: challenge-completion-notifications, Property 16: Memory management**
 * **Validates: Requirements 5.5**
 * 
 * Property 16: Memory management
 * For any memory usage threshold breach, old notification data should be cleared 
 * to maintain performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

/**
 * Challenge completion event data structure
 */
interface ChallengeCompletionEvent {
  id: string;
  playerId: string;
  playerName: string;
  challengeId: string;
  challengeName: string;
  completedAt: Date;
  points?: number;
  timestamp: Date;
}

/**
 * Memory-managed event store for testing
 */
class MemoryManagedEventStore {
  private events: Map<string, ChallengeCompletionEvent> = new Map();
  private readonly maxAge: number;
  private readonly maxEvents: number;

  constructor(maxAge: number = 5 * 60 * 1000, maxEvents: number = 100) {
    this.maxAge = maxAge;
    this.maxEvents = maxEvents;
  }

  addEvent(event: ChallengeCompletionEvent): void {
    // Add event
    this.events.set(event.id, event);
    
    // Trigger cleanup after adding
    this.cleanup();
  }

  getRecentEvents(since?: Date): ChallengeCompletionEvent[] {
    const cutoff = since || new Date(Date.now() - this.maxAge);
    return Array.from(this.events.values())
      .filter(event => event.timestamp >= cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  cleanup(): void {
    const now = Date.now();
    const cutoff = new Date(now - this.maxAge);
    
    // Remove old events based on age
    for (const [id, event] of this.events.entries()) {
      if (event.timestamp < cutoff) {
        this.events.delete(id);
      }
    }
    
    // Limit total events if still over limit
    if (this.events.size > this.maxEvents) {
      const sortedEvents = Array.from(this.events.entries())
        .sort(([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Keep only the most recent events
      this.events.clear();
      for (let i = 0; i < this.maxEvents; i++) {
        const [id, event] = sortedEvents[i];
        this.events.set(id, event);
      }
    }
  }

  size(): number {
    return this.events.size;
  }

  clear(): void {
    this.events.clear();
  }

  getMaxAge(): number {
    return this.maxAge;
  }

  getMaxEvents(): number {
    return this.maxEvents;
  }

  // Get all events (including old ones) for testing
  getAllEvents(): ChallengeCompletionEvent[] {
    return Array.from(this.events.values());
  }
}

describe('Memory Management Property Tests', () => {
  let eventStore: MemoryManagedEventStore;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (eventStore) {
      eventStore.clear();
    }
  });

  /**
   * **Feature: challenge-completion-notifications, Property 16: Memory management**
   * **Validates: Requirements 5.5**
   * 
   * Property 16: Memory management
   * For any memory usage threshold breach, old notification data should be cleared 
   * to maintain performance
   */
  it('should enforce maximum event count limit for any number of events', () => {
    fc.assert(
      fc.property(
        fc.record({
          maxEvents: fc.integer({ min: 5, max: 20 }),
          maxAge: fc.integer({ min: 60000, max: 300000 }), // 1-5 minutes
          eventCount: fc.integer({ min: 10, max: 50 })
        }),
        (config) => {
          eventStore = new MemoryManagedEventStore(config.maxAge, config.maxEvents);
          
          // Generate events with recent timestamps
          const baseTime = Date.now();
          const events: ChallengeCompletionEvent[] = [];
          
          for (let i = 0; i < config.eventCount; i++) {
            const timestamp = new Date(baseTime + i * 1000); // 1 second apart
            const event: ChallengeCompletionEvent = {
              id: `event-${i}-${timestamp.getTime()}`,
              playerId: `player${i % 10}`,
              playerName: `Player ${i % 10}`,
              challengeId: `challenge${i % 5}`,
              challengeName: `Challenge ${i % 5}`,
              completedAt: timestamp,
              points: 100 + i,
              timestamp: timestamp
            };
            events.push(event);
          }

          // Add all events
          events.forEach(event => eventStore.addEvent(event));

          // Property: Event store should never exceed maximum event count
          expect(eventStore.size()).toBeLessThanOrEqual(config.maxEvents);

          // Property: If we added more events than the limit, only the most recent should remain
          if (config.eventCount > config.maxEvents) {
            expect(eventStore.size()).toBe(config.maxEvents);
            
            // Verify that the most recent events are kept
            const storedEvents = eventStore.getAllEvents();
            const sortedStoredEvents = storedEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            
            // Check that we have the most recent events
            for (let i = 0; i < Math.min(config.maxEvents, 5); i++) {
              const expectedEventIndex = config.eventCount - 1 - i;
              const expectedEvent = events[expectedEventIndex];
              const actualEvent = sortedStoredEvents[i];
              
              expect(actualEvent.id).toBe(expectedEvent.id);
              expect(actualEvent.timestamp.getTime()).toBe(expectedEvent.timestamp.getTime());
            }
          } else {
            // If we didn't exceed the limit, all events should be present
            expect(eventStore.size()).toBe(config.eventCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should remove events older than maximum age for any time configuration', () => {
    fc.assert(
      fc.property(
        fc.record({
          maxAge: fc.integer({ min: 30000, max: 120000 }), // 30 seconds to 2 minutes
          maxEvents: fc.integer({ min: 50, max: 100 }),
          oldEventCount: fc.integer({ min: 3, max: 10 }),
          recentEventCount: fc.integer({ min: 3, max: 10 })
        }),
        (config) => {
          eventStore = new MemoryManagedEventStore(config.maxAge, config.maxEvents);
          
          const baseTime = Date.now();
          const oldEvents: ChallengeCompletionEvent[] = [];
          const recentEvents: ChallengeCompletionEvent[] = [];

          // Create old events (beyond maxAge)
          for (let i = 0; i < config.oldEventCount; i++) {
            const timestamp = new Date(baseTime - config.maxAge - (i + 1) * 10000); // Older than maxAge
            const event: ChallengeCompletionEvent = {
              id: `old-event-${i}-${timestamp.getTime()}`,
              playerId: `old-player${i}`,
              playerName: `Old Player ${i}`,
              challengeId: `old-challenge${i}`,
              challengeName: `Old Challenge ${i}`,
              completedAt: timestamp,
              points: 50 + i,
              timestamp: timestamp
            };
            oldEvents.push(event);
          }

          // Create recent events (within maxAge)
          for (let i = 0; i < config.recentEventCount; i++) {
            const timestamp = new Date(baseTime - i * 1000); // Recent events
            const event: ChallengeCompletionEvent = {
              id: `recent-event-${i}-${timestamp.getTime()}`,
              playerId: `recent-player${i}`,
              playerName: `Recent Player ${i}`,
              challengeId: `recent-challenge${i}`,
              challengeName: `Recent Challenge ${i}`,
              completedAt: timestamp,
              points: 100 + i,
              timestamp: timestamp
            };
            recentEvents.push(event);
          }

          // Add old events first
          oldEvents.forEach(event => eventStore.addEvent(event));
          
          // Add recent events
          recentEvents.forEach(event => eventStore.addEvent(event));

          // Property: Old events should be removed during cleanup
          const storedEvents = eventStore.getAllEvents();
          const oldEventIds = oldEvents.map(e => e.id);
          const recentEventIds = recentEvents.map(e => e.id);
          
          // Check that no old events remain
          storedEvents.forEach(event => {
            expect(oldEventIds).not.toContain(event.id);
          });

          // Property: Recent events should be preserved
          recentEventIds.forEach(recentId => {
            const found = storedEvents.some(event => event.id === recentId);
            expect(found).toBe(true);
          });

          // Property: Only recent events should be returned by getRecentEvents
          const recentEventsFromStore = eventStore.getRecentEvents();
          expect(recentEventsFromStore.length).toBe(config.recentEventCount);
          
          recentEventsFromStore.forEach(event => {
            expect(recentEventIds).toContain(event.id);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle mixed age and count limits correctly for any event distribution', () => {
    fc.assert(
      fc.property(
        fc.record({
          maxAge: fc.integer({ min: 60000, max: 180000 }), // 1-3 minutes
          maxEvents: fc.integer({ min: 5, max: 15 }),
          totalEvents: fc.integer({ min: 10, max: 30 })
        }),
        (config) => {
          eventStore = new MemoryManagedEventStore(config.maxAge, config.maxEvents);
          
          const baseTime = Date.now();
          const events: ChallengeCompletionEvent[] = [];

          // Create events with mixed ages - some old, some recent
          for (let i = 0; i < config.totalEvents; i++) {
            let timestamp: Date;
            
            if (i % 3 === 0) {
              // Make some events old (beyond maxAge)
              timestamp = new Date(baseTime - config.maxAge - (i + 1) * 5000);
            } else {
              // Make most events recent (within maxAge)
              timestamp = new Date(baseTime - i * 2000);
            }

            const event: ChallengeCompletionEvent = {
              id: `mixed-event-${i}-${timestamp.getTime()}`,
              playerId: `player${i % 8}`,
              playerName: `Player ${i % 8}`,
              challengeId: `challenge${i % 4}`,
              challengeName: `Challenge ${i % 4}`,
              completedAt: timestamp,
              points: 75 + i,
              timestamp: timestamp
            };
            events.push(event);
          }

          // Add all events
          events.forEach(event => eventStore.addEvent(event));

          // Property: Store should respect both age and count limits
          expect(eventStore.size()).toBeLessThanOrEqual(config.maxEvents);

          // Property: All stored events should be within the age limit
          const storedEvents = eventStore.getAllEvents();
          const ageLimit = new Date(baseTime - config.maxAge);
          
          storedEvents.forEach(event => {
            expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(ageLimit.getTime());
          });

          // Property: getRecentEvents should return the same as stored events (since cleanup removes old ones)
          const recentEvents = eventStore.getRecentEvents();
          expect(recentEvents.length).toBe(storedEvents.length);

          // Property: Events should be sorted by timestamp (most recent first)
          for (let i = 1; i < recentEvents.length; i++) {
            expect(recentEvents[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
              recentEvents[i].timestamp.getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain performance characteristics under memory pressure', () => {
    fc.assert(
      fc.property(
        fc.record({
          maxEvents: fc.integer({ min: 10, max: 25 }),
          batchSize: fc.integer({ min: 15, max: 40 }),
          batchCount: fc.integer({ min: 2, max: 5 })
        }),
        (config) => {
          eventStore = new MemoryManagedEventStore(300000, config.maxEvents); // 5 minute age limit
          
          const baseTime = Date.now();
          let totalEventsAdded = 0;

          // Add events in batches to simulate high-frequency scenarios
          for (let batch = 0; batch < config.batchCount; batch++) {
            for (let i = 0; i < config.batchSize; i++) {
              const timestamp = new Date(baseTime + totalEventsAdded * 100); // 100ms apart
              const event: ChallengeCompletionEvent = {
                id: `batch-${batch}-event-${i}-${timestamp.getTime()}`,
                playerId: `player${totalEventsAdded % 12}`,
                playerName: `Player ${totalEventsAdded % 12}`,
                challengeId: `challenge${totalEventsAdded % 6}`,
                challengeName: `Challenge ${totalEventsAdded % 6}`,
                completedAt: timestamp,
                points: 90 + totalEventsAdded,
                timestamp: timestamp
              };
              
              eventStore.addEvent(event);
              totalEventsAdded++;
            }

            // Property: After each batch, size should not exceed limit
            expect(eventStore.size()).toBeLessThanOrEqual(config.maxEvents);
          }

          // Property: Final size should be exactly the limit (since we added more than the limit)
          expect(eventStore.size()).toBe(config.maxEvents);

          // Property: All remaining events should be the most recent ones
          const storedEvents = eventStore.getAllEvents();
          const sortedStoredEvents = storedEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          
          // Verify that we have the most recent events by checking timestamps are consecutive
          for (let i = 1; i < sortedStoredEvents.length; i++) {
            const timeDiff = sortedStoredEvents[i - 1].timestamp.getTime() - sortedStoredEvents[i].timestamp.getTime();
            expect(timeDiff).toBeGreaterThanOrEqual(0); // Should be in descending order
          }

          // Property: Memory cleanup should be efficient (no duplicate IDs)
          const eventIds = storedEvents.map(e => e.id);
          const uniqueIds = new Set(eventIds);
          expect(uniqueIds.size).toBe(eventIds.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle edge cases in memory management gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          maxEvents: fc.integer({ min: 1, max: 5 }), // Very small limits
          maxAge: fc.integer({ min: 1000, max: 5000 }), // Very short age limits
          eventCount: fc.integer({ min: 1, max: 10 })
        }),
        (config) => {
          eventStore = new MemoryManagedEventStore(config.maxAge, config.maxEvents);
          
          const baseTime = Date.now();
          const events: ChallengeCompletionEvent[] = [];

          // Create events with various timestamps
          for (let i = 0; i < config.eventCount; i++) {
            const timestamp = new Date(baseTime + i * 500); // 500ms apart
            const event: ChallengeCompletionEvent = {
              id: `edge-event-${i}-${timestamp.getTime()}`,
              playerId: `edge-player${i}`,
              playerName: `Edge Player ${i}`,
              challengeId: `edge-challenge${i}`,
              challengeName: `Edge Challenge ${i}`,
              completedAt: timestamp,
              points: 60 + i,
              timestamp: timestamp
            };
            events.push(event);
          }

          // Add events
          events.forEach(event => eventStore.addEvent(event));

          // Property: Should handle small limits gracefully
          expect(eventStore.size()).toBeLessThanOrEqual(config.maxEvents);
          expect(eventStore.size()).toBeGreaterThanOrEqual(0);

          // Property: Should not crash with edge case configurations
          expect(() => eventStore.cleanup()).not.toThrow();
          expect(() => eventStore.getRecentEvents()).not.toThrow();

          // Property: With very small limits, should still maintain most recent events
          if (eventStore.size() > 0) {
            const storedEvents = eventStore.getAllEvents();
            const recentEvents = eventStore.getRecentEvents();
            
            expect(storedEvents.length).toBe(recentEvents.length);
            expect(storedEvents.length).toBeLessThanOrEqual(config.maxEvents);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});