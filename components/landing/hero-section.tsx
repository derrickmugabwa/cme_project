"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface HeroContent {
  title: string;
  subtitle: string;
  primary_button_text: string;
  primary_button_url: string;
  secondary_button_text: string | null;
  secondary_button_url: string | null;
  image_url: string | null;
}

interface HeroSectionProps {
  data: HeroContent;
}

export const HeroSection = ({ data }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20" />
      
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl"
          animate={{ 
            x: [0, 10, 0], 
            y: [0, 15, 0],
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 8,
            ease: "easeInOut" 
          }}
        />
        <motion.div 
          className="absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-gradient-to-r from-cyan-500/20 to-teal-500/20 blur-3xl"
          animate={{ 
            x: [0, -10, 0], 
            y: [0, -15, 0],
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 10,
            ease: "easeInOut" 
          }}
        />
      </div>

      <div className="container relative mx-auto px-6 z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Hero content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Continuing Medical Education Platform
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
              {data.title}
            </h1>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-lg">
              {data.subtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link href={data.primary_button_url} passHref>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                >
                  {data.primary_button_text}
                </motion.button>
              </Link>
              {data.secondary_button_text && data.secondary_button_url && (
                <Link href={data.secondary_button_url} passHref>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    {data.secondary_button_text}
                  </motion.button>
                </Link>
              )}
            </div>
          </motion.div>
          
          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative h-[400px] w-full">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-2xl transform rotate-3"></div>
              <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                <Image
                  src={data.image_url || "/images/hero-dashboard.png"}
                  alt="CME Platform Dashboard"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            
            {/* Floating badges */}
            <motion.div 
              className="absolute -top-6 -right-6 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Certificate Earned</p>
                  <p className="text-sm font-medium">Medical Ethics</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming Webinar</p>
                  <p className="text-sm font-medium">In 2 hours</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
