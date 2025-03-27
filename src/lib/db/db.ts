import { ENV } from "@/rockitEnv";

const BACKEND_URL = ENV.BACKEND_URL;

class Query {
    query: string;
    constructor(query: string) {
        this.query = query;
    }

    async get(...params: unknown[]): Promise<unknown> {
        // console.log("get", this.query, params);
        const response = await fetch(`${BACKEND_URL}/db/get`, {
            method: "POST",
            body: JSON.stringify({ query: this.query, params: params }),
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ENV.API_KEY}`,
            },
        });

        if (!response.ok) {
            return;
        }

        const json = await response.json();

        return json;
    }
    async run(...params: unknown[]) {
        // console.log("run", this.query, params);
        await fetch(`${BACKEND_URL}/db/run`, {
            method: "POST",
            body: JSON.stringify({ query: this.query, params: params }),
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ENV.API_KEY}`,
            },
        });
    }

    async all(...params: unknown[]): Promise<unknown[] | undefined> {
        // console.log("get", this.query, params);
        const response = await fetch(`${BACKEND_URL}/db/all`, {
            method: "POST",
            body: JSON.stringify({ query: this.query, params: params }),
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ENV.API_KEY}`,
            },
        });

        if (!response.ok) {
            return;
        }

        const json = await response.json();

        return json;
    }
}

class DB {
    constructor() {}

    prepare(query: string) {
        return new Query(query);
    }
}

export interface Column {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: null | string;
    pk: number;
}

export const db = new DB();
