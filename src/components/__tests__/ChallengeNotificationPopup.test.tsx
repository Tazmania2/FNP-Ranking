/**
 * Unit tests for Challenge Notification Popup component
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChallengeNotificationPopup } from '../ChallengeNotificationPopup';
import type { ChallengeCompletionEvent } from '../../services/sseClientService';

describe('ChallengeNotificationPopup Unit Tests', () => {
  const mockEvent: ChallengeCompletionEvent = {
    id: 'test-event-1',
    playerId: 'player-123',
    playerName: 'John Doe',
    challengeId: 'challenge-456',
    challengeName: 'Complete Daily Tasks',
    completedAt: '2024-01-08T10:30:00.000Z',
    points: 100,
    timestamp: '2024-01-08T10:30:00.000Z'
  };

  const mockOnDismiss = () => {};

  it('renders with all required information', () => {
    render(
      <ChallengeNotificationPopup
        notification={mockEvent}
        onDismiss={mockOnDismiss}
      />
    );

    // Check that all required elements are present
    expect(screen.getByTestId('challenge-notification-popup')).toBeInTheDocument();
    expect(screen.getByTestId('notification-player-name')).toBeInTheDocument();
    expect(screen.getByTestId('notification-challenge-name')).toBeInTheDocument();
    expect(screen.getByTestId('notification-points')).toBeInTheDocument();
    expect(screen.getByTestId('notification-celebration')).toBeInTheDocument();

    // Check content
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Complete Daily Tasks')).toBeInTheDocument();
    expect(screen.getByText('+100')).toBeInTheDocument();
    expect(screen.getByText('Challenge Completed!')).toBeInTheDocument();
  });

  it('renders without points when points are not provided', () => {
    const eventWithoutPoints = { ...mockEvent, points: undefined };
    
    render(
      <ChallengeNotificationPopup
        notification={eventWithoutPoints}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByTestId('challenge-notification-popup')).toBeInTheDocument();
    expect(screen.queryByTestId('notification-points')).not.toBeInTheDocument();
  });

  it('applies correct position classes', () => {
    const { rerender } = render(
      <ChallengeNotificationPopup
        notification={mockEvent}
        position="top-right"
        onDismiss={mockOnDismiss}
      />
    );

    let popup = screen.getByTestId('challenge-notification-popup');
    expect(popup).toHaveClass('top-4', 'right-4');

    rerender(
      <ChallengeNotificationPopup
        notification={mockEvent}
        position="top-center"
        onDismiss={mockOnDismiss}
      />
    );

    popup = screen.getByTestId('challenge-notification-popup');
    expect(popup).toHaveClass('top-4', 'left-1/2');

    rerender(
      <ChallengeNotificationPopup
        notification={mockEvent}
        position="center"
        onDismiss={mockOnDismiss}
      />
    );

    popup = screen.getByTestId('challenge-notification-popup');
    expect(popup).toHaveClass('top-1/2', 'left-1/2');
  });

  it('includes responsive design classes', () => {
    render(
      <ChallengeNotificationPopup
        notification={mockEvent}
        onDismiss={mockOnDismiss}
      />
    );

    const popup = screen.getByTestId('challenge-notification-popup');
    expect(popup).toHaveClass('responsive-container');
    
    const card = popup.querySelector('.responsive-card');
    expect(card).toBeInTheDocument();
  });
});