import Header from "@/components/Header";
import Footer from "@/components/Footer";

const EFFECTIVE_DATE = "2026년 8월 18일";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold text-zinc-900">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-zinc-500">
          시행일: {EFFECTIVE_DATE}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-700">
          <p>
            요즘트렌드(YOZM Trend, 이하 &quot;서비스&quot;)는 이용자의 개인정보를
            소중히 여기며, 「개인정보 보호법」 등 관련 법령을 준수합니다. 본
            방침은 서비스가 어떤 개인정보를 수집·이용·보관하는지 안내합니다.
          </p>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              1. 수집하는 개인정보 항목
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>회원가입/로그인 시</strong>: 이메일 주소. Google
                계정으로 로그인하는 경우 Google이 제공하는 이름, 이메일 주소,
                프로필 사진
              </li>
              <li>
                <strong>뉴스레터 구독 시</strong>: 이메일 주소
              </li>
              <li>
                <strong>서비스 이용 과정</strong>: 접속 로그, 쿠키(로그인
                세션 유지 목적)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              2. 개인정보의 수집 및 이용 목적
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>회원 식별 및 로그인 상태 유지</li>
              <li>저장함(관심 트렌드 저장) 등 회원 전용 기능 제공</li>
              <li>구독 신청자에게 오늘의 트렌드 뉴스레터 발송</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              3. 개인정보의 보유 및 이용 기간
            </h2>
            <p className="mt-2">
              회원 탈퇴 시 계정 정보는 지체 없이 파기합니다. 뉴스레터
              구독자의 이메일은 구독 해지 요청 시 즉시 파기합니다. 단,
              관계 법령에 따라 보관이 필요한 경우 해당 법령에서 정한 기간
              동안 보관합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              4. 개인정보 처리 위탁
            </h2>
            <p className="mt-2">
              서비스는 아래 업체에 개인정보 처리 업무를 위탁하고 있으며,
              위탁받은 업체가 개인정보를 별도 목적으로 이용하지 않도록
              필요한 사항을 규정하고 있습니다.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Clerk</strong> (회원가입·로그인·인증 처리)
              </li>
              <li>
                <strong>Resend</strong> (뉴스레터 이메일 발송)
              </li>
              <li>
                <strong>Vercel</strong> (서비스 서버 호스팅)
              </li>
            </ul>
            <p className="mt-2">
              위 업체는 모두 해외에 서버를 두고 있는 서비스로, 이용자가
              회원가입 또는 뉴스레터 구독을 신청하는 시점에 위 목적의
              범위 내에서 개인정보가 국외로 이전될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              5. 개인정보의 제3자 제공
            </h2>
            <p className="mt-2">
              서비스는 이용자의 개인정보를 위 위탁 업체 외의 제3자에게
              제공하지 않습니다. 다만 법령에 근거가 있거나 수사기관이
              적법한 절차에 따라 요청하는 경우는 예외로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              6. 이용자의 권리
            </h2>
            <p className="mt-2">
              이용자는 언제든지 본인의 개인정보 열람, 정정, 삭제, 처리
              정지를 요청할 수 있습니다. 계정 삭제는 로그인 후 프로필
              메뉴에서, 뉴스레터 구독 해지는 이메일 하단 구독 취소
              링크 또는 아래 문의처를 통해 처리할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              7. 쿠키 사용
            </h2>
            <p className="mt-2">
              서비스는 로그인 상태 유지를 위해 인증 쿠키를 사용합니다.
              브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 이 경우
              로그인이 필요한 기능(저장함 등) 이용에 제한이 있을 수
              있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              8. 개인정보 보호책임자 및 문의
            </h2>
            <p className="mt-2">
              개인정보 관련 문의, 열람·정정·삭제 요청은 아래 이메일로
              연락해 주시기 바랍니다.
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

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              9. 개정 안내
            </h2>
            <p className="mt-2">
              본 방침은 법령 및 서비스 변경에 따라 개정될 수 있으며,
              변경 시 이 페이지를 통해 공지합니다.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
