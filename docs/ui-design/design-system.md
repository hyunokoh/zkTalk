# zkTalk Design System — Telegram-Minimal

Neutral 톤 + 단일 블루 액센트 + AI 전용 바이올렛 액센트. 정보 밀도는 낮추고, 타이포 계층과 여백으로 계층을 표현.

## 1. Color Tokens

### Light (primary)

| Token | Value | 용도 |
|-------|-------|------|
| `--bg` | `#FFFFFF` | 메인 배경, 메시지 리스트 |
| `--bg-subtle` | `#F4F6FA` | 사이드바, Rail, 입력 필드 |
| `--bg-hover` | `#EEF1F6` | hover / selected 행 |
| `--bg-elevated` | `#FFFFFF` + shadow | 모달, 드롭다운 |
| `--border` | `#E5E9F0` | 구분선, 입력 필드 테두리 |
| `--border-strong` | `#D4DAE3` | 포커스, 강조 |
| `--text` | `#17212B` | 기본 본문 |
| `--text-muted` | `#6B7785` | 메타데이터, 부제 |
| `--text-subtle` | `#97A3AF` | 타임스탬프, placeholder |
| `--accent` | `#2A7FFF` | 주 브랜드 블루, 링크, primary CTA |
| `--accent-strong` | `#1664E6` | hover primary |
| `--accent-soft` | `#E8F1FF` | selected row, primary soft bg |
| `--agent` | `#8A5CF6` | AI Agent 메시지, 라벨, 아이콘 |
| `--agent-soft` | `#F2EBFF` | Agent 소프트 bg |
| `--success` | `#22C55E` | online, 성공 상태 |
| `--warning` | `#F59E0B` | busy, 경고 |
| `--danger` | `#EF4444` | offline, 에러 |
| `--mention` | `#FBBF24` | mention highlight bg (soft alpha) |

### Dark

| Token | Value |
|-------|-------|
| `--bg` | `#0E1621` |
| `--bg-subtle` | `#17212B` |
| `--bg-hover` | `#1E2A3A` |
| `--bg-elevated` | `#212D3B` |
| `--border` | `#232F3E` |
| `--border-strong` | `#344253` |
| `--text` | `#E7EEF5` |
| `--text-muted` | `#8A97A6` |
| `--text-subtle` | `#6D7A8A` |
| `--accent` | `#5AA3FF` |
| `--accent-strong` | `#3B87F0` |
| `--accent-soft` | `rgba(90,163,255,0.14)` |
| `--agent` | `#B294FF` |
| `--agent-soft` | `rgba(178,148,255,0.14)` |

### 사용 원칙

- **액센트는 한 번만 씁니다.** 한 화면에 파랑 CTA는 대개 하나. 나머지는 뉴트럴 버튼.
- **Agent 바이올렛은 AI 경로에만.** 사람의 메시지에 바이올렛이 묻으면 안 됩니다.
- **채널/커뮤니티 커스텀 컬러는 아이콘과 배지에 한정** — 본문 타이포에는 영향 없음.

## 2. Typography

