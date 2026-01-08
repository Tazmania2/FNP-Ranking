/**
 * Simple polling service for challenge events
 * Polls the backend every 2 seconds for new events
 */

export interface ChallengeEvent {
  id: string;
  playerId: string;
  playerName: string;
  challengeId: string;
  challengeName: string;
  completedAt: string;
  points?: number;
  timestamp: string;
}

type EventCallback = (event: ChallengeEvent) => void;

class ChallengeEventPoller {
  private lastTimestamp: number = Date.now();
  private pollInterval: number | null = null;
  private callbacks: EventCallback[] = [];
  private isPolling: boolean = false;
  private seenEventIds: Set<string> = new Set();

  start(intervalMs: number = 2000) {
    if (this.isPolling) return;
    
    this.isPolling = true;
    console.log('Starting challenge event polling...');
    
    this.pollInterval = window.setInterval(() => {
      this.poll();
    }, intervalMs);
    
    // Initial poll
    this.poll();
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
    console.log('Stopped challenge event polling');
  }

  onEvent(callback: EventCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private async poll() {
    try {
      const response = await fetch('/api/challenge-events-poll', {
        headers: {
          'X-Last-Timestamp': this.lastTimestamp.toString()
        }
      });

      if (!response.ok) {
        console.error('Poll failed:', response.status);
        return;
      }

      const data = await response.json();
      
      if (data.hasNewEvents && data.events.length > 0) {
        console.log('New events received:', data.events.length);
        
        for (const event of data.events) {
          // Deduplicate events
          if (!this.seenEventIds.has(event.id)) {
            this.seenEventIds.add(event.id);
            this.notifyCallbacks(event);
          }
        }
        
        // Keep seen events set from growing too large
        if (this.seenEventIds.size > 100) {
          const arr = Array.from(this.seenEventIds);
          this.seenEventIds = new Set(arr.slice(-50));
        }
      }
      
      if (data.latestTimestamp) {
        this.lastTimestamp = data.latestTimestamp;
      }
      
    } catch (error) {
      console.error('Error polling for events:', error);
    }
  }

  private notifyCallbacks(event: ChallengeEvent) {
    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    }
  }
}

export const challengeEventPoller = new ChallengeEventPoller();
