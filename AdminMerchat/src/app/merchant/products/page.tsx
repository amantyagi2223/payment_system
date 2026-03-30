import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import DataTable from "@/components/data-table";
import CategoryMultiSelect from "@/components/category-multi-select";
import ProductMediaPicker from "@/components/product-media-picker";
import {
  ApiClientError,
  createMerchantProduct,
  deleteMerchantProduct,
  listMerchantProductCategories,
  listMerchantProducts,
  type MerchantAuth,
  type MerchantProduct,
  type ProductCategory,
  type ProductImageInput,
  updateMerchantProduct,
  updateMerchantProductInventory,
  addProductImages,
  updateProductImages,
  deleteProductImage,
} from "@/lib/api-client";
import { listPaymentCurrencies } from "@/lib/payment-currency-store";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ProductTab = "all" | "add" | "stock" | "images";
const MAX_SINGLE_MEDIA_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_TOTAL_MEDIA_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

function readSearchParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

async function getMerchantAuthFromCookies() {
  const cookieStore = await cookies();
  const merchantApiKey = cookieStore.get("auth_merchant_api_key")?.value;
  const merchantToken = cookieStore.get("auth_merchant_token")?.value;
  const auth: MerchantAuth = {
    ...(merchantApiKey ? { apiKey: merchantApiKey } : {}),
    ...(merchantToken ? { accessToken: merchantToken } : {}),
  };

  return auth.accessToken || auth.apiKey ? auth : null;
}

function readUploadedFiles(formData: FormData, key: string) {
  return formData.getAll(key).filter((entry): entry is File => {
    if (typeof entry === "string") {
      return false;
    }

    return entry.size > 0;
  });
}

function normalizePrimaryImageFlags(images: ProductImageInput[]) {
  if (images.length === 0) {
    return images;
  }

  const chosenPrimaryIndex = images.findIndex((image) => image.isPrimary);
  const primaryIndex = chosenPrimaryIndex >= 0 ? chosenPrimaryIndex : 0;

  return images.map((image, index) => ({
    url: image.url,
    type: image.type,
    isPrimary: index === primaryIndex,
    sortOrder: typeof image.sortOrder === "number" ? image.sortOrder : index,
  }));
}

async function enforceSinglePrimaryImage(merchantAuth: MerchantAuth, productId: string) {
  const productResult = await listMerchantProducts(merchantAuth, { page: 1, limit: 100 });
  const product = productResult.data.find((item) => item.id === productId);
  const images = product?.images ?? [];

  if (images.length === 0) {
    return;
  }

  const primaryCount = images.filter((image) => image.isPrimary).length;
  if (primaryCount === 1) {
    return;
  }

  const normalized = normalizePrimaryImageFlags(
    images.map((image, index) => ({
      url: image.url,
      type: image.type,
      isPrimary: image.isPrimary,
      sortOrder: index,
    })),
  );
  await updateProductImages(merchantAuth, productId, normalized);
}

function ensureValidMediaFile(file: File, expectedPrefix: "image/" | "video/") {
  if (file.size > MAX_SINGLE_MEDIA_SIZE_BYTES) {
    throw new Error(`File "${file.name}" is too large. Max size is 20 MB per file.`);
  }

  if (file.type && !file.type.startsWith(expectedPrefix)) {
    const kind = expectedPrefix === "image/" ? "image" : "video";
    throw new Error(`File "${file.name}" is not a valid ${kind} file.`);
  }
}

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function buildMediaPayload(imageFiles: File[], videoFiles: File[], startSortOrder = 0) {
  const totalSize = [...imageFiles, ...videoFiles].reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_MEDIA_SIZE_BYTES) {
    throw new Error("Selected files are too large. Max total upload size is 100 MB.");
  }

  const imageEntries: ProductImageInput[] = await Promise.all(
    imageFiles.map(async (file, index) => {
      ensureValidMediaFile(file, "image/");
      return {
        url: await fileToDataUrl(file),
        type: "IMAGE",
        isPrimary: false,
        sortOrder: startSortOrder + index,
      } satisfies ProductImageInput;
    }),
  );

  const videoEntries: ProductImageInput[] = await Promise.all(
    videoFiles.map(async (file, index) => {
      ensureValidMediaFile(file, "video/");
      return {
        url: await fileToDataUrl(file),
        type: "VIDEO",
        isPrimary: false,
        sortOrder: startSortOrder + imageEntries.length + index,
      } satisfies ProductImageInput;
    }),
  );

  return [...imageEntries, ...videoEntries];
}

