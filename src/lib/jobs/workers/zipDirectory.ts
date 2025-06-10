import { Worker } from "bullmq";
import { connection } from "@/lib/jobs/connection";

import archiver from "archiver";
import { createWriteStream, existsSync } from "fs";
import { generateId } from "@/lib/generateId";
import { mkdir } from "fs/promises";
import { ENV } from "@/rockitEnv";
import { once } from "events";

new Worker(
    "zip-directory",
    async (job) => {
        const {
            path,
        }: {
            path: string;
        } = job.data;

        const id = generateId(16);

        if (!existsSync(ENV.TEMP_PATH)) {
            await mkdir(ENV.TEMP_PATH);
        }

        const target = `${ENV.TEMP_PATH}/${id}`;

        const output = createWriteStream(target);

        const archive = archiver.create("zip", {
            zlib: { level: 9 }, // optional: best compression
        }); // if using `import * as archiver`

        archive.pipe(output);
        archive.directory(path, false);

        await archive.finalize();
        await once(output, "close"); // or "finish"

        return id;
    },
    { connection }
);
