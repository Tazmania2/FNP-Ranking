/**
 * Property-based tests for event deduplication
 * Tests that duplicate challenge completion events are handled correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

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
 * Simple event store for testing deduplication
 */
class TestEventStore {
  private events: Map<string, ChallengeCompletionEvent> = new Map();
  private processedIds: Set<string> = new Set();

  addEvent(event: ChallengeCompletionEvent): boolean {
    // Check for duplicate
    if (this.processedIds.has(event.id)) {
      return false; // Duplicate, not added
    }

    // Add event
    this.events.set(event.id, event);
    this.processedIds.add(event.id);
    return true; // Successfully added
  }

  getEvent(id: string): ChallengeCompletionEvent | null {
    return this.events.get(id) || null;
  }

  getAllEvents(): ChallengeCompletionEvent[] {
    return Array.from(this.events.values());
  }

  size(): number {
    return this.events.size;
  }

  clear(): void {
    this.events.clear();
    this.processedIds.clear();
  }

  hasProcessed(id: string): boolean {
    return this.processedIds.has(id);
  }
}

describe('Event Deduplication Property Tests', () => {
  let eventStore: TestEventStore;

  beforeEach(() => {
    eventStore = new TestEventStore();
  });

  afterEach(() => {
    eventStore.clear();
  });

  /**
   * **Feature: challenge-completion-notifications, Property 4: Event deduplication**
   * **Validates: Requirements 1.8**
   * 
   * For any duplicate challenge completion event (same completion ID), 
   * the system should process it only once and prevent duplicate notifications
   */
  it('should prevent duplicate events from being processed', () => {
    fc.assert(
      fc.property(
        // Generate unique event identifiers
        fc.record({
          playerId: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
          challengeId: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
          uniqueId: fc.integer({ min: 1, max: 1000000 })
        }),
        // Generate number of duplicate attempts
        fc.integer({ min: 2, max: 5 }),
        (eventData, duplicateCount) => {
          // Clear the store for each test
          eventStore.clear();
          
          // Create a unique timestamp and ID
          const timestamp = new Date(2020, 0, 1, 0, 0, 0, eventData.uniqueId);
          const eventId = `${eventData.playerId}-${eventData.challengeId}-${timestamp.toISOString()}`;
          
          // Create the base event
          const baseEvent: ChallengeCompletionEvent = {
            id: eventId,
            playerId: eventData.playerId,
            playerName: `Player ${eventData.playerId}`,
            challengeId: eventData.challengeId,
            challengeName: `Challenge ${eventData.challengeId}`,
            completedAt: timestamp,
            points: 100,
            timestamp: timestamp
          };

          // Try to add the same event multiple times
          const results: boolean[] = [];
          for (let i = 0; i < duplicateCount; i++) {
            results.push(eventStore.addEvent(baseEvent));
          }

          // Property: Only the first addition should succeed
          expect(results[0]).toBe(true);
          for (let i = 1; i < results.length; i++) {
            expect(results[i]).toBe(false);
          }

          // Property: Event store should contain exactly one instance
          expect(eventStore.size()).toBe(1);
          expect(eventStore.hasProcessed(baseEvent.id)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow different events with different IDs', () => {
    fc.assert(
      fc.property(
        // Generate array of unique event data
        fc.integer({ min: 2, max: 10 }),
        (eventCount) => {
          // Clear the store for each test
          eventStore.clear();
          
          const events: ChallengeCompletionEvent[] = [];
          
          // Create truly unique events
          for (let i = 0; i < eventCount; i++) {
            const timestamp = new Date(2020, 0, 1, 0, 0, 0, i);
            const event: ChallengeCompletionEvent = {
              id: `player${i}-challenge${i}-${timestamp.toISOString()}`,
              playerId: `player${i}`,
              playerName: `Player ${i}`,
              challengeId: `challenge${i}`,
              challengeName: `Challenge ${i}`,
              completedAt: timestamp,
              points: 100 + i,
              timestamp: timestamp
            };
            events.push(event);
          }

          // Add all events
          const results = events.map(event => eventStore.addEvent(event));

          // Property: All unique events should be added successfully
          results.forEach(result => {
            expect(result).toBe(true);
          });

          // Property: Event store should contain all events
          expect(eventStore.size()).toBe(eventCount);

          // Property: All events should be retrievable
          events.forEach(event => {
            expect(eventStore.hasProcessed(event.id)).toBe(true);
            const storedEvent = eventStore.getEvent(event.id);
            expect(storedEvent).not.toBeNull();
            expect(storedEvent?.id).toBe(event.id);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle mixed duplicate and unique events correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 8 }),
        (totalEvents) => {
          // Clear the store for each test
          eventStore.clear();
          
          const events: ChallengeCompletionEvent[] = [];
          const uniqueIds = new Set<string>();

          // Create some unique events and some duplicates
          for (let i = 0; i < totalEvents; i++) {
            let eventId: string;
            
            if (i > 0 && i % 3 === 0) {
              // Make this a duplicate of the first event
              eventId = events[0].id;
            } else {
              // Make this unique
              const timestamp = new Date(2020, 0, 1, 0, 0, 0, i);
              eventId = `player${i}-challenge${i}-${timestamp.toISOString()}`;
            }

            uniqueIds.add(eventId);

            const event: ChallengeCompletionEvent = {
              id: eventId,
              playerId: `player${i}`,
              playerName: `Player ${i}`,
              challengeId: `challenge${i}`,
              challengeName: `Challenge ${i}`,
              completedAt: new Date(2020, 0, 1, 0, 0, 0, i),
              points: 100 + i,
              timestamp: new Date(2020, 0, 1, 0, 0, 0, i)
            };

            events.push(event);
          }

          // Add all events
          const results = events.map(event => eventStore.addEvent(event));
          const successCount = results.filter(r => r).length;

          // Property: Number of successful additions should equal number of unique IDs
          expect(successCount).toBe(uniqueIds.size);
          expect(eventStore.size()).toBe(uniqueIds.size);

          // Property: All unique event IDs should be processed
          uniqueIds.forEach(id => {
            expect(eventStore.hasProcessed(id)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain deduplication across time', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (uniqueId) => {
          // Clear the store for each test
          eventStore.clear();
          
          const timestamp = new Date(2020, 0, 1, 0, 0, 0, uniqueId);
          const event: ChallengeCompletionEvent = {
            id: `player${uniqueId}-challenge${uniqueId}-${timestamp.toISOString()}`,
            playerId: `player${uniqueId}`,
            playerName: `Player ${uniqueId}`,
            challengeId: `challenge${uniqueId}`,
            challengeName: `Challenge ${uniqueId}`,
            completedAt: timestamp,
            points: 100,
            timestamp: timestamp
          };

          // Add the event initially
          const firstResult = eventStore.addEvent(event);
          expect(firstResult).toBe(true);

          // Try to add the same event multiple times
          for (let i = 0; i < 5; i++) {
            const duplicateResult = eventStore.addEvent(event);
            expect(duplicateResult).toBe(false);
          }

          // Property: Event store should still contain only one instance
          expect(eventStore.size()).toBe(1);
          expect(eventStore.hasProcessed(event.id)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases in event ID generation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        (eventCount) => {
          // Clear the store for each test
          eventStore.clear();
          
          const events: ChallengeCompletionEvent[] = [];
          const uniqueIds = new Set<string>();

          // Create events with potential edge cases
          for (let i = 0; i < eventCount; i++) {
            const timestamp = new Date(2020, 0, 1, 0, 0, 0, i);
            const playerId = `player-${i}`;
            const challengeId = `challenge_${i}`;
            const eventId = `${playerId}-${challengeId}-${timestamp.toISOString()}`;
            
            uniqueIds.add(eventId);

            const event: ChallengeCompletionEvent = {
              id: eventId,
              playerId: playerId,
              playerName: `Player ${i}`,
              challengeId: challengeId,
              challengeName: `Challenge ${i}`,
              completedAt: timestamp,
              points: 100,
              timestamp: timestamp
            };

            events.push(event);
          }

          // Add all events
          const results = events.map(event => eventStore.addEvent(event));
          const successCount = results.filter(r => r).length;

          // Property: All events should be unique and added successfully
          expect(successCount).toBe(uniqueIds.size);
          expect(eventStore.size()).toBe(uniqueIds.size);

          // Property: Deduplication should work with edge case IDs
          uniqueIds.forEach(id => {
            expect(eventStore.hasProcessed(id)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});