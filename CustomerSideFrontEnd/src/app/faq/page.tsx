"use client";

import { useState } from "react";
import Link from "next/link";

const faqs = [
  {
    question: "How do I pay with cryptocurrency?",
    answer: "Simply browse our products, add items to your cart, and proceed to checkout. Select your preferred blockchain network, then send the specified amount of cryptocurrency to the wallet address shown. Once the transaction is confirmed on the blockchain, your order will be processed automatically.",
  },
  {
    question: "Which cryptocurrencies do you accept?",
    answer: "We accept ETH on Ethereum, Polygon, BNB Chain, Arbitrum, Optimism, and Base networks. The native token of each network is used for payments. You can also use testnets like Sepolia, Polygon Amoy, and BNB Testnet for testing.",
  },
  {
    question: "How long does payment verification take?",
    answer: "Verification time varies by network. Ethereum typically takes 5-15 minutes, Polygon 1-5 minutes, and BNB Chain 5-10 minutes. The number of required confirmations differs per blockchain.",
  },
  {
    question: "Can I get a refund?",
    answer: "Due to the irreversible nature of cryptocurrency transactions, refunds are handled on a case-by-case basis. Please refer to our Refund Policy for details. Contact our support team with your order details if you need assistance.",
  },
  {
    question: "What if I sent crypto to the wrong address?",
    answer: "Cryptocurrency transactions are irreversible. If you send funds to an incorrect address or wrong network, the funds may be lost permanently. Please always double-check the wallet address and network before sending.",
  },
  {
    question: "How do I track my order?",
    answer: "Once your payment is confirmed, you can track your order status in your account under 'My Orders'. You'll also receive email updates about your order progress.",
  },
  {
    question: "What happens if the crypto price changes while I'm checking out?",
    answer: "The crypto equivalent is locked when you reach the checkout page. The price is valid for a limited time (typically 10-15 minutes). If the order expires, you'll need to check out again for the updated price.",
  },
  {
    question: "Do I need a crypto wallet?",
    answer: "Yes, you'll need a cryptocurrency wallet like MetaMask, Trust Wallet, or Coinbase Wallet to make payments. The wallet must be connected to one of our supported networks.",
  },
  {
    question: "Are my transactions private?",
    answer: "While blockchain transactions are pseudonymous (not tied to your identity directly), wallet addresses are publicly visible. For more information, please read our Privacy Policy.",
  },
  {
    question: "How do I contact support?",
    answer: "You can reach our support team through the contact information provided on our website. Please include your order ID and transaction hash (TXH) when contacting us about payment issues.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
            Help
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Frequently Asked <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">Questions</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Find answers to the most common questions about shopping with cryptocurrency.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-800/30 transition-colors"
              >
                <span className="font-semibold text-white pr-4">{faq.question}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 text-cyan-400 flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="px-6 pb-6 text-slate-400 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-16 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-500/20 rounded-3xl p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Still Have Questions?</h2>
          <p className="text-slate-400 mb-6">Can't find the answer you're looking for? We're here to help.</p>
          <Link
            href="/home"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 rounded-2xl text-white font-bold transition-all duration-500 shadow-xl shadow-cyan-600/25 hover:shadow-cyan-600/40 hover:scale-105"
          >
            Contact Us
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Link href="/how-it-works" className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 text-center hover:border-cyan-500/30 transition-colors group">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📖
            </div>
            <h3 className="font-bold text-white mb-2">How It Works</h3>
            <p className="text-slate-400 text-sm">Learn about our crypto payment process</p>
          </Link>
          <Link href="/supported-cryptocurrencies" className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 text-center hover:border-purple-500/30 transition-colors group">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🪙
            </div>
            <h3 className="font-bold text-white mb-2">Supported Crypto</h3>
            <p className="text-slate-400 text-sm">View all accepted cryptocurrencies</p>
          </Link>
          <Link href="/refund-policy" className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 text-center hover:border-pink-500/30 transition-colors group">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              💰
            </div>
            <h3 className="font-bold text-white mb-2">Refund Policy</h3>
            <p className="text-slate-400 text-sm">Understand our refund process</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

