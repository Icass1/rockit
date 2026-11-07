"use client";

import type { JSX } from "react";
import ErrorPage from "@/components/ErrorPage/ErrorPage";

// Server error properties are sanitized in production. Expected statuses are
// classified in the server loader; this boundary handles unexpected failures.
export default function Error({
    reset,
}: {
    error: Error;
    reset: () => void;
}): JSX.Element {
    return <ErrorPage code={500} retry={reset} />;
}
