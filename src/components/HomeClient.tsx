"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, Category, DATA_SOURCES, TRENDS } from "@/data/trends";
import TrendCard from "./TrendCard";

const SAVED_STORAGE_KEY = "yozm-trend-saved";

function formatTodayLabel() {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const now = new Date();
  return `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

export default function HomeClient() {
  const [bannerOpen, setBannerOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | "전체">(
    "전체",
  );
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
    if (raw) setSavedIds(JSON.parse(raw));
  }, []);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((savedId) => savedId !== id)
        : [...prev, id];
      window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filteredTrends = useMemo(
    () =>
      activeCategory === "전체"
        ? TRENDS
        : TRENDS.filter((t) => t.category === activeCategory),
    [activeCategory],
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
                key={source}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          각 서비스의 공식 API 또는 사용 권한이 연결되면 이 출처를 바탕으로
          일일 트렌드를 갱신합니다.
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
