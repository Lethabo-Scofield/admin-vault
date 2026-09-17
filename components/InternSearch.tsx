"use client";

import { useEffect, useState, useTransition } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function InternSearch({
  query,
  includeArchived,
}: {
  query: string;
  includeArchived: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(query);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(query);
  }, [query]);

  useEffect(() => {
    if (value.trim() === query.trim()) return;

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const nextQuery = value.trim();
      if (nextQuery) params.set("q", nextQuery);
      else params.delete("q");

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [pathname, query, router, searchParams, value]);

  function setArchived(checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) params.set("archived", "1");
    else params.delete("archived");

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        {pending ? (
          <LoaderCircle
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin text-gray-500"
          />
        ) : (
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        )}
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type a name, intern number, position, or department…"
          aria-label="Search interns"
          className="vault-input pl-10 pr-10"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Clear search"
            className="tap absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          >
            <X size={15} />
          </button>
        )}
      </div>
      <label className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] text-gray-600 shadow-ios">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(event) => setArchived(event.target.checked)}
          className="rounded"
        />
        Include archived
      </label>
    </div>
  );
}