import { useState, useEffect } from "react";
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
  category: z.string().min(1, "Startup category is required"),
  fundingGoalEth: z.string().min(1, "Funding goal is required"),
  // Financial metrics
  companyValuation: z.string().min(1, "Company valuation is required"),
  ebidtaValue: z.string().min(1, "EBIDTA value is required"),
  monthlyBurnRate: z.string().min(1, "Monthly burn rate is required"),
  profitPercentage: z.string().min(1, "Profit percentage is required"),
  // Wallet address is now automatically obtained during signup
  upiQrCodeFile: z.instanceof(File, { message: "QR code image is required" }).optional(),
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
  // Preview states for UPI QR Code only
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultValues?.upiQrCode || null);

  const form = useForm<StartupFormValues>({
    resolver: zodResolver(startupFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      pitch: defaultValues?.pitch || "",
      category: defaultValues?.category || "",
      investmentStage: defaultValues?.investmentStage || "pre-seed",
      fundingGoalEth: defaultValues?.fundingGoalEth || "",
      companyValuation: defaultValues?.companyValuation || "",
      ebidtaValue: defaultValues?.ebidtaValue || "",
      monthlyBurnRate: defaultValues?.monthlyBurnRate || "",
      profitPercentage: defaultValues?.profitPercentage || "",
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

  // Get user and auth methods from auth context
  const { user, updateProfile } = useAuth();
  
  // Add a force refresh function for the user data
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Helper function to fetch latest user data
  const refreshUserData = async () => {
    try {
      setIsRefreshing(true);
      // Get fresh user data from the API
      const response = await fetch('/api/user');
      if (response.ok) {
        const userData = await response.json();
        console.log('Refreshed user data in StartupForm:', userData);
        
        // Debug current user context vs fresh data
        console.log('Current user context:', user);
        console.log('Fresh userData has wallet?', !!userData.walletAddress);
        console.log('User context has wallet?', !!user?.walletAddress);
        
        // Always update the user context with the latest wallet data from the API
        if (userData.walletAddress) {
          console.log('Updating auth context with wallet:', userData.walletAddress);
          // Force update the wallet address in the user context
          await updateProfile({ walletAddress: userData.walletAddress });
        } else {
          console.log('No wallet address found in fresh user data, checking additional sources');
          
          // Try additional sources for wallet data (MongoDB API)
          try {
            if (user?.id) {
              const walletResponse = await fetch(`/api/wallets/user/${user.id}`);
              if (walletResponse.ok) {
                const walletData = await walletResponse.json();
                console.log('Wallet data from MongoDB API:', walletData);
                
                if (walletData && walletData.address) {
                  console.log('Found wallet in MongoDB, updating profile:', walletData.address);
                  await updateProfile({ walletAddress: walletData.address });
                }
              }
            }
          } catch (error) {
            console.error('Error fetching wallet from MongoDB:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Force refresh user data when component mounts and when wallet connect status changes
  useEffect(() => {
    refreshUserData();
  }, [refreshCounter]);
  
  // Additional effect to run on mount to ensure wallet is loaded
  useEffect(() => {
    // Force an immediate check on component mount
    console.log('StartupForm mounted - checking wallet status');
    refreshUserData();
    
    // Set up periodic checks for wallet status (every 3 seconds)
    const intervalId = setInterval(() => {
      if (!user?.walletAddress) {
        console.log('Periodic wallet check - no wallet detected yet');
        refreshUserData();
      } else {
        console.log('Wallet already detected, stopping periodic checks');
        clearInterval(intervalId);
      }
    }, 3000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);
  
  const handleSubmit = async (data: StartupFormValues) => {
    // Only include UPI QR code file, no media files
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
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Startup Category</FormLabel>
              <FormControl>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select startup category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LogisticsTech">LogisticsTech</SelectItem>
                    <SelectItem value="AI/ML">AI/ML Startups</SelectItem>
                    <SelectItem value="Blockchain">Blockchain</SelectItem>
                    <SelectItem value="IoT">IoT (Internet of Things)</SelectItem>
                    <SelectItem value="Mobility/EV">Mobility/EV Startups</SelectItem>
                    <SelectItem value="SocialImpact">Social Impact</SelectItem>
                    <SelectItem value="CreatorEconomy">Creator Economy</SelectItem>
                    <SelectItem value="Marketplace">Marketplace Platforms</SelectItem>
                    <SelectItem value="AR/VR">AR/VR Startups</SelectItem>
                    <SelectItem value="Robotics">Robotics</SelectItem>
                    <SelectItem value="FinTech">FinTech</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                Select the category that best describes your startup
              </FormDescription>
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

        {/* Financial Metrics */}
        <FormField
          control={form.control}
          name="companyValuation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>COMPANY VALUATION (USD)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="1000" 
                  min="0" 
                  placeholder="Enter company valuation in USD" 
                  {...field} 
                  disabled={isLoading} 
                />
              </FormControl>
              <FormDescription>
                Current valuation of your startup
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ebidtaValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>EBIDTA VALUE (USD)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="1000" 
                  placeholder="Enter EBIDTA value in USD" 
                  {...field} 
                  disabled={isLoading} 
                />
              </FormControl>
              <FormDescription>
                Earnings Before Interest, Depreciation, Taxes, and Amortization
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="monthlyBurnRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>MONTHLY BURN RATE (USD)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="100" 
                  min="0" 
                  placeholder="Enter monthly burn rate in USD" 
                  {...field} 
                  disabled={isLoading} 
                />
              </FormControl>
              <FormDescription>
                Monthly cash expenditure
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="profitPercentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PROFIT PERCENTAGE (%)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="Enter profit percentage" 
                  {...field} 
                  disabled={isLoading} 
                />
              </FormControl>
              <FormDescription>
                Current profit margin as percentage
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



        {/* Wallet information section with manual refresh button */}
        <div className="mt-8 p-4 border rounded-lg bg-gray-50">
          {user && user.walletAddress ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Wallet Connected</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setRefreshCounter(c => c + 1)}
                  disabled={isRefreshing}
                  className="text-xs"
                >
                  {isRefreshing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <path d="M21 2v6h-6"></path>
                        <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                        <path d="M3 22v-6h6"></path>
                        <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                      </svg>
                      Refresh
                    </>
                  )}
                </Button>
              </div>
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Your wallet is connected: {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                This wallet will be used to receive cryptocurrency investments for your startup
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-amber-700">Wallet Required</h3>
                <p className="text-sm text-gray-500">
                  You need to connect a wallet first in your profile settings to receive cryptocurrency investments
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setRefreshCounter(c => c + 1)}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <path d="M21 2v6h-6"></path>
                        <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                        <path d="M3 22v-6h6"></path>
                        <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                      </svg>
                      Check Again
                    </>
                  )}
                </Button>
                <Link to="/profile">
                  <Button variant="outline">
                    Go to Profile
                  </Button>
                </Link>
              </div>
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