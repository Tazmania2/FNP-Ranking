# Design Document: Challenge Completion Notifications

## Overview

The Challenge Completion Notification system provides real-time visual feedback when players complete challenges in the Funifier platform. The system uses a webhook endpoint to receive challenge completion data from Funifier, stores events in server memory, and streams them to the frontend via Server-Sent Events (SSE). This approach provides instant notifications while working perfectly with Vercel's serverless architecture.

## Architecture

The system follows a serverless-first architecture with webhook ingestion and SSE streaming:

```mermaid
graph TB
    A[Funifier Webhook] --> B[/api/challenge-webhook]
    B --> C[In-Memory Event Store]
    C --> D[/api/challenge-events SSE]
    D --> E[Frontend SSE Client]
    E --> F[Notification Queue Manager]
    F --> G[Popup Notification Component]
    G --> H[UI Layer]
    
    I[Configuration Service] --> B
    I --> F
    I --> G
    
    J[Error Handler] --> B
    J --> D
    J --> F
    
    K[Local Storage] --> E
    E --> K
    
    L[Existing FunifierApiService] --> F
    
    subgraph "Vercel Serverless"
        B1[Webhook Handler]
        B2[SSE Stream Handler]
        B3[Event Storage]
    end
    
    B1 --> C
    B2 --> D
    B3 --> C
```

### Integration Strategy:
1. **Webhook Ingestion**: Funifier sends POST requests to `/api/challenge-webhook` when challenges are completed
2. **Event Storage**: Store recent events in server memory with automatic cleanup
3. **SSE Streaming**: Frontend connects to `/api/challenge-events` for real-time event stream
4. **Data Enrichment**: Use existing `FunifierApiService` to fetch additional player/challenge details when needed
5. **Connection Resilience**: Handle SSE disconnections and reconnections gracefully

### Key Components:
- **Webhook Handler**: Serverless function that receives and validates challenge completion webhooks
- **SSE Stream Manager**: Manages Server-Sent Events connections and broadcasts events to clients
- **In-Memory Event Store**: Temporary storage for recent events with automatic cleanup
- **Frontend SSE Client**: Connects to SSE stream and processes incoming events
- **Notification Queue Manager**: Manages notification display order and timing
- **Popup Notification Component**: Renders and animates notification popups

## Webhook + SSE Integration

### Serverless API Endpoints

The system will create two new serverless API endpoints alongside your existing `api/daily-code.ts`:

**Webhook Endpoint**: `/api/challenge-webhook`
- Receives POST requests from Funifier when challenges are completed
- Validates webhook authenticity and data format
- Stores events in server memory for streaming to clients

**SSE Endpoint**: `/api/challenge-events`
- Provides Server-Sent Events stream to frontend clients
- Broadcasts new challenge completion events to all connected clients
- Handles client connections and disconnections

### Webhook Handler

```typescript
// api/challenge-webhook.ts
interface WebhookPayload {
  eventType: 'challenge_completed';
  data: {
    playerId: string;
    playerName?: string;
    challengeId: string;
    challengeName?: string;
    completedAt: string;
    points?: number;
    // Additional fields as provided by Funifier
  };
  timestamp: string;
  signature?: string; // For webhook verification
}

interface WebhookHandler {
  validateWebhook(payload: WebhookPayload, signature?: string): boolean;
  storeEvent(event: ChallengeCompletionEvent): void;
  broadcastToClients(event: ChallengeCompletionEvent): void;
}
```

### SSE Stream Manager

```typescript
// api/challenge-events.ts
interface SSEConnection {
  id: string;
  response: VercelResponse;
  lastEventId?: string;
  connectedAt: Date;
}

interface SSEManager {
  addConnection(connection: SSEConnection): void;
  removeConnection(connectionId: string): void;
  broadcastEvent(event: ChallengeCompletionEvent): void;
  getActiveConnections(): SSEConnection[];
}
```

### In-Memory Event Storage

```typescript
interface EventStore {
  addEvent(event: ChallengeCompletionEvent): void;
  getRecentEvents(since?: Date): ChallengeCompletionEvent[];
  cleanup(): void; // Remove old events
  size(): number;
}

// Simple in-memory implementation with automatic cleanup
class MemoryEventStore implements EventStore {
  private events: Map<string, ChallengeCompletionEvent> = new Map();
  private maxAge = 5 * 60 * 1000; // 5 minutes
  private maxEvents = 100;
}
```

### Frontend SSE Client

```typescript
interface SSEClient {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  onEvent(callback: (event: ChallengeCompletionEvent) => void): void;
  onError(callback: (error: Error) => void): void;
  onReconnect(callback: () => void): void;
}
```

### Integration with Existing Code

The webhook + SSE system will integrate seamlessly with your existing infrastructure:
- Use existing Vercel serverless function patterns (like `api/daily-code.ts`)
- Leverage existing error handling and logging approaches
- Follow existing security practices for API endpoints
- Integrate with existing `FunifierApiService` for data enrichment when needed

