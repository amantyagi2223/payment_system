"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import Protected from "@/components/Protected";
import {
  createOrder,
  getOrder,
  listBlockchains,
  verifyOrderPayment,
  type BlockchainListItem,
  type CreateOrderResponse,
  type OrderStatus,
} from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useRateStore } from "@/store/rateStore";

const STABLE_SYMBOLS = ["USDT", "USDC"] as const;

function normalizeSymbol(value: string | null | undefined): string {
  return String(value || "USDT").trim().toUpperCase();
}

function getNativeSymbol(chain: BlockchainListItem | null): string {
  const code = normalizeSymbol(chain?.code);
  const symbol = normalizeSymbol(chain?.symbol);

  if (symbol && symbol !== "USDT") return symbol;
  if (code.includes("TRON")) return "TRX";
  if (code.includes("BSC") || code.includes("BNB")) return "BNB";
  if (code.includes("POLYGON") || code.includes("MATIC")) return "MATIC";
  return "ETH";
}

function getChainOptions(chain: BlockchainListItem | null): string[] {
  const native = getNativeSymbol(chain);
  return [native, ...STABLE_SYMBOLS];
}

function ceilToDecimals(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.ceil(value * factor) / factor;
}

function formatBalance(value: string | number | null | undefined, decimals = 6): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  const fixed = numeric.toFixed(decimals);
  return fixed.replace(/\.?0+$/, "");
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantId = String(params.merchantId || "");
  const initialAddressId = searchParams.get("addressId");

  const {
    token,
    shippingAddresses,
    loadShippingAddresses,
  } = useAuthStore();

  const {
    getCartForMerchant,
    getSubtotalUSD,
    getDeliveryFee,
    getTotalUSD,
    clearMerchant,
  } = useCartStore();
  const fetchAllRates = useRateStore((state) => state.fetchAllRates);
  const getCryptoAmount = useRateStore((state) => state.getCryptoAmount);

  const cartItems = getCartForMerchant(merchantId);
  const subtotalUSD = getSubtotalUSD(merchantId);
  const deliveryUSD = getDeliveryFee(merchantId);
  const totalUSD = getTotalUSD(merchantId);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(initialAddressId);
  const [blockchains, setBlockchains] = useState<BlockchainListItem[]>([]);
  const [selectedBlockchainId, setSelectedBlockchainId] = useState<string>("");
  const [selectedPaymentSymbol, setSelectedPaymentSymbol] = useState<string>("USDT");

  const [order, setOrder] = useState<CreateOrderResponse | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [txHash, setTxHash] = useState("");
  const [autoDetectedTxHash, setAutoDetectedTxHash] = useState<string | null>(null);
  const [autoDetectedReady, setAutoDetectedReady] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "address" | "hash">("idle");

  const selectedAddress = useMemo(() => {
    if (selectedAddressId) {
      return shippingAddresses.find((item) => item.id === selectedAddressId) || null;
    }
    return shippingAddresses.find((item) => item.isPrimary) || shippingAddresses[0] || null;
  }, [selectedAddressId, shippingAddresses]);

  const selectedBlockchain = useMemo(
    () => blockchains.find((item) => item.id === selectedBlockchainId) || null,
    [blockchains, selectedBlockchainId],
  );

  const paymentOptions = useMemo(
    () => getChainOptions(selectedBlockchain),
    [selectedBlockchain],
  );

  const paymentSymbol = useMemo(() => {
    if (order?.paymentAsset?.symbol) return normalizeSymbol(order.paymentAsset.symbol);
    return normalizeSymbol(selectedPaymentSymbol);
  }, [order?.paymentAsset?.symbol, selectedPaymentSymbol]);

  const pollingOrderId = order?.orderId || order?.id || null;
  const estimatedPayAmount = useMemo(() => {
    const value = getCryptoAmount(totalUSD, selectedPaymentSymbol);
    return ceilToDecimals(Number.isFinite(value) ? value : 0, 4);
  }, [getCryptoAmount, selectedPaymentSymbol, totalUSD]);

  useEffect(() => {
    let mounted = true;

    const loadInitial = async () => {
      setInitialLoading(true);
      setError(null);

      try {
        await fetchAllRates();

        if (token && shippingAddresses.length === 0) {
          await loadShippingAddresses();
        }

        const chains = await listBlockchains();
        if (!mounted) return;

        setBlockchains(chains);
        const preferred = chains.find((item) => item.isActive) || chains[0] || null;
        if (preferred) {
          setSelectedBlockchainId((prev) => prev || preferred.id);
          setSelectedPaymentSymbol((prev) => {
            const options = getChainOptions(preferred);
            return options.includes(prev) ? prev : options[0];
          });
        }
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load payment screen");
      } finally {
        if (mounted) {
          setInitialLoading(false);
        }
      }
    };

    loadInitial();
    return () => {
      mounted = false;
    };
  }, [token, shippingAddresses.length, loadShippingAddresses, fetchAllRates]);

  useEffect(() => {
    if (selectedAddressId || shippingAddresses.length === 0) return;
    const preferred = shippingAddresses.find((item) => item.isPrimary) || shippingAddresses[0];
    if (preferred) {
      setSelectedAddressId(preferred.id);
    }
  }, [selectedAddressId, shippingAddresses]);

  useEffect(() => {
    if (!selectedBlockchain) return;
    const options = getChainOptions(selectedBlockchain);
    if (!options.includes(selectedPaymentSymbol)) {
      setSelectedPaymentSymbol(options[0]);
    }
  }, [selectedBlockchain, selectedPaymentSymbol]);

  useEffect(() => {
    if (!pollingOrderId || !token || orderStatus === "PAID") return;

    let mounted = true;

    const pollOrder = async () => {
      try {
        const latest = await getOrder(token, pollingOrderId);
        if (!mounted) return;

        setOrder(latest);
        setOrderStatus(latest.status);
        if (latest.status === "PAID") {
          clearMerchant(merchantId);
          setVerificationMessage(null);
        }

        const detected = latest.latestPaymentTxHash;
        if (detected && (!txHash || txHash.startsWith("auto-"))) {
          setTxHash(detected);
          setAutoDetectedTxHash(detected);
          setAutoDetectedReady(true);
        }

        const currentBalance = Number(latest.currentBalance || 0);
        const requiredAmount = Number(latest.amount || 0);
        if (Number.isFinite(currentBalance) && Number.isFinite(requiredAmount) && currentBalance >= requiredAmount) {
          setAutoDetectedReady(true);
        }
      } catch {
        // keep silent during polling; user can still verify manually
      }
    };

    pollOrder();
    const timer = setInterval(pollOrder, 3000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [pollingOrderId, token, orderStatus, txHash, clearMerchant, merchantId]);

  const handleCreateOrder = useCallback(async () => {
    if (!token) {
      setError("Please login first");
      return;
    }
    if (!selectedAddress) {
      setError("Please select a delivery address");
      return;
    }
    if (!selectedBlockchainId) {
      setError("Please select a blockchain");
      return;
    }
    if (cartItems.length === 0) {
      setError("Your cart is empty for this merchant");
      return;
    }

    try {
      setError(null);
      setCreatingOrder(true);

      const created = await createOrder(
        token,
        cartItems.map((item) => ({ productId: item.productId, quantity: item.qty })),
        selectedBlockchainId,
        selectedAddress.id,
        selectedPaymentSymbol,
        deliveryUSD,
      );

      setOrder(created);
      setOrderStatus(created.status);
      setTxHash("");
      setAutoDetectedTxHash(null);
      setAutoDetectedReady(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create payment order");
    } finally {
      setCreatingOrder(false);
    }
  }, [
    token,
    selectedAddress,
    selectedBlockchainId,
    selectedPaymentSymbol,
    deliveryUSD,
    cartItems,
  ]);

  const handleConfirmPayment = useCallback(async () => {
    const orderId = order?.orderId || order?.id;
    if (!token || !orderId || (!txHash.trim() && !autoDetectedReady)) return;

    try {
      setVerifyingPayment(true);
      setError(null);
      setVerificationMessage("Confirming your payment on-chain. This can take a few seconds.");

      const resolvedTxHash = txHash.trim();
      await verifyOrderPayment(token, orderId, resolvedTxHash, true);
      const latest = await getOrder(token, orderId);
      setOrder(latest);
      setOrderStatus(latest.status);
      if (latest.status === "PAID") {
        clearMerchant(merchantId);
        setVerificationMessage(null);
      } else {
        setVerificationMessage("Payment submitted. Waiting for final confirmation.");
      }
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Payment verification failed");
      setVerificationMessage(null);
    } finally {
      setVerifyingPayment(false);
    }
  }, [token, order, txHash, autoDetectedReady, clearMerchant, merchantId]);

  const copyValue = async (text: string, target: "address" | "hash") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(target);
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setError("Clipboard copy failed. Please copy manually.");
    }
  };

  const qrValue = useMemo(() => {
    if (!order) return "";
    const networkChainId = order.network?.chainId || selectedBlockchain?.chainId || 1;
    return `crypto:${paymentSymbol}:${order.walletAddress}?amount=${order.amount}&chainId=${networkChainId}`;
  }, [order, paymentSymbol, selectedBlockchain?.chainId]);

  if (!token) {
    return (
      <Protected>
        <div className="min-h-[75vh] flex items-center justify-center px-6 text-center">
          <div>
            <h2 className="text-2xl font-bold mb-3">Login Required</h2>
            <Link href="/login" className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-semibold">
              Login to Continue
            </Link>
          </div>
        </div>
      </Protected>
    );
  }

  if (order && orderStatus === "PAID") {
    return (
      <Protected>
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
          <div className="w-full max-w-xl rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40">
              <svg className="h-9 w-9 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-emerald-200">Order Confirmed</h2>
            <p className="mt-2 text-slate-200">
              Payment of <span className="font-bold text-emerald-300">{order.amount} {paymentSymbol}</span> was confirmed successfully.
            </p>
            <p className="mt-1 text-sm text-slate-400">Order ID: {order.orderId || order.id}</p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 text-left">
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <p className="text-xs uppercase text-slate-400">Network</p>
                <p className="font-semibold">{order.network.name}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <p className="text-xs uppercase text-slate-400">Wallet</p>
                <p className="font-mono text-sm text-cyan-300 break-all">{order.walletAddress}</p>
              </div>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/orders" className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold">
                View Orders
              </Link>
              <Link href="/products" className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </Protected>
    );
  }

  if (cartItems.length === 0 && !order) {
    return (
      <Protected>
        <div className="min-h-[75vh] flex items-center justify-center px-6 text-center">
          <div>
            <h2 className="text-2xl font-bold mb-3">Cart Is Empty</h2>
            <p className="text-slate-400 mb-6">No items found for this merchant.</p>
            <Link href="/cart" className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold">
              Back to Cart
            </Link>
          </div>
        </div>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between gap-4 mb-8">
            <button onClick={() => router.back()} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200">
              Back
            </button>
            <h1 className="text-3xl font-black">Crypto Checkout</h1>
            <Link href={`/checkout/review/${merchantId}`} className="text-sm text-slate-400 hover:text-slate-200">
              Review screen
            </Link>
          </div>

          {initialLoading ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Preparing payment screen...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-5">
                <h2 className="text-xl font-bold">Order Summary</h2>

                <div className="space-y-3 max-h-64 overflow-auto pr-2">
                  {cartItems.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between gap-3 bg-slate-800/50 rounded-xl p-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-slate-400">{item.qty} x ${item.priceUSD.toFixed(2)}</p>
                      </div>
                      <p className="font-semibold">${(item.qty * item.priceUSD).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-300"><span>Subtotal</span><span>${subtotalUSD.toFixed(2)}</span></div>
                  <div className="flex justify-between text-slate-300"><span>Delivery</span><span>${deliveryUSD.toFixed(2)}</span></div>
                  <div className="h-px bg-slate-700" />
                  <div className="flex justify-between text-lg font-bold"><span>Total (USDT)</span><span>${totalUSD.toFixed(2)}</span></div>
                </div>

                {selectedAddress ? (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                    <p className="text-xs uppercase text-slate-400 mb-1">Delivery Address</p>
                    <p className="font-medium">{selectedAddress.name}</p>
                    <p className="text-sm text-slate-300">{selectedAddress.address1}</p>
                    {selectedAddress.address2 && <p className="text-sm text-slate-300">{selectedAddress.address2}</p>}
                    <p className="text-sm text-slate-400">{selectedAddress.city}, {selectedAddress.state} {selectedAddress.zipCode}</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                    No delivery address selected. Go back and add/select an address.
                  </div>
                )}
              </section>

              <section className="relative bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-5">
                <h2 className="text-xl font-bold">Payment Setup</h2>

                {!order ? (
                  <>
                    <div>
                      <label className="text-sm text-slate-400 block mb-2">Blockchain</label>
                      <select
                        value={selectedBlockchainId}
                        onChange={(event) => setSelectedBlockchainId(event.target.value)}
                        className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2"
                      >
                        {blockchains.map((chain) => (
                          <option key={chain.id} value={chain.id}>
                            {chain.name} ({chain.code || chain.chainId})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-slate-400 block mb-2">Pay With</label>
                      <select
                        value={selectedPaymentSymbol}
                        onChange={(event) => setSelectedPaymentSymbol(event.target.value)}
                        className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2"
                      >
                        {paymentOptions.map((symbol) => (
                          <option key={symbol} value={symbol}>{symbol}</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-2">
                        Product pricing is in USDT. Final payable amount is generated on order creation.
                      </p>
                      <p className="text-sm text-emerald-300 mt-2 font-semibold">
                        Estimated amount: {estimatedPayAmount.toFixed(4)} {selectedPaymentSymbol}
                      </p>
                    </div>

                    <button
                      onClick={handleCreateOrder}
                      disabled={creatingOrder || !selectedAddress || !selectedBlockchainId}
                      className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50"
                    >
                      {creatingOrder ? "Generating Payment Link..." : "Generate Payment Link"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                      <p className="text-xs text-emerald-300 uppercase mb-1">Send Exact Amount</p>
                      <p className="text-3xl font-black text-emerald-300">{order.amount} {paymentSymbol}</p>
                      <p className="text-xs text-slate-400 mt-1">Network: {order.network.name}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">Wallet Address</p>
                      <div className="relative">
                        <input
                          readOnly
                          value={order.walletAddress}
                          className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 pr-24 text-sm font-mono text-cyan-300"
                        />
                        <button
                          onClick={() => copyValue(order.walletAddress, "address")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs"
                        >
                          {copyState === "address" ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl w-fit mx-auto">
                      <QRCode value={qrValue} size={180} />
                    </div>

                    <div className="text-xs text-slate-400 text-center -mt-2">
                      Auto checking status every 3 seconds
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Payment Wallet Balance</p>
                        <p className="mt-1 font-semibold text-cyan-300">
                          {formatBalance(order.currentBalance ?? order.walletBalances?.payment?.balance)} {order.currentBalanceSymbol || order.walletBalances?.payment?.symbol || paymentSymbol}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Gas Balance</p>
                        <p className="mt-1 font-semibold text-amber-300">
                          {formatBalance(order.gasBalance ?? order.walletBalances?.gas?.balance)} {order.gasSymbol || order.walletBalances?.gas?.symbol || getNativeSymbol(selectedBlockchain)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-slate-400 block">Transaction Hash</label>
                      <div className="relative">
                        <input
                          value={txHash}
                          onChange={(event) => setTxHash(event.target.value)}
                          placeholder="Paste transaction hash"
                          className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 pr-24 text-sm"
                        />
                        {txHash && (
                          <button
                            onClick={() => copyValue(txHash, "hash")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs"
                          >
                            {copyState === "hash" ? "Copied" : "Copy"}
                          </button>
                        )}
                      </div>
                      {autoDetectedTxHash && (
                        <p className="text-xs text-emerald-300">Transaction hash detected from backend activity.</p>
                      )}
                      {!autoDetectedTxHash && autoDetectedReady && (
                        <p className="text-xs text-emerald-300">
                          Payment detected by wallet balance. You can confirm without entering hash.
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleConfirmPayment}
                      disabled={verifyingPayment || (!txHash.trim() && !autoDetectedReady)}
                      className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50"
                    >
                      {verifyingPayment
                        ? "Confirming Payment..."
                        : autoDetectedReady
                          ? "Confirm Auto-Detected Payment"
                          : "Confirm Payment"}
                    </button>

                    {verificationMessage && (
                      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
                        {verificationMessage}
                      </div>
                    )}

                    {orderStatus === "PAID" && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                        <p className="text-emerald-300 font-semibold">Payment confirmed successfully.</p>
                        <Link href="/orders" className="inline-block mt-3 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold">
                          View Orders
                        </Link>
                      </div>
                    )}
                  </>
                )}

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {verifyingPayment && (
                  <div className="absolute inset-0 rounded-2xl bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="text-center">
                      <div className="mx-auto mb-4 h-12 w-12 rounded-full border-2 border-slate-600 border-t-cyan-400 animate-spin" />
                      <p className="font-semibold text-cyan-200">Confirming Payment</p>
                      <p className="mt-1 text-sm text-slate-300">Verifying transaction hash and blockchain confirmations...</p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </Protected>
  );
}
