# Real-Time Updates System

This document describes the real-time updates system implemented for the Chicken Race Ranking application, which provides automatic data polling, smooth position transitions, and comprehensive error handling.

## Overview

The real-time updates system consists of several interconnected hooks and components that work together to:

1. **Automatically fetch fresh leaderboard data** at configurable intervals
2. **Handle network errors and API failures** with retry logic and exponential backoff
3. **Animate smooth position transitions** when player rankings change
4. **Display user-friendly error messages** and loading states
5. **Manage visibility-based polling** to conserve resources when the tab is hidden

## Core Components

### 1. useRealTimeUpdates Hook

**Location**: `src/hooks/useRealTimeUpdates.ts`

This hook manages periodic API polling with configurable intervals and comprehensive error handling.

#### Features:
- **Configurable polling intervals** (default: 30 seconds)
- **Automatic retry logic** with exponential backoff
- **Visibility-based pausing** to save resources when tab is hidden
- **Change detection** to identify when player positions have changed
- **Loading state management** integration

#### Configuration Options:
```typescript
interface RealTimeConfig {
  pollingInterval?: number;     // Polling interval in ms (default: 30000)
  enabled?: boolean;           // Enable/disable polling (default: true)
  maxRetries?: number;         // Max retry attempts (default: 3)
  retryDelay?: number;         // Base retry delay in ms (default: 1000)
  pauseOnHidden?: boolean;     // Pause when tab hidden (default: true)
}
```

#### Usage Example:
```typescript
const realTimeUpdates = useRealTimeUpdates(apiService, {
  pollingInterval: 15000,  // Poll every 15 seconds
  maxRetries: 5,          // Retry up to 5 times
  retryDelay: 2000,       // Start with 2 second delay
});
```

### 2. usePositionTransitions Hook

**Location**: `src/hooks/usePositionTransitions.ts`

This hook manages smooth animations when player positions change in the leaderboard.

#### Features:
- **Automatic position calculation** based on player rankings
- **Smooth transition animations** with configurable duration and easing
- **Staggered animations** for visual appeal
- **Celebration animations** for players who improve their position
- **Consistent positioning** using player ID as seed for vertical placement

#### Configuration Options:
```typescript
interface TransitionConfig {
  transitionDuration?: number;        // Animation duration in ms (default: 1000)
  easing?: 'linear' | 'ease-out';    // Animation easing (default: 'ease-out')
  staggered?: boolean;               // Enable staggered animations (default: true)
  staggerDelay?: number;             // Delay between animations in ms (default: 100)
  celebrateImprovements?: boolean;   // Show celebration for improvements (default: true)
}
```

#### Usage Example:
```typescript
const positionTransitions = usePositionTransitions(players, {
  transitionDuration: 1500,
  easing: 'ease-out',
  staggered: true,
  celebrateImprovements: true,
});
```

### 3. useChickenRaceManager Hook

**Location**: `src/hooks/useChickenRaceManager.ts`

This is the main orchestration hook that combines real-time updates, position transitions, and error handling into a single, easy-to-use interface.

#### Features:
- **Unified API** for all chicken race functionality
- **Automatic initialization** when API config is provided
- **Integrated error handling** with retry capabilities
- **Race statistics** and status information
- **Configuration management** for all sub-systems

#### Usage Example:
```typescript
const {
  // State
  players,
  loading,
  error,
  
  // Status
  raceStatus,
  playerPositions,
  
  // Actions
  initializeRace,
  refreshData,
  retryFailedOperation,
  
  // Real-time controls
  startPolling,
  stopPolling,
  forceUpdate,
} = useChickenRaceManager({
  apiConfig: {
    serverUrl: 'https://your-funifier-server.com',
    apiKey: 'your-api-key',
    authToken: 'Basic your-auth-token',
  },
  realTimeConfig: {
    pollingInterval: 30000,
    enabled: true,
  },
  transitionConfig: {
    transitionDuration: 1000,
    celebrateImprovements: true,
  },
});
```

## Error Handling Components

### ErrorDisplay Component

**Location**: `src/components/ErrorDisplay.tsx`

Provides user-friendly error messages with retry functionality.

#### Features:
- **Error type-specific styling** (network, auth, validation, config)
- **Automatic retry buttons** for retryable errors
- **Dismissible notifications** with close buttons
- **Multiple display variants** (inline, floating, banner)
- **Accessibility support** with proper ARIA attributes

#### Usage Example:
```typescript
<ErrorDisplay
  error={error}
  onRetry={retryFailedOperation}
  onDismiss={clearError}
  size="medium"
  position="floating"
/>
```

### LoadingDisplay Component

**Location**: `src/components/LoadingDisplay.tsx`

Provides various loading indicators and skeleton screens.

#### Features:
- **Multiple loading variants** (spinner, dots, pulse, skeleton)
- **Context-aware messages** based on loading state
- **Skeleton screens** for better perceived performance
- **Overlay loading** for blocking operations
- **Accessibility support** with proper ARIA labels

#### Usage Example:
```typescript
<LoadingDisplay
  loading={loading}
  variant="skeleton"
  size="large"
/>
```

