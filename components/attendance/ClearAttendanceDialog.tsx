import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertTriangle } from 'lucide-react';

interface ClearAttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  userId?: string;
  userName?: string;
  sessionTitle: string;
  onSuccess?: () => void;
}

export function ClearAttendanceDialog({
  isOpen,
  onClose,
  sessionId,
  userId,
  userName,
  sessionTitle,
  onSuccess
}: ClearAttendanceDialogProps) {
  const [isClearing, setIsClearing] = useState(false);
  
  const handleClearAttendance = async () => {
    try {
      setIsClearing(true);
      
      const response = await fetch('/api/attendance/clear', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          userId: userId || null
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear attendance records');
      }
      
      toast({
        title: 'Attendance Records Cleared',
        description: `Successfully cleared ${data.result.deleted_attendance_count} attendance records and revoked ${data.result.deleted_certificates_count} certificates.`,
        variant: 'default',
      });
      
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error clearing attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to clear attendance records',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {userId ? 'Clear Individual Attendance' : 'Clear All Attendance Records'}
          </DialogTitle>
          <DialogDescription>
            {userId ? (
              <>
                You are about to delete the attendance record for <strong>{userName}</strong> from the webinar <strong>{sessionTitle}</strong>.
                This will also revoke any certificates issued to this user for this webinar.
              </>
            ) : (
              <>
                You are about to delete <strong>ALL</strong> attendance records for the webinar <strong>{sessionTitle}</strong>.
                This will also revoke all certificates issued for this webinar.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Warning</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    This action cannot be undone. All deleted attendance records and certificates will be permanently removed from the system.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isClearing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleClearAttendance}
            disabled={isClearing}
            className="gap-2"
          >
            {isClearing && <LoadingSpinner size="sm" />}
            {isClearing ? 'Clearing...' : 'Clear Attendance Records'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
