import { useEffect, useRef, useState, useCallback } from 'react';
import type { Player, ChickenPosition } from '../types';

interface ChickenAnimation {
  playerId: string;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  animationOffset: {
    x: number;
    y: number;
    rotate: number;
    scale: number;
  };
  seed: number;
  currentFrame: number;
  lastFrameTime: number;
}

interface CanvasRendererOptions {
  players: Player[];
  chickenPositions: ChickenPosition[];
  isFullscreen: boolean;
  onChickenClick?: (playerId: string | null, x: number, y: number) => void;
  onChickenHover?: (playerId: string | null, x: number, y: number) => void;
}

interface ChickenHitBox {
  playerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const useCanvasRenderer = ({
  players,
  chickenPositions,
  isFullscreen,
  onChickenClick,
  onChickenHover,
}: CanvasRendererOptions) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const chickensRef = useRef<Map<string, ChickenAnimation>>(new Map());
  const hitBoxesRef = useRef<ChickenHitBox[]>([]);
  const lastTimeRef = useRef<number>(0);
  const hoveredChickenRef = useRef<string | null>(null);
  const [hoveredChicken, setHoveredChicken] = useState<string | null>(null);
  const spriteImageRef = useRef<HTMLImageElement | null>(null);

  // Load sprite image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      spriteImageRef.current = img;
    };
    img.src = '/images/galinha-spritesheet.png';
  }, []);

  // Calculate chicken size based on fullscreen mode
  const getChickenSize = useCallback(() => {
    return isFullscreen ? { sprite: 64, width: 64, height: 120 } : { sprite: 48, width: 48, height: 90 };
  }, [isFullscreen]);

  // Initialize chicken animations
  useEffect(() => {
    const newChickens = new Map<string, ChickenAnimation>();

    chickenPositions.forEach((position) => {
      const player = players.find(p => p._id === position.playerId);
      if (!player) return;

      const existing = chickensRef.current.get(position.playerId);
      const seed = parseInt(player._id.slice(-2), 16) || 1;

      newChickens.set(position.playerId, {
        playerId: position.playerId,
        currentX: existing?.currentX ?? position.x,
        currentY: existing?.currentY ?? position.y,
        targetX: position.x,
        targetY: position.y,
        animationOffset: existing?.animationOffset ?? { x: 0, y: 0, rotate: 0, scale: 1 },
        seed,
        currentFrame: existing?.currentFrame ?? 0,
        lastFrameTime: existing?.lastFrameTime ?? 0,
      });
    });

    chickensRef.current = newChickens;
  }, [chickenPositions, players]);

  // Draw a rounded rectangle
  const drawRoundedRect = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }, []);

  // Draw a single chicken
  const drawChicken = useCallback((
    ctx: CanvasRenderingContext2D,
    chicken: ChickenAnimation,
    player: Player,
    position: ChickenPosition,
    canvasWidth: number,
    canvasHeight: number,
    currentTime: number
  ) => {
    const sizes = getChickenSize();
    
    // Calculate actual pixel position with animation offsets
    const pixelX = (chicken.currentX / 100) * canvasWidth + chicken.animationOffset.x;
    const pixelY = (chicken.currentY / 100) * canvasHeight + chicken.animationOffset.y;

    // Center the chicken
    const centerX = pixelX;
    const centerY = pixelY;

    // Save context for transformations
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((chicken.animationOffset.rotate * Math.PI) / 180);
    ctx.scale(chicken.animationOffset.scale, chicken.animationOffset.scale);

    // Draw chicken sprite from spritesheet
    if (spriteImageRef.current) {
      // Update frame animation (every 200ms)
      if (currentTime - chicken.lastFrameTime > 200) {
        chicken.currentFrame = (chicken.currentFrame + 1) % 4;
        chicken.lastFrameTime = currentTime;
      }

      // Calculate sprite frame position (4 frames horizontally)
      const frameWidth = spriteImageRef.current.width / 4;
      const frameHeight = spriteImageRef.current.height;
      const sourceX = chicken.currentFrame * frameWidth;
      const sourceY = 0;
      
      // Calculate destination size
      const destWidth = sizes.sprite;
      const destHeight = sizes.sprite;

      // Add glow effect if hovered
      if (hoveredChickenRef.current === chicken.playerId) {
        ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
        ctx.shadowBlur = 10;
      }

      // Draw the sprite frame
      ctx.drawImage(
        spriteImageRef.current,
        sourceX, sourceY, frameWidth, frameHeight, // source rectangle
        -destWidth / 2, -destHeight / 2, destWidth, destHeight // destination rectangle
      );

      ctx.shadowBlur = 0;
    } else {
      // Fallback to emoji if sprite not loaded
      ctx.font = `${sizes.sprite}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (hoveredChickenRef.current === chicken.playerId) {
        ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
        ctx.shadowBlur = 10;
      }
      
      ctx.fillText('🐓', 0, 0);
      ctx.shadowBlur = 0;
    }

    // Calculate positions below the chicken sprite
    const spriteHeight = sizes.sprite;
    const spacingBelowSprite = 8; // Space between sprite and name
    const nameY = spriteHeight / 2 + spacingBelowSprite;
    const badgeY = nameY + (isFullscreen ? 20 : 16); // Space between name and badge

    // Draw player name
    const fontSize = isFullscreen ? 14 : 12;
    ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    
    // Background for name
    const nameMetrics = ctx.measureText(player.name);
    const namePadding = 8;
    const nameBoxWidth = Math.min(nameMetrics.width + namePadding * 2, isFullscreen ? 96 : 80);
    const nameBoxHeight = fontSize + 8;
    const nameBoxX = -nameBoxWidth / 2;
    const nameBoxY = nameY - nameBoxHeight / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    drawRoundedRect(ctx, nameBoxX, nameBoxY, nameBoxWidth, nameBoxHeight, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Name text
    ctx.fillStyle = '#1f2937';
    ctx.fillText(
      player.name.length > 12 ? player.name.substring(0, 10) + '...' : player.name,
      0,
      nameY
    );

    // Draw position badge
    const badgeSize = isFullscreen ? 28 : 22;
    
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(0, badgeY, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Badge text
    const badgeFontSize = isFullscreen ? 12 : 10;
    ctx.font = `bold ${badgeFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(position.rank), 0, badgeY);

    ctx.restore();

    // Store hitbox for interaction detection (including name and badge below)
    const totalHeight = sizes.height + (badgeY - nameY) + badgeSize / 2 + 10; // Extra padding
    hitBoxesRef.current.push({
      playerId: chicken.playerId,
      x: pixelX - sizes.width / 2,
      y: pixelY - sizes.height / 2,
      width: sizes.width,
      height: totalHeight,
    });
  }, [getChickenSize, isFullscreen, drawRoundedRect]);

  // Main render loop
  const render = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Throttle to 60fps
    if (currentTime - lastTimeRef.current < 16.67) {
      animationFrameRef.current = requestAnimationFrame(render);
      return;
    }

    const deltaTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;
    const time = currentTime * 0.001;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Clear hitboxes
    hitBoxesRef.current = [];

    // Check for reduced motion
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    // Update and draw all chickens
    chickensRef.current.forEach((chicken) => {
      const player = players.find(p => p._id === chicken.playerId);
      const position = chickenPositions.find(p => p.playerId === chicken.playerId);
      
      if (!player || !position) return;

      // Smooth position transition using easing
      const easing = 1 - Math.pow(0.01, deltaTime); // Exponential easing
      chicken.currentX += (chicken.targetX - chicken.currentX) * easing;
      chicken.currentY += (chicken.targetY - chicken.currentY) * easing;

      // Update animation offsets
      if (!prefersReducedMotion) {
        const seed = chicken.seed;
        chicken.animationOffset = {
          x: Math.sin(time * 0.5 + seed) * 2,
          y: Math.cos(time * 0.7 + seed) * 1.5,
          rotate: Math.sin(time * 0.3 + seed) * 1,
          scale: 1 + Math.sin(time * 0.8 + seed) * 0.02,
        };
      }

      drawChicken(ctx, chicken, player, position, canvas.width, canvas.height, currentTime);
    });

    animationFrameRef.current = requestAnimationFrame(render);
  }, [players, chickenPositions, drawChicken]);

  // Handle canvas resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set actual canvas size (accounting for device pixel ratio)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Set display size (css pixels)
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Scale context to match device pixel ratio
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  // Detect chicken at position
  const detectChickenAt = useCallback((x: number, y: number): string | null => {
    // Check from top to bottom (reverse order) to match z-index behavior
    for (let i = hitBoxesRef.current.length - 1; i >= 0; i--) {
      const hitBox = hitBoxesRef.current[i];
      if (
        x >= hitBox.x &&
        x <= hitBox.x + hitBox.width &&
        y >= hitBox.y &&
        y <= hitBox.y + hitBox.height
      ) {
        return hitBox.playerId;
      }
    }
    return null;
  }, []);

  // Handle mouse move
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const playerId = detectChickenAt(x, y);
    
    if (playerId !== hoveredChickenRef.current) {
      hoveredChickenRef.current = playerId;
      setHoveredChicken(playerId);
      
      if (playerId && onChickenHover) {
        onChickenHover(playerId, x, y);
      } else if (!playerId && onChickenHover) {
        onChickenHover(null, x, y);
      }
    }

    // Update cursor style
    canvas.style.cursor = playerId ? 'pointer' : 'default';
  }, [detectChickenAt, onChickenHover]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    hoveredChickenRef.current = null;
    setHoveredChicken(null);
    
    if (onChickenHover) {
      onChickenHover(null, 0, 0);
    }

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  }, [onChickenHover]);

  // Handle click
  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const playerId = detectChickenAt(x, y);
    
    if (playerId && onChickenClick) {
      onChickenClick(playerId, x, y);
    }
  }, [detectChickenAt, onChickenClick]);

  // Start animation loop
  useEffect(() => {
    handleResize();
    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render, handleResize]);

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return {
    canvasRef,
    hoveredChicken,
    handleMouseMove,
    handleMouseLeave,
    handleClick,
  };
};

