export const PIP_STYLES = `
@media (display-mode: picture-in-picture) {
    :root {
        --pip-bg-start: #202124;
        --pip-bg-end: #121212;
        --pip-accent: #ee1086;
        --pip-accent-mid: #f53a76;
        --pip-accent-light: #fb6467;
        --pip-text: #ffffff;
        --pip-text-secondary: rgba(255,255,255,0.6);
        --pip-cover-shadow: 0 0 10px rgba(0,0,0,0.5);
        --pip-font-size-time: 0.7rem;

        --pip-cover-radius: 8px;
        --pip-gap: 8px;
        --pip-padding: 8px;
        --pip-font-size-title: 0.9rem;
        --pip-font-size-artist: 0.75rem;
        --pip-icon-size: 2.5vw;
        --pip-icon-min: 12px;
        --pip-icon-max: 25px;
        --pip-play-icon-size: 5vw;
        --pip-play-icon-min: 17px;
    }

    .pip-cover {
        aspect-ratio: var(--cover-aspect, 1);
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        flex-shrink: 0;
        border-radius: var(--pip-cover-radius);
        box-shadow: var(--pip-cover-shadow);
    }
    .pip-layout--pill .pip-cover {
        width: 80px;
        height: 80px;
        min-width: 60px;
        min-height: 60px;
        align-self: center;
        aspect-ratio: auto;
        border-radius: 8px;
    }

    body {
        margin: 0;
        padding: 0;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background: linear-gradient(
            160deg,
            var(--pip-bg-start) 0%,
            var(--pip-bg-end) 100%
        );
        font-family: "Inter", system-ui, -apple-system, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    ::-webkit-scrollbar { display: none; }
    * { scrollbar-width: none; }

    .pip-info {
        grid-area: info;
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        box-sizing: border-box;
    }
    .pip-layout--sidebar .pip-info,
    .pip-layout--full .pip-info {
        padding: 0 4px;
    }
    .pip-layout--cover-only .pip-info {
        display: none;
    }

    .pip-info-text {
        color: white;
        overflow: hidden;
        flex: 1;
        min-width: 0;
    }
    .pip-info-song-name {
        font-size: var(--pip-font-size-title);
        font-weight: 600;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #ffffff;
        margin: 0;
    }
    .pip-info-artist-name {
        font-size: var(--pip-font-size-artist);
        font-weight: 500;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--pip-text-secondary);
        margin: 1px 0 0 0;
    }
    .pip-info-like {
        flex-shrink: 0;
        display: flex;
        align-items: center;
    }

    .pip-controls-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        width: 100%;
    }
    .pip-layout--cover-only .pip-controls-bar {
        gap: 10px;
    }
    .pip-layout--pill .pip-controls-bar {
        gap: 6px;
    }

    .pip-controls-stack {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 0 4px;
    }

    .pip-layout--full .pip-controls,
    .pip-layout--sidebar .pip-controls {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 0 4px;
    }
    .pip-layout--pill .pip-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 4px;
    }

    .pip-progress-bar {
        display: flex;
        align-items: center;
        width: 100%;
        height: 1.5rem;
        gap: 8px;
    }
    .pip-layout--cover-only .pip-progress-bar {
        height: 1rem;
        gap: 4px;
    }

    .pip-root {
        width: 100%;
        height: 100%;
        position: relative;
        user-select: none;
        box-sizing: border-box;
    }

    .pip-layout--cover-only {
        display: grid;
        grid-template-areas: "cover";
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
        gap: 0;
        padding: 0;
    }

    .pip-layout--sidebar {
        display: grid;
        grid-template-areas: "cover"
                             "info";
        grid-template-columns: 1fr;
        grid-template-rows: 1fr auto;
        gap: var(--pip-gap);
        padding: var(--pip-padding);
    }

    .pip-layout--pill {
        display: grid;
        grid-template-areas: "cover info";
        grid-template-columns: auto 1fr;
        grid-template-rows: auto;
        gap: var(--pip-gap);
        padding: var(--pip-padding);
        align-items: center;
    }

    .pip-layout--full {
        display: grid;
        grid-template-areas: "cover"
                             "info";
        grid-template-columns: 1fr;
        grid-template-rows: 1fr auto;
        gap: var(--pip-gap);
        padding: var(--pip-padding);
    }

    .pip-cover { grid-area: cover; }
    .pip-info  { grid-area: info; }
    .pip-controls { grid-area: controls; }

.pip-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-sizing: border-box;
        transition: opacity 0.2s ease;
        opacity: 0;
        border-radius: var(--pip-cover-radius);
    }
    .pip-overlay--visible {
        opacity: 1;
        z-index: 30;
    }
    .pip-overlay--bottom {
        justify-content: flex-end;
        padding: 0 0 12px 0;
        background: linear-gradient(
            to top,
            rgba(0,0,0,0.7) 0%,
            transparent 50%
        );
    }
    .pip-overlay--center {
        justify-content: center;
        padding: 1rem;
        background: rgba(0,0,0,0.55);
    }
    .pip-overlay--top {
        justify-content: flex-start;
        padding: 8px 0 0 0;
        background: linear-gradient(
            to bottom,
            rgba(0,0,0,0.7) 0%,
            transparent 50%
        );
    }

    .pip-controls-icon-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .pip-controls-icon-btn:hover {
        opacity: 0.85;
        transform: scale(1.05);
    }

    .pip-icon {
        width: var(--pip-icon-size);
        height: var(--pip-icon-size);
        min-width: var(--pip-icon-min);
        min-height: var(--pip-icon-min);
        max-width: var(--pip-icon-max);
        max-height: var(--pip-icon-max);
    }

    .pip-play-icon {
        width: var(--pip-play-icon-size);
        height: var(--pip-play-icon-size);
        min-width: var(--pip-play-icon-min);
        min-height: var(--pip-play-icon-min);
    }

    .pip-slider {
        -webkit-appearance: none;
        appearance: none;
        height: 4px;
        background: rgba(255,255,255,0.15);
        border-radius: 2px;
        cursor: pointer;
        outline: none;
        transition: height 0.15s ease;
        flex-grow: 1;
    }
    .pip-slider:hover {
        height: 6px;
    }
    .pip-slider::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: 2px;
        background: transparent;
    }
    .pip-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        margin-top: -4px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.15s ease, transform 0.15s ease;
        box-shadow: 0 0 6px rgba(0,0,0,0.3);
    }
    .pip-slider:hover::-webkit-slider-thumb {
        opacity: 1;
    }
    .pip-slider::-moz-range-track {
        height: 4px;
        background: rgba(255,255,255,0.15);
        border-radius: 2px;
        border: none;
    }
    .pip-slider::-moz-range-progress {
        height: 4px;
        border-radius: 2px;
        background: linear-gradient(
            to right,
            #ee1086 0%,
            #fb6467 100%
        );
    }
    .pip-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: white;
        border: none;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.15s ease;
    }
    .pip-slider:hover::-moz-range-thumb {
        opacity: 1;
    }
    .pip-slider:focus-visible {
        outline: 2px solid rgba(238,16,134,0.6);
        outline-offset: 2px;
    }

    .pip-time-label {
        min-width: 3ch;
        font-size: var(--pip-font-size-time);
        font-weight: 600;
        color: rgba(255,255,255,0.8);
        font-variant-numeric: tabular-nums;
        line-height: 1;
        font-family: "Inter", system-ui, sans-serif;
    }

    .pip-lyrics-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background: rgba(0,0,0,0.75);
        z-index: 20;
        padding: 16px;
    }
    .pip-lyrics-scroll {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        overflow-y: auto;
        max-height: 100%;
        width: 100%;
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .pip-lyrics-scroll::-webkit-scrollbar {
        display: none;
    }
    .pip-lyrics-line {
        text-align: center;
        transition: all 0.3s ease;
        font-family: "Inter", system-ui, sans-serif;
        line-height: 1.4;
        padding: 2px 12px;
        width: 100%;
        box-sizing: border-box;
        word-break: break-word;
        cursor: pointer;
    }
    .pip-lyrics-line--past {
        font-size: 0.65rem;
        color: rgba(255,255,255,0.35);
    }
    .pip-lyrics-line--current {
        font-size: 0.9rem;
        color: #ffffff;
        font-weight: 700;
    }
    .pip-lyrics-line--future {
        font-size: 0.65rem;
        color: rgba(255,255,255,0.45);
    }
}
    .pip-lyrics-exit-btn:hover {
        background: rgba(0,0,0,0.7);
        color: #ffffff;
    }

    .pip-lyrics-toggle-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .pip-lyrics-toggle-btn:hover {
        opacity: 0.85;
        transform: scale(1.05);
    }
    .pip-lyrics-toggle-btn--active {
        color: #f53a76;
    }
}
`;
