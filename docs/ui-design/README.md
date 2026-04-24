# zkTalk UI Redesign 2026

zkTalk을 **Community messenger (Discord 스타일) + Personal messenger (Telegram 스타일) + Multi-device AI Agent Orchestrator** 세 축으로 엮기 위한 전체 UI 재설계 자료.

톤은 **Telegram-like 깔끔 미니멀**을 기반으로 하고, Discord의 계층형 구조(Community → Category → Channel → Thread)를 유지하며, 새로 추가되는 **멀티 디바이스 Agent** 세계관을 1급 시민으로 승격.

## 산출물

| 파일 | 내용 |
|------|------|
| [design-brief.md](./design-brief.md) | 설계 철학, 타깃 사용자, 정보 구조, 화면별 설명 |
| [design-system.md](./design-system.md) | 컬러·타이포·스페이싱·컴포넌트 토큰 |
| [agent-ux.md](./agent-ux.md) | Agent 1:1 DM, Agent 전용 채널, 커맨드 문법, 디바이스 상태 모델 |
| [mockups.html](./mockups.html) | 주요 화면 시각적 와이어프레임 (브라우저에서 열어 확인) |
| [diagrams.html](./diagrams.html) | IA / Agent 커맨드 플로우 / 멀티 디바이스 아키텍처 다이어그램 |

## 핵심 변화 요약

1. **좌측 레일 아이콘 개편** — Chats / Communities / Agents / Inbox / Discover 탭 (Agents 신규 1급 시민화)
2. **톤 전환** — 기존 다크 블루-블랙 글래스모피즘 → 뉴트럴 라이트/다크 미니멀, 단일 블루 액센트 + AI 전용 바이올렛 액센트
3. **Agent 1:1 DM** — DM 리스트 안에 디바이스별 Agent가 별도 대화로 존재
4. **Agent 전용 채널** — 커뮤니티 안에 Agent가 상주하는 `#agent-xxx` 채널 타입 추가
5. **Device Dashboard** — 연결된 모든 컴퓨터/Agent의 상태·리소스·실행 이력 한눈에 보기
6. **Command 문법 통일** — `/device.agent command args` + 자동완성 + 결과 메시지 전용 스타일

## 지금 열어볼 파일

1. 설계 의도가 궁금하면 → `design-brief.md`
2. 실제 화면이 어떻게 보이는지 → `mockups.html`
3. 데이터/요청이 어떻게 흐르는지 → `diagrams.html`
