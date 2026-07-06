"use client";

import { ArrowRight, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const quickSearchLinks = [
  "Abstract paintings",
  "California artists",
  "Large-scale works",
  "Under $1,000",
];

const styleOptions = [
  "Warm minimal",
  "Textural neutrals",
  "Bold statement",
  "Contemporary figurative",
];

const budgetOptions = [
  "Under $500",
  "Under $1,000",
  "$1,000-$3,000",
  "Collector pieces",
];

export function HomeHero() {
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState("");
  const [budget, setBudget] = useState("");

  return (
    <section className="relative overflow-hidden bg-white pt-28 pb-18 sm:pt-32 lg:pt-36 lg:pb-24">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-4 py-2 text-sm font-medium text-primary shadow-[0_16px_40px_-30px_rgba(56,40,25,0.28)]">
            <Sparkles className="h-4 w-4" />
            Search original art by medium, mood, room, or budget
          </div>

          <h1 className="mt-6 text-5xl font-semibold leading-[0.96] tracking-[-0.05em] text-foreground sm:text-6xl lg:text-7xl">
            Find the right piece faster.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Make the homepage feel more like a confident search-led marketplace:
            a clear starting point, curated browse paths, and helpful guidance for collectors.
          </p>
        </div>

        <form className="mx-auto w-full max-w-5xl rounded-[2rem] border border-border/70 bg-white p-3 shadow-[0_24px_70px_-40px_rgba(56,40,25,0.22)]">
          <div className="grid gap-2 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
            <label className="rounded-[1.5rem] px-5 py-4 text-left lg:border-r lg:border-border/70">
              <p className="text-sm font-semibold text-foreground">What</p>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Paintings, photography, sculpture"
                className="mt-1 h-auto border-0 px-0 py-0 text-base shadow-none focus-visible:ring-0 sm:text-lg"
              />
            </label>

            <label className="rounded-[1.5rem] px-5 py-4 text-left lg:border-r lg:border-border/70">
              <p className="text-sm font-semibold text-foreground">Style</p>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="mt-1 h-auto w-full border-0 px-0 py-0 text-base shadow-none focus-visible:ring-0 sm:text-lg">
                  <SelectValue placeholder="Warm minimal, textural, bold statement" />
                </SelectTrigger>
                <SelectContent>
                  {styleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="rounded-[1.5rem] px-5 py-4 text-left">
              <p className="text-sm font-semibold text-foreground">Budget</p>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger className="mt-1 h-auto w-full border-0 px-0 py-0 text-base shadow-none focus-visible:ring-0 sm:text-lg">
                  <SelectValue placeholder="Under $500, under $1,000, collector pieces" />
                </SelectTrigger>
                <SelectContent>
                  {budgetOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <Button
              type="submit"
              className="h-full min-h-16 rounded-[1.5rem] px-6 text-base shadow-none"
              size="xl"
            >
              <Search className="h-5 w-5" />
              Search
            </Button>
          </div>
        </form>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
            {quickSearchLinks.map((link) => (
              <button
                key={link}
                type="button"
                onClick={() => setQuery(link)}
                className="rounded-full border border-border/70 bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {link}
              </button>
            ))}
          </div>

          <Button asChild variant="ghost" size="lg" className="justify-start lg:justify-center">
            <Link href="#collections">
              Explore curated collections
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
