"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomeClient() {
    const router = useRouter();

    useEffect(() => {
        router.push("/library");
    }, [router]);

    return null;
}
