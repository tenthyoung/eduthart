"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, BadgeCheck, HeartHandshake, Search, Sofa } from "lucide-react";
import Link from "next/link";

const featuredCategories = [
  {
    name: "Original Paintings",
    detail: "Statement pieces, textured abstracts, and modern figurative work.",
  },
  {
    name: "Photography",
    detail: "Limited editions and quiet large-format works for brighter rooms.",
  },
  {
    name: "Works on Paper",
    detail: "Layered drawings and mixed media that still feel collectible.",
  },
  {
    name: "Sculpture",
    detail: "Dimensional pieces for shelves, consoles, and entry moments.",
  },
];

const trustPoints = [
  {
    icon: Search,
    title: "Curated discovery",
    copy: "Shop by style, room, size, and budget without the friction of a traditional gallery visit.",
  },
  {
    icon: Sofa,
    title: "Made for real spaces",
    copy: "Collections are framed around how art lives at home, from dining room focal points to layered bedroom walls.",
  },
  {
    icon: HeartHandshake,
    title: "Collector support",
    copy: "Personal guidance, transparent pricing, and a warmer first-time buying experience.",
  },
];

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-white pt-28 pb-20 sm:pt-32 lg:pt-36 lg:pb-28">
      <div className="absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,_rgba(225,210,190,0.45),_transparent_62%)]" />
        <div className="absolute top-16 right-[10%] h-48 w-48 rounded-full bg-[#efe2d4]/60 blur-3xl" />
        <div className="absolute bottom-0 left-[8%] h-56 w-56 rounded-full bg-[#f3eadf] blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 sm:px-6 lg:px-8">
        <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dbc6af] bg-[#fcf8f3] px-4 py-2 text-sm font-medium text-[#6b4d35]">
              <BadgeCheck className="h-4 w-4" />
              Curated online marketplace for original art
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-6xl lg:text-7xl">
              Buy original art online with the calm of a gallery and the ease of a great shop.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              EduthArt should feel closer to Saatchi Art and UGallery than to an exhibitions site:
              category-led browsing, curated collections, room-based discovery, and clear support for new collectors.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild variant="gradient" size="xl">
                <Link href="#collections">
                  Browse collections
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="#advisory">Get collecting help</Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-white p-4 shadow-[0_20px_45px_-34px_rgba(56,40,25,0.28)]">
                <div className="text-2xl font-semibold text-foreground">Shop by medium</div>
                <p className="mt-2">Paintings, photography, paper, sculpture.</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-white p-4 shadow-[0_20px_45px_-34px_rgba(56,40,25,0.28)]">
                <div className="text-2xl font-semibold text-foreground">Shop by room</div>
                <p className="mt-2">Living room, dining room, bedroom, entryway.</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-white p-4 shadow-[0_20px_45px_-34px_rgba(56,40,25,0.28)]">
                <div className="text-2xl font-semibold text-foreground">Shop by price</div>
                <p className="mt-2">Accessible finds, investment pieces, and gifts.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-[#e6d7c7] bg-[#f8f1e8] p-5 shadow-[0_35px_90px_-45px_rgba(64,45,28,0.42)]">
              <div className="grid gap-4 sm:grid-cols-2">
                {featuredCategories.map((category, index) => (
                  <article
                    key={category.name}
                    className={`rounded-[1.5rem] border border-white/70 p-5 ${
                      index % 2 === 0 ? "bg-white" : "bg-[#f4e8dc]"
                    }`}
                  >
                    <div className="mb-8 h-36 rounded-[1.25rem] bg-[linear-gradient(135deg,#e6d6c6_0%,#c49e76_48%,#8a6242_100%)] opacity-90" />
                    <p className="text-sm uppercase tracking-[0.18em] text-[#8e6f56]">
                      Featured
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">
                      {category.name}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {category.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {trustPoints.map((point) => {
            const Icon = point.icon;

            return (
              <article
                key={point.title}
                className="rounded-[1.75rem] border border-border/70 bg-white p-6 shadow-[0_20px_60px_-42px_rgba(56,40,25,0.24)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4e8dc] text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-foreground">
                  {point.title}
                </h3>
                <p className="mt-3 max-w-md text-muted-foreground">{point.copy}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
