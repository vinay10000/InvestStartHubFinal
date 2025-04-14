import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { uploadFile } from '@/services/imagekit';

export default function NotFoundPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setUploadedUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    
    try {
      // Test the ImageKit upload function
      const url = await uploadFile(file, 'test-uploads');
      setUploadedUrl(url);
      console.log('File uploaded successfully:', url);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('File upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ImageKit Upload Test</CardTitle>
          <CardDescription>
            Test the migration from Firebase Storage to ImageKit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <label htmlFor="file" className="text-sm font-medium leading-none">
              Select a file to upload
            </label>
            <Input 
              id="file" 
              type="file" 
              onChange={handleFileChange} 
              disabled={isUploading}
            />
            {file && (
              <p className="text-sm text-gray-500">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {uploadedUrl && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Upload Successful!</h3>
              <div className="overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                <p className="text-xs break-all">{uploadedUrl}</p>
              </div>
              <div className="mt-2">
                <a
                  href={uploadedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Uploaded File
                </a>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload to ImageKit'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}