"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BUDGET_OPTIONS,
  buildBrowseHref,
  type ArtworkSearchFilters,
} from "@/lib/artists/artwork-search";
import { CATEGORY_OPTIONS } from "@/lib/artists/taxonomy";
import { cn } from "@/lib/utils";

/**
 * Radix has no value for "nothing selected", so an explicit sentinel stands in
 * for the unfiltered choice and is stripped before the URL is built.
 */
const ANY = "any";

function toSelectValue(value: string) {
  return value || ANY;
}

function fromSelectValue(value: string) {
  return value === ANY ? "" : value;
}

/**
 * The search bar that drives every artwork query.
 *
 * The homepage hero and the browse page share it so that a search started on
 * the homepage and one refined on the results page build the same URL and go
 * through the same filters.
 */
export function ArtworkSearchForm({
  className,
  filters,
}: {
  className?: string;
  filters: ArtworkSearchFilters;
}) {
  const router = useRouter();
  const [budget, setBudget] = useState(filters.budget);
  const [category, setCategory] = useState(filters.category);
  const [query, setQuery] = useState(filters.query);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildBrowseHref({ budget, category, query }));
  }

  return (
    <form
      className={cn(
        "mx-auto w-full max-w-5xl rounded-[2rem] border border-border/70 bg-card p-3 shadow-[0_24px_70px_-40px_rgba(56,40,25,0.22)]",
        className
      )}
      onSubmit={handleSubmit}
      role="search"
    >
      <div className="grid gap-2 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
        <label className="min-w-0 rounded-[1.5rem] px-5 py-4 text-left lg:border-r lg:border-border/70">
          <p className="text-sm font-semibold text-foreground">What</p>
          <Input
            aria-label="Search artwork"
            className="mt-1 h-auto border-0 px-0 py-0 text-base shadow-none focus-visible:ring-0 sm:text-lg"
            name="q"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, artist, medium, or subject"
            value={query}
          />
        </label>

        <label className="min-w-0 rounded-[1.5rem] px-5 py-4 text-left lg:border-r lg:border-border/70">
          <p className="text-sm font-semibold text-foreground">Category</p>
          <Select
            onValueChange={(value) => setCategory(fromSelectValue(value))}
            value={toSelectValue(category)}
          >
            <SelectTrigger
              aria-label="Category"
              className="mt-1 h-auto w-full border-0 px-0 py-0 text-base shadow-none focus-visible:ring-0 sm:text-lg [&>[data-slot=select-value]]:block [&>[data-slot=select-value]]:min-w-0 [&>[data-slot=select-value]]:truncate"
            >
              <SelectValue placeholder="Any category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any category</SelectItem>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="min-w-0 rounded-[1.5rem] px-5 py-4 text-left">
          <p className="text-sm font-semibold text-foreground">Budget</p>
          <Select
            onValueChange={(value) => setBudget(fromSelectValue(value))}
            value={toSelectValue(budget)}
          >
            <SelectTrigger
              aria-label="Budget"
              className="mt-1 h-auto w-full border-0 px-0 py-0 text-base shadow-none focus-visible:ring-0 sm:text-lg [&>[data-slot=select-value]]:block [&>[data-slot=select-value]]:min-w-0 [&>[data-slot=select-value]]:truncate"
            >
              <SelectValue placeholder="Any budget" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any budget</SelectItem>
              {BUDGET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <Button
          className="h-full min-h-16 rounded-[1.5rem] px-6 text-base shadow-none"
          size="xl"
          type="submit"
        >
          <Search className="h-5 w-5" />
          Search
        </Button>
      </div>
    </form>
  );
}
