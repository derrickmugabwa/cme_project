'use client'

import { performCompleteLogout } from '@/lib/auth-utils'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const logout = async () => {
    await performCompleteLogout()
  }

  return (
    <div className="flex items-center w-full cursor-pointer" onClick={logout}>
      <div className="h-8 w-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center mr-2">
        <LogOut className="h-4 w-4 text-sidebar-primary" />
      </div>
      <div>
        <span className="font-medium text-gray-800">Sign Out</span>
        <p className="text-xs text-gray-500">Sign out of your account</p>
      </div>
    </div>
  )
}
