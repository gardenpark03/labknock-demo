# 팀원 작업 안내

이 저장소는 랩노크 SRS v1.3을 시연하는 웹 프로토타입입니다. 지금 main은 SRS 화면을 한 번 이어 붙인 **데모 v1**이고, 팀원이 담당 파트를 맡아 v2로 완성합니다. 할 일은 GitHub Issues에 담당자별로 있습니다.

**main 브랜치가 곧 배포본**이라서, main에 합쳐진 변경은 1~2분 뒤 https://gardenpark03.github.io/labknock-demo/ 에 그대로 반영됩니다. 그래서 main에는 직접 올리지 않고 Pull Request(PR)로만 합칩니다.

## 실행

- 저장소를 받은 뒤 `index.html`을 Chrome으로 열면 됩니다. 설치·빌드·서버가 필요 없습니다.
- 데이터는 브라우저 저장소(localStorage `labknock-site-v1`, 첨부 파일은 IndexedDB)에 남습니다. 화면 맨 아래 **데모 데이터 초기화**를 누르면 처음 상태로 돌아갑니다.
- 로그인 화면의 **발표용 데모 계정**으로 학생·연구실 관리자·관리자 신청자·운영 보조 계정에 바로 들어갈 수 있습니다.

## 작업 순서

1. main에서 브랜치를 만듭니다. 예: `fix/labs-empty-message`
2. 맡은 화면 위주로 작게 고칩니다. PR 하나에는 한 가지 목적만 담습니다.
3. 아래 **PR 전 확인**을 합니다.
4. PR을 엽니다. 양식에 무엇을 왜 고쳤는지, 관련 SRS ID, 확인한 시연 장면을 적습니다.
5. 팀장이 확인한 뒤 main에 합칩니다.

문구만 고칠 때는 GitHub 웹에서 파일의 연필 버튼을 누르고 **Create a new branch for this commit and start a pull request**를 골라도 됩니다.

**11/20(금) 23:59 이후에는 시연을 막는 오류만 고칩니다.** 데모 영상 녹화와 발표 화면을 맞추기 위해서입니다.

## 자동 시험

SRS의 확인 사례(TC)를 브라우저 자동 시험(Playwright)으로 만듭니다. PR을 열면 GitHub Actions가 모든 시험을 돌리고, 실패하면 PR에 표시됩니다.

- 처음 한 번: `npm install` (Node 20 이상, Chrome 필요)
- 실행: `npm test` · 화면을 보며 실행: `npm run test:ui`
- 파일 이름은 `tests/tc-XX-YY-짧은설명.spec.js`, 시험 이름은 TC ID로 시작합니다. 예: `tests/tc-01-08-search-limit.spec.js`
- 시험마다 새 브라우저 저장소에서 시작하므로 가상 데이터는 항상 처음 상태입니다. 로그인은 `tests/helpers.js`의 `loginAs(page, '학생')`을 씁니다.
- 시험이 SRS와 다른 동작을 찾으면 시험을 고치지 말고 이슈로 알려 주세요. 코드를 고칠지, SRS와의 차이로 기록할지 함께 정합니다.
- `package.json`과 `tests/`는 시험에만 씁니다. 사이트는 여전히 빌드 없이 `index.html`만으로 동작해야 합니다.

## 파일 구조

| 파일 | 내용 |
| --- | --- |
| `index.html` | 머리글·본문·바닥글·확인창의 틀 |
| `app.css` | 화면별 스타일 |
| `assets/tokens.css`, `assets/components.css` | 공통 색·간격·글자 토큰, 버튼·입력·배지 등 공통 컴포넌트 |
| `js/core.js` | 공통 도구: DOM 선택, 날짜·글자 수 계산, 확인창, 알림, 첨부 파일 보관 |
| `js/data.js` | 가상 데이터(`seed()`)와 저장, 공고·지원 상태 규칙, 계정·세션·권한 |
| `js/views.js` | 화면 |
| `js/main.js` | 주소(`#/…`)별 화면 연결, 머리글·바닥글, 로그인 뒤 복귀, 다른 탭 변경 반영 |

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
| 학교 이메일 확인·가상 메일함 | `#/account/email`, `#/verify-email`, `#/mailbox` | `viewEmail`, `viewVerifyEmail`, `viewMailbox` |
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
- 사이트에 외부 라이브러리·CDN·빌드 도구를 더하지 않습니다. 인터넷이 없어도 `index.html`만으로 열려야 합니다(발표용 예비본). 시험 도구는 `package.json`의 개발용 의존성으로만 둡니다.
- `seed()`의 가상 데이터를 바꾸면, 이미 열어 본 브라우저에는 예전 데이터가 남아 있습니다. 확인 전에 **데모 데이터 초기화**를 누르세요. 저장 구조 자체는 바꾸지 말고, 꼭 필요하면 팀장과 먼저 상의해 주세요.
- 공개 저장소입니다. 실제 이름·학번·이메일·비밀번호·키를 넣지 않습니다. 커밋에 개인 이메일이 공개되지 않게 GitHub noreply 주소를 쓰는 것을 권장합니다(GitHub Settings → Emails).

## PR 전 확인

- [ ] **데모 데이터 초기화** 뒤 핵심 흐름이 그대로 됩니다: 홈 → 탐색 → 상세, 학생 로그인 → 지원서 제출 → 내 지원 현황 → 철회, 연구실 관리자 공고 게시 → 검토 시작 → 합격 → 정원 초과 차단, 학생 화면의 합격 표시, 인증 전 관리자 안내
- [ ] `npm test`가 모두 통과합니다
- [ ] 개발자 도구 Console에 오류가 없습니다
- [ ] 1440px과 390px(휴대폰) 폭에서 가로로 넘치거나 겹치는 곳이 없습니다
- [ ] `index.html`을 파일로 바로 열어도 동작합니다

## AI 도구로 고칠 때

같은 규칙을 [AGENTS.md](AGENTS.md)에 정리했습니다. Codex·Cursor 같은 도구는 `AGENTS.md`를, Claude Code는 `CLAUDE.md`를 자동으로 읽습니다. 그 밖의 AI에는 `AGENTS.md` 내용을 먼저 붙여 넣으세요. 한 번에 큰 수정을 시키지 말고, 바뀐 줄을 직접 확인한 뒤 PR을 여세요.
