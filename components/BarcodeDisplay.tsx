'use client';

import { useEffect, useRef } from 'react';

interface BarcodeDisplayProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
}

export function BarcodeDisplay({ value, width = 2, height = 100, displayValue = true }: BarcodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple barcode generation (Code 128 style representation)
    // For production, consider using a library like JsBarcode
    const barWidth = width;
    const totalWidth = value.length * barWidth * 7; // Approximate width
    canvas.width = totalWidth;
    canvas.height = height + (displayValue ? 20 : 0);

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw bars
    ctx.fillStyle = 'black';
    let x = 0;

    // Start pattern
    ctx.fillRect(x, 0, barWidth, height);
    x += barWidth * 2;
    ctx.fillRect(x, 0, barWidth, height);
    x += barWidth * 2;

    // Encode each digit
    for (let i = 0; i < value.length; i++) {
      const digit = parseInt(value[i]);

      // Simple encoding pattern for each digit
      const pattern = [
        [1, 0, 1, 0], // 0
        [1, 1, 0, 0], // 1
        [0, 1, 1, 0], // 2
        [1, 0, 0, 1], // 3
        [0, 1, 0, 1], // 4
        [1, 1, 0, 1], // 5
        [0, 0, 1, 1], // 6
        [1, 0, 1, 1], // 7
        [0, 1, 1, 1], // 8
        [1, 1, 1, 0], // 9
      ][digit] || [1, 0, 1, 0];

      pattern.forEach((bar) => {
        if (bar) {
          ctx.fillRect(x, 0, barWidth, height);
        }
        x += barWidth;
      });
      x += barWidth; // Space between digits
    }

    // End pattern
    ctx.fillRect(x, 0, barWidth, height);
    x += barWidth * 2;
    ctx.fillRect(x, 0, barWidth, height);

    // Display value below barcode
    if (displayValue) {
      ctx.fillStyle = 'black';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(value, canvas.width / 2, height + 15);
    }
  }, [value, width, height, displayValue]);

  if (!value) return null;

  return <canvas ref={canvasRef} className="mx-auto" />;
}
