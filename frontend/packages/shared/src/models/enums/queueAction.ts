export enum EQueueAction {
    REPLAY = 1,
    PLAY,
    STOP,
    /** Queue finished with repeat off: continue with recommended songs
     * instead of looping back to the first track. */
    AUTOPLAY,
}
