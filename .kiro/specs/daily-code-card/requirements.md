# Requirements Document

## Introduction

This feature adds a "Código do Dia" (Code of the Day) card to the FNP Ranking application. The card displays a daily code fetched from a Google Sheets document and includes a fade animation cycle. Additionally, the feature implements automatic data refresh for all Funifier API data at regular intervals.

## Glossary

- **Daily Code Card**: A floating UI component that displays the daily code retrieved from Google Sheets
- **Google Sheets API**: The API service used to retrieve the daily code from the specified spreadsheet
- **Funifier API**: The backend service that provides ranking and player data for the application
- **Fade Cycle**: An animation pattern where the card becomes transparent for a period and then returns to full opacity
- **Data Refresh**: The process of re-fetching all data from the Funifier API to ensure current information is displayed

## Requirements

### Requirement 1

**User Story:** As a user viewing the ranking page, I want to see a daily code displayed in a card at the bottom-right corner, so that I can access the current day's code without navigating away from the page

#### Acceptance Criteria

1. THE Daily Code Card SHALL be positioned 16 pixels from the bottom edge of the viewport
2. THE Daily Code Card SHALL be positioned 16 pixels from the right edge of the viewport
3. THE Daily Code Card SHALL use absolute positioning with a z-index value higher than all other page elements
4. THE Daily Code Card SHALL display the text "Código do Dia" as a header
5. THE Daily Code Card SHALL display the fetched code value below the header text

### Requirement 2

**User Story:** As a user, I want the daily code to be automatically retrieved from Google Sheets, so that I always see the most current code without manual updates

#### Acceptance Criteria

1. THE Daily Code Card SHALL fetch the daily code from the Google Sheets document at URL "https://docs.google.com/spreadsheets/d/1MSGli1UUHpy0agyXUyBo22-817hiHuAp4zYvAfEem0Y/edit?usp=sharing"
2. THE Daily Code Card SHALL authenticate with Google Sheets using OAuth credentials
3. WHEN the application loads, THE Daily Code Card SHALL retrieve the daily code from the spreadsheet
4. IF the code retrieval fails, THEN THE Daily Code Card SHALL display an error message or fallback text
5. THE Daily Code Card SHALL cache the retrieved code to minimize API calls

### Requirement 3

**User Story:** As a user, I want the daily code card to fade out periodically, so that it doesn't constantly obstruct my view of the ranking data

#### Acceptance Criteria

1. THE Daily Code Card SHALL remain at full opacity for 45 seconds
2. WHEN 45 seconds have elapsed, THE Daily Code Card SHALL fade to transparent over a 15-second duration
3. WHEN the fade-out completes, THE Daily Code Card SHALL fade back to full opacity over a 15-second duration
4. THE Daily Code Card SHALL repeat this fade cycle continuously while the page is active
5. THE Daily Code Card fade animation SHALL use smooth CSS transitions

### Requirement 4

**User Story:** As a user, I want the ranking data to refresh automatically every minute, so that I see the most current player positions and scores without manually refreshing the page

#### Acceptance Criteria

1. THE Application SHALL re-fetch all Funifier API data every 60 seconds
2. THE Application SHALL refresh leaderboard data during the automatic refresh cycle
3. THE Application SHALL refresh player ranking data during the automatic refresh cycle
4. THE Application SHALL refresh challenge progress data during the automatic refresh cycle
5. WHEN data refresh occurs, THE Application SHALL update the UI with the new data without requiring a full page reload
6. IF a data refresh fails, THEN THE Application SHALL retry the refresh operation according to the configured retry policy
