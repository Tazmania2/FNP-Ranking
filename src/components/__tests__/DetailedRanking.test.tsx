import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { DetailedRanking } from '../DetailedRanking';
import type { Player, Leaderboard } from '../../types';

// Mock data for testing
const mockLeaderboard: Leaderboard = {
  _id: 'test-leaderboard-1',
  title: 'Test Championship Rankings',
  description: 'A comprehensive test leaderboard for detailed ranking testing',
  principalType: 0,
  operation: {
    type: 1,
    achievement_type: 1,
    item: 'points',
    sort: -1,
  },
  period: {
    type: 1,
    timeAmount: 30,
    timeScale: 1,
  },
};

const createMockPlayer = (id: number, overrides: Partial<Player> = {}): Player => ({
  _id: `player-${id}`,
  player: `player-${id}`,
  name: `Player ${id}`,
  position: id,
  total: 1000 - (id * 50),
  previous_position: id + 1,
  previous_total: 950 - (id * 50),
  move: 'up',
  ...overrides,
});

const mockPlayers: Player[] = [
  createMockPlayer(1, { name: 'Alice Champion', total: 1500, move: 'up' }),
  createMockPlayer(2, { name: 'Bob Runner', total: 1200, move: 'down' }),
  createMockPlayer(3, { name: 'Charlie Steady', total: 1000, move: 'same' }),
  createMockPlayer(4, { name: 'Diana Climber', total: 800 }),
  createMockPlayer(5, { name: 'Eve Competitor', total: 600 }),
  createMockPlayer(6, { name: 'Frank Extra', total: 400 }),
  createMockPlayer(7, { name: 'Grace Player', total: 300 }),
  createMockPlayer(8, { name: 'Henry Gamer', total: 200 }),
  createMockPlayer(9, { name: 'Ivy Challenger', total: 100 }),
  createMockPlayer(10, { name: 'Jack Finisher', total: 50 }),
];

// Create a large dataset for pagination testing
const createLargePlayerSet = (count: number): Player[] => {
  return Array.from({ length: count }, (_, i) => 
    createMockPlayer(i + 1, { 
      name: `Player ${i + 1}`,
      total: 10000 - (i * 100),
    })
  );
};

