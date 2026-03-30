"use client";

import Link from "next/link";

const cryptocurrencies = [
  {
    name: "Ethereum",
    symbol: "ETH",
    network: "Ethereum Mainnet",
    icon: "🔷",
    color: "from-blue-500 to-indigo-600",
    description: "The most widely used smart contract platform",
    gasToken: "ETH",
  },
  {
    name: "Polygon",
    symbol: "MATIC",
    network: "Polygon PoS",
    icon: "🔶",
    color: "from-purple-500 to-pink-600",
    description: "Low-fee scaling solution for Ethereum",
    gasToken: "MATIC",
  },
  {
    name: "BNB Chain",
    symbol: "BNB",
    network: "BNB Smart Chain",
    icon: "🟡",
    color: "from-yellow-500 to-orange-600",
    description: "Fast and affordable transactions",
    gasToken: "BNB",
  },
  {
    name: "Arbitrum",
    symbol: "ETH",
    network: "Arbitrum One",
    icon: "🔵",
    color: "from-cyan-500 to-blue-600",
    description: "Layer 2 scaling solution for Ethereum",
    gasToken: "ETH",
  },
  {
    name: "Optimism",
    symbol: "ETH",
    network: "Optimism",
    icon: "🔴",
    color: "from-red-500 to-pink-600",
    description: "Fast and low-cost Layer 2",
    gasToken: "ETH",
  },
  {
    name: "Base",
    symbol: "ETH",
    network: "Base",
    icon: "🔵",
    color: "from-blue-500 to-cyan-600",
    description: "Secure and low-cost L2 by Coinbase",
    gasToken: "ETH",
  },
];

const testnets = [
  { name: "Sepolia Testnet", symbol: "SEP", icon: "🧪" },
  { name: "Polygon Amoy", symbol: "AMOY", icon: "🧪" },
  { name: "BNB Testnet", symbol: "tBNB", icon: "🧪" },
];

export default function SupportedCryptocurrenciesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/5 via-transparent to-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 rounded-full text-cyan-400 text-sm font-medium mb-6 border border-cyan-500/20">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            Payment Options
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Supported <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">Cryptocurrencies</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            We support multiple blockchain networks for maximum flexibility in your crypto payments.
          </p>
        </div>

        {/* Main Cryptocurrencies */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {cryptocurrencies.map((crypto, index) => (
            <div
              key={index}
              className="group bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/10"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${crypto.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {crypto.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {crypto.name}
                  </h3>
                  <span className="inline-block px-2 py-1 bg-slate-800 rounded-lg text-xs font-medium text-slate-300">
                    {crypto.symbol}
                  </span>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-4">{crypto.description}</p>
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Network</span>
                  <span className="text-white font-medium">{crypto.network}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-slate-500">Gas Token</span>
                  <span className="text-white font-medium">{crypto.gasToken}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Testnets */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Testnet <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Networks</span>
          </h2>
          <p className="text-center text-slate-400 mb-6">
            For testing purposes, you can use these testnet networks with test tokens (no real value)
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {testnets.map((testnet, index) => (
              <span
                key={index}
                className="px-6 py-3 bg-slate-800/80 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 rounded-xl text-sm font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-purple-500/30 transition-all duration-300"
              >
                <span className="mr-2">{testnet.icon}</span>
                {testnet.name} ({testnet.symbol})
              </span>
            ))}
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-3xl p-8 mb-16">
          <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Important Information
          </h3>
          <div className='text-slate-300 space-y-3'>
            <p>• Ensure you send only the specified token on each network. Sending incorrect tokens may result in permanent loss.</p>
            <p>• Network fees (gas) are paid in the native token of each network.</p>
            <p>• Always double-check the network selected in your wallet before sending.</p>
            <p>• Transaction times vary by network congestion.</p>
          </div>
        </div>

        {/* How to Add Custom Token */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            How to Add <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Tokens to Wallet</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">1</div>
              <h4 className="font-bold text-white mb-2">Open Wallet</h4>
              <p className="text-slate-400 text-sm">Open your crypto wallet (MetaMask, Trust Wallet, etc.)</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg">2</div>
              <h4 className="font-bold text-white mb-2">Add Token</h4>
              <p className="text-slate-400 text-sm">Go to "Add Token" or "Import" and enter the token contract address</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center text-white font-bold text-lg">3</div>
              <h4 className="font-bold text-white mb-2">Confirm</h4>
              <p className="text-slate-400 text-sm">Confirm the token details and start using</p>
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