## Integration Guide

### 1. Basic Setup

```typescript
import { useChickenRaceManager } from './hooks/useChickenRaceManager';
import { ErrorDisplay } from './components/ErrorDisplay';
import { LoadingDisplay } from './components/LoadingDisplay';

function MyComponent() {
  const raceManager = useChickenRaceManager({
    apiConfig: {
      serverUrl: process.env.REACT_APP_FUNIFIER_URL,
      apiKey: process.env.REACT_APP_FUNIFIER_API_KEY,
      authToken: process.env.REACT_APP_FUNIFIER_AUTH_TOKEN,
    },
  });

  return (
    <div>
      <ErrorDisplay
        error={raceManager.error}
        onRetry={raceManager.retryFailedOperation}
        onDismiss={raceManager.clearError}
      />
      
      <LoadingDisplay loading={raceManager.loading} />
      
      {/* Your race components */}
    </div>
  );
}
```

### 2. Advanced Configuration

```typescript
const raceManager = useChickenRaceManager({
  apiConfig: {
    serverUrl: 'https://your-funifier-server.com',
    apiKey: 'your-api-key',
    authToken: 'Basic your-auth-token',
  },
  realTimeConfig: {
    pollingInterval: 15000,      // Poll every 15 seconds
    enabled: true,               // Enable automatic polling
    maxRetries: 5,              // Retry up to 5 times
    retryDelay: 2000,           // Start with 2 second delay
    pauseOnHidden: true,        // Pause when tab is hidden
  },
  transitionConfig: {
    transitionDuration: 1500,    // 1.5 second animations
    easing: 'ease-out',         // Smooth easing
    staggered: true,            // Stagger animations
    staggerDelay: 150,          // 150ms between animations
    celebrateImprovements: true, // Show celebrations
  },
});
```

### 3. Manual Control

```typescript
// Manual polling control
const handleStartPolling = () => {
  raceManager.startPolling();
};

const handleStopPolling = () => {
  raceManager.stopPolling();
};

const handleForceUpdate = () => {
  raceManager.forceUpdate();
};

// Status monitoring
const isConnected = raceManager.raceStatus.connectionStatus === 'connected';
const isPolling = raceManager.realTimeStatus.isPolling;
const timeSinceUpdate = raceManager.realTimeStatus.timeSinceLastUpdate;
```

## Error Types and Handling

### Network Errors
- **Automatic retry** with exponential backoff
- **Rate limit detection** with appropriate delays
- **Connection timeout** handling
- **Offline detection** and recovery

### Authentication Errors
- **No automatic retry** (requires user intervention)
- **Clear error messages** about credential issues
- **Secure token handling** without exposure

### Validation Errors
- **Data format validation** for API responses
- **Missing resource handling** (deleted leaderboards)
- **Graceful degradation** when data is incomplete

### Configuration Errors
- **Environment variable validation**
- **API endpoint verification**
- **Clear setup instructions** in error messages

## Performance Considerations

### Optimization Strategies

1. **Efficient Change Detection**
   - Only update when actual changes occur
   - Compare player positions and scores
   - Skip unnecessary re-renders

2. **Resource Management**
   - Pause polling when tab is hidden
   - Clean up intervals on unmount
   - Debounce rapid updates

3. **Animation Performance**
   - Use CSS transforms for smooth animations
   - Stagger animations to prevent jank
   - Optimize for 60fps rendering

4. **Memory Management**
   - Clean up event listeners
   - Clear timeouts and intervals
   - Prevent memory leaks in long-running sessions

### Monitoring and Debugging

The system provides comprehensive status information for monitoring:

```typescript
// Connection status
const connectionStatus = raceManager.raceStatus.connectionStatus;

// Polling status
const pollingInfo = {
  isPolling: raceManager.realTimeStatus.isPolling,
  isUpdating: raceManager.realTimeStatus.isUpdating,
  retryCount: raceManager.realTimeStatus.retryCount,
  timeSinceLastUpdate: raceManager.realTimeStatus.timeSinceLastUpdate,
};

// Race statistics
const raceStats = raceManager.raceStats;
```

## Testing

The system includes comprehensive tests for all components:

- **Unit tests** for individual hooks and components
- **Integration tests** for the complete system
- **Error scenario testing** for all failure modes
- **Performance tests** for animation smoothness

Run tests with:
```bash
npm test -- --run useRealTimeUpdates usePositionTransitions useChickenRaceManager
```

## Troubleshooting

### Common Issues

1. **Polling Not Starting**
   - Check API configuration
   - Verify leaderboard selection
   - Ensure polling is enabled

2. **Animations Not Smooth**
   - Check browser performance
   - Reduce animation complexity
   - Verify CSS transform support

3. **High Error Rates**
   - Check network connectivity
   - Verify API credentials
   - Monitor rate limits

4. **Memory Leaks**
   - Ensure proper cleanup on unmount
   - Check for uncleaned intervals
   - Monitor event listener removal

### Debug Mode

Enable debug logging by setting:
```typescript
localStorage.setItem('debug', 'chicken-race:*');
```

This will provide detailed logging for all real-time update operations.