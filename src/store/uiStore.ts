import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  UIState, 
  TooltipState, 
  TooltipContent, 
  ChickenAnimation, 
  AutoCycleState 
} from '../types';

interface UIActions {
  // Tooltip management
  showTooltip: (playerId: string, position: { x: number; y: number }, content: TooltipContent) => void;
  hideTooltip: () => void;
  updateTooltipPosition: (position: { x: number; y: number }) => void;
  
  // Animation management
  setChickenAnimations: (animations: ChickenAnimation[]) => void;
  updateChickenAnimation: (playerId: string, animation: Partial<ChickenAnimation>) => void;
  addChickenAnimation: (animation: ChickenAnimation) => void;
  removeChickenAnimation: (playerId: string) => void;
  clearAnimations: () => void;
  
  // Auto-cycle management
  setAutoCycleEnabled: (enabled: boolean) => void;
  setAutoCycleIndex: (index: number) => void;
  setNextSwitchTime: (time: number) => void;
  setAutoCycleInterval: (intervalId: number | null) => void;
  resetAutoCycle: () => void;
  
  // Initialization
  setInitialized: (initialized: boolean) => void;
  
  // Reset functions
  resetUI: () => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
  tooltips: {
    playerId: null,
    isVisible: false,
    position: { x: 0, y: 0 },
    content: null,
  },
  animations: [],
  autoCycle: {
    isEnabled: false,
    currentIndex: 0,
    nextSwitchTime: 0,
    intervalId: null,
  },
  isInitialized: false,
};

export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Tooltip management actions
      showTooltip: (playerId, position, content) =>
        set(
          {
            tooltips: {
              playerId,
              isVisible: true,
              position,
              content,
            },
          },
          false,
          'ui/showTooltip'
        ),

      hideTooltip: () =>
        set(
          (state) => ({
            tooltips: {
              ...state.tooltips,
              isVisible: false,
              playerId: null,
              content: null,
            },
          }),
          false,
          'ui/hideTooltip'
        ),

      updateTooltipPosition: (position) =>
        set(
          (state) => ({
            tooltips: {
              ...state.tooltips,
              position,
            },
          }),
          false,
          'ui/updateTooltipPosition'
        ),

      // Animation management actions
      setChickenAnimations: (animations) =>
        set(
          { animations },
          false,
          'ui/setChickenAnimations'
        ),

      updateChickenAnimation: (playerId, animationUpdate) =>
        set(
          (state) => ({
            animations: state.animations.map((animation) =>
              animation.playerId === playerId
                ? { ...animation, ...animationUpdate }
                : animation
            ),
          }),
          false,
          'ui/updateChickenAnimation'
        ),

      addChickenAnimation: (animation) =>
        set(
          (state) => ({
            animations: [
              ...state.animations.filter((a) => a.playerId !== animation.playerId),
              animation,
            ],
          }),
          false,
          'ui/addChickenAnimation'
        ),

      removeChickenAnimation: (playerId) =>
        set(
          (state) => ({
            animations: state.animations.filter((a) => a.playerId !== playerId),
          }),
          false,
          'ui/removeChickenAnimation'
        ),

      clearAnimations: () =>
        set(
          { animations: [] },
          false,
          'ui/clearAnimations'
        ),

      // Auto-cycle management actions
      setAutoCycleEnabled: (enabled) =>
        set(
          (state) => ({
            autoCycle: {
              ...state.autoCycle,
              isEnabled: enabled,
            },
          }),
          false,
          'ui/setAutoCycleEnabled'
        ),

      setAutoCycleIndex: (index) =>
        set(
          (state) => ({
            autoCycle: {
              ...state.autoCycle,
              currentIndex: index,
            },
          }),
          false,
          'ui/setAutoCycleIndex'
        ),

      setNextSwitchTime: (time) =>
        set(
          (state) => ({
            autoCycle: {
              ...state.autoCycle,
              nextSwitchTime: time,
            },
          }),
          false,
          'ui/setNextSwitchTime'
        ),

      setAutoCycleInterval: (intervalId) =>
        set(
          (state) => ({
            autoCycle: {
              ...state.autoCycle,
              intervalId,
            },
          }),
          false,
          'ui/setAutoCycleInterval'
        ),

      resetAutoCycle: () =>
        set(
          (state) => ({
            autoCycle: {
              isEnabled: false,
              currentIndex: 0,
              nextSwitchTime: 0,
              intervalId: state.autoCycle.intervalId, // Keep interval to clean up
            },
          }),
          false,
          'ui/resetAutoCycle'
        ),

      // Initialization
      setInitialized: (initialized) =>
        set(
          { isInitialized: initialized },
          false,
          'ui/setInitialized'
        ),

      // Reset functions
      resetUI: () =>
        set(
          (state) => ({
            ...initialState,
            // Clean up any existing interval
            autoCycle: {
              ...initialState.autoCycle,
              intervalId: state.autoCycle.intervalId,
            },
          }),
          false,
          'ui/resetUI'
        ),
    }),
    {
      name: 'ui-store',
    }
  )
);

// Selector hooks for better performance
export const useTooltips = () => useUIStore((state) => state.tooltips);
export const useAnimations = () => useUIStore((state) => state.animations);
export const useAutoCycle = () => useUIStore((state) => state.autoCycle);
export const useIsInitialized = () => useUIStore((state) => state.isInitialized);