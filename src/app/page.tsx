"use client";

import Link from "next/link";
import Image from "next/image";
import { FadeIn } from "@/components/FadeIn";
import { AnimatedHeading } from "@/components/AnimatedHeading";

const NAV_LINKS = [
  { label: "Courses", href: "/courses" },
  { label: "Planner", href: "/requirements" },
  { label: "Assistant", href: "/assistant" },
];

const CAMPUS_PHOTOS = [
  {
    src: "/images/campus-facade.png",
    alt: "Northeastern University facade with the American flag, Boston",
    caption: "Northeastern · Boston",
  },
  {
    src: "/images/campus-students.png",
    alt: "Students walking toward a Northeastern University building",
    caption: "An urban, walkable campus",
  },
  {
    src: "/images/campus-quad.png",
    alt: "Northeastern University campus green with a modern glass building",
    caption: "Where it all comes together",
  },
  {
    src: "/images/husky.jpg",
    alt: "Siberian husky, Northeastern's mascot",
    caption: "Go Huskies 🐾",
  },
];

export default function Home() {
  return (
    <main className="bg-black text-white">
      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section className="relative h-screen w-full overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/video/campus-hero.mp4"
          poster="/images/campus-quad.png"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />

        <div className="relative z-10 flex h-full flex-col px-6 md:px-12 lg:px-16">
          {/* Navbar */}
          <header className="pt-6">
            <nav className="liquid-glass flex items-center justify-between rounded-xl px-4 py-2">
              <Link
                href="/"
                className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-white sm:text-2xl"
              >
                <Image
                  src="/images/husky.jpg"
                  alt="Northeastern husky mascot"
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-white/40"
                />
                NEU<span className="text-red-500"> Course Planner</span>
              </Link>

              <div className="hidden items-center gap-8 md:flex">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-sm text-white/90 transition-colors hover:text-gray-300"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>

              <Link
                href="/assistant"
                className="hidden rounded-lg bg-white px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-100 sm:block"
              >
                Start a Chat
              </Link>
            </nav>
          </header>

          {/* Bottom-anchored hero content */}
          <div className="flex flex-1 flex-col justify-end pb-12 lg:grid lg:grid-cols-2 lg:items-end lg:pb-16">
            <div>
              <AnimatedHeading
                text={"Plan your path\nfrom courses to commencement."}
                className="mb-4 text-4xl font-normal md:text-5xl lg:text-6xl xl:text-7xl"
                style={{ letterSpacing: "-0.04em" }}
              />

              <FadeIn delay={800} duration={1000}>
                <p className="mb-5 max-w-xl text-base text-gray-300 md:text-lg">
                  We track every section, map your degree requirements, and
                  answer your questions — start to finish.
                </p>
              </FadeIn>

              <FadeIn delay={1200} duration={1000}>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/assistant"
                    className="rounded-lg bg-white px-8 py-3 font-medium text-black transition-colors hover:bg-gray-100"
                  >
                    Start a Chat
                  </Link>
                  <Link
                    href="/courses"
                    className="liquid-glass rounded-lg border border-white/20 px-8 py-3 font-medium text-white transition-colors hover:bg-white hover:text-black"
                  >
                    Explore Now
                  </Link>
                </div>
              </FadeIn>
            </div>

            <div className="mt-8 flex items-end justify-start lg:mt-0 lg:justify-end">
              <FadeIn delay={1400} duration={1000}>
                <div className="liquid-glass rounded-xl border border-white/20 px-6 py-3">
                  <span className="text-lg font-light md:text-xl lg:text-2xl">
                    Browse. Plan. Graduate.
                  </span>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── Campus photos ─────────────────────────── */}
      <section
        id="campus"
        className="scroll-mt-6 px-6 py-20 md:px-12 lg:px-16 lg:py-28"
      >
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-red-500">
            Northeastern University
          </p>
          <h2
            className="text-3xl font-normal md:text-4xl lg:text-5xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            Made for the Boston campus.
          </h2>
          <p className="mt-4 text-base text-gray-400 md:text-lg">
            From Snell Library to Centennial Common — every CS section, every
            requirement, every term, in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {CAMPUS_PHOTOS.map((p) => (
            <div
              key={p.src}
              className="group relative aspect-[3/2] overflow-hidden rounded-2xl"
            >
              <Image
                src={p.src}
                alt={p.alt}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute bottom-3 left-3">
                <span className="liquid-glass rounded-lg px-3 py-1.5 text-sm font-light text-white">
                  {p.caption}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link
            href="/courses"
            className="rounded-lg bg-white px-8 py-3 font-medium text-black transition-colors hover:bg-gray-100"
          >
            Browse courses
          </Link>
          <Link
            href="/requirements"
            className="liquid-glass rounded-lg border border-white/20 px-8 py-3 font-medium text-white transition-colors hover:bg-white hover:text-black"
          >
            Open the planner
          </Link>
        </div>
      </section>

      {/* ──────────────────────────────── Footer ──────────────────────────────── */}
      <footer className="border-t border-white/10 px-6 py-8 md:px-12 lg:px-16">
        <div className="flex flex-col items-start justify-between gap-4 text-sm text-white/40 md:flex-row md:items-center">
          <span className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">🐾</span>
            © 2026 NEU Course Planner · Go Huskies · Not affiliated with
            Northeastern University.
          </span>
          <span>
            Course data live from{" "}
            <span className="font-mono">nubanner.neu.edu</span> · Husky photo:
            Wikimedia Commons (CC BY)
          </span>
        </div>
      </footer>
    </main>
  );
}
