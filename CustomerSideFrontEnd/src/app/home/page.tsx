import Link from "next/link";
import { ReactNode } from "react";
import { ShieldCheck, Zap, Wallet, Globe } from "lucide-react";

export default function HomePage() {



  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      
      {/* HERO */}
      <section className="relative flex items-center justify-center text-center px-6 py-32">
        
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black" />
        
        {/* Glow Effect */}
        <div className="absolute top-40 w-[600px] h-[600px] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-20 w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full" />

        <div className="relative z-10 max-w-4xl mx-auto">
          
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
            The Future of Shopping is
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Crypto Powered
            </span>
          </h1>

          <p className="mt-8 text-lg md:text-xl text-gray-400">
            Buy premium products using secure blockchain payments.
            Fast. Transparent. Borderless.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-6">
            <Link
              href="/products"
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 font-semibold text-lg hover:scale-105 transition-all duration-300 shadow-xl shadow-cyan-500/20"
            >
              Start Shopping
            </Link>

            <Link
              href="/how-it-works"
              className="px-10 py-4 rounded-2xl border border-gray-700 hover:border-cyan-400 hover:text-cyan-400 transition-all duration-300 text-lg"
            >
              Learn More
            </Link>
          </div>

          <div className="mt-14 flex flex-wrap justify-center gap-8 text-gray-500 text-sm">
            <span>✔ Secure Smart Contracts</span>
            <span>✔ Instant Transactions</span>
            <span>✔ Global Payments</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6 bg-slate-900/40">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">
            Why Choose Our Marketplace?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<ShieldCheck size={34} />}
              title="Secure Transactions"
              description="Blockchain-backed payments ensure complete transparency and protection."
            />
            <FeatureCard
              icon={<Zap size={34} />}
              title="Lightning Fast"
              description="Instant crypto transactions without traditional banking delays."
            />
            <FeatureCard
              icon={<Wallet size={34} />}
              title="Multi-Wallet Support"
              description="Connect MetaMask and other major wallets."
            />
            <FeatureCard
              icon={<Globe size={34} />}
              title="Borderless Shopping"
              description="Buy globally without currency restrictions."
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900/80 border-t border-slate-800 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/home" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                  CryptoMarket
                </span>
              </Link>
              <p className="text-gray-400 text-sm">
                The future of shopping with cryptocurrency. Fast, secure, and borderless.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/products" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">Products</Link></li>
                <li><Link href="/how-it-works" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">How It Works</Link></li>
                <li><Link href="/faq" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">FAQ</Link></li>
                <li><Link href="/supported-cryptocurrencies" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">Supported Crypto</Link></li>
                <li><Link href="/how-crypto-payments-work" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">How Payments Work</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy-policy" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms-of-service" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">Terms of Service</Link></li>
                <li><Link href="/risk-disclosure" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">Risk Disclosure</Link></li>
                <li><Link href="/refund-policy" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">Refund Policy</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><Link href="/faq" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">Help Center</Link></li>
                <li><Link href="/how-it-works" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">Getting Started</Link></li>
                <li className="text-gray-500 text-sm">Email: support@cryptomarket</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-10 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Crypto Marketplace. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-slate-900/70 border border-gray-800 rounded-2xl p-6 text-center hover:border-cyan-500 transition-all duration-300 hover:scale-105">
      <div className="mb-4 text-cyan-400 flex justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}