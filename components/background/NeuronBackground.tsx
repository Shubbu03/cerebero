"use client";

import { COLORS } from "@/lib/colors";
import { useEffect, useRef, useState } from "react";
import type React from "react";

type Neuron = {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  connections: number[];
  pulseSpeed: number;
  pulsePhase: number;
  color: string;
  opacity: number;
};

interface NeuralNetworkBackgroundProps {
  className?: string;
  style?: React.CSSProperties;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: () => void;
  children?: React.ReactNode;
}

export default function NeuronBackground({
  className = "",
  style = {},
  onMouseMove,
  onMouseLeave,
  children,
}: NeuralNetworkBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [reducedVisuals, setReducedVisuals] = useState(false);

  const neuronsRef = useRef<Neuron[]>([]);
  const baseNeuronCountRef = useRef<number>(0);
  const extraNeuronsRef = useRef<Neuron[]>([]);
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 767px)");

    const sync = () => {
      setReducedVisuals(motionQuery.matches || mobileQuery.matches);
    };

    sync();
    motionQuery.addEventListener("change", sync);
    mobileQuery.addEventListener("change", sync);
    return () => {
      motionQuery.removeEventListener("change", sync);
      mobileQuery.removeEventListener("change", sync);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedVisuals) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePosition({ x, y });
    setIsHovering(true);

    if (onMouseMove) {
      onMouseMove(e);
    }
  };

  const handleMouseLeave = () => {
    if (reducedVisuals) return;
    setIsHovering(false);

    if (onMouseLeave) {
      onMouseLeave();
    }
  };

  function createNeuron(width: number, height: number): Neuron {
    return {
      x: Math.random() * width * window.devicePixelRatio,
      y: Math.random() * height * window.devicePixelRatio,
      radius: Math.random() * 2 + 1,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      connections: [],
      pulseSpeed: Math.random() * 0.02 + 0.01,
      pulsePhase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.7 ? COLORS.cardinal : COLORS.silver,
      opacity: 0.6 + Math.random() * 0.4,
    };
  }

  function establishConnections(neurons: Neuron[]) {
    for (let i = 0; i < neurons.length; i++) {
      for (let j = i + 1; j < neurons.length; j++) {
        const dx = neurons[i].x - neurons[j].x;
        const dy = neurons[i].y - neurons[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150 * window.devicePixelRatio) {
          neurons[i].connections.push(j);
          neurons[j].connections.push(i);
        }
      }
    }
  }

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;

      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });

      if (canvasRef.current) {
        canvasRef.current.width = width * window.devicePixelRatio;
        canvasRef.current.height = height * window.devicePixelRatio;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    const neuronCount = Math.max(
      16,
      Math.floor((dimensions.width * dimensions.height) / 32000)
    );
    baseNeuronCountRef.current = neuronCount;
    const neurons: Neuron[] = [];

    for (let i = 0; i < neuronCount; i++) {
      neurons.push(createNeuron(dimensions.width, dimensions.height));
    }

    const extraNeurons: Neuron[] = [];
    const extraNeuronCount = Math.floor(neuronCount * 0.5);

    for (let i = 0; i < extraNeuronCount; i++) {
      const neuron = createNeuron(dimensions.width, dimensions.height);
      neuron.opacity = 0;
      extraNeurons.push(neuron);
    }

    establishConnections(neurons);

    neuronsRef.current = neurons;
    extraNeuronsRef.current = extraNeurons;

    return () => {
      window.removeEventListener("resize", updateDimensions);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [dimensions.width, dimensions.height, reducedVisuals]);

  useEffect(() => {
    if (!canvasRef.current || neuronsRef.current.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (reducedVisuals) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = COLORS.raisinBlack;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const animate = (time: number) => {
      if (!previousTimeRef.current) {
        previousTimeRef.current = time;
      }
      previousTimeRef.current = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = COLORS.raisinBlack;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const baseNeurons = neuronsRef.current;
      const extraNeurons = extraNeuronsRef.current;
      const allNeurons = [...baseNeurons, ...extraNeurons];

      extraNeurons.forEach((neuron) => {
        if (isHovering) {
          neuron.opacity = Math.min(neuron.opacity + 0.01, 0.8);
        } else {
          neuron.opacity = Math.max(neuron.opacity - 0.01, 0);
        }
      });

      allNeurons.forEach((neuron) => {
        if (neuron.opacity <= 0) return;

        const speedMultiplier = isHovering ? 1.5 : 1;
        neuron.x += neuron.vx * speedMultiplier;
        neuron.y += neuron.vy * speedMultiplier;

        if (neuron.x < 0 || neuron.x > canvas.width) neuron.vx *= -1;
        if (neuron.y < 0 || neuron.y > canvas.height) neuron.vy *= -1;

        if (isHovering) {
          const dx = mousePosition.x * window.devicePixelRatio - neuron.x;
          const dy = mousePosition.y * window.devicePixelRatio - neuron.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 200 * window.devicePixelRatio) {
            const angle = Math.atan2(dy, dx);
            const force = (200 * window.devicePixelRatio - distance) / 10000;
            neuron.vx += Math.cos(angle) * force;
            neuron.vy += Math.sin(angle) * force;

            const speed = Math.sqrt(
              neuron.vx * neuron.vx + neuron.vy * neuron.vy
            );
            if (speed > 2) {
              neuron.vx = (neuron.vx / speed) * 2;
              neuron.vy = (neuron.vy / speed) * 2;
            }
          }
        }

        neuron.pulsePhase += neuron.pulseSpeed * (isHovering ? 1.5 : 1);
        const pulseScale = 0.5 + 0.5 * Math.sin(neuron.pulsePhase);
        const radius = neuron.radius * (1 + pulseScale * 0.3);

        ctx.beginPath();
        ctx.arc(
          neuron.x,
          neuron.y,
          radius * window.devicePixelRatio,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `${neuron.color}${Math.floor(neuron.opacity * 255)
          .toString(16)
          .padStart(2, "0")}`;
        ctx.fill();

        const gradient = ctx.createRadialGradient(
          neuron.x,
          neuron.y,
          radius * 0.5 * window.devicePixelRatio,
          neuron.x,
          neuron.y,
          radius * 2 * window.devicePixelRatio
        );

        const colorWithoutHash = neuron.color.substring(1);
        gradient.addColorStop(
          0,
          `rgba(${Number.parseInt(
            colorWithoutHash.substring(0, 2),
            16
          )}, ${Number.parseInt(
            colorWithoutHash.substring(2, 4),
            16
          )}, ${Number.parseInt(colorWithoutHash.substring(4, 6), 16)}, ${
            0.3 * neuron.opacity
          })`
        );
        gradient.addColorStop(
          1,
          `rgba(${Number.parseInt(
            colorWithoutHash.substring(0, 2),
            16
          )}, ${Number.parseInt(
            colorWithoutHash.substring(2, 4),
            16
          )}, ${Number.parseInt(colorWithoutHash.substring(4, 6), 16)}, 0)`
        );

        ctx.beginPath();
        ctx.arc(
          neuron.x,
          neuron.y,
          radius * 2 * window.devicePixelRatio,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      for (let i = 0; i < allNeurons.length; i++) {
        const neuron = allNeurons[i];
        if (neuron.opacity <= 0) continue;

        for (const j of neuron.connections) {
          if (j >= allNeurons.length) continue;

          const target = allNeurons[j];
          if (target.opacity <= 0) continue;

          const dx = target.x - neuron.x;
          const dy = target.y - neuron.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150 * window.devicePixelRatio) {
            const opacity =
              (1 - distance / (150 * window.devicePixelRatio)) *
              Math.min(neuron.opacity, target.opacity);

            let lineWidth = 0.5;
            let lineOpacity = opacity * 0.3;

            if (isHovering) {
              const midX = (neuron.x + target.x) / 2;
              const midY = (neuron.y + target.y) / 2;
              const mouseDx = mousePosition.x * window.devicePixelRatio - midX;
              const mouseDy = mousePosition.y * window.devicePixelRatio - midY;
              const mouseDistance = Math.sqrt(
                mouseDx * mouseDx + mouseDy * mouseDy
              );

              if (mouseDistance < 150 * window.devicePixelRatio) {
                const mouseEffect =
                  1 - mouseDistance / (150 * window.devicePixelRatio);
                lineWidth = 0.5 + mouseEffect * 1.5;
                lineOpacity = opacity * 0.3 + mouseEffect * 0.5;
              }
            }

            let connectionColor = COLORS.silver;
            if (
              neuron.color === COLORS.cardinal &&
              target.color === COLORS.cardinal
            ) {
              connectionColor = COLORS.cardinal;
            }

            const colorWithoutHash = connectionColor.substring(1);
            ctx.beginPath();
            ctx.moveTo(neuron.x, neuron.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = `rgba(${Number.parseInt(
              colorWithoutHash.substring(0, 2),
              16
            )}, ${Number.parseInt(
              colorWithoutHash.substring(2, 4),
              16
            )}, ${Number.parseInt(
              colorWithoutHash.substring(4, 6),
              16
            )}, ${lineOpacity})`;
            ctx.lineWidth = lineWidth * window.devicePixelRatio;
            ctx.stroke();
          } else {
            neuron.connections = neuron.connections.filter(
              (conn) => conn !== j
            );
          }
        }

        for (let j = 0; j < allNeurons.length; j++) {
          if (
            i !== j &&
            !neuron.connections.includes(j) &&
            allNeurons[j].opacity > 0
          ) {
            const dx = allNeurons[j].x - neuron.x;
            const dy = allNeurons[j].y - neuron.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 120 * window.devicePixelRatio) {
              neuron.connections.push(j);
            }
          }
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isHovering, mousePosition, reducedVisuals]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: COLORS.raisinBlack, ...style }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}
