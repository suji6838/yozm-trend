"use client";

import Link from "next/link";
import { useSavedTrends } from "@/hooks/useSavedTrends";
import TrendCard from "./TrendCard";

export default function SavedClient() {
  const { savedTrends, savedIds, toggleSave, hydrated } = useSavedTrends();

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-3xl font-bold text-zinc-900">저장함</h1>
      <p className="mt-2 text-sm text-zinc-500">
        ☆ 저장 버튼을 눌러둔 트렌드를 이 브라우저에서 모아볼 수 있어요.
      </p>

      {hydrated && savedTrends.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center">
          <p className="text-sm text-zinc-500">
            아직 저장한 트렌드가 없어요.
          </p>
          <Link
            href="/"
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            오늘의 트렌드 보러 가기 →
          </Link>
        </div>
      )}

      {savedTrends.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {savedTrends.map((trend) => (
            <TrendCard
              key={trend.id}
              trend={trend}
              saved={savedIds.includes(trend.id)}
              onToggleSave={toggleSave}
            />
          ))}
        </div>
      )}
    </main>
  );
}
