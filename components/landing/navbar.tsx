"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import { Logo } from '@/lib/logo-service';

interface NavItem {
  id: string;
  label: string;
  url: string;
  is_external: boolean;
  order_index: number;
}



interface NavbarProps {
  logo: Logo | null;
}

export const Navbar = ({ logo }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navLinks, setNavLinks] = useState<NavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch navigation items from the database
  useEffect(() => {
    const fetchNavData = async () => {
      try {
        const supabase = createClient();
        
        // Fetch navigation items
        const { data: navItems, error: navError } = await supabase
          .from('landing_navigation')
          .select('*')
          .order('order_index', { ascending: true });
        
        if (navError) throw navError;
        
        // Update state with fetched data
        if (navItems) setNavLinks(navItems);
      } catch (error) {
        console.error('Error fetching navigation data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNavData();
  }, []);

  // Handle scroll event to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "backdrop-blur-md shadow-md py-1"
          : "py-2"
      }`}
      style={{
        backgroundColor: isScrolled ? 'rgba(0, 140, 69, 0.95)' : '#008C45'
      }}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center -ml-4 md:-ml-6">
            <div className="relative h-9 w-44 md:h-11 md:w-52">
              {logo ? (
                <Image
                  src={logo.url}
                  alt={logo.alt_text}
                  fill
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="h-9 w-44 md:h-11 md:w-52 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {isLoading ? (
              // Loading skeleton
              <div className="flex space-x-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-4 w-16 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
                ))}
              </div>
            ) : (
              // Actual navigation items
              navLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.url}
                  target={link.is_external ? "_blank" : undefined}
                  rel={link.is_external ? "noopener noreferrer" : undefined}
                  className="text-sm font-medium text-white hover:text-green-100 transition-colors"
                >
                  {link.label}
                </Link>
              ))
            )}
          </nav>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/auth/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Sign In
              </motion.button>
            </Link>
            <Link href="/auth/sign-up">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-lg bg-white text-green-700 text-sm font-medium shadow-md hover:shadow-lg hover:bg-green-50 transition-all"
              >
                Sign Up
              </motion.button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-4 py-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg"
          >
            <nav className="flex flex-col space-y-4 px-4">
              {isLoading ? (
                // Loading skeleton for mobile
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-4 w-24 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
                  ))}
                </div>
              ) : (
                // Actual navigation items for mobile
                navLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.url}
                    target={link.is_external ? "_blank" : undefined}
                    rel={link.is_external ? "noopener noreferrer" : undefined}
                    className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))
              )}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col space-y-3">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-lg text-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 rounded-lg text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  );
};
