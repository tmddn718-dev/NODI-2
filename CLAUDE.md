# NODI — 모바일 시안 (Claude Design 캔버스 v5.2) 작업 인수인계

이 폴더는 claude.ai의 Claude Design 캔버스에서 진행한 NODI 시안 작업을 Claude Code에서 이어가기 위한 것이다.
캔버스(원본): https://claude.ai/artifact/PpFJppWXQZc3HvGSCfRDGF — 최신 게시 버전 = 이 폴더의 `design/` 내용.

## 제품

- NODI: AI 회의 조율 서비스. 브랜드 메시지 "Better timing, together.", 콘셉트 Soft Clarity.
- 흐름: 회의 생성 시작(선택형 + 자유 입력) → 조건 확인 → 참석자 선택 → 일정 필수 설정 → 조율 현황 → 추천 시간 → 최종 검토 → NODI 저장 → 후속 처리 확인. 재조율, 받은 요청/응답 흐름 포함.
- 브랜드: 로고 `design/assets/nodi-symbol.svg`, Primary `#3654D4`, Navy `#18243A`, Canvas `#F5F7FB`, Surface `#FFFFFF`.
- 절대 원칙: 데모 기능(캘린더 연동, 알림 발송)을 실제 성공처럼 표현하지 않는다. 일정 가능 여부 · 참석 수락 · 캘린더 상태 · 알림 처리 상태를 서로 다른 개념으로 표시한다. 필수 참석자 충돌이 확인된 후보를 "필수 일정 조건 충족"으로 표시하지 않는다.

## 파일 구조

```
design/
  Main.dc.html          ← 모든 화면·로직이 들어 있는 단일 컴포넌트 (약 1,600줄). 실제 작업 대상.
  01-conds … 16-request-stale.dc.html   ← 각 화면 아트보드. <dc-import name="Main" view="phone" initial-screen="…"> 한 줄짜리 래퍼라 보통 수정할 필요 없음
  canvas.json           ← 캔버스 보드 배치(Main 1440×11000, 폰 보드 414×868)
  assets/               ← nodi-symbol.svg(로고), nodi-3d-calendar.svg, nodi-3d-calendar-empty.svg, nodi-3d-clock.svg (오리지널 3D 일러스트)
tools/
  dcshim.js             ← .dc.html을 브라우저에서 돌리는 최소 렌더러(로컬 검증 전용, Claude Design 런타임 아님)
  shoot.js              ← 화면 스크린샷 + QA 지표(44px 미만 터치 영역, 13px 미만 글자)
  scenarios.js          ← 클릭/입력 시나리오 테스트(선택형 흐름, 조건 추출 규칙)
  check-syntax.js       ← 로직 클래스 문법 검사
  sheet.py              ← 스크린샷 여러 장을 가로로 이어 붙이기(Pillow)
specs/                  ← 사용자에게 받은 명세서 원문(시간순 01→08). 07이 가장 최근의 상위 지시서
docs/                   ← 초기 감사 문서
```

## .dc.html 형식 규칙 (어기면 Claude Design에서 깨진다)

- 템플릿은 `<x-dc>` 안. 값은 `{{ dotted.path }}` 조회만 가능 — `{{ a + b }}`, `{{ !x }}`, `{{ fn() }}` 같은 표현식 금지. 계산은 `renderVals()`에서 하고 이름으로 노출.
- 분기/반복: `<sc-if value="{{ cond }}" hint-placeholder-val="{{ true }}">`, `<sc-for list="{{ items }}" as="item" hint-placeholder-count="3">` — hint 속성 항상 포함.
- 이벤트: `onClick="{{ handler }}"`(JSX camelCase, 함수는 renderVals가 반환). 반복 항목별 핸들러는 각 item에 붙인다.
- 로직: `<script type="text/x-dc" data-dc-script data-props='…'>` 안의 `class Component extends DCLogic` (React 클래스 컴포넌트와 비슷, render 없음). import/export, TypeScript 금지.
- `data-props`는 작은따옴표 속성 안의 JSON. `$preview`(Main은 1440×11000)와 tweak(view, initialScreen, 시나리오 토글들)가 있다. 페이지 높이가 늘면 `$preview.height`와 `canvas.json`의 Main `h`를 같이 늘린다.
- 인라인 스타일만 사용(전역 CSS는 `<helmet><style>`에 최소한만). div/span에 onClick 금지 — 버튼을 쓴다.
- 아이콘: Lucide 경로를 `L` 맵에 두고 `ic(name,size,color,strokeWidth,spin)`로 생성, 자주 쓰는 것은 `I.*`.

