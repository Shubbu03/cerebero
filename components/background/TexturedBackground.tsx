"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TexturedBackgroundProps {
  className?: string;
  intensity?: number;
  color?: string;
  as?: React.ElementType;
  children?: React.ReactNode;
  animated?: boolean;
  dotPattern?: boolean;
}

export function TexturedBackground({
  className,
  intensity = 0.3,
  color = "#111111",
  as: Component = "div",
  children,
  animated = false,
  dotPattern = false,
}: TexturedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !mounted) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateCanvasSize = () => {
      if (!containerRef.current || !canvasRef.current) return;

      const container = containerRef.current;
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      generateNoise();
    };

    const generateNoise = () => {
      const { width, height } = canvas;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * intensity - intensity / 2;
        data[i] = Math.max(0, Math.min(255, data[i] + noise * 255));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 255));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 255));
      }

      ctx.putImageData(imageData, 0, 0);

      if (dotPattern) {
        drawDotPattern(ctx, width, height);
      }
    };

    const drawDotPattern = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number
    ) => {
      const dotSize = 1;
      const spacing = 20;
      const dotColor = "rgba(255, 230, 0, 0.2)";

      ctx.fillStyle = dotColor;

      for (let x = spacing; x < width; x += spacing) {
        for (let y = spacing; y < height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(containerRef.current);

    window.addEventListener("resize", updateCanvasSize);

    document.addEventListener("visibilitychange", updateCanvasSize);

    let animationFrame: number;
    if (animated) {
      const animateNoise = () => {
        generateNoise();
        animationFrame = requestAnimationFrame(animateNoise);
      };
      animationFrame = requestAnimationFrame(animateNoise);
    }

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      document.removeEventListener("visibilitychange", updateCanvasSize);
      resizeObserver.disconnect();
      if (animated && animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [color, intensity, animated, dotPattern, mounted]);

  return (
    <Component ref={containerRef} className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.9 }}
      />
      <div className="relative z-10">{children}</div>
    </Component>
  );
}
