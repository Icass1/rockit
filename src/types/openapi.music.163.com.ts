export interface OpenApiMusicSongs {
    result: Result;
    code: number;
}

export interface Result {
    songs: Song[];
    hasMore: boolean;
    songCount: number;
}

export interface Song {
    id: number;
    name: string;
    artists: Artist[];
    album: Album;
    duration: number;
    copyrightId: number;
    status: number;
    alias: any[];
    rtype: number;
    ftype: number;
    mvid: number;
    fee: number;
    rUrl: any;
    mark: number;
}

export interface Artist {
    id: number;
    name: string;
    picUrl: any;
    alias: any[];
    albumSize: number;
    picId: number;
    fansGroup: any;
    img1v1Url: string;
    img1v1: number;
    trans: any;
}

export interface Album {
    id: number;
    name: string;
    artist: Artist2;
    publishTime: number;
    size: number;
    copyrightId: number;
    status: number;
    picId: number;
    mark: number;
    alia?: string[];
}

export interface Artist2 {
    id: number;
    name: string;
    picUrl: any;
    alias: any[];
    albumSize: number;
    picId: number;
    fansGroup: any;
    img1v1Url: string;
    img1v1: number;
    trans: any;
}




export interface OpenApiMusicLyrics {
    sgc: boolean
    sfy: boolean
    qfy: boolean
    transUser: TransUser
    lrc: Lrc
    code: number
  }
  
  export interface TransUser {
    id: number
    status: number
    demand: number
    userid: number
    nickname: string
    uptime: number
  }
  
  export interface Lrc {
    version: number
    lyric: string
  }
  


