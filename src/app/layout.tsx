import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "요즘트렌드 YOZM Trend";
const description =
  "수많은 이야기 중 지금 알아두면 좋은 변화만 간결하게 정리했어요.";

export const metadata: Metadata = {
  metadataBase: new URL("https://yozm-trend.vercel.app"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://yozm-trend.vercel.app",
    siteName: title,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#2563eb",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html
        lang="ko"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
