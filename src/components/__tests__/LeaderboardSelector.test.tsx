import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LeaderboardSelector } from '../LeaderboardSelector';
import { useLeaderboards, useCurrentLeaderboardId } from '../../store/leaderboardStore';
import { useAutoCycle } from '../../store/uiStore';
import { appStoreActions } from '../../store/appStore';
import type { Leaderboard, AutoCycleState } from '../../types';

// Mock the store hooks
vi.mock('../../store/leaderboardStore');
vi.mock('../../store/uiStore');
vi.mock('../../store/appStore');

const mockUseLeaderboards = vi.mocked(useLeaderboards);
const mockUseCurrentLeaderboardId = vi.mocked(useCurrentLeaderboardId);
const mockUseAutoCycle = vi.mocked(useAutoCycle);
const mockAppStoreActions = vi.mocked(appStoreActions);

// Mock leaderboards data
const mockLeaderboards: Leaderboard[] = [
  {
    _id: 'lb1',
    title: 'Weekly Challenge',
    description: 'Weekly leaderboard for challenges',
    principalType: 0,
    operation: {
      type: 1,
      achievement_type: 1,
      item: 'points',
      sort: -1,
    },
    period: {
      type: 1,
      timeAmount: 7,
      timeScale: 1,
    },
  },
  {
    _id: 'lb2',
    title: 'Monthly Competition',
    description: 'Monthly leaderboard for competitions',
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
  },
  {
    _id: 'lb3',
    title: 'Daily Sprint',
    description: 'Daily leaderboard for sprints',
    principalType: 0,
    operation: {
      type: 1,
      achievement_type: 1,
      item: 'points',
      sort: -1,
    },
    period: {
      type: 1,
      timeAmount: 1,
      timeScale: 1,
    },
  },
];

const mockAutoCycleState: AutoCycleState = {
  isEnabled: false,
  currentIndex: 0,
  nextSwitchTime: 0,
  intervalId: null,
};

