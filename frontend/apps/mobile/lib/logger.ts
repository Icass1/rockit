import { atom } from "nanostores";

export type LogLevel = "debug" | "log" | "info" | "warn" | "error";

export interface LogEntry {
    id: number;
    timestamp: string;
    level: LogLevel;
    args: unknown[];
}

const MAX_LOGS = 1000;

class Logger {
    private _logsAtom = atom<LogEntry[]>([]);
    private _idCounter = 0;
    private _originals: Record<LogLevel, (...args: unknown[]) => void>;

    constructor() {
        this._originals = {
            debug: console.debug.bind(console),
            log: console.log.bind(console),
            info: console.info.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
        };

        console.debug = (...args: unknown[]) => this._capture("debug", ...args);
        console.log = (...args: unknown[]) => this._capture("log", ...args);
        console.info = (...args: unknown[]) => this._capture("info", ...args);
        console.warn = (...args: unknown[]) => this._capture("warn", ...args);
        console.error = (...args: unknown[]) => this._capture("error", ...args);
    }

    private _capture(level: LogLevel, ...args: unknown[]) {
        if (level === "error") {
            const realStack = new Error().stack
                ?.split("\n")
                .slice(3)
                .join("\n");
            const message = args
                .map((a) => (typeof a === "string" ? a : String(a)))
                .join(" ");
            const err = new Error(message);
            err.stack = `Error: ${message}\n${realStack}`;
            this._originals[level](err);
        } else {
            this._originals[level](...args);
        }

        const id = this._idCounter++;
        const entry: LogEntry = {
            id,
            timestamp: new Date().toISOString(),
            level,
            args,
        };

        const current = this._logsAtom.get();
        if (current.length >= MAX_LOGS) {
            current.shift();
        }
        this._logsAtom.set([...current, entry]);
    }

    get logsAtom() {
        return this._logsAtom;
    }

    getLogs(): LogEntry[] {
        return this._logsAtom.get();
    }

    clear() {
        this._logsAtom.set([]);
    }

    restore() {
        console.debug = this._originals.debug;
        console.log = this._originals.log;
        console.info = this._originals.info;
        console.warn = this._originals.warn;
        console.error = this._originals.error;
    }
}

export const logger = new Logger();
