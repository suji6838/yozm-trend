"use client";

import { CATEGORY_ICONS, Category } from "@/data/trends";
import type { TrendCluster } from "@/lib/dailyAnalysis";

const MOMENTUM_STYLES: Record<TrendCluster["momentum"], string> = {
  상승: "text-emerald-600",
  유지: "text-zinc-500",
  하락: "text-rose-500",
};

const MOMENTUM_ARROW: Record<TrendCluster["momentum"], string> = {
  상승: "↗",
  유지: "→",
  하락: "↘",
};

export default function TrendClusterCard({ trend }: { trend: TrendCluster }) {
  return (
    <article className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600">
            {CATEGORY_ICONS[trend.category as Category]} {trend.category}
          </span>
          <span className="text-sm font-semibold">{trend.badge}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`font-medium ${MOMENTUM_STYLES[trend.momentum]}`}
          >
            {MOMENTUM_ARROW[trend.momentum]} {trend.momentum}
          </span>
          <span className="font-bold text-zinc-900">{trend.score}점</span>
        </div>
      </div>

      <h3 className="mt-3 text-lg font-bold leading-snug text-zinc-900">
        {trend.title}
      </h3>
      <p className="mt-1.5 text-sm text-zinc-600">{trend.oneLineSummary}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-zinc-400">Why Now</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700">
            {trend.whyNow}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-400">Why It Matters</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700">
            {trend.whyItMatters}
          </p>
        </div>
      </div>

      {trend.evidence.length > 0 && (
        <div className="mt-4 border-t border-zinc-50 pt-3">
          <p className="text-xs font-semibold text-zinc-400">관련 기사</p>
          <ul className="mt-1.5 space-y-1">
            {trend.evidence.map((e, i) => (
              <li key={i} className="text-xs text-zinc-500">
                {e.link ? (
                  <a
                    href={e.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-indigo-600 hover:underline"
                  >
                    {e.title}
                  </a>
                ) : (
                  e.title
                )}{" "}
                <span className="text-zinc-300">· {e.source}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