## 로직 구조 (Main.dc.html)

- 상태 `state.screen`으로 화면 전환: splash, chat, progress, recs, review, done, meetings, detail, resched, rsReview, inbox, request (+ 시트 `sheet:'pick'|'req'|'edit'`, 모달 `reschedAsk`, `cancelAsk`).
- 시드 데이터: `PEOPLE`, `SEED_MEET`, `SEED_REQ`, `RS_CANDS`/`RS_RESP`(재조율 후보·응답, c3는 필수 참석자 '불가' 데모), `DAYS`(11/17–27 평일, 오늘 = 11월 16일 월).
- `applySeed(k)`: 아트보드별 초기 화면(chat, conds, edit, sheetPick, sheetReq, progress, recs, review, done, meetings, detail, reschedAsk, resched, rsReview, inbox, request, stale).
- 회의 생성: `initMsgs()` 첫 메시지 + `GUIDE` 선택지(type → when → dur, 모호하면 whenAmb/pref). `pickGuide` → `askNext` → `finishGuide`. 자유 입력은 `send` → `respond` → `parse()`(규칙 기반 데모 추출기) → `extractState()`가 ready / needs_clarification 판정, unsupported/failed는 안내 + 선택지 복구. 이미 파악한 조건은 `state.guide`에 유지.
- 조건 카드: `condRows`(행 전체 탭 → 수정, 출처 태그: AI 해석은 숨김, 선택은 숨김, 직접 수정/확인함/미정/기본값 표시).
- 추천: `computeRecs()`(2단계: 필수 조건 → 참여 최대화), 카드 `recs`(필수 일정 조건 배지, 요약 한 줄, 근거 펼치기), 비교표 4행.
- 재조율: `rsEval()` → yes/cal/no/unk/need가 서로 겹치지 않게 집계, `reqNo`면 기본 목록에서 빼고 "필수 조건 미충족 후보" 접힘 영역(선택 불가).
- 홈(회의 잡기 첫 화면): `isHome`일 때 제목·예시·빠른 선택 칩·`이전 회의로 새 일정 잡기`(바텀시트 `reuseOpen`, `applyReuse`는 원본 회의를 바꾸지 않고 새 초안을 만든다)·`작성 중` 카드(`draftSave` 자동 저장 → `resumeDraft`). 튜닝: `noDraft`, `newUser`.
- 완료: `dnFollow`(후속 처리 현황 3행) + `dnFix`(실패가 있을 때만 확인 필요 항목). `taskRows()`는 회의 상세 외부 처리 상태에 사용.

## 현재 디자인 토큰 (v5.2)

