# LabKnock 웹 서비스 (시연용)

소프트웨어공학개론 팀 프로젝트 '랩노크(LabKnock)'의 요구사항 명세(SRS v1.3)를 실제로 동작하는 웹 서비스로 만든 발표·시연용 프로젝트입니다.

- 배포 사이트: https://gardenpark03.github.io/labknock-demo/
- 화면: HTML·CSS·바닐라 JS 정적 사이트(GitHub Pages). 빌드 단계가 없습니다.
- 서버: Supabase(Postgres·인증·파일 저장소). 권한과 업무 규칙(정원 초과 차단, 첫 지원 이후 공고 고정, 상태 전이, 인증 승인)은 서버 함수가 다시 검사합니다.
- 로그인 화면의 **발표용 데모 계정**(학생·연구실 관리자·관리자 신청자·운영 보조)으로 바로 들어갈 수 있습니다. 비밀번호는 `labknock-demo-2026`입니다.
- 회원가입은 skku.edu·g.skku.edu 학교 이메일만 됩니다. 가입하면 실제 확인 메일이 가고, 링크를 누르면 확인과 로그인이 함께 끝납니다.
- 인물·연구실·공고와 예시 PDF는 모두 가상 데이터입니다.

---

## 팀원 시작 가이드

처음이면 위에서부터 순서대로 따라 하면 됩니다. 1~4단계는 한 번만 하면 되고, 30분이면 충분합니다.

### 1. 준비물 설치 (한 번만)

| 프로그램 | 확인 명령 | 없으면 |
| --- | --- | --- |
| Git | `git --version` | https://git-scm.com |
| Node.js 20 이상 | `node -v` | https://nodejs.org (LTS) |
| Docker Desktop | `docker info` | https://www.docker.com/products/docker-desktop |
| Chrome | | 자동 시험이 설치된 Chrome을 씁니다 |

Python 3도 필요합니다(사이트를 띄우는 데 씀). macOS는 기본으로 들어 있고, 확인은 `python3 --version`입니다. Windows는 https://www.python.org 에서 설치하고, 아래 명령의 `python3`를 `python`으로 바꿔 쓰세요.

Docker Desktop은 **설치 후 앱을 실행해 둔 상태**여야 합니다. 로컬 서버(Supabase)가 Docker 안에서 돌아갑니다.

### 2. 저장소 받기 (한 번만)

