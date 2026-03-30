"use client";

import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Browse Products",
    description: "Explore our wide range of products with detailed images and videos. Find exactly what you're looking for.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    number: "02",
    title: "Add to Cart & Checkout",
    description: "Select your desired product and proceed to checkout. Review your order details and select your preferred blockchain network.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    gradient: "from-purple-500 to-pink-500",
  },
  {
    number: "03",
    title: "Connect Wallet",
    description: "Scan the QR code with your crypto wallet or copy the wallet address to send the payment. We support multiple blockchain networks.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    gradient: "from-green-500 to-emerald-500",
  },
  {
    number: "04",
    title: "Verify Payment",
    description: "Once you send the crypto, enter your transaction hash or wait for automatic detection. Your order is confirmed upon blockchain verification.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: "from-orange-500 to-red-500",
  },
];

const features = [
  {
    title: "Secure Transactions",
    description: "All payments are secured by blockchain technology. Your funds are held in escrow until verification.",
    icon: "🔒",
    gradient: "from-green-500 to-emerald-600",
  },
  {
    title: "Multiple Blockchains",
    description: "Support for Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, and testnets.",
    icon: "🌐",
    gradient: "from-blue-500 to-purple-600",
  },
  {
    title: "Instant Verification",
    description: "Automatic payment detection and verification using public blockchain explorers.",
    icon: "⚡",
    gradient: "from-yellow-500 to-orange-600",
  },
  {
    title: "Low Fees",
    description: "Minimal transaction fees compared to traditional payment gateways.",
    icon: "💰",
    gradient: "from-purple-500 to-pink-600",
  },
];

const networks = ["Ethereum", "Polygon", "BNB Chain", "Arbitrum", "Optimism", "Base", "Sepolia (Testnet)"];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/5 via-transparent to-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/5 blur-[100px] rounded-full"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 rounded-full text-cyan-400 text-sm font-medium mb-6 border border-cyan-500/20">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            Getting Started
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            How It <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">Works</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Purchase products using cryptocurrency in four simple steps. Secure, fast, and transparent.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 gap-6 mb-24">
          {steps.map((step, index) => (
            <div
              key={index}
              className="group relative bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/10"
            >
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative">
                <div className="flex items-start gap-5">
                  <div className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white shadow-lg`}>
                    {step.icon}
                  </div>
                  <div className="flex-1 pt-2">
                    <span className="text-6xl font-bold text-slate-800 absolute -top-4 -right-2 opacity-30 group-hover:opacity-50 transition-opacity">
                      {step.number}
                    </span>
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute -bottom-8 left-1/2 -translate-x-1/2 w-px h-8 bg-gradient-to-b from-cyan-500/50 to-transparent"></div>
              )}
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Use <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Crypto Payments</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 text-center hover:border-slate-700 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="font-bold text-lg text-white mb-2 group-hover:text-cyan-400 transition-colors">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Supported Networks */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">
            Supported <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Blockchains</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {networks.map((network, index) => (
              <span
                key={network}
                className="px-5 py-2.5 bg-slate-800/80 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-purple-500/20 rounded-full text-sm font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-cyan-500/30 transition-all duration-300 cursor-default"
              >
                {network}
              </span>
            ))}
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

        {/* Trust Badges */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 opacity-60">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            SSL Secured
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Smart Contract Protected
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            24/7 Support
          </div>
        </div>
      </div>
    </div>
  );
}

