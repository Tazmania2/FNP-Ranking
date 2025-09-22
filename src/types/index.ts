// Types barrel export file
// Export all types from this file for easier imports

// Funifier API Configuration
export interface FunifierConfig {
  serverUrl: string; // e.g., https://your-funifier-server.com
  apiKey: string; // Your Funifier API key from environment variables
  authToken: string; // Basic auth token from environment variables
}

// Leaderboard data model
export interface Leaderboard {
  _id: string;
  title: string;
  description: string;
  principalType: number; // 0 for Player, 1 for Team
  operation: {
    type: number;
    achievement_type: number;
    item: string;
    sort: number; // -1 descending, 1 ascending
  };
  period: {
    type: number;
    timeAmount: number;
    timeScale: number;
  };
}

// Player data model
export interface Player {
  _id: string;
  player: string;
  name: string;
  position: number;
  total: number;
  previous_position?: number;
  previous_total?: number;
  move?: 'up' | 'down' | 'same';
  image?: string;
  extra?: Record<string, any>;
}

// API Response for leaderboard data
export interface LeaderboardResponse {
  leaderboard: Leaderboard;
  leaders: Player[];
}

// Options for leaderboard API calls
export interface LeaderboardOptions {
  live?: boolean;
  maxResults?: number;
  period?: string;
}

// Error handling types
export interface ApiError {
  type: 'network' | 'auth' | 'validation' | 'config';
  message: string;
  retryable: boolean;
  timestamp: number;
  originalError?: Error;
}

// Animation and UI state types
export interface ChickenPosition {
  playerId: string;
  x: number; // Horizontal position (0-100%)
  y: number; // Vertical position (randomized)
  rank: number;
}

export interface ChickenAnimation {
  playerId: string;
  currentPosition: { x: number; y: number };
  targetPosition: { x: number; y: number };
  animationState: 'idle' | 'moving' | 'celebrating';
  lastUpdate: number;
}

export interface TooltipState {
  playerId: string | null;
  isVisible: boolean;
  position: { x: number; y: number };
  content: TooltipContent | null;
}

export interface TooltipContent {
  rank: number;
  points: number;
  pointsGainedToday: number;
  playerName: string;
}

// Auto-cycling state types
export interface AutoCycleState {
  isEnabled: boolean;
  currentIndex: number;
  nextSwitchTime: number;
  intervalId: number | null;
}

// Loading states
export interface LoadingState {
  leaderboards: boolean;
  currentLeaderboard: boolean;
  switchingLeaderboard: boolean;
}

// Application state interfaces
export interface LeaderboardState {
  leaderboards: Leaderboard[];
  currentLeaderboard: Leaderboard | null;
  currentLeaderboardId: string | null;
  players: Player[];
  loading: LoadingState;
  error: ApiError | null;
  lastUpdated: number | null;
}

export interface UIState {
  tooltips: TooltipState;
  animations: ChickenAnimation[];
  autoCycle: AutoCycleState;
  isInitialized: boolean;
}

export interface AppState extends LeaderboardState, UIState {}
