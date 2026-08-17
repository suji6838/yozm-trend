"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  { href: "/", label: "오늘의 트렌드" },
  { href: "/saved", label: "저장함" },
  { href: "/subscribe", label: "구독 설정" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-100 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            Y
          </span>
          <span className="text-base font-semibold text-zinc-900">
            요즘트렌드{" "}
            <span className="font-normal text-zinc-400">YOZM Trend</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-600"
                    : "rounded-full px-3 py-1.5 text-zinc-500 hover:text-zinc-800"
                }
              >
                {item.label}
              </Link>
            );
          })}

          <div className="ml-2 flex items-center border-l border-zinc-100 pl-3">
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="rounded-full bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
              >
                로그인
              </Link>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </nav>
      </div>
    </header>
  );
}
