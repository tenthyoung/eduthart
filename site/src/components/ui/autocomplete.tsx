"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AutocompleteOption = {
  id: string;
  label: string;
  description?: string;
};

/**
 * A text input that suggests options as you type (ARIA combobox pattern).
 *
 * It holds no data of its own: the caller passes the query, the options it
 * fetched for that query and a loading flag, and gets told when one is picked.
 * Arrow keys move through the list, Enter picks, Escape closes.
 *
 * The list is positioned under the input, not portalled: inside a dialog
 * whose body scrolls, it scrolls with the body (and is cut off at the
 * dialog's bottom edge if the input sits right at the end).
 */
export function Autocomplete({
  className,
  emptyText = "No matches",
  id,
  loading = false,
  minQueryLength = 1,
  onQueryChange,
  onSelect,
  options,
  placeholder,
  query,
  ...inputProps
}: Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "onSelect" | "id"
> & {
  emptyText?: string;
  id: string;
  loading?: boolean;
  /** The list stays closed until the query is at least this long. */
  minQueryLength?: number;
  onQueryChange: (query: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  query: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const listId = `${id}-listbox`;
  const showList = open && query.trim().length >= Math.max(1, minQueryLength);

  React.useEffect(() => {
    setActiveIndex(options.length > 0 ? 0 : -1);
  }, [options]);

  const pick = (option: AutocompleteOption) => {
    onSelect(option);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        options.length === 0 ? -1 : (index + 1) % options.length
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        options.length === 0
          ? -1
          : (index - 1 + options.length) % options.length
      );
    } else if (event.key === "Enter" && showList) {
      // While the list is open, Enter never submits the form: it picks the
      // highlighted option, or does nothing while results are loading.
      event.preventDefault();

      if (options[activeIndex]) {
        pick(options[activeIndex]);
      }
    } else if (event.key === "Escape" && showList) {
      event.preventDefault();
      setOpen(false);
    }

    inputProps.onKeyDown?.(event);
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        {...inputProps}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showList}
        aria-activedescendant={
          showList && activeIndex >= 0
            ? `${id}-option-${activeIndex}`
            : undefined
        }
        autoComplete="off"
        // Room for the spinner, so typed text never runs under it.
        className={cn(loading && "pr-9")}
        placeholder={placeholder}
        value={query}
        onBlur={(event) => {
          setOpen(false);
          inputProps.onBlur?.(event);
        }}
        onChange={(event) => {
          onQueryChange(event.target.value);
          setOpen(true);
        }}
        onFocus={(event) => {
          setOpen(true);
          inputProps.onFocus?.(event);
        }}
        onKeyDown={handleKeyDown}
      />
      {loading ? (
        <Loader2
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
        />
      ) : null}
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {options.length === 0 ? (
            <li className="flex min-h-11 items-center px-3 py-2 text-sm text-muted-foreground">
              {loading ? "Searching…" : emptyText}
            </li>
          ) : (
            options.map((option, index) => (
              <li
                key={option.id}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  // min-h-11: a 44px row, big enough to tap on a phone.
                  "flex min-h-11 cursor-pointer items-center rounded-sm px-3 py-2 text-sm",
                  index === activeIndex && "bg-accent text-accent-foreground"
                )}
                // mousedown, not click: the input's blur would close the
                // list before a click lands.
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(option);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="font-medium">{option.label}</span>
                {option.description ? (
                  <span className="ml-1.5 text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
