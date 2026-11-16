import { useEffect, useRef, useState } from "react";
import { parseLyricsSourceId, type BaseHttp } from "@rockit/shared";

/** Both players submit moderated source suggestions through the same boundary. */
export function useLyricsSourceProposal(
    http: typeof BaseHttp,
    mediaPublicId: string,
    isCurrent: () => boolean
) {
    const [value, setValue] = useState("");
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<
        "invalid" | "notFound" | "unavailable"
    >();
    const mounted = useRef(false);
    const sending = useRef(false);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    const sourceId = parseLyricsSourceId(value);
    const submit = async () => {
        if (sending.current || sent || !isCurrent()) return;
        if (sourceId === undefined) {
            setError("invalid");
            return;
        }
        sending.current = true;
        setBusy(true);
        setError(undefined);
        try {
            const response = await http.createRequest({
                requestType: "LYRICS",
                mediaPublicId,
                proposedValue: JSON.stringify({
                    kind: "lyrics_source",
                    provider: "LRCLIB",
                    sourceId,
                }),
                comment: null,
            });
            if (!mounted.current || !isCurrent()) return;
            if (response.isOk()) setSent(true);
            else
                setError(
                    response.code === 400 || response.code === 404
                        ? "notFound"
                        : "unavailable"
                );
        } catch {
            if (mounted.current && isCurrent()) setError("unavailable");
        } finally {
            sending.current = false;
            if (mounted.current) setBusy(false);
        }
    };
    return {
        value,
        setValue,
        busy,
        sent,
        error,
        submit,
        valid: sourceId !== undefined,
    };
}
