// Resizable Sidebar Hook

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseResizableOptions {
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
}

interface UseResizableReturn {
  width: number;
  isResizing: boolean;
  startResize: (e: React.MouseEvent | React.TouchEvent) => void;
}

export function useResizable({
  minWidth,
  maxWidth,
  defaultWidth,
}: UseResizableOptions): UseResizableReturn {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Handle mouse/touch move
  const handleMove = useCallback((clientX: number) => {
    if (!isResizing) return;

    const delta = clientX - startXRef.current;
    const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
    setWidth(newWidth);
  }, [isResizing, minWidth, maxWidth]);

  // Handle resize end
  const handleEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Start resize
  const startResize = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    startWidthRef.current = width;
  }, [width]);

  // Add/remove event listeners
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleEnd);

    // Prevent text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, handleMove, handleEnd]);

  return {
    width,
    isResizing,
    startResize,
  };
}
