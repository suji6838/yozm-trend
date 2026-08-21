"use client";

import { INVESTMENT_STATS, STOCK_PICKS, StockPick } from "@/data/investment";

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 100;
  const height = 32;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const rising = values[values.length - 1] >= values[0];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-8 w-full"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={rising ? "#2563eb" : "#dc2626"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900">{value}</p>
      <p className="mt-0.5 text-[11px] text-zinc-400">{sub}</p>
    </div>
  );
}

function StockPickCard({ pick, rank }: { pick: StockPick; rank: number }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-200/60">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-400">
            {pick.code} · {pick.sector}
          </p>
          <p className="mt-0.5 text-base font-semibold text-zinc-900">{pick.name}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-sm font-bold text-blue-700">
            {pick.score}
          </span>
          <span className="mt-0.5 text-[10px] text-zinc-400">추천점수</span>
        </div>
      </div>
      <Sparkline values={pick.trend} />
      <div className="flex items-center justify-between border-t border-zinc-50 pt-2 text-[11px] text-zinc-400">
        <span>최근 20일 흐름 · 예시</span>
        <span>거래량 {pick.volumeLabel}</span>
      </div>
      <span className="text-[10px] font-medium text-zinc-300">#{rank}</span>
    </article>
  );
}

export default function InvestmentTab() {
  const { nextSignal } = INVESTMENT_STATS;

  return (
    <div className="mt-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 shadow-lg shadow-indigo-200 sm:px-8">
        <div className="pointer-events-none absolute -top-14 -right-14 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <p className="relative text-xs font-semibold tracking-wide text-blue-100">
          AI DAILY SIGNAL · COSPIK 연동
        </p>
        <h2 className="relative mt-2 text-2xl font-bold text-white sm:text-3xl">
          내일을 위한 매수 후보를 정교하게 선별했습니다.
        </h2>
        <p className="relative mt-2 max-w-xl text-sm text-blue-100">
          종가 기준 기술·수급 데이터를 분석해 위험 대비 기대수익이 높은 KOSPI 종목을 추천합니다.
          아직은 목업 데이터이며, 한국투자증권 KIS Open API 연동 후 실시간 데이터로 교체될 예정입니다.
        </p>
        <div className="relative mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs text-blue-50">
          <span className="font-semibold">{nextSignal.label}</span>
          <span>· +{nextSignal.takeProfitPct}% 익절</span>
          <span>· {nextSignal.stopLossPct}% 손절</span>
          <span>· {nextSignal.note}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="백테스트 승률"
          value={`${INVESTMENT_STATS.backtestWinRate}%`}
          sub="최근 12개월 기준"
        />
        <StatTile
          label="평균 수익률"
          value={`+${INVESTMENT_STATS.avgReturnPerTrade}%`}
          sub="거래 1회 기준"
        />
        <StatTile
          label="누적 수익률"
          value={`+${INVESTMENT_STATS.cumulativeReturn}%`}
          sub="동일 전략 누적"
        />
        <StatTile
          label="최대 낙폭"
          value={`${INVESTMENT_STATS.maxDrawdown}%`}
          sub="리스크 관리 기준"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-xs">
            📊
          </span>
          <span className="text-xs font-semibold tracking-wide text-indigo-600">
            오늘의 추천 종목 {STOCK_PICKS.length}
          </span>
        </div>
        <span className="text-xs text-zinc-400">{INVESTMENT_STATS.updatedAt}</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STOCK_PICKS.map((pick, i) => (
          <StockPickCard key={pick.code} pick={pick} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
