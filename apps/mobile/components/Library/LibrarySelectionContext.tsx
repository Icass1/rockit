import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { downloadZip } from "@/platform/downloadZip";
import { useStore } from "@nanostores/react";
import { isSearchResult, type TMedia } from "@rockit/shared";
import { useFocusEffect } from "expo-router";
import { userManager } from "@/lib/managers/userManager";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";

export const canSelectForZip = (media: { type: string }) =>
    !isSearchResult(media as TMedia) &&
    ["album", "playlist", "song", "video"].includes(media.type);
interface Selection {
    active: boolean;
    selected: string[];
    busy: boolean;
    start: (id: string) => void;
    toggle: (id: string) => void;
    cancel: () => void;
    download: () => Promise<void>;
}
const Context = createContext<Selection | null>(null);
export const useLibrarySelection = () => useContext(Context);
export function LibrarySelectionProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [active, setActive] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const pending = useRef<AbortController | null>(null);
    const { vocabulary: v } = useVocabulary();
    const session = useStore(userManager.sessionAtom);
    const cancel = useCallback(() => {
        pending.current?.abort();
        pending.current = null;
        setActive(false);
        setSelected([]);
        setBusy(false);
    }, []);
    useEffect(() => {
        cancel();
        return cancel;
    }, [session, cancel]);
    useFocusEffect(useCallback(() => cancel, [cancel]));
    const value: Selection = {
        active,
        selected,
        busy,
        cancel,
        start: (id) => {
            setActive(true);
            setSelected([id]);
        },
        toggle: (id) => {
            if (!busy)
                setSelected((ids) =>
                    ids.includes(id)
                        ? ids.filter((x) => x !== id)
                        : [...ids, id]
                );
        },
        download: async () => {
            if (busy || pending.current || !session || !selected.length) return;
            const controller = new AbortController();
            pending.current = controller;
            setBusy(true);
            const current = () =>
                pending.current === controller &&
                userManager.sessionAtom.get() === session;
            try {
                await downloadZip(
                    [...new Set(selected)],
                    "RockIt",
                    controller.signal,
                    current
                );
                if (current()) {
                    toasterManager.notifySuccess(v.NOTIFICATIONS_ZIP_READY);
                    cancel();
                }
            } catch {
                if (current() && !controller.signal.aborted)
                    toasterManager.notifyError(v.ERROR_STARTING_DOWNLOAD);
            } finally {
                if (pending.current === controller) {
                    pending.current = null;
                    setBusy(false);
                }
            }
        },
    };
    return <Context.Provider value={value}>{children}</Context.Provider>;
}
