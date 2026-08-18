import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-100 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} 요즘트렌드 YOZM Trend</p>
        <nav className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-zinc-600">
            개인정보처리방침
          </Link>
          <Link href="/terms" className="hover:text-zinc-600">
            이용약관
          </Link>
          <a href="mailto:amandakim6838@gmail.com" className="hover:text-zinc-600">
            문의하기
          </a>
        </nav>
      </div>
    </footer>
  );
}
