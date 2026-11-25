import { z } from "zod";

const seconds = z.number().finite().min(0).max(86400);
const word = z.object({
    text: z.string(),
    timestamp_s: seconds,
    end_timestamp_s: seconds.nullable().default(null),
});

export const lyricsCorrectionSchema = z
    .object({
        kind: z.literal("lyrics_correction"),
        provider: z.string().min(1).max(100),
        revision: z.string().regex(/^[a-f0-9]{64}$/),
        offset: z.number().finite().min(-120).max(120),
        lines: z
            .array(
                z.object({
                    text: z.string().max(2000),
                    timestamp_s: seconds.nullable(),
                    words: z.array(word).max(2000).nullable().default(null),
                    end_timestamp_s: seconds.nullable().default(null),
                })
            )
            .min(1)
            .max(1000),
    })
    .superRefine(({ lines }, context) => {
        const timed = lines.flatMap((line) =>
            line.timestamp_s === null ? [] : [line.timestamp_s]
        );
        if (
            !lines.some((line) => line.text.trim()) ||
            (timed.length > 0 && timed.length !== lines.length) ||
            timed.some((time, i) => i > 0 && time < timed[i - 1])
        ) {
            context.addIssue({
                code: "custom",
                message: "Invalid lyrics lines or timestamps",
            });
        }
        for (const [index, line] of lines.entries()) {
            const start = line.timestamp_s;
            const end = line.end_timestamp_s;
            const words = line.words ?? [];
            if (
                (end !== null && (start === null || end < start)) ||
                (words.length > 0 &&
                    words.map((word) => word.text).join("") !== line.text) ||
                words.some(
                    (word, i) =>
                        start === null ||
                        word.timestamp_s < start ||
                        (i > 0 &&
                            word.timestamp_s < words[i - 1].timestamp_s) ||
                        (word.end_timestamp_s !== null &&
                            word.end_timestamp_s < word.timestamp_s) ||
                        (end !== null &&
                            (word.end_timestamp_s ?? word.timestamp_s) > end)
                )
            ) {
                context.addIssue({
                    code: "custom",
                    path: ["lines", index],
                    message: "Invalid word alignment",
                });
            }
        }
    });
