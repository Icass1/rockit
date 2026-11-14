import { getTheme } from "@rockit/theme";
import { createMedalViewer } from "@rockit/ui/browser/medalViewer.web";
import {
    MEDAL_BRIDGE_PROTOCOL,
    parseMedalCommand,
} from "@rockit/ui/headless/medalBridge";

declare global {
    interface Window {
        ReactNativeWebView?: { postMessage: (message: string) => void };
    }
}

let viewer: ReturnType<typeof createMedalViewer> | null = null;
let sequence = 0;
let instance = "";
let active = true;
const post = (type: "boot" | "ready" | "unavailable") =>
    window.ReactNativeWebView?.postMessage(
        JSON.stringify({ protocol: MEDAL_BRIDGE_PROTOCOL, type, instance })
    );
const release = () => {
    viewer?.dispose();
    viewer = null;
};
const receive = (event: MessageEvent) => {
    const command = parseMedalCommand(event.data);
    if (!command || command.sequence <= sequence) return;
    sequence = command.sequence;
    if (command.type === "init") {
        release();
        instance = command.instance;
        const stage = document.getElementById("medal-stage");
        if (!stage) return;
        document.body.style.backgroundColor = command.colors["medal-stage"];
        try {
            viewer = createMedalViewer(
                stage,
                command.badge,
                command.ownerName,
                { ...getTheme("dark"), ...command.colors },
                () => {
                    release();
                    post("unavailable");
                }
            );
            viewer.setActive(active);
            post("ready");
        } catch {
            release();
            post("unavailable");
        }
    } else if (command.type === "visibility") {
        active = command.active;
        viewer?.setActive(active);
    } else if (command.type === "dispose") release();
    else if (command.type === "back") viewer?.back();
    else viewer?.front();
};
window.addEventListener("message", receive);
document.addEventListener("message", receive as EventListener);
window.addEventListener("pagehide", release, { once: true });
post("boot");
