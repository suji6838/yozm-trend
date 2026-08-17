@AGENTS.md

## Claude Code 완료 알림 (ntfy)

Claude Code 세션이 끝날 때(Stop hook)마다 ntfy.sh `claude-hj-2026` 토픽으로 푸시 알림이 갑니다.
- 설정 위치: `.claude/settings.local.json` (개인 설정, git에는 안 올라감)
- 알림 앱에서 `ntfy.sh/claude-hj-2026` 토픽 구독하면 폰으로 받을 수 있음
- 한글이 Windows 환경에서 curl로 보낼 때 깨져서(인코딩 문제) 알림 제목/내용은 영문("YOZM Trend - Claude Code done")으로 고정되어 있음
- 다른 프로젝트(온담채-웰니스, SaveLoop)에도 같은 토픽으로 동일하게 설정되어 있어, 어느 프로젝트가 끝났는지는 알림 제목으로 구분
- 별빛타로(byeolbit-tarot)는 로컬 프로젝트 폴더가 없어서 이 훅을 못 걸었음
