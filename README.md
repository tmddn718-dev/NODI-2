# NODI 시안 — Claude Code 인수인계 (v5.2)

1. 압축을 풀고 폴더에서 Claude Code를 실행합니다: `cd nodi-handoff && claude`
2. Claude Code는 `CLAUDE.md`를 자동으로 읽어 지금까지의 맥락·결정·토큰·형식 규칙을 이어받습니다.
3. 처음 한 번: `npm install && npx playwright install chromium`
4. 확인: `npm test`(문법 + 시나리오), `npm run shots`(17개 화면 스크린샷 → `shots/`)

작업 대상은 `design/Main.dc.html` 하나입니다. 명세서 원문은 `specs/`에 있습니다.

첫 요청 예시:
- "CLAUDE.md의 남은 일 중 로딩·오류·빈 상태를 디자인해 줘. 끝나면 npm run shots로 확인해."
- "specs/07 기준으로 아직 반영 안 된 부분을 찾아서 목록으로 보여줘."
