"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Filter, Search, ShoppingCart, X } from "lucide-react";

import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import {
  listProductCategories,
  listProducts,
  type Category,
  type ProductListItem,
} from "@/lib/api-client";

function getCategoryLabel(categories: Category[], slug: string): string {
  return categories.find((category) => category.slug === slug)?.name || slug;
}

function buildProductsUrl(search: string, category: string): string {
  const params = new URLSearchParams();
  const trimmedSearch = search.trim();

  if (trimmedSearch) {
    params.set("search", trimmedSearch);
  }
  if (category) {
    params.set("category", category);
  }

  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCartStore();
  const token = useAuthStore((state) => state.token);

  const querySearch = searchParams.get("search")?.trim() || "";
  const queryCategory = searchParams.get("category")?.trim() || "";

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(queryCategory);
  const [searchInput, setSearchInput] = useState(querySearch);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCategory(queryCategory);
  }, [queryCategory]);

  useEffect(() => {
    setSearchInput(querySearch);
  }, [querySearch]);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [productData, categoryData] = await Promise.all([
        listProducts({ search: querySearch }),
        listProductCategories(token || undefined),
      ]);

      const activeCategories = categoryData.filter((category) => category.isActive ?? true);
      setProducts(productData);
      setCategories(activeCategories);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load products");
      setCategories([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [querySearch, token]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((product) =>
      product.categories.some((category) => category.slug === selectedCategory),
    );
  }, [products, selectedCategory]);

  const hasActiveFilters = Boolean(querySearch || selectedCategory);

  const handleAddToCart = (product: ProductListItem) => {
    addItem(product, 1);
  };

  const handleCategoryChange = (nextCategory: string) => {
    setSelectedCategory(nextCategory);
    router.replace(buildProductsUrl(querySearch, nextCategory));
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    router.replace(buildProductsUrl(nextSearch, selectedCategory));
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSearchInput("");
    router.replace("/products");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-24">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="h-16 w-16 rounded-full border-4 border-cyan-500/25 border-t-cyan-400 animate-spin" />
          <div>
            <h2 className="text-2xl font-semibold">Loading products</h2>
            <p className="text-slate-400 mt-1">Fetching the latest catalog and categories</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white px-6 py-24">
        <div className="max-w-3xl mx-auto text-center bg-slate-900/60 border border-red-500/20 rounded-2xl p-10">
          <h2 className="text-3xl font-bold mb-4">Unable to load products</h2>
          <p className="text-slate-300 mb-8">{error}</p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-xl font-semibold transition-all"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="px-6 py-10 max-w-7xl mx-auto">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 md:p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <label className="sr-only" htmlFor="product-search">
                Search products
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="product-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by product name, description, or merchant"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 pl-10 pr-24 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="relative lg:min-w-[280px]">
              <Filter className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(event) => handleCategoryChange(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/60 appearance-none"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>

          {categories.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryChange("")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  !selectedCategory
                    ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40"
                    : "bg-slate-800 text-slate-300 border border-slate-700 hover:text-white"
                  }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.slug)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    selectedCategory === category.slug
                      ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40"
                      : "bg-slate-800 text-slate-300 border border-slate-700 hover:text-white"
                    }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black">
              {filteredProducts.length} Product{filteredProducts.length === 1 ? "" : "s"}
              {selectedCategory ? ` in ${getCategoryLabel(categories, selectedCategory)}` : ""}
            </h2>
            {querySearch && (
              <p className="text-slate-400 mt-1">
                Search results for <span className="text-slate-200 font-medium">&quot;{querySearch}&quot;</span>
              </p>
            )}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center border border-slate-800 bg-slate-900/50 rounded-2xl p-14">
            <ShoppingCart className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold">No products matched your filters</h3>
            <p className="text-slate-400 mt-2 mb-8">Try a different category or clear your search.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-24">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="h-16 w-16 rounded-full border-4 border-cyan-500/25 border-t-cyan-400 animate-spin" />
            <div>
              <h2 className="text-2xl font-semibold">Loading products</h2>
              <p className="text-slate-400 mt-1">Preparing catalog view</p>
            </div>
          </div>
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}

interface ProductCardProps {
  product: ProductListItem;
  onAddToCart: (product: ProductListItem) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const discountPercent =
    product.basePriceUSD && product.basePriceUSD > product.priceUSD
      ? Math.round(((product.basePriceUSD - product.priceUSD) / product.basePriceUSD) * 100)
      : null;

  return (
    <article className="group flex flex-col bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-900/30 transition-all duration-300">
      <div className="relative h-56 bg-slate-800/60 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized={product.imageUrl.startsWith("http")}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-16 h-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-950/80 border border-slate-600">
          {product.merchant.name || "Merchant"}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex-grow">
          <h3 className="font-bold text-lg line-clamp-2 group-hover:text-cyan-300 transition-colors">
            {product.name}
          </h3>
          {discountPercent && (
            <p className="text-emerald-500 text-lg font-bold mt-2">{discountPercent}% OFF</p>
          )}
          <div className="flex items-end gap-2">
            {product.basePriceUSD && (
              <span className="text-lg text-slate-500 line-through">
                ${product.basePriceUSD.toFixed(2)}
              </span>
            )}
            <span className="text-2xl font-black text-cyan-300">${product.priceUSD.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-auto pt-4">
          {product.categories.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {product.categories.slice(0, 2).map((category) => (
                <span
                  key={category.id}
                  className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-300"
                >
                  {category.name}
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onAddToCart(product)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 transition-colors"
            >
              <ShoppingCart size={16} />
              Add
            </button>
            <Link
              href={`/products/${product.id}`}
              className="inline-flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function FiltersSkeleton() {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 md:p-6 mb-8 animate-pulse">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="h-12 flex-1 bg-slate-800/80 rounded-xl" />
        <div className="h-12 w-full lg:min-w-[280px] bg-slate-800/80 rounded-xl" />
      </div>
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="relative h-56 bg-slate-800/60 animate-pulse" />
      <div className="p-5">
        <div className="h-6 w-3/4 bg-slate-800 rounded-md animate-pulse mb-3" />
        <div className="h-4 w-1/2 bg-slate-800 rounded-md animate-pulse mb-4" />
        <div className="h-8 w-1/3 bg-slate-800 rounded-md animate-pulse" />
        <div className="mt-4 pt-4 flex flex-wrap gap-1.5">
          <div className="h-5 w-16 bg-slate-800 rounded-full animate-pulse" />
          <div className="h-5 w-20 bg-slate-800 rounded-full animate-pulse" />
        </div>
        <div className="mt-4 pt-2 grid grid-cols-2 gap-2">
          <div className="h-10 bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-10 bg-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
