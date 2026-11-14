"use client";

import { useEffect, useId, useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { loadAnnualRecap, type ListeningBadgeResponse } from "@rockit/shared";
import {
    AnnualRecap,
    EmblemInspector,
    ListeningProfile,
    MedalDetail,
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
}): JSX.Element | null {
    const { friendManager } = useRuntimeServices();
    const scope = useStore(friendManager.scopeAtom);
    return target ? (
        <ProfileDialog
            key={`${scope}:${target.publicId ?? "self"}`}
            target={target}
            onClose={onClose}
        />
    ) : null;
}

function ProfileDialog({
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
    const [medal, setMedal] = useState<{
        badge: ListeningBadgeResponse;
        ownerName: string;
    } | null>(null);
    const profile = useRef<HTMLDivElement>(null);
    const returnPosition = useRef<{
        scroll: number;
        trigger: HTMLElement | null;
    }>({ scroll: 0, trigger: null });
    const backToProfile = (): void => {
        setMedal(null);
        requestAnimationFrame(() => {
            const dialog = profile.current?.closest("dialog");
            if (dialog) dialog.scrollTop = returnPosition.current.scroll;
            returnPosition.current.trigger?.focus({ preventScroll: true });
        });
    };
    const close = (): void => (medal ? backToProfile() : onClose());
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
            onClose={close}
            titleId={id}
            style={
                medal
                    ? {
                          width: `min(calc(100vw - ${theme.spacing.lg}px), ${theme.layout.medalDialogWidth}px)`,
                          height: `min(calc(100dvh - ${theme.spacing.lg}px), ${theme.layout.medalDialogHeight}px)`,
                          maxHeight: "none",
                          maxWidth: "none",
                          overflow: "hidden",
                          overscrollBehavior: "contain",
                          display: "flex",
                          flexDirection: "column",
                      }
                    : recap === null
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
            {medal && (
                <MedalDetail
                    locale={locale}
                    badge={medal.badge}
                    ownerName={medal.ownerName}
                    vocabulary={v}
                    onBack={backToProfile}
                    titleId={id}
                >
                    <EmblemInspector
                        badge={medal.badge}
                        ownerName={medal.ownerName}
                        vocabulary={v}
                        fill
                    />
                </MedalDetail>
            )}
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
                    <div ref={profile} hidden={!!medal}>
                        <header className="mb-6 flex items-center justify-between gap-4">
                            <h2
                                id={medal ? undefined : id}
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
                            locale={locale}
                            onInspectEmblem={(badge, ownerName) => {
                                returnPosition.current = {
                                    scroll:
                                        profile.current?.closest("dialog")
                                            ?.scrollTop ?? 0,
                                    trigger:
                                        document.activeElement instanceof
                                        HTMLElement
                                            ? document.activeElement
                                            : null,
                                };
                                setMedal({ badge, ownerName });
                            }}
                            recapYear={year}
                            onOpenRecap={
                                target.publicId
                                    ? undefined
                                    : () => setRecap(year)
                            }
                        />
                    </div>
                )
            )}
        </Dialog>
    );
}
