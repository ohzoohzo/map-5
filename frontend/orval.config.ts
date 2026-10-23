import { defineConfig } from "orval";
// tags-split: 백엔드 라우터 tag 마다 generated/<tag>/<tag>.ts 로 따로 생성 → 기능끼리 생성 파일이 겹치지 않는다
export default defineConfig({ travel: { input: "../contracts/openapi.json", output: { target: "src/api/generated/api.ts", schemas: "src/api/generated/model", client: "react-query", httpClient: "fetch", mode: "tags-split", override: { mutator: { path: "src/api/fetcher.ts", name: "apiFetch" }, fetch: { includeHttpResponseReturnType: false } } }, hooks: { afterAllFilesWrite: "node ../tools/normalize-generated.mjs" } } });
