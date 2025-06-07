import { Worker } from "bullmq";
import { connection } from "@/lib/jobs/connection";

import archiver from "archiver";
import { createWriteStream, existsSync } from "fs";
import { generateId } from "@/lib/generateId";
import { mkdir } from "fs/promises";
import { ENV } from "@/rockitEnv";

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

        const target = `temp/${id}`;

        const output = createWriteStream(target);

        const archive = archiver.create("zip"); // if using `import * as archiver`

        archive.pipe(output);
        archive.directory(path, false);

        archive.finalize();

        return id;
    },
    { connection }
);