- 글자(스케일 13·14·16·18·24·28): 화면·완료 제목 24/700, 섹션 제목 18/600 Navy, 카드 핵심 시간 24–28/600(추천 카드 28), 본문 16/400, 보조 13–14/400, 배지 13/500, 버튼 16/600. 최소 13px. 간격은 4px 격자(안전 영역 하단 34px 제외).
- 색: 보조 글자 `#5B6B81`(명세의 #64748B는 #F5F7FB 위 4.4:1이라 조정), 테두리 `#E2E8F0`, 상태 글자 success `#137B57` / warning `#925500` / error `#B52E3A`(연한 배지 위 대비 확보), 위험 버튼 `#C93646`, 비활성 `#E9EDF3` 위 `#5B6B81`. 강조 숫자만 Primary.
- 모서리: 카드 16, 바텀시트 24, 입력 12, 버튼 14, 배지 pill. 버튼 높이: 주요 56, 보조 48, 터치 최소 44.
- 아이콘: 뒤로·닫기·검색·날짜·정보·성공/오류에만. 배지·탭·CTA·설정 행·상태 행에는 아이콘 없음. 하단 내비게이션만 아이콘+문구.
- 3D 일러스트는 완료(08)·재조율 모달(11)·빈 상태에만.

## 사용자가 직접 정한 결정 (명세서보다 우선)

- 하단 내비게이션은 아이콘 + 문구 유지. 배지·상단 탭·CTA는 텍스트만.
- 참석자 바텀시트 상단의 "1 참석자 선택 — 2 일정 필수 설정" 단계 표시 제거.
- 15 응답 선택 버튼: 선택 시 아이콘 없이 채움 색만.
- 09 내 회의 날짜 박스 54px, 상태 배지는 짧게(확정/재조율/조율 중/종료/취소). 10 상세 아바타 44px, 참석 응답 먼저, 데모 알림은 보조 문구.
- 12 재조율 통계: 3열 "가능 응답 / 충돌 없음 / 참석 어려움", 숫자는 모두 Navy, 집계 기준 설명을 아래에.
- 최소 글자 13px(일부 명세의 12px 캡션은 미적용).
- 토스 레퍼런스는 특징만 참고(로고·토스페이스·에셋·화면 구성 복제 금지).

## 작업 방법

```bash
npm install            # playwright
npx playwright install chromium   # 처음 한 번
node tools/check-syntax.js         # 로직 문법
node tools/shoot.js                # 17개 화면 → shots/*.png + 지표 (목표: targets<44px 0 · text<13px 0)
node tools/shoot.js --page         # 데스크톱 전체 페이지
node tools/scenarios.js            # 시나리오 테스트
python3 tools/sheet.py shots shots/sheet.png chat,conds,recs,done   # 비교 시트
```

- 로컬 렌더러는 Pretendard 대신 시스템 한글 폰트를 쓴다. 최종 확인은 캔버스에서 한다.
- 화면 수정 후에는 위 세 명령으로 회귀 확인 → 스크린샷을 직접 보고 겹침·줄바꿈·잘림 확인.
- 페이지의 "디자인 시스템 · 검증" 영역에 버전별 문서 카드가 쌓여 있다(v5.2가 맨 위, 강조 테두리). 큰 변경마다 카드 하나를 추가하고 이전 카드 테두리는 회색으로.
- 캔버스에 다시 올리려면 claude.ai 대화에서 이 `design/` 폴더 내용을 게시하거나, Artifact 게시 도구가 있는 환경이면 위 URL에 `design/Main.dc.html`을 `project/Main.dc.html`로, 새 에셋은 `project/assets/…`로 올린다.

## 남은 일 / 제한

- 실제 앱이 아니라 390pt 고정 기기 프레임 시안 → iOS Safari·Android·키보드·작은 화면·큰 글자 검증은 실제 구현 단계에서.
- 로딩·오류·빈 상태 13종(명세 07의 13.4) 중 일부만 존재(AI 해석 실패·재조율 후보 없음 등 미디자인).
- 회의 상세 "회의 조건" 영역 없음(데이터에 길이·참석 방식 필드가 없어 보류).
- 진행 바–단계명 간격 12px 미적용(상단 고정 영역 재배치 필요).
- 조건 추출 AI: 시안은 규칙 기반 데모. 제안 JSON 스키마는 페이지 v5.1 카드와 `specs/08_회의조건추출AI_시스템프롬프트.md` 참고.
- 3D 일러스트는 SVG 그라데이션 수준 → 실서비스에서는 렌더링 이미지로 교체 권장.
