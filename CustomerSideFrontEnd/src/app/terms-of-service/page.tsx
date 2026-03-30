"use client";

import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/5 via-transparent to-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 rounded-full text-cyan-400 text-sm font-medium mb-6 border border-cyan-500/20">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            Legal
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Terms of <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">Service</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Please read these terms carefully before using our crypto marketplace platform.
          </p>
          <p className="text-sm text-slate-500 mt-4">Last updated: January 2025</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Section 1 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">1</span>
              Acceptance of Terms
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                By accessing and using CryptoMarket (the "Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, you should not use our services.
              </p>
              <p>
                These Terms of Service constitute a legally binding agreement between you ("User," "you," or "your") and CryptoMarket ("we," "us," or "our").
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold">2</span>
              Description of Service
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                CryptoMarket is an e-commerce platform that enables users to purchase products using cryptocurrency. We support multiple blockchain networks including Ethereum, Polygon, BNB Chain, Arbitrum, Optimism, and Base.
              </p>
              <p>
                Our platform facilitates transactions between buyers and sellers, providing a secure escrow-like mechanism where payments are verified through blockchain confirmation before orders are processed.
              </p>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center text-white text-sm font-bold">3</span>
              User Responsibilities
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>As a user of CryptoMarket, you agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your wallet and account credentials</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not engage in any illegal or prohibited activities</li>
                <li>Not attempt to hack, reverse engineer, or compromise the platform</li>
                <li>Verify all transaction details before confirming payments</li>
              </ul>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-600 flex items-center justify-center text-white text-sm font-bold">4</span>
              Cryptocurrency Transactions
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                All cryptocurrency transactions are irreversible once confirmed on the blockchain. We cannot reverse, cancel, or refund crypto transactions once they have been broadcast to the network.
              </p>
              <p>
                You are responsible for ensuring the accuracy of the wallet address and network selected before sending any cryptocurrency. Transactions sent to incorrect addresses or wrong networks may result in permanent loss of funds.
              </p>
            </div>
          </div>

          {/* Section 5 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">5</span>
              Intellectual Property
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                All content, designs, logos, and materials on CryptoMarket are the intellectual property of CryptoMarket or its licensors. You may not copy, reproduce, distribute, or create derivative works without our prior written consent.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-sm font-bold">6</span>
              Limitation of Liability
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                CryptoMarket shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the platform.
              </p>
              <p>
                We do not guarantee the accuracy, completeness, or timeliness of any information on the platform. Cryptocurrencies are highly volatile, and we are not responsible for any financial losses.
              </p>
            </div>
          </div>

          {/* Section 7 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">7</span>
              Governing Law
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                These Terms of Service shall be governed by and construed in accordance with applicable laws. Any disputes arising from these terms shall be resolved through binding arbitration.
              </p>
            </div>
          </div>

          {/* Section 8 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">8</span>
              Changes to Terms
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                We reserve the right to modify these Terms of Service at any time. Any changes will be effective immediately upon posting on this page. Your continued use of the platform after any changes constitutes acceptance of the new terms.
              </p>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center">
          <p className="text-slate-400 mb-6">Have questions about our terms?</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 bg-size-200 hover:bg-pos-0 rounded-2xl text-white font-bold transition-all duration-500 shadow-xl shadow-cyan-600/25 hover:shadow-cyan-600/40 hover:scale-105"
          >
          </Link>
            Contact Us
        </div>
      </div>
    </div>
  );
}

