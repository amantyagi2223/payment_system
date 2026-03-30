"use client";

import Link from "next/link";

export default function RiskDisclosurePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-orange-500/5 via-transparent to-red-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-full text-red-400 text-sm font-medium mb-6 border border-red-500/20">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
            Important Notice
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Risk <span className="bg-gradient-to-r from-red-400 via-orange-500 to-yellow-500 bg-clip-text text-transparent">Disclosure</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Cryptocurrency investments and transactions involve substantial risk. Please read this disclosure carefully.
          </p>
          <p className="text-sm text-slate-500 mt-4">Last updated: January 2025</p>
        </div>

        <div className="bg-red-900/20 border border-red-500/30 rounded-3xl p-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-400 mb-2">Warning: High Risk</h3>
              <p className="text-slate-300">
                Trading and holding cryptocurrencies involves significant risk and may not be suitable for all investors. You could lose your entire investment.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white text-sm font-bold">1</span>
              Market Volatility
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                Cryptocurrency markets are highly volatile. Prices can fluctuate dramatically within short periods. The value of your cryptocurrency can go up or down significantly, and you may not be able to sell your tokens when you want to.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-600 flex items-center justify-center text-white text-sm font-bold">2</span>
              Irreversible Transactions
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                All cryptocurrency transactions are irreversible. Once a transaction is confirmed on the blockchain, it cannot be undone. If you send funds to the wrong address or use the wrong network, your funds may be permanently lost.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-green-600 flex items-center justify-center text-white text-sm font-bold">3</span>
              Technical Risks
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>Cryptocurrency investments are subject to various technical risks including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Smart contract vulnerabilities</li>
                <li>Network congestion and delays</li>
                <li>Wallet security breaches</li>
                <li>Blockchain forks or splits</li>
                <li>Loss of private keys</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">4</span>
              Regulatory Risk
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                Cryptocurrencies and blockchain technologies are subject to regulatory uncertainty. Governments may impose restrictions or bans on cryptocurrency usage, which could affect the value of your holdings or your ability to use the platform.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">5</span>
              Liquidity Risk
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                Some cryptocurrencies may have limited liquidity, making it difficult to buy or sell at desired prices. This is especially true for smaller or newer cryptocurrencies listed on the platform.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold">6</span>
              No Insurance
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                Unlike traditional bank deposits, cryptocurrency holdings are not insured by the FDIC, SIPC, or any other government agency. You are solely responsible for the security of your cryptocurrency holdings.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold">7</span>
              Platform Risk
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                Our platform, like any software, may experience technical issues, downtime, or security breaches. While we implement robust security measures, we cannot guarantee uninterrupted service or complete protection against all threats.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-sm font-bold">8</span>
              Disclaimer
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                The information provided on this platform is for educational purposes only and should not be construed as financial advice. You should consult with a qualified financial advisor before making any investment decisions.
              </p>
              <p>
                By using CryptoMarket, you acknowledge that you have read, understood, and agree to assume all risks associated with cryptocurrency transactions.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-400 mb-6">Invest responsibly. Only invest what you can afford to lose.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/home" className="inline-flex items-center gap-3 px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-white font-bold transition-all duration-500">
              Return Home
            </Link>
            <Link href="/how-it-works" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 rounded-2xl text-white font-bold transition-all duration-500 shadow-xl shadow-cyan-600/25 hover:shadow-cyan-600/40 hover:scale-105">
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

