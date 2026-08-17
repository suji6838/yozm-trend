"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, Category, Trend } from "@/data/trends";
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
          <span>✦ 접속할 때마다 네이버 뉴스에서 실시간으로 트렌드를 가져와요.</span>
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
