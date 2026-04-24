# zkTalk UI Redesign — Design Brief

> Telegram-like 미니멀 톤으로 Community + Personal + Multi-device AI Agent 를 한 제품 안에 묶어내기 위한 설계 의도 정리.

## 1. 문제 정의

현재 zkTalk은 기능적으로 성숙합니다 — Phase 0~8 (Auth, Community, Channel, WebSocket, Thread, Moderation, Search)까지 완성됐고, AI 어시스턴트 모달, 웹훅/봇 스키마, 디바이스 러ntime의 씨앗까지 마련돼 있습니다. 다만 UI는 Discord 다크 블루-블랙 톤에 글래스모피즘이 강하게 얹혀 있어, Telegram 스타일의 "1:1로 가볍게 쓰는 메신저" 사용감과 충돌합니다. 또한 새로 추가되는 **멀티 디바이스 Agent** 기능이 들어올 자리가 아직 1급 시민이 아닙니다.

이 재설계는 세 가지 동시에 해결합니다:

1. Discord식 커뮤니티 경험을 유지하면서 **Telegram식 가벼움**을 얹는다.
2. **AI Agent**를 기능이 아니라 1급 시민으로 승격한다 (Rail 탭, 전용 화면, 전용 색 규칙).
3. **멀티 디바이스**(home-pc, home-server, mac-studio 등)를 DM 상대처럼 직관적으로 다룬다.

## 2. 타겟 사용자 & 시나리오

- **솔로 개발자 Anna** — 집 PC, 랩탑, 홈서버에 zkTalk을 깔고, 일과 중 어느 기기에서든 다른 기기의 Agent에 지시. 저녁엔 친구와 DM, 가끔 동호회 커뮤니티.
- **소규모 팀 Kaizen Lab (4~10명)** — 공용 GPU 박스, CI 머신을 커뮤니티에 공유. Agent 채널에서 빌드·배포·리뷰를 봇처럼 굴리되, 실제 실행은 사람 2명 이상의 승인으로만.
- **커뮤니티 멤버 Eunhye** — 기술 없음. Discord처럼 채팅·스레드·공지를 쓰되, 무거운 느낌 없이. Agent는 잘 모름/안 건드림.

세 사용자가 같은 UI에서 서로의 영역을 침해하지 않아야 합니다. Anna의 디바이스 상태가 Eunhye에게 보여선 안 되고, Eunhye가 Agent 채널을 안 열면 그 존재를 의식할 필요가 없어야 합니다.

## 3. 디자인 원칙

1. **One accent, two personas.** 기본 액센트는 블루(`#2A7FFF`) 하나. AI/Agent 영역에만 바이올렛(`#8A5CF6`)을 보조 액센트로. 이 규칙만 지키면 사용자는 "파란 건 사람/내 것, 보라는 기계" 라고 본능적으로 인식합니다.
2. **3-column 레이아웃을 유지.** Rail(64) + Sidebar(280) + Content(flex) + 옵션 Right panel(320). Chats/Communities/Agents 모두 동일 구조라 전환 비용이 0에 가깝습니다.
3. **여백으로 계층.** 컬러·보더 대신 여백과 타이포 weight로 계층을 표현. Telegram 미니멀의 핵심.
4. **Agent도 멤버다.** Agent 메시지에 "봇입니다" 라벨을 붙여 변방 취급하지 않고, 버블 안에서 사람 메시지와 동등한 지분을 주되 색으로만 구분.
5. **명령은 감추지 말고 가르쳐라.** `/` 자동완성, 기본 디바이스 점 표시, `↑` 재실행 같은 힌트를 Composer에서 항상 노출. "숙련자만 쓰는 기능"이 아니라 자연스럽게 배우는 기능.
6. **모든 실행은 기록되고 재실행 가능.** 감사로그는 부가 기능이 아니라 UI의 중심. Device Dashboard의 "최근 실행" 테이블에서 한 번 누르면 다시 실행.

## 4. 정보 구조 (IA)

### 좌측 Rail (5 + α)

| 탭 | 아이콘 | 들어가는 순간 보여주는 것 |
|----|--------|------------------------|
| **Chats** | 말풍선 | 1:1/그룹 DM 리스트. pin한 Agent도 섞임 |
| **Communities** | 건물 | (아래 커뮤니티 아이콘 리스트에서 선택해 진입) |
| **Agents** ◆ | 다이아몬드 | 내 디바이스 · 팀 공유 디바이스, 그리고 각각의 Agent |
| **Inbox** | 벨 | 멘션, 스레드 답글, 내가 요청한 Agent 실행 결과 |
| **Discover** | 나침반 | 공개 커뮤니티 탐색 |