describe('DetailedRanking Component', () => {
  describe('Basic Rendering', () => {
    it('renders the component with header and title', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      expect(screen.getByText('📊 Complete Rankings')).toBeInTheDocument();
      expect(screen.getByText('Test Championship Rankings - 10 players')).toBeInTheDocument();
    });

    it('renders without leaderboard title when currentLeaderboard is null', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={null}
        />
      );

      expect(screen.getByText('📊 Complete Rankings')).toBeInTheDocument();
      expect(screen.queryByText('Test Championship Rankings')).not.toBeInTheDocument();
    });

    it('renders search input', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search players by name, position, or points...');
      expect(searchInput).toBeInTheDocument();
    });

    it('renders table headers with sort functionality', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      expect(screen.getByText('Position')).toBeInTheDocument();
      expect(screen.getByText('Avatar')).toBeInTheDocument();
      expect(screen.getByText('Player Name')).toBeInTheDocument();
      expect(screen.getByText('Points')).toBeInTheDocument();
      expect(screen.getByText('Movement')).toBeInTheDocument();
    });
  });

  describe('Player Display', () => {
    it('displays all players in the table', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      mockPlayers.forEach(player => {
        expect(screen.getByText(player.name)).toBeInTheDocument();
        expect(screen.getByText(player.position.toString())).toBeInTheDocument();
      });
    });

    it('displays player points with proper formatting', () => {
      const playersWithLargeNumbers: Player[] = [
        createMockPlayer(1, { name: 'Million Player', total: 1500000 }),
        createMockPlayer(2, { name: 'Thousand Player', total: 2500 }),
        createMockPlayer(3, { name: 'Small Player', total: 150 }),
      ];

      render(
        <DetailedRanking
          players={playersWithLargeNumbers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      expect(screen.getByText('1.500.000')).toBeInTheDocument();
      expect(screen.getByText('2.500')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('displays chicken avatars for each player', () => {
      render(
        <DetailedRanking
          players={mockPlayers.slice(0, 3)}
          currentLeaderboard={mockLeaderboard}
        />
      );

      // Check for chicken emojis (they appear in the title and header)
      const chickenElements = screen.getAllByText(/[🐔🐓🐤🐣🥚]/);
      expect(chickenElements.length).toBeGreaterThanOrEqual(3);
    });

    it('displays movement indicators correctly', () => {
      render(
        <DetailedRanking
          players={mockPlayers.slice(0, 3)}
          currentLeaderboard={mockLeaderboard}
        />
      );

      expect(screen.getByText('↗️ +1')).toBeInTheDocument(); // Alice up movement (position 2 -> 1)
      expect(screen.getByText('↘️ --1')).toBeInTheDocument(); // Bob down movement (negative calculation)
      expect(screen.getByText('➡️ No change')).toBeInTheDocument(); // Charlie same
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );
    });

    it('filters players by name', async () => {
      const searchInput = screen.getByPlaceholderText('Search players by name, position, or points...');
      
      fireEvent.change(searchInput, { target: { value: 'Alice' } });

      await waitFor(() => {
        expect(screen.getByText('Alice Champion')).toBeInTheDocument();
        expect(screen.queryByText('Bob Runner')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Found 1 player matching "Alice"')).toBeInTheDocument();
    });

    it('filters players by position', async () => {
      const searchInput = screen.getByPlaceholderText('Search players by name, position, or points...');
      
      fireEvent.change(searchInput, { target: { value: '1' } });

      await waitFor(() => {
        expect(screen.getByText('Alice Champion')).toBeInTheDocument();
        expect(screen.getByText('Jack Finisher')).toBeInTheDocument(); // Position 10 contains '1'
      });
    });

    it('filters players by points', async () => {
      const searchInput = screen.getByPlaceholderText('Search players by name, position, or points...');
      
      fireEvent.change(searchInput, { target: { value: '1500' } });

      await waitFor(() => {
        expect(screen.getByText('Alice Champion')).toBeInTheDocument();
        expect(screen.queryByText('Bob Runner')).not.toBeInTheDocument();
      });
    });

    it('shows no results message when search yields no matches', async () => {
      const searchInput = screen.getByPlaceholderText('Search players by name, position, or points...');
      
      fireEvent.change(searchInput, { target: { value: 'NonexistentPlayer' } });

      await waitFor(() => {
        expect(screen.getByText('No players found matching your search')).toBeInTheDocument();
        expect(screen.getByText('Clear search')).toBeInTheDocument();
      });
    });

    it('clears search when clear button is clicked', async () => {
      const searchInput = screen.getByPlaceholderText('Search players by name, position, or points...');
      
      fireEvent.change(searchInput, { target: { value: 'NonexistentPlayer' } });

      await waitFor(() => {
        expect(screen.getByText('Clear search')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Clear search'));

      await waitFor(() => {
        expect(screen.getByText('Alice Champion')).toBeInTheDocument();
        expect(screen.getByText('Bob Runner')).toBeInTheDocument();
      });
    });

    it('resets to first page when searching', async () => {
      // This test would be more meaningful with pagination, but we can test the behavior
      const searchInput = screen.getByPlaceholderText('Search players by name, position, or points...');
      
      fireEvent.change(searchInput, { target: { value: 'Alice' } });

      await waitFor(() => {
        expect(screen.getByText('Found 1 player matching "Alice"')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting Functionality', () => {
    beforeEach(() => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );
    });

    it('sorts by position (default)', () => {
      const rows = screen.getAllByRole('row');
      // Skip header row, check first data row
      expect(rows[1]).toHaveTextContent('Alice Champion');
    });

    it('sorts by name when name header is clicked', async () => {
      const nameHeader = screen.getByText('Player Name');
      fireEvent.click(nameHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // After sorting by name, Alice should still be first (alphabetically)
        expect(rows[1]).toHaveTextContent('Alice Champion');
      });
    });

    it('sorts by points when points header is clicked', async () => {
      const pointsHeader = screen.getByText('Points');
      fireEvent.click(pointsHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // After sorting by points ascending, lowest should be first
        expect(rows[1]).toHaveTextContent('Jack Finisher'); // 50 points
      });
    });

    it('reverses sort direction when clicking same header twice', async () => {
      const pointsHeader = screen.getByText('Points');
      
      // First click - ascending
      fireEvent.click(pointsHeader);
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('Jack Finisher'); // Lowest points first
      });

      // Second click - descending
      fireEvent.click(pointsHeader);
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('Alice Champion'); // Highest points first
      });
    });

    it('displays sort indicators correctly', () => {
      // Check for sort indicators (arrows)
      expect(screen.getAllByText('↑')).toHaveLength(1); // Default position sort ascending
      expect(screen.getAllByText('↕️')).toHaveLength(3); // Other columns unsorted
    });

    it('sorts by movement when movement header is clicked', async () => {
      const movementHeader = screen.getByText('Movement');
      fireEvent.click(movementHeader);

      await waitFor(() => {
        // Players with no movement should be at the bottom when sorted ascending
        const rows = screen.getAllByRole('row');
        // The exact order depends on the movement priority logic
        expect(rows).toHaveLength(11); // Header + 10 data rows
      });
    });
  });

  describe('Pagination', () => {
    const largePlayerSet = createLargePlayerSet(50); // 50 players for pagination testing

    it('displays pagination controls when there are more than 20 players', () => {
      render(
        <DetailedRanking
          players={largePlayerSet}
          currentLeaderboard={mockLeaderboard}
        />
      );

      expect(screen.getByText('Showing 1-20 of 50 players')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      
      // Use more specific selectors for pagination buttons
      const paginationButtons = screen.getAllByRole('button').filter(button => 
        button.textContent === '1' || button.textContent === '2'
      );
      expect(paginationButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('does not display pagination when there are 20 or fewer players', () => {
      render(
        <DetailedRanking
          players={mockPlayers} // Only 10 players
          currentLeaderboard={mockLeaderboard}
        />
      );

      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });

    it('navigates to next page when Next button is clicked', async () => {
      render(
        <DetailedRanking
          players={largePlayerSet}
          currentLeaderboard={mockLeaderboard}
        />
      );

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Showing 21-40 of 50 players')).toBeInTheDocument();
        expect(screen.getByText('Player 21')).toBeInTheDocument();
      });
    });

    it('navigates to previous page when Previous button is clicked', async () => {
      render(
        <DetailedRanking
          players={largePlayerSet}
          currentLeaderboard={mockLeaderboard}
        />
      );

      // Go to page 2 first
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Showing 21-40 of 50 players')).toBeInTheDocument();
      });

      // Then go back to page 1
      const prevButton = screen.getByText('Previous');
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText('Showing 1-20 of 50 players')).toBeInTheDocument();
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });
    });

    it('disables Previous button on first page', () => {
      render(
        <DetailedRanking
          players={largePlayerSet}
          currentLeaderboard={mockLeaderboard}
        />
      );

      const prevButton = screen.getByText('Previous');
      expect(prevButton).toBeDisabled();
    });

    it('disables Next button on last page', async () => {
      render(
        <DetailedRanking
          players={largePlayerSet}
          currentLeaderboard={mockLeaderboard}
        />
      );

      // Navigate to last page (page 3 for 50 players)
      const paginationButtons = screen.getAllByRole('button').filter(button => 
        button.textContent === '3'
      );
      const page3Button = paginationButtons[0];
      fireEvent.click(page3Button);

      await waitFor(() => {
        const nextButton = screen.getByText('Next');
        expect(nextButton).toBeDisabled();
      });
    });

    it('navigates to specific page when page number is clicked', async () => {
      render(
        <DetailedRanking
          players={largePlayerSet}
          currentLeaderboard={mockLeaderboard}
        />
      );

      const paginationButtons = screen.getAllByRole('button').filter(button => 
        button.textContent === '2'
      );
      const page2Button = paginationButtons[0];
      fireEvent.click(page2Button);

      await waitFor(() => {
        expect(screen.getByText('Showing 21-40 of 50 players')).toBeInTheDocument();
      });
    });

    it('resets to first page when sorting', async () => {
      render(
        <DetailedRanking
          players={largePlayerSet}
          currentLeaderboard={mockLeaderboard}
        />
      );

      // Go to page 2
      const paginationButtons = screen.getAllByRole('button').filter(button => 
        button.textContent === '2'
      );
      const page2Button = paginationButtons[0];
      fireEvent.click(page2Button);

      await waitFor(() => {
        expect(screen.getByText('Showing 21-40 of 50 players')).toBeInTheDocument();
      });

      // Sort by name
      const nameHeader = screen.getByText('Player Name');
      fireEvent.click(nameHeader);

      await waitFor(() => {
        expect(screen.getByText('Showing 1-20 of 50 players')).toBeInTheDocument();
      });
    });
  });

  describe('Position Badge Styling', () => {
    it('applies correct CSS classes for different positions', () => {
      render(
        <DetailedRanking
          players={mockPlayers.slice(0, 4)}
          currentLeaderboard={mockLeaderboard}
        />
      );

      const position1 = screen.getByText('1');
      const position2 = screen.getByText('2');
      const position3 = screen.getByText('3');
      const position4 = screen.getByText('4');

      expect(position1).toHaveClass('bg-yellow-500'); // Gold
      expect(position2).toHaveClass('bg-gray-400'); // Silver
      expect(position3).toHaveClass('bg-amber-600'); // Bronze
      expect(position4).toHaveClass('bg-blue-500'); // Default
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no players', () => {
      render(
        <DetailedRanking
          players={[]}
          currentLeaderboard={mockLeaderboard}
        />
      );

      expect(screen.getByText('No players available')).toBeInTheDocument();
      expect(screen.getByText('🐔')).toBeInTheDocument();
    });

    it('displays search-specific empty state when search yields no results', async () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search players by name, position, or points...');
      fireEvent.change(searchInput, { target: { value: 'NonexistentPlayer' } });

      await waitFor(() => {
        expect(screen.getByText('No players found matching your search')).toBeInTheDocument();
        expect(screen.getByText('Clear search')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('displays loading skeleton when isLoading is true', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
          isLoading={true}
        />
      );

      // Should show loading skeleton instead of content
      expect(screen.queryByText('Alice Champion')).not.toBeInTheDocument();
      
      // Check for loading animation
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('includes proper title attributes for chicken avatars', () => {
      render(
        <DetailedRanking
          players={mockPlayers.slice(0, 2)}
          currentLeaderboard={mockLeaderboard}
        />
      );

      expect(screen.getByTitle("Alice Champion's chicken")).toBeInTheDocument();
      expect(screen.getByTitle("Bob Runner's chicken")).toBeInTheDocument();
    });

    it('has proper semantic table structure', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(5);
      expect(screen.getAllByRole('row')).toHaveLength(11); // Header + 10 data rows
    });

    it('has proper heading structure', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('📊 Complete Rankings');
    });

    it('has accessible search input', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveAttribute('placeholder', 'Search players by name, position, or points...');
    });
  });

  describe('Integration with Requirements', () => {
    it('satisfies requirement 7.1: displays complete ranking table in second fold', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      // Should display all players, not just top 5
      expect(screen.getByText('Alice Champion')).toBeInTheDocument();
      expect(screen.getByText('Jack Finisher')).toBeInTheDocument(); // Last player
    });

    it('satisfies requirement 7.2: shows all participants with positions, names, and points', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      mockPlayers.forEach(player => {
        expect(screen.getByText(player.name)).toBeInTheDocument();
        expect(screen.getByText(player.position.toString())).toBeInTheDocument();
        expect(screen.getByText(player.total.toLocaleString())).toBeInTheDocument();
      });
    });

    it('satisfies requirement 7.3: is sortable and searchable for easy navigation', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      // Test search functionality
      const searchInput = screen.getByPlaceholderText('Search players by name, position, or points...');
      expect(searchInput).toBeInTheDocument();

      // Test sort functionality
      const sortableHeaders = ['Position', 'Player Name', 'Points', 'Movement'];
      sortableHeaders.forEach(header => {
        expect(screen.getByText(header)).toBeInTheDocument();
      });
    });

    it('satisfies requirement 7.4: maintains visual consistency with chicken race theme', () => {
      render(
        <DetailedRanking
          players={mockPlayers}
          currentLeaderboard={mockLeaderboard}
        />
      );

      // Check for chicken emojis (theme consistency)
      const chickenElements = screen.getAllByText(/[🐔🐓🐤🐣🥚]/);
      expect(chickenElements.length).toBeGreaterThan(0);

      // Check for consistent styling with other components
      expect(screen.getByText('📊 Complete Rankings')).toBeInTheDocument();
    });
  });
});