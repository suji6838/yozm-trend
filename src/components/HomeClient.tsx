"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, Category, DATA_SOURCES, Trend } from "@/data/trends";
import { useSavedTrends } from "@/hooks/useSavedTrends";
import TrendCard from "./TrendCard";

function formatTodayLabel() {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const now = new Date();
  return `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

export default function HomeClient({ trends }: { trends: Trend[] }) {
  const [bannerOpen, setBannerOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | "전체">(
    "전체",
  );
  const { savedIds, toggleSave } = useSavedTrends();

  const filteredTrends = useMemo(
    () =>
      activeCategory === "전체"
        ? trends
        : trends.filter((t) => t.category === activeCategory),
    [activeCategory, trends],
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      {bannerOpen && (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span>✦ 오늘의 트렌드가 오전 7시에 새롭게 갱신되었어요.</span>
          <button
            type="button"
            onClick={() => setBannerOpen(false)}
            className="text-blue-400 hover:text-blue-600"
          >
            닫기
          </button>
        </div>
      )}

      <p className="text-xs font-semibold tracking-wide text-blue-600">
        DAILY CURATION · {formatTodayLabel()}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-zinc-900">
        오늘, 놓치면 아쉬운 흐름
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        수많은 이야기 중 지금 알아두면 좋은 변화만 간결하게 정리했어요.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory("전체")}
          className={
            activeCategory === "전체"
              ? "rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white"
              : "rounded-full border border-zinc-200 px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          }
        >
          전체
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={
              activeCategory === category
                ? "rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white"
                : "rounded-full border border-zinc-200 px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
            }
          >
            {category}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-5">
        <p className="text-xs font-semibold tracking-wide text-zinc-400">
          DAILY DATA SOURCES
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-zinc-700">
            매일 오전 7시 업데이트 예정
          </p>
          <div className="flex flex-wrap gap-2">
            {DATA_SOURCES.map((source) => (
              <span
                key={source.name}
                className={
                  source.connected
                    ? "flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-600"
                    : "flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-400"
                }
              >
                {source.connected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                )}
                {source.name}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          네이버 뉴스 · DataLab은 실시간 API로 연결되어 있어요. 나머지
          출처는 사용 권한이 연결되면 추가될 예정입니다.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filteredTrends.map((trend) => (
          <TrendCard
            key={trend.id}
            trend={trend}
            saved={savedIds.includes(trend.id)}
            onToggleSave={toggleSave}
          />
        ))}
      </div>
    </main>
  );
}
