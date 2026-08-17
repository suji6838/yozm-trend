"use client";

import { CATEGORY_ACCENT, CATEGORY_ICONS, CATEGORY_STYLES, Trend } from "@/data/trends";

type Props = {
  trend: Trend;
  saved: boolean;
  onToggleSave: (trend: Trend) => void;
};

export default function TrendCard({ trend, saved, onToggleSave }: Props) {
  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-200/60">
      <div
        className={`h-1.5 w-full bg-gradient-to-r ${CATEGORY_ACCENT[trend.category]}`}
      />
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_STYLES[trend.category]}`}
            >
              <span>{CATEGORY_ICONS[trend.category]}</span>
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
                className="transition-colors group-hover:text-blue-600 hover:underline"
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
        <div className="mt-4 flex items-center justify-between border-t border-zinc-50 pt-3">
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
      </div>
    </article>
  );
}
