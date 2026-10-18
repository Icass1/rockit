export interface RuntimeConfig {
    backendUrl: string;
}
declare global {
    interface Window {
        __APP_RUNTIME_CONFIG__?: RuntimeConfig;
    }
}
