"use client";

import { motion, useTransform, useMotionValue, useSpring } from "motion/react";
import React from "react";

type Item = {
    id: number;
    name: string;
    designation: string;
    image?: string;
    color?: string;
};

const TooltipItem = ({ item }: { item: Item }) => {
    const x = useMotionValue(0);

    const rotate = useSpring(useTransform(x, [-100, 100], [-45, 45]), {
        stiffness: 100,
        damping: 15,
    });

    const translateX = useSpring(useTransform(x, [-100, 100], [-50, 50]), {
        stiffness: 100,
        damping: 15,
    });

    return (
        <div className="group relative">
            <motion.div
                style={{ translateX, rotate, backgroundColor: "#be1e3d" }}
                className="pointer-events-none absolute -top-16 left-1/2 hidden -translate-x-1/2 flex-col items-center rounded-md px-4 py-2 text-xs shadow-xl group-hover:flex z-50"
            >
                <p className="whitespace-nowrap text-sm font-medium text-white">
                    {item.name}
                </p>
                <p className="whitespace-nowrap text-xs text-white/90">
                    {item.designation}
                </p>
            </motion.div>

            {item.image ? (
                <img
                    onMouseMove={(e) =>
                        x.set(e.nativeEvent.offsetX - e.currentTarget.offsetWidth / 2)
                    }
                    src={item.image}
                    alt={item.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full border-2 border-base-100 object-cover object-top transition duration-500 group-hover:z-30 group-hover:scale-105"
                />
            ) : (
                <div
                    onMouseMove={(e) =>
                        x.set(e.nativeEvent.offsetX - e.currentTarget.offsetWidth / 2)
                    }
                    className={`h-8 w-8 rounded-full border-2 border-base-100 flex items-center justify-center text-[10px] font-bold text-white transition duration-500 group-hover:z-30 group-hover:scale-105 ${item.color || 'bg-neutral'}`}
                >
                    {item.name.charAt(0)}
                </div>
            )}
        </div>
    );
};

const AnimatedTooltipMotion = ({ items }: { items: Item[] }) => {
    return (
        <div className="flex items-center justify-center -space-x-2">
            {items.map((item) => (
                <TooltipItem key={item.id} item={item} />
            ))}
        </div>
    );
};

export default AnimatedTooltipMotion;
