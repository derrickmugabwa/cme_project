"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, Coins } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { EnrollmentStatus } from '@/types/units';

interface EnrollButtonProps {
  sessionId: string;
  onEnrollmentChange?: (enrolled: boolean) => void;
}

export default function EnrollButton({ sessionId, onEnrollmentChange }: EnrollButtonProps) {
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollmentStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sessions/${sessionId}/enrollment-status`);
      if (!response.ok) {
        throw new Error('Failed to fetch enrollment status');
      }
      const data = await response.json();
      setEnrollmentStatus(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching enrollment status:', err);
      setError('Failed to check enrollment status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollmentStatus();
  }, [sessionId]);

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      const response = await fetch(`/api/sessions/${sessionId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          // Insufficient units
          toast({
            title: "Insufficient Units",
            description: "You don't have enough units to enroll in this session.",
            variant: "destructive"
          });
        } else if (response.status === 409) {
          // Already enrolled
          toast({
            title: "Already Enrolled",
            description: "You are already enrolled in this session.",
            variant: "default"
          });
        } else {
          // Other error
          toast({
            title: "Enrollment Failed",
            description: data.error || "Failed to enroll in session.",
            variant: "destructive"
          });
        }
        throw new Error(data.error || 'Failed to enroll');
      }

      // Success
      toast({
        title: "Enrollment Successful",
        description: "You have successfully enrolled in this session.",
        variant: "default"
      });

      // Refresh enrollment status
      await fetchEnrollmentStatus();
      
      // Notify parent component if callback provided
      if (onEnrollmentChange) {
        onEnrollmentChange(true);
      }
    } catch (err) {
      console.error('Error enrolling in session:', err);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <Button disabled className="w-full">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Checking enrollment status...
      </Button>
    );
  }

  if (error) {
    return (
      <Button variant="outline" className="w-full text-red-500" onClick={fetchEnrollmentStatus}>
        <AlertCircle className="mr-2 h-4 w-4" />
        {error} - Click to retry
      </Button>
    );
  }

  if (enrollmentStatus?.enrolled) {
    return (
      <Button variant="outline" className="w-full bg-green-50 text-green-700 hover:bg-green-50" disabled>
        <CheckCircle className="mr-2 h-4 w-4" />
        Enrolled
      </Button>
    );
  }

  const hasEnoughUnits = enrollmentStatus?.userUnits >= enrollmentStatus?.unitRequirement;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center">
          <Coins className="mr-1 h-4 w-4 text-primary" />
          <span>Required:</span>
        </div>
        <span className="font-medium">{enrollmentStatus?.unitRequirement} Units</span>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center">
          <Coins className="mr-1 h-4 w-4 text-primary" />
          <span>Your balance:</span>
        </div>
        <span className={`font-medium ${!hasEnoughUnits ? 'text-red-500' : ''}`}>
          {enrollmentStatus?.userUnits} Units
        </span>
      </div>
      
      <Button 
        onClick={handleEnroll} 
        disabled={enrolling || !hasEnoughUnits}
        className="w-full mt-2"
      >
        {enrolling ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enrolling...
          </>
        ) : hasEnoughUnits ? (
          'Enroll Now'
        ) : (
          'Insufficient Units'
        )}
      </Button>
    </div>
  );
}
