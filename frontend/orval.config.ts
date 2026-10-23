import { defineConfig } from "orval";
export default defineConfig({ travel: { input: "../contracts/openapi.json", output: { target: "src/api/generated/travel.ts", schemas: "src/api/generated/model", client: "react-query", httpClient: "fetch", mode: "split", override: { fetch: { includeHttpResponseReturnType: false } } }, hooks: { afterAllFilesWrite: "node ../tools/normalize-generated.mjs" } } });
