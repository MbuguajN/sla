"use client";

import React, { useState, useRef, useLayoutEffect, cloneElement } from 'react';
import Link from 'next/link';

type NavItem = {
    id: string | number;
    icon: React.ReactElement;
    label?: string;
    href?: string;
    onClick?: () => void;
};

type LimelightNavProps = {
    items: NavItem[];
    defaultActiveIndex?: number;
    onTabChange?: (index: number) => void;
    className?: string;
    limelightClassName?: string;
    iconContainerClassName?: string;
    iconClassName?: string;
    activeColor?: string;
};

/**
 * An adaptive-width navigation bar with a "limelight" effect that highlights the active item.
 */
export const LimelightNav = ({
    items,
    defaultActiveIndex = 0,
    onTabChange,
    className,
    limelightClassName,
    iconContainerClassName,
    iconClassName,
    activeColor = '#be1e3d', // Set default to the requested color
}: LimelightNavProps) => {
    const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
    const [isReady, setIsReady] = useState(false);
    const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
    const limelightRef = useRef<HTMLDivElement | null>(null);

    // Sync internal activeIndex with prop changes
    React.useEffect(() => {
        setActiveIndex(defaultActiveIndex);
    }, [defaultActiveIndex]);

    useLayoutEffect(() => {
        if (items.length === 0) return;

        const limelight = limelightRef.current;
        const activeItem = navItemRefs.current[activeIndex];

        if (limelight && activeItem) {
            const newLeft = activeItem.offsetLeft + activeItem.offsetWidth / 2 - limelight.offsetWidth / 2;
            limelight.style.left = `${newLeft}px`;

            if (!isReady) {
                setTimeout(() => setIsReady(true), 50);
            }
        }
    }, [activeIndex, isReady, items]);

    if (items.length === 0) {
        return null;
    }

    const handleItemClick = (index: number, itemOnClick?: () => void) => {
        setActiveIndex(index);
        onTabChange?.(index);
        itemOnClick?.();
    };

    return (
        <nav className={`relative inline-flex items-center h-14 rounded-2xl bg-base-100/50 backdrop-blur-xl border border-base-content/10 px-2 shadow-sm ${className}`}>
            {items.map(({ id, icon, label, href, onClick }, index) => {
                const Tag = href ? Link : 'a';
                return (
                    <Tag
                        key={id}
                        href={href || '#'}
                        ref={el => { navItemRefs.current[index] = el as any; }}
                        className={`relative z-20 flex h-full cursor-pointer items-center justify-center px-6 gap-2 transition-colors duration-300 ${iconContainerClassName}`}
                        onClick={(e) => {
                            if (!href) e.preventDefault();
                            handleItemClick(index, onClick);
                        }}
                    >
                        {cloneElement(icon as React.ReactElement<any>, {
                            className: `w-5 h-5 transition-all duration-300 ${activeIndex === index ? 'opacity-100 scale-110' : 'opacity-40 grayscale group-hover:grayscale-0'
                                } ${(icon.props as any).className || ''} ${iconClassName || ''}`,
                            style: { color: activeIndex === index ? activeColor : undefined }
                        })}
                        {label && (
                            <span
                                className={`text-sm font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeIndex === index ? 'opacity-100' : 'opacity-30'
                                    }`}
                                style={{ color: activeIndex === index ? activeColor : undefined }}
                            >
                                {label}
                            </span>
                        )}
                    </Tag>
                );
            })}

            {/* Limelight Effect */}
            <div
                ref={limelightRef}
                className={`absolute top-0 z-10 w-12 h-[3px] rounded-full ${isReady ? 'transition-[left] duration-500 cubic-bezier(0.23, 1, 0.32, 1)' : ''
                    } ${limelightClassName}`}
                style={{
                    left: '-999px',
                    backgroundColor: activeColor,
                    boxShadow: `0 35px 20px -5px ${activeColor}`
                }}
            >
                <div
                    className="absolute left-[-40%] top-[3px] w-[180%] h-12 [clip-path:polygon(10%_100%,30%_0,70%_0,90%_100%)] pointer-events-none opacity-40 transition-opacity duration-300"
                    style={{
                        background: `gradient(linear, left top, left bottom, from(${activeColor}), to(transparent))`,
                        backgroundImage: `linear-gradient(to bottom, ${activeColor}, transparent)`
                    }}
                />
            </div>
        </nav>
    );
};
