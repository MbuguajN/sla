"use client";

import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface GlowCardProps {
    children: React.ReactNode;
    className?: string;
    glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'ruby';
    width?: string | number;
    height?: string | number;
}

const glowColorMap = {
    blue: { hue: 220, saturation: 100, lightness: 60 },
    purple: { hue: 280, saturation: 80, lightness: 60 },
    green: { hue: 140, saturation: 80, lightness: 60 },
    red: { hue: 0, saturation: 90, lightness: 60 },
    orange: { hue: 30, saturation: 90, lightness: 60 },
    ruby: { hue: 345, saturation: 80, lightness: 50 },
};

const GlowCard: React.FC<GlowCardProps> = ({
    children,
    className = '',
    glowColor = 'blue',
    width,
    height,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const { hue, saturation, lightness } = glowColorMap[glowColor];

    return (
        <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            className={cn(
                "relative overflow-hidden transition-all duration-500 group",
                "bg-base-100/50 backdrop-blur-xl",
                "border border-base-content/[0.08]",
                "rounded-3xl shadow-2xl",
                className
            )}
            style={{
                width: width ?? '100%',
                height: height ?? 'auto',
                // @ts-ignore
                '--x': `${mousePos.x}px`,
                '--y': `${mousePos.y}px`,
                '--hue': hue,
                '--sat': `${saturation}%`,
                '--light': `${lightness}%`,
            }}
        >
            {/* Background Spotlight Glow */}
            <div
                className={cn(
                    "pointer-events-none absolute inset-0 z-0 transition-opacity duration-700",
                    isHovered ? "opacity-100" : "opacity-0"
                )}
                style={{
                    background: `radial-gradient(
            400px circle at var(--x) var(--y),
            hsl(var(--hue) var(--sat) var(--light) / 0.12),
            transparent 80%
          )`,
                }}
            />

            {/* Border Spotlight - using a pseudo-border effect */}
            <div
                className={cn(
                    "pointer-events-none absolute inset-0 z-10 transition-opacity duration-700",
                    isHovered ? "opacity-100" : "opacity-0"
                )}
                style={{
                    border: '1.5px solid transparent',
                    backgroundImage: `radial-gradient(
            150px circle at var(--x) var(--y),
            hsl(var(--hue) var(--sat) var(--light) / 0.5),
            transparent 60%
          )`,
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'border-box',
                    WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    margin: '-1.5px', // Match border width to offset
                    borderRadius: 'inherit'
                }}
            />

            {/* Content wrapper to ensure z-index */}
            <div className="relative z-20 h-full w-full">
                {children}
            </div>
        </div>
    );
};

export { GlowCard };
