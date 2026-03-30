"use client";

import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Protected from "@/components/Protected";
import AddressForm from "@/components/AddressForm";
import type { ShippingAddress } from "@/lib/api-client";

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function AddressReviewPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.merchantId as string;

  const {
    getCartForMerchant,
    getDeliveryFee,
    getSubtotalUSD,
    getTotalUSD,
  } = useCartStore();

  const {
    token,
    shippingAddresses,
    loadShippingAddresses,
    addShippingAddress,
  } = useAuthStore();

  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const cartItems = getCartForMerchant(merchantId);
  const subtotal = getSubtotalUSD(merchantId);
  const deliveryFee = getDeliveryFee(merchantId);
  const totalUSD = getTotalUSD(merchantId);
  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const mrpTotal = cartItems.reduce((sum, item) => sum + item.mrp * item.qty, 0);
  const totalSavings = useMemo(
    () => Math.max(mrpTotal - subtotal, 0),
    [mrpTotal, subtotal],
  );

  const merchantName = cartItems[0]?.merchantName || merchantId.slice(0, 8).toUpperCase();

  useEffect(() => {
    if (!token || shippingAddresses.length > 0) return;

    const load = async () => {
      setAddressesLoading(true);
      try {
        await loadShippingAddresses();
      } finally {
        setAddressesLoading(false);
      }
    };

    load();
  }, [token, shippingAddresses.length, loadShippingAddresses]);

  useEffect(() => {
    if (selectedAddressId || shippingAddresses.length === 0) return;
    const preferred = shippingAddresses.find((addr) => addr.isPrimary) || shippingAddresses[0];
    if (preferred) {
      setSelectedAddressId(preferred.id);
    }
  }, [shippingAddresses, selectedAddressId]);

  const selectedAddress = useMemo(() => {
    if (selectedAddressId) {
      return shippingAddresses.find((addr) => addr.id === selectedAddressId) || null;
    }
    return shippingAddresses.find((addr) => addr.isPrimary) || shippingAddresses[0] || null;
  }, [selectedAddressId, shippingAddresses]);

  const addNewAddress = async (
    formData: Pick<
      ShippingAddress,
      "name" | "address1" | "address2" | "city" | "state" | "zipCode" | "country"
    >,
  ) => {
    try {
      setAddressError(null);
      const newAddress = await addShippingAddress(formData);
      setSelectedAddressId(newAddress.id);
      setShowAddressForm(false);
    } catch (error) {
      console.error("Failed to add address:", error);
      setAddressError(error instanceof Error ? error.message : "Failed to add address");
    }
  };

  const handleConfirm = () => {
    if (!selectedAddress) {
      alert("Please select or add a delivery address");
      return;
    }
    router.push(`/checkout/payment/${merchantId}?addressId=${selectedAddress.id}`);
  };

  if (cartItems.length === 0) {
    return (
      <Protected>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4">Cart Empty</h2>
            <p className="text-slate-400 mb-8">Items no longer available for this merchant.</p>
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white font-semibold"
            >
              ← Back to Cart
            </Link>
          </div>
        </div>
      </Protected>
    );
  }

  const activeAddressId = selectedAddress?.id ?? null;

  return (
    <Protected>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/3 h-[32rem] w-[32rem] rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/3 h-[30rem] w-[30rem] rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-10 sm:px-6">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold">Review & Confirm</h1>
                <p className="text-slate-400 text-sm">
                  {totalItems} item{totalItems > 1 ? "s" : ""} from {merchantName}
                </p>
              </div>
            </div>
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 transition-colors text-slate-200"
            >
              Edit Cart
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.95fr]">
            <section className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Items</p>
                  <p className="mt-1 text-xl font-semibold">{totalItems}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">MRP Total</p>
                  <p className="mt-1 text-xl font-semibold">{formatMoney(mrpTotal)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                  <p className="text-xs text-emerald-300 uppercase tracking-wide">You Save</p>
                  <p className="mt-1 text-xl font-semibold text-emerald-300">{formatMoney(totalSavings)}</p>
                </div>
                <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4">
                  <p className="text-xs text-cyan-200 uppercase tracking-wide">Payable</p>
                  <p className="mt-1 text-xl font-semibold text-cyan-200">{formatMoney(totalUSD)}</p>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Products in This Order</h3>
                  <span className="text-xs text-slate-400">{cartItems.length} unique products</span>
                </div>

                <div className="divide-y divide-slate-800">
                  {cartItems.map((item) => {
                    const lineMrp = item.mrp * item.qty;
                    const lineSale = item.priceUSD * item.qty;
                    const lineSavings = Math.max(lineMrp - lineSale, 0);
                    const itemDiscount = item.mrp > 0
                      ? Math.round(((item.mrp - item.priceUSD) / item.mrp) * 100)
                      : 0;

                    return (
                      <div key={item.productId} className="p-4 sm:p-5">
                        <div className="flex gap-4">
                          <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover"
                                unoptimized={item.imageUrl.startsWith("http")}
                              />
                            ) : (
                              <div className="w-full h-full grid place-items-center text-slate-500">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div>
                                <p className="font-semibold text-white line-clamp-2">{item.name}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                  <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                                    Qty {item.qty}
                                  </span>
                                  {itemDiscount > 0 && (
                                    <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300">
                                      {itemDiscount}% OFF
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-left sm:text-right">
                                <p className="text-lg font-bold text-cyan-300">{formatMoney(lineSale)}</p>
                                {lineSavings > 0 && (
                                  <p className="text-xs text-slate-500 line-through">{formatMoney(lineMrp)}</p>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                              <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-slate-300">
                                Unit Price: <span className="text-white">{formatMoney(item.priceUSD)}</span>
                              </div>
                              <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-slate-300">
                                Delivery: <span className="text-white">{formatMoney(item.deliveryCost * item.qty)}</span>
                              </div>
                              <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-emerald-300">
                                Saved: <span className="text-emerald-300">{formatMoney(lineSavings)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <div className="lg:sticky lg:top-24 space-y-5">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold mb-4">Price Details</h3>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between text-slate-300">
                      <span>MRP Total</span>
                      <span className="line-through text-slate-500">{formatMoney(mrpTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Subtotal</span>
                      <span>{formatMoney(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-300">
                      <span>Discount</span>
                      <span>-{formatMoney(totalSavings)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Delivery Fee</span>
                      <span>{formatMoney(deliveryFee)}</span>
                    </div>
                    <div className="h-px bg-slate-700 my-2" />
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total to Pay</span>
                      <span className="text-cyan-300">{formatMoney(totalUSD)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold mb-4">Delivery Address</h3>

                  {addressesLoading ? (
                    <div className="p-6 text-center">
                      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-400">Loading addresses...</p>
                    </div>
                  ) : shippingAddresses.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 p-5 text-center">
                      <p className="text-sm text-slate-400 mb-4">No saved addresses found</p>
                      <button
                        onClick={() => setShowAddressForm(true)}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-white font-semibold"
                      >
                        + Add New Address
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="max-h-[280px] overflow-y-auto space-y-2.5 pr-1">
                        {shippingAddresses.map((addr) => (
                          <button
                            key={addr.id}
                            onClick={() => setSelectedAddressId(addr.id)}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                              activeAddressId === addr.id
                                ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/25"
                                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div
                                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                                  activeAddressId === addr.id ? "bg-blue-400" : "bg-slate-500"
                                }`}
                              />
                              <div className="min-w-0">
                                <p className="font-medium">
                                  {addr.name || "Home"}
                                  {addr.isPrimary && (
                                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                                      Primary
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                  {addr.address1}
                                  {addr.address2 ? `, ${addr.address2}` : ""}, {addr.city}, {addr.state}{" "}
                                  {addr.zipCode}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setShowAddressForm(true)}
                        className="w-full mt-3 py-2.5 border border-slate-700 hover:border-slate-600 bg-slate-800/50 rounded-xl text-slate-300 text-sm font-medium transition-all"
                      >
                        + Add New Address
                      </button>
                    </>
                  )}

                  {addressError && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
                      {addressError}
                    </div>
                  )}

                  <button
                    onClick={handleConfirm}
                    disabled={!selectedAddress || addressesLoading || showAddressForm}
                    className="w-full mt-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm Order & Pay {formatMoney(totalUSD)}
                  </button>
                </div>
              </div>
            </aside>
          </div>

          {showAddressForm && (
            <AddressForm
              onSave={addNewAddress}
              onCancel={() => setShowAddressForm(false)}
              isOpen={showAddressForm}
              title="Add Delivery Address"
            />
          )}
        </div>
      </div>
    </Protected>
  );
}