하단엔 Settings · 내 Avatar, 그 위에 가입한 커뮤니티 아이콘들이 그대로 표시됩니다. `docs/ui-nav-redesign-plan.md`가 제안한 방향(Kakao 스타일 탭)을 이어받되, **Agents를 1급 탭으로 승격**한 것이 이번 재설계의 가장 큰 변화입니다.

### Sidebar는 컨텍스트에 따라 바뀜

- Chats → 대화 리스트 (pinned/recent)
- Community X → 카테고리·채널 트리 (Agent 전용 채널은 바이올렛 ◆)
- Agents → 디바이스 리스트 (my / shared)

### Content와 Right panel

Content는 메시지 피드·포럼 리스트·스레드 디테일·Device Dashboard 같은 주요 뷰를 담는 공간. Right panel은 선택적으로 열리며 스레드, 멤버, Agent가 붙은 디바이스 상태 같은 **보조 컨텍스트**를 담습니다.

## 5. 주요 화면 요약

| # | 화면 | 언제 | 핵심 컴포넌트 |
|---|------|------|--------------|
| 3 | Community Channel | 커뮤니티 안 `#product` | Channel list · Message feed · "채널의 Agents" right panel |
| 4 | DM (Personal) | 친구 Jiyeon과 대화 | Telegram식 버블 · pinned Agent 섞임 |
| 5 | Agent 1:1 DM | `home-pc`에 명령 | Device status strip · 자동완성 popover · 결과 action pill |
| 6 | Agent 전용 채널 | `#ops-bot` | 승인 카드 (2-of-3) · 실행 로그 버블 · Agent 색 스트립 |
| 7 | Device Dashboard | Agents 탭 기본 | 디바이스 카드 그리드 · 최근 실행 테이블 |
| 8 | Dark | 시스템 dark 또는 수동 | 같은 구조, 뉴트럴 어두운 팔레트 |

실제 pixel mockup은 `mockups.html`에 있습니다.

## 6. 핵심 UI 패턴

### 6.1 사람 vs Agent 메시지 버블

- 사람 (남): 좌측, `bg-subtle`, 글자색 기본. 버블 좌상단 꼬리.
- 사람 (나): 우측, `accent` 배경, 흰 글씨. 버블 우상단 꼬리.
- **Agent**: 좌측, `agent-soft` 배경 + **3px 바이올렛 좌측 스트립**. 이름 앞 `◆` 라벨, 이름 뒤에 `on home-pc` 디바이스 칩. 본문 톤은 뉴트럴.

이 규칙만으로 사람이 쓴 건지 기계가 쓴 건지 일순간에 구분됩니다.

### 6.2 Command Composer

기본 Composer와 동일하지만, 사용자가 `/`를 입력하면 위로 **Autocomplete Popover**가 스르륵 뜹니다. 항목은 `디바이스.Agent` 단위로 묶여 있고, 디바이스가 offline이면 회색 + "Wake-on-LAN" 액션이 붙습니다. Agent 1:1 DM에서는 기본 프롬프트가 이미 `/home-pc.` 로 붙어 있어 바로 타이핑 시작 가능.

### 6.3 실행 결과 버블

- 헤더: `command · device · took Xs · exit 0`
- 본문: `<pre>` mono, max-height 160에서 접힘. 긴 출력은 "펼치기/파일로 저장" 제공.
- 푸터(action pills): "에디터로 열기 / 파일 탐색기 / #channel에 공유" 등 컨텍스트별 3개 이내.

### 6.4 승인 카드 (Agent 전용 채널)

쓰기 권한이 필요한 명령은 바로 실행되지 않고 **카드 메시지**로 뜹니다. 카드엔 정책(`2-of-3`), 현재 상태(`0/2 approved`), 승인/거절 버튼이 들어 있고, 이 카드 자체가 감사로그 항목으로 Ledger에 남습니다.

### 6.5 디바이스 상태 스트립

Agent 1:1 DM 상단에 얇은 바(약 32px)로 CPU / RAM / 실행 중 작업 수 / 네트워크 응답을 요약. 한눈에 "지금 가능한가?" 판단.

## 7. Agent/Device 세계관

세부는 `agent-ux.md` 참고. 요약:

- 한 사용자의 여러 컴퓨터는 `agent_devices` 테이블로 등록되고, 각 디바이스엔 Agent가 여럿 설치됩니다(`device_agents`).
- 호출 문법: `/device.agent[.verb] args`. 기본 디바이스 생략(`/.`), 채널 속 Agent 호출(`@ops-bot`), 마지막 명령 재실행(`↑`).
- 모든 실행은 `command_executions`에 append-only 저장. Device Dashboard · Inbox · 재실행이 모두 이걸 읽습니다.
- 디바이스는 **private**가 기본이지만, 특정 커뮤니티에 **shared** 가능. 공유 디바이스의 명령은 커뮤니티 정책(승인 N-of-M)을 거쳐야 실행.

