"use client";

import Link from "next/link";

export default function PrivacyPolicyPage() {
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
            Legal
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Privacy <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">Policy</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
          <p className="text-sm text-slate-500 mt-4">Last updated: January 2025</p>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">1</span>
              Information We Collect
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>We collect that you provide directly information to us, including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Account information (name, email, password)</li>
                <li>Wallet addresses for cryptocurrency transactions</li>
                <li>Order history and transaction details</li>
                <li>Communication preferences</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold">2</span>
              How We Use Your Information
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Process your orders and cryptocurrency payments</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Improve our services and user experience</li>
                <li>Comply with legal obligations</li>
                <li>Send you important updates and notifications</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center text-white text-sm font-bold">3</span>
              Blockchain Information
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                Please note that cryptocurrency transactions are recorded on public blockchains. Wallet addresses and transaction hashes are publicly visible and cannot be deleted or modified. We cannot be held responsible for information that is permanently recorded on the blockchain.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-600 flex items-center justify-center text-white text-sm font-bold">4</span>
              Data Security
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All data is encrypted in transit and at rest.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">5</span>
              Cookies and Tracking
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                We use cookies and similar tracking technologies to enhance your browsing experience. You can control cookies through your browser settings, but disabling them may affect platform functionality.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-sm font-bold">6</span>
              Third-Party Services
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                We may share your information with third-party service providers who assist us in operating the platform, processing payments, and providing services. These parties are obligated to maintain the confidentiality of your information.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">7</span>
              Your Rights
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">8</span>
              Changes to Policy
            </h2>
            <div className='text-slate-400 leading-relaxed space-y-4'>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page. Your continued use of the platform after any changes constitutes acceptance of the new policy.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-400 mb-6">Questions about our privacy practices?</p>
          <Link href="/home" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 rounded-2xl text-white font-bold transition-all duration-500 shadow-xl shadow-cyan-600/25 hover:shadow-cyan-600/40 hover:scale-105">
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

