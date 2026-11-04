"use client";

import { useEffect, useState, type JSX } from "react";
import {
    SessionResponseSchema,
    VocabularyResponseSchema,
    type SessionResponse,
    type VocabularyResponse,
} from "@/dto";
import { fallbackVocabulary } from "@/lib/i18n/vocabulary";
import { loadSessionOffline, loadVocabularyOffline } from "@/lib/offline/db";
import AppClientLayout from "@/components/Layout/AppClientLayout";
import LibraryClient from "@/components/Library/LibraryClient";
import {
    useVocabulary,
    VocabularyProvider,
} from "@/components/providers/VocabularyProvider";

export default function OfflineLibraryClient(): JSX.Element {
    const vocabulary = useVocabulary();
    const [snapshot, setSnapshot] = useState<{
        session?: SessionResponse;
        vocabulary: VocabularyResponse;
    }>();
    useEffect(() => {
        let active = true;
        void Promise.all([loadSessionOffline(), loadVocabularyOffline()])
            .then(([session, dictionary]) => {
                const parsedSession = SessionResponseSchema.safeParse(session);
                const parsedVocabulary =
                    VocabularyResponseSchema.safeParse(dictionary);
                if (active)
                    setSnapshot({
                        session: parsedSession.success
                            ? parsedSession.data
                            : undefined,
                        vocabulary: parsedVocabulary.success
                            ? parsedVocabulary.data
                            : fallbackVocabulary,
                    });
            })
            .catch(() => {
                if (active) setSnapshot({ vocabulary: fallbackVocabulary });
            });
        return () => {
            active = false;
        };
    }, []);
    if (snapshot?.session)
        return (
            <VocabularyProvider initial={snapshot.vocabulary}>
                <AppClientLayout session={snapshot.session}>
                    <LibraryClient />
                </AppClientLayout>
            </VocabularyProvider>
        );
    return (
        <main
            className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
            aria-busy={!snapshot}
        >
            <h1 className="text-2xl font-bold">{vocabulary.OFFLINE}</h1>
            <p className="text-muted-foreground max-w-md">
                {snapshot
                    ? vocabulary.WEB_OFFLINE_NO_SESSION
                    : vocabulary.WEB_OFFLINE_DESCRIPTION}
            </p>
        </main>
    );
}
