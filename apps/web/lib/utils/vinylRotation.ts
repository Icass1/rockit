const TARGET_SPEED = 0.75;
const ACCEL = TARGET_SPEED / 120;

/** Animate on the visible disc's document, including a Document PiP portal. */
export function startVinylRotation(
    disc: HTMLElement,
    isPlaying: () => boolean
): () => void {
    const animationWindow = disc.ownerDocument.defaultView;
    if (!animationWindow) return (): void => undefined;
    let frameId = 0;
    let rotation = 0;
    let speed = 0;
    const tick = (): void => {
        if (isPlaying()) speed = Math.min(speed + ACCEL, TARGET_SPEED);
        else {
            speed *= 0.96;
            if (speed < 0.001) speed = 0;
        }
        if (speed > 0) {
            rotation = (rotation + speed) % 360;
            disc.style.transform = `rotate(${rotation}deg)`;
        }
        frameId = animationWindow.requestAnimationFrame(tick);
    };
    frameId = animationWindow.requestAnimationFrame(tick);
    return (): void => animationWindow.cancelAnimationFrame(frameId);
}
