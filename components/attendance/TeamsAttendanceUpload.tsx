import { useState, useRef } from 'react';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  CheckCircle, 
  XCircle, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle 
} from 'lucide-react';

interface TeamsAttendanceUploadProps {
  sessionId: string;
  onUploadComplete?: (data: any) => void;
}

export default function TeamsAttendanceUpload({ 
  sessionId, 
  onUploadComplete 
}: TeamsAttendanceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'text/csv', 
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload a CSV or Excel file.');
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);
      setError(null);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      // Upload file
      const response = await fetch('/api/attendance/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload attendance file');
      }

      const result = await response.json();
      console.log('Upload result:', result);
      setUploadResult(result);
      
      // Show toast notification with summary
      if (result.totalRecords === 0) {
        setError('No records found in the uploaded file');
      } else if (result.errorCount > 0 && result.errorCount === result.totalRecords) {
        setError(`All ${result.totalRecords} records failed. Check if emails match registered users.`);
      } else if (result.errorCount > 0) {
        setError(`${result.successCount} records processed, ${result.errorCount} failed.`);
      }
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadResult(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Upload Teams Attendance</h3>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!uploadResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={isUploading}
                className="flex-1"
              />
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
                <Upload className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {file && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{file.name}</span>
                <span className="text-xs">({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
            
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Uploading and processing...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>
        )}
        
        {uploadResult && (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Upload Complete</AlertTitle>
              <AlertDescription>
                Successfully processed {uploadResult.successful} of {uploadResult.total} records.
                {uploadResult.failed > 0 && (
                  <span className="text-amber-600"> {uploadResult.failed} records had errors.</span>
                )}
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={resetUpload}>
                Upload Another File
              </Button>
            </div>
            
            <div className="mt-4">
              {uploadResult && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Upload Results</h3>
                
                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="text-sm text-green-600 font-medium">Total Records</div>
                    <div className="text-2xl font-bold">{uploadResult.totalRecords || 0}</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="text-sm text-green-600 font-medium">Successful</div>
                    <div className="text-2xl font-bold">{uploadResult.successCount || 0}</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="text-sm text-red-600 font-medium">Failed</div>
                    <div className="text-2xl font-bold">{uploadResult.errorCount || 0}</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="text-sm text-blue-600 font-medium">Upload ID</div>
                    <div className="text-sm font-medium truncate">{uploadResult.uploadId || 'N/A'}</div>
                  </div>
                </div>
                
                {/* Error Details Table */}
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <>
                    <h4 className="text-md font-semibold mb-2">Error Details</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadResult.errors.map((error: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              <XCircle className="h-4 w-4 text-red-500" />
                            </TableCell>
                            <TableCell>{error.name}</TableCell>
                            <TableCell>{error.email}</TableCell>
                            <TableCell>{error.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
                
                {/* No Errors Message */}
                {(!uploadResult.errors || uploadResult.errors.length === 0) && uploadResult.successCount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>All records processed successfully!</span>
                  </div>
                )}
              </div>
            )}</div>
          </div>
        )}
      </div>
    </div>
  );
}
