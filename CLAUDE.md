@AGENTS.md

## Claude Code 완료 알림 (ntfy)

Claude Code 세션이 끝날 때(Stop hook)마다 ntfy.sh `claude-hj-2026` 토픽으로 푸시 알림이 갑니다.
- 설정 위치: `.claude/settings.local.json` (개인 설정, git에는 안 올라감)
- 알림 앱에서 `ntfy.sh/claude-hj-2026` 토픽 구독하면 폰으로 받을 수 있음
- 한글이 Windows 환경에서 curl로 보낼 때 깨져서(인코딩 문제) 알림 제목/내용은 영문("YOZM Trend - Claude Code done")으로 고정되어 있음
- 다른 프로젝트(온담채-웰니스, SaveLoop)에도 같은 토픽으로 동일하게 설정되어 있어, 어느 프로젝트가 끝났는지는 알림 제목으로 구분
- 별빛타로(byeolbit-tarot)는 로컬 프로젝트 폴더가 없어서 이 훅을 못 걸었음
- **동작 확인/문제 해결**: `curl -H "Title: test" -d "test" https://ntfy.sh/claude-hj-2026`로 직접 테스트해서 실제 전송은 확인됨. 새로 여는 세션은 시작할 때 이 설정 파일을 자동으로 읽어서 바로 동작함 — `/hooks`를 매번 실행할 필요 없음. 예외적으로 훅 파일을 만들기 *전에* 이미 시작된 세션에서는 그 세션이 끝날 때까지 반영이 안 되는데, 그럴 땐 그 세션에서 한 번 `/hooks`를 실행하면 즉시 반영됨(다음 세션부터는 필요 없음).
