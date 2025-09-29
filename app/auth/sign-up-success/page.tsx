'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Page() {
  const [email, setEmail] = useState('');
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100 }
    }
  };
  
  const circleVariants = {
    hidden: { scale: 0 },
    visible: {
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 200, delay: 0.2 }
    }
  };
  
  // Get email from localStorage if available
  useEffect(() => {
    const storedEmail = localStorage.getItem('registrationEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);
  
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-b from-background to-muted/30">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="flex flex-col gap-8">
          <motion.div variants={itemVariants} className="flex justify-center">
            <motion.div
              variants={circleVariants}
              className="rounded-full bg-primary/10 p-6"
            >
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </motion.div>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Card className="border-2 border-primary/10 shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-foreground">
                  Registration Successful!
                </CardTitle>
                <CardDescription className="text-lg mt-2">
                  Your account has been created
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center space-x-2 bg-muted p-4 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {email ? `Verification email sent to ${email}` : 'Please check your email for verification'}
                  </p>
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">
                    Please verify your email address to complete the registration process.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Once verified, you'll be able to access all features of the CME platform.
                  </p>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-3">
                <Button asChild className="w-full">
                  <Link href="/auth/login">
                    Continue to Log In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Didn't receive an email? Check your spam folder or contact support.
                </p>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
