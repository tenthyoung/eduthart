import type { IndexedArtwork } from "@/lib/artists/artwork-index";
import { CATEGORY_OPTIONS } from "@/lib/artists/taxonomy";

/**
 * Query the flat artwork index behind the homepage and the browse page.
 *
 * The index is small enough to filter in memory, and doing it here rather than
 * in each page keeps one definition of what "available" means and of how a
 * typed query is matched, so a search run from the homepage hero lands on the
 * same results the browse page would compute for itself.
 */

export const AVAILABLE = "original_available";

export type BudgetOption = {
  /** Inclusive upper bound in minor units, or null for no ceiling. */
  maxMinor: number | null;
  /** Inclusive lower bound in minor units. */
  minMinor: number;
  label: string;
  value: string;
};

/**
 * The budget bands offered on the homepage and browse filters.
 *
 * Bounds are in minor units because that is what the index stores, which keeps
 * the comparison free of rounding against a formatted price.
 */
export const BUDGET_OPTIONS: BudgetOption[] = [
  { label: "Under $500", maxMinor: 50_000, minMinor: 0, value: "under-500" },
  {
    label: "Under $1,000",
    maxMinor: 100_000,
    minMinor: 0,
    value: "under-1000",
  },
  {
    label: "$1,000 - $3,000",
    maxMinor: 300_000,
    minMinor: 100_000,
    value: "1000-3000",
  },
  {
    label: "Collector pieces",
    maxMinor: null,
    minMinor: 300_000,
    value: "collector",
  },
];

export type ArtworkSearchFilters = {
  budget: string;
  category: string;
  query: string;
};

export type ArtworkCategorySummary = {
  count: number;
  href: string;
  name: string;
};

export const EMPTY_FILTERS: ArtworkSearchFilters = {
  budget: "",
  category: "",
  query: "",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function findBudgetOption(value: string) {
  return BUDGET_OPTIONS.find((option) => option.value === value) ?? null;
}

/**
 * Read filters out of a URL, ignoring anything we do not recognise.
 *
 * A stale or hand-edited `category` or `budget` falls back to "no filter"
 * rather than silently matching nothing, so a bad link still shows artwork.
 */
export function parseArtworkSearchFilters(params: {
  budget?: string | string[];
  category?: string | string[];
  q?: string | string[];
}): ArtworkSearchFilters {
  const read = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

  const category = read(params.category);
  const budget = read(params.budget);

  return {
    budget: findBudgetOption(budget) ? budget : "",
    category:
      CATEGORY_OPTIONS.find(
        (option) => normalize(option) === normalize(category)
      ) ?? "",
    query: read(params.q),
  };
}

/** Turn filters back into the query string the browse page reads. */
export function buildBrowseHref(filters: Partial<ArtworkSearchFilters>) {
  const params = new URLSearchParams();

  if (filters.query?.trim()) {
    params.set("q", filters.query.trim());
  }

  if (filters.category?.trim()) {
    params.set("category", filters.category.trim());
  }

  if (filters.budget?.trim()) {
    params.set("budget", filters.budget.trim());
  }

  const search = params.toString();
  return search ? `/browse?${search}` : "/browse";
}

export function hasActiveFilters(filters: ArtworkSearchFilters) {
  return Boolean(filters.budget || filters.category || filters.query.trim());
}

/**
 * The text a typed query is matched against.
 *
 * Everything a collector can see on a card or would reasonably think to type
 * is included — searching an artist's name or a tag has to work as well as
 * searching a title, otherwise the hero's own example prompts find nothing.
 */
function buildHaystack(artwork: IndexedArtwork) {
  return [
    artwork.title,
    artwork.artistName,
    artwork.category,
    artwork.medium,
    artwork.style,
    artwork.subject,
    ...artwork.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Every term has to appear somewhere, so extra words narrow the results.
 *
 * Matching any single term instead would make a longer, more specific query
 * return more artwork than a short one.
 */
function matchesQuery(artwork: IndexedArtwork, query: string) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return true;
  }

  const haystack = buildHaystack(artwork);
  return terms.every((term) => haystack.includes(term));
}

function matchesBudget(artwork: IndexedArtwork, budget: string) {
  const option = findBudgetOption(budget);

  if (!option) {
    return true;
  }

  // "Price on request" pieces have no number to compare, so a budget filter
  // cannot honestly claim they fit and they drop out.
  if (artwork.priceMinor <= 0) {
    return false;
  }

  return (
    artwork.priceMinor >= option.minMinor &&
    (option.maxMinor === null || artwork.priceMinor <= option.maxMinor)
  );
}

export function isAvailable(artwork: IndexedArtwork) {
  return artwork.availability === AVAILABLE;
}

function byNewestFirst(first: IndexedArtwork, second: IndexedArtwork) {
  return second.updatedAt.localeCompare(first.updatedAt);
}

/** Available artwork matching the filters, newest first. */
export function searchArtworks(
  index: IndexedArtwork[],
  filters: ArtworkSearchFilters
): IndexedArtwork[] {
  return index
    .filter(
      (artwork) =>
        isAvailable(artwork) &&
        (!filters.category ||
          normalize(artwork.category) === normalize(filters.category)) &&
        matchesBudget(artwork, filters.budget) &&
        matchesQuery(artwork, filters.query)
    )
    .sort(byNewestFirst);
}

/** The newest available artwork, for the homepage's gallery strip. */
export function listAvailableArtworks(
  index: IndexedArtwork[],
  limit?: number
): IndexedArtwork[] {
  const available = index.filter(isAvailable).sort(byNewestFirst);
  return typeof limit === "number" ? available.slice(0, limit) : available;
}

/**
 * Count available work per category, dropping the empty ones.
 *
 * The homepage advertises categories as browse paths, so a tile that leads to
 * "no results" is worse than no tile at all.
 */
export function summarizeCategories(
  index: IndexedArtwork[]
): ArtworkCategorySummary[] {
  const counts = new Map<string, number>();

  for (const artwork of index.filter(isAvailable)) {
    const name = CATEGORY_OPTIONS.find(
      (option) => normalize(option) === normalize(artwork.category)
    );

    if (name) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return CATEGORY_OPTIONS.filter((name) => counts.has(name)).map((name) => ({
    count: counts.get(name) ?? 0,
    href: buildBrowseHref({ category: name }),
    name,
  }));
}
