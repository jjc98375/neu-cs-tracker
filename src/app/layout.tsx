import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeProvider, ThemeToggle } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEU CS Tracker",
  description: "Northeastern University CS course browser and graduation planner",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-slate-100 dark:bg-[#0d1117] text-slate-900 dark:text-slate-100 min-h-screen">
        <ThemeProvider>
          {/* Top nav */}
          <header className="bg-white dark:bg-[#161c2d] border-b border-slate-200 dark:border-[#243049] sticky top-0 z-30">
            <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400 text-lg">
                <span className="bg-red-600 dark:bg-red-500 text-white px-2 py-0.5 rounded text-sm font-black">NU</span>
                CS Tracker
              </Link>
              <nav className="flex gap-1">
                <Link
                  href="/courses"
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-[#1e2537] transition-colors"
                >
                  Course Browser
                </Link>
                <Link
                  href="/requirements"
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-[#1e2537] transition-colors"
                >
                  Graduation Planner
                </Link>
              </nav>
              <ThemeToggle />
            </div>
          </header>

          {/* Page content */}
          <div className="max-w-screen-xl mx-auto px-4 py-6">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
