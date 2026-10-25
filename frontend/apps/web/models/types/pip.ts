export type PiPLayout = "cover-only" | "narrow" | "sidebar" | "pill" | "full";

export interface DocumentPiP {
    requestWindow: (options: {
        width: number;
        height: number;
    }) => Promise<Window>;
}
