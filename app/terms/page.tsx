'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Terms and Conditions</CardTitle>
          <CardDescription>Last updated: May 30, 2025</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
            <p className="text-muted-foreground">
              Welcome to the CME Platform. These terms and conditions outline the rules and regulations for the use of our platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">2. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using our platform, you agree to be bound by these terms and conditions. If you disagree with any part of these terms, you may not access the platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">3. User Registration</h2>
            <p className="text-muted-foreground">
              To use certain features of the platform, you must register and provide accurate professional information. You are responsible for maintaining the confidentiality of your account information.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">4. Professional Conduct</h2>
            <p className="text-muted-foreground">
              As a medical professional using this platform, you agree to maintain professional standards and ethics in all interactions and content shared through the platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">5. Content Usage</h2>
            <p className="text-muted-foreground">
              Educational content provided through the platform is for professional development purposes only. Unauthorized distribution or reproduction of content is prohibited.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">6. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. Your continued use of the platform following any changes constitutes acceptance of those changes.
            </p>
          </div>

          <div className="pt-4">
            <Link href="/auth/sign-up">
              <Button>Back to Sign Up</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
