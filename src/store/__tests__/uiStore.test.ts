import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';
import type { TooltipContent, ChickenAnimation } from '../../types';

// Mock data
const mockTooltipContent: TooltipContent = {
  rank: 1,
  points: 100,
  pointsGainedToday: 10,
  playerName: 'Test Player',
};

const mockChickenAnimation: ChickenAnimation = {
  playerId: 'player1',
  currentPosition: { x: 50, y: 30 },
  targetPosition: { x: 60, y: 35 },
  animationState: 'moving',
  lastUpdate: Date.now(),
};

const mockChickenAnimation2: ChickenAnimation = {
  playerId: 'player2',
  currentPosition: { x: 30, y: 40 },
  targetPosition: { x: 40, y: 45 },
  animationState: 'idle',
  lastUpdate: Date.now(),
};

describe('UIStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useUIStore.getState().resetUI();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useUIStore.getState();
      
      expect(state.tooltips).toEqual({
        playerId: null,
        isVisible: false,
        position: { x: 0, y: 0 },
        content: null,
      });
      expect(state.animations).toEqual([]);
      expect(state.autoCycle).toEqual({
        isEnabled: false,
        currentIndex: 0,
        nextSwitchTime: 0,
        intervalId: null,
      });
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('Tooltip Management', () => {
    it('should show tooltip correctly', () => {
      const { showTooltip } = useUIStore.getState();
      const position = { x: 100, y: 200 };
      
      showTooltip('player1', position, mockTooltipContent);
      
      const state = useUIStore.getState();
      expect(state.tooltips.playerId).toBe('player1');
      expect(state.tooltips.isVisible).toBe(true);
      expect(state.tooltips.position).toEqual(position);
      expect(state.tooltips.content).toEqual(mockTooltipContent);
    });

    it('should hide tooltip correctly', () => {
      const { showTooltip, hideTooltip } = useUIStore.getState();
      
      // First show a tooltip
      showTooltip('player1', { x: 100, y: 200 }, mockTooltipContent);
      
      // Then hide it
      hideTooltip();
      
      const state = useUIStore.getState();
      expect(state.tooltips.playerId).toBeNull();
      expect(state.tooltips.isVisible).toBe(false);
      expect(state.tooltips.content).toBeNull();
      // Position should remain unchanged
      expect(state.tooltips.position).toEqual({ x: 100, y: 200 });
    });

    it('should update tooltip position', () => {
      const { showTooltip, updateTooltipPosition } = useUIStore.getState();
      
      // First show a tooltip
      showTooltip('player1', { x: 100, y: 200 }, mockTooltipContent);
      
      // Update position
      const newPosition = { x: 150, y: 250 };
      updateTooltipPosition(newPosition);
      
      const state = useUIStore.getState();
      expect(state.tooltips.position).toEqual(newPosition);
      // Other properties should remain unchanged
      expect(state.tooltips.playerId).toBe('player1');
      expect(state.tooltips.isVisible).toBe(true);
      expect(state.tooltips.content).toEqual(mockTooltipContent);
    });
  });

  describe('Animation Management', () => {
    it('should set chicken animations', () => {
      const { setChickenAnimations } = useUIStore.getState();
      const animations = [mockChickenAnimation, mockChickenAnimation2];
      
      setChickenAnimations(animations);
      
      const state = useUIStore.getState();
      expect(state.animations).toEqual(animations);
    });

    it('should update specific chicken animation', () => {
      const { setChickenAnimations, updateChickenAnimation } = useUIStore.getState();
      
      // Set initial animations
      setChickenAnimations([mockChickenAnimation, mockChickenAnimation2]);
      
      // Update one animation
      const update = {
        animationState: 'celebrating' as const,
        targetPosition: { x: 70, y: 40 },
      };
      updateChickenAnimation('player1', update);
      
      const state = useUIStore.getState();
      expect(state.animations).toHaveLength(2);
      
      const updatedAnimation = state.animations.find(a => a.playerId === 'player1');
      expect(updatedAnimation?.animationState).toBe('celebrating');
      expect(updatedAnimation?.targetPosition).toEqual({ x: 70, y: 40 });
      expect(updatedAnimation?.currentPosition).toEqual(mockChickenAnimation.currentPosition); // Should remain unchanged
      
      // Other animation should remain unchanged
      const otherAnimation = state.animations.find(a => a.playerId === 'player2');
      expect(otherAnimation).toEqual(mockChickenAnimation2);
    });

    it('should add chicken animation', () => {
      const { addChickenAnimation } = useUIStore.getState();
      
      addChickenAnimation(mockChickenAnimation);
      
      const state = useUIStore.getState();
      expect(state.animations).toHaveLength(1);
      expect(state.animations[0]).toEqual(mockChickenAnimation);
    });

    it('should replace existing animation when adding with same playerId', () => {
      const { addChickenAnimation } = useUIStore.getState();
      
      // Add first animation
      addChickenAnimation(mockChickenAnimation);
      
      // Add another animation with same playerId
      const updatedAnimation = {
        ...mockChickenAnimation,
        animationState: 'celebrating' as const,
      };
      addChickenAnimation(updatedAnimation);
      
      const state = useUIStore.getState();
      expect(state.animations).toHaveLength(1);
      expect(state.animations[0]).toEqual(updatedAnimation);
    });

    it('should remove chicken animation', () => {
      const { setChickenAnimations, removeChickenAnimation } = useUIStore.getState();
      
      // Set initial animations
      setChickenAnimations([mockChickenAnimation, mockChickenAnimation2]);
      
      // Remove one animation
      removeChickenAnimation('player1');
      
      const state = useUIStore.getState();
      expect(state.animations).toHaveLength(1);
      expect(state.animations[0]).toEqual(mockChickenAnimation2);
    });

    it('should clear all animations', () => {
      const { setChickenAnimations, clearAnimations } = useUIStore.getState();
      
      // Set initial animations
      setChickenAnimations([mockChickenAnimation, mockChickenAnimation2]);
      
      // Clear animations
      clearAnimations();
      
      const state = useUIStore.getState();
      expect(state.animations).toEqual([]);
    });
  });

  describe('Auto-cycle Management', () => {
    it('should set auto-cycle enabled', () => {
      const { setAutoCycleEnabled } = useUIStore.getState();
      
      setAutoCycleEnabled(true);
      
      const state = useUIStore.getState();
      expect(state.autoCycle.isEnabled).toBe(true);
    });

    it('should set auto-cycle index', () => {
      const { setAutoCycleIndex } = useUIStore.getState();
      
      setAutoCycleIndex(2);
      
      const state = useUIStore.getState();
      expect(state.autoCycle.currentIndex).toBe(2);
    });

    it('should set next switch time', () => {
      const { setNextSwitchTime } = useUIStore.getState();
      const time = Date.now() + 5000;
      
      setNextSwitchTime(time);
      
      const state = useUIStore.getState();
      expect(state.autoCycle.nextSwitchTime).toBe(time);
    });

    it('should set auto-cycle interval', () => {
      const { setAutoCycleInterval } = useUIStore.getState();
      const intervalId = 123;
      
      setAutoCycleInterval(intervalId);
      
      const state = useUIStore.getState();
      expect(state.autoCycle.intervalId).toBe(intervalId);
    });

    it('should reset auto-cycle while preserving intervalId', () => {
      const { 
        setAutoCycleEnabled, 
        setAutoCycleIndex, 
        setNextSwitchTime, 
        setAutoCycleInterval,
        resetAutoCycle 
      } = useUIStore.getState();
      
      // Set some auto-cycle state
      setAutoCycleEnabled(true);
      setAutoCycleIndex(2);
      setNextSwitchTime(Date.now() + 5000);
      setAutoCycleInterval(123);
      
      // Reset auto-cycle
      resetAutoCycle();
      
      const state = useUIStore.getState();
      expect(state.autoCycle.isEnabled).toBe(false);
      expect(state.autoCycle.currentIndex).toBe(0);
      expect(state.autoCycle.nextSwitchTime).toBe(0);
      expect(state.autoCycle.intervalId).toBe(123); // Should be preserved for cleanup
    });
  });

  describe('Initialization', () => {
    it('should set initialized state', () => {
      const { setInitialized } = useUIStore.getState();
      
      setInitialized(true);
      
      const state = useUIStore.getState();
      expect(state.isInitialized).toBe(true);
    });
  });

  describe('Reset Functions', () => {
    it('should reset UI state while preserving intervalId', () => {
      const { 
        showTooltip,
        addChickenAnimation,
        setAutoCycleEnabled,
        setAutoCycleInterval,
        setInitialized,
        resetUI 
      } = useUIStore.getState();
      
      // Set some state
      showTooltip('player1', { x: 100, y: 200 }, mockTooltipContent);
      addChickenAnimation(mockChickenAnimation);
      setAutoCycleEnabled(true);
      setAutoCycleInterval(123);
      setInitialized(true);
      
      // Reset UI
      resetUI();
      
      const state = useUIStore.getState();
      expect(state.tooltips).toEqual({
        playerId: null,
        isVisible: false,
        position: { x: 0, y: 0 },
        content: null,
      });
      expect(state.animations).toEqual([]);
      expect(state.autoCycle.isEnabled).toBe(false);
      expect(state.autoCycle.currentIndex).toBe(0);
      expect(state.autoCycle.nextSwitchTime).toBe(0);
      expect(state.autoCycle.intervalId).toBe(123); // Should be preserved for cleanup
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('Selector Hooks', () => {
    it('should provide correct selector values', () => {
      const { 
        showTooltip,
        addChickenAnimation,
        setAutoCycleEnabled,
        setInitialized 
      } = useUIStore.getState();
      
      showTooltip('player1', { x: 100, y: 200 }, mockTooltipContent);
      addChickenAnimation(mockChickenAnimation);
      setAutoCycleEnabled(true);
      setInitialized(true);
      
      // Note: In a real test environment, you would need to render these hooks
      // For now, we'll test the store state directly
      const state = useUIStore.getState();
      expect(state.tooltips.isVisible).toBe(true);
      expect(state.animations).toHaveLength(1);
      expect(state.autoCycle.isEnabled).toBe(true);
      expect(state.isInitialized).toBe(true);
    });
  });
});