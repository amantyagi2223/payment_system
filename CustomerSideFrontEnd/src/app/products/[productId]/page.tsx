"use client";

import { listProducts, type ProductImage, type ProductListItem } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Protected from "@/components/Protected";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

function getAllImages(images?: ProductImage[]): ProductImage[] {
  if (!images || images.length === 0) return [];
  return images.filter((img) => img.type === "IMAGE");
}

function getAllVideos(images?: ProductImage[]): ProductImage[] {
  if (!images || images.length === 0) return [];
  return images.filter((img) => img.type === "VIDEO");
}

function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse mb-6" />
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="space-y-4">
            <div className="aspect-square bg-slate-800 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-slate-800 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-10 bg-slate-800 rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-slate-800 rounded w-1/4 animate-pulse" />
            <div className="h-28 bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-24 bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-14 bg-slate-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailContent />
    </Suspense>
  );
}

function ProductDetailContent() {
  const params = useParams();
  const productId = params.productId as string;
  const router = useRouter();
  const { token } = useAuthStore();

  const [product, setProduct] = useState<ProductListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!productId) {
      setError("Product not found");
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const products = await listProducts();
        const foundProduct = products.find((candidate) => candidate.id === productId);
        if (foundProduct) {
          setProduct(foundProduct);
          setSelectedImageIndex(0);
        } else {
          setError("Product not found");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load product");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const fallbackImages = useMemo<ProductImage[]>(() => {
    if (!product?.imageUrl) return [];
    return [
      {
        id: "fallback-image",
        productId: product.id,
        url: product.imageUrl,
        type: "IMAGE",
        isPrimary: true,
        sortOrder: 0,
        createdAt: "",
        updatedAt: "",
      },
    ];
  }, [product?.id, product?.imageUrl]);

  const galleryImages = useMemo(() => {
    const mediaImages = getAllImages(product?.images);
    return mediaImages.length > 0 ? mediaImages : fallbackImages;
  }, [product?.images, fallbackImages]);

  const selectedImage = galleryImages[selectedImageIndex] || galleryImages[0] || null;
  const videoCount = getAllVideos(product?.images).length;
  const discountPercent =
    product?.basePriceUSD && product?.basePriceUSD > product?.priceUSD
      ? Math.round(((product.basePriceUSD - product.priceUSD) / product.basePriceUSD) * 100)
      : null;

  useEffect(() => {
    if (selectedImageIndex >= galleryImages.length && galleryImages.length > 0) {
      setSelectedImageIndex(0);
    }
  }, [selectedImageIndex, galleryImages.length]);

  const handleAddToCart = () => {
    if (!token || !product) {
      router.push("/login");
      return;
    }
    useCartStore.getState().addItem(product, quantity);
  };

  const handleBuyNow = () => {
    if (!token || !product) {
      router.push("/login");
      return;
    }
    useCartStore.getState().addItem(product, quantity);
    router.push("/cart");
  };

  const openLightbox = () => {
    if (!selectedImage) return;
    setLightboxIndex(selectedImageIndex);
    setIsLightboxOpen(true);
  };

  if (loading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <Protected>
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8 px-6">
          <div className="w-20 h-20 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white text-center">Product Not Found</h1>
          <p className="text-xl text-slate-400 text-center max-w-md">{error}</p>
          <Link
            href="/products"
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold rounded-2xl transition-all shadow-lg"
          >
            Browse Products
          </Link>
        </div>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
          <nav className="flex items-center space-x-2 text-sm text-slate-400">
            <Link href="/products" className="hover:text-white transition-colors">
              Products
            </Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-white line-clamp-1">{product.name}</span>
          </nav>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-24 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-5">
              <button
                type="button"
                onClick={openLightbox}
                className="relative w-full aspect-square bg-slate-900/60 rounded-3xl overflow-hidden border-2 border-slate-800/50 hover:border-cyan-500/75 transition-all duration-300 shadow-2xl"
              >
                {selectedImage ? (
                  <Image
                    src={selectedImage.url}
                    alt={product.name}
                    fill
                    className="object-contain hover:scale-105 transition-transform duration-500"
                    unoptimized={selectedImage.url.startsWith("http")}
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-12">
                    <svg className="w-24 h-24 mb-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-lg font-medium">No images available</span>
                  </div>
                )}
              </button>

              {galleryImages.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {galleryImages.slice(0, 8).map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        selectedImageIndex === index
                          ? "border-cyan-500 ring-2 ring-cyan-500/40"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <Image
                        src={image.url}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized={image.url.startsWith("http")}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6 lg:sticky lg:top-24">
              <div>
                <h1 className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent mb-4 leading-tight">
                  {product.name}
                </h1>
                <p className="text-slate-400 text-lg mb-4 leading-relaxed">{product.description}</p>
              </div>

              <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800/50">
                <div className="space-y-4">
                  <div className="flex items-baseline gap-4 flex-wrap">
                    {discountPercent && (
                      <span className="text-3xl font-bold text-emerald-400  mr-3">
                        {discountPercent}% OFF
                      </span>
                    )}
                    
                   
                    {product.basePriceUSD && (
                      <span className="text-2xl font-normal text-slate-500 line-through">
                        ${product.basePriceUSD.toFixed(2)}
                      </span>
                    )}
                    <span className="text-3xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      ${product.priceUSD.toFixed(2)}
                    </span>
                    {/* <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-sm font-bold rounded-full border border-emerald-500/30">
                      USD
                    </span> */}
                  </div>
                  <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    <span>{product.merchant.name}</span>
                    <span>In Stock</span>
                    {videoCount > 0 && <span>{videoCount} product video(s)</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 font-medium min-w-[5rem]">Quantity</span>
                  <div className="flex items-center bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-12 h-12 flex items-center justify-center hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                    >
                      -
                    </button>
                    <span className="px-6 py-3 text-lg text-gray-50 font-bold bg-slate-900/50">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-12 h-12 flex items-center justify-center hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="grid gap-4">
                  <button
                    onClick={handleBuyNow}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black py-4 px-8 rounded-2xl text-lg shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all duration-300"
                  >
                    Buy Now ${(product.priceUSD * quantity).toFixed(2)}
                  </button>
                  <button
                    onClick={handleAddToCart}
                    className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-cyan-600/25 hover:shadow-cyan-600/40 hover:scale-[1.02] transition-all duration-300"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>

              {product.categories.length > 0 && (
                <div>
                  <h3 className="text-slate-400 font-medium mb-3">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/products?category=${encodeURIComponent(category.slug)}`}
                        className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-full border border-slate-700/50 hover:border-slate-600 transition-all"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isLightboxOpen && galleryImages.length > 0 && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div
              className="relative w-[min(92vw,1000px)] h-[min(82vh,760px)]"
              onClick={(event) => event.stopPropagation()}
            >
              <Image
                src={galleryImages[lightboxIndex]?.url || ""}
                alt={product.name}
                fill
                className="object-contain"
                unoptimized
              />

              {galleryImages.length > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white text-xl"
                    onClick={() =>
                      setLightboxIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))
                    }
                  >
                    ‹
                  </button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white text-xl"
                    onClick={() =>
                      setLightboxIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))
                    }
                  >
                    ›
                  </button>
                </>
              )}

              <button
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white text-xl"
                onClick={() => setIsLightboxOpen(false)}
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
}
