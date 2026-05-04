import { EProviders } from "@rockit/packages/shared";
import SpotifyProviderTag from "@/components/ProviderTag/Spotify";
import YoutubeProviderTag from "@/components/ProviderTag/Youtube";
import YoutubeMusicProviderTag from "@/components/ProviderTag/YoutubeMusic";

export default function ProviderTag({ name }: { name: string }) {
    if (name === EProviders.YoutubeMusic) return <YoutubeMusicProviderTag />;
    else if (name === EProviders.Youtube)
        return <YoutubeProviderTag theme="dark" />;
    else if (name === EProviders.Spotify) return <SpotifyProviderTag />;
    else return <div>{name}</div>;
}
