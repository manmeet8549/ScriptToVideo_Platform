'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-[#fcfcfc] py-20 px-6 max-w-4xl mx-auto space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-black sm:text-5xl">About ScriptForge AI</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            The ultimate automated pipeline to turn your creative and marketing concepts into fully produced video content.
          </p>
        </motion.div>

        <div className="prose prose-neutral max-w-none text-gray-600 leading-relaxed space-y-6">
          <p>
            ThinkNEXT Technologies is a pioneer in intelligent workflow automation. ScriptForge is our flagship platform built for marketing professionals, content creators, and corporate communications teams who need high-quality videos without the overhead of traditional production.
          </p>
          <p>
            By combining advanced AI models for script writing, natural voice generation, and high-fidelity avatars, we reduce video creation time from days to minutes.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
