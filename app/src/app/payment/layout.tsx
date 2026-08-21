import PaymentRouteGuard from "./PaymentRouteGuard";

// 결제 관련 화면(/payment/checkout, /payment/success, /payment/fail)은
// Android(TWA) 앱에서 열리면 안 된다. 자세한 이유는 PaymentRouteGuard 참고.
export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PaymentRouteGuard>{children}</PaymentRouteGuard>;
}
