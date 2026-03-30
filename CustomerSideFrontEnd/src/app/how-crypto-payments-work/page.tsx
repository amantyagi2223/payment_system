"use client";

import Link from "next/link";

export default function HowCryptoPaymentsWorkPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/5 via-transparent to-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 rounded-full text-cyan-400 text-sm font-medium mb-6 border border-cyan-500/20">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            Guide
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            How Crypto <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">Payments Work</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A complete guide to understanding cryptocurrency payments on our marketplace.
          </p>
        </div>

        {/* Step 1 */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-3">Place Your Order</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Browse our products, add items to your cart, and proceed to checkout. Review your order details including the total amount in USD and the cryptocurrency equivalent.
              </p>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-sm text-slate-400">
                  <span className="text-cyan-400 font-medium">Note:</span> The crypto price is calculated at the time of order and may vary slightly due to market fluctuations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-3">Select Your Network</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Choose your preferred blockchain network from the options available. We support Ethereum, Polygon, BNB Chain, Arbitrum, Optimism, and Base. Make sure your wallet is connected to the same network.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-300">Ethereum</span>
                <span className="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-300">Polygon</span>
                <span className="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-300">BNB Chain</span>
                <span className="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-300">Arbitrum</span>
                <span className="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-300">Optimism</span>
                <span className="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-300">Base</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-3">Send Cryptocurrency</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                You'll be shown a wallet address (or QR code) to send your payment. Open your crypto wallet, enter the amount, and confirm the transaction. 
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                  <span className="text-green-400">✓</span>
                  <p className="text-sm text-slate-300">Double-check the wallet address before sending</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                  <span className="text-green-400">✓</span>
                  <p className="text-sm text-slate-300">Ensure you have enough for network fees (gas)</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                  <span className="text-green-400">✓</span>
                  <p className="text-sm text-slate-300">Confirm the correct network is selected</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              4
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-3">Wait for Confirmation</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Cryptocurrency transactions require network confirmation. The number of confirmations needed varies by blockchain. You can track your transaction using the transaction hash (TXH) on a blockchain explorer.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Ethereum</p>
                  <p className="text-white font-bold">12 confirmations</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Polygon</p>
                  <p className="text-white font-bold">~5 confirmations</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">BNB Chain</p>
                  <p className="text-white font-bold">15 confirmations</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 mb-16">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              5
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-3">Order Confirmed!</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Once your payment is verified on the blockchain, your order will be confirmed automatically. You'll receive a confirmation email and can track your order status in your account. Processing and shipping will begin immediately!
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-3xl p-8 mb-16">
          <h3 className="text-xl font-bold text-purple-400 mb-6 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Pro Tips
          </h3>
          <div className='text-slate-300 space-y-4'>
            <div className="flex items-start gap-3">
              <span className="text-purple-400">•</span>
              <p>Set a slightly higher gas fee during peak times to ensure faster confirmation</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-400">•</span>
              <p>Keep your transaction hash (TXH) for your records</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-400">•</span>
              <p>Use testnets for testing before making real transactions</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-400">•</span>
              <p>Always verify the network matches between your wallet and the checkout page</p>
            </div>
          </div>
        </div>

        {/* Common Issues */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Common <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Issues</span>
          </h2>
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-6">
              <h4 className="font-bold text-white mb-2">Payment not detected</h4>
              <p className="text-slate-400 text-sm">Wait a few minutes for blockchain confirmation. If still not detected, enter your transaction hash manually.</p>
            </div>
            <div className="border-b border-slate-800 pb-6">
              <h4 className="font-bold text-white mb-2">Sent to wrong network</h4>
              <p className="text-slate-400 text-sm">Contact support immediately. Recovery is not guaranteed but we will try to help.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-2">Insufficient gas</h4>
              <p className="text-slate-400 text-sm">Your transaction may be pending. Wait for it to confirm or cancel and resend with higher gas.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 bg-size-200 hover:bg-pos-0 rounded-2xl text-white font-bold text-lg transition-all duration-500 shadow-xl shadow-cyan-600/25 hover:shadow-cyan-600/40 hover:scale-105"
          >
            Start Shopping
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

