"use client";

import type { CospickSnapshot, CospickCandidate, ExitCheckItem } from "@/lib/cospick";
import { COSPICK_SCORE_MAX } from "@/lib/cospick";
import type {
  OverseasCospickSnapshot,
  OverseasCandidate,
  OverseasExitItem,
} from "@/lib/cospickOverseas";
import { OVERSEAS_SCORE_MAX } from "@/lib/cospickOverseas";

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
      {candidate.caution && (
        <span className="w-fit rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
          ⚠️ 주의 종목 — {candidate.caution}
        </span>
      )}
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

function ExitCheckRow({ item }: { item: ExitCheckItem }) {
  const rising = item.changePct >= 0;
  return (
    <div className="flex items-center justify-between border-t border-zinc-50 py-2 first:border-t-0">
      <div>
        <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
        <p className="text-[11px] text-zinc-400">
          {item.entryPrice.toLocaleString("ko-KR")}원 → {item.currentPrice.toLocaleString("ko-KR")}원
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${rising ? "text-red-600" : "text-blue-600"}`}>
          {rising ? "+" : ""}
          {item.changePct}%
        </span>
        <span className="rounded-full bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700">
          {item.action}
        </span>
      </div>
    </div>
  );
}

function OverseasCandidateCard({
  candidate,
  rank,
}: {
  candidate: OverseasCandidate;
  rank: number;
}) {
  const rising = candidate.changePct >= 0;
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-200/60">
      {candidate.caution && (
        <span className="w-fit rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
          ⚠️ 주의 종목 — {candidate.caution}
        </span>
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-400">{candidate.exchange}</p>
          <p className="mt-0.5 text-base font-semibold text-zinc-900">
            {candidate.symbol} · {candidate.name}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-sm font-bold text-blue-700">
            {candidate.score.total}/{OVERSEAS_SCORE_MAX}
          </span>
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-zinc-900">${candidate.price.toFixed(2)}</span>
        <span className={`text-xs font-semibold ${rising ? "text-red-600" : "text-blue-600"}`}>
          {rising ? "+" : ""}
          {candidate.changePct}%
        </span>
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

function OverseasExitRow({ item }: { item: OverseasExitItem }) {
  const rising = item.changePct >= 0;
  return (
    <div className="flex items-center justify-between border-t border-zinc-50 py-2 first:border-t-0">
      <div>
        <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
        <p className="text-[11px] text-zinc-400">
          ${item.entryPrice.toFixed(2)} → ${item.currentPrice.toFixed(2)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${rising ? "text-red-600" : "text-blue-600"}`}>
          {rising ? "+" : ""}
          {item.changePct}%
        </span>
        <span className="rounded-full bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700">
          {item.action}
        </span>
      </div>
    </div>
  );
}

export default function InvestmentTab({
  cospick,
  exitCheck,
  overseasCospick,
}: {
  cospick: CospickSnapshot | null;
  exitCheck: ExitCheckItem[];
  overseasCospick: OverseasCospickSnapshot | null;
}) {
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
          코스픽 · 14시 30분 매수 후보 스크리닝
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

      {exitCheck.length > 0 && (
        <div className="mt-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-zinc-700">
            위 후보 매수가 대비 현재가 (14시 30분 스캔가 기준, 실제 체결가와 다를 수 있음)
          </p>
          <div className="mt-1">
            {exitCheck.map((item) => (
              <ExitCheckRow key={item.code} item={item} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 shadow-lg shadow-indigo-200 sm:px-8">
          <div className="pointer-events-none absolute -top-14 -right-14 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <p className="relative text-xs font-semibold tracking-wide text-blue-100">
            해외 코스픽 · 전일 종가 기준 매수 후보 스크리닝
          </p>
          <h2 className="relative mt-2 text-2xl font-bold text-white sm:text-3xl">
            나스닥 상위 30 + S&P500 시가총액 상위 30 중 오늘의 후보를 골랐습니다.
          </h2>
          <p className="relative mt-2 max-w-xl text-sm text-blue-100">
            실시간 시세가 아니라 미국장 마감 후 전일 종가로 계산합니다(한국시간 22:00 스캔).
            추세·거래량(만점 {OVERSEAS_SCORE_MAX}점)만 반영한 버전입니다. 급등(+15%↑)·급락(-7%↓)
            종목은 후보에서 제외되지만, 3개 미만이면 주의 배지와 함께 보충됩니다.
          </p>
        </div>

        {!overseasCospick ? (
          <div className="mt-6 rounded-3xl border border-zinc-100 bg-white p-8 text-center text-sm text-zinc-400 shadow-sm">
            지금은 해외 스크리닝 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-xs">
                  🌎
                </span>
                <span className="text-xs font-semibold tracking-wide text-indigo-600">
                  오늘의 해외 매수 후보 {overseasCospick.candidates.length}
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                {formatUpdatedAt(overseasCospick.generatedAt)}
              </span>
            </div>

            {overseasCospick.candidates.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-zinc-100 bg-white p-8 text-center text-sm text-zinc-400 shadow-sm">
                오늘은 조건을 만족하는 해외 매수 후보가 없습니다.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {overseasCospick.candidates.map((candidate, i) => (
                  <OverseasCandidateCard key={candidate.symbol} candidate={candidate} rank={i + 1} />
                ))}
              </div>
            )}

            {overseasCospick.exitCheck.length > 0 && (
              <div className="mt-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-zinc-700">
                  어제 추천 종목 매수가 대비 오늘 종가 (전일 종가 기준, 실제 체결가와 다를 수 있음)
                </p>
                <div className="mt-1">
                  {overseasCospick.exitCheck.map((item) => (
                    <OverseasExitRow key={item.symbol} item={item} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
