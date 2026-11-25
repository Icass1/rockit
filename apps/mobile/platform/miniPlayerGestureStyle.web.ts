/** Keep vertical browser gestures available while horizontal drags belong to the player. */
export const miniPlayerGestureStyle = {
    flex: 1,
    touchAction: "pan-y" as const,
};
