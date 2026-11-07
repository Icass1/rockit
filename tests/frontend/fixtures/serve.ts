import { createFixtureBackend } from "./backend";

void createFixtureBackend(Number(process.env.FIXTURE_PORT ?? 18899)).then(
    (backend) => {
        process.stdout.write(`Fixture backend listening at ${backend.url}\n`);
        for (const signal of ["SIGTERM", "SIGINT"] as const)
            process.on(
                signal,
                () => void backend.close().then(() => process.exit(0))
            );
    }
);