async function upsertProduct(formData: FormData) {
  "use server";

  const productId = String(formData.get("productId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const mrp = String(formData.get("mrp") ?? "").trim();
  const salePrice = String(formData.get("salePrice") ?? "").trim();
  const deliveryFee = String(formData.get("deliveryFee") ?? "0").trim();
  const quantityRaw = String(formData.get("quantity") ?? "0").trim();
  const lowStockThresholdRaw = String(formData.get("lowStockThreshold") ?? "5").trim();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const categoryIds = formData
    .getAll("categoryIds")
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0);
  const imageFiles = readUploadedFiles(formData, "imageFiles");
  const videoFiles = readUploadedFiles(formData, "videoFiles");
  const removeImageIds = formData
    .getAll("removeImageIds")
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0);
  const hasNewMedia = imageFiles.length > 0 || videoFiles.length > 0;

  if (!name || !description || !salePrice || !currency) {
    redirect("/merchant/products?tab=add&error=All%20product%20fields%20are%20required");
  }

  const parsedMrp = Number(mrp || salePrice);
  const parsedSalePrice = Number(salePrice);
  const parsedDeliveryFee = Number(deliveryFee || "0");
  const parsedQuantity = Number(quantityRaw || "0");
  const parsedLowStockThreshold = Number(lowStockThresholdRaw || "5");
  if (!Number.isFinite(parsedMrp) || !Number.isFinite(parsedSalePrice) || !Number.isFinite(parsedDeliveryFee)) {
    redirect("/merchant/products?tab=add&error=MRP,%20sale%20price,%20and%20delivery%20fee%20must%20be%20valid%20numbers");
  }
  if (
    !Number.isFinite(parsedQuantity) ||
    !Number.isInteger(parsedQuantity) ||
    parsedQuantity < 0 ||
    !Number.isFinite(parsedLowStockThreshold) ||
    !Number.isInteger(parsedLowStockThreshold) ||
    parsedLowStockThreshold < 0
  ) {
    redirect("/merchant/products?tab=add&error=Quantity%20and%20low%20stock%20threshold%20must%20be%20non-negative%20whole%20numbers");
  }
  if (parsedMrp < parsedSalePrice) {
    redirect("/merchant/products?tab=add&error=MRP%20must%20be%20greater%20than%20or%20equal%20to%20sale%20price");
  }
  if (!productId && !hasNewMedia) {
    redirect("/merchant/products?tab=add&error=Please%20upload%20at%20least%20one%20image%20or%20video");
  }

  const merchantAuth = await getMerchantAuthFromCookies();
  if (!merchantAuth) {
    redirect("/merchant/products?tab=add&error=Merchant%20session%20credentials%20are%20missing");
  }

  let targetUrl = "/merchant/products?tab=all&success=Product%20created%20successfully";

  try {
    const allowedCurrencies = await listPaymentCurrencies({ includeInactive: false });
    const allowedCurrencySymbols = new Set(allowedCurrencies.map((entry) => entry.symbol.toUpperCase()));
    if (!allowedCurrencySymbols.has(currency)) {
      throw new Error("Selected currency is not allowed. Please choose a currency from the admin list.");
    }

    const availableCategories = await listMerchantProductCategories(merchantAuth);
    if (!availableCategories.length) {
      throw new Error("No product categories are available. Ask super admin to add categories first.");
    }

    const uniqueCategoryIds = Array.from(new Set(categoryIds));
    if (!uniqueCategoryIds.length) {
      throw new Error("Please select at least one category.");
    }

    const allowedCategoryIds = new Set(availableCategories.map((category) => category.id));
    const invalidCategoryIds = uniqueCategoryIds.filter((categoryId) => !allowedCategoryIds.has(categoryId));
    if (invalidCategoryIds.length > 0) {
      throw new Error("One or more selected categories are invalid. Please refresh and try again.");
    }

    const input: {
      name: string;
      description: string;
      price?: string;
      salePrice: string;
      mrp: string;
      deliveryFee: string;
      currency: string;
      quantity?: number;
      lowStockThreshold?: number;
      categoryIds?: string[];
      images?: ProductImageInput[];
    } = {
      name,
      description,
      price: salePrice,
      salePrice,
      mrp: mrp || salePrice,
      deliveryFee: deliveryFee || "0",
      currency,
      quantity: parsedQuantity,
      lowStockThreshold: parsedLowStockThreshold,
      categoryIds: uniqueCategoryIds,
    };

    let uploadedMediaCount = 0;
    let removedMediaCount = 0;

    if (!productId) {
      const mediaEntries = await buildMediaPayload(imageFiles, videoFiles, 0);
      if (mediaEntries.length > 0) {
        mediaEntries[0].isPrimary = true;
        input.images = normalizePrimaryImageFlags(mediaEntries);
      }
      await createMerchantProduct(merchantAuth, input);
      uploadedMediaCount = mediaEntries.length;
    } else {
      await updateMerchantProduct(merchantAuth, productId, input);

      if (removeImageIds.length > 0) {
        for (const imageId of removeImageIds) {
          await deleteProductImage(merchantAuth, productId, imageId);
        }
        removedMediaCount = removeImageIds.length;
      }

      if (hasNewMedia) {
        const productResult = await listMerchantProducts(merchantAuth, { page: 1, limit: 100 });
        const currentProduct = productResult.data.find((product) => product.id === productId);
        const startSortOrder = currentProduct?.images?.length ?? 0;
        const mediaEntries = await buildMediaPayload(imageFiles, videoFiles, startSortOrder);
        const hasPrimary = Boolean(currentProduct?.images?.some((image) => image.isPrimary));

        if (!hasPrimary && mediaEntries.length > 0) {
          mediaEntries[0].isPrimary = true;
        }

        if (mediaEntries.length > 0) {
          await addProductImages(merchantAuth, productId, normalizePrimaryImageFlags(mediaEntries));
          uploadedMediaCount = mediaEntries.length;
        }
      }

      await enforceSinglePrimaryImage(merchantAuth, productId);
    }

    if (productId) {
      const message =
        uploadedMediaCount > 0 || removedMediaCount > 0
          ? `Product updated successfully (${uploadedMediaCount} uploaded, ${removedMediaCount} removed)`
          : "Product updated successfully";
      targetUrl = `/merchant/products?tab=all&success=${encodeURIComponent(message)}`;
    } else if (uploadedMediaCount > 0) {
      const message = `Product created successfully with ${uploadedMediaCount} media file${uploadedMediaCount === 1 ? "" : "s"} uploaded`;
      targetUrl = `/merchant/products?tab=all&success=${encodeURIComponent(message)}`;
    }
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to save product.";
    const editParam = productId ? `&edit=${encodeURIComponent(productId)}` : "";
    targetUrl = `/merchant/products?tab=add${editParam}&error=${encodeURIComponent(message)}`;
  }

  redirect(targetUrl);
}

