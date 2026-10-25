export const PIP_STYLES = `
html.rockit-pip-document, .rockit-pip-document body {
    margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden;
    color-scheme: dark; background: #121214; color: #fff;
    font-family: system-ui, -apple-system, sans-serif;
}
.rockit-pip-document .pip-root, .rockit-pip-document .pip-root * { box-sizing: border-box; }
.rockit-pip-document .pip-root {
    position: fixed; inset: 0; display: grid; grid-template-columns: minmax(0,1fr);
    grid-template-rows: minmax(0,1fr) auto; gap: 10px; padding: 10px;
    width: 100%; height: 100dvh; min-width: 0; min-height: 0; overflow: hidden;
    background: radial-gradient(ellipse at top, #2a2730, #121214 80%);
    color: white; font: 14px/1.3 system-ui, -apple-system, sans-serif; isolation: isolate;
}
.rockit-pip-document .pip-cover {
    position: relative; min-width: 0; min-height: 0; width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    border-radius: 10px; background: transparent; container-type: size;
}
.rockit-pip-document .pip-cover > img, .rockit-pip-document .pip-cover > video {
    position: absolute; inset: 0; width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain;
}
.rockit-pip-document .pip-vinyl { position: relative; width: min(100cqw,100cqh); aspect-ratio: 1; flex: none; }
.rockit-pip-document .pip-panel { min-width: 0; min-height: 0; display: grid; gap: 6px; align-content: center; }
.rockit-pip-document .pip-info { min-width: 0; overflow: hidden; }
.rockit-pip-document .pip-info p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0; }
.rockit-pip-document .pip-info-song-name { font-size: 14px; font-weight: 650; line-height: 20px; }
.rockit-pip-document .pip-info-artist-name { color: #c0bdc6; font-size: 12px; line-height: 18px; }
.rockit-pip-document .pip-controls-bar { position: relative; display: flex; align-items: center; justify-content: center; gap: 4px; min-width: 0; }
.rockit-pip-document .pip-controls-icon-btn {
    display: flex; align-items: center; justify-content: center; flex: 0 0 32px;
    min-width: 32px; width: 32px; height: 32px; min-height: 32px; margin: 0; padding: 0; border: 0;
    border-radius: 50%; background: transparent; color: #eee; cursor: pointer; list-style: none;
}
.rockit-pip-document summary::-webkit-details-marker { display: none; }
.rockit-pip-document .pip-controls-icon-btn:hover { background: #ffffff18; }
.rockit-pip-document .pip-controls-icon-btn[aria-pressed=true], .rockit-pip-document .pip-menu button[aria-pressed=true] { color: #ff8cbe; }
.rockit-pip-document .pip-play-button { width: 36px; min-width: 36px; height: 36px; flex-basis: 36px; background: #fff; color: #17141b; }
.rockit-pip-document .pip-play-button:hover { background: #ffcee2; }
.rockit-pip-document .pip-icon { width: 18px; height: 18px; flex: none; }
.rockit-pip-document .pip-play-icon { width: 20px; height: 20px; flex: none; }
.rockit-pip-document .pip-options { flex: 0 0 32px; }
.rockit-pip-document .pip-options:not([open]) .pip-menu { display: none; }
.rockit-pip-document .pip-menu {
    position: fixed; z-index: 50; bottom: 8px; right: 8px; display: grid; gap: 2px;
    width: 220px; max-width: calc(100vw - 16px); max-height: calc(100dvh - 16px); overflow-y: auto;
    padding: 6px; border: 1px solid #ffffff35; border-radius: 10px; background: #232126;
    box-shadow: 0 8px 28px #0009;
}
.rockit-pip-document .pip-menu button {
    display: flex; align-items: center; gap: 10px; min-height: 32px; width: 100%; margin: 0; padding: 6px 8px;
    border: 0; border-radius: 5px; background: transparent; color: #fff; font: 12px/1.4 system-ui,sans-serif; text-align: left; cursor: pointer;
}
.rockit-pip-document .pip-menu button:hover { background: #ffffff15; }
.rockit-pip-document .pip-menu svg { width: 16px; height: 16px; flex: none; }
.rockit-pip-document .pip-root :is(button,summary,input):focus-visible { outline: 2px solid #ff8cbe; outline-offset: -2px; }
.rockit-pip-document .pip-progress-bar { display: flex; align-items: center; gap: 6px; min-width: 0; height: 20px; }
.rockit-pip-document .pip-time-label { flex: none; color: #c0bdc6; font-size: 10px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.rockit-pip-document .pip-slider { appearance: none; -webkit-appearance: none; flex: 1; min-width: 0; width: 0; height: 4px; padding: 0; margin: 0; border: 0; border-radius: 4px; cursor: pointer; }
.rockit-pip-document .pip-slider:disabled { opacity: .4; cursor: default; }
.rockit-pip-document .pip-slider::-webkit-slider-runnable-track { height: 4px; background: transparent; border-radius: 4px; }
.rockit-pip-document .pip-slider::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 10px; height: 10px; margin-top: -3px; border: 0; border-radius: 50%; background: white; }
.rockit-pip-document .pip-slider::-moz-range-track { height: 4px; background: transparent; }
.rockit-pip-document .pip-slider::-moz-range-thumb { width: 10px; height: 10px; border: 0; border-radius: 50%; background: white; }
.rockit-pip-document .pip-layout--pill { grid-template-columns: minmax(0,1fr) minmax(0,1.2fr); grid-template-rows: minmax(0,1fr); }
.rockit-pip-document .pip-layout--pill .pip-panel { align-self: center; }
.rockit-pip-document .pip-layout--narrow { padding: 8px; gap: 8px; }
.rockit-pip-document .pip-layout--narrow .pip-info-song-name { font-size: 12px; line-height: 18px; }
.rockit-pip-document .pip-layout--narrow .pip-info-artist-name { font-size: 11px; line-height: 16px; }
@media (max-height: 179px) {
    .rockit-pip-document .pip-layout--pill { grid-template-columns: minmax(0,min(28vw,calc(100dvh - 20px))) minmax(0,1fr); }
}
@media (max-height: 139px) {
    .rockit-pip-document .pip-layout--pill .pip-info-artist-name { display: none; }
}
@media (max-height: 119px) {
    .rockit-pip-document .pip-layout--pill .pip-progress-bar { display: none; }
}
.rockit-pip-document .pip-layout--full { padding: 14px; gap: 12px; }
.rockit-pip-document .pip-layout--full .pip-info-song-name { font-size: 16px; line-height: 22px; }
.rockit-pip-document .pip-layout--cover-only { padding: 0; gap: 0; grid-template-rows: minmax(0,1fr); }
.rockit-pip-document .pip-layout--cover-only .pip-cover { border-radius: 0; }
.rockit-pip-document .pip-layout--cover-only .pip-panel {
    position: absolute; z-index: 3; bottom: 0; left: 0; right: 0; padding: 24px 8px 8px; gap: 4px;
    background: linear-gradient(transparent,#000d 35%); opacity: 0; pointer-events: none; transition: opacity .15s;
}
.rockit-pip-document .pip-layout--cover-only:is(:hover,:focus-within) .pip-panel { opacity: 1; pointer-events: auto; }
.rockit-pip-document .pip-layout--cover-only .pip-info-song-name { font-size: 12px; line-height: 16px; }
.rockit-pip-document .pip-layout--cover-only .pip-info-artist-name { font-size: 11px; line-height: 14px; }
.rockit-pip-document .pip-layout--cover-only .pip-progress-bar { display: none; }
.rockit-pip-document .pip-lyrics-region { position: absolute; inset: 0; z-index: 20; background: #111e; }
.rockit-pip-document .pip-lyrics-close { position: absolute; top: 6px; right: 6px; z-index: 21; background: #ffffff18; font-size: 24px; }
.rockit-pip-document .pip-lyrics-overlay { position: absolute; inset: 44px 8px 8px; display: flex; align-items: center; justify-content: center; min-height: 0; overflow: hidden; }
.rockit-pip-document .pip-lyrics-scroll { position: relative; width: 100%; height: 100%; overflow: auto; padding: 8px 0; }
.rockit-pip-document .pip-lyrics-line { display: block; margin: 0; width: 100%; min-height: 32px; padding: 8px; text-align: center; overflow-wrap: anywhere; cursor: pointer; }
.rockit-pip-document .pip-lyrics-line--past, .rockit-pip-document .pip-lyrics-line--future { color: #a4a0ab; font-size: 12px; }
.rockit-pip-document .pip-lyrics-line--current { color: white; font-size: 16px; font-weight: 700; }
@media (max-height: 179px) { .rockit-pip-document .pip-layout--cover-only .pip-info { display: none; } }
@media (hover: none) { .rockit-pip-document .pip-layout--cover-only .pip-panel { opacity: 1; pointer-events: auto; } }
@media (prefers-reduced-motion: reduce) { .rockit-pip-document .pip-root * { transition: none !important; } }
`;
