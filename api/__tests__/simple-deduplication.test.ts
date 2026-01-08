/**
 * Simple unit tests for event deduplication to debug the issue
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

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
    console.log(`Adding event with ID: ${event.id}, current size: ${this.events.size}`);
    
    // Check for duplicate
    if (this.processedIds.has(event.id)) {
      console.log(`Event ${event.id} is a duplicate, rejecting`);
      return false; // Duplicate, not added
    }

    // Add event
    this.events.set(event.id, event);
    this.processedIds.add(event.id);
    console.log(`Event ${event.id} added successfully, new size: ${this.events.size}`);
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
    console.log(`Clearing event store, current size: ${this.events.size}`);
    this.events.clear();
    this.processedIds.clear();
    console.log(`Event store cleared, new size: ${this.events.size}`);
  }

  hasProcessed(id: string): boolean {
    return this.processedIds.has(id);
  }
}

describe('Simple Event Deduplication Tests', () => {
  let eventStore: TestEventStore;

  beforeEach(() => {
    console.log('Setting up new test event store');
    eventStore = new TestEventStore();
  });

  afterEach(() => {
    console.log('Cleaning up test event store');
    eventStore.clear();
  });

  it('should add a single event successfully', () => {
    const event: ChallengeCompletionEvent = {
      id: 'test-event-1',
      playerId: 'player1',
      playerName: 'Player 1',
      challengeId: 'challenge1',
      challengeName: 'Challenge 1',
      completedAt: new Date('2020-01-01'),
      points: 100,
      timestamp: new Date('2020-01-01')
    };

    const result = eventStore.addEvent(event);
    
    expect(result).toBe(true);
    expect(eventStore.size()).toBe(1);
    expect(eventStore.hasProcessed(event.id)).toBe(true);
  });

  it('should reject duplicate events', () => {
    const event: ChallengeCompletionEvent = {
      id: 'test-event-2',
      playerId: 'player2',
      playerName: 'Player 2',
      challengeId: 'challenge2',
      challengeName: 'Challenge 2',
      completedAt: new Date('2020-01-02'),
      points: 200,
      timestamp: new Date('2020-01-02')
    };

    // Add the event first time
    const firstResult = eventStore.addEvent(event);
    expect(firstResult).toBe(true);
    expect(eventStore.size()).toBe(1);

    // Try to add the same event again
    const secondResult = eventStore.addEvent(event);
    expect(secondResult).toBe(false);
    expect(eventStore.size()).toBe(1);
  });

  it('should allow different events', () => {
    const event1: ChallengeCompletionEvent = {
      id: 'test-event-3a',
      playerId: 'player3',
      playerName: 'Player 3',
      challengeId: 'challenge3',
      challengeName: 'Challenge 3',
      completedAt: new Date('2020-01-03'),
      points: 300,
      timestamp: new Date('2020-01-03')
    };

    const event2: ChallengeCompletionEvent = {
      id: 'test-event-3b',
      playerId: 'player4',
      playerName: 'Player 4',
      challengeId: 'challenge4',
      challengeName: 'Challenge 4',
      completedAt: new Date('2020-01-04'),
      points: 400,
      timestamp: new Date('2020-01-04')
    };

    const result1 = eventStore.addEvent(event1);
    const result2 = eventStore.addEvent(event2);
    
    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(eventStore.size()).toBe(2);
  });
});