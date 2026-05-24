import { JSX } from "react";
import { EProviders } from "@rockit/packages/shared";
import SpotifyProviderTag from "@/components/ProviderTag/Spotify";
import YoutubeProviderTag from "@/components/ProviderTag/Youtube";
import YoutubeMusicProviderTag from "@/components/ProviderTag/YoutubeMusic";

export default function ProviderTag({
    name,
    className,
    iconOnly,
}: {
    name: string;
    className?: string;
    iconOnly?: boolean;
}): JSX.Element {
    return (
        <div className={className}>
            <ProviderTagChild name={name} iconOnly={iconOnly}></ProviderTagChild>
        </div>
    );
}

function ProviderTagChild({
    name,
    iconOnly,
}: {
    name: string;
    iconOnly?: boolean;
}): JSX.Element {
    if (name === EProviders.YoutubeMusic)
        return <YoutubeMusicProviderTag iconOnly={iconOnly} />;
    else if (name === EProviders.Youtube)
        return <YoutubeProviderTag theme="dark" iconOnly={iconOnly} />;
    else if (name === EProviders.Spotify)
        return <SpotifyProviderTag iconOnly={iconOnly} />;
    else return <div>{name}</div>;
}
