/** Decide only from the release position: a reversal or a short/vertical drag is reversible. */
export function miniPlayerSwipeDirection(
    dx: number,
    dy: number,
    vx: number,
    width: number
): -1 | 0 | 1 {
    if (Math.abs(dx) < 22 || Math.abs(dx) < Math.abs(dy) * 1.2) return 0;
    if (Math.abs(dx) < Math.min(76, width * 0.24) && Math.abs(vx) < 0.55)
        return 0;
    return dx < 0 ? -1 : 1;
}
