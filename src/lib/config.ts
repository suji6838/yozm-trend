// 발신 도메인(Resend) 인증 전까지 구독 폼/API를 비활성화. 도메인 인증 후 true로.
// 프론트(SubscribeClient)와 서버(/api/subscribe)가 반드시 같은 값을 봐야
// "화면은 준비중인데 API는 열려있는" 상태를 막을 수 있어 여기 한 곳에 둔다.
export const NEWSLETTER_ENABLED = false;
