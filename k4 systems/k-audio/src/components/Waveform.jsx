import React, { useRef, useEffect } from 'react';

export default function Waveform({ peaks, width, height, color }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks || peaks.length === 0) return;
    const ctx = canvas.getContext('2d');
    const W = Math.floor(width);
    const H = Math.floor(height);
    if (W <= 0 || H <= 0) return;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    const mid = H / 2;
    const step = peaks.length / W;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();

    for (let x = 0; x < W; x++) {
      const idx = Math.floor(x * step);
      if (idx >= peaks.length) break;
      const [min, max] = peaks[idx];
      const yMin = mid - max * mid;
      const yMax = mid - min * mid;
      ctx.moveTo(x + 0.5, yMin);
      ctx.lineTo(x + 0.5, yMax);
    }

    ctx.stroke();
    ctx.globalAlpha = 1;
  }, [peaks, width, height, color]);

  return (
    <canvas
      ref={canvasRef}
      className="waveform-canvas"
      width={Math.floor(width)}
      height={Math.floor(height)}
    />
  );
}
