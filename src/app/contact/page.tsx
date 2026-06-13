'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-[#fcfcfc] py-20 px-6 max-w-xl mx-auto w-full space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-black sm:text-5xl">Contact Our Team</h1>
          <p className="text-lg text-gray-500 max-w-md mx-auto">
            Have questions about ScriptForge Enterprise or need custom features? Drop us a line.
          </p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 bg-emerald-50 border border-emerald-100 rounded-3xl text-center space-y-3"
          >
            <h3 className="text-lg font-bold text-emerald-800">Message Received!</h3>
            <p className="text-sm text-emerald-600">
              Thank you for reaching out. A platform representative will get in touch with you shortly.
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl shadow-neutral-100/50 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Full Name</label>
              <input
                type="text"
                required
                className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Email Address</label>
              <input
                type="email"
                required
                className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                placeholder="jane@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Message</label>
              <textarea
                required
                rows={4}
                className="flex w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                placeholder="Tell us about your production needs..."
              />
            </div>
            <button
              type="submit"
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-black text-white hover:bg-neutral-800 font-semibold text-sm transition-all"
            >
              Send Message
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
