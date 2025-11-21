# Design Document

## Overview

This feature adds two main capabilities to the FNP Ranking application:
1. A floating "Código do Dia" card that displays a daily code fetched from Google Sheets with periodic fade animations
2. Automatic refresh of all Funifier API data every 60 seconds

The design follows the existing architecture patterns in the application, using React hooks for state management, TypeScript for type safety, and Tailwind CSS for styling.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      App Component                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  useChickenRaceManager (Enhanced with auto-refresh)    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  DailyCodeCard Component                               │ │
│  │    ├─ useDailyCode Hook                                │ │
│  │    └─ useFadeAnimation Hook                            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────┬──────────────────┐
                              │                 │                  │
                    ┌─────────▼────────┐  ┌────▼─────────┐  ┌────▼──────────┐
                    │ Google Sheets    │  │  Funifier    │  │  Local        │
                    │ API Service      │  │  API Service │  │  Storage      │
                    └──────────────────┘  └──────────────┘  └───────────────┘
```

### Data Flow

1. **Daily Code Retrieval**:
   - On app load → Fetch code from Google Sheets → Cache in localStorage
   - Every 24 hours → Re-fetch code → Update cache
   - On fetch failure → Display cached code or error message

2. **Fade Animation Cycle**:
   - Timer starts on component mount
   - 45s visible → 15s fade out → 15s fade in → repeat

3. **Data Refresh**:
   - Every 60 seconds → Trigger refresh in useChickenRaceManager
   - Refresh all leaderboard data, player rankings, and challenge progress
   - Update UI with new data

## Components and Interfaces

### 1. DailyCodeCard Component

**Location**: `src/components/DailyCodeCard.tsx`

**Purpose**: Renders the floating card with daily code and manages fade animation

**Props**: None (self-contained)

**State**:
- `code`: string | null - The current daily code
- `loading`: boolean - Loading state for initial fetch
- `error`: string | null - Error message if fetch fails
- `opacity`: number - Current opacity value (0-1)

**Styling**:
- Position: `fixed bottom-4 right-4`
- Z-index: `z-50` (above all other content)
- Background: `bg-white/90 backdrop-blur-sm`
- Border: `border border-white/20 rounded-xl`
- Padding: `p-4`
- Shadow: `shadow-lg`

### 2. useDailyCode Hook

**Location**: `src/hooks/useDailyCode.ts`

**Purpose**: Manages fetching and caching of the daily code from Google Sheets

**Returns**:
```typescript
{
  code: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**Behavior**:
- Checks localStorage for cached code and timestamp
- If cache is valid (< 24 hours old), returns cached code
- Otherwise, fetches from Google Sheets API
- Stores result in localStorage with timestamp
- Handles errors gracefully with fallback to cached data

### 3. useFadeAnimation Hook

**Location**: `src/hooks/useFadeAnimation.ts`

**Purpose**: Manages the fade in/out animation cycle

**Returns**:
```typescript
{
  opacity: number;
}
```

**Behavior**:
- Uses `setInterval` to manage timing
- Cycles: 45s at opacity 1 → 15s transition to 0 → 15s transition to 1
- Uses CSS transitions for smooth animation
- Cleans up interval on unmount

### 4. GoogleSheetsService

**Location**: `src/services/googleSheetsService.ts`

**Purpose**: Handles communication with Google Sheets API

**Methods**:
```typescript
class GoogleSheetsService {
  constructor(config: GoogleSheetsConfig);
  
  async getDailyCode(): Promise<string>;
  
  private async authenticate(): Promise<string>;
  
  private async fetchSheetData(
    spreadsheetId: string,
    range: string
  ): Promise<any>;
}
```

**Configuration**:
```typescript
interface GoogleSheetsConfig {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  spreadsheetId: string;
  range: string; // e.g., "Sheet1!A1:B1"
}
```

### 5. Enhanced useChickenRaceManager Hook

**Location**: `src/hooks/useChickenRaceManager.ts` (existing file, to be modified)

**Changes**:
- Add `autoRefreshInterval` configuration option (default: 60000ms)
- Implement `useEffect` with `setInterval` to trigger `refreshData()` every 60 seconds
- Ensure refresh only occurs when not in demo mode
- Pause refresh when page is hidden (using `document.visibilityState`)

## Data Models

### DailyCode Cache

**Storage**: localStorage

**Key**: `daily_code_cache`

**Structure**:
```typescript
interface DailyCodeCache {
  code: string;
  timestamp: number; // Unix timestamp in milliseconds
  expiresAt: number; // Unix timestamp in milliseconds
}
```

### Google Sheets Response

**Expected Format**:
```typescript
interface SheetsResponse {
  values: string[][]; // 2D array of cell values
}
```

**Example**:
```json
{
  "values": [
    ["Código do Dia", "ABC123"]
  ]
}
```

## Error Handling

### Google Sheets API Errors

1. **Authentication Failure**:
   - Display: "Não foi possível autenticar com Google Sheets"
   - Fallback: Show cached code if available
   - Retry: Attempt re-authentication on next fetch

2. **Network Error**:
   - Display: "Erro de conexão. Mostrando código em cache."
   - Fallback: Show cached code
   - Retry: Automatic retry on next scheduled fetch

3. **Invalid Response**:
   - Display: "Formato de dados inválido"
   - Fallback: Show cached code
   - Log: Console error with response details

4. **Rate Limit**:
   - Display: "Limite de requisições atingido"
   - Fallback: Show cached code
   - Retry: Exponential backoff (1min, 5min, 15min)

### Funifier API Refresh Errors

- Leverage existing error handling in `useChickenRaceManager`
- Display errors using existing `FloatingErrorDisplay` component
- Allow manual retry via existing retry button
- Continue auto-refresh cycle even after errors

## Testing Strategy

### Unit Tests

1. **useDailyCode Hook**:
   - Test cache hit scenario
   - Test cache miss scenario
   - Test error handling
   - Test localStorage interactions

2. **useFadeAnimation Hook**:
   - Test opacity transitions
   - Test timing intervals
   - Test cleanup on unmount

3. **GoogleSheetsService**:
   - Mock API responses
   - Test authentication flow
   - Test data parsing
   - Test error scenarios

### Integration Tests

1. **DailyCodeCard Component**:
   - Test rendering with valid code
   - Test rendering with loading state
   - Test rendering with error state
   - Test fade animation cycle

2. **Auto-refresh Functionality**:
   - Test refresh triggers every 60 seconds
   - Test refresh pauses when page hidden
   - Test refresh resumes when page visible
   - Test refresh doesn't occur in demo mode

### Manual Testing Checklist

- [ ] Card appears in correct position (bottom-right, 16px margins)
- [ ] Card displays fetched code correctly
- [ ] Card fades out after 45 seconds
- [ ] Card fades back in after 15 seconds
- [ ] Fade cycle repeats continuously
- [ ] Cached code displays on subsequent loads
- [ ] Error message displays when fetch fails
- [ ] Data refreshes every 60 seconds
- [ ] Refresh pauses when tab is hidden
- [ ] Card doesn't obstruct important UI elements

## Implementation Approach

### Phase 1: Google Sheets Integration

1. Set up Google Cloud Project and enable Sheets API
2. Configure OAuth 2.0 credentials
3. Implement `GoogleSheetsService` class
4. Create `useDailyCode` hook with caching
5. Add environment variables for API credentials

### Phase 2: Daily Code Card UI

1. Create `DailyCodeCard` component
2. Implement `useFadeAnimation` hook
3. Style card with Tailwind CSS
4. Add card to `App.tsx`
5. Test positioning and z-index

### Phase 3: Auto-refresh Enhancement

1. Modify `useChickenRaceManager` to add auto-refresh
2. Implement visibility change detection
3. Test refresh cycle
4. Ensure demo mode is excluded from refresh

### Phase 4: Testing and Polish

1. Write unit tests
2. Write integration tests
3. Manual testing across browsers
4. Performance optimization
5. Documentation updates

## Alternative Approaches Considered

### Google Sheets API vs Apps Script

**Option 1: Direct Google Sheets API** (Chosen)
- Pros: Full control, better error handling, works offline with cache
- Cons: Requires OAuth setup, more complex authentication

**Option 2: Google Apps Script Web App**
- Pros: Simpler authentication, no OAuth needed
- Cons: Less control, harder to cache, requires Apps Script deployment

**Decision**: Use direct API for better control and offline support

### Refresh Strategy

**Option 1: Polling with setInterval** (Chosen)
- Pros: Simple, predictable, works in all browsers
- Cons: Continues when tab is hidden (mitigated with visibility API)

**Option 2: Server-Sent Events (SSE)**
- Pros: Real-time updates, server-controlled
- Cons: Requires backend changes, more complex

**Decision**: Use polling for simplicity and compatibility with existing architecture

## Security Considerations

1. **API Credentials**:
   - Store in environment variables (`.env.local`)
   - Never commit to source control
   - Use `.env.example` for documentation

2. **OAuth Tokens**:
   - Store access tokens in memory only
   - Implement token refresh logic
   - Clear tokens on logout/error

3. **Data Validation**:
   - Validate all data from Google Sheets
   - Sanitize before displaying in UI
   - Use TypeScript for type safety

4. **Rate Limiting**:
   - Implement exponential backoff
   - Cache aggressively to minimize API calls
   - Monitor API usage in Google Cloud Console

## Performance Considerations

1. **Caching**:
   - Cache daily code for 24 hours
   - Reduce API calls to minimum
   - Use localStorage for persistence

2. **Animation**:
   - Use CSS transitions (GPU-accelerated)
   - Avoid JavaScript-based animations
   - Use `will-change` CSS property for optimization

3. **Auto-refresh**:
   - Pause when page is hidden
   - Debounce rapid visibility changes
   - Cancel pending requests on unmount

4. **Bundle Size**:
   - Use dynamic imports for Google API client if needed
   - Tree-shake unused code
   - Monitor bundle size impact
