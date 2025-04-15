import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Check, 
  Upload, 
  X, 
  FileText, 
  BarChart2, 
  FileCheck, 
  AlertTriangle,
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDocuments } from '@/hooks/useDocuments';
import type { DocumentType } from '@/hooks/useDocuments';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StartupDocumentUploadProps {
  startupId: number | string | undefined;
  onComplete?: () => void;
}

export default function StartupDocumentUpload({ startupId, onComplete }: StartupDocumentUploadProps) {
  const { isUploading, uploadDocumentFile, getDocumentsByStartupId } = useDocuments();
  const { data: documentsData } = getDocumentsByStartupId(startupId);
  
  const documents = documentsData?.documents || [];
  
  const [uploadProgress, setUploadProgress] = useState<Record<DocumentType, number>>({
    pitch_deck: 0,
    financial_report: 0,
    investor_agreement: 0,
    risk_disclosure: 0
  });
  
  const [uploadStatus, setUploadStatus] = useState<Record<DocumentType, 'idle' | 'uploading' | 'success' | 'error'>>({
    pitch_deck: 'idle',
    financial_report: 'idle',
    investor_agreement: 'idle',
    risk_disclosure: 'idle'
  });
  
  const [uploadError, setUploadError] = useState<Record<DocumentType, string | null>>({
    pitch_deck: null,
    financial_report: null,
    investor_agreement: null,
    risk_disclosure: null
  });

  // Check if document of a specific type already exists
  const documentExists = (type: DocumentType): boolean => {
    if (!documents || !Array.isArray(documents)) return false;
    return documents.some((doc: { type: string }) => doc.type === type);
  };

  // Handle document upload
  const handleUpload = async (file: File, documentType: DocumentType) => {
    if (!file) return;
    
    try {
      setUploadStatus(prev => ({ ...prev, [documentType]: 'uploading' }));
      setUploadProgress(prev => ({ ...prev, [documentType]: 10 }));
      setUploadError(prev => ({ ...prev, [documentType]: null }));
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[documentType];
          if (currentProgress < 90) {
            return { ...prev, [documentType]: currentProgress + 10 };
          }
          return prev;
        });
      }, 300);
      
      await uploadDocumentFile({
        startupId,
        documentType,
        file,
        name: getDocumentTypeLabel(documentType)
      });
      
      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [documentType]: 100 }));
      setUploadStatus(prev => ({ ...prev, [documentType]: 'success' }));
      
      // Reset status after a delay
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 1500);
      
    } catch (error) {
      setUploadStatus(prev => ({ ...prev, [documentType]: 'error' }));
      setUploadError(prev => ({ 
        ...prev, 
        [documentType]: error instanceof Error ? error.message : 'Failed to upload document' 
      }));
    }
  };

  // Get human-readable label for document type
  const getDocumentTypeLabel = (type: DocumentType): string => {
    switch (type) {
      case 'pitch_deck':
        return 'Pitch Deck';
      case 'financial_report':
        return 'Financial Report';
      case 'investor_agreement':
        return 'Investor Agreement';
      case 'risk_disclosure':
        return 'Risk Disclosure';
      default:
        return type;
    }
  };

  // Get accepted file types for specific document types
  const getDocumentAcceptedTypes = (type: DocumentType): string[] => {
    switch (type) {
      case 'pitch_deck':
        return ['.pdf', '.ppt', '.pptx'];
      case 'financial_report':
        return ['.pdf', '.xlsx', '.xls', '.csv'];
      case 'investor_agreement':
        return ['.pdf', '.doc', '.docx'];
      case 'risk_disclosure':
        return ['.pdf', '.doc', '.docx'];
      default:
        return ['.pdf'];
    }
  };

  // Get description for document types
  const getDocumentDescription = (type: DocumentType): string => {
    switch (type) {
      case 'pitch_deck':
        return 'Upload your pitch presentation (PDF, PowerPoint)';
      case 'financial_report':
        return 'Upload financial projections and reports (PDF, Excel, CSV)';
      case 'investor_agreement':
        return 'Upload investor term sheet or agreement (PDF, Word)';
      case 'risk_disclosure':
        return 'Upload risk disclosure document (PDF, Word)';
      default:
        return 'Upload document';
    }
  };

  // Get icon for document types
  const getDocumentIcon = (type: DocumentType) => {
    switch (type) {
      case 'pitch_deck':
        return <FileText className="w-5 h-5" />;
      case 'financial_report':
        return <BarChart2 className="w-5 h-5" />;
      case 'investor_agreement':
        return <FileCheck className="w-5 h-5" />;
      case 'risk_disclosure':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  // Create dropzone for each document type
  const DocumentDropzone = ({ type }: { type: DocumentType }) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0], type);
      }
    }, [type]);

    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
      accept: getDocumentAcceptedTypes(type).reduce((acc, ext) => {
        if (ext === '.pdf') acc['application/pdf'] = [];
        if (['.doc', '.docx'].includes(ext)) acc['application/msword'] = [];
        if (['.ppt', '.pptx'].includes(ext)) acc['application/vnd.ms-powerpoint'] = [];
        if (['.xls', '.xlsx'].includes(ext)) acc['application/vnd.ms-excel'] = [];
        if (ext === '.csv') acc['text/csv'] = [];
        return acc;
      }, {} as Record<string, string[]>),
      maxFiles: 1,
      onDrop,
      disabled: uploadStatus[type] === 'uploading' || uploadStatus[type] === 'success' || documentExists(type)
    });

    const isError = fileRejections.length > 0 || uploadStatus[type] === 'error';
    const errorMessage = fileRejections.length > 0
      ? 'Invalid file type. Please upload the correct format.'
      : uploadError[type];

    const exists = documentExists(type);

    return (
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <div className="mr-2">
            {getDocumentIcon(type)}
          </div>
          <h3 className="text-lg font-medium">{getDocumentTypeLabel(type)}</h3>
          {exists && (
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-600 border-green-200">
              <Check className="w-3 h-3 mr-1" /> Uploaded
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-3">{getDocumentDescription(type)}</p>
        
        {exists ? (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700">Document already uploaded</AlertTitle>
            <AlertDescription className="text-green-600">
              This document has already been uploaded. You can view it in the documents section.
            </AlertDescription>
          </Alert>
        ) : (
          <div>
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
                ${isError ? 'border-red-300 bg-red-50' : ''}
                ${uploadStatus[type] === 'uploading' ? 'bg-blue-50 border-blue-200' : ''}
                ${uploadStatus[type] === 'success' ? 'bg-green-50 border-green-200' : ''}
              `}
            >
              <input {...getInputProps()} />
              
              {uploadStatus[type] === 'uploading' ? (
                <div className="text-center">
                  <Upload className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-blue-600 font-medium">Uploading...</p>
                  <Progress value={uploadProgress[type]} className="mt-2 h-2" />
                </div>
              ) : uploadStatus[type] === 'success' ? (
                <div className="text-center">
                  <Check className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-green-600 font-medium">Upload successful!</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className={`w-10 h-10 mx-auto mb-2 ${isError ? 'text-red-500' : 'text-gray-400'}`} />
                  <p className={`text-sm ${isError ? 'text-red-600' : 'text-gray-500'}`}>
                    {isError 
                      ? 'Error uploading file' 
                      : isDragActive 
                        ? 'Drop the file here...' 
                        : 'Drag & drop or click to select file'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Accepted formats: {getDocumentAcceptedTypes(type).join(', ')}
                  </p>
                </div>
              )}
            </div>
            
            {isError && errorMessage && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Important Documents</AlertTitle>
        <AlertDescription>
          Upload the required documents below for investors to review before making investment decisions. 
          All documents should be up-to-date and accurate.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="primary_docs">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="primary_docs">Primary Documents</TabsTrigger>
          <TabsTrigger value="additional_docs">Additional Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="primary_docs" className="space-y-4 pt-4">
          <DocumentDropzone type="pitch_deck" />
          <DocumentDropzone type="financial_report" />
        </TabsContent>
        
        <TabsContent value="additional_docs" className="space-y-4 pt-4">
          <DocumentDropzone type="investor_agreement" />
          <DocumentDropzone type="risk_disclosure" />
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end space-x-2 mt-6">
        <Button
          variant="outline"
          onClick={onComplete}
          disabled={isUploading}
        >
          Close
        </Button>
      </div>
    </div>
  );
}