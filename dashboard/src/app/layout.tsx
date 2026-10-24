import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteGuard — Organisation Security & Takedown Portal",
  description: "Brand impersonation monitoring, active fake detection, and automated takedown evidence pack generator.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
