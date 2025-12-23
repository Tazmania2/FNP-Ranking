import type { ApiError } from '../types';

/**
 * Configuration for network reconnection behavior
 */
export interface NetworkReconnectionConfig {
  /** Maximum number of reconnection attempts */
  maxRetries?: number;
  /** Base delay between reconnection attempts in milliseconds */
  baseDelay?: number;
  /** Maximum delay between reconnection attempts in milliseconds */
  maxDelay?: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Timeout for each connection attempt in milliseconds */
  connectionTimeout?: number;
}

/**
 * Network reconnection state
 */
export interface NetworkReconnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastReconnectTime: number;
  nextReconnectTime: number;
  consecutiveFailures: number;
}

/**
 * Service for managing network reconnection with exponential backoff
 * Implements intelligent reconnection strategies for Raspberry Pi deployment
 */
export class NetworkReconnectionService {
  private config: Required<NetworkReconnectionConfig>;
  private state: NetworkReconnectionState;
  private reconnectTimeoutId: number | null = null;
  private connectionTestFn: () => Promise<boolean>;
  private onReconnectedCallback?: () => void;
  private onConnectionLostCallback?: () => void;

  constructor(
    connectionTestFn: () => Promise<boolean>,
    config: NetworkReconnectionConfig = {}
  ) {
    this.config = {
      maxRetries: config.maxRetries ?? 10,
      baseDelay: config.baseDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      connectionTimeout: config.connectionTimeout ?? 5000,
    };

    this.state = {
      isConnected: true,
      isReconnecting: false,
      reconnectAttempts: 0,
      lastReconnectTime: 0,
      nextReconnectTime: 0,
      consecutiveFailures: 0,
    };

    this.connectionTestFn = connectionTestFn;
  }

  /**
   * Set callback for when connection is restored
   */
  public onReconnected(callback: () => void): void {
    this.onReconnectedCallback = callback;
  }

  /**
   * Set callback for when connection is lost
   */
  public onConnectionLost(callback: () => void): void {
    this.onConnectionLostCallback = callback;
  }

  /**
   * Get current network state
   */
  public getState(): NetworkReconnectionState {
    return { ...this.state };
  }

  /**
   * Test current connection status
   */
  public async testConnection(): Promise<boolean> {
    try {
      const isConnected = await Promise.race([
        this.connectionTestFn(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), this.config.connectionTimeout)
        )
      ]);

      if (isConnected && !this.state.isConnected) {
        // Connection restored
        this.handleConnectionRestored();
      } else if (!isConnected && this.state.isConnected) {
        // Connection lost
        this.handleConnectionLost();
      }

      this.state.isConnected = isConnected;
      return isConnected;
    } catch (error) {
      if (this.state.isConnected) {
        this.handleConnectionLost();
      }
      this.state.isConnected = false;
      return false;
    }
  }

  /**
   * Handle connection loss and start reconnection process
   */
  private handleConnectionLost(): void {
    if (this.state.isConnected) {
      this.state.isConnected = false;
      this.state.consecutiveFailures++;
      
      if (this.onConnectionLostCallback) {
        this.onConnectionLostCallback();
      }

      if (!this.state.isReconnecting) {
        this.startReconnectionProcess();
      }
    }
  }

  /**
   * Handle connection restoration
   */
  private handleConnectionRestored(): void {
    this.state.isConnected = true;
    this.state.isReconnecting = false;
    this.state.reconnectAttempts = 0;
    this.state.consecutiveFailures = 0;
    this.state.lastReconnectTime = Date.now();

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.onReconnectedCallback) {
      this.onReconnectedCallback();
    }
  }

  /**
   * Start the reconnection process with exponential backoff
   */
  private startReconnectionProcess(): void {
    if (this.state.isReconnecting || this.state.reconnectAttempts >= this.config.maxRetries) {
      return;
    }

    this.state.isReconnecting = true;
    this.scheduleReconnectionAttempt();
  }

  /**
   * Schedule the next reconnection attempt
   */
  private scheduleReconnectionAttempt(): void {
    if (this.state.reconnectAttempts >= this.config.maxRetries) {
      this.state.isReconnecting = false;
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, this.state.reconnectAttempts),
      this.config.maxDelay
    );

    this.state.nextReconnectTime = Date.now() + delay;

    this.reconnectTimeoutId = window.setTimeout(async () => {
      await this.attemptReconnection();
    }, delay);
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnection(): Promise<void> {
    if (!this.state.isReconnecting) {
      return;
    }

    this.state.reconnectAttempts++;

    try {
      const isConnected = await this.testConnection();
      
      if (isConnected) {
        // Connection successful - handleConnectionRestored will be called by testConnection
        return;
      }
    } catch (error) {
      // Connection failed, continue with backoff
    }

    // Schedule next attempt if we haven't exceeded max retries
    if (this.state.reconnectAttempts < this.config.maxRetries) {
      this.scheduleReconnectionAttempt();
    } else {
      this.state.isReconnecting = false;
    }
  }

  /**
   * Manually trigger reconnection attempt
   */
  public async forceReconnect(): Promise<boolean> {
    // Reset attempts to allow manual retry
    this.state.reconnectAttempts = 0;
    this.state.isReconnecting = false;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    return await this.testConnection();
  }

  /**
   * Stop reconnection attempts
   */
  public stopReconnection(): void {
    this.state.isReconnecting = false;
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Reset the service state
   */
  public reset(): void {
    this.stopReconnection();
    this.state = {
      isConnected: true,
      isReconnecting: false,
      reconnectAttempts: 0,
      lastReconnectTime: 0,
      nextReconnectTime: 0,
      consecutiveFailures: 0,
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopReconnection();
    this.onReconnectedCallback = undefined;
    this.onConnectionLostCallback = undefined;
  }
}