import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ProfileSidebarProps {
  activeTab: string
  userRole: string
}

export function ProfileSidebar({ activeTab, userRole }: ProfileSidebarProps) {
  const tabs = [
    { id: 'profile', label: 'Profile', href: '/dashboard/profile', roles: ['student', 'faculty', 'admin'] },
    { id: 'account', label: 'Account', href: '/dashboard/profile/account', roles: ['student', 'faculty', 'admin'] },
    { id: 'appearance', label: 'Appearance', href: '/dashboard/profile/appearance', roles: ['student', 'faculty', 'admin'] },
    { id: 'notifications', label: 'Notifications', href: '/dashboard/profile/notifications', roles: ['student', 'faculty', 'admin'] },
    { id: 'display', label: 'Display', href: '/dashboard/profile/display', roles: ['student', 'faculty', 'admin'] },
  ]

  const filteredTabs = tabs.filter(tab => tab.roles.includes(userRole))

  return (
    <div className="bg-background rounded-xl border shadow-sm">
      <nav className="flex flex-col space-y-1 p-2">
        {filteredTabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              activeTab === tab.id
                ? "bg-purple-100 text-purple-900 hover:bg-purple-200"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
