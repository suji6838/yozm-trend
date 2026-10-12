import { put, get } from "@vercel/blob";

// 크론 실행 기록 — Vercel Hobby는 런타임 로그 보존 기간이 짧아, 알림이 누락됐을 때
// "크론이 아예 호출되지 않았는지 / 시작은 했는데 중간에 죽었는지(타임아웃) / 끝까지 갔는데
// 알림 전송만 실패했는지"를 나중에 구분할 방법이 없었다. 시작 시점과 종료 시점을 각각
// Blob에 남겨, status가 "started"로 남아 있으면 중간에 죽은 것, 기록 자체가 없으면
// 호출이 안 된 것으로 판별한다.
export type CronJob = "cospick" | "cospick-overseas";

export type CronRun = {
  startedAt: string;
  finishedAt?: string;
  status: "started" | "ok" | "error" | "skipped";
  detail?: string;
};

const MAX_RUNS = 60;

function pathname(job: CronJob) {
  return `cron-runs-${job}.json`;
}

// 최신 실행이 맨 뒤에 오는 순서로 반환한다.
export async function getCronRuns(job: CronJob): Promise<CronRun[]> {
  try {
    const result = await get(pathname(job), { access: "private" });
    if (!result || result.statusCode !== 200) return [];
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as CronRun[];
  } catch (error) {
    console.error(`Failed to load cron runs for ${job}:`, error);
    return [];
  }
}

async function saveCronRuns(job: CronJob, runs: CronRun[]) {
  try {
    await put(pathname(job), JSON.stringify(runs.slice(-MAX_RUNS)), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch (error) {
    // 기록 실패가 본 작업(스캔/알림)을 막으면 안 된다.
    console.error(`Failed to save cron runs for ${job}:`, error);
  }
}

// 최근 withinMs 안에 성공한 실행이 있는지 — 백업 크론이 중복 실행을 건너뛸 때 쓴다.
export function hasRecentOkRun(runs: CronRun[], withinMs: number) {
  const since = Date.now() - withinMs;
  return runs.some(
    (r) => r.status === "ok" && r.finishedAt && new Date(r.finishedAt).getTime() >= since,
  );
}

export async function beginCronRun(job: CronJob, previous: CronRun[]) {
  const run: CronRun = { startedAt: new Date().toISOString(), status: "started" };
  const runs = [...previous, run];
  await saveCronRuns(job, runs);

  return async (status: Exclude<CronRun["status"], "started">, detail?: string) => {
    run.status = status;
    run.finishedAt = new Date().toISOString();
    if (detail) run.detail = detail;
    await saveCronRuns(job, runs);
  };
}
