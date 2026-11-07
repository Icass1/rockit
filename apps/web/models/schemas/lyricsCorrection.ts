import { z } from "zod";

export const lyricsCorrectionSchema = z
    .object({
        kind: z.literal("lyrics_correction"),
        provider: z.string().min(1),
        revision: z.string().regex(/^[a-f0-9]{64}$/),
        offset: z.number().finite().min(-120).max(120),
        lines: z
            .array(
                z.object({
                    text: z.string().max(2000),
                    timestamp_s: z
                        .number()
                        .finite()
                        .min(0)
                        .max(86400)
                        .nullable(),
                })
            )
            .min(1)
            .max(1000),
    })
    .superRefine((value, context) => {
        const times = value.lines.map((line) => line.timestamp_s);
        const timed = times.filter((time): time is number => time !== null);
        if (
            !value.lines.some((line) => line.text.trim()) ||
            (timed.length > 0 && timed.length !== times.length) ||
            timed.some((time, i) => i > 0 && time < timed[i - 1])
        ) {
            context.addIssue({
                code: "custom",
                message:
                    "Use ordered timestamps for every line or leave every time empty.",
            });
        }
    });
