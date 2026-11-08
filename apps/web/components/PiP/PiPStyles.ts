import { designTokens } from "@rockit/theme";

export const PIP_STYLES = `
html.rockit-pip-document, .rockit-pip-document body {
    margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden;
    background: var(--theme-surface); color: var(--theme-foreground-strong);
    font-family: system-ui, -apple-system, sans-serif;
}
.rockit-pip-document .pip-root, .rockit-pip-document .pip-root * { box-sizing: border-box; }
.rockit-pip-document .pip-root {
    --lyrics-emphasis-scale: ${designTokens.layout.lyricsActiveScale};
    --lyrics-transition: ${designTokens.motion.lyricsHighlight}ms;
    --pip-cover-color: var(--theme-media-accent);
    --pip-accent: color-mix(in srgb, var(--pip-cover-color) 40%, var(--theme-foreground-strong));
    --pip-hover: color-mix(in srgb, var(--pip-accent) 16%, transparent);
    position: fixed; inset: 0; display: grid; grid-template-columns: minmax(0,1fr);
    grid-template-rows: minmax(0,1fr) auto; gap: 10px; padding: 10px;
    width: 100%; height: 100dvh; min-width: 0; min-height: 0; overflow: hidden;
    background: radial-gradient(ellipse at top, color-mix(in srgb, var(--pip-cover-color) 30%, var(--theme-surface)), var(--theme-surface) 85%);
    color: var(--theme-foreground); font: 14px/1.3 system-ui, -apple-system, sans-serif; isolation: isolate;
}
.rockit-pip-document .pip-stage { position: relative; min-width: 0; min-height: 0; overflow: hidden; display: grid; }
.rockit-pip-document .pip-cover {
    position: relative; min-width: 0; min-height: 0; width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    border-radius: 10px; background: transparent; container-type: size;
    border: 0; padding: 0; color: inherit; cursor: pointer;
}
.rockit-pip-document .pip-cover > img, .rockit-pip-document .pip-cover > video {
    position: relative; width: auto; height: auto; max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 10px;
}
.rockit-pip-document .pip-vinyl { position: relative; width: min(100cqw,100cqh); aspect-ratio: 1; flex: none; }
.rockit-pip-document .pip-panel { min-width: 0; min-height: 0; display: grid; gap: 6px; align-content: center; }
.rockit-pip-document .pip-info { min-width: 0; overflow: hidden; }
.rockit-pip-document .pip-info p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0; }
.rockit-pip-document .pip-info-song-name { font-size: 14px; font-weight: 650; line-height: 20px; }
.rockit-pip-document .pip-info-artist-name { color: var(--theme-muted-foreground); font-size: 12px; line-height: 18px; }
.rockit-pip-document .pip-controls-bar { position: relative; display: flex; align-items: center; justify-content: center; gap: 4px; min-width: 0; }
.rockit-pip-document .pip-controls-icon-btn {
    display: flex; align-items: center; justify-content: center; flex: 0 0 32px;
    min-width: 32px; width: 32px; height: 32px; min-height: 32px; margin: 0; padding: 0; border: 0;
    border-radius: 50%; background: transparent; color: var(--theme-foreground); cursor: pointer; list-style: none;
}
.rockit-pip-document summary::-webkit-details-marker { display: none; }
.rockit-pip-document .pip-controls-icon-btn:hover { background: var(--pip-hover); color: var(--pip-accent); }
.rockit-pip-document .pip-controls-icon-btn[aria-pressed=true], .rockit-pip-document .pip-menu button[aria-pressed=true] { color: var(--pip-accent); }
.rockit-pip-document .pip-play-button { width: 36px; min-width: 36px; height: 36px; flex-basis: 36px; background: var(--pip-accent); color: var(--theme-background); }
.rockit-pip-document .pip-play-button:hover { background: color-mix(in srgb, var(--pip-accent) 70%, var(--theme-on-media)); color: var(--theme-background); }
.rockit-pip-document .pip-icon { width: 18px; height: 18px; flex: none; }
.rockit-pip-document .pip-play-icon { width: 20px; height: 20px; flex: none; }
.rockit-pip-document .pip-options { flex: 0 0 32px; }
.rockit-pip-document .pip-options:not([open]) .pip-menu { display: none; }
.rockit-pip-document .pip-menu {
    position: fixed; z-index: 50; bottom: 8px; right: 8px; display: grid; gap: 2px;
    width: 220px; max-width: calc(100vw - 16px); max-height: calc(100dvh - 16px); overflow-y: auto;
    padding: 6px; border: 1px solid color-mix(in srgb, var(--theme-foreground-strong) 20.78%, transparent); border-radius: 10px; background: var(--theme-secondary);
    box-shadow: 0 8px 28px color-mix(in srgb, var(--theme-backdrop) 60%, transparent);
}
.rockit-pip-document .pip-menu button {
    display: flex; align-items: center; gap: 10px; min-height: 32px; width: 100%; margin: 0; padding: 6px 8px;
    border: 0; border-radius: 5px; background: transparent; color: var(--theme-foreground-strong); font: 12px/1.4 system-ui,sans-serif; text-align: left; cursor: pointer;
}
.rockit-pip-document .pip-menu button:hover { background: var(--pip-hover); color: var(--pip-accent); }
.rockit-pip-document .pip-menu svg { width: 16px; height: 16px; flex: none; }
.rockit-pip-document .pip-root :is(button,summary,input):focus-visible { outline: 2px solid var(--pip-accent); outline-offset: -2px; }
.rockit-pip-document .pip-progress-bar { display: flex; align-items: center; gap: 6px; min-width: 0; height: 20px; }
.rockit-pip-document .pip-time-label { flex: none; color: var(--theme-muted-foreground); font-size: 10px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.rockit-pip-document .pip-slider { appearance: none; -webkit-appearance: none; flex: 1; min-width: 0; width: 0; height: 4px; padding: 0; margin: 0; border: 0; border-radius: 4px; cursor: pointer; }
.rockit-pip-document .pip-slider:disabled { opacity: .4; cursor: default; }
.rockit-pip-document .pip-slider::-webkit-slider-runnable-track { height: 4px; background: transparent; border-radius: 4px; }
.rockit-pip-document .pip-slider::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 10px; height: 10px; margin-top: -3px; border: 0; border-radius: 50%; background: var(--pip-accent); }
.rockit-pip-document .pip-slider::-moz-range-track { height: 4px; background: transparent; }
.rockit-pip-document .pip-slider::-moz-range-thumb { width: 10px; height: 10px; border: 0; border-radius: 50%; background: var(--pip-accent); }
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
.rockit-pip-document .pip-layout--cover-only .pip-cover { border-radius: 10px; }
.rockit-pip-document .pip-layout--cover-only .pip-panel {
    color: var(--theme-on-media);
    position: absolute; z-index: 3; bottom: 0; left: 0; right: 0; padding: 24px 8px 8px; gap: 4px;
    background: linear-gradient(transparent,color-mix(in srgb, var(--theme-backdrop) 86.67%, transparent) 35%); opacity: 0; pointer-events: none; transition: opacity .15s;
}
.rockit-pip-document .pip-layout--cover-only:is(:hover,:focus-within) .pip-panel { opacity: 1; pointer-events: auto; }
.rockit-pip-document .pip-layout--cover-only .pip-info-song-name { font-size: 12px; line-height: 16px; }
.rockit-pip-document .pip-layout--cover-only .pip-info-artist-name { font-size: 11px; line-height: 14px; }
.rockit-pip-document .pip-layout--cover-only .pip-progress-bar { display: none; }
.rockit-pip-document .pip-has-lyrics .pip-stage { grid-template-rows: minmax(0,.8fr) minmax(0,1.2fr); gap: 8px; }
.rockit-pip-document .pip-panel .pip-lyric-glance { display: none; }
.rockit-pip-document .pip-lyric-glance { color: var(--pip-accent); font-size: 12px; line-height: 18px; }
.rockit-pip-document .pip-lyrics-close { position: absolute; top: 6px; right: 6px; z-index: 21; background: color-mix(in srgb, var(--theme-foreground-strong) 9.412%, transparent); font-size: 24px; }
.rockit-pip-document .pip-lyrics-overlay { position: relative; min-width: 0; display: flex; align-items: center; justify-content: center; min-height: 0; overflow: hidden; }
.rockit-pip-document .pip-lyrics-scroll { position: relative; min-width:0; width: 100%; height: 100%; overflow-x:hidden; overflow-y:auto; padding: 8px 0; }
.rockit-pip-document .pip-lyrics-line { display: block; margin: 0; width: 100%; min-height: 32px; padding: 8px; text-align: center; overflow-wrap: anywhere; white-space:normal; cursor: pointer; box-sizing:border-box;
    font-size:calc(${designTokens.typography.caption}px * var(--lyrics-emphasis-scale));font-weight:600;line-height:1.65;
    transform:scale(calc(1 / var(--lyrics-emphasis-scale)));transform-origin:center;
    transition:transform var(--lyrics-transition) ease-in-out,color var(--lyrics-transition) ease-in-out; }
.rockit-pip-document .pip-lyrics-line--past, .rockit-pip-document .pip-lyrics-line--future { color: var(--theme-muted-foreground); }
.rockit-pip-document .pip-lyrics-line--current { color: var(--pip-accent); transform:scale(1); }
.rockit-pip-document .pip-lyrics-line:hover { color: var(--pip-accent); background: var(--pip-hover); border-radius: 8px; }
@media (max-height: 179px) { .rockit-pip-document .pip-layout--cover-only .pip-info { display: none; } }
@media (hover: none) { .rockit-pip-document .pip-layout--cover-only .pip-panel { opacity: 1; pointer-events: auto; } }
@media (min-width: 560px) and (min-height: 220px) {
 .rockit-pip-document .pip-layout--pill.pip-has-lyrics { grid-template-columns: minmax(0,1fr); grid-template-rows: minmax(0,1fr) auto; }
 .rockit-pip-document .pip-has-lyrics .pip-stage { grid-template-columns: minmax(0,1fr) minmax(0,1fr); grid-template-rows: minmax(0,1fr); }
}
@media (max-width: 399px) { .rockit-pip-document .pip-controls-bar { gap: 0; } }
@media (max-width: 259px) {
 .rockit-pip-document .pip-controls-bar { gap: 0; flex-wrap: wrap; }
 .rockit-pip-document .pip-controls-icon-btn { width: 28px; min-width: 28px; height: 28px; min-height: 28px; flex-basis: 28px; }
 .rockit-pip-document .pip-play-button { flex-basis: 32px; width: 32px; min-width: 32px; }
 .rockit-pip-document .pip-options { flex-basis: 28px; }
}
@media (max-height: 179px) and (min-width: 360px) {
 .rockit-pip-document .pip-layout--pill .pip-panel { grid-template-columns: minmax(0,1fr) auto; gap: 6px; }
 .rockit-pip-document .pip-layout--pill .pip-info { align-self: center; }
 .rockit-pip-document .pip-layout--pill .pip-info-artist-name { display: block; }
 .rockit-pip-document .pip-layout--pill .pip-controls-bar { gap: 0; }
 .rockit-pip-document .pip-layout--pill .pip-progress-bar { grid-column: 1 / -1; }
 .rockit-pip-document .pip-layout--pill.pip-has-lyrics .pip-stage { grid-template-rows: minmax(0,1fr); }
 .rockit-pip-document .pip-layout--pill .pip-stage > .pip-lyrics-overlay { display: none; }
 .rockit-pip-document .pip-layout--pill .pip-panel .pip-lyric-glance { display: block; }
 .rockit-pip-document .pip-layout--pill.pip-has-lyrics .pip-info-artist-name { display: none; }
}
.rockit-pip-document .pip-layout--cover-only.pip-has-lyrics .pip-stage { grid-template-rows: minmax(0,1fr); }
.rockit-pip-document .pip-layout--cover-only .pip-stage > .pip-lyrics-overlay { display: none; }
.rockit-pip-document .pip-layout--cover-only.pip-has-lyrics .pip-info { display: block; }
.rockit-pip-document .pip-layout--cover-only.pip-has-lyrics .pip-info-song-name,
.rockit-pip-document .pip-layout--cover-only.pip-has-lyrics .pip-info-artist-name { display: none; }
.rockit-pip-document .pip-layout--cover-only .pip-panel .pip-lyric-glance { display: block; }
.rockit-pip-document .pip-layout--cover-only .pip-time-label, .rockit-pip-document .pip-layout--cover-only .pip-info-artist-name { color: var(--theme-on-media-muted); }
/* One continuous surface: header chrome has no separate panel or border. */
.rockit-pip-document .pip-root { padding-top: 32px; }
.rockit-pip-document .pip-header { position: absolute; inset: 2px 6px auto; height: 26px; display: flex; align-items: center; justify-content: center; z-index: 25; }
.rockit-pip-document .pip-header button { border: 0; padding: 0; background: transparent; color: var(--theme-muted-foreground); display: grid; place-items: center; }
.rockit-pip-document .pip-close { position: absolute; left: 0; width: 26px; height: 26px; cursor: pointer; }
.rockit-pip-document .pip-close span { width: 12px; height: 12px; background: var(--theme-destructive); border-radius: 50%; }
.rockit-pip-document .pip-grip { width: 36px; height: 26px; cursor: grab; touch-action: none; }
.rockit-pip-document .pip-grip:active { cursor: grabbing; }
.rockit-pip-document button:focus-visible, .rockit-pip-document summary:focus-visible { outline: 2px solid var(--pip-accent); outline-offset: -2px; }
.rockit-pip-document .pip-layout--pill { padding-top: 8px; padding-left: 36px; }
.rockit-pip-document .pip-layout--pill .pip-header { inset: 4px auto 4px 3px; width: 26px; height: auto; flex-direction: column; }
.rockit-pip-document .pip-layout--pill .pip-close { top: 0; }
.rockit-pip-document .pip-layout--pill .pip-grip { width: 26px; margin-top: 24px; }
@media (max-height: 95px) {
 .rockit-pip-document .pip-layout--pill { gap: 6px; padding: 4px 6px 4px 32px; grid-template-columns: minmax(0,min(16vw,calc(100dvh - 8px))) minmax(0,1fr); }
 .rockit-pip-document .pip-layout--pill .pip-panel { grid-template-columns: minmax(0,1fr) auto; gap: 4px; }
 .rockit-pip-document .pip-layout--pill .pip-progress-bar, .rockit-pip-document .pip-layout--pill .pip-secondary, .rockit-pip-document .pip-layout--pill .pip-lyrics-toggle { display:none; }
 .rockit-pip-document .pip-layout--pill .pip-controls-icon-btn { width:24px; min-width:24px; height:24px; min-height:24px; flex-basis:24px; }
 .rockit-pip-document .pip-layout--pill .pip-options {flex-basis:24px;}
 .rockit-pip-document .pip-layout--pill .pip-grip { height:14px; }
}
@media (max-width: 139px) {
 .rockit-pip-document .pip-controls-bar { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); justify-items:center; }
 .rockit-pip-document .pip-lyrics-toggle { display:none; }
 .rockit-pip-document .pip-root { padding-left:4px;padding-right:4px; }
}
.rockit-pip-document .pip-grip-dots { display:grid; grid-template-columns:repeat(4,3px); gap:3px; }
.rockit-pip-document .pip-grip-dots span { width:3px; height:3px; border-radius:50%; background:currentColor; }
.rockit-pip-document .pip-layout--pill .pip-grip-dots { grid-template-columns:repeat(2,3px); }
@media (max-height:179px) and (min-width:360px) {
 .rockit-pip-document .pip-layout--pill .pip-controls-icon-btn { width:40px; min-width:40px; height:40px; min-height:40px; flex-basis:40px; }
 .rockit-pip-document .pip-layout--pill .pip-play-button { width:48px; min-width:48px; height:48px; min-height:48px; flex-basis:48px; }
 .rockit-pip-document .pip-layout--pill .pip-icon { width:24px; height:24px; }
 .rockit-pip-document .pip-layout--pill .pip-play-icon { width:28px; height:28px; }
 .rockit-pip-document .pip-layout--pill .pip-options { flex-basis:32px; }
 .rockit-pip-document .pip-layout--pill .pip-options > summary { width:32px; min-width:32px; flex-basis:32px; }
 .rockit-pip-document .pip-layout--pill .pip-lyrics-toggle { display:none; }
}
@media (max-height:63px) and (min-width:360px) {
 .rockit-pip-document .pip-layout--pill .pip-controls-icon-btn { width:28px; min-width:28px; height:28px; min-height:28px; flex-basis:28px; }
 .rockit-pip-document .pip-layout--pill .pip-play-button { width:32px; min-width:32px; height:32px; min-height:32px; flex-basis:32px; }
 .rockit-pip-document .pip-layout--pill .pip-play-icon { width:24px; height:24px; }
}
.rockit-pip-document .pip-header .pip-retro-toggle { position:absolute;right:0;width:28px;height:26px;cursor:pointer;color:var(--pip-accent); }
.rockit-pip-document .pip-is-retro { background:linear-gradient(135deg,var(--theme-surface-raised),var(--theme-secondary));border-radius:20px; }
.rockit-pip-document .pip-retro-body { grid-row:1 / -1; min-height:0; display:grid;grid-template-rows:minmax(0,1fr) minmax(130px,42%); gap:12px;container-type:size; }
.rockit-pip-document .pip-retro-screen { min-height:0;position:relative;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;gap:6px;border:4px solid var(--theme-border-subtle);border-radius:10px;background:var(--theme-background);padding:8px;overflow:hidden; }
.rockit-pip-document .pip-retro-status {display:flex;justify-content:space-between;gap:8px;font-size:10px;color:var(--theme-muted-foreground);}
.rockit-pip-document .pip-retro-status strong {color:var(--pip-accent);}
.rockit-pip-document .pip-retro-content {min-height:0;display:grid;grid-template-columns:minmax(0,1fr);overflow:hidden;}
.rockit-pip-document .pip-retro-content:has(.pip-lyrics-overlay) {grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;}
.rockit-pip-document .pip-retro-menu {position:absolute;inset:auto 6px 6px;background:var(--theme-secondary);border-radius:8px;padding:6px;z-index:30;}
.rockit-pip-document .pip-retro-wheel {position:relative;align-self:center;justify-self:center;height:min(100%,78cqw);aspect-ratio:1;border-radius:50%;background:var(--theme-surface);box-shadow:inset 0 0 0 1px var(--theme-border-subtle);}
.rockit-pip-document .pip-retro-wheel button {position:absolute;display:grid;place-items:center;background:transparent;border:0;color:var(--theme-foreground);cursor:pointer;padding:0;}
.rockit-pip-document .pip-retro-menu-key {top:0;left:25%;width:50%;height:28%;font-size:11px;letter-spacing:1px;}
.rockit-pip-document .pip-retro-previous {left:0;top:30%;width:28%;height:40%;}
.rockit-pip-document .pip-retro-next {right:0;top:30%;width:28%;height:40%;}
.rockit-pip-document .pip-retro-play {bottom:0;left:30%;width:40%;height:28%;}
.rockit-pip-document .pip-retro-wheel .pip-retro-center {inset:30%;width:40%;height:40%;border-radius:50%;background:linear-gradient(135deg,var(--theme-surface-raised),var(--theme-secondary));color:var(--pip-accent);font-size:11px;font-weight:700;}
.rockit-pip-document .pip-retro-logo { width:54%;height:54%;object-fit:contain;pointer-events:none;filter:brightness(0) invert(.22) drop-shadow(0 1px 0 color-mix(in srgb,var(--theme-foreground) 18%,transparent)); }
@media (prefers-reduced-motion: reduce) { .rockit-pip-document .pip-root * { transition: none !important; } }
`;
