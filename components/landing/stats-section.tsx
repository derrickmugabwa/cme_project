"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const stats = [
  { label: "Medical Professionals", value: 5000, suffix: "+" },
  { label: "Webinars Hosted", value: 1200, suffix: "+" },
  { label: "Certificates Issued", value: 8500, suffix: "+" },
  { label: "Hours of Content", value: 3000, suffix: "+" },
];

export const StatsSection = () => {
  const [isInView, setIsInView] = useState(false);
  const [counts, setCounts] = useState(stats.map(() => 0));

  useEffect(() => {
    if (!isInView) return;

    const intervals = stats.map((stat, index) => {
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
          {stats.map((stat, index) => (
            <div key={index} className="p-6">
              <div className="mb-2 text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {counts[index].toLocaleString()}{stat.suffix}
              </div>
              <p className="text-gray-600 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
