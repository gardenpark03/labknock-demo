# 팀원 작업 안내

이 저장소는 랩노크 SRS v1.3을 실제로 동작하게 만든 시연용 웹 서비스입니다. 화면은 정적 사이트(HTML·CSS·바닐라 JS), 서버는 Supabase(Postgres·인증·파일 저장소)입니다. 지금 main은 SRS 화면과 서버를 한 번 이어 붙인 **데모 v1**이고, 팀원이 담당 파트를 맡아 v2로 완성합니다. 할 일은 GitHub Issues에 담당자별로 있습니다.

**main 브랜치가 곧 배포본**이라서, main에 합쳐진 변경은 1~2분 뒤 https://gardenpark03.github.io/labknock-demo/ 에 그대로 반영됩니다. 그래서 main에는 직접 올리지 않고 Pull Request(PR)로만 합칩니다.

## 내 컴퓨터에서 실행

배포 서버의 데이터를 건드리지 않도록, 작업할 때는 내 컴퓨터에 Supabase를 띄워 씁니다(Docker 필요). `127.0.0.1`·`localhost`로 열면 `js/config.js`가 자동으로 로컬 서버에 연결합니다.

1. 처음 한 번: Docker Desktop 실행, `npm install`
2. 서버 켜기: `npx supabase@2.122.1 start` (처음에는 이미지 내려받기에 몇 분 걸립니다)
3. 사이트 켜기: `python3 -m http.server 4173` → Chrome에서 http://127.0.0.1:4173 열기
4. 로컬에서 회원가입하면 확인 메일은 실제로 가지 않고 http://127.0.0.1:54324 (Mailpit)에 쌓입니다. DB는 http://127.0.0.1:54323 (Studio)에서 볼 수 있습니다.
5. 데이터를 처음 상태로: `npx supabase@2.122.1 db reset` 또는 운영 보조 계정으로 화면 아래 **데모 데이터 초기화**

