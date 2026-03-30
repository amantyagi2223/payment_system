"use client";

import Link from "next/link";

export default function RefundPolicyPage() {
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
            Policy
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Refund <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">Policy</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Our refund policy for cryptocurrency transactions. Please read carefully.
          </p>
          <p className="text-sm text-slate-500 mt-4">Last updated: January 2025</p>
        </div>

        {/* Important Notice */}
        <div className="bg-orange-900/20 border border-orange-500/30 rounded-3xl p-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-orange-400 mb-2">Important Notice</h3>
              <p className="text-slate-300 leading-relaxed">
                Cryptocurrency transactions are irreversible by design. Once a transaction is confirmed on the blockchain, it cannot be reversed, cancelled, or refunded through traditional means. Please read this policy carefully before making any purchase.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Section 1 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">1</span>
              No Automatic Refunds
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                Due to the irreversible nature of cryptocurrency transactions, we do not offer automatic refunds. All cryptocurrency payments are considered final once confirmed on the blockchain.
              </p>
              <p>
                When you send cryptocurrency to complete a purchase, the transaction is recorded on the public blockchain and cannot be reversed by any party, including us, your wallet provider, or the blockchain networks.
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold">2</span>
              Case-by-Case Assistance
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                While we cannot process refunds through the blockchain, we may be able to assist on a case-by-case basis in exceptional circumstances. Each request will be reviewed by our team.
              </p>
              <p>
                To request consideration for a refund or issue resolution, you must contact our support team within 7 days of your purchase with your order ID and transaction details.
              </p>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center text-white text-sm font-bold">3</span>
              Eligible Situations
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>We may consider refunds in the following exceptional circumstances:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Duplicate charges due to technical error on our part</li>
                <li>Product not as described and unable to resolve with seller</li>
                <li>Verified technical failure preventing order fulfillment</li>
                <li>Legal requirements mandating refund</li>
              </ul>
              <p className="mt-4">
                Note: Price fluctuations in cryptocurrency do not qualify as grounds for refund. The exchange rate at the time of transaction is final.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-600 flex items-center justify-center text-white text-sm font-bold">4</span>
              Non-Refundable Situations
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>The following situations are not eligible for refunds:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Change of mind after purchase</li>
                <li>Incorrect wallet address provided by buyer</li>
                <li>Wrong network selected (e.g., sending ETH to a BTC address)</li>
                <li>Sent insufficient gas fees resulting in failed transaction</li>
                <li>Sent funds before order creation</li>
                <li>Price changes between order creation and payment</li>
                <li>Scams or fraudulent activities</li>
              </ul>
            </div>
          </div>

          {/* Section 5 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">5</span>
              How to Request Assistance
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                If you believe you qualify for exceptional consideration, please contact our support team with:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your order ID (found in your account or confirmation)</li>
                <li>Transaction hash (TXH) of the cryptocurrency payment</li>
                <li>Email address used for the order</li>
                <li>Detailed description of the issue</li>
              </ul>
              <p className="mt-4">
                Our team will review your request within 5-7 business days. We reserve the right to deny any request that does not meet our eligibility criteria.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-sm font-bold">6</span>
              Chargebacks and Disputes
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                We do not accept chargebacks for cryptocurrency transactions. Initiating a chargeback with your bank or credit card company after sending cryptocurrency may result in:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Permanent suspension of your account</li>
                <li>Loss of access to all services</li>
                <li>Legal action for fraudulent activity</li>
              </ul>
              <p className="mt-4">
                All disputes should be resolved directly through our support team before considering any chargeback options.
              </p>
            </div>
          </div>
        </div>

        {/* Prevention Tips */}
        <div className="mt-12 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-500/20 rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">How to Protect Yourself</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">Double-Check Address</h3>
                <p className="text-slate-400 text-sm">Always verify the wallet address before sending. Even one wrong character means funds are lost forever.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">Verify Network</h3>
                <p className="text-slate-400 text-sm">Ensure you are sending on the correct network. Cross-chain transfers typically result in permanent loss.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">Test with Small Amount</h3>
                <p className="text-slate-400 text-sm">For first-time transactions, send a small test amount before making the full payment.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">Check Order Details</h3>
                <p className="text-slate-400 text-sm">Review your order carefully before initiating payment. Amounts and product details are final once confirmed.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center">
          <p className="text-slate-400 mb-6">Have questions about our refund policy?</p>
          <Link
            href="/home"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 rounded-2xl text-white font-bold transition-all duration-500 shadow-xl shadow-cyan-600/25 hover:shadow-cyan-600/40 hover:scale-105"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

