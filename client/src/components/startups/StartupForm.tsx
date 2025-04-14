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
import { Upload, AlertCircle, Image } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Extend the startup schema for form validation
const startupFormSchema = insertStartupSchema.omit({ founderId: true }).extend({
  name: z.string().min(3, "Startup name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  pitch: z.string().min(10, "Pitch must be at least 10 characters"),
  fundingGoalEth: z.string().min(1, "Funding goal is required"),
  upiQrCodeFile: z.instanceof(File, { message: "QR code image is required" }).optional(),
});

type StartupFormValues = z.infer<typeof startupFormSchema>;

interface StartupFormProps {
  onSubmit: (data: StartupFormValues & { upiQrCodeFile?: File }) => Promise<void>;
  isLoading: boolean;
  defaultValues?: Partial<StartupFormValues>;
}

const StartupForm = ({ onSubmit, isLoading, defaultValues }: StartupFormProps) => {
  const [upiQrCodeFile, setUpiQrCodeFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultValues?.upiQrCode || null);

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

  const handleSubmit = async (data: StartupFormValues) => {
    // Include the file in the submission
    await onSubmit({
      ...data,
      upiQrCodeFile: upiQrCodeFile || undefined
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

        <div className="flex justify-end">
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
