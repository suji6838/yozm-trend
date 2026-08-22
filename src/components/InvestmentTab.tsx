"use client";

import type { CospickSnapshot, CospickCandidate } from "@/lib/cospick";
import { COSPICK_SCORE_MAX } from "@/lib/cospick";

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
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-full" preserveAspectRatio="none">
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

function CandidateCard({ candidate, rank }: { candidate: CospickCandidate; rank: number }) {
  const rising = candidate.changePct >= 0;
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-200/60">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-400">{candidate.code}</p>
          <p className="mt-0.5 text-base font-semibold text-zinc-900">{candidate.name}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-sm font-bold text-blue-700">
            {candidate.score.total}/{COSPICK_SCORE_MAX}
          </span>
          <span className="mt-0.5 text-[10px] text-zinc-400">1단계 스코어</span>
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-zinc-900">
          {candidate.price.toLocaleString("ko-KR")}원
        </span>
        <span className={`text-xs font-semibold ${rising ? "text-red-600" : "text-blue-600"}`}>
          {rising ? "+" : ""}
          {candidate.changePct}%
        </span>
        <span className="text-xs text-zinc-400">거래대금 {candidate.tradingValueLabel}</span>
      </div>
      <Sparkline values={candidate.trend} />
      <ul className="space-y-1 border-t border-zinc-50 pt-2 text-[11px] text-zinc-500">
        {candidate.reasons.map((reason, i) => (
          <li key={i}>· {reason}</li>
        ))}
      </ul>
      <span className="text-[10px] font-medium text-zinc-300">#{rank}</span>
    </article>
  );
}

function formatUpdatedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getMonth() + 1}.${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")} 기준`;
}

export default function InvestmentTab({ cospick }: { cospick: CospickSnapshot | null }) {
  if (!cospick) {
    return (
      <div className="mt-6 rounded-3xl border border-zinc-100 bg-white p-8 text-center text-sm text-zinc-400 shadow-sm">
        지금은 스크리닝 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
      </div>
    );
  }

  const { candidates, scanned, marketMood, generatedAt } = cospick;

  return (
    <div className="mt-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 shadow-lg shadow-indigo-200 sm:px-8">
        <div className="pointer-events-none absolute -top-14 -right-14 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <p className="relative text-xs font-semibold tracking-wide text-blue-100">
          코스픽 · 15시 매수 후보 스크리닝
        </p>
        <h2 className="relative mt-2 text-2xl font-bold text-white sm:text-3xl">
          거래대금 상위 {scanned}개 중 오늘의 후보를 골랐습니다.
        </h2>
        <p className="relative mt-2 max-w-xl text-sm text-blue-100">
          추세·거래량·시장분위기(만점 {COSPICK_SCORE_MAX}점)만 반영한 1단계 버전입니다.
          외국인/기관 수급, 장중 흐름, 뉴스 호재·악재 판별은 아직 반영되지 않았으니 참고용으로만
          활용해주세요. 급등(+15%↑)·급락(-7%↓)·거래대금 300억 미만 종목은 후보에서 자동 제외됩니다.
        </p>
        <div className="relative mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs text-blue-50">
          <span>코스피 20일선 {marketMood.kospiAboveMa20 ? "위 🟢" : "아래 🔴"}</span>
          <span>· 코스닥 20일선 {marketMood.kosdaqAboveMa20 ? "위 🟢" : "아래 🔴"}</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-xs">
            📊
          </span>
          <span className="text-xs font-semibold tracking-wide text-indigo-600">
            오늘의 매수 후보 {candidates.length}
          </span>
        </div>
        <span className="text-xs text-zinc-400">{formatUpdatedAt(generatedAt)}</span>
      </div>

      {candidates.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-zinc-100 bg-white p-8 text-center text-sm text-zinc-400 shadow-sm">
          오늘은 조건을 만족하는 매수 후보가 없습니다. 현금 보유를 권장합니다.
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((candidate, i) => (
            <CandidateCard key={candidate.code} candidate={candidate} rank={i + 1} />
          ))}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-zinc-100 bg-white p-5 text-xs text-zinc-500 shadow-sm">
        <p className="font-semibold text-zinc-700">다음날 09:10 매도 가이드 (참고용, 자동 실행 안 됨)</p>
        <ul className="mt-2 space-y-1">
          <li>+3% 이상 → 전량 익절</li>
          <li>+1~3% / 0~-1.5% → 09:10 전량 매도</li>
          <li>-1.5~-3% → 원칙적으로 손절</li>
          <li>-3% 이하 → 악재 여부 확인 후 즉시 대응</li>
        </ul>
      </div>
    </div>
  );
}
