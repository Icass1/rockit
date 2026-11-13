"use client";

import { useEffect, useId, useRef, useState, type JSX } from "react";
import { loadAnnualRecap } from "@rockit/shared";
import {
    AnnualRecap,
    ListeningProfile,
    useDesignTheme,
    type AnnualRecapControls,
} from "@rockit/ui";
import { X } from "lucide-react";
import { Http } from "@/lib/http";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import {
    useLanguage,
    useVocabulary,
} from "@/components/providers/VocabularyProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export default function ListeningProfileDialog({
    target,
    onClose,
}: {
    target: { publicId?: string; name: string } | null;
    onClose: () => void;
}): JSX.Element {
    const v = useVocabulary();
    const { friendManager } = useRuntimeServices();
    const id = useId();
    const theme = useDesignTheme();
    const locale = useLanguage();
    const [recap, setRecap] = useState<number | null>(null);
    const controls = useRef<AnnualRecapControls>(null);
    const year = new Date().getUTCFullYear();
    useEffect(() => {
        if (recap === null) return;
        const keyboard = (event: KeyboardEvent): void => {
            if (event.key === "ArrowRight") controls.current?.next();
            else if (event.key === "ArrowLeft") controls.current?.previous();
            else if (
                event.key === " " &&
                !(event.target instanceof HTMLButtonElement)
            )
                controls.current?.toggle();
            else return;
            event.preventDefault();
        };
        document.addEventListener("keydown", keyboard);
        return () => document.removeEventListener("keydown", keyboard);
    }, [recap]);
    return (
        <Dialog
            open={!!target}
            onClose={onClose}
            titleId={id}
            style={
                recap === null
                    ? undefined
                    : {
                          width: `min(calc(100vw - ${theme.spacing.lg}px), ${theme.layout.recapMaxWidth}px)`,
                          height: `min(calc(100dvh - ${theme.spacing.lg}px), ${theme.layout.recapMaxHeight}px)`,
                          maxHeight: "none",
                          maxWidth: "none",
                          padding: 0,
                          overflow: "hidden",
                      }
            }
        >
            {target && recap !== null ? (
                <div
                    style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <h2 id={id} className="sr-only">
                        {v.RECAP_OPEN.replace("{year}", String(recap))}
                    </h2>
                    <AnnualRecap
                        ref={controls}
                        resourceKey={`${friendManager.scopeAtom.get()}:${recap}`}
                        loadRecap={() => loadAnnualRecap(Http, recap)}
                        onSelectYear={setRecap}
                        availableYears={[year, year - 1]}
                        vocabulary={v}
                        locale={locale}
                        onClose={onClose}
                    />
                </div>
            ) : (
                target && (
                    <>
                        <header className="mb-6 flex items-center justify-between gap-4">
                            <h2
                                id={id}
                                className="text-muted-foreground text-sm font-semibold"
                            >
                                {target.publicId
                                    ? v.SOCIAL_PROFILE_OPEN.replace(
                                          "{name}",
                                          target.name
                                      )
                                    : v.SOCIAL_PROFILE_SELF}
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={v.MOBILE_CLOSE}
                                onClick={onClose}
                            >
                                <X size={20} aria-hidden />
                            </Button>
                        </header>
                        <ListeningProfile
                            key={target.publicId ?? "self"}
                            resourceKey={`${friendManager.scopeAtom.get()}:${target.publicId ?? "self"}`}
                            loadProfile={() =>
                                friendManager.fetchListeningProfile(
                                    target.publicId
                                )
                            }
                            vocabulary={v}
                            recapYear={year}
                            onOpenRecap={
                                target.publicId
                                    ? undefined
                                    : () => setRecap(year)
                            }
                        />
                    </>
                )
            )}
        </Dialog>
    );
}
