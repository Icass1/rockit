// type SongsType = SongDB<
//     "id" | "name" | "artists" | "albumId" | "albumName" | "duration" | "image"
// >[];

import { RockItSong } from "@/types/rockIt";


export interface HomeStats {
    songsByTimePlayed: RockItSong[];
    randomSongsLastMonth: RockItSong[];
    nostalgicMix: RockItSong[];
    hiddenGems: RockItSong[];
    communityTop: RockItSong[];
    monthlyTop: RockItSong[];
    moodSongs: RockItSong[];
}
