import { useState, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Upload, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define schema for document upload
const documentFormSchema = z.object({
  name: z.string().min(3, 'Document name is required and must be at least 3 characters'),
  type: z.enum(['pitch_deck', 'financial_report', 'investor_agreement', 'risk_disclosure']),
  file: z.any()
    .refine((file) => file, "Document file is required")
    .refine(
      (file) => file && file.size <= 10 * 1024 * 1024, 
      "File size must be less than 10MB"
    )
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

interface DocumentUploadProps {
  onSubmit: (data: { name: string; type: string; file: File }) => Promise<void>;
  isLoading: boolean;
}

const DocumentUpload = ({ onSubmit, isLoading }: DocumentUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Initialize form
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      name: '',
      type: 'pitch_deck',
    },
  });

  // Validate file type and size
  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint',
      'image/jpeg',
      'image/png'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload PDF, DOCX, XLSX, PPTX, JPG or PNG files.');
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10 MB
      setUploadError('File size must be less than 10MB');
      return false;
    }
    
    setUploadError(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setUploadedFile(file);
        form.setValue('file', file);
      } else {
        e.target.value = '';
        setUploadedFile(null);
        form.setValue('file', null);
      }
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setUploadedFile(file);
        form.setValue('file', file);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setUploadedFile(null);
    form.setValue('file', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (data: DocumentFormValues) => {
    if (!uploadedFile) {
      setUploadError('Please upload a document file');
      return;
    }
    
    try {
      await onSubmit({
        name: data.name,
        type: data.type,
        file: uploadedFile
      });
      
      // Reset form after successful submission
      form.reset();
      setUploadedFile(null);
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadError('Failed to upload document. Please try again.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Name</FormLabel>
              <FormControl>
                <Input placeholder="Q1 Financial Report 2025" {...field} />
              </FormControl>
              <FormDescription>
                Enter a descriptive name for your document
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Document Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="pitch_deck" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Pitch Deck
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="financial_report" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Financial Report
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="investor_agreement" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Investor Agreement / Terms Sheet
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="risk_disclosure" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Risk Disclosure
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormDescription>
                Select the type of document you are uploading
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="file"
          render={() => (
            <FormItem>
              <FormLabel>Upload Document</FormLabel>
              <FormControl>
                <div 
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors
                    ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
                    ${uploadedFile ? 'bg-green-50 border-green-200' : ''}
                  `}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={uploadedFile ? undefined : triggerFileInput}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.jpg,.jpeg,.png"
                  />
                  
                  {uploadedFile ? (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className="flex items-center">
                          <FileText className="h-10 w-10 text-green-500 mr-2" />
                          <div className="text-left">
                            <p className="font-medium">{uploadedFile.name}</p>
                            <p className="text-sm text-gray-500">
                              {(uploadedFile.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile();
                          }}
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        File uploaded successfully. Click the button below to submit.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium mb-1">Drag & Drop your file here</p>
                      <p className="text-sm text-gray-500 mb-2">
                        or click to browse files
                      </p>
                      <p className="text-xs text-gray-400">
                        Supports PDF, DOCX, XLSX, PPTX, JPG, PNG (max 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {uploadError && (
          <Alert variant="destructive">
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isLoading || !uploadedFile} className="w-full">
          {isLoading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </form>
    </Form>
  );
};

export default DocumentUpload;