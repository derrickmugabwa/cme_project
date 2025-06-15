"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

interface TabProps {
  href: string;
  label: string;
  isActive: boolean;
}

const Tab = ({ href, label, isActive }: TabProps) => {
  return (
    <Link href={href} className="relative">
      <div
        className={`px-4 py-2 text-sm font-medium rounded-md ${
          isActive
            ? "text-blue-600"
            : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        }`}
      >
        {label}
        {isActive && (
          <motion.div
            layoutId="activeTab"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    </Link>
  );
};

export default function SiteManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard/admin/site", label: "Overview" },
    { href: "/dashboard/admin/site/hero", label: "Hero Section" },
    { href: "/dashboard/admin/site/features", label: "Features" },
    { href: "/dashboard/admin/site/testimonials", label: "Testimonials" },
    { href: "/dashboard/admin/site/stats", label: "Statistics" },
    { href: "/dashboard/admin/site/cta", label: "Call to Action" },
    { href: "/dashboard/admin/site/navbar", label: "Navigation" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Site Management</h1>
        <p className="text-muted-foreground">
          Manage the content displayed on your landing page.
        </p>
      </div>
      
      <div className="border-b">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <Tab
              key={tab.href}
              href={tab.href}
              label={tab.label}
              isActive={
                pathname === tab.href ||
                (tab.href !== "/dashboard/admin/site" &&
                  pathname.startsWith(tab.href))
              }
            />
          ))}
        </div>
      </div>
      
      <div className="space-y-6">{children}</div>
    </div>
  );
}