시스템 폰트 스택:
```css
font-family: -apple-system, "Inter", "Pretendard", "SF Pro Text",
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

| Scale | 크기/행간 | weight | 용도 |
|-------|-----------|--------|------|
| `display` | 28/34 | 600 | 온보딩, 빈 상태 히어로 |
| `h1` | 22/28 | 600 | 페이지 타이틀 |
| `h2` | 17/24 | 600 | 섹션 타이틀, 채널 이름 |
| `h3` | 15/22 | 600 | 카드 타이틀, DM 상대 이름 |
| `body` | 15/22 | 400 | 메시지 본문 |
| `body-sm` | 13/20 | 400 | 리스트 부제, 힌트 |
| `caption` | 12/16 | 400 | 타임스탬프, 메타 |
| `label` | 12/16 | 600 | 탭 레이블, 배지 숫자 |
| `mono` | 13/20 | 400 | 코드, 명령어 |

모노 폰트: `"JetBrains Mono", "SF Mono", ui-monospace, monospace`

## 3. Spacing (4px base grid)

| Token | px |
|-------|----|
| `space-0` | 0 |
| `space-1` | 4 |
| `space-2` | 8 |
| `space-3` | 12 |
| `space-4` | 16 |
| `space-5` | 20 |
| `space-6` | 24 |
| `space-8` | 32 |
| `space-10` | 40 |
| `space-12` | 48 |
| `space-16` | 64 |

## 4. Radius

| Token | px | 용도 |
|-------|----|----- |
| `radius-sm` | 8 | 입력 필드, 작은 버튼 |
| `radius-md` | 12 | 카드, 리스트 아이템 |
| `radius-lg` | 16 | 모달, 대형 카드 |
| `radius-bubble` | 18 | 메시지 버블 |
| `radius-pill` | 999 | 배지, 탭 인디케이터 |

## 5. Elevation

| Token | 값 |
|-------|-----|
| `shadow-1` | `0 1px 2px rgba(15,23,42,0.04)` |
| `shadow-2` | `0 6px 20px rgba(15,23,42,0.08)` |
| `shadow-3` | `0 16px 40px rgba(15,23,42,0.12)` |

## 6. Layout Grid

| Surface | width |
|---------|-------|
| Left rail | 64px (아이콘 탭 바) |
| Sidebar | 280px (Chats/Channels/Agents 리스트) |
| Content (min) | 560px |
| Right panel | 320px (스레드, 멤버, 디바이스 상태) |
| Max content | 대화 버블 최대 720px |

모바일(`< 720px`): rail + sidebar + content 중 **한 패널만** 표시, 하단 탭 바로 전환.

## 7. Component Anatomy

### 7.1 Message Bubble
```
┌────────────────────────────────┐
│ Avatar 32  Name · time         │
│            Body text ...       │  ← 본문 15/22
│            Reactions · Reply    │  ← 13/20 muted
└────────────────────────────────┘
```
- 본인 메시지: 우측 정렬, `bg-accent` + 흰 글씨, 버블 radius 18 (좌상 18 / 좌하 4로 꼬리 시늉)
- 상대 메시지: 좌측 정렬, `bg-bg-subtle` + 기본 글씨
- Agent 메시지: `bg-agent-soft` + 좌측 4px `agent` 스트립, 헤더에 `◆ Agent · device-name` 라벨
- System 메시지: 센터 정렬, 12/16 muted, 배경 없음

### 7.2 Rail Tab
```
[icon 24]
label
```
- h-56, w-full, flex col center
- active: 배경 `accent-soft`, 아이콘 `accent` 색, 좌측 3px 인디케이터
- inactive: 아이콘 `text-muted`, hover `bg-hover`
- badge: 우상단 pill, `bg-danger` 또는 숫자 `bg-accent`

### 7.3 Conversation List Item (DM, Chat, Agent)
```
[Avatar 40]  Name              time     
              last message           badge
```
- h-64, px-16, radius-md, hover `bg-hover`, selected `bg-accent-soft`
- Agent DM: Avatar 자리에 `device+agent` 아이콘, Name 아래 `● online · home-pc` 메타

### 7.4 Device Status Pill
```
● home-pc   ◇ claude-code
```
- 좌측 원: online=`success`, busy=`warning`, offline=`text-subtle`
- ◇ 아이콘: 설치된 agent 갯수 요약 (hover 시 펼침)

### 7.5 Command Bubble
```
╭─────────────────────────╮
│ /home-pc.shell "ls -al"  │   ← mono, 13/20
╰─────────────────────────╯
 status  · took 124ms · exit 0
 ┌──────────────────┐
 │ output (stdout)  │
 │ ...              │  ← mono, collapsible
 └──────────────────┘
```

## 8. Iconography

- 기본: **Lucide React** 유지 (이미 의존성에 있음)
- 크기 규칙: 16 / 20 / 24, stroke 1.5
- AI/Agent 관련 아이콘은 `var(--agent)` 색상 + 작은 다이아몬드 오버레이 `◆`

## 9. Motion

- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)` (표준), `cubic-bezier(0.4, 0, 1, 1)` (exit)
- Duration: `fast=120ms`, `base=200ms`, `slow=320ms`
- 사이드바 열림/닫힘: slide 200ms
- 메시지 등장: fade 120ms + 2px translateY
- Agent 상태 변화: 펄스 2s infinite (online), 단일 페이드 (busy)

## 10. Accessibility

- 대비: body 본문 ≥ 4.5:1, 대형 텍스트 ≥ 3:1 (AA)
- 포커스 링: `2px accent` outline + 2px offset
- 키보드: Rail 탭은 ↑/↓로 이동, Enter로 진입. 사이드바는 j/k (선택 사항)
- 스크린 리더: Agent 메시지에 `role="log"` + `aria-live="polite"`
