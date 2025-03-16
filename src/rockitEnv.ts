import { loadEnv } from "vite";

const REQUIRED_ENV_VARS = [
    "ENVIRONMENT",
    // "CLIENT_ID",
    // "CLIENT_SECRET",
    "BACKEND_URL",
    // "FRONTEND_URL",
    "SONGS_PATH",
    // "TEMP_PATH",
    // "LOGS_PATH",
    "IMAGES_PATH",
    "INSECURE_DB_MODE",
    "API_KEY",
] as const;

const OPTIONAL_ENV_VARS = ["FORCE_REQUEST_LYRICS"] as const;

type RequiredEnvKeys = (typeof REQUIRED_ENV_VARS)[number];
type OptionalEnvKeys = (typeof OPTIONAL_ENV_VARS)[number];

// import * as fs from "fs";
// import * as path from "path";

// function loadEnv(envPath: string) {
//     const envFile = fs.readFileSync(path.join(envPath, ".env"), "utf-8");

//     const envVars = envFile.split("\n").reduce(
//         (acc, line) => {
//             const [key, value] = line.split("=");
//             acc[key] = value;
//             return acc;
//         },
//         {} as Record<string, string>
//     );
//     return envVars;
// }

// export const ENV: Record<EnvKeys, string | "true" | "false"> = loadEnv(
//     process.cwd()
// ) as any;

export const ENV: {
    [K in RequiredEnvKeys]: string | "true" | "false";
} & {
    [K in OptionalEnvKeys]?: string | "true" | "false";
} = loadEnv("", process.cwd(), "") as any;

// Check for missing environment variables
const missingVars = REQUIRED_ENV_VARS.filter((key) => !ENV[key]);

if (missingVars.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missingVars.join(
            ", "
        )}. Please ensure all required variables are set in your .env file.`
    );
}
