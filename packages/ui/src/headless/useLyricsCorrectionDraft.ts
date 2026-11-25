import { useState } from "react";
import type {
    LyricsCorrectionContextResponse,
    LyricsWord,
    PlaybackLyricsLine,
    Vocabulary,
} from "@rockit/shared";
import { lyricsCorrectionSchema } from "@rockit/shared/models/schemas/lyricsCorrection";

export function useLyricsCorrectionDraft(
    snapshot: LyricsCorrectionContextResponse
) {
    const [offset, setOffset] = useState(snapshot.offset);
    const [lines, setLines] = useState<PlaybackLyricsLine[]>(snapshot.lines);
    const changed = lines !== snapshot.lines || offset !== snapshot.offset;
    const proposal = lyricsCorrectionSchema.safeParse({
        kind: "lyrics_correction",
        provider: snapshot.provider,
        revision: snapshot.revision,
        offset,
        lines,
    });

    function editLine(
        index: number,
        update: (line: PlaybackLyricsLine) => PlaybackLyricsLine
    ) {
        setLines((current) =>
            current.map((line, i) => (i === index ? update(line) : line))
        );
    }

    function editWord(
        lineIndex: number,
        wordIndex: number,
        patch: Partial<LyricsWord>
    ) {
        editLine(lineIndex, (line) => {
            const words = line.words.map((word, i) =>
                i === wordIndex ? { ...word, ...patch } : word
            );
            return {
                ...line,
                words,
                text: words.map((word) => word.text).join(""),
            };
        });
    }

    return {
        offset,
        setOffset,
        lines,
        setLines,
        editLine,
        editWord,
        proposal,
        changed,
    };
}

export function lyricsCorrectionError(
    vocabulary: Vocabulary,
    detail: unknown
): string {
    return typeof detail === "string" && Object.hasOwn(vocabulary, detail)
        ? vocabulary[detail as keyof Vocabulary]
        : vocabulary.EDIT_METADATA_ERROR;
}
