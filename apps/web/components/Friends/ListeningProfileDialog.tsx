"use client";

import { useId, type JSX } from "react";
import { ListeningProfile } from "@rockit/ui";
import { X } from "lucide-react";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
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
    return (
        <Dialog open={!!target} onClose={onClose} titleId={id}>
            {target && (
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
                            friendManager.fetchListeningProfile(target.publicId)
                        }
                        vocabulary={v}
                    />
                </>
            )}
        </Dialog>
    );
}
