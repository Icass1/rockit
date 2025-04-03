import SongsCarousel from "@/components/Home/SongsCarousel";
import RecentlyPlayedSong from "@/components/Home/RecentlyPlayedSong";
import QuickSelectionsSong from "@/components/Home/QuickSelectionsSong";
import { getStats, type SongForStats, type Stats } from "@/lib/stats";
import { getLang } from "@/lib/getLang";
import {
    parsePlaylist,
    type PlaylistDB,
    type RawPlaylistDB,
} from "@/lib/db/playlist";
import { parseAlbum, type AlbumDB, type RawAlbumDB } from "@/lib/db/album";
import { parseUser, type RawUserDB, type UserDBList } from "@/lib/db/user";
import { db } from "@/lib/db/db";
import { getImageUrl } from "@/lib/getImageUrl";
import SessionStatus from "@/components/Auth/SessionStatus";
import { getSession } from "@/lib/auth/getSession";

export default async function Home() {
    const session = await getSession();

    console.log("server sesesion", session);

    return (
        <div className="relative h-full flex flex-col gap-10 pb-24 pt-24 overflow-y-auto">
            <SessionStatus></SessionStatus>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
            <div>asdf</div>
        </div>
    );
}
