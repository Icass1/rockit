"use client";

import { AppError } from "@/lib/errors/AppError";
import ErrorPage from "@/components/ErrorPage/ErrorPage";

export default function Error({ error }: { error: Error; reset: () => void }) {
    const status = error instanceof AppError ? error.status : 500;
    const validCodes = [401, 403, 404, 500] as const;
    const code = validCodes.includes(status as (typeof validCodes)[number])
        ? (status as (typeof validCodes)[number])
        : 500;

    return <ErrorPage code={code} />;
}
