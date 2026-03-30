"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getOrder, verifyOrderPayment } from "@/lib/api-client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "react-qr-code";
import Protected from "@/components/Protected";
import type { OrderDetailsResponse, ProductImage } from "@/lib/api-client";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-pulse space-y-6 w-full max-w-md px-6">
        <div className="h-8 bg-slate-800 rounded w-1/2 mx-auto"></div>
        <div className="h-64 bg-slate-800 rounded-2xl"></div>
      </div>
    </div>
  );
}

function getPrimaryImage(images?: ProductImage[]): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  const primary = images.find((img) => img.type === "IMAGE" && img.isPrimary);
  if (primary?.url) return primary.url;
  const first = images.find((img) => img.type === "IMAGE");
  return first?.url || null;
}

export default function CheckoutPage() {
  const { orderId } = useParams();
  const searchParams = useSearchParams();
  const { token } = useAuthStore();

  const [order, setOrder] = useState<OrderDetailsResponse | null>(null);
  const [txHash, setTxHash] = useState("");
  const [showQr, setShowQr] = useState(searchParams.get("method") === "qr");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Auto-detection states
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [walletBalanceSymbol, setWalletBalanceSymbol] = useState<string | null>(null);
  const [autoDetectedTx, setAutoDetectedTx] = useState<string | null>(null);
  const [autoDetectedReady, setAutoDetectedReady] = useState(false);

  const [loadingOrder, setLoadingOrder] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Network & timer
  const [expiryTimeLeft, setExpiryTimeLeft] = useState(30 * 60); // 30 min default

  useEffect(() => {
    const loadOrder = async () => {
      if (!token || !orderId) {
        setLoadError(!token ? "Please log in first" : "Invalid order ID");
        setLoadingOrder(false);
        return;
      }

      try {
        setLoadingOrder(true);
        setLoadError(null);
        const fetchedOrder = await getOrder(token, String(orderId));
        setOrder(fetchedOrder);
        setWalletBalance(fetchedOrder.currentBalance || null);
        setWalletBalanceSymbol(fetchedOrder.currentBalanceSymbol || null);
        if (fetchedOrder.latestPaymentTxHash) {
          setTxHash((prev) => prev || fetchedOrder.latestPaymentTxHash || "");
          setAutoDetectedTx((prev) => prev || fetchedOrder.latestPaymentTxHash || null);
          setAutoDetectedReady(true);
        }
        if (
          fetchedOrder.currentBalance &&
          Number(fetchedOrder.currentBalance) >= Number(fetchedOrder.amount)
        ) {
          setAutoDetectedReady(true);
        }

        // Set expiry (assume 30min from createdAt or now)
        if (fetchedOrder.createdAt) {
          const created = new Date(fetchedOrder.createdAt).getTime();
          const expiryMs = created + (30 * 60 * 1000);
          const timeLeft = Math.floor((expiryMs - Date.now()) / 1000);
          setExpiryTimeLeft(Math.max(0, timeLeft));
        }
      } catch (err: unknown) {
        console.error("Failed to load order:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load order. It may not exist or you lack access.");
      } finally {
        setLoadingOrder(false);
      }
    };

    loadOrder();
  }, [token, orderId]);

  // Expiry timer
  useEffect(() => {
    if (expiryTimeLeft <= 0) return;

    const interval = setInterval(() => {
      setExpiryTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [expiryTimeLeft]);

  const handleVerify = async () => {
    if (!token) return;

    const normalizedHash = txHash.trim();
    if (!normalizedHash && !autoDetectedReady) return;

    try {
      setVerifying(true);
      setError(null);

      await verifyOrderPayment(token, String(orderId), normalizedHash, true); // Enable retry
      const updated = await getOrder(token, String(orderId));
      setOrder(updated);
      setWalletBalance(updated.currentBalance || null);
      setWalletBalanceSymbol(updated.currentBalanceSymbol || null);
      
      if (updated.status === "PAID") {
        setError(null); // Clear any stale errors
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Verification failed";
      
      if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
        setError("⏱️ Backend is processing (retried 3x). Blockchain confirmations can take time. Try again shortly.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setVerifying(false);
    }
  };

    const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Auto payment detection from backend polling
  useEffect(() => {
    if (!token || !orderId || order?.status === 'PAID') {
      return;
    }

    let interval: NodeJS.Timeout;
    const checkPayment = async () => {
      try {
        const latest = await getOrder(token, String(orderId));
        setOrder(latest);
        setWalletBalance(latest.currentBalance || null);
        setWalletBalanceSymbol(latest.currentBalanceSymbol || null);

        const detectedHash = latest.latestPaymentTxHash;
        if (detectedHash) {
          setTxHash((prev) => prev || detectedHash);
          setAutoDetectedTx((prev) => prev || detectedHash || null);
          setAutoDetectedReady(true);
        }
        if (
          latest.currentBalance &&
          Number(latest.currentBalance) >= Number(latest.amount)
        ) {
          setAutoDetectedReady(true);
        }
      } catch (err) {
        console.log('Auto-check failed:', err);
      }
    };

    checkPayment();
    interval = setInterval(checkPayment, 3000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, orderId, order?.status]);

  if (loadingOrder) {
    return (
      <Protected>
        <LoadingSkeleton />
      </Protected>
    );
  }

  if (loadError || !order) {
    return (
      <Protected>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center max-w-md px-6 py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">Order Not Found</h2>
            <p className="text-slate-400 mb-8 text-lg">{loadError || "Order could not be loaded."}</p>
            <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-xl text-white font-semibold transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Browse Products
            </Link>
          </div>
        </div>
      </Protected>
    );
  }

  const qrValue = order.network?.chainId === 1 
    ? `ethereum:${order.walletAddress}?value=${order.amount}`
    : `${order.network?.name?.toLowerCase()}:${order.walletAddress}?value=${order.amount}`;

  const statusConfig = {
    "PAID": { color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30", label: "✓ Paid" },
    "PENDING_PAYMENT": { color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/30", label: "⏳ Pending" },
    "FAILED": { color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30", label: "✗ Failed" },
    "EXPIRED": { color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30", label: "✗ Expired" },
    "CREATED": { color: "text-slate-400", bg: "bg-slate-500/20", border: "border-slate-500/30", label: "Created" }
  };

  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.CREATED;

  // Explorer map - type-safe
  const explorerUrls: Record<number, string> = {
    1: `https://etherscan.io/address/${order.walletAddress}`,
    56: `https://bscscan.com/address/${order.walletAddress}`,
    137: `https://polygonscan.com/address/${order.walletAddress}`,
    42161: `https://arbiscan.io/address/${order.walletAddress}`,
    // Add more as needed
  };

  const explorerUrl = order.network?.chainId && typeof order.network.chainId === 'number' 
    ? explorerUrls[order.network.chainId as number] || '#' 
    : '#';

  // Format time left
  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Protected>
      <div className="min-h-screen bg-slate-950 text-white">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/5 via-transparent to-cyan-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-2xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 mb-4 shadow-lg shadow-cyan-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2">Complete Payment</h2>
            
            {/* Network Info */}
            {order.network && (
              <div className="inline-flex items-center gap-2 bg-slate-800/60 px-4 py-2 rounded-xl mb-4 backdrop-blur-sm border border-slate-700/50">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="font-mono text-sm text-cyan-300">{order.network.name}</p>
                  <p className="text-xs text-slate-400">Chain ID: {order.network.chainId}</p>
                </div>
                <a href={explorerUrl} target="_blank" rel="noopener" className="ml-auto p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {/* Expiry Timer */}
            {expiryTimeLeft > 0 && (
              <div className="text-amber-400 text-sm font-mono bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30">
                ⏰ Expires in {formatTimeLeft(expiryTimeLeft)}
              </div>
            )}

            <p className="text-slate-400 text-sm">
              Send the exact amount to the wallet address below.
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center mb-8">
            <div className={`px-4 py-2 rounded-full text-sm font-medium border ${status.bg} ${status.color} ${status.border}`}>
              {status.label}
            </div>
          </div>

          {/* Ordered Products */}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <div className="mb-6 bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-semibold text-white">Ordered Products</h3>
                <span className="text-xs text-slate-400">{order.items.length} item(s)</span>
              </div>

              <div className="divide-y divide-slate-800">
                {order.items.map((item) => {
                  const imageUrl = getPrimaryImage(item.product.images);
                  return (
                    <Link
                      key={item.id}
                      href={`/products/${item.product.id}`}
                      className="group block p-4 hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                              unoptimized={imageUrl.startsWith("http")}
                            />
                          ) : (
                            <div className="w-full h-full grid place-items-center text-slate-500">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                              </svg>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-2">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {item.quantity} x {item.product.price} {item.product.currency}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-white">
                            {item.subtotal} {item.product.currency}
                          </p>
                          <p className="text-[11px] text-cyan-400 mt-1">View product</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Card */}
          <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            
            {/* Wallet Address */}
            <div className="bg-slate-800/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400">Wallet Address</p>
              <button
                onClick={() => {
                  copyToClipboard(order.walletAddress);
                  setCopiedAddress(true);
                  setTimeout(() => setCopiedAddress(false), 2000);
                }}
                className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-md transition-all group"
                title="Copy address to clipboard"
              >
                {copiedAddress ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 group-hover:text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
              </div>
              <p className="break-all font-mono text-sm text-cyan-300 leading-relaxed">
                {order.walletAddress}
              </p>
            </div>

            {/* Amount - Hero */}
            <div className="text-center p-8 bg-gradient-to-b from-slate-800/50 to-transparent rounded-2xl border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-2 uppercase tracking-wide font-medium">Amount to Pay</p>
              <p className="text-5xl md:text-6xl font-black bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                {order.amount}
              </p>
              <p className="text-xs text-slate-500 mt-2">Send exactly this amount - no more, no less</p>
            </div>

            {/* QR Toggle */}
            <div className="flex gap-3">
              <button
                className={`flex-1 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  showQr 
                    ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg shadow-cyan-600/20" 
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                onClick={() => setShowQr((prev) => !prev)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                {showQr ? "Hide QR" : "Show QR"}
              </button>

              <a
                href={qrValue}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-medium text-white text-center transition-all duration-300 shadow-lg shadow-purple-600/20 hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Open Wallet
              </a>
            </div>

            {/* QR Code */}
            {showQr && (
              <div className="flex flex-col items-center p-6 bg-white/5 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="bg-white p-4 rounded-2xl shadow-2xl">
                  <QRCode value={qrValue} size={200} />
                </div>
                <p className="text-xs text-slate-400 mt-4">Scan with your crypto wallet</p>
              </div>
            )}

            {/* TX Input */}
            <div className="space-y-3 pt-2">
              <label className="text-sm text-slate-400">Transaction Hash</label>
              <input
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                placeholder="Enter your transaction hash after sending"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
              />
              {walletBalance && (
                <p className="text-xs text-slate-400">
                  Wallet balance: {walletBalance} {walletBalanceSymbol || ""}
                </p>
              )}
              {autoDetectedTx && (
                <p className="text-xs text-emerald-300">
                  Latest incoming transaction hash detected automatically.
                </p>
              )}
              {!autoDetectedTx && autoDetectedReady && (
                <p className="text-xs text-emerald-300">
                  Payment detected by wallet balance. You can verify without a hash.
                </p>
              )}

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                onClick={handleVerify}
                disabled={(!txHash.trim() && !autoDetectedReady) || verifying || order.status === "PAID"}
                className={`w-full py-4 rounded-xl text-lg font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                  (txHash.trim() || autoDetectedReady) && !verifying && order.status !== "PAID"
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-600/20 hover:shadow-green-600/30 hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-slate-700 text-slate-400 cursor-not-allowed"
                }`}
              >
                {verifying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : order.status === "PAID" ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Payment Completed
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Verify Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Protected>
  );
}
