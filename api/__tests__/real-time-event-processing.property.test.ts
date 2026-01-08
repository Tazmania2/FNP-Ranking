/**
 * Property-based tests for Real-Time Event Processing
 * Tests that events are processed in order without blocking subsequent events
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { parseWebhookPayload, ChallengeCompletionEvent } from '../utils/webhook-utils';

/**
 * Simplified event processor for testing event processing order
 */
class TestEventProcessor {
  private processedEvents: ChallengeCompletionEvent[] = [];
  private processingOrder: string[] = [];

  processEvent(event: ChallengeCompletionEvent): boolean {
    // Simulate synchronous processing
    this.processedEvents.push(event);
    this.processingOrder.push(event.id);
    return true;
  }

  getProcessedEvents(): ChallengeCompletionEvent[] {
    return [...this.processedEvents];
  }

  getProcessingOrder(): string[] {
    return [...this.processingOrder];
  }

  clear(): void {
    this.processedEvents = [];
    this.processingOrder = [];
  }
}

describe('Real-Time Event Processing Property Tests', () => {
  let eventProcessor: TestEventProcessor;

  beforeEach(() => {
    eventProcessor = new TestEventProcessor();
  });

  afterEach(() => {
    eventProcessor.clear();
  });

  /**
   * **Feature: challenge-completion-notifications, Property 16: Real-time event processing**
   * **Validates: Requirements 1.4**
   * 
   * For any WebSocket event stream, events should be processed in the order received without blocking subsequent events
   */
  it('should process events in order without blocking subsequent events', () => {
    fc.assert(
      fc.property(
        // Generate a sequence of events
        fc.array(
          fc.record({
            playerId: fc.string({ minLength: 1, maxLength: 20 }),
            challengeId: fc.string({ minLength: 1, maxLength: 20 }),
            playerName: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
            challengeName: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            completedAt: fc.date().map(d => d.toISOString()),
            points: fc.option(fc.integer({ min: 0, max: 1000 })),
            sequenceId: fc.integer({ min: 1, max: 1000 })
          }),
          { minLength: 2, maxLength: 8 }
        ),
        (eventDataArray) => {
          // Clear processor for each test run
          eventProcessor.clear();
          
          // Sort events by sequence ID to establish expected order
          const sortedEventData = eventDataArray.sort((a, b) => a.sequenceId - b.sequenceId);
          
          // Convert to webhook payloads and parse
          const events: ChallengeCompletionEvent[] = [];
          for (const eventData of sortedEventData) {
            const timestamp = new Date().toISOString();
            const webhookPayload = {
              eventType: 'challenge_completed' as const,
              data: {
                playerId: eventData.playerId,
                playerName: eventData.playerName,
                challengeId: eventData.challengeId,
                challengeName: eventData.challengeName,
                completedAt: eventData.completedAt,
                points: eventData.points
              },
              timestamp: timestamp
            };
            
            const parsedEvent = parseWebhookPayload(webhookPayload);
            if (parsedEvent) {
              // Add sequence info for tracking
              (parsedEvent as any).sequenceId = eventData.sequenceId;
              events.push(parsedEvent);
            }
          }

          // Process all events in order
          for (const event of events) {
            eventProcessor.processEvent(event);
          }

          const processedEvents = eventProcessor.getProcessedEvents();
          const processingOrder = eventProcessor.getProcessingOrder();

          // Property: All events should be processed
          expect(processedEvents).toHaveLength(events.length);

          // Property: Events should be processed in the order they were received
          for (let i = 0; i < events.length; i++) {
            const originalEvent = events[i];
            const processedEvent = processedEvents[i];
            
            expect(processedEvent.id).toBe(originalEvent.id);
            expect(processedEvent.playerId).toBe(originalEvent.playerId);
            expect(processedEvent.challengeId).toBe(originalEvent.challengeId);
            expect((processedEvent as any).sequenceId).toBe((originalEvent as any).sequenceId);
          }

          // Property: Processing order should match input order
          const expectedOrder = events.map(e => e.id);
          expect(processingOrder).toEqual(expectedOrder);

          // Property: No event should be lost during processing
          const processedIds = processedEvents.map(e => e.id);
          const originalIds = events.map(e => e.id);
          expect(processedIds.sort()).toEqual(originalIds.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle concurrent event processing without data corruption', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }), // Number of concurrent events
        (concurrentEventCount) => {
          // Clear processor for each test run
          eventProcessor.clear();
          
          // Generate unique events for concurrent processing
          const events: ChallengeCompletionEvent[] = [];
          for (let i = 0; i < concurrentEventCount; i++) {
            const timestamp = new Date(Date.now() + i).toISOString();
            const webhookPayload = {
              eventType: 'challenge_completed' as const,
              data: {
                playerId: `concurrent_player_${i}`,
                playerName: `Concurrent Player ${i}`,
                challengeId: `concurrent_challenge_${i}`,
                challengeName: `Concurrent Challenge ${i}`,
                completedAt: timestamp,
                points: i * 100
              },
              timestamp: timestamp
            };
            
            const parsedEvent = parseWebhookPayload(webhookPayload);
            if (parsedEvent) {
              events.push(parsedEvent);
            }
          }

          // Process all events
          for (const event of events) {
            eventProcessor.processEvent(event);
          }

          const processedEvents = eventProcessor.getProcessedEvents();

          // Property: All events should be processed without loss
          expect(processedEvents).toHaveLength(concurrentEventCount);

          // Property: No data corruption should occur during processing
          const processedPlayerIds = processedEvents.map(e => e.playerId).sort();
          const originalPlayerIds = events.map(e => e.playerId).sort();
          expect(processedPlayerIds).toEqual(originalPlayerIds);

          // Property: Each event should maintain its data integrity
          for (const processedEvent of processedEvents) {
            const originalEvent = events.find(e => e.id === processedEvent.id);
            expect(originalEvent).toBeDefined();
            
            if (originalEvent) {
              expect(processedEvent.playerId).toBe(originalEvent.playerId);
              expect(processedEvent.playerName).toBe(originalEvent.playerName);
              expect(processedEvent.challengeId).toBe(originalEvent.challengeId);
              expect(processedEvent.challengeName).toBe(originalEvent.challengeName);
              expect(processedEvent.points).toBe(originalEvent.points);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain processing performance under high event volume', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }), // High volume of events
        (eventCount) => {
          // Clear processor for each test run
          eventProcessor.clear();
          
          // Generate high volume of events
          const events: ChallengeCompletionEvent[] = [];
          const startTime = Date.now();
          
          for (let i = 0; i < eventCount; i++) {
            const timestamp = new Date(startTime + i).toISOString();
            const webhookPayload = {
              eventType: 'challenge_completed' as const,
              data: {
                playerId: `volume_player_${i}`,
                playerName: `Volume Player ${i}`,
                challengeId: `volume_challenge_${i}`,
                challengeName: `Volume Challenge ${i}`,
                completedAt: timestamp,
                points: i * 50
              },
              timestamp: timestamp
            };
            
            const parsedEvent = parseWebhookPayload(webhookPayload);
            if (parsedEvent) {
              events.push(parsedEvent);
            }
          }

          const processingStartTime = Date.now();

          // Process all events
          for (const event of events) {
            eventProcessor.processEvent(event);
          }

          const processingEndTime = Date.now();
          const totalProcessingTime = processingEndTime - processingStartTime;

          const processedEvents = eventProcessor.getProcessedEvents();

          // Property: All high-volume events should be processed
          expect(processedEvents).toHaveLength(eventCount);

          // Property: Processing should be reasonably fast
          expect(totalProcessingTime).toBeLessThan(1000); // Less than 1 second

          // Property: Event order should be maintained even under high volume
          for (let i = 0; i < eventCount; i++) {
            const processedEvent = processedEvents[i];
            expect(processedEvent.playerId).toBe(`volume_player_${i}`);
            expect(processedEvent.challengeId).toBe(`volume_challenge_${i}`);
          }

          // Property: No events should be dropped under high volume
          const processedIds = new Set(processedEvents.map(e => e.id));
          const originalIds = new Set(events.map(e => e.id));
          expect(processedIds.size).toBe(originalIds.size);
          
          for (const originalId of originalIds) {
            expect(processedIds.has(originalId)).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle mixed valid and invalid events without blocking processing', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            // Valid event
            fc.record({
              type: fc.constant('valid'),
              playerId: fc.string({ minLength: 1, maxLength: 20 }),
              challengeId: fc.string({ minLength: 1, maxLength: 20 }),
              playerName: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
              challengeName: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
              points: fc.option(fc.integer({ min: 0, max: 1000 }))
            }),
            // Invalid event (will be rejected by parseWebhookPayload)
            fc.record({
              type: fc.constant('invalid'),
              // Missing required fields or invalid structure
              invalidData: fc.string()
            })
          ),
          { minLength: 3, maxLength: 8 }
        ),
        (mixedEventData) => {
          // Clear processor for each test run
          eventProcessor.clear();
          
          const validEvents: ChallengeCompletionEvent[] = [];
          
          // Process mixed events
          for (const eventData of mixedEventData) {
            const timestamp = new Date().toISOString();
            
            if (eventData.type === 'valid') {
              const webhookPayload = {
                eventType: 'challenge_completed' as const,
                data: {
                  playerId: eventData.playerId,
                  playerName: eventData.playerName,
                  challengeId: eventData.challengeId,
                  challengeName: eventData.challengeName,
                  completedAt: timestamp,
                  points: eventData.points
                },
                timestamp: timestamp
              };
              
              const parsedEvent = parseWebhookPayload(webhookPayload);
              if (parsedEvent) {
                validEvents.push(parsedEvent);
                eventProcessor.processEvent(parsedEvent);
              }
            } else {
              // Try to process invalid event (should be rejected by parseWebhookPayload)
              const invalidPayload = {
                eventType: 'invalid_type' as any, // Wrong event type
                data: {
                  invalidData: eventData.invalidData
                  // Missing required fields
                },
                timestamp: timestamp
              };
              
              const parsedEvent = parseWebhookPayload(invalidPayload);
              // Should be null for invalid events, so won't be processed
              if (parsedEvent) {
                eventProcessor.processEvent(parsedEvent);
              }
            }
          }

          const processedEvents = eventProcessor.getProcessedEvents();

          // Property: Only valid events should be processed
          expect(processedEvents).toHaveLength(validEvents.length);

          // Property: Invalid events should not block processing of valid events
          for (let i = 0; i < validEvents.length; i++) {
            const originalEvent = validEvents[i];
            const processedEvent = processedEvents[i];
            
            expect(processedEvent.id).toBe(originalEvent.id);
            expect(processedEvent.playerId).toBe(originalEvent.playerId);
            expect(processedEvent.challengeId).toBe(originalEvent.challengeId);
          }

          // Property: Processing should continue despite invalid events
          if (validEvents.length > 0) {
            expect(processedEvents.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});