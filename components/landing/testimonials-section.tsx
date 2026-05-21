"use client";

import { motion, type Variants } from "framer-motion";
import Image from "next/image";

interface Testimonial {
  id: string;
  name: string;
  title: string;
  quote: string;
  avatar_url: string;
  rating: number;
  order_index: number;
}

interface TestimonialsSectionProps {
  data: Testimonial[];
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-[#008C45]" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export const TestimonialsSection = ({ data }: TestimonialsSectionProps) => {
  // Split into two columns for a masonry-like feel
  const col1 = data.filter((_, i) => i % 2 === 0);
  const col2 = data.filter((_, i) => i % 2 !== 0);

  const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial; delay: number }) => (
    <motion.div
      variants={item}
      className="bg-white rounded-2xl p-7 border border-gray-100
                 hover:shadow-lg hover:shadow-gray-200/70
                 hover:-translate-y-0.5
                 transition-all duration-300 flex flex-col gap-5"
    >
      {/* Top row: stars + large quote */}
      <div className="flex items-start justify-between">
        <StarRating rating={testimonial.rating} />
        <svg
          className="h-8 w-8 text-[#008C45]/15 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 32 32"
        >
          <path d="M10 8c-2.2 0-4 1.8-4 4v10h10V12h-6c0-1.1.9-2 2-2h2V8h-4zM22 8c-2.2 0-4 1.8-4 4v10h10V12h-6c0-1.1.9-2 2-2h2V8h-4z" />
        </svg>
      </div>

      {/* Quote */}
      <p className="text-gray-700 text-[15px] leading-relaxed flex-1">
        "{testimonial.quote}"
      </p>

      {/* Divider */}
      <div className="h-px bg-gray-100" />

      {/* Author */}
      <div className="flex items-center gap-3.5">
        <div className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-[#008C45]/20 flex-shrink-0">
          <Image
            src={testimonial.avatar_url || "/images/avatars/avatar-1.png"}
            alt={testimonial.name}
            fill
            sizes="40px"
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 leading-tight">
            {testimonial.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {testimonial.title}
          </p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <section className="py-24 bg-[#F0F7F3]">
      <div className="container mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-14 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#008C45] mb-3">
            Testimonials
          </p>
          <motion.h2
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight"
          >
            Trusted by medical professionals across Kenya
          </motion.h2>
          <div className="mt-4 w-10 h-[3px] bg-[#008C45] rounded-full" />
        </div>

        {/* Two-column masonry grid */}
        {data.length > 0 && (
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl"
          >
            {/* Column 1 */}
            <div className="flex flex-col gap-5">
              {col1.map((t, i) => (
                <TestimonialCard key={t.id} testimonial={t} delay={i * 0.1} />
              ))}
            </div>
            {/* Column 2 — offset slightly on desktop */}
            <div className="flex flex-col gap-5 md:mt-8">
              {col2.map((t, i) => (
                <TestimonialCard key={t.id} testimonial={t} delay={i * 0.1 + 0.05} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};
