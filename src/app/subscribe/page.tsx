import { Suspense } from "react";
import Header from "@/components/Header";
import SubscribeClient from "@/components/SubscribeClient";

export default function SubscribePage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <Suspense>
        <SubscribeClient />
      </Suspense>
    </div>
  );
}
