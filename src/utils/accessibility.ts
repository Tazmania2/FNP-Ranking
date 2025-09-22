// Accessibility utilities for Chicken Race Ranking

/**
 * Announces text to screen readers
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Manages focus for keyboard navigation
 */
export class FocusManager {
  private focusableElements: HTMLElement[] = [];
  private currentIndex = -1;
  
  constructor(container: HTMLElement) {
    this.updateFocusableElements(container);
  }
  
  updateFocusableElements(container: HTMLElement) {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
    ].join(', ');
    
    this.focusableElements = Array.from(container.querySelectorAll(selector));
    this.currentIndex = -1;
  }
  
  focusNext() {
    this.currentIndex = (this.currentIndex + 1) % this.focusableElements.length;
    this.focusableElements[this.currentIndex]?.focus();
  }
  
  focusPrevious() {
    this.currentIndex = this.currentIndex <= 0 
      ? this.focusableElements.length - 1 
      : this.currentIndex - 1;
    this.focusableElements[this.currentIndex]?.focus();
  }
  
  focusFirst() {
    this.currentIndex = 0;
    this.focusableElements[0]?.focus();
  }
  
  focusLast() {
    this.currentIndex = this.focusableElements.length - 1;
    this.focusableElements[this.currentIndex]?.focus();
  }
}

/**
 * Keyboard navigation handler
 */
export const handleKeyboardNavigation = (
  event: KeyboardEvent,
  focusManager: FocusManager,
  options: {
    onEscape?: () => void;
    onEnter?: () => void;
    onSpace?: () => void;
  } = {}
) => {
  switch (event.key) {
    case 'Tab':
      if (event.shiftKey) {
        event.preventDefault();
        focusManager.focusPrevious();
      } else {
        event.preventDefault();
        focusManager.focusNext();
      }
      break;
      
    case 'ArrowDown':
      event.preventDefault();
      focusManager.focusNext();
      break;
      
    case 'ArrowUp':
      event.preventDefault();
      focusManager.focusPrevious();
      break;
      
    case 'Home':
      event.preventDefault();
      focusManager.focusFirst();
      break;
      
    case 'End':
      event.preventDefault();
      focusManager.focusLast();
      break;
      
    case 'Escape':
      if (options.onEscape) {
        event.preventDefault();
        options.onEscape();
      }
      break;
      
    case 'Enter':
      if (options.onEnter) {
        event.preventDefault();
        options.onEnter();
      }
      break;
      
    case ' ':
      if (options.onSpace) {
        event.preventDefault();
        options.onSpace();
      }
      break;
  }
};

/**
 * Generates accessible descriptions for players
 */
export const generatePlayerDescription = (player: {
  name: string;
  position: number;
  total: number;
  move?: 'up' | 'down' | 'same';
  previous_position?: number;
}): string => {
  let description = `${player.name}, position ${player.position}, ${player.total} points`;
  
  if (player.move && player.previous_position) {
    switch (player.move) {
      case 'up':
        description += `, moved up ${player.previous_position - player.position} positions`;
        break;
      case 'down':
        description += `, moved down ${player.position - player.previous_position} positions`;
        break;
      case 'same':
        description += `, position unchanged`;
        break;
    }
  }
  
  return description;
};

/**
 * Generates accessible race status announcements
 */
export const generateRaceStatusAnnouncement = (
  players: Array<{ name: string; position: number; total: number }>,
  leaderboardTitle: string
): string => {
  if (players.length === 0) {
    return `${leaderboardTitle} leaderboard is empty`;
  }
  
  const leader = players.find(p => p.position === 1);
  const totalPlayers = players.length;
  
  return `${leaderboardTitle} leaderboard loaded with ${totalPlayers} players. Current leader is ${leader?.name || 'unknown'} with ${leader?.total || 0} points.`;
};

/**
 * Checks if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Checks if user prefers high contrast
 */
export const prefersHighContrast = (): boolean => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

/**
 * Gets appropriate ARIA role for interactive elements
 */
export const getInteractiveRole = (element: 'button' | 'link' | 'tab' | 'option'): string => {
  const roles = {
    button: 'button',
    link: 'link',
    tab: 'tab',
    option: 'option',
  };
  
  return roles[element] || 'button';
};

/**
 * Creates accessible loading announcement
 */
export const announceLoadingState = (isLoading: boolean, context: string) => {
  if (isLoading) {
    announceToScreenReader(`Loading ${context}`, 'polite');
  } else {
    announceToScreenReader(`${context} loaded`, 'polite');
  }
};

/**
 * Creates accessible error announcement
 */
export const announceError = (error: string) => {
  announceToScreenReader(`Error: ${error}`, 'assertive');
};

/**
 * Creates accessible success announcement
 */
export const announceSuccess = (message: string) => {
  announceToScreenReader(`Success: ${message}`, 'polite');
};

/**
 * Manages skip links for keyboard navigation
 */
export class SkipLinkManager {
  private skipLinks: Array<{ id: string; label: string; target: string }> = [];
  
  addSkipLink(id: string, label: string, target: string) {
    this.skipLinks.push({ id, label, target });
  }
  
  removeSkipLink(id: string) {
    this.skipLinks = this.skipLinks.filter(link => link.id !== id);
  }
  
  renderSkipLinks(): string {
    return this.skipLinks
      .map(link => `
        <a 
          href="#${link.target}" 
          class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
        >
          ${link.label}
        </a>
      `)
      .join('');
  }
}

// Default skip link manager instance
export const skipLinkManager = new SkipLinkManager();

// Initialize default skip links
skipLinkManager.addSkipLink('skip-to-main', 'Skip to main content', 'main-content');
skipLinkManager.addSkipLink('skip-to-leaderboard', 'Skip to leaderboard', 'chicken-race');
skipLinkManager.addSkipLink('skip-to-ranking', 'Skip to detailed ranking', 'detailed-ranking');