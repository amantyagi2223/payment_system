"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

type CategoryOption = {
  id: string;
  name: string;
};

type CategoryMultiSelectProps = {
  categories: CategoryOption[];
  defaultSelectedIds?: string[];
  inputName?: string;
  searchPlaceholder?: string;
};

export default function CategoryMultiSelect({
  categories,
  defaultSelectedIds = [],
  inputName = "categoryIds",
  searchPlaceholder = "Search categories...",
}: CategoryMultiSelectProps) {
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const normalizedDefaultSelectedIds = useMemo(() => {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const id of defaultSelectedIds) {
      if (seen.has(id) || !categoryMap.has(id)) {
        continue;
      }
      seen.add(id);
      normalized.push(id);
    }
    return normalized;
  }, [defaultSelectedIds, categoryMap]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(normalizedDefaultSelectedIds);

  useEffect(() => {
    setSelectedIds(normalizedDefaultSelectedIds);
  }, [normalizedDefaultSelectedIds]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCategories = useMemo(
    () => selectedIds.map((id) => categoryMap.get(id)).filter((category): category is CategoryOption => Boolean(category)),
    [selectedIds, categoryMap],
  );

  const availableCategories = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const unselected = categories.filter((category) => !selectedSet.has(category.id));
    if (!normalized) {
      return unselected;
    }

    return unselected
      .map((category) => {
        const lowerName = category.name.toLowerCase();
        const score = lowerName.startsWith(normalized) ? 0 : lowerName.includes(normalized) ? 1 : 2;
        return { category, score };
      })
      .filter((entry) => entry.score < 2)
      .sort((a, b) => (a.score !== b.score ? a.score - b.score : a.category.name.localeCompare(b.category.name)))
      .map((entry) => entry.category);
  }, [categories, search, selectedSet]);

  function addCategory(id: string) {
    if (selectedSet.has(id)) {
      return;
    }
    setSelectedIds((prev) => [...prev, id]);
    setSearch("");
  }

  function removeCategory(id: string) {
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  }

  function clearAllCategories() {
    setSelectedIds([]);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const firstMatch = availableCategories[0];
    if (firstMatch) {
      addCategory(firstMatch.id);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Category Picker</h4>
        <p className="text-xs text-slate-500">
          {selectedCategories.length} selected / {categories.length} total
        </p>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Selected</p>
            <button
              type="button"
              onClick={clearAllCategories}
              disabled={selectedCategories.length === 0}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear All
            </button>
          </div>

          <div className="mt-2 min-h-24 rounded-lg border border-dashed border-slate-300 bg-white p-2">
            {selectedCategories.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {selectedCategories.map((category) => (
                  <li key={category.id}>
                    <button
                      type="button"
                      onClick={() => removeCategory(category.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 transition hover:border-cyan-400 hover:bg-cyan-100"
                    >
                      <span className="max-w-48 truncate">{category.name}</span>
                      <span aria-hidden="true" className="text-cyan-700">
                        x
                      </span>
                    </button>
                    <input type="hidden" name={inputName} value={category.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No category selected yet. Use search to add from the right panel.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Available</p>
            <p className="text-[11px] text-slate-500">{availableCategories.length} matches</p>
          </div>

          <div className="mt-2">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
            <p className="mt-1 text-[11px] text-slate-500">Press Enter to add the first match.</p>
          </div>

          <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {availableCategories.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {availableCategories.map((category) => (
                  <li key={category.id} className="group flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
                    <span className="truncate text-sm text-slate-800">{category.name}</span>
                    <button
                      type="button"
                      onClick={() => addCategory(category.id)}
                      className="inline-flex items-center rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 transition hover:border-cyan-400 hover:bg-cyan-100"
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-3 text-xs text-slate-500">No matching categories found.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
