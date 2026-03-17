"use client";

import { useEffect, useRef } from "react";

export default function Masonry({
    children,
    gap = 20,
    minColumnWidth = 300,
}: {
    children: React.ReactNode[];
    gap?: number;
    minColumnWidth?: number;
}) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleLayout = () => {
            const containerWidth = container.offsetWidth;

            // Calculate number of columns based on container width
            let numColumns = Math.floor(
                (containerWidth + gap) / (minColumnWidth + gap)
            );
            numColumns = Math.max(1, numColumns);

            // Calculate actual column width
            const columnWidth =
                (containerWidth - (numColumns - 1) * gap) / numColumns;

            // Get all masonry items
            const items = Array.from(container.children) as HTMLElement[];

            // Set consistent width for all items
            items.forEach((item) => {
                item.style.width = `${columnWidth}px`;
            });

            // Track column heights
            const columnHeights = new Array(numColumns).fill(0);

            items.forEach((item) => {
                // Get item height after setting width
                const height = item.offsetHeight;

                // Find shortest column
                const minHeight = Math.min(...columnHeights);
                const columnIndex = columnHeights.indexOf(minHeight);

                // Position item
                item.style.transform = `translate(${columnIndex * (columnWidth + gap)}px, ${minHeight}px)`;

                // Update column height
                columnHeights[columnIndex] += height + gap;
            });

            // Set container height
            const maxHeight = Math.max(...columnHeights) - gap;
            container.style.height = `${maxHeight}px`;
        };

        // Initial layout
        handleLayout();

        // Setup ResizeObserver
        const resizeObserver = new ResizeObserver(handleLayout);
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [children, gap, minColumnWidth]);

    return (
        <div ref={containerRef} className="relative w-full overflow-y-auto">
            {children.map((child, index) => (
                <div
                    key={index}
                    className="absolute h-auto w-auto transition-all duration-300"
                    style={{ willChange: "transform" }}
                >
                    {child}
                </div>
            ))}
        </div>
    );
}
