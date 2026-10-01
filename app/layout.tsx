import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Olyxee Admin",
  description: "Olyxee admin: platform usage, credentials & compliance.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){var theme;try{theme=localStorage.getItem('theme');}catch(e){}document.documentElement.classList.toggle('dark',theme==='dark'||(theme!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches));})();`}
        </Script>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
