import { ELyricsStatus } from "@/models/enums/lyricsStatus";

export interface ILyricsTimestamp {
    time: number;
    index: number;
}

export type TLyricsState =
    | { status: ELyricsStatus.Idle }
    | { status: ELyricsStatus.Loading }
    | { status: ELyricsStatus.EMPTY }
    | { status: ELyricsStatus.Static; lines: string[] }
    | {
          status: ELyricsStatus.Dynamic;
          lines: string[];
          timestamps: ILyricsTimestamp[];
      };
