"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function WorkInProgress() {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    return (
        <div className="relative flex h-screen w-full flex-col items-center justify-center bg-linear-to-r from-[#d185ca] to-[#ffbb9e] select-none">
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
                className={`mt-10 rounded-full bg-white px-5 py-2 text-lg font-bold text-black shadow-md transition md:mt-20 md:hover:bg-neutral-200`}
            >
                {$vocabulary.RETURN_BACK_HOME}
            </Link>
        </div>
    );
}
