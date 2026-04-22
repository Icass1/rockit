import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { atom } from "nanostores";
import { fullSync, pushPendingToBackend } from "../database/offlineProvider";

export const isOnlineAtom = atom<boolean>(true);
export const connectionTypeAtom = atom<string | null>(null);

let unsubscribe: (() => void) | null = null;
let wasOffline = false;

export async function initConnectivity(): Promise<boolean> {
    const state = await NetInfo.fetch();
    updateState(state);

    unsubscribe = NetInfo.addEventListener(updateState);

    return state.isConnected ?? true;
}

function updateState(state: NetInfoState): void {
    const online = state.isConnected ?? false;
    const wasPreviouslyOffline = wasOffline;

    isOnlineAtom.set(online);
    connectionTypeAtom.set(state.type);

    if (online && wasPreviouslyOffline) {
        wasOffline = false;
        handleConnectivityChange(true);
    } else if (!online) {
        wasOffline = true;
    }
}

async function handleConnectivityChange(connected: boolean): Promise<void> {
    if (connected) {
        await pushPendingToBackend();
    }
}

export async function getConnectivity(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
}

export function unsubscribeConnectivity(): void {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
}
