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
      {/* Modern multi-stop gradient background - Static for better performance */}
      <div className="absolute inset-0 bg-gradient-to-br from-mint-50 via-emerald-100 to-teal-200" />
      <div className="absolute inset-0 bg-gradient-to-tr from-teal-100/80 via-mint-200/60 to-emerald-50/90" />
      <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-mint-100/40 to-teal-300/30" />
      
      {/* Simplified static decorative elements - Desktop only */}
      <div className="absolute inset-0 overflow-hidden hidden md:block pointer-events-none">
        {/* Static wave shapes - no animation */}
        <div className="absolute -top-32 -right-64 w-[800px] h-[600px] opacity-10">
          <svg viewBox="0 0 800 600" className="w-full h-full">
            <defs>
              <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#0d9488" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path
              d="M0,300 Q200,200 400,300 T800,300 L800,600 L0,600 Z"
              fill="url(#waveGradient1)"
            />
          </svg>
        </div>
        
        <div className="absolute -bottom-32 -left-64 w-[700px] h-[500px] opacity-8">
          <svg viewBox="0 0 700 500" className="w-full h-full">
            <defs>
              <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path
              d="M0,0 L0,200 Q175,100 350,200 T700,200 L700,0 Z"
              fill="url(#waveGradient2)"
            />
          </svg>
        </div>
        
        {/* Simple static geometric shapes */}
        <div className="absolute top-20 left-1/4 w-24 h-24 opacity-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl transform rotate-45" />
        <div className="absolute bottom-1/4 right-1/3 w-16 h-16 opacity-6 bg-gradient-to-tr from-teal-400 to-cyan-500 rounded-full" />
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
            <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm text-green-600 dark:bg-green-900/30 dark:text-green-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-green-600 italic">Continuing Medical Education Platform</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black">
              {data.title.split(' ').map((word, index) => {
                if (word.toLowerCase() === 'medical' || word.toLowerCase() === 'education') {
                  return (
                    <span key={index} className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {word}{' '}
                    </span>
                  );
                }
                return <span key={index}>{word} </span>;
              })}
            </h1>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-lg">
              {data.subtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link href={data.primary_button_url} passHref>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
                >
                  {data.primary_button_text}
                </motion.button>
              </Link>
              {data.secondary_button_text && data.secondary_button_url && (
                <Link href={data.secondary_button_url} passHref>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 rounded-lg bg-white text-gray-800 font-medium border border-white hover:bg-gray-50 transition-all shadow-lg"
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
            {/* Spotlight glow effect behind image */}
            <div className="absolute inset-0 -m-8">
              <div className="absolute inset-0 bg-gradient-radial from-emerald-200/40 via-teal-100/30 to-transparent rounded-full blur-3xl transform scale-110"></div>
              <div className="absolute inset-0 bg-gradient-radial from-mint-300/30 via-emerald-200/20 to-transparent rounded-full blur-2xl transform scale-125"></div>
            </div>
            
            <div className="relative h-[400px] w-full">
              {/* Subtle backdrop with premium styling */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-teal-500/15 rounded-2xl transform rotate-1 backdrop-blur-sm"></div>
              <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-2xl shadow-emerald-500/10 overflow-hidden backdrop-blur-sm border border-white/20">
                <Image
                  src={data.image_url || "/images/hero-dashboard.png"}
                  alt="CME Platform Dashboard"
                  fill
                  className="object-cover"
                  priority
                />
                {/* Subtle overlay for premium look */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5"></div>
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
