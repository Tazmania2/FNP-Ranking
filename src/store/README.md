# State Management System

This directory contains the complete state management system for the Chicken Race Ranking application, built with Zustand for optimal performance and developer experience.

## Architecture Overview

The state management system is divided into three main parts:

1. **LeaderboardStore** - Manages leaderboard data, players, loading states, and errors
2. **UIStore** - Manages UI-specific state like tooltips, animations, and auto-cycling
3. **AppStore** - Provides coordinated actions and unified interface

## Store Structure

### LeaderboardStore (`leaderboardStore.ts`)

Handles all leaderboard-related data:

```typescript
interface LeaderboardState {
  leaderboards: Leaderboard[];           // Available leaderboards
  currentLeaderboard: Leaderboard | null; // Currently selected leaderboard
  currentLeaderboardId: string | null;   // ID of current leaderboard
  players: Player[];                     // Current leaderboard players
  loading: LoadingState;                 // Loading states for different operations
  error: ApiError | null;               // Current error state
  lastUpdated: number | null;           // Timestamp of last data update
}
```

**Key Actions:**
- `setLeaderboards(leaderboards)` - Set available leaderboards
- `setCurrentLeaderboard(leaderboard)` - Set current leaderboard
- `setPlayers(players)` - Update player list
- `setLoading(key, value)` - Set specific loading state
- `setError(error)` - Set error state
- `resetStore()` - Reset entire store

### UIStore (`uiStore.ts`)

Manages UI-specific state:

```typescript
interface UIState {
  tooltips: TooltipState;        // Tooltip visibility and content
  animations: ChickenAnimation[]; // Active chicken animations
  autoCycle: AutoCycleState;     // Auto-cycling configuration
  isInitialized: boolean;        // App initialization status
}
```

**Key Actions:**
- `showTooltip(playerId, position, content)` - Show player tooltip
- `hideTooltip()` - Hide current tooltip
- `setChickenAnimations(animations)` - Set all animations
- `updateChickenAnimation(playerId, update)` - Update specific animation
- `setAutoCycleEnabled(enabled)` - Enable/disable auto-cycling
- `resetUI()` - Reset UI state

### AppStore (`appStore.ts`)

Provides coordinated actions and business logic:

**Key Methods:**
- `initializeApp(leaderboards, initialId?)` - Initialize application
- `switchToLeaderboard(id)` - Switch to specific leaderboard
- `setAutoCycling(enabled)` - Enable/disable auto-cycling with timer management
- `cycleToNextLeaderboard()` - Manually cycle to next leaderboard
- `cleanup()` - Clean up resources and timers

## Usage

### Basic Usage with Hooks

```typescript
import { useChickenRaceApp } from '../hooks';

function MyComponent() {
  const {
    // State
    leaderboards,
    currentLeaderboard,
    players,
    loading,
    error,
    autoCycle,
    
    // Actions
    initializeApp,
    switchToLeaderboard,
    setAutoCycling,
    updatePlayers,
    
    // Computed values
    hasLeaderboards,
    hasPlayers,
    canAutoCycle,
    isLoading,
    hasError,
  } = useChickenRaceApp();

  // Initialize app
  useEffect(() => {
    initializeApp(myLeaderboards);
  }, []);

  return (
    <div>
      {/* Your component JSX */}
    </div>
  );
}
```

### Specialized Hooks

For components that only need specific functionality:

```typescript
// Only tooltip functionality
import { useTooltipManager } from '../hooks';

// Only animation functionality  
import { useAnimationManager } from '../hooks';

// Only leaderboard data
import { useLeaderboardData } from '../hooks';

// Only auto-cycle functionality
import { useAutoCycleManager } from '../hooks';
```

### Direct Store Access

For advanced use cases:

```typescript
import { useLeaderboardStore, useUIStore } from '../store';

function AdvancedComponent() {
  const leaderboards = useLeaderboardStore(state => state.leaderboards);
  const setError = useLeaderboardStore(state => state.setError);
  
  // Direct store manipulation
}
```

## Auto-Cycling System

The auto-cycling system automatically rotates between leaderboards every 5 minutes when enabled:

```typescript
// Enable auto-cycling
setAutoCycling(true);

// Check time until next switch
const timeRemaining = getTimeUntilNextSwitch();

// Manually cycle to next
cycleToNextLeaderboard();

// Disable auto-cycling
setAutoCycling(false);
```

**Features:**
- Automatic timer management
- Graceful cleanup on disable
- Manual cycling support
- Time remaining calculation
- Wraps around to first leaderboard after last

## Error Handling

The system provides comprehensive error handling:

```typescript
interface ApiError {
  type: 'network' | 'auth' | 'validation' | 'config';
  message: string;
  retryable: boolean;
  timestamp: number;
  originalError?: Error;
}

// Set error
setError({
  type: 'network',
  message: 'Failed to fetch leaderboard data',
  retryable: true,
  timestamp: Date.now(),
});

// Clear error
clearError();

// Check error state
if (hasError) {
  console.log('Current error:', error);
}
```

## Loading States

Multiple loading states are supported for different operations:

```typescript
interface LoadingState {
  leaderboards: boolean;        // Loading leaderboards list
  currentLeaderboard: boolean;  // Loading current leaderboard data
  switchingLeaderboard: boolean; // Switching between leaderboards
}

// Set specific loading state
setLoadingState('leaderboards', true);

// Set multiple loading states
setAllLoading({
  leaderboards: true,
  currentLeaderboard: true,
});

// Check if any loading
const isLoading = Object.values(loading).some(Boolean);
```

## Animation System

The animation system tracks chicken positions and states:

```typescript
interface ChickenAnimation {
  playerId: string;
  currentPosition: { x: number; y: number };
  targetPosition: { x: number; y: number };
  animationState: 'idle' | 'moving' | 'celebrating';
  lastUpdate: number;
}

// Add/update animation
updatePlayerAnimation('player1', {
  targetPosition: { x: 75, y: 30 },
  animationState: 'moving',
});

// Get specific animation
const animation = getPlayerAnimation('player1');

// Check if player has animation
const hasAnim = hasAnimation('player1');
```

## Tooltip System

Interactive tooltips for player information:

```typescript
interface TooltipContent {
  rank: number;
  points: number;
  pointsGainedToday: number;
  playerName: string;
}

// Show tooltip
showTooltip('player1', { x: 100, y: 200 }, {
  rank: 1,
  points: 150,
  pointsGainedToday: 10,
  playerName: 'Alice Johnson',
});

// Hide tooltip
hideTooltip();

// Update position
updateTooltipPosition({ x: 120, y: 220 });
```

## Testing

Comprehensive test coverage is provided for all stores and hooks:

```bash
# Run all store tests
npm run test:run src/store

# Run hook tests
npm run test:run src/hooks

# Run all tests
npm run test:run
```

## Performance Considerations

- **Selector Hooks**: Use specific selector hooks to prevent unnecessary re-renders
- **Zustand Devtools**: Enabled in development for debugging
- **Action Naming**: All actions are named for better debugging experience
- **Cleanup**: Automatic cleanup of timers and resources

## Best Practices

1. **Use Appropriate Hooks**: Choose the most specific hook for your needs
2. **Error Boundaries**: Wrap components in error boundaries for error handling
3. **Loading States**: Always show loading indicators for better UX
4. **Cleanup**: The system automatically cleans up resources, but manual cleanup is available
5. **Testing**: Test components that use the stores with proper setup/teardown

## Example Component

See `src/components/examples/StateManagementExample.tsx` for a complete example of how to use the state management system.