describe('LeaderboardSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseLeaderboards.mockReturnValue(mockLeaderboards);
    mockUseCurrentLeaderboardId.mockReturnValue('lb1');
    mockUseAutoCycle.mockReturnValue(mockAutoCycleState);
    
    // Mock appStoreActions methods
    mockAppStoreActions.switchToLeaderboard = vi.fn();
    mockAppStoreActions.setAutoCycling = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Dropdown Functionality', () => {
    it('should render the current leaderboard title', () => {
      render(<LeaderboardSelector />);
      
      expect(screen.getByText('Weekly Challenge')).toBeInTheDocument();
    });

    it('should show "Select Leaderboard" when no current leaderboard is selected', () => {
      mockUseCurrentLeaderboardId.mockReturnValue(null);
      
      render(<LeaderboardSelector />);
      
      expect(screen.getByText('Select Leaderboard')).toBeInTheDocument();
    });

    it('should open dropdown when clicked', () => {
      render(<LeaderboardSelector />);
      
      const dropdownButton = screen.getByRole('button', { name: /weekly challenge/i });
      fireEvent.click(dropdownButton);
      
      expect(screen.getByText('Monthly Competition')).toBeInTheDocument();
      expect(screen.getByText('Daily Sprint')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', () => {
      render(<LeaderboardSelector />);
      
      const dropdownButton = screen.getByRole('button', { name: /weekly challenge/i });
      fireEvent.click(dropdownButton);
      
      // Verify dropdown is open
      expect(screen.getByText('Monthly Competition')).toBeInTheDocument();
      
      // Click outside using mousedown event
      fireEvent.mouseDown(document.body);
      
      expect(screen.queryByText('Monthly Competition')).not.toBeInTheDocument();
    });

    it('should highlight the currently selected leaderboard', () => {
      render(<LeaderboardSelector />);
      
      const dropdownButton = screen.getByRole('button', { name: /weekly challenge/i });
      fireEvent.click(dropdownButton);
      
      const currentOption = screen.getByRole('option', { name: /weekly challenge/i });
      expect(currentOption).toHaveClass('bg-blue-50', 'text-blue-700', 'font-medium');
    });

    it('should call switchToLeaderboard when selecting a different leaderboard', () => {
      render(<LeaderboardSelector />);
      
      const dropdownButton = screen.getByRole('button', { name: /weekly challenge/i });
      fireEvent.click(dropdownButton);
      
      const monthlyOption = screen.getByRole('option', { name: /monthly competition/i });
      fireEvent.click(monthlyOption);
      
      expect(mockAppStoreActions.switchToLeaderboard).toHaveBeenCalledWith('lb2');
    });

    it('should call onLeaderboardChange callback when provided', () => {
      const onLeaderboardChange = vi.fn();
      render(<LeaderboardSelector onLeaderboardChange={onLeaderboardChange} />);
      
      const dropdownButton = screen.getByRole('button', { name: /weekly challenge/i });
      fireEvent.click(dropdownButton);
      
      const monthlyOption = screen.getByRole('option', { name: /monthly competition/i });
      fireEvent.click(monthlyOption);
      
      expect(onLeaderboardChange).toHaveBeenCalledWith('lb2');
    });

    it('should not call switchToLeaderboard when selecting the same leaderboard', () => {
      render(<LeaderboardSelector />);
      
      const dropdownButton = screen.getByRole('button', { name: /weekly challenge/i });
      fireEvent.click(dropdownButton);
      
      const currentOption = screen.getByRole('option', { name: /weekly challenge/i });
      fireEvent.click(currentOption);
      
      expect(mockAppStoreActions.switchToLeaderboard).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Cycle Functionality', () => {
    it('should show auto-cycle toggle when multiple leaderboards are available', () => {
      render(<LeaderboardSelector />);
      
      expect(screen.getByRole('button', { name: /auto cycle/i })).toBeInTheDocument();
    });

    it('should not show auto-cycle toggle when only one leaderboard is available', () => {
      mockUseLeaderboards.mockReturnValue([mockLeaderboards[0]]);
      
      render(<LeaderboardSelector />);
      
      expect(screen.queryByRole('button', { name: /auto cycle/i })).not.toBeInTheDocument();
    });

    it('should toggle auto-cycling when clicked', () => {
      render(<LeaderboardSelector />);
      
      const autoCycleButton = screen.getByRole('button', { name: /auto cycle/i });
      fireEvent.click(autoCycleButton);
      
      expect(mockAppStoreActions.setAutoCycling).toHaveBeenCalledWith(true);
    });

    it('should show enabled state when auto-cycling is active', () => {
      mockUseAutoCycle.mockReturnValue({
        ...mockAutoCycleState,
        isEnabled: true,
      });
      
      render(<LeaderboardSelector />);
      
      const autoCycleButton = screen.getByRole('button', { name: /auto cycle/i });
      expect(autoCycleButton).toHaveClass('bg-green-100', 'text-green-700');
    });

    it('should show disabled state when auto-cycling is inactive', () => {
      render(<LeaderboardSelector />);
      
      const autoCycleButton = screen.getByRole('button', { name: /auto cycle/i });
      expect(autoCycleButton).toHaveClass('bg-gray-100', 'text-gray-700');
    });
  });

  describe('Countdown Timer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show countdown timer when auto-cycling is enabled', () => {
      const nextSwitchTime = Date.now() + 300000; // 5 minutes from now
      
      mockUseAutoCycle.mockReturnValue({
        ...mockAutoCycleState,
        isEnabled: true,
        nextSwitchTime,
      });
      
      render(<LeaderboardSelector />);
      
      expect(screen.getByText('5:00')).toBeInTheDocument();
    });

    it('should not show countdown timer when auto-cycling is disabled', () => {
      render(<LeaderboardSelector />);
      
      expect(screen.queryByText(/\d+:\d+/)).not.toBeInTheDocument();
    });

    it('should display correct countdown format', () => {
      const nextSwitchTime = Date.now() + 125000; // 2 minutes 5 seconds from now
      
      mockUseAutoCycle.mockReturnValue({
        ...mockAutoCycleState,
        isEnabled: true,
        nextSwitchTime,
      });
      
      render(<LeaderboardSelector />);
      
      // Should display the countdown in MM:SS format
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('should format time correctly', () => {
      const nextSwitchTime = Date.now() + 125000; // 2 minutes 5 seconds from now
      
      mockUseAutoCycle.mockReturnValue({
        ...mockAutoCycleState,
        isEnabled: true,
        nextSwitchTime,
      });
      
      render(<LeaderboardSelector />);
      
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('should not show countdown timer when time has expired', () => {
      const nextSwitchTime = Date.now() - 1000; // 1 second ago
      
      mockUseAutoCycle.mockReturnValue({
        ...mockAutoCycleState,
        isEnabled: true,
        nextSwitchTime,
      });
      
      render(<LeaderboardSelector />);
      
      // When time has expired (timeRemaining = 0), the timer should not be displayed
      expect(screen.queryByText(/\d+:\d+/)).not.toBeInTheDocument();
    });
  });

  describe('Status Indicator', () => {
    it('should show status indicator when auto-cycling is enabled', () => {
      mockUseAutoCycle.mockReturnValue({
        ...mockAutoCycleState,
        isEnabled: true,
        currentIndex: 1,
      });
      
      render(<LeaderboardSelector />);
      
      expect(screen.getByText('2 of 3')).toBeInTheDocument();
    });

    it('should not show status indicator when auto-cycling is disabled', () => {
      render(<LeaderboardSelector />);
      
      expect(screen.queryByText(/\d+ of \d+/)).not.toBeInTheDocument();
    });

    it('should show correct current index', () => {
      mockUseAutoCycle.mockReturnValue({
        ...mockAutoCycleState,
        isEnabled: true,
        currentIndex: 0,
      });
      
      render(<LeaderboardSelector />);
      
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for dropdown', () => {
      render(<LeaderboardSelector />);
      
      const dropdownButton = screen.getByRole('button', { name: /weekly challenge/i });
      expect(dropdownButton).toHaveAttribute('aria-haspopup', 'listbox');
      expect(dropdownButton).toHaveAttribute('aria-expanded', 'false');
      
      fireEvent.click(dropdownButton);
      
      expect(dropdownButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper ARIA attributes for options', () => {
      render(<LeaderboardSelector />);
      
      const dropdownButton = screen.getByRole('button', { name: /weekly challenge/i });
      fireEvent.click(dropdownButton);
      
      const currentOption = screen.getByRole('option', { name: /weekly challenge/i });
      expect(currentOption).toHaveAttribute('aria-selected', 'true');
      
      const otherOption = screen.getByRole('option', { name: /monthly competition/i });
      expect(otherOption).toHaveAttribute('aria-selected', 'false');
    });

    it('should have proper titles for buttons', () => {
      render(<LeaderboardSelector />);
      
      const autoCycleButton = screen.getByRole('button', { name: /auto cycle/i });
      expect(autoCycleButton).toHaveAttribute('title', 'Enable auto-cycle');
    });

    it('should update title when auto-cycle is enabled', () => {
      mockUseAutoCycle.mockReturnValue({
        ...mockAutoCycleState,
        isEnabled: true,
      });
      
      render(<LeaderboardSelector />);
      
      const autoCycleButton = screen.getByRole('button', { name: /auto cycle/i });
      expect(autoCycleButton).toHaveAttribute('title', 'Disable auto-cycle');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<LeaderboardSelector className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});