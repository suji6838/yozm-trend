"use client";

import { CATEGORY_STYLES, Trend } from "@/data/trends";

type Props = {
  trend: Trend;
  saved: boolean;
  onToggleSave: (trend: Trend) => void;
};

export default function TrendCard({ trend, saved, onToggleSave }: Props) {
  return (
    <article className="flex flex-col justify-between rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_STYLES[trend.category]}`}
          >
            {trend.category}
          </span>
          <span className="text-xs text-zinc-400">{trend.publishedDate}</span>
        </div>
        <h3 className="mb-2 text-base font-semibold leading-snug text-zinc-900">
          {trend.link ? (
            <a
              href={trend.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {trend.title}
            </a>
          ) : (
            trend.title
          )}
        </h3>
        <p className="text-sm leading-relaxed text-zinc-500">
          {trend.summary}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-zinc-400">출처 · {trend.source}</span>
        <button
          type="button"
          onClick={() => onToggleSave(trend)}
          className={
            saved
              ? "flex items-center gap-1 text-xs font-medium text-amber-500"
              : "flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-amber-500"
          }
        >
          {saved ? "★" : "☆"} 저장
        </button>
      </div>
    </article>
  );
}