async function removeProduct(formData: FormData) {
  "use server";

  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) {
    redirect("/merchant/products?tab=all&error=Product%20ID%20is%20required");
  }

  const merchantAuth = await getMerchantAuthFromCookies();
  if (!merchantAuth) {
    redirect("/merchant/products?tab=all&error=Merchant%20session%20credentials%20are%20missing");
  }

  let targetUrl = "/merchant/products?tab=all&success=Product%20deleted%20successfully";

  try {
    await deleteMerchantProduct(merchantAuth, productId);
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to delete product.";
    targetUrl = `/merchant/products?tab=all&error=${encodeURIComponent(message)}`;
  }

  redirect(targetUrl);
}

async function updateStock(formData: FormData) {
  "use server";

  const productId = String(formData.get("productId") ?? "").trim();
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const lowStockThresholdRaw = String(formData.get("lowStockThreshold") ?? "").trim();

  if (!productId) {
    redirect("/merchant/products?tab=all&error=Product%20ID%20is%20required");
  }

  const quantity = Number(quantityRaw);
  const lowStockThreshold = Number(lowStockThresholdRaw);
  if (
    !Number.isFinite(quantity) ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    !Number.isFinite(lowStockThreshold) ||
    !Number.isInteger(lowStockThreshold) ||
    lowStockThreshold < 0
  ) {
    redirect(
      `/merchant/products?tab=stock&edit=${encodeURIComponent(productId)}&error=Quantity%20and%20low%20stock%20threshold%20must%20be%20non-negative%20whole%20numbers`,
    );
  }

  const merchantAuth = await getMerchantAuthFromCookies();
  if (!merchantAuth) {
    redirect("/merchant/products?tab=all&error=Merchant%20session%20credentials%20are%20missing");
  }

  let targetUrl = `/merchant/products?tab=stock&edit=${encodeURIComponent(productId)}&success=Stock%20updated%20successfully`;

  try {
    await updateMerchantProductInventory(merchantAuth, productId, {
      quantity,
      lowStockThreshold,
    });
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to update product stock.";
    targetUrl = `/merchant/products?tab=stock&edit=${encodeURIComponent(productId)}&error=${encodeURIComponent(message)}`;
  }

  redirect(targetUrl);
}

