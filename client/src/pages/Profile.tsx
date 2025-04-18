import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWeb3 } from "@/hooks/useWeb3";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  email: z.string().email("Please enter a valid email address"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Profile = () => {
  const { user, updateProfile, disconnectWallet } = useAuth();
  const { isInstalled, address, connect, isWalletConnected } = useWeb3();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
    },
  });

  const handleUpdateProfile = async (data: ProfileFormValues) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      await updateProfile(data);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to get initials from username
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleConnectMetaMask = async () => {
    if (!isInstalled) {
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    await connect();
  };

  const handleDisconnectWallet = async () => {
    if (confirm("Are you sure you want to disconnect your wallet?")) {
      // Remove wallet_connected flag from localStorage
      localStorage.removeItem('wallet_connected');
      
      // Call disconnectWallet from auth context
      await disconnectWallet();
      
      // Force reload the page to ensure all states are reset
      window.location.reload();
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-gray-600 mb-8">Manage your account information and wallet</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Summary Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="text-xl">
                  {user ? getInitials(user.username) : "U"}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{user?.username}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                {user?.role === "founder" ? "Startup Founder" : "Investor"}
              </div>
              {address && (
                <div className="mt-4 text-sm flex items-center text-gray-600">
                  <Wallet className="h-4 w-4 mr-1" />
                  <span className="truncate max-w-[150px]">{address}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="md:col-span-2">
          <Tabs defaultValue="account">
            <TabsList className="mb-4">
              <TabsTrigger value="account">Account Details</TabsTrigger>
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
            </TabsList>
            
            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Update Profile</CardTitle>
                  <CardDescription>
                    Modify your account information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleUpdateProfile)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Updating..." : "Update Profile"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="wallet">
              <Card>
                <CardHeader>
                  <CardTitle>MetaMask Wallet</CardTitle>
                  <CardDescription>
                    Connect your MetaMask wallet to receive investments or make payments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {!isInstalled ? (
                      <div className="text-center p-6 border rounded-lg bg-gray-50">
                        <h3 className="text-lg font-medium mb-2">MetaMask Not Installed</h3>
                        <p className="text-gray-600 mb-4">
                          To connect your wallet, you need to install MetaMask first.
                        </p>
                        <Button onClick={handleConnectMetaMask}>
                          Install MetaMask
                        </Button>
                      </div>
                    ) : !isWalletConnected() ? (
                      <div className="text-center p-6 border rounded-lg bg-gray-50">
                        <h3 className="text-lg font-medium mb-2">Connect Your Wallet</h3>
                        <p className="text-gray-600 mb-4">
                          Connect your MetaMask wallet to start using blockchain features.
                        </p>
                        <Button onClick={handleConnectMetaMask}>
                          Connect MetaMask
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-green-50">
                          <h3 className="font-medium mb-2">Connected Wallet</h3>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Address:</span>
                            <span className="font-mono">{address}</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-end">
                          <Button 
                            variant="destructive" 
                            onClick={handleDisconnectWallet}
                          >
                            Disconnect Wallet
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;
