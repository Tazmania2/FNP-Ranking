import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DailyCodeCard } from '../DailyCodeCard';
import * as useDailyCodeModule from '../../hooks/useDailyCode';
import * as useFadeAnimationModule from '../../hooks/useFadeAnimation';

// Mock the hooks
vi.mock('../../hooks/useDailyCode');
vi.mock('../../hooks/useFadeAnimation');

describe('DailyCodeCard', () => {
  let mockUseDailyCode: any;
  let mockUseFadeAnimation: any;

  beforeEach(() => {
    // Default mock implementations
    mockUseDailyCode = vi.spyOn(useDailyCodeModule, 'useDailyCode');
    mockUseFadeAnimation = vi.spyOn(useFadeAnimationModule, 'useFadeAnimation');

    // Default fade animation
    mockUseFadeAnimation.mockReturnValue({ opacity: 1 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render with valid code', async () => {
    mockUseDailyCode.mockReturnValue({
      code: 'ABC123',
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DailyCodeCard />);

    expect(screen.getByText('Código do Dia')).toBeInTheDocument();
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    mockUseDailyCode.mockReturnValue({
      code: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DailyCodeCard />);

    expect(screen.getByText('Código do Dia')).toBeInTheDocument();
    // Check for loading spinner (it has specific classes)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should render error state when no code is available', () => {
    mockUseDailyCode.mockReturnValue({
      code: null,
      loading: false,
      error: 'Failed to fetch code',
      refetch: vi.fn(),
    });

    render(<DailyCodeCard />);

    expect(screen.getByText('Código do Dia')).toBeInTheDocument();
    expect(screen.getByText('Erro ao carregar')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch code')).toBeInTheDocument();
  });

  it('should render code with warning when error exists but code is cached', () => {
    mockUseDailyCode.mockReturnValue({
      code: 'CACHED789',
      loading: false,
      error: 'Usando código em cache',
      refetch: vi.fn(),
    });

    render(<DailyCodeCard />);

    expect(screen.getByText('Código do Dia')).toBeInTheDocument();
    expect(screen.getByText('CACHED789')).toBeInTheDocument();
    expect(screen.getByText(/Usando código em cache/)).toBeInTheDocument();
  });

  it('should apply fade animation opacity', () => {
    mockUseDailyCode.mockReturnValue({
      code: 'TEST456',
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseFadeAnimation.mockReturnValue({ opacity: 0.5 });

    const { container } = render(<DailyCodeCard />);

    const cardContainer = container.querySelector('.fixed');
    expect(cardContainer).toHaveStyle({ opacity: '0.5' });
  });

  it('should have correct positioning classes', () => {
    mockUseDailyCode.mockReturnValue({
      code: 'POS123',
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<DailyCodeCard />);

    const cardContainer = container.querySelector('.fixed');
    expect(cardContainer).toHaveClass('bottom-4');
    expect(cardContainer).toHaveClass('right-4');
    expect(cardContainer).toHaveClass('z-50');
  });

  it('should have backdrop blur and styling', () => {
    mockUseDailyCode.mockReturnValue({
      code: 'STYLE999',
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<DailyCodeCard />);

    const innerCard = container.querySelector('.bg-white\\/90');
    expect(innerCard).toHaveClass('backdrop-blur-sm');
    expect(innerCard).toHaveClass('rounded-xl');
    expect(innerCard).toHaveClass('shadow-lg');
  });

  it('should update when code changes', async () => {
    const { rerender } = render(<DailyCodeCard />);

    mockUseDailyCode.mockReturnValue({
      code: 'FIRST111',
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    rerender(<DailyCodeCard />);
    expect(screen.getByText('FIRST111')).toBeInTheDocument();

    mockUseDailyCode.mockReturnValue({
      code: 'SECOND222',
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    rerender(<DailyCodeCard />);
    expect(screen.getByText('SECOND222')).toBeInTheDocument();
  });

  it('should transition from loading to loaded state', async () => {
    mockUseDailyCode.mockReturnValue({
      code: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { rerender } = render(<DailyCodeCard />);

    // Initially loading
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    // Update to loaded
    mockUseDailyCode.mockReturnValue({
      code: 'LOADED333',
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    rerender(<DailyCodeCard />);

    await waitFor(() => {
      expect(screen.getByText('LOADED333')).toBeInTheDocument();
    });
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('should handle fade animation cycle', () => {
    mockUseDailyCode.mockReturnValue({
      code: 'FADE555',
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    // Test different opacity values
    const opacities = [1, 0.75, 0.5, 0.25, 0];

    opacities.forEach((opacity) => {
      mockUseFadeAnimation.mockReturnValue({ opacity });

      const { container, unmount } = render(<DailyCodeCard />);

      const cardContainer = container.querySelector('.fixed');
      expect(cardContainer).toHaveStyle({ opacity: opacity.toString() });

      unmount();
    });
  });
});
