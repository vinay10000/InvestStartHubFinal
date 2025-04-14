import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertCircle, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Document form schema
const documentFormSchema = z.object({
  name: z.string().min(3, "Document name must be at least 3 characters"),
  type: z.enum(["pitch_deck", "financial_report", "investor_agreement", "risk_disclosure"], {
    required_error: "Please select a document type",
  }),
  file: z.instanceof(File, { message: "Please select a file" }),
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

interface DocumentUploadProps {
  onSubmit: (data: { name: string; type: string; file: File }) => Promise<void>;
  isLoading: boolean;
}

const DocumentUpload = ({ onSubmit, isLoading }: DocumentUploadProps) => {
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      name: "",
      type: "pitch_deck",
    },
  });

  // Auto-fill name based on selected document type
  const documentTypeDisplayNames = {
    "pitch_deck": "Pitch Deck",
    "financial_report": "Financial Report",
    "investor_agreement": "Investor Agreement / Terms Sheet",
    "risk_disclosure": "Risk Disclosure Document"
  };

  const validateFile = (file: File): boolean => {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileError("File size should be less than 10MB");
      return false;
    }
    
    // Check file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/msword",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setFileError("Only PDF, Word, Excel, and PowerPoint files are allowed");
      return false;
    }
    
    setFileError(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setSelectedFile(file);
        form.setValue("file", file);
        
        // Auto-suggest name based on file name if name field is empty
        const currentName = form.getValues("name");
        if (!currentName || currentName.trim() === "") {
          // Remove extension from file name
          const fileName = file.name.replace(/\.[^/.]+$/, "");
          form.setValue("name", fileName);
        }
      }
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      if (validateFile(file)) {
        setSelectedFile(file);
        form.setValue("file", file);
        
        // Auto-suggest name based on file name if name field is empty
        const currentName = form.getValues("name");
        if (!currentName || currentName.trim() === "") {
          // Remove extension from file name
          const fileName = file.name.replace(/\.[^/.]+$/, "");
          form.setValue("name", fileName);
        }
      }
    }
  };
  
  // Update document name when type changes
  const handleTypeChange = (type: string) => {
    form.setValue("type", type as any);
    const currentName = form.getValues("name");
    
    // If name is empty or matches one of the standard document names, update it
    if (!currentName || Object.values(documentTypeDisplayNames).includes(currentName)) {
      form.setValue("name", documentTypeDisplayNames[type as keyof typeof documentTypeDisplayNames]);
    }
  };

  const handleSubmit = async (data: DocumentFormValues) => {
    await onSubmit({
      name: data.name,
      type: data.type,
      file: data.file,
    });
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
                <Input placeholder="Enter document name" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Type</FormLabel>
              <FormControl>
                <Select 
                  value={field.value} 
                  onValueChange={(value) => {
                    handleTypeChange(value);
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pitch_deck">Pitch Deck</SelectItem>
                    <SelectItem value="financial_report">Financial Report</SelectItem>
                    <SelectItem value="investor_agreement">Investor Agreement / Terms Sheet</SelectItem>
                    <SelectItem value="risk_disclosure">Risk Disclosure</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="file"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel>Upload File</FormLabel>
              <FormControl>
                <div 
                  className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {value ? (
                    <div className="flex flex-col items-center">
                      <div className="bg-blue-50 p-3 rounded-full mb-2">
                        <Upload className="h-6 w-6 text-blue-500" />
                      </div>
                      <p className="text-sm font-medium">{(value as File).name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round((value as File).size / 1024)} KB
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-600 font-medium">Drag and drop your file here</p>
                      <p className="text-xs text-gray-500">or click to browse</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, Word, Excel, PowerPoint (Max 10MB)</p>
                    </>
                  )}
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={(e) => {
                      handleFileChange(e);
                    }}
                    disabled={isLoading}
                    className="hidden"
                    id="file-upload"
                    {...fieldProps}
                  />
                  <label htmlFor="file-upload" className="mt-2 w-full">
                    <Button 
                      type="button" 
                      variant={value ? "outline" : "default"} 
                      size="sm" 
                      disabled={isLoading}
                      className="w-full"
                    >
                      {value ? "Replace File" : "Browse Files"}
                    </Button>
                  </label>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {fileError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading || !!fileError}>
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </span>
            ) : (
              <span>Upload Document</span>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default DocumentUpload;
