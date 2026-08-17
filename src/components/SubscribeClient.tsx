"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES, Category } from "@/data/trends";
import { SUBSCRIPTION_STORAGE_KEY } from "@/lib/storageKeys";

type Subscription = {
  email: string;
  categories: Category[];
};

export default function SubscribeClient() {
  const searchParams = useSearchParams();
  const requiredForSave = searchParams.get("required") === "save";
  const [email, setEmail] = useState("");
  const [categories, setCategories] = useState<Category[]>([...CATEGORIES]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (raw) {
      const parsed: Subscription = JSON.parse(raw);
      setEmail(parsed.email ?? "");
      setCategories(parsed.categories ?? [...CATEGORIES]);
    }
  }, []);

  const toggleCategory = (category: Category) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
    setSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subscription: Subscription = { email, categories };
    window.localStorage.setItem(
      SUBSCRIPTION_STORAGE_KEY,
      JSON.stringify(subscription),
    );
    setSaved(true);
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-3xl font-bold text-zinc-900">구독 설정</h1>
      <p className="mt-2 text-sm text-zinc-500">
        관심 카테고리를 골라두면 그 분야 위주로 트렌드를 보여드릴게요.
      </p>

      {requiredForSave && (
        <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          저장 기능은 구독 설정을 먼저 완료해야 사용할 수 있어요.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-2xl border border-zinc-100 bg-white p-6"
      >
        <label className="block text-sm font-medium text-zinc-700">
          이메일
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSaved(false);
          }}
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-400"
        />

        <p className="mt-6 text-sm font-medium text-zinc-700">
          관심 카테고리
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const active = categories.includes(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={
                  active
                    ? "rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white"
                    : "rounded-full border border-zinc-200 px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
                }
              >
                {category}
              </button>
            );
          })}
        </div>

        <button
          type="submit"
          className="mt-8 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          저장하기
        </button>

        {saved && (
          <p className="mt-3 text-center text-sm text-blue-600">
            설정이 저장됐어요.
          </p>
        )}

        <p className="mt-4 text-xs text-zinc-400">
          지금은 이 브라우저에만 설정이 저장돼요. 실제 이메일 발송 기능은 아직
          연결되어 있지 않습니다.
        </p>
      </form>
    </main>
  );
}
