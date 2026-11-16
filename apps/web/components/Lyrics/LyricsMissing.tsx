"use client";

import { useId, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { useLyricsSourceProposal } from "@rockit/ui/headless/useLyricsSourceProposal";
import { CheckCircle2, ExternalLink, FileMusic, Send } from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import { Input } from "@/components/ui/Input";

export function LyricsMissing({
    mediaPublicId,
}: {
    mediaPublicId: string;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const session = useStore(rockIt.userManager.sessionAtom);
    const proposal = useLyricsSourceProposal(
        Http,
        mediaPublicId,
        () =>
            !!session &&
            rockIt.userManager.sessionAtom.get() === session &&
            rockIt.queueManager.currentMediaAtom.get()?.publicId ===
                mediaPublicId,
        () => window.dispatchEvent(new Event("lyrics-updated"))
    );
    const id = useId();
    const error =
        proposal.error === "invalid"
            ? vocabulary.LYRICS_SOURCE_INVALID
            : proposal.error === "notFound"
              ? vocabulary.LYRICS_SOURCE_NOT_FOUND
              : proposal.error
                ? vocabulary.LYRICS_SOURCE_UNAVAILABLE
                : undefined;
    return (
        <div className="flex min-h-full items-center justify-center px-5 py-8">
            <section className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
                {proposal.sent ? (
                    <CheckCircle2
                        size={32}
                        className="text-primary"
                        aria-hidden="true"
                    />
                ) : (
                    <FileMusic
                        size={32}
                        className="text-muted-foreground"
                        aria-hidden="true"
                    />
                )}
                <div className="space-y-3">
                    <h3
                        aria-live="polite"
                        className="text-foreground-strong text-2xl font-semibold tracking-tight"
                    >
                        {proposal.sent
                            ? vocabulary.LYRICS_SOURCE_SENT
                            : vocabulary.LYRICS_MISSING_TITLE}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {proposal.sent
                            ? vocabulary.LYRICS_SOURCE_REVIEW
                            : vocabulary.LYRICS_SOURCE_HELP}
                    </p>
                </div>
                {!proposal.sent && (
                    <>
                        <a
                            href="https://lrclib.net"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary inline-flex min-h-11 items-center justify-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
                        >
                            {vocabulary.LYRICS_SOURCE_SEARCH}
                            <ExternalLink size={15} aria-hidden="true" />
                        </a>
                        <form
                            className="flex w-full max-w-64 flex-col items-center gap-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void proposal.submit();
                            }}
                        >
                            <label
                                htmlFor={id}
                                className="text-muted-foreground text-xs"
                            >
                                {vocabulary.LYRICS_SOURCE_ID}
                            </label>
                            <Input
                                id={id}
                                inputMode="numeric"
                                autoComplete="off"
                                value={proposal.value}
                                className="rounded-none! border-0! border-b! bg-transparent! text-center text-lg!"
                                placeholder={
                                    vocabulary.LYRICS_SOURCE_PLACEHOLDER
                                }
                                disabled={proposal.busy}
                                aria-invalid={!!error}
                                aria-describedby={
                                    error ? `${id}-error` : `${id}-help`
                                }
                                onChange={(event) =>
                                    proposal.setValue(event.target.value)
                                }
                            />
                            {error && (
                                <p
                                    id={`${id}-error`}
                                    role="alert"
                                    className="text-destructive-soft text-sm"
                                >
                                    {error}
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={!proposal.valid || proposal.busy}
                                className="text-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                            >
                                <Send size={16} aria-hidden="true" />
                                {proposal.busy
                                    ? vocabulary.METADATA_SUBMITTING
                                    : vocabulary.LYRICS_SOURCE_SUBMIT}
                            </button>
                            <p
                                id={`${id}-help`}
                                className="text-muted-foreground text-xs leading-relaxed"
                            >
                                {vocabulary.LYRICS_SOURCE_REVIEW}
                            </p>
                        </form>
                    </>
                )}
            </section>
        </div>
    );
}
