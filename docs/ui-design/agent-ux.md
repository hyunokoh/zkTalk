# Agent UX Detail

멀티 디바이스 AI Agent를 zkTalk 안에 자연스럽게 녹여내기 위한 UX·데이터·권한 상세.

## 1. 세계관 한 문장

> **zkTalk을 설치한 모든 컴퓨터가 “디바이스”가 되고, 각 디바이스에 설치된 Agent들은 메신저의 대화 상대가 된다.**

## 2. 사용자 여정

1. 사용자 Anna가 `home-pc`, `home-server`, `mac-studio` 세 대에 zkTalk을 설치.
2. 각 설치 과정에서 디바이스 이름 입력 + 디바이스 키 생성 → 서버 등록.
3. 설치된 각 Agent(`shell`, `browser`, `finder`, `ops-bot` 등)가 자동 발견되어 목록에 올라옴.
4. Anna는 Agents 탭에서 `home-pc`를 열고 "최근 한 달 수정한 프로젝트 목록 정리해줘" 라고 자연어로 입력.
5. UI는 이를 적절한 `/home-pc.claude-code.shell` 명령으로 번역(또는 Anna가 직접 입력).
6. 서버가 home-pc에 dispatch, 로컬 Agent가 실행, 출력은 stream으로 다시 Anna의 화면에 렌더.
7. 결과 메시지의 action pill에서 "에디터로 열기" → 로컬 앱이 파일을 연다.

## 3. 세 가지 진입점

| 진입점 | 쓰는 상황 | UI |
|--------|-----------|-----|
| **Agents 탭 → 디바이스 1:1 DM** | 혼자 내 컴퓨터를 부리고 싶을 때 | Telegram식 DM, 프롬프트에 디바이스 지정 고정 |
| **커뮤니티 Agent 전용 채널** | 팀이 공용 Agent를 함께 부릴 때 | 승인 카드, 실행 로그가 기본 버블 |
| **일반 채널에서 @agent 호출** | 사람 대화 흐름 중 잠깐 자료 요청 | 기본 채널 안에서 Agent 메시지만 바이올렛 스트립 |

## 4. Command Grammar

```
/<device>[.<agent>[.<verb>]] <args>
```

- **device**: 생략 시 현재 "기본 디바이스". Agents 탭의 디바이스를 열어둔 상태라면 그 디바이스.
- **agent**: Autocomplete의 주축. 디바이스 단위로 그룹핑되어 보임.
- **verb**: agent 별 기본값이 있으므로 일반적으로 생략. 예: `shell`의 기본 verb는 `exec`.
- **args**: 문자열 또는 JSON. 자연어도 허용되며, agent 측이 해석.

### 지름길

| 입력 | 의미 |
|------|------|
| `/.shell ls` | 현재 기본 디바이스의 shell |
| `@ops-bot 지난주 PR 요약` | 채널에 연결된 ops-bot, 자연어 |
| `↑` 또는 `!!` | 마지막 명령 재실행 |
| `/?` | 현재 컨텍스트에서 쓸 수 있는 Agent 목록 |

## 5. Autocomplete 동작

1. `/` 입력 → Popover 노출. 기본 정렬: **현재 컨텍스트(채널에 연결된 Agent) → 내 디바이스 중 online → busy → offline** 순.
2. 타이핑이 이어지면 substring 매칭 + 최근 사용 가중치.
3. Enter 시 명령이 textarea에 채워지고 커서가 args 위치로 이동.
4. Offline 디바이스 선택 시: "send anyway (queued)" 토글 + Wake-on-LAN 액션.

## 6. 메시지 버블 상세

### 6.1 Agent 응답

```
◆  claude-code   on home-pc
────────────────────────────
해석: 최근 30일 이내 수정된 ~/Documents/Projects
아래 명령으로 진행할게요.
[ cmd bubble ]
에디터로 열기 · 파일 탐색기 · #product에 공유
```

### 6.2 Command bubble

```
┌ /home-pc.shell "find ~ -mtime -30" ┐
│ shell · home-pc      ✓ 0.3s · exit 0│
├────────────────────────────────────┤
│ /Users/anna/Documents/Projects/... │
│ /Users/anna/Documents/Projects/... │
└────────────────────────────────────┘
```

- 헤더: command · device · took · exit code (mono)
- 본문: `<pre>` 줄바꿈 유지, max-height 160px, 스크롤
- 긴 출력: 펼치기 / "파일로 저장" 제공
- stderr: 같은 버블 안 붉은 글씨
- streaming 중: 헤더에 펄스 점 + `elapsed`, 본문 하단에 `▋` 커서

### 6.3 승인 카드

Agent가 "쓰기" 성격의 동작을 제안할 때, 바로 실행 대신 카드 메시지로 내려옴.

```
[승인 필요] 2-of-3
staging.deploy — staging.zktalk.app
[ 승인 ]  [ 거절 ]          0 / 2 approved
```

- 카드 하단에 "누가 승인 가능한가" 역할 정보 + 현재 approval progress
- 승인자 본인이 보면 버튼 활성, 타인이 보면 비활성 + 진행률만
- 거절 1명이라도 나오면 카드가 `rejected`로 잠김

## 7. 디바이스 상태 모델

### 7.1 States