## 8. 무엇을 새로 만들고, 무엇을 고치는가

### 새로 만드는 화면/컴포넌트

- `(app)/agents/page.tsx` — Device Dashboard
- `(app)/agents/[deviceId]/page.tsx` — Agent 1:1 DM
- `(app)/communities/[slug]/agents/[agentId]/page.tsx` — Agent 전용 채널
- `components/AgentMessageBubble/`
- `components/CommandComposer/` (+ autocomplete)
- `components/DeviceStatusStrip/`
- `components/ApprovalCard/`
- `components/DeviceCard/` · `CommandLedgerTable/`

### 바꾸는 것

- `components/CommunityRail/` — 탭 5개 체계, Agents 탭 추가, 액센트 색 규칙 반영
- `components/MessageComposer/` — `/` 감지 hook, 자동완성 훅
- `app/globals.css` — 기존 다크 블루 톤 → design-system.md 토큰
- Tailwind 설정 — semantic 토큰 추가 (`bg`, `bg-subtle`, `accent`, `agent`…)

### 유지 & 보강

- 기존 Phase 1~8 기능(스레드, 검색, 모더레이션, 포럼, 이벤트, 폴)은 **그대로**. 단 컴포넌트의 색/간격만 design-system.md 토큰으로 교체.
- 기존 `BotUser`/`SlashCommand` 스키마는 남기고, 디바이스/실행 개념을 **추가**하는 방향.

## 9. 작업 순서 제안 (phased rollout)

**Phase 9A · Visual refresh (1~2 스프린트)**
- Tailwind 토큰 재정의
- Rail 5탭 개편 (Agents 탭은 빈 상태로 먼저 오픈 — "곧 출시")
- MessageBubble·Composer·Sidebar 색감 교체

**Phase 9B · Agent 1:1 DM (2~3 스프린트)**
- `agent_devices`, `device_agents`, `command_executions` 테이블
- 데스크탑 앱의 Device Bridge 데몬 (heartbeat · dispatch · streaming)
- Agents 탭, Agent 1:1 DM 화면, CommandComposer 자동완성
- 기본 3개 Agent: `shell`, `finder`, `browser`

**Phase 9C · Agent 전용 채널 (1~2 스프린트)**
- 새 채널 타입 `agent`
- Approval policy 모델 + 승인 카드
- Ledger 기반 감사로그 UI

**Phase 9D · Device Dashboard & Sharing (1 스프린트)**
- Overview 카드 그리드, 최근 실행 테이블
- Shared device 설정, 커뮤니티 공유 플로우

## 10. 측정 지표

- **Agents 탭 7-day retention** — 신기능이 한 번 쓰고 버려지지 않는가
- **First command time** — 가입 후 첫 `/command` 성공까지 중앙값 (< 5분 목표)
- **Approval turnaround** — 팀 승인 카드가 올라와서 2-of-3 받기까지 중앙값 (< 15분)
- **Message composer 시인성** — `/` 진입 후 의도한 Agent 선택 비율 (> 90% 목표)
- **Dark 모드 채택률** — 재설계 후 3개월 내 유저 중 % (참고 지표)

## 11. 위험과 완화

| 위험 | 완화 |
|------|------|
| 기존 사용자에게 톤 전환이 급격할 수 있음 | Phase 9A는 색감만 바꾸고 구조는 그대로. 설정에서 "Classic" 테마 토글 1 릴리즈 기간 제공 |
| Agent 탭 신설이 기능 모르는 유저에겐 혼란 | Rail 아이콘 첫 노출 시 "Agents — 내 컴퓨터를 메신저로 부리기" 툴팁 1회 + 빈 상태에 시작 가이드 |
| 명령 실행 권한 남용 | scope 화이트리스트 기본값 보수적, 확장은 명시 수락. 공유 디바이스는 승인 정책 필수 |
| 멀티 디바이스 heartbeat이 끊길 때 유령 "online" | 3회 연속 heartbeat 누락 → `degraded`, 이후 30초 → `offline`. UI는 busy/offline를 구분 |

## 12. 참고 파일

- `docs/community-messenger-design.md` — 원 설계 (지금의 Phase 1~8 기반)
- `docs/ui-nav-redesign-plan.md` — Rail 탭 재편 먼저 진행하던 계획 (이 문서가 그 연장)
- `docs/ui-design/design-system.md` — 컬러/타이포/스페이싱 토큰
- `docs/ui-design/agent-ux.md` — Agent 상세 UX, 문법, 권한 모델
- `docs/ui-design/mockups.html` — 실제 pixel mockup
- `docs/ui-design/diagrams.html` — 플로우 + 아키텍처 다이어그램
