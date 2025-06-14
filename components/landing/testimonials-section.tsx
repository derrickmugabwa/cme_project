"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

const testimonials = [
  {
    quote: "This platform has revolutionized how I manage my continuing medical education. The certificate system and attendance tracking make it so easy to keep records of my professional development.",
    name: "Dr. Sarah Johnson",
    title: "Cardiologist",
    avatar: "/images/avatars/avatar-1.png"
  },
  {
    quote: "The webinar quality is exceptional, and the Microsoft Teams integration works flawlessly. I can join sessions with just one click and my attendance is automatically tracked.",
    name: "Dr. Michael Chen",
    title: "Pediatrician",
    avatar: "/images/avatars/avatar-2.png"
  },
  {
    quote: "As a busy surgeon, I appreciate how the platform streamlines the entire CME process. The units system is flexible, and I can easily purchase credits when needed.",
    name: "Dr. Amara Okafor",
    title: "Orthopedic Surgeon",
    avatar: "/images/avatars/avatar-3.png"
  }
];

export const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            What Medical Professionals Say
          </motion.h2>
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto"
          />
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 100 }}
                animate={{ 
                  opacity: activeIndex === index ? 1 : 0,
                  x: activeIndex === index ? 0 : 100,
                  position: activeIndex === index ? "relative" : "absolute"
                }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl"
                style={{ 
                  display: activeIndex === index ? "block" : "none",
                }}
              >
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="relative h-20 w-20 rounded-full overflow-hidden border-4 border-blue-100 dark:border-blue-900 flex-shrink-0">
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <svg className="h-8 w-8 text-blue-400 mb-4" fill="currentColor" viewBox="0 0 32 32">
                      <path d="M10 8c-2.2 0-4 1.8-4 4v10h10V12h-6c0-1.1 0.9-2 2-2h2V8h-4zM22 8c-2.2 0-4 1.8-4 4v10h10V12h-6c0-1.1 0.9-2 2-2h2V8h-4z" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-300 text-lg mb-6 italic">"{testimonial.quote}"</p>
                    <div>
                      <h4 className="font-semibold text-lg">{testimonial.name}</h4>
                      <p className="text-gray-500 dark:text-gray-400">{testimonial.title}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={prevTestimonial}
                className="h-12 w-12 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={nextTestimonial}
                className="h-12 w-12 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </div>

            {/* Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    activeIndex === index 
                      ? "w-8 bg-blue-500" 
                      : "w-2 bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
