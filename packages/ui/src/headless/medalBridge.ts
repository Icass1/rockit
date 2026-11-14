import { ListeningBadgeResponseSchema } from "@rockit/shared/dto/listeningBadgeResponse";
import type {
    MedalBridgeCommand,
    MedalBridgeEvent,
} from "@rockit/shared/models/types/medalBridge";

export const MEDAL_BRIDGE_PROTOCOL = "rockit-medal-v1";
const object = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
const colorKey = (key: string) =>
    key.startsWith("medal-") ||
    key.startsWith("emblem-") ||
    [
        "primary",
        "muted-foreground",
        "recap-foreground",
        "explicit-foreground",
        "recap-ink",
    ].includes(key);

/** Only rendering colors enter the isolated local document; no session or account data. */
export function medalBridgeColors(colors: Record<string, string>) {
    return Object.fromEntries(
        Object.entries(colors).filter(([key]) => colorKey(key))
    );
}

export function parseMedalCommand(raw: unknown): MedalBridgeCommand | null {
    if (typeof raw !== "string" || raw.length > 32768) return null;
    try {
        const data: unknown = JSON.parse(raw);
        if (
            !object(data) ||
            data.protocol !== MEDAL_BRIDGE_PROTOCOL ||
            !Number.isSafeInteger(data.sequence) ||
            Number(data.sequence) < 1
        )
            return null;
        const base = {
            protocol: MEDAL_BRIDGE_PROTOCOL,
            sequence: Number(data.sequence),
        } as const;
        if (data.type === "visibility" && typeof data.active === "boolean")
            return { ...base, type: "visibility", active: data.active };
        if (["front", "back", "reset", "dispose"].includes(String(data.type)))
            return {
                ...base,
                type: data.type as "front" | "back" | "reset" | "dispose",
            };
        if (
            data.type !== "init" ||
            typeof data.instance !== "string" ||
            data.instance.length > 128 ||
            typeof data.ownerName !== "string" ||
            data.ownerName.length > 512 ||
            !object(data.colors)
        )
            return null;
        const badge = ListeningBadgeResponseSchema.safeParse(data.badge);
        if (!badge.success) return null;
        const colors: Record<string, string> = {};
        const entries = Object.entries(data.colors);
        if (entries.length > 128) return null;
        for (const [key, value] of entries) {
            if (
                !colorKey(key) ||
                typeof value !== "string" ||
                !/^#[\da-f]{3,8}$/i.test(value)
            )
                return null;
            colors[key] = value;
        }
        if (
            ![
                "medal-stage",
                "medal-gold-metal",
                "medal-silver-highlight",
                "primary",
            ].every((key) => colors[key])
        )
            return null;
        return {
            ...base,
            type: "init",
            instance: data.instance,
            badge: badge.data,
            ownerName: data.ownerName,
            colors,
        };
    } catch {
        return null;
    }
}

export function parseMedalEvent(raw: unknown): MedalBridgeEvent | null {
    if (typeof raw !== "string" || raw.length > 1024) return null;
    try {
        const data: unknown = JSON.parse(raw);
        if (!object(data) || data.protocol !== MEDAL_BRIDGE_PROTOCOL)
            return null;
        if (data.type === "boot")
            return { protocol: MEDAL_BRIDGE_PROTOCOL, type: "boot" };
        if (
            (data.type === "ready" || data.type === "unavailable") &&
            typeof data.instance === "string"
        )
            return {
                protocol: MEDAL_BRIDGE_PROTOCOL,
                type: data.type,
                instance: data.instance,
            };
        return null;
    } catch {
        return null;
    }
}
