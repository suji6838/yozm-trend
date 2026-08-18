import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SubscribeClient from "@/components/SubscribeClient";

export default function SubscribePage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header />
      <Suspense>
        <SubscribeClient />
      </Suspense>
      <Footer />
    </div>
  );
}
