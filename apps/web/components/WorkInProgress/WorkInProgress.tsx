"use client";

import { JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function WorkInProgress(): JSX.Element {
    const $vocabulary = useVocabulary();

    return (
        <div className="relative flex h-screen w-full flex-col items-center justify-center bg-linear-to-r from-(--color-gradient-start) to-(--color-gradient-end) select-none">
            <div className="flex h-auto flex-col items-center gap-40 md:flex-row">
                <Image
                    alt="crane"
                    src="/crane2.gif"
                    width={200}
                    height={200}
                    className=""
                />
                <Image
                    alt="crane"
                    src="/work-in-progress-icon.png"
                    width={200}
                    style={{ transformOrigin: "50% 5.85%" }}
                    height={200}
                    className="rotate-forever"
                />
            </div>

            <Link
                href="/"
                className={`bg-foreground-strong text-background md:hover:bg-foreground mt-10 rounded-full px-5 py-2 text-lg font-bold shadow-md transition md:mt-20`}
            >
                {$vocabulary.RETURN_BACK_HOME}
            </Link>
        </div>
    );
}
