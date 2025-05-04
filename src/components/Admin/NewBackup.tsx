"use client";

import { useState } from "react";
import Spinner from "@/components/Spinner";
import { useRouter } from "next/navigation";

export default function NewBackupButton() {
    const [inProgress, setInProgres] = useState(false);

    const router = useRouter();

    const handleClick = async () => {
        if (inProgress) {
            return;
        }
        setInProgres(true);
        const response = await fetch("/api/admin/db/new-backup");
        setInProgres(false);

        if (response.ok) {
            console.log("Backup done");
        } else {
            console.warn("Backup failed");
        }

        router.push("");
    };

    return (
        <div
            onClick={handleClick}
            className={
                "flex w-fit flex-row items-center gap-1 rounded bg-gradient-to-r from-[#fb6466] to-[#ee1086] p-2 select-none" +
                (inProgress ? " cursor-progress" : " cursor-pointer")
            }
        >
            New backup
            {inProgress && <Spinner color="white" width={20} height={20} />}
        </div>
    );
}
