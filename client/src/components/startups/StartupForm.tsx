import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertStartupSchema } from "@shared/schema";
import { Upload, AlertCircle, Image, FileText, BarChart2, FileCheck, Wallet, CheckCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import WalletConnect from "@/components/auth/WalletConnect";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

// Document types
type DocumentType = 'pitch_deck' | 'financial_report' | 'investor_agreement';

// Extend the startup schema for form validation
const startupFormSchema = insertStartupSchema.omit({ founderId: true }).extend({
  name: z.string().min(3, "Startup name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  pitch: z.string().min(10, "Pitch must be at least 10 characters"),
  fundingGoalEth: z.string().min(1, "Funding goal is required"),
  upiQrCodeFile: z.instanceof(File, { message: "QR code image is required" }).optional(),
  pitchDeckFile: z.instanceof(File, { message: "Pitch deck is required" }).optional(),
  financialReportFile: z.instanceof(File, { message: "Financial report is required" }).optional(),
  investorAgreementFile: z.instanceof(File, { message: "Investor agreement is required" }).optional(),
});

type StartupFormValues = z.infer<typeof startupFormSchema>;

interface StartupFormProps {
  onSubmit: (data: StartupFormValues & { 
    upiQrCodeFile?: File,
    pitchDeckFile?: File,
    financialReportFile?: File,
    investorAgreementFile?: File
  }) => Promise<void>;
  isLoading: boolean;
  defaultValues?: Partial<StartupFormValues>;
}

const StartupForm = ({ onSubmit, isLoading, defaultValues }: StartupFormProps) => {
  const [upiQrCodeFile, setUpiQrCodeFile] = useState<File | null>(null);
  const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
  const [financialReportFile, setFinancialReportFile] = useState<File | null>(null);
  const [investorAgreementFile, setInvestorAgreementFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultValues?.upiQrCode || null);
  const [documentErrors, setDocumentErrors] = useState<Record<DocumentType, string | null>>({
    pitch_deck: null,
    financial_report: null,
    investor_agreement: null
  });

  const form = useForm<StartupFormValues>({
    resolver: zodResolver(startupFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      pitch: defaultValues?.pitch || "",
      investmentStage: defaultValues?.investmentStage || "pre-seed",
      fundingGoalEth: defaultValues?.fundingGoalEth || "",
      upiId: defaultValues?.upiId || "",
      upiQrCode: defaultValues?.upiQrCode || "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFileError("File size should be less than 5MB");
        return;
      }
      
      // Check file type (only allow images)
      if (!file.type.startsWith('image/')) {
        setFileError("Only image files are allowed for QR code");
        return;
      }
      
      setFileError(null);
      setUpiQrCodeFile(file);
      form.setValue("upiQrCodeFile", file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
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
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFileError("File size should be less than 5MB");
        return;
      }
      
      // Check file type (only allow images)
      if (!file.type.startsWith('image/')) {
        setFileError("Only image files are allowed for QR code");
        return;
      }
      
      setFileError(null);
      setUpiQrCodeFile(file);
      form.setValue("upiQrCodeFile", file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // File handlers for document uploads
  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>, documentType: DocumentType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 10MB for documents)
    if (file.size > 10 * 1024 * 1024) {
      setDocumentErrors({
        ...documentErrors,
        [documentType]: "File size should be less than 10MB"
      });
      return;
    }
    
    // Validate file type based on document type
    const isValid = validateFileType(file, documentType);
    if (!isValid) {
      setDocumentErrors({
        ...documentErrors,
        [documentType]: "Unsupported file format for this document type"
      });
      return;
    }
    
    // Clear errors and set file
    setDocumentErrors({
      ...documentErrors,
      [documentType]: null
    });
    
    // Update the appropriate file state
    switch (documentType) {
      case 'pitch_deck':
        setPitchDeckFile(file);
        form.setValue("pitchDeckFile", file);
        break;
      case 'financial_report':
        setFinancialReportFile(file);
        form.setValue("financialReportFile", file);
        break;
      case 'investor_agreement':
        setInvestorAgreementFile(file);
        form.setValue("investorAgreementFile", file);
        break;
    }
  };
  
  // File type validation based on document type
  const validateFileType = (file: File, documentType: DocumentType): boolean => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type;
    
    switch (documentType) {
      case 'pitch_deck':
        // Allow PDFs and PowerPoint files
        return fileType === 'application/pdf' || 
               fileType === 'application/vnd.ms-powerpoint' || 
               fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
               fileName.endsWith('.pdf') || fileName.endsWith('.ppt') || fileName.endsWith('.pptx');
      
      case 'financial_report':
        // Allow PDFs, Excel, and CSV files
        return fileType === 'application/pdf' || 
               fileType === 'application/vnd.ms-excel' || 
               fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
               fileType === 'text/csv' ||
               fileName.endsWith('.pdf') || fileName.endsWith('.xls') || 
               fileName.endsWith('.xlsx') || fileName.endsWith('.csv');
      
      case 'investor_agreement':
        // Allow PDFs and Word documents
        return fileType === 'application/pdf' || 
               fileType === 'application/msword' || 
               fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx');
      
      default:
        return false;
    }
  };
  
  // Handle document drag and drop
  const handleDocumentDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDocumentDrop = (e: React.DragEvent<HTMLDivElement>, documentType: DocumentType) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Check file size (max 10MB for documents)
      if (file.size > 10 * 1024 * 1024) {
        setDocumentErrors({
          ...documentErrors,
          [documentType]: "File size should be less than 10MB"
        });
        return;
      }
      
      // Validate file type based on document type
      const isValid = validateFileType(file, documentType);
      if (!isValid) {
        setDocumentErrors({
          ...documentErrors,
          [documentType]: "Unsupported file format for this document type"
        });
        return;
      }
      
      // Clear errors and set file
      setDocumentErrors({
        ...documentErrors,
        [documentType]: null
      });
      
      // Update the appropriate file state
      switch (documentType) {
        case 'pitch_deck':
          setPitchDeckFile(file);
          form.setValue("pitchDeckFile", file);
          break;
        case 'financial_report':
          setFinancialReportFile(file);
          form.setValue("financialReportFile", file);
          break;
        case 'investor_agreement':
          setInvestorAgreementFile(file);
          form.setValue("investorAgreementFile", file);
          break;
      }
    }
  };
  
  // Get document icon based on type
  const getDocumentIcon = (type: DocumentType) => {
    switch (type) {
      case 'pitch_deck':
        return <FileText className="h-8 w-8 text-gray-400" />;
      case 'financial_report':
        return <BarChart2 className="h-8 w-8 text-gray-400" />;
      case 'investor_agreement':
        return <FileCheck className="h-8 w-8 text-gray-400" />;
      default:
        return <FileText className="h-8 w-8 text-gray-400" />;
    }
  };
  
  // Get document description based on type
  const getDocumentDescription = (type: DocumentType): string => {
    switch (type) {
      case 'pitch_deck':
        return 'Upload your pitch presentation (PDF, PowerPoint)';
      case 'financial_report':
        return 'Upload financial projections and reports (PDF, Excel, CSV)';
      case 'investor_agreement':
        return 'Upload investor term sheet or agreement (PDF, Word)';
      default:
        return 'Upload document';
    }
  };
  
  // Get document accepted formats based on type
  const getDocumentFormats = (type: DocumentType): string => {
    switch (type) {
      case 'pitch_deck':
        return 'PDF, PPT, PPTX';
      case 'financial_report':
        return 'PDF, Excel, CSV';
      case 'investor_agreement':
        return 'PDF, DOC, DOCX';
      default:
        return 'PDF';
    }
  };

  // Get user from auth context
  const { user, connectWallet } = useAuth();
  
  // Handle wallet connection
  const handleWalletConnect = async (address: string) => {
    try {
      if (connectWallet) {
        await connectWallet(address);
        console.log("Wallet connected successfully:", address);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };
  
  const handleSubmit = async (data: StartupFormValues) => {
    // Include all files in the submission
    await onSubmit({
      ...data,
      upiQrCodeFile: upiQrCodeFile || undefined,
      pitchDeckFile: pitchDeckFile || undefined,
      financialReportFile: financialReportFile || undefined,
      investorAgreementFile: investorAgreementFile || undefined
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
              <FormLabel>Startup Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your startup name" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your startup in detail" 
                  {...field} 
                  disabled={isLoading}
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pitch"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Elevator Pitch</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Your concise pitch to investors" 
                  {...field} 
                  disabled={isLoading}
                  className="min-h-[80px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="investmentStage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investment Stage</FormLabel>
              <FormControl>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select investment stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre-seed">Pre-seed</SelectItem>
                    <SelectItem value="seed">Seed</SelectItem>
                    <SelectItem value="series a">Series A</SelectItem>
                    <SelectItem value="series b">Series B</SelectItem>
                    <SelectItem value="series c">Series C</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fundingGoalEth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Funding Goal (ETH)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  placeholder="Enter funding goal in ETH" 
                  {...field} 
                  disabled={isLoading} 
                />
              </FormControl>
              <FormDescription>
                Amount of ETH needed for your startup
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="upiId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>UPI ID (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter your UPI ID" 
                  value={field.value || ""} 
                  onChange={field.onChange} 
                  disabled={isLoading} 
                />
              </FormControl>
              <FormDescription>
                For receiving fiat payments via UPI
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="upiQrCodeFile"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel>UPI QR Code Image</FormLabel>
              <FormControl>
                <div 
                  className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {previewUrl ? (
                    <div className="flex flex-col items-center">
                      <img src={previewUrl} alt="QR Preview" className="w-40 h-40 object-contain mb-2" />
                      <p className="text-sm font-medium">{upiQrCodeFile?.name || "Current QR Code"}</p>
                    </div>
                  ) : (
                    <>
                      <Image className="h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-600">Click to browse or drag and drop</p>
                      <p className="text-xs text-gray-500">JPG, PNG, GIF, etc. (Max 5MB)</p>
                    </>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    className="hidden"
                    id="qr-upload"
                    {...fieldProps}
                  />
                  <label htmlFor="qr-upload" className="mt-2 cursor-pointer">
                    <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/90 h-10 px-4 py-2 bg-primary text-primary-foreground">
                      {previewUrl ? "Change Image" : "Browse Files"}
                    </div>
                  </label>
                </div>
              </FormControl>
              <FormDescription>
                Upload your UPI QR code for receiving payments
              </FormDescription>
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

        <FormField
          control={form.control}
          name="upiQrCode"
          render={({ field }) => (
            <FormItem className="hidden">
              <FormControl>
                <Input 
                  placeholder="Enter UPI QR code URL" 
                  value={field.value || ""} 
                  onChange={field.onChange} 
                  disabled={isLoading} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Document Upload Section */}
        <FormLabel className="text-lg font-medium mt-8 mb-4 block">Important Documents</FormLabel>
        <Card className="border-dashed">
          <CardContent className="p-6">
            <Tabs defaultValue="pitch_deck" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="pitch_deck">Pitch Deck</TabsTrigger>
                <TabsTrigger value="financial_report">Financial Report</TabsTrigger>
                <TabsTrigger value="investor_agreement">Investor Agreement</TabsTrigger>
              </TabsList>
              
              {/* Pitch Deck Upload */}
              <TabsContent value="pitch_deck">
                <FormField
                  control={form.control}
                  name="pitchDeckFile"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormControl>
                        <div 
                          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2"
                          onDragOver={handleDocumentDragOver}
                          onDrop={(e) => handleDocumentDrop(e, 'pitch_deck')}
                        >
                          {pitchDeckFile ? (
                            <div className="flex flex-col items-center">
                              <FileText className="h-16 w-16 text-primary mb-2" />
                              <p className="text-sm font-medium">{pitchDeckFile.name}</p>
                              <p className="text-xs text-gray-500">
                                {(pitchDeckFile.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <>
                              {getDocumentIcon('pitch_deck')}
                              <p className="text-sm text-gray-600">Click to browse or drag and drop</p>
                              <p className="text-xs text-gray-500">{getDocumentFormats('pitch_deck')} (Max 10MB)</p>
                            </>
                          )}
                          <Input
                            type="file"
                            accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                            onChange={(e) => handleDocumentFileChange(e, 'pitch_deck')}
                            disabled={isLoading}
                            className="hidden"
                            id="pitch-deck-upload"
                            {...fieldProps}
                          />
                          <label htmlFor="pitch-deck-upload" className="mt-2 cursor-pointer">
                            <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/90 h-10 px-4 py-2 bg-primary text-primary-foreground">
                              {pitchDeckFile ? "Change File" : "Browse Files"}
                            </div>
                          </label>
                        </div>
                      </FormControl>
                      <FormDescription>
                        {getDocumentDescription('pitch_deck')}
                      </FormDescription>
                      {documentErrors.pitch_deck && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{documentErrors.pitch_deck}</AlertDescription>
                        </Alert>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Financial Report Upload */}
              <TabsContent value="financial_report">
                <FormField
                  control={form.control}
                  name="financialReportFile"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormControl>
                        <div 
                          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2"
                          onDragOver={handleDocumentDragOver}
                          onDrop={(e) => handleDocumentDrop(e, 'financial_report')}
                        >
                          {financialReportFile ? (
                            <div className="flex flex-col items-center">
                              <BarChart2 className="h-16 w-16 text-primary mb-2" />
                              <p className="text-sm font-medium">{financialReportFile.name}</p>
                              <p className="text-xs text-gray-500">
                                {(financialReportFile.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <>
                              {getDocumentIcon('financial_report')}
                              <p className="text-sm text-gray-600">Click to browse or drag and drop</p>
                              <p className="text-xs text-gray-500">{getDocumentFormats('financial_report')} (Max 10MB)</p>
                            </>
                          )}
                          <Input
                            type="file"
                            accept=".pdf,.xls,.xlsx,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                            onChange={(e) => handleDocumentFileChange(e, 'financial_report')}
                            disabled={isLoading}
                            className="hidden"
                            id="financial-report-upload"
                            {...fieldProps}
                          />
                          <label htmlFor="financial-report-upload" className="mt-2 cursor-pointer">
                            <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/90 h-10 px-4 py-2 bg-primary text-primary-foreground">
                              {financialReportFile ? "Change File" : "Browse Files"}
                            </div>
                          </label>
                        </div>
                      </FormControl>
                      <FormDescription>
                        {getDocumentDescription('financial_report')}
                      </FormDescription>
                      {documentErrors.financial_report && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{documentErrors.financial_report}</AlertDescription>
                        </Alert>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Investor Agreement Upload */}
              <TabsContent value="investor_agreement">
                <FormField
                  control={form.control}
                  name="investorAgreementFile"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormControl>
                        <div 
                          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2"
                          onDragOver={handleDocumentDragOver}
                          onDrop={(e) => handleDocumentDrop(e, 'investor_agreement')}
                        >
                          {investorAgreementFile ? (
                            <div className="flex flex-col items-center">
                              <FileCheck className="h-16 w-16 text-primary mb-2" />
                              <p className="text-sm font-medium">{investorAgreementFile.name}</p>
                              <p className="text-xs text-gray-500">
                                {(investorAgreementFile.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <>
                              {getDocumentIcon('investor_agreement')}
                              <p className="text-sm text-gray-600">Click to browse or drag and drop</p>
                              <p className="text-xs text-gray-500">{getDocumentFormats('investor_agreement')} (Max 10MB)</p>
                            </>
                          )}
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) => handleDocumentFileChange(e, 'investor_agreement')}
                            disabled={isLoading}
                            className="hidden"
                            id="investor-agreement-upload"
                            {...fieldProps}
                          />
                          <label htmlFor="investor-agreement-upload" className="mt-2 cursor-pointer">
                            <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/90 h-10 px-4 py-2 bg-primary text-primary-foreground">
                              {investorAgreementFile ? "Change File" : "Browse Files"}
                            </div>
                          </label>
                        </div>
                      </FormControl>
                      <FormDescription>
                        {getDocumentDescription('investor_agreement')}
                      </FormDescription>
                      {documentErrors.investor_agreement && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{documentErrors.investor_agreement}</AlertDescription>
                        </Alert>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Wallet connection section */}
        <div className="mt-8 p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Connect Wallet</h3>
              <p className="text-sm text-gray-500">
                You need to connect a wallet to receive cryptocurrency investments
              </p>
            </div>
            <WalletConnect 
              onConnect={handleWalletConnect}
              showBalance={false} 
              showAddress={user?.walletAddress ? true : false}
              buttonVariant={user?.walletAddress ? "outline" : "default"}
              showDialogOnConnect={false}
            />
          </div>
          {user?.walletAddress && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Wallet connected: {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-8">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {defaultValues ? "Updating..." : "Creating..."}
              </span>
            ) : (
              <span>{defaultValues ? "Update Startup" : "Create Startup"}</span>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default StartupForm;
