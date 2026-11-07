/** Keep a popup inside the viewport and clear of persistent player controls. */
export function popupPosition(
    point: readonly [number, number],
    size: { width: number; height: number },
    viewport: { width: number; height: number },
    bottomInset = 96
): [number, number] {
    const margin = 4;
    return [
        Math.max(
            margin,
            Math.min(point[0], viewport.width - size.width - margin)
        ),
        Math.max(
            margin,
            Math.min(
                point[1],
                viewport.height - bottomInset - size.height - margin
            )
        ),
    ];
}
