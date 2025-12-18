import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DailyCodeCard } from '../DailyCodeCard';
import * as useDailyCodeModule from '../../hooks/useDailyCode';

// Mock the hooks
vi.mock('../../hooks/useDailyCode');

describe('DailyCodeCard', () => {
  let mockUseDailyCode: any;

  beforeEach(() => {
    // Default mock implementations
    mockUseDailyCode = vi.spyOn(useDailyCodeModule, 'useDailyCode');
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

  it('should be always visible (persistent)', () => {
    mockUseDailyCode.mockReturnValue({
      code: 'TEST456',
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<DailyCodeCard />);

    const cardContainer = container.querySelector('.fixed');
    // Card should always be visible (no fade animation)
    expect(cardContainer).not.toHaveStyle({ opacity: '0.5' });
    expect(cardContainer).not.toHaveStyle({ opacity: '0' });
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

    const innerCard = container.querySelector('.bg-white\\/95');
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

  it('should display QR code image', () => {
    mockUseDailyCode.mockReturnValue({
      code: 'QR123',
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DailyCodeCard />);

    const qrImage = screen.getByAltText('QR Code para Check-in');
    expect(qrImage).toBeInTheDocument();
    expect(qrImage).toHaveAttribute('src', '/qrcode-checkin.png');
    expect(qrImage).toHaveClass('w-[120px]', 'h-[120px]');
  });
});
