import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

type DocumentType = 'pitch_deck' | 'financial_report' | 'investor_agreement' | 'risk_disclosure';

interface DocumentUploadProps {
  onUpload: (file: File, documentType: DocumentType) => Promise<void>;
  documentType: DocumentType;
  maxSize?: number; // in MB
  acceptedTypes?: string[]; // e.g. ['.pdf', '.doc', '.docx']
}

// Human-readable document type labels
const documentTypeLabels: Record<DocumentType, string> = {
  'pitch_deck': 'Pitch Deck',
  'financial_report': 'Financial Report',
  'investor_agreement': 'Investor Agreement',
  'risk_disclosure': 'Risk Disclosure'
};

export default function DocumentUpload({ 
  onUpload, 
  documentType, 
  maxSize = 10, // Default 10MB
  acceptedTypes = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx']
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      toast({
        title: "File too large",
        description: `The file exceeds the maximum size of ${maxSize}MB.`,
        variant: "destructive"
      });
      return;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: `Please upload a file with one of these extensions: ${acceptedTypes.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 300);

      await onUpload(selectedFile, documentType);
      
      toast({
        title: "Document uploaded",
        description: `Your ${documentTypeLabels[documentType]} has been uploaded successfully.`,
      });

      // Reset state
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <Card className={`border-2 ${isDragging ? 'border-primary border-dashed' : 'border-gray-200'}`}>
        <CardContent className="p-6">
          {!selectedFile ? (
            <div 
              className="flex flex-col items-center justify-center p-6 cursor-pointer"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept={acceptedTypes.join(',')}
              />
              
              <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
              
              <p className="text-lg font-medium text-center">
                Drag & Drop your {documentTypeLabels[documentType]} here
              </p>
              
              <p className="text-sm text-gray-500 text-center mt-2">
                or click to browse from your computer
              </p>
              
              <p className="text-xs text-gray-400 mt-4 text-center">
                Supported formats: {acceptedTypes.join(', ')} (Max: {maxSize}MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-medium truncate max-w-[150px] sm:max-w-[300px]">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRemoveFile}
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-xs text-gray-500 text-right">{uploadProgress}%</p>
                </div>
              )}
              
              <Button 
                className="w-full" 
                onClick={handleUpload} 
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}