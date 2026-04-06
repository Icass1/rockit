import { ELyricsStatus } from "@/models/enums/lyricsStatus";

export interface ILyricsTimestamp {
    time: number;
    index: number;
}

export type TLyricsState =
    | { status: ELyricsStatus.IDLE }
    | { status: ELyricsStatus.LOADING }
    | { status: ELyricsStatus.EMPTY }
    | { status: ELyricsStatus.STATIC; lines: string[] }
    | {
          status: ELyricsStatus.DYNAMIC;
          lines: string[];
          timestamps: ILyricsTimestamp[];
      };
