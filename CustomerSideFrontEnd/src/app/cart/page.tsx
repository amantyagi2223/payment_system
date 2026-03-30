"use client";

import { useCartStore, type CartItem } from '@/store/cartStore';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Protected from '@/components/Protected';
import Image from 'next/image';

interface MerchantCartData {
  merchantId: string;
  merchantName: string;
  cartItems: CartItem[];
  subtotalUSD: number;
  deliveryTotal: number;
  totalUSD: number;
  totalMRP: number;
  totalSavings: number;
}

export default function CartPage() {
  const router = useRouter();
  const [merchantCarts, setMerchantCarts] = useState<MerchantCartData[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);

  const {
    hydrate,
    getCartForMerchant,
    getMerchantDeliveryTotal,
    getMerchantsWithItems,
    getTotalItems,
    updateQty,
    clearAll
  } = useCartStore();

  const totalItemsCount = useCartStore((s) => s.getTotalItems());

  useEffect(() => {
    hydrate();

    const merchants = getMerchantsWithItems();
    const carts: MerchantCartData[] = [];

    

    merchants.forEach((merchantId: string) => {
      const items = getCartForMerchant(merchantId);
        console.log("carts", items);
        
      const validItems = items.filter(
        (i) =>
          typeof i.priceUSD === 'number' &&
          typeof i.deliveryCost === 'number'
      );

      let subtotal = 0;
      let totalMRP = 0;

      validItems.forEach((i) => {
        const mrp = i.mrp || i.priceUSD * 1.25;

        subtotal += i.priceUSD * i.qty;
        totalMRP += mrp * i.qty;
      });

      const deliveryTotal = getMerchantDeliveryTotal(merchantId);

      carts.push({
        merchantId,
        merchantName: validItems[0]?.merchantName || "Store",
        cartItems: validItems,
        subtotalUSD: subtotal,
        deliveryTotal,
        totalUSD: subtotal + deliveryTotal,
        totalMRP,
        totalSavings: totalMRP - subtotal,
      });
    });

    setMerchantCarts(carts);

    if (carts.length > 0 && !selectedMerchantId) {
      setSelectedMerchantId(carts[0].merchantId);
    }
  }, [totalItemsCount]);

  const selectedCart = merchantCarts.find(
    (c) => c.merchantId === selectedMerchantId
  );

  const finalTotal = (selectedCart?.totalUSD || 0) - promoDiscount;

  const handleQtyChange = useCallback(
    (merchantId: string, productId: string, qty: number) => {
      if (qty < 0) return;
      updateQty(merchantId, productId, qty);
    },
    [updateQty]
  );

  const handlePromoApply = () => {
    const discount = Math.min((selectedCart?.totalUSD || 0) * 0.1, 50);
    setPromoDiscount(discount);
  };

  const handleProceed = () => {
    if (selectedMerchantId) {
      router.push(`/checkout/review/${selectedMerchantId}`);
    }
  };

  if (merchantCarts.length === 0) {
    return (
      <Protected>
        <div className="min-h-screen flex flex-col items-center justify-center text-white bg-slate-950">
          <h1 className="text-3xl">Your Cart is Empty</h1>
          <Link href="/products" className="mt-4 px-6 py-3 bg-emerald-600 rounded-lg">
            Start Shopping
          </Link>
        </div>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="min-h-screen bg-slate-950 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">

          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold">Shopping Cart</h1>
            <span className="text-sm text-slate-400">
              {getTotalItems()} items
            </span>
          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ITEMS */}
            {/* ITEMS */}
            <div className="lg:col-span-2 space-y-6">

              {selectedCart?.cartItems.map((item) => {
                const mrp = item.mrp || item.priceUSD * 1.25;
                const discountPercent = Math.round(((mrp - item.priceUSD) / mrp) * 100);
                const saving = (mrp - item.priceUSD) * item.qty;

                return (
                  <div
                    key={item.productId}
                    className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl p-6"
                  >
                    {/* LEFT SIDE */}
                    <div className="flex gap-5 items-start flex-1">

                      {/* IMAGE */}
                      <div className="w-24 h-24 bg-slate-800 rounded-lg overflow-hidden relative flex-shrink-0">
                        {item.imageUrl && (
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                        )}
                      </div>

                      {/* DETAILS */}
                      <div className="space-y-2">

                        <h3 className="text-lg font-medium leading-snug">
                          {item.name}
                        </h3>

                        {/* PRICE BLOCK */}
                        <div className="flex items-center gap-3 flex-wrap">

                          <span className="text-xl font-semibold text-white">
                            ${(item.priceUSD * item.qty).toFixed(2)}
                          </span>

                          <span className="text-base line-through text-slate-500">
                            ${(item.mrp * item.qty).toFixed(2)}
                          </span>

                          <span className="text-sm text-emerald-400 font-medium">
                            {discountPercent}% OFF
                          </span>
                        </div>

                        <div className="text-sm text-emerald-400">
                          You save ${saving.toFixed(2)}
                        </div>

                        <div className="text-sm text-slate-400">
                          Delivery: ${item.deliveryCost}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="flex flex-col items-end justify-between gap-4">

                      {/* QTY */}
                      <div className="flex items-center border border-slate-700 rounded-md overflow-hidden">
                        <button
                          onClick={() =>
                            handleQtyChange(selectedCart.merchantId, item.productId, item.qty - 1)
                          }
                          className="px-4 py-2 text-lg hover:bg-slate-800"
                        >
                          −
                        </button>

                        <span className="px-5 text-lg">{item.qty}</span>

                        <button
                          onClick={() =>
                            handleQtyChange(selectedCart.merchantId, item.productId, item.qty + 1)
                          }
                          className="px-4 py-2 text-lg hover:bg-slate-800"
                        >
                          +
                        </button>
                      </div>

                      {/* REMOVE */}
                      <button
                        onClick={() =>
                          handleQtyChange(selectedCart.merchantId, item.productId, 0)
                        }
                        className="text-sm text-red-400 hover:underline"
                      >
                        Remove
                      </button>

                      {/* TOTAL */}
                      {/* <div className="text-xl font-semibold text-white">
                        ${(item.priceUSD * item.qty).toFixed(2)}
                      </div> */}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RIGHT: SUMMARY */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sticky top-24">

                <h2 className="text-lg font-semibold mb-4">
                  Order Summary
                </h2>

                <div className="space-y-3 text-base">

                  <div className="flex justify-between text-slate-400">
                    <span>MRP Total</span>
                    <span className="line-through">
                      ${selectedCart?.totalMRP.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-400">
                    <span>You Saved</span>
                    <span>${selectedCart?.totalSavings.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>Shipping</span>
                    <span>${selectedCart?.deliveryTotal.toFixed(2)}</span>
                  </div>

                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Promo</span>
                      <span>-${promoDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-3 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* PROMO */}
                <div className="mt-4 flex gap-2">
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-md"
                    placeholder="Promo code"
                  />
                  <button
                    onClick={handlePromoApply}
                    className="px-4 py-2 text-sm bg-emerald-600 rounded-md"
                  >
                    Apply
                  </button>
                </div>

                {/* CTA */}
                <button
                  onClick={handleProceed}
                  className="w-full mt-5 py-3 text-sm font-medium bg-emerald-600 rounded-md"
                >
                  Proceed to Checkout
                </button>

                <button
                  onClick={clearAll}
                  className="w-full mt-3 text-xs text-slate-400"
                >
                  Clear Cart
                </button>

              </div>
            </div>

          </div>
        </div>
      </div>
    </Protected>
  );
}