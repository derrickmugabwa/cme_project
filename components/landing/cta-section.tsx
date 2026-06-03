"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface CtaContent {
  id: string;
  title: string;
  subtitle: string;
  primary_button_text: string;
  primary_button_url: string;
  secondary_button_text: string | null;
  secondary_button_url: string | null;
  background_image_url: string | null;
  additional_notes: string | null;
}

interface CtaSectionProps {
  data: CtaContent;
}

const ABSOLUTE_OR_SPECIAL_URL_PATTERN = /^(https?:\/\/|mailto:|tel:)/i;

function getCtaHref(url: string) {
  const trimmedUrl = url.trim();

  if (
    !trimmedUrl ||
    trimmedUrl.startsWith("/") ||
    trimmedUrl.startsWith("#") ||
    ABSOLUTE_OR_SPECIAL_URL_PATTERN.test(trimmedUrl)
  ) {
    return trimmedUrl || "#";
  }

  return `https://${trimmedUrl}`;
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

export const CtaSection = ({ data }: CtaSectionProps) => {
  const primaryHref = getCtaHref(data.primary_button_url);
  const secondaryHref = data.secondary_button_url
    ? getCtaHref(data.secondary_button_url)
    : null;
  const primaryIsExternal = isExternalHref(primaryHref);
  const secondaryIsExternal = secondaryHref ? isExternalHref(secondaryHref) : false;

  return (
    <section className="py-24 bg-[#008C45] relative overflow-hidden">
      {/* Subtle geometric accent — top-right corner block */}
      <div className="absolute top-0 right-0 w-72 h-72 border-[40px] border-white/5 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 border-[28px] border-white/5 rounded-full -translate-x-1/2 translate-y-1/3 pointer-events-none" />

      <div className="container relative mx-auto px-6 lg:px-12 z-10">
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-4"
          >
            Get Started Today
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5"
          >
            {data.title}
          </motion.h2>

          <div className="w-10 h-[3px] bg-white/40 rounded-full mb-7" />

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base md:text-lg text-white/75 max-w-xl leading-relaxed mb-10"
          >
            {data.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link
              href={primaryHref}
              target={primaryIsExternal ? "_blank" : undefined}
              rel={primaryIsExternal ? "noopener noreferrer" : undefined}
              passHref
            >
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-3.5 rounded-md bg-white text-[#008C45] font-semibold text-sm shadow-md hover:bg-gray-50 transition-colors"
              >
                {data.primary_button_text}
              </motion.button>
            </Link>
            {data.secondary_button_text && secondaryHref && (
              <Link
                href={secondaryHref}
                target={secondaryIsExternal ? "_blank" : undefined}
                rel={secondaryIsExternal ? "noopener noreferrer" : undefined}
                passHref
              >
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-3.5 rounded-md border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
                >
                  {data.secondary_button_text}
                </motion.button>
              </Link>
            )}
          </motion.div>

          {data.additional_notes && (
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-6 text-xs text-white/50"
            >
              {data.additional_notes}
            </motion.p>
          )}
        </div>
      </div>
    </section>
  );
};
