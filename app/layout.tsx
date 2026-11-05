import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Quote integration POC" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
    </body></html>
  );
}
