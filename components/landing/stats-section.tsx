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
      const duration = 2000; // 2 seconds for the count animation
      const interval = Math.floor(duration / stat.value);
      
      return setInterval(() => {
        setCounts(prevCounts => {
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
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [isInView]);

  return (
    <section className="py-16 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-6">
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          onViewportEnter={() => setIsInView(true)}
        >
          {data.map((stat, index) => (
            <div key={index} className="p-6">
              <div className="flex justify-center mb-3">
                {stat.icon && (
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                    </svg>
                  </div>
                )}
              </div>
              <div className="mb-2 text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {counts[index].toLocaleString()}{stat.suffix}
              </div>
              <p className="text-gray-600 dark:text-gray-400">{stat.title}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
