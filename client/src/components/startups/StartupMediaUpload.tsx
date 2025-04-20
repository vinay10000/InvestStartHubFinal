import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Image, Video, FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";

interface StartupMediaUploadProps {
  startupId: string;
  onComplete: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function StartupMediaUpload({ startupId, onComplete }: StartupMediaUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Filter files that are too large (>20MB)
    const validFiles = selectedFiles.filter(file => {
      const isValid = file.size <= 20 * 1024 * 1024; // 20MB in bytes
      if (!isValid) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 20MB limit`,
          variant: "destructive",
        });
      }
      return isValid;
    });

    setFiles(validFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploadState('uploading');
    setUploadProgress(0);

    const formData = new FormData();
    
    // Add the startup ID
    formData.append('startupId', startupId);
    
    // Add each file to the form data
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      // Set up a simulated progress interval
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 200);

      // Make the upload request to ImageKit through our backend
      const response = await fetch('/api/imagekit/upload-media', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Upload failed: ' + (await response.text()));
      }

      setUploadProgress(100);
      setUploadState('success');
      
      // Clear the selected files
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Show success toast
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${files.length} file(s)`,
      });

      // Invalidate the startup query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/startups', startupId] });
      
      // Call the onComplete callback
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadState('error');
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileTypeIcon = (file: File) => {
    const type = file.type.split('/')[0];
    
    switch (type) {
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      default:
        return <FileIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Upload Media (Images/Videos)</Label>
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            id="file"
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            disabled={uploadState === 'uploading'}
          />
          <Button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            disabled={uploadState === 'uploading'}
          >
            Browse
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Maximum file size: 20MB. Supported formats: Images (JPG, PNG, GIF) and Videos (MP4, WebM)
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Files</Label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <Card key={index} className="bg-slate-50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFileTypeIcon(file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    disabled={uploadState === 'uploading'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {uploadState === 'uploading' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Uploading...</Label>
            <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button 
          type="button"
          variant="outline"
          onClick={onComplete}
          disabled={uploadState === 'uploading'}
        >
          Cancel
        </Button>
        <Button 
          type="button"
          onClick={handleUpload}
          disabled={files.length === 0 || uploadState === 'uploading'}
        >
          {uploadState === 'uploading' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </>
          )}
        </Button>
      </div>
    </div>
  );
}