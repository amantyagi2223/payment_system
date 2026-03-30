import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import DataTable from "@/components/data-table";
import {
  ApiClientError,
  createSuperAdminProductCategory,
  deleteSuperAdminProductCategory,
  listSuperAdminProductCategories,
} from "@/lib/api-client";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

async function getAdminTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value ?? null;
}

async function addProductCategory(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/admin/product-categories?error=Category%20name%20is%20required");
  }

  const token = await getAdminTokenFromCookies();
  if (!token) {
    redirect("/admin/product-categories?error=Admin%20session%20is%20missing");
  }

  let targetUrl = "/admin/product-categories?success=Category%20created%20successfully";
  try {
    await createSuperAdminProductCategory(token, name);
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to create category.";
    targetUrl = `/admin/product-categories?error=${encodeURIComponent(message)}`;
  }

  redirect(targetUrl);
}

async function removeProductCategory(formData: FormData) {
  "use server";

  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) {
    redirect("/admin/product-categories?error=Category%20id%20is%20required");
  }

  const token = await getAdminTokenFromCookies();
  if (!token) {
    redirect("/admin/product-categories?error=Admin%20session%20is%20missing");
  }

  let targetUrl = "/admin/product-categories?success=Category%20deleted%20successfully";
  try {
    await deleteSuperAdminProductCategory(token, categoryId);
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to delete category.";
    targetUrl = `/admin/product-categories?error=${encodeURIComponent(message)}`;
  }

  redirect(targetUrl);
}

export default async function AdminProductCategoriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const successMessage = readSearchParam(params, "success");
  const queryError = readSearchParam(params, "error");

  const token = await getAdminTokenFromCookies();
  let errorMessage: string | null = queryError ?? null;
  let rows: ReactNode[][] = [];

  if (!token) {
    errorMessage = errorMessage ?? "Admin session token is missing.";
  } else {
    try {
      const categories = await listSuperAdminProductCategories(token, true);
      rows = categories.map((category) => [
        category.name,
        category.slug ?? "-",
        <span
          key={`${category.id}-status`}
          className={[
            "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
            category.isActive === false ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700",
          ].join(" ")}
        >
          {category.isActive === false ? "Inactive" : "Active"}
        </span>,
        category.productCount !== undefined ? String(category.productCount) : "-",
        <form key={`${category.id}-delete`} action={removeProductCategory}>
          <input type="hidden" name="categoryId" value={category.id} />
          <button
            type="submit"
            className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
          >
            Delete
          </button>
        </form>,
      ]);
    } catch (error) {
      errorMessage = errorMessage ?? (error instanceof ApiClientError ? error.message : "Unable to load categories.");
    }
  }

  return (
    <section className="space-y-6 md:space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-cyan-900 px-5 py-5 text-white shadow-lg md:px-6 md:py-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Product Categories</h2>
        <p className="mt-1 text-sm text-cyan-100">Create and manage categories that merchants use for products.</p>
      </header>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h3 className="text-lg font-semibold text-slate-900">Add Category</h3>
        <form action={addProductCategory} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="w-full text-sm text-slate-700 md:max-w-md">
            Category Name
            <input
              name="name"
              placeholder="Electronics"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Create
          </button>
        </form>
      </article>

      {successMessage ? (
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 md:px-5">
          <p className="font-medium">Success</p>
          <p className="mt-1">{successMessage}</p>
        </article>
      ) : null}

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 md:px-5">
          <p className="font-medium">Unable to complete request</p>
          <p className="mt-1">{errorMessage}</p>
        </article>
      ) : null}

      <DataTable
        headers={["Name", "Slug", "Status", "Products", "Actions"]}
        rows={rows}
        emptyLabel="No categories found."
        minWidths={[180, 180, 120, 100, 120]}
      />
    </section>
  );
}