async function manageProductImages(formData: FormData) {
  "use server";

  const productId = String(formData.get("productId") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const imageType = String(formData.get("imageType") ?? "IMAGE").trim();
  const isPrimary = formData.get("isPrimary") === "true";
  const imageId = String(formData.get("imageId") ?? "").trim();
  const imageFiles = readUploadedFiles(formData, "imageFiles");
  const videoFiles = readUploadedFiles(formData, "videoFiles");

  if (!productId) {
    redirect("/merchant/products?tab=all&error=Product%20ID%20is%20required");
  }

  const merchantAuth = await getMerchantAuthFromCookies();
  if (!merchantAuth) {
    redirect("/merchant/products?tab=all&error=Merchant%20session%20credentials%20are%20missing");
  }

  let targetUrl = `/merchant/products?tab=images&edit=${encodeURIComponent(productId)}`;

  try {
    if (action === "add") {
      const productResult = await listMerchantProducts(merchantAuth, { page: 1, limit: 100 });
      const currentProduct = productResult.data.find((p) => p.id === productId);

      if (imageFiles.length > 0 || videoFiles.length > 0) {
        const startSortOrder = currentProduct?.images?.length ?? 0;
        const mediaEntries = await buildMediaPayload(imageFiles, videoFiles, startSortOrder);
        const hasPrimary = Boolean(currentProduct?.images?.some((image) => image.isPrimary));

        if ((isPrimary || !hasPrimary) && mediaEntries.length > 0) {
          mediaEntries[0].isPrimary = true;
        }

        await addProductImages(merchantAuth, productId, normalizePrimaryImageFlags(mediaEntries));
        await enforceSinglePrimaryImage(merchantAuth, productId);
        targetUrl = `${targetUrl}&success=${encodeURIComponent(`${mediaEntries.length} media file(s) added successfully`)}`;
      } else {
        if (!imageUrl) {
          redirect(`${targetUrl}&error=Please%20select%20image/video%20file%20or%20provide%20URL`);
        }

        const sortOrder = currentProduct?.images?.length ?? 0;
        await addProductImages(merchantAuth, productId, [
          {
            url: imageUrl,
            type: imageType as "IMAGE" | "VIDEO",
            isPrimary: isPrimary || !currentProduct?.images?.some((image) => image.isPrimary),
            sortOrder,
          },
        ]);
        await enforceSinglePrimaryImage(merchantAuth, productId);
        targetUrl = `${targetUrl}&success=Image%20added%20successfully`;
      }
    } else if (action === "delete") {
      if (!imageId) {
        redirect(`${targetUrl}&error=Image%20ID%20is%20required`);
      }
      
      await deleteProductImage(merchantAuth, productId, imageId);
      targetUrl = `${targetUrl}&success=Image%20deleted%20successfully`;
    } else if (action === "update") {
      // Get current product images
      const product = await listMerchantProducts(merchantAuth, { page: 1, limit: 100 });
      const currentProduct = product.data.find((p) => p.id === productId);
      
      if (currentProduct?.images) {
        const updatedImages = normalizePrimaryImageFlags(currentProduct.images.map((img, index) => ({
          url: img.url,
          type: img.type,
          isPrimary: img.id === imageId ? isPrimary : false,
          sortOrder: index,
        })));
        
        await updateProductImages(merchantAuth, productId, updatedImages);
      }
      targetUrl = `${targetUrl}&success=Image%20updated%20successfully`;
    }
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to manage product images.";
    targetUrl = `${targetUrl}&error=${encodeURIComponent(message)}`;
  }

  redirect(targetUrl);
}

export default async function MerchantProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tabValue = readSearchParam(params, "tab");
  const editId = readSearchParam(params, "edit");
  const successMessage = readSearchParam(params, "success");
  const queryError = readSearchParam(params, "error");
  
  // Determine active tab
  let activeTab: ProductTab = "all";
  if (tabValue === "add") activeTab = "add";
  else if (tabValue === "stock") activeTab = "stock";
  else if (tabValue === "images") activeTab = "images";

  const merchantAuth = await getMerchantAuthFromCookies();
  let errorMessage: string | null = queryError ?? null;
  let products: MerchantProduct[] = [];
  let categories: ProductCategory[] = [];
  let paymentCurrencies: Awaited<ReturnType<typeof listPaymentCurrencies>> = [];

  try {
    paymentCurrencies = await listPaymentCurrencies({ includeInactive: false });
  } catch (error) {
    errorMessage = errorMessage ?? (error instanceof Error ? error.message : "Unable to load allowed currencies.");
  }

  if (!merchantAuth) {
    errorMessage = errorMessage ?? "Merchant session credentials are missing.";
  } else {
    try {
      const [productResult, categoryResult] = await Promise.all([
        listMerchantProducts(merchantAuth, { page: 1, limit: 100 }),
        listMerchantProductCategories(merchantAuth),
      ]);
      products = productResult.data;
      categories = categoryResult;
    } catch (error) {
      errorMessage = errorMessage ?? (error instanceof ApiClientError ? error.message : "Unable to load products.");
    }
  }

  const editingProduct = editId ? products.find((product) => product.id === editId) ?? null : null;
  if (!errorMessage && activeTab === "add" && editId && !editingProduct) {
    errorMessage = "Selected product for editing was not found.";
  }
  if (!errorMessage && activeTab === "images" && editId && !editingProduct) {
    errorMessage = "Selected product for managing images was not found.";
  }
  if (!errorMessage && activeTab === "stock" && editId && !editingProduct) {
    errorMessage = "Selected product for stock management was not found.";
  }
  if (!errorMessage && activeTab === "stock" && !editId) {
    errorMessage = "Select a product from All Products to manage stock.";
  }

  const allowedCurrencySymbols = new Set(paymentCurrencies.map((entry) => entry.symbol.toUpperCase()));
  const editingCurrency = (editingProduct?.currency ?? "").trim().toUpperCase();
  const showLegacyEditingCurrency = Boolean(editingCurrency && !allowedCurrencySymbols.has(editingCurrency));

  const rows: ReactNode[][] = products.map((product) => [
    <span key={`${product.id}-name`} className="font-medium text-slate-900">
      {product.name}
    </span>,
    <span key={`${product.id}-description`} className="line-clamp-2 max-w-lg text-slate-700">
      {product.description}
    </span>,
    <div key={`${product.id}-pricing`} className="text-xs text-slate-700">
      <p>Sale: {(product.salePrice ?? product.price)} {product.currency}</p>
      <p>MRP: {(product.mrp ?? product.price)} {product.currency}</p>
      <p>Delivery: {(product.deliveryFee ?? "0")} {product.currency}</p>
    </div>,
    <span key={`${product.id}-categories`} className="max-w-xs truncate text-slate-700">
      {product.categories && product.categories.length > 0
        ? product.categories.map((category) => category.name).join(", ")
        : "Uncategorized"}
    </span>,
    <div key={`${product.id}-inventory`} className="text-xs text-slate-700">
      <p>Qty: {typeof product.quantity === "number" ? product.quantity : 0}</p>
      <p>Low Stock At: {typeof product.lowStockThreshold === "number" ? product.lowStockThreshold : 5}</p>
      <p>Status: {product.inventoryStatus ?? "IN_STOCK"}</p>
    </div>,
    formatDate(product.createdAt),
    <div key={`${product.id}-actions`} className="flex items-center gap-2">
      <Link
        href={`/merchant/products?tab=add&edit=${encodeURIComponent(product.id)}`}
        className="inline-flex items-center rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 transition hover:border-cyan-400 hover:bg-cyan-100"
      >
        Edit
      </Link>
      <Link
        href={`/merchant/products?tab=stock&edit=${encodeURIComponent(product.id)}`}
        className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:border-amber-400 hover:bg-amber-100"
      >
        Manage Stock
      </Link>
      <Link
        href={`/merchant/products?tab=images&edit=${encodeURIComponent(product.id)}`}
        className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
      >
        Images
      </Link>
      <form action={removeProduct}>
        <input type="hidden" name="productId" value={product.id} />
        <button
          type="submit"
          className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
        >
          Delete
        </button>
      </form>
    </div>,
  ]);

  return (
    <section className="space-y-6 md:space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-800 to-blue-800 px-5 py-5 text-white shadow-lg md:px-6 md:py-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Products</h2>
        <p className="mt-1 text-sm text-cyan-100">Manage merchant products with add, edit, stock, and delete actions.</p>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <Link
          href="/merchant/products?tab=all"
          className={[
            "rounded-xl px-3 py-2 text-sm font-medium transition",
            activeTab === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          ].join(" ")}
        >
          All Products
        </Link>
        <Link
          href={editingProduct ? `/merchant/products?tab=add&edit=${encodeURIComponent(editingProduct.id)}` : "/merchant/products?tab=add"}
          className={[
            "rounded-xl px-3 py-2 text-sm font-medium transition",
            activeTab === "add" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          ].join(" ")}
        >
          {editingProduct ? "Edit Product" : "Add Product"}
        </Link>
        {editingProduct && (
          <Link
            href={`/merchant/products?tab=stock&edit=${encodeURIComponent(editingProduct.id)}`}
            className={[
              "rounded-xl px-3 py-2 text-sm font-medium transition",
              activeTab === "stock" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            ].join(" ")}
          >
            Manage Stock
          </Link>
        )}
        {editingProduct && (
          <Link
            href={`/merchant/products?tab=images&edit=${encodeURIComponent(editingProduct.id)}`}
            className={[
              "rounded-xl px-3 py-2 text-sm font-medium transition",
              activeTab === "images" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            ].join(" ")}
          >
            Manage Images
          </Link>
        )}
      </div>

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

      {activeTab === "all" ? (
        <DataTable
          headers={["Name", "Description", "Pricing", "Categories", "Inventory", "Created", "Actions"]}
          rows={rows}
          emptyLabel="No products found for this merchant."
          minWidths={[150, 280, 180, 180, 180, 120, 150]}
        />
      ) : activeTab === "add" ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h3 className="text-xl font-semibold text-slate-900">Product Details</h3>
          <p className="mt-1 text-sm text-slate-600">Fill in product information and save.</p>

          <form action={upsertProduct} encType="multipart/form-data" className="mt-5 grid gap-4">
            {editingProduct ? <input type="hidden" name="productId" value={editingProduct.id} /> : null}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">Product Media</h4>
              <ProductMediaPicker />
              <p className="text-xs text-slate-500">
                Multiple images and videos are supported. Max 20 MB per file and 100 MB total.
              </p>
            </div>

            <label className="text-sm text-slate-700">
              Product Name
              <input
                name="name"
                defaultValue={editingProduct?.name ?? ""}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <label className="text-sm text-slate-700">
              Description
              <textarea
                name="description"
                defaultValue={editingProduct?.description ?? ""}
                rows={4}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                MRP
                <input
                  name="mrp"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingProduct?.mrp ?? editingProduct?.price ?? ""}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="text-sm text-slate-700">
                Sale Price
                <input
                  name="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingProduct?.salePrice ?? editingProduct?.price ?? ""}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                Delivery Fee
                <input
                  name="deliveryFee"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingProduct?.deliveryFee ?? "0"}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="text-sm text-slate-700">
                Currency
                <select
                  name="currency"
                  defaultValue={
                    editingCurrency && (showLegacyEditingCurrency || allowedCurrencySymbols.has(editingCurrency))
                      ? editingCurrency
                      : paymentCurrencies[0]?.symbol ?? "USDT"
                  }
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                >
                  {showLegacyEditingCurrency ? (
                    <option value={editingCurrency}>{editingCurrency} (legacy, please update)</option>
                  ) : null}
                  {paymentCurrencies.map((currencyEntry) => (
                    <option key={currencyEntry.id} value={currencyEntry.symbol}>
                      {currencyEntry.symbol} - {currencyEntry.name}
                    </option>
                  ))}
                </select>
                {paymentCurrencies.length === 0 ? (
                  <span className="mt-1 block text-xs text-amber-700">
                    No active currencies are available. Ask admin to configure payment currencies.
                  </span>
                ) : null}
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                Quantity
                <input
                  name="quantity"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={editingProduct?.quantity ?? 0}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="text-sm text-slate-700">
                Low Stock Threshold
                <input
                  name="lowStockThreshold"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={editingProduct?.lowStockThreshold ?? 5}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
            </div>

            <div className="text-sm text-slate-700">
              <fieldset>
                <legend className="font-medium text-slate-700">Categories</legend>
                {categories.length > 0 ? (
                  <>
                    <div className="mt-2">
                      <CategoryMultiSelect
                        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
                        defaultSelectedIds={editingProduct?.categories?.map((category) => category.id) ?? []}
                        inputName="categoryIds"
                        searchPlaceholder="Type to search categories..."
                      />
                    </div>
                    <span className="mt-1 block text-xs text-slate-500">
                      Type to search, then add one or more categories from the super admin list.
                    </span>
                  </>
                ) : (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    No predefined categories are available. Ask super admin to add categories first.
                  </p>
                )}
              </fieldset>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={categories.length === 0 || paymentCurrencies.length === 0}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                Save Product
              </button>
              <Link
                href="/merchant/products?tab=all"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Back to All Products
              </Link>
            </div>
          </form>
        </article>
      ) : activeTab === "stock" ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h3 className="text-xl font-semibold text-slate-900">Manage Stock</h3>
          <p className="mt-1 text-sm text-slate-600">
            Update quantity and low stock threshold for {editingProduct?.name}.
          </p>

          {editingProduct ? (
            <form action={updateStock} className="mt-5 grid gap-4">
              <input type="hidden" name="productId" value={editingProduct.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  Quantity
                  <input
                    name="quantity"
                    type="number"
                    step="1"
                    min="0"
                    defaultValue={editingProduct.quantity ?? 0}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                  />
                </label>

                <label className="text-sm text-slate-700">
                  Low Stock Threshold
                  <input
                    name="lowStockThreshold"
                    type="number"
                    step="1"
                    min="0"
                    defaultValue={editingProduct.lowStockThreshold ?? 5}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p>
                  Current status: <span className="font-semibold">{editingProduct.inventoryStatus ?? "IN_STOCK"}</span>
                </p>
                <p className="mt-1">
                  Current quantity: <span className="font-semibold">{editingProduct.quantity ?? 0}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700"
                >
                  Save Stock
                </button>
                <Link
                  href={`/merchant/products?tab=add&edit=${encodeURIComponent(editingProduct.id)}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Edit Product Details
                </Link>
                <Link
                  href="/merchant/products?tab=all"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Back to All Products
                </Link>
              </div>
            </form>
          ) : (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Select a product from the <span className="font-semibold">All Products</span> tab, then click{" "}
              <span className="font-semibold">Manage Stock</span>.
            </div>
          )}
        </article>
      ) : (
        /* Images Tab */
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h3 className="text-xl font-semibold text-slate-900">Manage Product Media</h3>
          <p className="mt-1 text-sm text-slate-600">
            Add, remove, or set primary media for {editingProduct?.name}.
          </p>

          {/* Add New Image Form */}
          <form action={manageProductImages} encType="multipart/form-data" className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input type="hidden" name="productId" value={editingProduct?.id ?? ""} />
            <input type="hidden" name="action" value="add" />

            <ProductMediaPicker />

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isPrimary"
                value="true"
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-600"
              />
              Set as primary image
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700"
              >
                Add Selected Media
              </button>
            </div>
          </form>

          {/* Current Images List */}
          <div className="mt-6">
            <h4 className="text-lg font-medium text-slate-900">Current Media</h4>
            {editingProduct?.images && editingProduct.images.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {editingProduct.images.map((image) => (
                  <li key={image.id} className="flex items-center gap-4 rounded-xl border border-slate-200 p-3">
                    {image.type === "IMAGE" ? (
                      <img
                        src={image.url}
                        alt="Product"
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
                        <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate max-w-md">{image.url}</p>
                      <p className="text-xs text-slate-500">
                        {image.type} • {image.isPrimary ? "Primary" : "Not primary"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Set Primary Button */}
                      {!image.isPrimary && (
                        <form action={manageProductImages}>
                          <input type="hidden" name="productId" value={editingProduct?.id ?? ""} />
                          <input type="hidden" name="action" value="update" />
                          <input type="hidden" name="imageId" value={image.id} />
                          <input type="hidden" name="isPrimary" value="true" />
                          <button
                            type="submit"
                            className="inline-flex items-center rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 transition hover:border-cyan-400 hover:bg-cyan-100"
                          >
                            Set Primary
                          </button>
                        </form>
                      )}
                      {/* Delete Button */}
                      <form action={manageProductImages}>
                        <input type="hidden" name="productId" value={editingProduct?.id ?? ""} />
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="imageId" value={image.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No images or videos have been added yet.</p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
            <Link
              href="/merchant/products?tab=all"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              Back to All Products
            </Link>
            <Link
              href={`/merchant/products?tab=add&edit=${encodeURIComponent(editingProduct?.id ?? "")}`}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Edit Product Details
            </Link>
          </div>
        </article>
      )}
    </section>
  );
}
