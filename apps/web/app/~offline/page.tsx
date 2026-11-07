import type { JSX } from "react";
import OfflineLibraryClient from "@/components/Library/OfflineLibraryClient";

/** Generic offline entry; no user data is serialized into its cached document. */
export default function OfflinePage(): JSX.Element {
    return <OfflineLibraryClient />;
}
