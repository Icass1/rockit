// lib/jobs/queue.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis();

export const homeStatsQueue = new Queue("home-stats", {
    connection,
});

export const statsQueue = new Queue("stats", {
    connection,
});
