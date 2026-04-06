"use client";

import { EErrorCode } from "@/models/enums/errorCode";
import { AppError } from "@/lib/errors/AppError";
import ErrorPage from "@/components/ErrorPage/ErrorPage";

const VALID_CODES = [
    EErrorCode.UNAUTHORIZED,
    EErrorCode.FORBIDDEN,
    EErrorCode.NOT_FOUND,
    EErrorCode.INTERNAL_SERVER_ERROR,
] as const;

export default function Error({ error }: { error: Error; reset: () => void }) {
    const status = error instanceof AppError ? error.status : 500;
    const code = VALID_CODES.includes(status as (typeof VALID_CODES)[number])
        ? (status as (typeof VALID_CODES)[number])
        : EErrorCode.INTERNAL_SERVER_ERROR;

    return <ErrorPage code={code} />;
}
