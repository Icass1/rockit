import type { JSX } from "react";
import Image from "next/image";
import { EProviders } from "@rockit/shared";

export default function RockitProviderTag({
    iconOnly,
}: {
    iconOnly?: boolean;
}): JSX.Element {
    return (
        <span className="inline-flex items-center gap-1">
            <Image
                src="/rockit-logo.svg"
                alt={iconOnly ? EProviders.Rockit : ""}
                width={16}
                height={16}
                unoptimized
            />
            {!iconOnly && <span>{EProviders.Rockit}</span>}
        </span>
    );
}
