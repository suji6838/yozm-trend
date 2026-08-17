import { SignUp } from "@clerk/nextjs";
import Header from "@/components/Header";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="mx-auto flex max-w-2xl justify-center px-6 py-12">
        <SignUp />
      </main>
    </div>
  );
}
