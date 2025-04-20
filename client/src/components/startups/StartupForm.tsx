import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertStartupSchema } from "@shared/schema";
import { AlertCircle, Image, FileVideo, Plus, X, CheckCircle, Wallet } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

// Extend the startup schema for form validation
const startupFormSchema = insertStartupSchema.omit({ founderId: true }).extend({
  name: z.string().min(3, "Startup name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  pitch: z.string().min(10, "Pitch must be at least 10 characters"),
  fundingGoalEth: z.string().min(1, "Funding goal is required"),
  // Wallet address is now automatically obtained during signup
  upiQrCodeFile: z.instanceof(File, { message: "QR code image is required" }).optional(),
  // Media fields
  logoFile: z.instanceof(File, { message: "Logo image is required" }).optional(),
  mediaFiles: z.array(z.instanceof(File)).optional(),
  videoFile: z.instanceof(File).optional(),
});

type StartupFormValues = z.infer<typeof startupFormSchema>;

interface StartupFormProps {
  onSubmit: (data: StartupFormValues & { 
    upiQrCodeFile?: File
  }) => Promise<void>;
  isLoading: boolean;
  defaultValues?: Partial<StartupFormValues>;
}

const StartupForm = ({ onSubmit, isLoading, defaultValues }: StartupFormProps) => {
  const [upiQrCodeFile, setUpiQrCodeFile] = useState<File | null>(null);
  // Media state variables
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  // Preview states
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultValues?.upiQrCode || null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(defaultValues?.logoUrl || null);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([]);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const form = useForm<StartupFormValues>({
    resolver: zodResolver(startupFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      pitch: defaultValues?.pitch || "",
      investmentStage: defaultValues?.investmentStage || "pre-seed",
      fundingGoalEth: defaultValues?.fundingGoalEth || "",
      // walletAddress no longer needed as it's handled through user profile
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

  // Handle drag and drop for UPI QR code
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
  
  // Media file handlers
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB for logo)
      if (file.size > 5 * 1024 * 1024) {
        setMediaError("Logo file size should be less than 5MB");
        return;
      }
      
      // Check file type (only allow images)
      if (!file.type.startsWith('image/')) {
        setMediaError("Only image files are allowed for logo");
        return;
      }
      
      setMediaError(null);
      setLogoFile(file);
      form.setValue("logoFile", file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleMediaFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFiles: File[] = [];
      const newPreviewUrls: string[] = [];
      let hasError = false;
      
      // Process each file
      Array.from(files).forEach(file => {
        // Check file size (max 10MB per image)
        if (file.size > 10 * 1024 * 1024) {
          setMediaError("Each image file size should be less than 10MB");
          hasError = true;
          return;
        }
        
        // Check file type (only allow images)
        if (!file.type.startsWith('image/')) {
          setMediaError("Only image files are allowed for gallery images");
          hasError = true;
          return;
        }
        
        // Add to selected files
        selectedFiles.push(file);
        
        // Create preview URLs
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviewUrls.push(reader.result as string);
          // When all files are processed, update state
          if (newPreviewUrls.length === selectedFiles.length) {
            setMediaPreviewUrls([...mediaPreviewUrls, ...newPreviewUrls]);
          }
        };
        reader.readAsDataURL(file);
      });
      
      if (!hasError) {
        setMediaError(null);
        // Limit to max 5 images
        const allMediaFiles = [...mediaFiles, ...selectedFiles].slice(0, 5);
        setMediaFiles(allMediaFiles);
        form.setValue("mediaFiles", allMediaFiles);
      }
    }
  };
  
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 20MB for video)
      if (file.size > 20 * 1024 * 1024) {
        setMediaError("Video file size should be less than 20MB");
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('video/') && 
          file.type !== 'application/mp4' && 
          !file.name.toLowerCase().endsWith('.mp4') &&
          !file.name.toLowerCase().endsWith('.webm')) {
        setMediaError("Only video files are allowed (MP4, WebM)");
        return;
      }
      
      setMediaError(null);
      setVideoFile(file);
      form.setValue("videoFile", file);
      
      // Create a preview thumbnail if possible
      if (URL.createObjectURL) {
        const videoUrl = URL.createObjectURL(file);
        setVideoPreviewUrl(videoUrl);
      }
    }
  };
  
  // Handle logo drag and drop
  const handleLogoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Check file size (max 5MB for logo)
      if (file.size > 5 * 1024 * 1024) {
        setMediaError("Logo file size should be less than 5MB");
        return;
      }
      
      // Check file type (only allow images)
      if (!file.type.startsWith('image/')) {
        setMediaError("Only image files are allowed for logo");
        return;
      }
      
      setMediaError(null);
      setLogoFile(file);
      form.setValue("logoFile", file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle media files drag and drop
  const handleMediaDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleMediaDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      const selectedFiles: File[] = [];
      const newPreviewUrls: string[] = [];
      let hasError = false;
      
      // Process each file
      Array.from(files).forEach(file => {
        // Check file size (max 10MB per image)
        if (file.size > 10 * 1024 * 1024) {
          setMediaError("Each image file size should be less than 10MB");
          hasError = true;
          return;
        }
        
        // Check file type (only allow images)
        if (!file.type.startsWith('image/')) {
          setMediaError("Only image files are allowed for gallery images");
          hasError = true;
          return;
        }
        
        // Add to selected files
        selectedFiles.push(file);
        
        // Create preview URLs
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviewUrls.push(reader.result as string);
          // When all files are processed, update state
          if (newPreviewUrls.length === selectedFiles.length) {
            setMediaPreviewUrls([...mediaPreviewUrls, ...newPreviewUrls]);
          }
        };
        reader.readAsDataURL(file);
      });
      
      if (!hasError) {
        setMediaError(null);
        // Limit to max 5 images total
        const allMediaFiles = [...mediaFiles, ...selectedFiles].slice(0, 5);
        setMediaFiles(allMediaFiles);
        form.setValue("mediaFiles", allMediaFiles);
      }
    }
  };
  
  // Handle video drag and drop
  const handleVideoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleVideoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Check file size (max 20MB for video)
      if (file.size > 20 * 1024 * 1024) {
        setMediaError("Video file size should be less than 20MB");
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('video/') && 
          file.type !== 'application/mp4' && 
          !file.name.toLowerCase().endsWith('.mp4') &&
          !file.name.toLowerCase().endsWith('.webm')) {
        setMediaError("Only video files are allowed (MP4, WebM)");
        return;
      }
      
      setMediaError(null);
      setVideoFile(file);
      form.setValue("videoFile", file);
      
      // Create a preview thumbnail if possible
      if (URL.createObjectURL) {
        const videoUrl = URL.createObjectURL(file);
        setVideoPreviewUrl(videoUrl);
      }
    }
  };
  
  // Remove a media image from the list
  const handleRemoveMedia = (index: number) => {
    const updatedFiles = [...mediaFiles];
    const updatedPreviews = [...mediaPreviewUrls];
    
    updatedFiles.splice(index, 1);
    updatedPreviews.splice(index, 1);
    
    setMediaFiles(updatedFiles);
    setMediaPreviewUrls(updatedPreviews);
    form.setValue("mediaFiles", updatedFiles);
  };

  // Get user from auth context
  const { user } = useAuth();
  
  const handleSubmit = async (data: StartupFormValues) => {
    // Include only the UPI QR code file in the submission
    // No document files like pitch deck, financial report, or investor agreement
    await onSubmit({
      ...data,
      upiQrCodeFile: upiQrCodeFile || undefined,
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

        {/* Wallet address field removed as it's now obtained from user profile */}

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

        {/* Media Upload Section */}
        <FormLabel className="text-lg font-medium mt-8 mb-4 block">Startup Media</FormLabel>
        <Card className="border-dashed">
          <CardContent className="p-6">
            <Tabs defaultValue="logo" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="logo">Logo</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="video">Video</TabsTrigger>
              </TabsList>
              
              {/* Logo Upload */}
              <TabsContent value="logo">
                <FormField
                  control={form.control}
                  name="logoFile"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormControl>
                        <div 
                          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2"
                          onDragOver={handleLogoDragOver}
                          onDrop={handleLogoDrop}
                        >
                          {logoPreviewUrl ? (
                            <div className="flex flex-col items-center">
                              <img src={logoPreviewUrl} alt="Logo Preview" className="w-40 h-40 object-contain mb-2" />
                              <p className="text-sm font-medium">{logoFile?.name || "Current Logo"}</p>
                            </div>
                          ) : (
                            <>
                              <Image className="h-8 w-8 text-gray-400" />
                              <p className="text-sm text-gray-600">Click to browse or drag and drop</p>
                              <p className="text-xs text-gray-500">JPG, PNG, SVG (Max 5MB)</p>
                            </>
                          )}
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoFileChange}
                            disabled={isLoading}
                            className="hidden"
                            id="logo-upload"
                            {...fieldProps}
                          />
                          <label htmlFor="logo-upload" className="mt-2 cursor-pointer">
                            <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/90 h-10 px-4 py-2 bg-primary text-primary-foreground">
                              {logoPreviewUrl ? "Change Logo" : "Upload Logo"}
                            </div>
                          </label>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Upload your startup logo (recommended size: 512x512px)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Images Upload */}
              <TabsContent value="images">
                <FormField
                  control={form.control}
                  name="mediaFiles"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormControl>
                        <div 
                          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2"
                          onDragOver={handleMediaDragOver}
                          onDrop={handleMediaDrop}
                        >
                          {mediaPreviewUrls.length > 0 ? (
                            <div className="w-full">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                {mediaPreviewUrls.map((url, index) => (
                                  <div key={index} className="relative group">
                                    <img src={url} alt={`Image ${index+1}`} className="w-full h-24 object-cover rounded" />
                                    <button
                                      type="button"
                                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleRemoveMedia(index)}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                                {mediaPreviewUrls.length < 5 && (
                                  <label htmlFor="images-upload" className="border-2 border-dashed border-gray-300 rounded flex items-center justify-center h-24 cursor-pointer">
                                    <Plus className="w-8 h-8 text-gray-400" />
                                  </label>
                                )}
                              </div>
                              {mediaPreviewUrls.length < 5 && (
                                <p className="text-xs text-center text-gray-500 mb-2">
                                  {5 - mediaPreviewUrls.length} more image{mediaPreviewUrls.length === 4 ? '' : 's'} can be added
                                </p>
                              )}
                            </div>
                          ) : (
                            <>
                              <Image className="h-8 w-8 text-gray-400" />
                              <p className="text-sm text-gray-600">Click to browse or drag and drop</p>
                              <p className="text-xs text-gray-500">JPG, PNG, GIF, etc. (Max 10MB each)</p>
                            </>
                          )}
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleMediaFilesChange}
                            disabled={isLoading || mediaPreviewUrls.length >= 5}
                            className="hidden"
                            id="images-upload"
                            multiple
                            {...fieldProps}
                          />
                          {mediaPreviewUrls.length === 0 && (
                            <label htmlFor="images-upload" className="mt-2 cursor-pointer">
                              <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/90 h-10 px-4 py-2 bg-primary text-primary-foreground">
                                Upload Images
                              </div>
                            </label>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Upload up to 5 images showcasing your startup (products, team, offices, etc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Video Upload */}
              <TabsContent value="video">
                <FormField
                  control={form.control}
                  name="videoFile"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormControl>
                        <div 
                          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2"
                          onDragOver={handleVideoDragOver}
                          onDrop={handleVideoDrop}
                        >
                          {videoFile ? (
                            <div className="flex flex-col items-center">
                              {videoPreviewUrl ? (
                                <video 
                                  className="w-full h-48 object-contain mb-2" 
                                  controls
                                  src={videoPreviewUrl}
                                />
                              ) : (
                                <FileVideo className="h-16 w-16 text-primary mb-2" />
                              )}
                              <p className="text-sm font-medium">{videoFile.name}</p>
                              <p className="text-xs text-gray-500">
                                {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <>
                              <FileVideo className="h-8 w-8 text-gray-400" />
                              <p className="text-sm text-gray-600">Click to browse or drag and drop</p>
                              <p className="text-xs text-gray-500">MP4, WebM (Max 20MB)</p>
                            </>
                          )}
                          <Input
                            type="file"
                            accept="video/*,.mp4,.webm"
                            onChange={handleVideoFileChange}
                            disabled={isLoading}
                            className="hidden"
                            id="video-upload"
                            {...fieldProps}
                          />
                          <label htmlFor="video-upload" className="mt-2 cursor-pointer">
                            <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/90 h-10 px-4 py-2 bg-primary text-primary-foreground">
                              {videoFile ? "Change Video" : "Upload Video"}
                            </div>
                          </label>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Upload a short pitch video or product demo (max 20MB)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Wallet information section */}
        <div className="mt-8 p-4 border rounded-lg bg-gray-50">
          {user?.walletAddress ? (
            <div>
              <h3 className="text-lg font-medium">Wallet Connected</h3>
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Your wallet is connected: {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                This wallet will be used to receive cryptocurrency investments for your startup
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-amber-700">Wallet Required</h3>
                <p className="text-sm text-gray-500">
                  You need to connect a wallet first in your profile settings to receive cryptocurrency investments
                </p>
              </div>
              <Link to="/profile">
                <Button variant="outline">
                  Go to Profile
                </Button>
              </Link>
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