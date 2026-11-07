"use client";

import type { JSX } from "react";
import Link from "next/link";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import { Button } from "@/components/ui/Button";

type ErrorCode = 404 | 500 | 403 | 401;

export default function ErrorPage({
    code,
    retry,
}: {
    code: ErrorCode;
    retry?: () => void;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const content = {
        401: [
            vocabulary.WEB_ERROR_UNAUTHORIZED_TITLE,
            vocabulary.WEB_ERROR_UNAUTHORIZED_DESCRIPTION,
        ],
        403: [
            vocabulary.WEB_ERROR_FORBIDDEN_TITLE,
            vocabulary.WEB_ERROR_FORBIDDEN_DESCRIPTION,
        ],
        404: [
            vocabulary.WEB_ERROR_NOT_FOUND_TITLE,
            vocabulary.WEB_ERROR_NOT_FOUND_DESCRIPTION,
        ],
        500: [
            vocabulary.WEB_ERROR_UNAVAILABLE_TITLE,
            vocabulary.WEB_ERROR_UNAVAILABLE_DESCRIPTION,
        ],
    }[code];
    return (
        <main className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-primary text-6xl font-bold">{code}</p>
            <h1 className="text-2xl font-semibold">{content[0]}</h1>
            <p className="text-muted-foreground max-w-md">{content[1]}</p>
            {retry && <Button onClick={retry}>{vocabulary.RETRY}</Button>}
            <Link
                href="/"
                className="text-primary focus-visible:outline-ring rounded-xl px-4 py-3 focus-visible:outline-2"
            >
                {vocabulary.RETURN_BACK_HOME}
            </Link>
        </main>
    );
}