## Components and Interfaces

### WebSocket Connection Manager

```typescript
interface WebSocketConnectionManager {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  reconnect(): Promise<void>;
  onMessage(callback: (event: WebSocketEvent) => void): void;
  onChallengeCompleted(callback: (event: ChallengeCompletionEvent) => void): void;
  onConnectionStateChange(callback: (state: ConnectionState) => void): void;
}

interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  error?: string;
}
```

### Event Parser and Filter

```typescript
interface EventParser {
  parseWebSocketMessage(message: MessageEvent): WebSocketEvent | null;
  isChallengeCompletionEvent(event: WebSocketEvent): boolean;
  extractChallengeCompletion(event: WebSocketEvent): ChallengeCompletionEvent;
}

interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
  id?: string;
}
```
```

### Notification Queue Manager

```typescript
interface NotificationQueueManager {
  enqueue(notification: ChallengeCompletionEvent): void;
  dequeue(): ChallengeCompletionEvent | null;
  clear(): void;
  size(): number;
  onNotificationReady(callback: (notification: ChallengeCompletionEvent) => void): void;
}
```

### Popup Notification Component

```typescript
interface PopupNotificationProps {
  notification: ChallengeCompletionEvent;
  duration?: number;
  position?: 'top-right' | 'top-center' | 'center';
  onDismiss: () => void;
}

interface PopupAnimationConfig {
  enterDuration: number;
  exitDuration: number;
  enterEasing: string;
  exitEasing: string;
}
```

### Configuration Service

```typescript
interface WebSocketConfig {
  url: string; // wss://service2.funifier.com/ws/presencaws
  authToken: string; // From VITE_FUNIFIER_AUTH_TOKEN
  apiKey: string; // From VITE_FUNIFIER_API_KEY
  reconnectInterval: number; // Base reconnection delay
  maxReconnectAttempts: number; // Maximum reconnection attempts
  heartbeatInterval: number; // WebSocket keepalive interval
}

interface NotificationConfig {
  displayDuration: number;
  maxQueueSize: number;
  position: 'top-right' | 'top-center' | 'center';
  enabledChallengeTypes: string[];
  animationConfig: PopupAnimationConfig;
  
  // WebSocket integration
  webSocketConfig: WebSocketConfig;
  
  // Fallback configuration
  enableFallbackPolling: boolean;
  fallbackPollingInterval: number;
}
```

## Data Models

### Challenge Completion Event
The core data structure representing a completed challenge:

```typescript
interface ChallengeCompletionEvent {
  // Unique identifier for this completion event
  id: string;
  
  // Player information
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  
  // Challenge information
  challengeId: string;
  challengeName: string;
  challengeDescription?: string;
  challengeCategory?: string;
  
  // Completion details
  completedAt: Date;
  points?: number;
  badge?: string;
  level?: number;
  
  // Display metadata
  priority?: 'low' | 'medium' | 'high';
  celebrationType?: 'standard' | 'milestone' | 'achievement';
}
```

### Notification State
Manages the current state of the WebSocket-driven notification system:

```typescript
interface NotificationState {
  // WebSocket connection state
  connectionState: ConnectionState;
  lastEventTimestamp: Date | null;
  
  // Notification processing state
  currentNotification: ChallengeCompletionEvent | null;
  queuedNotifications: ChallengeCompletionEvent[];
  processedEventIds: Set<string>;
  
  // Error tracking
  errorCount: number;
  lastError: string | null;
  
  // UI state
  isVisible: boolean;
}

interface CompletionTrackingState {
  // Event deduplication
  processedCompletionIds: Set<string>;
  lastProcessedTimestamp: Date;
  
  // Caching for enrichment
  playerCache: Map<string, PlayerInfo>;
  challengeCache: Map<string, ChallengeInfo>;
  
