"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export const CtaSection = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600" />
      
      {/* Animated background shapes */}
      <motion.div 
        className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        animate={{ 
          x: [0, 20, 0], 
          y: [0, 30, 0],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 12,
          ease: "easeInOut" 
        }}
      />
      <motion.div 
        className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        animate={{ 
          x: [0, -20, 0], 
          y: [0, -30, 0],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 10,
          ease: "easeInOut" 
        }}
      />
      
      <div className="container relative mx-auto px-6 z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold mb-6 text-white"
          >
            Ready to Transform Your Medical Education Experience?
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-white/80 mb-10 max-w-2xl mx-auto"
          >
            Join thousands of medical professionals who are already using our platform to streamline their continuing education journey.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/auth/sign-up" passHref>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-lg bg-white text-blue-600 font-medium shadow-lg shadow-blue-700/25 hover:shadow-blue-700/40 transition-all"
              >
                Get Started for Free
              </motion.button>
            </Link>
            <Link href="/contact" passHref>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-lg border border-white/30 text-white font-medium hover:bg-white/10 transition-all"
              >
                Contact Sales
              </motion.button>
            </Link>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 text-white/70 text-sm"
          >
            No credit card required • Free trial available • Cancel anytime
          </motion.div>
        </div>
      </div>
    </section>
  );
};
