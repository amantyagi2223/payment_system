"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <footer className="bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link href="/home" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                CryptoMarket
              </span>
            </Link>
            <p className="mt-4 text-sm text-gray-400 leading-relaxed">
              Your trusted marketplace for crypto payments. Buy and sell products securely with cryptocurrency.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="#" className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-gray-400 hover:bg-cyan-500 hover:text-white transition-all duration-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-gray-400 hover:bg-cyan-500 hover:text-white transition-all duration-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-gray-400 hover:bg-cyan-500 hover:text-white transition-all duration-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/products" 
                  className={`text-sm transition-colors duration-200 ${
                    isActive('/products') 
                      ? 'text-cyan-400 font-medium' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  Products
                </Link>
              </li>
              <li>
                <Link 
                  href="/orders" 
                  className={`text-sm transition-colors duration-200 ${
                    isActive('/orders') 
                      ? 'text-cyan-400 font-medium' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  My Orders
                </Link>
              </li>
              <li>
                <Link 
                  href="/profile" 
                  className={`text-sm transition-colors duration-200 ${
                    isActive('/profile') 
                      ? 'text-cyan-400 font-medium' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  Profile
                </Link>
              </li>
              <li>
                <Link 
                  href="/checkout" 
                  className={`text-sm transition-colors duration-200 ${
                    isActive('/checkout') 
                      ? 'text-cyan-400 font-medium' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  Checkout
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/terms-of-service" 
                  className={`text-sm transition-colors duration-200 ${
                    isActive('/terms-of-service') 
                      ? 'text-cyan-400 font-medium' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy-policy" 
                  className={`text-sm transition-colors duration-200 ${
                    isActive('/privacy-policy') 
                      ? 'text-cyan-400 font-medium' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/risk-disclosure" 
                  className={`text-sm transition-colors duration-200 ${
                    isActive('/risk-disclosure') 
                      ? 'text-cyan-400 font-medium' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  Risk Disclosure
                </Link>
              </li>
              <li>
                <Link 
                  href="/refund-policy" 
                  className={`text-sm transition-colors duration-200 ${
                    isActive('/refund-policy') 
                      ? 'text-cyan-400 font-medium' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Learn */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Learn
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/how-it-works" 
                  className={`text-sm transition-colors duration-200 ${
                    isActive('/how-it-works') 
                      ? 'text-cyan-400 font-medium' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link 
                  href="/faq" 
                  className={`text-sm transition-colors duration-200 ${
                    isActive('/faq') 
                      ? 'text-cyan-400 font-medium' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link 
                  href="/supported-cryptocurrencies" 
                  className={`text-sm transition-colors duration-200 ${
                    isActive('/supported-cryptocurrencies') 
                      ? 'text-cyan-400 font-medium' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  Supported Cryptocurrencies
                </Link>
              </li>
              <li>
                <Link 
                  href="/how-crypto-payments-work" 
                  className={`text-sm transition-colors duration-200 ${
                    isActive('/how-crypto-payments-work') 
                      ? 'text-cyan-400 font-medium' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  How Crypto Payments Work
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} CryptoMarket. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-500">
                🔒 Secure Crypto Payments
              </span>
              <span className="text-sm text-gray-500">
                ⚡ Fast Processing
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