  // Connection persistence
  connectionHistory: ConnectionAttempt[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Converting EARS to Properties

Based on the prework analysis, I'll convert the testable acceptance criteria into correctness properties:

**Property 1: WebSocket event processing**
*For any* valid WebSocket message containing challenge completion data, the system should parse and extract all completion details without loss or corruption
**Validates: Requirements 1.3**

**Property 2: Real-time event handling**
*For any* challenge completion event received via WebSocket, the system should process it immediately and trigger notification display
**Validates: Requirements 1.3**

**Property 3: Connection resilience**
*For any* WebSocket disconnection, the system should attempt reconnection with exponential backoff and resume event processing
**Validates: Requirements 1.5**

**Property 4: Event deduplication**
*For any* duplicate challenge completion event (same completion ID), the system should process it only once and prevent duplicate notifications
**Validates: Requirements 1.8**

**Property 5: Malformed event handling**
*For any* malformed or invalid WebSocket event, the system should log the error and continue processing other valid events
**Validates: Requirements 1.6**

**Property 6: Popup display with complete information**
*For any* challenge completion event, the displayed popup should contain all required player and challenge information
**Validates: Requirements 2.1, 2.2, 2.3**

**Property 7: Sequential notification display**
*For any* queue of notifications, they should be displayed sequentially without temporal overlap
**Validates: Requirements 2.5**

**Property 8: Automatic dismissal timing**
*For any* displayed popup, it should automatically dismiss after exactly the configured duration
**Validates: Requirements 3.1**

**Property 9: Animation completion**
*For any* popup display or dismissal, all animations should complete successfully without interruption
**Validates: Requirements 2.4, 3.2**

**Property 10: Queue state management**
*For any* notification dismissal, the system should immediately be ready to display the next queued notification
**Validates: Requirements 3.3**

**Property 11: Clean interface state**
*For any* empty notification queue, no popup elements should be visible in the interface
**Validates: Requirements 3.4**

**Property 12: Responsive positioning and scaling**
*For any* screen size or kiosk mode configuration, popups should be positioned appropriately and remain readable
**Validates: Requirements 4.1, 4.4, 4.5**

**Property 13: Consistent theming and celebratory elements**
*For any* popup display, styling should match the application theme and include celebratory visual elements
**Validates: Requirements 4.2, 4.3**

**Property 14: WebSocket connection management**
*For any* connection state change, the system should maintain appropriate connection status and attempt reconnection when needed
**Validates: Requirements 8.2, 8.3**

**Property 15: Authentication with WebSocket**
*For any* WebSocket connection attempt, the system should use existing Funifier credentials for authentication
**Validates: Requirements 8.1**

**Property 16: Real-time event processing**
*For any* WebSocket event stream, events should be processed in the order received without blocking subsequent events
**Validates: Requirements 1.4**

**Property 15: Queue size limitation**
*For any* number of incoming notifications, the queue should never exceed the configured maximum size
**Validates: Requirements 5.2**

**Property 17: WebSocket connection persistence**
*For any* browser tab visibility change, the WebSocket connection should be maintained appropriately based on the visibility state
**Validates: Requirements 8.4, 8.5**

**Property 16: Memory management**
*For any* memory usage threshold breach, old notification data should be cleared to maintain performance
**Validates: Requirements 5.5**

**Property 18: WebSocket error recovery**
*For any* WebSocket connection error, the system should log detailed error information and attempt recovery without crashing
**Validates: Requirements 8.7**

**Property 17: Network resilience**
*For any* network connectivity loss and restoration, the WebSocket connection should be re-established and event processing resumed
**Validates: Requirements 6.1, 6.2**

**Property 19: Graceful error handling**
*For any* critical error or rendering failure, the system should continue operating without crashing the application
**Validates: Requirements 6.3, 6.4, 6.5**

**Property 20: Configuration hot-reloading**
*For any* configuration change, the new settings should be applied immediately without requiring application restart
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

## Error Handling

The system implements comprehensive error handling at multiple levels:

### API Error Handling
- **Network Errors**: Exponential backoff retry with maximum retry limits
- **Authentication Errors**: Immediate notification to administrators with retry after credential refresh
- **Rate Limiting**: Respect rate limit headers and adjust polling intervals dynamically
- **Malformed Responses**: Log errors and continue processing valid data

### UI Error Handling
- **Rendering Failures**: Fallback to simplified notification display
- **Animation Errors**: Graceful degradation to static display
- **Memory Constraints**: Automatic cleanup of old notifications and resources

### Configuration Error Handling
- **Invalid Settings**: Fallback to default values with user notification
- **Missing Configuration**: Use sensible defaults and continue operation
- **Runtime Changes**: Validate configuration before applying changes

## Testing Strategy

The testing approach combines unit tests for specific functionality with property-based tests for comprehensive coverage:

### Unit Testing
- **Component Rendering**: Test popup component with various notification data
- **API Integration**: Test polling service with mocked API responses
- **Queue Management**: Test notification queue operations and edge cases
- **Configuration**: Test configuration loading and validation
- **Error Scenarios**: Test specific error conditions and recovery

### Property-Based Testing
- **Data Processing**: Verify correct handling of all valid notification data formats
- **Timing Behavior**: Verify consistent timing across different system loads
- **Resource Management**: Verify memory and performance constraints are maintained
- **Error Resilience**: Verify graceful handling of all error conditions
- **Configuration Flexibility**: Verify all configuration options work correctly

### Integration Testing
- **End-to-End Flow**: Test complete flow from API polling to popup dismissal
- **Multi-notification Scenarios**: Test complex scenarios with multiple simultaneous notifications
- **Performance Testing**: Verify system performance under high notification volumes
- **Cross-browser Compatibility**: Test popup rendering and animations across browsers

### Property Test Configuration
- Minimum 100 iterations per property test
- Each property test references its design document property
- Tag format: **Feature: challenge-completion-notifications, Property {number}: {property_text}**
- Focus on universal properties that hold for all inputs
- Use smart generators that create realistic test data within valid input spaces