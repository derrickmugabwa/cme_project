"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Stat {
  id: string;
  title: string;
  value: number;
  suffix: string;
  icon: string;
  order_index: number;
}

interface StatsSectionProps {
  data: Stat[];
}

export const StatsSection = ({ data }: StatsSectionProps) => {
  const [isInView, setIsInView] = useState(false);
  const [counts, setCounts] = useState(data.map(() => 0));

  useEffect(() => {
    if (!isInView) return;

    const intervals = data.map((stat, index) => {
      const duration = 2000;
      const interval = Math.floor(duration / stat.value);

      return setInterval(() => {
        setCounts((prevCounts) => {
          const newCounts = [...prevCounts];
          if (newCounts[index] < stat.value) {
            const increment = Math.ceil(stat.value / 50);
            newCounts[index] = Math.min(newCounts[index] + increment, stat.value);
          }
          return newCounts;
        });
      }, interval);
    });

    return () => {
      intervals.forEach((interval) => clearInterval(interval));
    };
  }, [isInView]);

  return (
    <section className="py-0 bg-[#008C45]">
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/20"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          onViewportEnter={() => setIsInView(true)}
        >
          {data.map((stat, index) => (
            <div key={index} className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <span className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                {counts[index].toLocaleString()}
                {stat.suffix}
              </span>
              <p className="mt-2 text-sm font-medium text-white/70 uppercase tracking-wider">
                {stat.title}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
