# Implementation Plan

- [x] 1. Set up Google Sheets API configuration


  - Create environment variables for Google Sheets API credentials (client ID, client secret, API key, spreadsheet ID) in `.env.local` for local development
  - Add the same environment variables in Vercel dashboard (Project Settings > Environment Variables) for production deployment
  - Add configuration to `.env.example` for documentation (without actual values)
  - Update TypeScript types for Google Sheets configuration
  - _Requirements: 2.1, 2.2_

- [ ] 2. Implement Google Sheets service
  - [x] 2.1 Create GoogleSheetsService class with authentication


    - Write service class in `src/services/googleSheetsService.ts`
    - Implement OAuth 2.0 authentication flow
    - Add methods for fetching spreadsheet data
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 2.2 Add error handling and retry logic


    - Implement exponential backoff for rate limiting
    - Add error type definitions
    - Handle network failures gracefully
    - _Requirements: 2.4_

  - [x] 2.3 Write unit tests for GoogleSheetsService


    - Test authentication flow
    - Test data fetching with mocked responses
    - Test error scenarios
    - _Requirements: 2.1, 2.2, 2.4_

- [ ] 3. Create daily code data management hook
  - [x] 3.1 Implement useDailyCode hook


    - Create hook in `src/hooks/useDailyCode.ts`
    - Implement localStorage caching logic
    - Add cache expiration (24 hours)
    - Integrate with GoogleSheetsService
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 3.2 Add TypeScript interfaces for cache structure

    - Define DailyCodeCache interface
    - Add type guards for cache validation
    - _Requirements: 2.5_

  - [x] 3.3 Write unit tests for useDailyCode hook


    - Test cache hit scenario
    - Test cache miss scenario
    - Test localStorage interactions
    - _Requirements: 2.1, 2.2, 2.5_

- [ ] 4. Implement fade animation hook
  - [x] 4.1 Create useFadeAnimation hook


    - Create hook in `src/hooks/useFadeAnimation.ts`
    - Implement 45s visible / 15s fade cycle
    - Use setInterval for timing
    - Return opacity value for CSS
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.2 Write unit tests for useFadeAnimation hook



    - Test opacity transitions
    - Test timing intervals
    - Test cleanup on unmount
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 5. Create DailyCodeCard component
  - [x] 5.1 Build component structure and styling


    - Create component in `src/components/DailyCodeCard.tsx`
    - Implement fixed positioning (bottom-right, 16px margins)
    - Add Tailwind CSS styling with backdrop blur
    - Set z-index to 50 for proper layering
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 5.2 Integrate hooks and display logic

    - Integrate useDailyCode hook
    - Integrate useFadeAnimation hook
    - Implement loading state UI
    - Implement error state UI with fallback
    - Apply fade animation to card opacity
    - _Requirements: 1.5, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.3 Export component and add to index


    - Add export to `src/components/index.ts`
    - _Requirements: 1.1_

  - [x] 5.4 Write integration tests for DailyCodeCard


    - Test rendering with valid code
    - Test loading state
    - Test error state
    - Test fade animation cycle
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. Enhance auto-refresh functionality
  - [x] 6.1 Modify useChickenRaceManager for auto-refresh


    - Add autoRefreshInterval configuration option (60000ms)
    - Implement useEffect with setInterval for periodic refresh
    - Call existing refreshData() method every 60 seconds
    - Ensure refresh only occurs when not in demo mode
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.2 Implement visibility change detection

    - Add document.visibilityState listener
    - Pause refresh when page is hidden
    - Resume refresh when page becomes visible
    - Clean up listeners on unmount
    - _Requirements: 4.1, 4.6_

  - [x] 6.3 Update refresh to include all data sources

    - Ensure leaderboard data is refreshed
    - Ensure player ranking data is refreshed
    - Ensure challenge progress data is refreshed
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 6.4 Write integration tests for auto-refresh


    - Test refresh triggers every 60 seconds
    - Test refresh pauses when page hidden
    - Test refresh resumes when page visible
    - Test refresh doesn't occur in demo mode
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 7. Integrate DailyCodeCard into App
  - [x] 7.1 Add DailyCodeCard to App.tsx


    - Import DailyCodeCard component
    - Add component to main App render
    - Ensure proper positioning relative to other elements
    - _Requirements: 1.1, 1.2, 1.3_


  - [ ] 7.2 Verify z-index and layout
    - Test card doesn't obstruct important UI elements
    - Verify card appears above all other content
    - Test responsive behavior on different screen sizes
    - _Requirements: 1.1, 1.2, 1.3_


- [ ] 8. Final testing and validation
  - [ ] 8.1 Manual testing checklist
    - Verify card position and styling
    - Test fade animation cycle
    - Test Google Sheets data fetching
    - Test caching behavior
    - Test error handling
    - Test auto-refresh functionality

    - _Requirements: All_

  - [ ] 8.2 Cross-browser testing
    - Test in Chrome
    - Test in Firefox
    - Test in Safari


    - Test in Edge
    - _Requirements: All_

  - [ ] 8.3 Performance validation
    - Check bundle size impact
    - Verify animation performance
    - Monitor API call frequency
    - Test with slow network conditions
    - _Requirements: All_