GitHub 초대 메일(또는 https://github.com/gardenpark03/labknock-demo/invitations)에서 초대를 수락한 뒤:

```bash
git clone https://github.com/gardenpark03/labknock-demo.git
cd labknock-demo
npm install
```

공개 저장소라 커밋에 적히는 이메일도 공개됩니다. 개인 메일을 숨기려면 GitHub Settings → Emails에서 'Keep my email addresses private'를 켜고, 거기 나오는 `…@users.noreply.github.com` 주소를 쓰세요.

```bash
git config user.email "아이디@users.noreply.github.com"
```

### 3. 내 컴퓨터에 서버 켜기

```bash
npx supabase@2.122.1 start
```

- 처음에는 Docker 이미지를 내려받느라 5~10분 걸립니다. 다음부터는 1분 안에 켜집니다.
- 끝나면 주소가 여러 개 나옵니다. 자주 쓰는 것은 아래 두 개입니다.
  - Studio(DB를 표로 보기): http://127.0.0.1:54323
  - Mailpit(로컬에서 보낸 메일함): http://127.0.0.1:54324
- 테이블, 서버 규칙, 가상 데이터가 자동으로 들어갑니다. **배포 서버와는 완전히 별개**라서 마음껏 고치고 지워도 됩니다.
- 끌 때는 `npx supabase@2.122.1 stop`입니다.

### 4. 사이트 켜고 열어 보기

새 터미널 창에서(저장소 폴더 안):

```bash
python3 -m http.server 4173
```

Chrome에서 http://127.0.0.1:4173 을 엽니다. `127.0.0.1`·`localhost`로 열면 `js/config.js`가 자동으로 **로컬 서버**에 연결합니다.

- 로그인 화면의 데모 계정 버튼으로 학생·관리자·운영 보조를 바꿔 가며 눌러 보세요.
- 로컬에서 회원가입하면 메일은 실제로 가지 않고 Mailpit(http://127.0.0.1:54324)에 쌓입니다. 거기서 확인 링크를 누르면 됩니다.
- 데이터를 처음 상태로 돌리려면 `npx supabase@2.122.1 db reset`을 실행하거나, 운영 보조로 로그인해 화면 맨 아래 **데모 데이터 초기화**를 누릅니다.

### 5. 작업하는 방법 (매번)

1. **내 이슈 보기**: https://github.com/gardenpark03/labknock-demo/issues 에서 본인에게 배정된 이슈의 체크리스트를 확인합니다.
2. **최신 main 받고 브랜치 만들기**
   ```bash
   git checkout main
   git pull
   git checkout -b fix/짧은-설명      # 예: fix/labs-empty-message
   ```
3. **고치기**: 화면별 코드 위치는 [CONTRIBUTING.md](CONTRIBUTING.md)의 '화면별 코드 위치' 표를 보세요. 브라우저를 새로고침하면 바로 반영됩니다(빌드 없음).
4. **확인하기**
   ```bash
   npm test          # 자동 시험 (로컬 서버가 켜져 있어야 함)
   npm run test:ui   # 화면을 보면서 시험
   ```
   휴대폰 폭도 봐 주세요. Chrome 개발자 도구에서 기기 모드를 켜고 390px로 맞추면 됩니다.
5. **올리기**
   ```bash
   git add -A
   git commit -m "무엇을 고쳤는지 한 줄"
   git push -u origin fix/짧은-설명
   ```
   push하면 나오는 링크나 GitHub 화면에서 **Pull Request**를 엽니다. 양식에 무엇을 왜 고쳤는지, 관련 SRS ID, 이슈 번호(예: `#1`)를 적습니다.
6. **기다리기**: PR을 열면 GitHub가 자동 시험을 돌립니다. 팀장이 확인하고 main에 합치면 1~2분 뒤 배포 사이트에 반영됩니다.

문구 하나만 고칠 때는 GitHub 웹에서 파일을 열고 연필 버튼을 누른 뒤, **Create a new branch for this commit and start a pull request**를 골라도 됩니다.

### 6. 꼭 지킬 것

- **main에 직접 push하지 않습니다.** main이 곧 배포 사이트입니다.
- **배포 서버(Supabase 대시보드)의 데이터는 건드리지 않습니다.** 발표용 데이터입니다. 개발과 연습은 로컬 서버로 합니다.
- PR은 작게, 한 PR에 한 가지만 담습니다. 여러 명이 `js/views.js`를 같이 고치므로 파일 전체 자동 정렬(Prettier 등)이나 구조 변경은 하지 않습니다.
- SRS v1.3에 없는 기능이나 규칙은 넣기 전에 단톡에서 먼저 이야기합니다.
- 서버 규칙(테이블·함수)을 바꿀 때는 기존 파일을 고치지 말고 새 마이그레이션을 만듭니다: `npx supabase@2.122.1 migration new 이름`. 그다음 `npx supabase@2.122.1 db reset`으로 로컬에 적용해 확인합니다. 배포 서버 반영은 팀장이 합니다.
- 비밀번호, 서버 비밀 키(secret·service_role), 실제 개인정보는 코드에 넣지 않습니다.
- AI로 작업할 때는 AI가 `AGENTS.md`를 읽게 하세요. Codex·Cursor·Claude Code는 자동으로 읽습니다.

### 자주 막히는 곳

| 증상 | 해결 |
| --- | --- |
| `supabase start`에서 Docker 오류 | Docker Desktop 앱이 켜져 있는지 확인합니다. |
| 사이트에 "서버에 연결할 수 없어요"가 나옴 | 로컬 서버가 꺼져 있습니다. `npx supabase@2.122.1 start`를 실행합니다. |
| 포트가 이미 쓰이는 중이라는 오류 | 다른 터미널에 켜 둔 서버가 있는지 확인하고, `npx supabase@2.122.1 stop` 후 다시 켭니다. |
| `npm test`가 시작하자마자 실패 | 로컬 서버가 꺼져 있을 가능성이 큽니다. 3단계로 서버를 먼저 켭니다. |
| 시험 하나만 돌리고 싶음 | `npx playwright test tests/파일이름.spec.js` |
| 데이터가 꼬였음 | `npx supabase@2.122.1 db reset` |
| 로그인했는데 화면이 예전 그대로 | 브라우저 새로고침(캐시 때문이면 Shift를 누른 채 새로고침) |
| `git push`가 거절됨 | main에 push한 것입니다. 브랜치를 만들어 push합니다. |

더 자세한 규칙, 파일 구조, 서버 구조, 자동 시험 작성법은 [CONTRIBUTING.md](CONTRIBUTING.md)에 있습니다.

### 마감

- **11/21(토) 23:59**: 팀원 작업 마감. 이슈 체크리스트를 PR로 모두 올립니다. 이후에는 시연을 막는 오류만 고칩니다.
- 11/22(일): 데모 영상 녹화, 슬라이드·데모 제출 · 11/23(월): 발표 연습 · 11/25(수): 발표

---

글꼴: Pretendard (SIL Open Font License 1.1, `assets/fonts/OFL.txt`) · Supabase JS 클라이언트 2.118.0 (MIT, `assets/vendor/supabase-LICENSE.txt`)

## SRS v1.3과 다른 점

제출한 SRS v1.3은 그대로 두고, 구현이 SRS와 다른 곳을 여기에 적습니다. 앞의 네 가지는 Supabase 인증의 동작 방식에서, 뒤의 네 가지는 시연 범위로 단순하게 구현한 데서 나온 차이입니다. 근거와 확인 내용은 [이슈 #2](https://github.com/gardenpark03/labknock-demo/issues/2)의 검수 댓글과 [이슈 #4](https://github.com/gardenpark03/labknock-demo/issues/4)·[이슈 #5](https://github.com/gardenpark03/labknock-demo/issues/5)의 서버 검토 댓글에 있습니다.

| 항목 | SRS v1.3 | 구현 | 이유와 영향 |
|---|---|---|---|
| 이메일 확인 전 로그인 | 미확인 계정도 로그인해 탐색·본인 프로필·확인 안내를 쓸 수 있다 (3.1.8, FR-07-04.3) | 이메일을 확인하기 전에는 로그인할 수 없다 | Supabase 인증 설정. 지원 제출과 인증 신청은 서버가 이메일 확인을 다시 검사한다. 미확인 계정 관련 확인 사례는 화면 시험으로 만들 수 없다. |
| 비밀번호 길이 | 12~128자 (6.1) | 12~72자 | Supabase 인증(bcrypt)의 한계. 가입 화면은 12~72자로 안내한다. |
| 로그인 시도 제한 | 5회 연속 실패 시 15분 차단 (NFR-06) | 화면을 거친 로그인에만 적용된다 | 제한은 화면이 로그인 전에 부르는 사전 검사다. 인증 API를 직접 부르면 차단 중에도 로그인되고, 다른 사람이 남의 이메일로 5번 틀려 계정을 15분 잠글 수 있다. 인증 단계에 검사를 연결하는 것은 향후 과제다. |
| 30분 비활동 로그아웃 | 마지막 활동 뒤 30분이 지나면 세션을 만료한다 (FR-07-13, 4.7.2) | 마지막 활동 시각을 브라우저에 두고 브라우저가 판단한다 | 서버에서 판단하려면 세션별 활동 시각 저장(DB 구조 변경)이 필요하다. 로그아웃한 세션의 토큰은 서버가 거절한다. |
| 제출 시 공고 재확인 | 작성 중 공고 내용이 바뀌면 제출 전에 최신 내용을 다시 확인받고, 접수 때 확인한 공고 버전을 남긴다 (FR-03-05.3, FR-03-06) | 제출 때 모집 중인지와 이름·학년만 다시 검사한다 | 화면(UI-03)과 제출 함수를 함께 바꿔야 해서 향후 과제로 둔다. 시연 범위에서는 첫 지원 뒤 공고가 고정되므로(FR-05-05) 영향이 작다. |
| 공고 버전 비교 | 정수 버전(revision)으로 동시 수정을 구분한다 (FR-05-07, FR-05-09, 6.2.3) | 마지막 저장 시각(밀리초)을 비교한다 | 일반적인 두 창 충돌은 자동 시험으로 확인했다. 같은 밀리초 안의 연속 저장은 구분하지 못한다. |
| 응답 유실 뒤 결과 확인 | 같은 요청 ID로 다시 물으면 처음 결과를 돌려준다 (FR-X-04, FR-X-05, 부록 B.4) | 같은 요청을 다시 보내지 않고 서버의 최신 상태와 이력을 읽어 결과를 확인한다 | 공고 저장과 심사 화면에 구현했고 자동 시험으로 확인했다. 요청 ID별 결과 저장은 향후 과제다. |
| 지원 제출·철회의 결과 미확인 | 응답을 못 받으면 결과 미확인을 표시하고 접수 여부를 조회하는 동작을 제공한다 (FR-03-08, TC-03-08) | 연결 실패 안내만 표시하고 결과 확인 버튼은 없다. 입력과 상태는 그대로 두고 다시 누를 수 있다 | 다시 제출하면 서버가 이미 접수된 지원을 찾아 기존 지원 현황으로 안내하고(FR-03-07), 철회는 서버가 현재 상태를 다시 검사하므로(FR-04-06) 중복 접수·중복 철회는 생기지 않는다. 확인 버튼은 향후 과제다. |
