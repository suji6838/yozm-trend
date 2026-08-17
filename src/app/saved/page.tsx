import Header from "@/components/Header";

export default function SavedPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">저장함</h1>
        <p className="mt-2 text-sm text-zinc-500">
          카드의 ☆ 저장 버튼을 누르면 이곳에서 볼 수 있도록 준비 중이에요.
        </p>
      </main>
    </div>
  );
}
