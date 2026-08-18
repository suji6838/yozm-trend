import Header from "@/components/Header";
import Footer from "@/components/Footer";

const EFFECTIVE_DATE = "2026년 8월 18일";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold text-zinc-900">이용약관</h1>
        <p className="mt-2 text-sm text-zinc-500">
          시행일: {EFFECTIVE_DATE}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-700">
          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              제1조 (목적)
            </h2>
            <p className="mt-2">
              본 약관은 요즘트렌드(YOZM Trend, 이하 &quot;서비스&quot;)가
              제공하는 트렌드 정보 큐레이션 및 관련 서비스의 이용 조건과
              절차, 이용자와 서비스 운영자의 권리·의무 및 책임사항을
              정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              제2조 (서비스의 내용)
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>공개된 뉴스·검색 트렌드를 정리하여 제공하는 큐레이션 콘텐츠</li>
              <li>회원가입 및 로그인, 관심 트렌드 저장(저장함) 기능</li>
              <li>이메일을 통한 트렌드 뉴스레터 발송</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              제3조 (이용계약의 성립)
            </h2>
            <p className="mt-2">
              이용계약은 이용자가 Clerk 인증(이메일 또는 Google 계정)을
              통해 회원가입을 완료하고, 서비스 운영자가 이를 승낙함으로써
              성립합니다. 로그인 없이도 트렌드 열람 등 일부 기능은
              이용할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              제4조 (이용자의 의무)
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>가입 시 제공하는 정보는 사실에 근거해야 합니다.</li>
              <li>
                본인의 계정 정보를 제3자가 이용하도록 공유해서는 안 되며,
                이로 인해 발생하는 문제의 책임은 이용자 본인에게 있습니다.
              </li>
              <li>
                서비스를 부정한 목적으로 이용하거나 서비스 운영을 방해하는
                행위를 해서는 안 됩니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              제5조 (콘텐츠 및 저작권)
            </h2>
            <p className="mt-2">
              서비스가 제공하는 뉴스·검색 트렌드 요약은 각 원 저작권자
              (언론사, 네이버 등)에게 저작권이 있으며, 서비스는 해당
              콘텐츠의 출처를 표시하고 원문 링크로 연결합니다. 서비스가
              직접 작성한 요약·디자인 등 UI 요소의 저작권은 서비스
              운영자에게 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              제6조 (서비스의 변경 및 중단)
            </h2>
            <p className="mt-2">
              서비스 운영자는 운영상·기술상 필요에 따라 서비스의 전부 또는
              일부를 변경하거나 중단할 수 있으며, 이 경우 서비스 내
              공지를 통해 안내합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              제7조 (면책조항)
            </h2>
            <p className="mt-2">
              서비스가 제공하는 트렌드 정보는 참고용 콘텐츠이며, 그 정확성·
              완전성을 보장하지 않습니다. 서비스는 이용자가 제공된 정보를
              바탕으로 내린 판단이나 그로 인해 발생한 손해에 대해 책임을
              지지 않습니다. 또한 천재지변, 제3자(Clerk, Resend, Vercel,
              네이버 등 외부 서비스)의 장애로 인한 서비스 중단에 대해서는
              책임이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              제8조 (회원 탈퇴 및 이용 제한)
            </h2>
            <p className="mt-2">
              이용자는 언제든지 로그인 후 프로필 메뉴를 통해 탈퇴할 수
              있습니다. 이용자가 본 약관을 위반하거나 서비스 운영을
              방해하는 경우, 서비스 운영자는 사전 통지 후 이용을 제한할
              수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              제9조 (약관의 개정)
            </h2>
            <p className="mt-2">
              본 약관은 관련 법령 또는 서비스 정책 변경에 따라 개정될 수
              있으며, 개정 시 이 페이지를 통해 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              제10조 (문의)
            </h2>
            <p className="mt-2">
              서비스 이용과 관련한 문의는 아래 이메일로 연락해 주시기
              바랍니다.
            </p>
            <p className="mt-2">
              이메일:{" "}
              <a
                href="mailto:amandakim6838@gmail.com"
                className="text-blue-600 hover:underline"
              >
                amandakim6838@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
