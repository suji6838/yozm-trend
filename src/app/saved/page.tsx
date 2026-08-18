import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SavedClient from "@/components/SavedClient";

export default function SavedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header />
      <SavedClient />
      <Footer />
    </div>
  );
}
