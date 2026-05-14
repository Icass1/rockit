import { JSX } from "react";
import { EProviders } from "@rockit/packages/shared";
import SpotifyProviderTag from "@/components/ProviderTag/Spotify";
import YoutubeProviderTag from "@/components/ProviderTag/Youtube";
import YoutubeMusicProviderTag from "@/components/ProviderTag/YoutubeMusic";

export default function ProviderTag({
    name,
    className,
}: {
    name: string;
    className?: string;
}): JSX.Element {
    return (
        <div className={className}>
            <ProviderTagChild name={name}></ProviderTagChild>
        </div>
    );
}

function ProviderTagChild({ name }: { name: string }): JSX.Element {
    if (name === EProviders.YoutubeMusic) return <YoutubeMusicProviderTag />;
    else if (name === EProviders.Youtube)
        return <YoutubeProviderTag theme="dark" />;
    else if (name === EProviders.Spotify) return <SpotifyProviderTag />;
    else return <div>{name}</div>;
}
