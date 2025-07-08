// lib/jobs/queue.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
});

export const homeStatsQueue = new Queue("home-stats", {
    connection,
});

export const statsQueue = new Queue("stats", {
    connection,
});

export const zipDirectoryQueue = new Queue("zip-directory", {
    connection,
});
