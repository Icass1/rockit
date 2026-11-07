/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {BaseHttp} from '../../packages/shared/src/http/baseHttp';
export {HttpResult} from '../../packages/shared/src/models/types/httpTypes';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "module",
    platform: "node",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
});
function client(response) {
    const context = vm.createContext({
        console: { error() {} },
        URLSearchParams,
    });
    vm.runInContext(outputFiles[0].text, context);
    class Http extends context.module.BaseHttp {
        static async baseApiFetchAsync() {
            return response;
        }
    }
    return Http;
}
test("invalid JSON returned with HTTP 200 remains a failure", async () => {
    const result = await client(
        new Response("<html>Unavailable</html>")
    ).getSession();
    assert.equal(result.code, 200);
    assert.equal(result.isOk(), false);
    assert.equal(result.isNotOk(), true);
    assert.match(result.detail, /Invalid JSON/);
});
test("a Zod-invalid HTTP 200 cannot expose an undefined successful result", async () => {
    const result = await client(
        Response.json({ username: "incomplete" })
    ).getSession();
    assert.equal(result.isNotOk(), true);
    assert.equal(result.isOk(), false);
    assert.equal(result.message, "Validation Error");
});
test("validated session data remains successful", async () => {
    const result = await client(
        Response.json({
            username: "listener",
            image: "",
            admin: false,
            queueType: "SORTED",
            repeatMode: "OFF",
            currentTimeMs: null,
        })
    ).getSession();
    assert.equal(result.isOk(), true);
    assert.equal(result.result.username, "listener");
});
test("an unsuccessful status preserves the API failure", async () => {
    const result = await client(
        Response.json({ detail: "Expired" }, { status: 401 })
    ).getSession();
    assert.equal(result.isNotOk(), true);
    assert.equal(result.code, 401);
    assert.equal(result.detail, "Expired");
});