- 로그인 화면의 **발표용 데모 계정**으로 학생·연구실 관리자·관리자 신청자·운영 보조 계정에 바로 들어갈 수 있습니다.
- `index.html`을 파일로 바로 여는 방식(file://)은 이제 쓰지 않습니다.

## 작업 순서

1. main에서 브랜치를 만듭니다. 예: `fix/labs-empty-message`
2. 맡은 화면 위주로 작게 고칩니다. PR 하나에는 한 가지 목적만 담습니다.
3. 아래 **PR 전 확인**을 합니다.
4. PR을 엽니다. 양식에 무엇을 왜 고쳤는지, 관련 SRS ID, 확인한 시연 장면을 적습니다.
5. 팀장이 확인한 뒤 main에 합칩니다.

문구만 고칠 때는 GitHub 웹에서 파일의 연필 버튼을 누르고 **Create a new branch for this commit and start a pull request**를 골라도 됩니다.

**11/22(일) 23:59 이후에는 시연을 막는 오류만 고칩니다.** 데모 영상 녹화와 발표 화면을 맞추기 위해서입니다.

## 자동 시험

SRS의 확인 사례(TC)를 브라우저 자동 시험(Playwright)으로 만듭니다. PR을 열면 GitHub Actions가 모든 시험을 돌리고, 실패하면 PR에 표시됩니다.

- 처음 한 번: `npm install` (Node 20 이상, Chrome 필요)
- 실행: `npm test` · 화면을 보며 실행: `npm run test:ui`
- 파일 이름은 `tests/tc-XX-YY-짧은설명.spec.js`, 시험 이름은 TC ID로 시작합니다. 예: `tests/tc-01-08-search-limit.spec.js`
- 시험은 로컬 Supabase가 켜져 있어야 돕니다. 시험마다 `resetDemo()`로 데이터를 처음 상태로 돌리고, 같은 데이터를 쓰므로 하나씩 돕니다. 로그인은 `loginAs(page, '학생')`, 화면이 다 그려질 때까지 기다릴 때는 `settle(page)`를 씁니다.
- 가입 시험은 Mailpit에 온 확인 메일의 링크를 `latestConfirmLink(email)`로 찾아 엽니다.
- 시연 데이터의 모집 기간(예: 지능형시스템 연구실 2026.11.10 – 11.30)에 기대는 시험이 있어서, 그 기간이 지나면 시험 데이터를 함께 고쳐야 합니다.
- 시험이 SRS와 다른 동작을 찾으면 시험을 고치지 말고 이슈로 알려 주세요. 코드를 고칠지, SRS와의 차이로 기록할지 함께 정합니다.
- `package.json`과 `tests/`는 시험에만 씁니다. 사이트 자체에는 빌드 단계가 없습니다.

## 서버(Supabase)

- `supabase/migrations/`: 테이블, 권한, 업무 규칙 함수(RPC), 파일 저장소 권한, 가상 데이터. 모든 테이블은 RLS로 직접 접근을 막고, 화면은 `get_state()`와 저장 함수로만 읽고 씁니다.
- 규칙을 바꾸려면 기존 마이그레이션을 고치지 말고 새 마이그레이션 파일을 만듭니다(`npx supabase@2.122.1 migration new 이름`). 배포 서버 반영은 팀장이 합니다.
- `supabase/config.toml`: 인증 설정(비밀번호 12자 이상, 이메일 확인 필수, 확인 링크 30분, 재발송 60초)과 확인 메일 양식(`supabase/templates/`)
- 비밀 키(secret·service_role), DB 비밀번호, 메일 계정 비밀번호는 저장소에 절대 올리지 않습니다. `js/config.js`의 publishable key는 브라우저에 공개되는 키라 괜찮습니다.

## 파일 구조

| 파일 | 내용 |
| --- | --- |
| `index.html` | 머리글·본문·바닥글·확인창의 틀 |
| `app.css` | 화면별 스타일 |
| `assets/tokens.css`, `assets/components.css` | 공통 색·간격·글자 토큰, 버튼·입력·배지 등 공통 컴포넌트 |
| `js/config.js` | 연결할 Supabase 주소와 공개 키(로컬·배포 자동 선택) |
| `js/core.js` | 공통 도구: DOM 선택, 날짜·글자 수 계산, 확인창, 알림, 첨부 파일 열기 |
| `js/data.js` | 서버에서 받은 데이터(`S`)와 서버 요청(`api`), 공고·지원 상태 표시 규칙, 계정·세션·권한 |
| `js/views.js` | 화면 |
| `js/main.js` | 주소(`#/…`)별 화면 연결(그리기 전에 서버에서 최신 데이터를 받음), 머리글·바닥글, 로그인 뒤 복귀, 확인 메일 링크 처리 |
| `supabase/` | DB 마이그레이션, 인증 설정, 확인 메일 양식 |
| `tests/` | Playwright 자동 시험 |

## 화면별 코드 위치 (`js/views.js`)

| 화면 | 주소 | 함수 |
| --- | --- | --- |
| 홈 | `#/` | `viewHome` |
| UI-01 연구실 탐색 | `#/labs` | `viewLabs` |
| UI-02 연구실 상세 | `#/lab/…` | `viewDetail` |
| UI-03 지원서 작성 | `#/apply/…` | `viewApply` |
| UI-04 내 지원 현황 | `#/my` | `viewMy` |
| UI-05 모집 공고 관리 | `#/admin/recruitments` | `viewRecruit` |
| UI-06 지원자 관리 | `#/admin/applicants` | `viewReview` |
| 로그인·회원가입 | `#/login`, `#/signup` | `viewLogin`, `viewSignup` |
| 학교 이메일 확인 | `#/check-email`, `#/verify-email`, `#/account/email` | `viewCheckEmail`, `viewVerifyEmail`, `viewEmail` |
| 내 정보 | `#/account` | `viewAccount` |
| 연구실 소속 인증·인증 전 안내 | `#/verification` | `viewVerification`, `viewAdminGate` |
| 운영 보조 인증 검토 | `#/ops/verifications` | `viewOps` |
| 찾을 수 없는 주소 | 그 밖의 주소 | `viewNotFound` |

## 지켜 주세요

- 기준은 SRS v1.3입니다. SRS에 없는 기능이나 업무 규칙(추천, 알림, 비교 등)을 넣고 싶으면 먼저 팀 단톡에서 이야기해 주세요. 발표에서 SRS와 다르면 질문이 나옵니다.
- 여러 명이 `js/views.js`를 함께 고칩니다. 파일 전체 자동 정렬(Prettier 등), 파일 나누기, 이름 바꾸기 같은 구조 변경은 하지 않습니다.
- 공통 파일(`app.css`, `assets/`, `js/core.js`, `js/data.js`, `js/main.js`)을 고칠 때는 단톡에 먼저 알려 주세요.
- 색·간격·버튼은 기존 토큰과 클래스를 그대로 씁니다. 라이트 테마와 Pretendard 글꼴을 유지하고, 누르는 영역은 44px 이상으로 둡니다.
- 버튼 문구는 결과가 보이는 동작으로 씁니다. 예: `지원서 제출`, `공고 게시`
- 사이트에 외부 라이브러리·CDN·빌드 도구를 더하지 않습니다(Supabase 클라이언트는 `assets/vendor/`에 넣어 둔 파일을 씁니다). 시험 도구는 `package.json`의 개발용 의존성으로만 둡니다.
- 데이터 저장은 반드시 서버 함수(`api.*`)로 합니다. 화면에서 `S`를 직접 바꿔 저장한 것처럼 보이게 하지 않습니다. 권한·규칙 검사는 화면과 서버 함수 양쪽에 둡니다.
- 공개 저장소입니다. 실제 이름·학번·이메일·비밀번호·키를 넣지 않습니다. 커밋에 개인 이메일이 공개되지 않게 GitHub noreply 주소를 쓰는 것을 권장합니다(GitHub Settings → Emails).

## PR 전 확인

- [ ] 로컬 서버를 처음 상태로 돌린 뒤 핵심 흐름이 그대로 됩니다: 홈 → 탐색 → 상세, 학생 로그인 → 지원서 제출 → 내 지원 현황 → 철회, 연구실 관리자 공고 게시 → 검토 시작 → 합격 → 정원 초과 차단, 학생 화면의 합격 표시, 인증 전 관리자 안내
- [ ] `npm test`가 모두 통과합니다
- [ ] 개발자 도구 Console에 오류가 없습니다
- [ ] 1440px과 390px(휴대폰) 폭에서 가로로 넘치거나 겹치는 곳이 없습니다

## AI 도구로 고칠 때

같은 규칙을 [AGENTS.md](AGENTS.md)에 정리했습니다. Codex·Cursor 같은 도구는 `AGENTS.md`를, Claude Code는 `CLAUDE.md`를 자동으로 읽습니다. 그 밖의 AI에는 `AGENTS.md` 내용을 먼저 붙여 넣으세요. 한 번에 큰 수정을 시키지 말고, 바뀐 줄을 직접 확인한 뒤 PR을 여세요.
