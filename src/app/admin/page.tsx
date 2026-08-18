import Header from "@/components/Header";
import { listSubscribers } from "@/lib/resend";
import { getAdminUser } from "@/lib/adminAuth";

type SearchParams = {
  sent?: string;
  failed?: string;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await getAdminUser();

  if (!admin) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-sm text-zinc-500">
            관리자 계정으로 로그인해야 볼 수 있어요.
          </p>
        </main>
      </div>
    );
  }

  const { sent, failed } = await searchParams;

  let subscriberCount = 0;
  let loadError: string | null = null;
  try {
    const subscribers = await listSubscribers();
    subscriberCount = subscribers.filter((s) => !s.unsubscribed).length;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "unknown error";
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 뉴스레터 발송</h1>

        {(sent !== undefined || failed !== undefined) && (
          <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
            발송 완료 — 성공 {sent}건, 실패 {failed}건
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-zinc-100 bg-white p-6">
          {loadError ? (
            <p className="text-sm text-red-500">
              구독자 목록을 불러오지 못했어요: {loadError}
            </p>
          ) : (
            <p className="text-sm text-zinc-700">
              현재 구독자 수: <strong>{subscriberCount}명</strong>
            </p>
          )}

          <form action="/api/admin/send-digest" method="POST" className="mt-4">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              지금 오늘의 트렌드 발송하기
            </button>
          </form>

          <p className="mt-4 text-xs text-zinc-400">
            도메인이 Resend에 인증되기 전까지는 클릭해도 실제 발송은 실패합니다
            (구독자 등록/조회는 정상 동작).
          </p>
        </div>
      </main>
    </div>
  );
}