| state | 의미 | UI 표시 |
|-------|------|---------|
| `online` | heartbeat 정상, 준비 | 초록 점 + 유저 컬러 avatar |
| `busy` | 실행 중 작업 존재 | 호박색 점 + 실행 중 command 힌트 |
| `degraded` | heartbeat 3회 결측 | 회색 점 + "점검 중" |
| `offline` | 30s 이상 heartbeat 없음 | 회색 점 + last seen |
| `suspended` | 사용자가 수동 중단 | 자물쇠 아이콘 |

### 7.2 Heartbeat payload (요약)

```json
{
  "deviceId": "...",
  "at": "2026-04-24T14:02:01Z",
  "cpu": 0.18,
  "ramUsed": 6.2e9,
  "ramTotal": 16e9,
  "agents": ["claude-code@0.9.2", "browser@0.4.1", "finder@0.3.0"],
  "running": [{ "execId": "...", "agent": "ops-bot", "startedAt": "..." }]
}
```

## 8. 권한 & 스코프

### 8.1 Private device (개인)

- 소유자만 호출 가능.
- 각 Agent엔 default scope가 있고, 사용자가 확장 가능.
  - 예) `shell` 기본 scope: `~/Documents`, `~/Downloads` 내 read + `git`, `ls`, `find`, `grep`, `cat`.
  - 쓰기가 필요하면 `shell:write:~/Projects/zkTalk` 처럼 명시.
- scope 확장은 UI에서 "이 명령은 권한이 필요합니다 — 허용 [한번만/항상/거절]"로 요청.

### 8.2 Shared device (커뮤니티 공유)

- 디바이스 소유자가 "이 커뮤니티에 공유" → 허용할 역할(roles) 선택.
- 공유된 디바이스의 모든 명령은 **채널별 Approval policy**를 통과해야 실행.
- Policy 예:
  - `1-of-1 (self)` — 요청자 본인 승인(즉 자동 실행)
  - `1-of-owner` — 소유자 승인 필요
  - `2-of-3 (moderators)` — 모더레이터 2명 이상
  - `role:devops` — devops 역할 누구나

### 8.3 감사로그 (Command Ledger)

- 모든 실행은 `command_executions`에 append-only.
- 필드: requester, approvers, device, agent, input, stdout(trunc), stderr(trunc), status, startedAt, finishedAt.
- UI는 Device Dashboard의 "최근 실행" + Agent 전용 채널의 "📜" 버튼에서 읽음.
- 이벤트: `command.queued · running · chunk · completed · failed · rejected` WS.

## 9. 빈 상태 & 에러 UX

| 상황 | UI |
|------|-----|
| Agents 탭 처음 진입, 디바이스 0 | 가운데 일러스트 + "zkTalk을 다른 컴퓨터에도 설치하고 이 QR로 연결하세요" |
| 디바이스 1개만, Agent 0 | 디바이스 카드 안에 "추천 Agent 설치: shell · finder · browser" 원클릭 설치 |
| 모든 디바이스 offline | Dashboard 상단에 "모든 디바이스가 잠들어 있습니다 — 깨우기" 배너 |
| 명령 timeout | 버블 푸터에 `⏱ timeout` + "원인 보기(로그) / 재시도 (여기서 / 다른 디바이스로)" |
| 권한 거절 | 회색 경고 스트립 + "이 스코프 확장 요청" 1클릭 |

## 10. Accessibility

- Agent 메시지 컨테이너 `role="log"` + `aria-live="polite"` — 새 청크가 오면 스크린 리더에 자동 고지.
- 승인 카드는 `role="group"` + 버튼에 명시적 label (“승인 (2-of-3 중 1명 필요)”).
- 색만으로 구분되는 것 지양 — Agent 메시지 앞에 `◆` 문자, 오프라인엔 🌑 아이콘 텍스트 대체.
- 키보드: Rail ↑↓, Sidebar ↑↓, Message feed `k/j`, Composer `/` 후 ↑↓ Enter.

## 11. 열린 질문 / 결정 필요

- [ ] 디바이스 이름 규칙: free text vs snake_case 고정? → **free text**, 단 slug만 명령 문법에 쓰고 표시는 free.
- [ ] 모바일에선 Agent 실행 가능한가? → 모바일은 **원격 조작 전용** (본인 디바이스에 명령만). 모바일 자체는 Agent host가 될 수 없음 (배터리/보안).
- [ ] 자연어 해석은 서버측? 클라측? → **Agent runtime 내부**. 서버는 단순 라우팅만 하여 프라이버시 유지.
- [ ] 공유 디바이스에서 임의 파일 접근을 어떻게 막나? → 공유 시 scope가 강제로 화이트리스트로 제한되며, 확장 요청은 소유자만 승인.

## 12. 구현 체크리스트 (요약)

- [ ] Drizzle 마이그레이션: `agent_devices`, `device_agents`, `command_executions`
- [ ] 데스크탑 앱의 Device Bridge 데몬 (heartbeat, dispatch, stream)
- [ ] WS 이벤트: `device.*`, `command.*`
- [ ] `/api/agents`, `/api/devices`, `/api/commands` 라우트 세트
- [ ] `components/CommandComposer/` (autocomplete popover 포함)
- [ ] `components/AgentMessageBubble/` + `CommandResultBubble/`
- [ ] `components/ApprovalCard/`
- [ ] `app/(app)/agents/...` 라우트
- [ ] 새 channel 타입 `agent` + 채널 정책 모델
- [ ] Tailwind 토큰 추가, 다크 변종 포함
