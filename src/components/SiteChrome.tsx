"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeProvider";

/**
 * Site-wide chrome. The landing page ("/") is a full-bleed video hero with its
 * own glass navbar, so we render it without the standard header/container. Every
 * other route keeps the sticky nav + centered, padded content shell.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") return <>{children}</>;

  return (
    <>
      <header className="bg-white dark:bg-[#161c2d] border-b border-slate-200 dark:border-[#243049] sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg text-slate-900 dark:text-slate-100"
          >
            <Image
              src="/images/husky.jpg"
              alt="Northeastern husky mascot"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-red-500/70"
            />
            <span>
              NEU <span className="text-red-600 dark:text-red-400">Course Planner</span>
            </span>
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
            <Link
              href="/assistant"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-[#1e2537] transition-colors"
            >
              Assistant
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6">{children}</div>
    </>
  );
}
