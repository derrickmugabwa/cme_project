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
    <section className="relative bg-white pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
      {/* Solid left accent column */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#008C45]" />

      {/* Subtle dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(#008C45 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="container relative mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Left copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col gap-7"
          >
            {/* Tag */}
            <div className="inline-flex items-center gap-2 w-fit border border-[#008C45]/30 rounded-full px-4 py-1.5 text-xs font-medium text-[#008C45] bg-[#008C45]/5 tracking-wide uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-[#008C45] animate-pulse" />
              Continuing Medical Education Platform
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-bold leading-[1.08] tracking-tight text-gray-900">
              {data.title.split(" ").map((word, index) => {
                const accent = ["medical", "education"].includes(
                  word.toLowerCase()
                );
                return (
                  <span
                    key={index}
                    className={accent ? "text-[#008C45]" : ""}
                  >
                    {word}{" "}
                  </span>
                );
              })}
            </h1>

            {/* Accent rule */}
            <div className="w-14 h-[3px] bg-[#008C45] rounded-full" />

            <p className="text-base md:text-lg text-gray-500 max-w-[480px] leading-relaxed">
              {data.subtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <Link href={data.primary_button_url} passHref>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-7 py-3 rounded-md bg-[#008C45] text-white text-sm font-semibold shadow-md shadow-[#008C45]/25 hover:bg-[#006E36] transition-colors"
                >
                  {data.primary_button_text}
                </motion.button>
              </Link>
              {data.secondary_button_text && data.secondary_button_url && (
                <Link href={data.secondary_button_url} passHref>
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-7 py-3 rounded-md border border-gray-300 text-gray-700 text-sm font-semibold hover:border-[#008C45] hover:text-[#008C45] transition-colors bg-white"
                  >
                    {data.secondary_button_text}
                  </motion.button>
                </Link>
              )}
            </div>
          </motion.div>

          {/* Right image panel */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            {/* Frame */}
            <div className="relative h-[400px] md:h-[460px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-xl shadow-gray-200/80">
              <Image
                src={data.image_url || "/images/hero-dashboard.png"}
                alt="CME Platform Dashboard"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
              {/* Thin green top bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#008C45]" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
