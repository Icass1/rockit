export type songDB = {
    id: string;
    name: string;
    duration: number;
    path: string;
    artists: songDBArtist[];
    images: songDBImage[];
}
export type songDBImage = {
    url: string
    width: number
    height: number
}
export type songDBArtist = {
    name: string
    id: string
}