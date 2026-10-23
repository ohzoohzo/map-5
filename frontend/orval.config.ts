import { defineConfig } from "orval";
// mutator: 생성 함수도 client.ts 의 apiFetch 를 거쳐 오류 응답을 예외로 던진다 (#15)
// tags-split: 백엔드 라우터 tag 마다 generated/<tag>/<tag>.ts 로 따로 생성 → 기능끼리 생성 파일이 겹치지 않는다
export default defineConfig({ travel: { input: "../contracts/openapi.json", output: { target: "src/api/generated/api.ts", schemas: "src/api/generated/model", client: "react-query", httpClient: "fetch", mode: "tags-split", override: { fetch: { includeHttpResponseReturnType: false }, mutator: { path: "src/api/client.ts", name: "apiFetch" } } }, hooks: { afterAllFilesWrite: "node ../tools/normalize-generated.mjs" } } });
