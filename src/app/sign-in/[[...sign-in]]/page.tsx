import { SignIn } from "@clerk/nextjs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 justify-center px-6 py-12">
        <SignIn />
      </main>
      <Footer />
    </div>
  );
}
