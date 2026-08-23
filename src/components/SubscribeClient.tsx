"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { CATEGORIES, Category } from "@/data/trends";
import { SUBSCRIPTION_STORAGE_KEY } from "@/lib/storageKeys";
import { NEWSLETTER_ENABLED } from "@/lib/config";

type Subscription = {
  email: string;
  categories: Category[];
};

export default function SubscribeClient() {
  const { isLoaded, isSignedIn, user } = useUser();
  const accountEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  const [categories, setCategories] = useState<Category[]>([...CATEGORIES]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  useEffect(() => {
    const raw = window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (raw) {
      const parsed: Subscription = JSON.parse(raw);
      setCategories(parsed.categories ?? [...CATEGORIES]);
    }
  }, []);

  const toggleCategory = (category: Category) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
    setStatus("idle");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountEmail) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail }),
      });
      if (!res.ok) throw new Error(await res.text());

      const subscription: Subscription = { email: accountEmail, categories };
      window.localStorage.setItem(
        SUBSCRIPTION_STORAGE_KEY,
        JSON.stringify(subscription),
      );
      setStatus("saved");
    } catch (error) {
      console.error("Failed to save subscriber:", error);
      setStatus("error");
    }
  };

  if (!NEWSLETTER_ENABLED) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-3xl font-bold text-zinc-900">구독 설정</h1>
        <div className="mt-6 rounded-2xl border border-zinc-100 bg-white p-8 text-center">
          <p className="text-sm text-zinc-600">
            뉴스레터 구독 기능은 준비 중이에요. 곧 이메일로 오늘의 트렌드를
            받아보실 수 있게 할게요.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            오늘의 트렌드 보러 가기 →
          </Link>
        </div>
      </main>
    );
  }

  if (!isLoaded) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-3xl font-bold text-zinc-900">구독 설정</h1>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-3xl font-bold text-zinc-900">구독 설정</h1>
        <p className="mt-2 text-sm text-zinc-500">
          관심 카테고리를 골라두면 그 분야 위주로 트렌드를 보여드릴게요.
        </p>
        <div className="mt-6 rounded-2xl border border-zinc-100 bg-white p-8 text-center">
          <p className="text-sm text-zinc-600">
            구독 설정은 로그인 후 이용할 수 있어요.
          </p>
          <Link
            href="/sign-in?redirect_url=%2Fsubscribe"
            className="mt-4 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            로그인하러 가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-3xl font-bold text-zinc-900">구독 설정</h1>
      <p className="mt-2 text-sm text-zinc-500">
        관심 카테고리를 골라두면 그 분야 위주로 트렌드를 보여드릴게요.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-2xl border border-zinc-100 bg-white p-6"
      >
        <label className="block text-sm font-medium text-zinc-700">
          이메일
        </label>
        <input
          type="email"
          value={accountEmail}
          disabled
          readOnly
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
        />
        <p className="mt-1 text-xs text-zinc-400">
          로그인한 계정 이메일로 자동 설정돼요.
        </p>

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
          disabled={status === "saving"}
          className="mt-8 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {status === "saving" ? "저장 중..." : "저장하기"}
        </button>

        {status === "saved" && (
          <p className="mt-3 text-center text-sm text-blue-600">
            구독 설정이 저장됐어요.
          </p>
        )}
        {status === "error" && (
          <p className="mt-3 text-center text-sm text-red-500">
            저장에 실패했어요. 잠시 후 다시 시도해주세요.
          </p>
        )}

        <p className="mt-4 text-xs text-zinc-400">
          이메일은 구독자 목록에 저장돼요. 관심 카테고리는 아직 이 브라우저에만
          저장되고, 실제 이메일 발송 기능은 이번 범위 밖입니다.
        </p>
      </form>
    </main>
  );
}
