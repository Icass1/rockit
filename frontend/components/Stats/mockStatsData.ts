export interface StatsSummary {
    songsListened: number;
    minutesListened: number;
    avgMinutesPerSong: number;
    currentStreak: number;
    topGenre: string;
}

export interface MinutesEntry {
    minutes: number;
    start: Date;
    end: Date;
}

export interface RankedItem {
    id: string;
    name: string;
    href: string;
    value: number;
    imageUrl?: string;
    subtitle?: string;
}

export interface HeatmapCell {
    hour: number;
    day: number;
    value: number;
}

export const MOCK_SUMMARY: StatsSummary = {
    songsListened: 29,
    minutesListened: 104,
    avgMinutesPerSong: 3.587,
    currentStreak: 7,
    topGenre: "Rock",
};

export const MOCK_MINUTES: MinutesEntry[] = [
    { minutes: 15, start: new Date("2026-03-06"), end: new Date("2026-03-07") },
    { minutes: 8, start: new Date("2026-03-07"), end: new Date("2026-03-08") },
    { minutes: 24, start: new Date("2026-03-08"), end: new Date("2026-03-09") },
    { minutes: 19, start: new Date("2026-03-09"), end: new Date("2026-03-10") },
    { minutes: 12, start: new Date("2026-03-10"), end: new Date("2026-03-11") },
    { minutes: 26, start: new Date("2026-03-11"), end: new Date("2026-03-12") },
    { minutes: 16, start: new Date("2026-03-12"), end: new Date("2026-03-13") },
    { minutes: 10, start: new Date("2026-03-13"), end: new Date("2026-03-14") },
];

export const MOCK_TOP_SONGS: RankedItem[] = [
    {
        id: "s1",
        name: "Pet Cheetah",
        href: "/song/pet-cheetah",
        value: 3,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "s2",
        name: "Doubt (demo)",
        href: "/song/doubt-demo",
        value: 2,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "s3",
        name: "Garbage",
        href: "/song/garbage",
        value: 2,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "s4",
        name: "Robot Voices",
        href: "/song/robot-voices",
        value: 2,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "s5",
        name: "Center Mass",
        href: "/song/center-mass",
        value: 2,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "s6",
        name: "Tally",
        href: "/song/tally",
        value: 2,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "s7",
        name: "I Like Dirt",
        href: "/song/i-like-dirt",
        value: 2,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "s8",
        name: "Addict With A Pen",
        href: "/song/addict-pen",
        value: 1,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "s9",
        name: "Heavydirtysoul",
        href: "/song/heavydirtysoul",
        value: 1,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "s10",
        name: "Not Today",
        href: "/song/not-today",
        value: 1,
        imageUrl: "/song-placeholder.png",
    },
];

export const MOCK_TOP_ALBUMS: RankedItem[] = [
    {
        id: "a1",
        name: "Breach",
        href: "/album/breach",
        value: 13,
        subtitle: "Witt Lowry",
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "a2",
        name: "Trench",
        href: "/album/trench",
        value: 3,
        subtitle: "Twenty One Pilots",
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "a3",
        name: "Blurryface",
        href: "/album/blurryface",
        value: 2,
        subtitle: "Twenty One Pilots",
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "a4",
        name: "Doubt (demo)",
        href: "/album/doubt-demo",
        value: 2,
        subtitle: "Various",
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "a5",
        name: "Californication",
        href: "/album/californication",
        value: 2,
        subtitle: "Red Hot Chili Peppers",
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "a6",
        name: "Twenty One Pilots",
        href: "/album/top-self",
        value: 1,
        subtitle: "Twenty One Pilots",
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "a7",
        name: "Back In Black",
        href: "/album/back-in-black",
        value: 1,
        subtitle: "AC/DC",
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "a8",
        name: "The Eminem Show",
        href: "/album/eminem-show",
        value: 1,
        subtitle: "Eminem",
        imageUrl: "/song-placeholder.png",
    },
];

export const MOCK_TOP_ARTISTS: RankedItem[] = [
    {
        id: "ar1",
        name: "Twenty One Pilots",
        href: "/artist/top",
        value: 7,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "ar2",
        name: "Red Hot Chili Peppers",
        href: "/artist/rhcp",
        value: 4,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "ar3",
        name: "AC/DC",
        href: "/artist/acdc",
        value: 3,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "ar4",
        name: "Queen",
        href: "/artist/queen",
        value: 3,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "ar5",
        name: "Eminem",
        href: "/artist/em",
        value: 3,
        imageUrl: "/song-placeholder.png",
    },
    {
        id: "ar6",
        name: "Hailie Jade",
        href: "/artist/hj",
        value: 3,
        imageUrl: "/song-placeholder.png",
    },
];

export const MOCK_HEATMAP: HeatmapCell[] = [
    { hour: 8, day: 0, value: 3 },
    { hour: 9, day: 0, value: 5 },
    { hour: 12, day: 0, value: 8 },
    { hour: 14, day: 1, value: 4 },
    { hour: 18, day: 1, value: 12 },
    { hour: 19, day: 1, value: 15 },
    { hour: 20, day: 1, value: 9 },
    { hour: 22, day: 2, value: 6 },
    { hour: 23, day: 2, value: 4 },
    { hour: 10, day: 3, value: 7 },
    { hour: 11, day: 3, value: 11 },
    { hour: 13, day: 3, value: 14 },
    { hour: 20, day: 4, value: 10 },
    { hour: 21, day: 4, value: 18 },
    { hour: 22, day: 4, value: 13 },
    { hour: 15, day: 5, value: 6 },
    { hour: 16, day: 5, value: 9 },
    { hour: 17, day: 5, value: 7 },
    { hour: 20, day: 6, value: 5 },
    { hour: 21, day: 6, value: 8 },
];
