import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/context/MongoAuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import ChatInterface from "@/components/chat/ChatInterface";
import ChatList from "@/components/chat/ChatList";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

interface MongoChat {
  id: number;
  founderId: number;
  investorId: number;
  startupId?: number;
  startupName?: string;
  founderName?: string;
  investorName?: string;
  founderAvatar?: string;
  investorAvatar?: string;
  lastMessage?: string;
  createdAt: string;
  updatedAt?: string;
  founderUnread?: number;
  investorUnread?: number;
}

interface ChatProps {
  isDirectFounderChat?: boolean;
}

const Chat = ({ isDirectFounderChat = false }: ChatProps) => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [activeChat, setActiveChat] = useState<MongoChat | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Query for getting user's chats
  const { data: chats, isLoading: isChatsLoading } = useQuery({
    queryKey: ["/api/chats"],
    enabled: !!user,
  });
  
  // Get a specific chat
  const { data: chatData, isLoading: isChatLoading } = useQuery({
    queryKey: ["/api/chats", activeChatId],
    enabled: !!activeChatId && !!user,
  });
  
  // Mutation for creating a new chat
  const createChatMutation = useMutation({
    mutationFn: async (chatData: any) => {
      const response = await apiRequest("POST", "/api/chats", chatData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create chat");
      }
      return await response.json();
    },
    onSuccess: (newChat) => {
      setActiveChatId(newChat.id);
      setLocation(`/chat/${newChat.id}`);
    },
    onError: (error: Error) => {
      console.error("Error creating chat:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create chat",
        variant: "destructive",
      });
    }
  });
  
  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      setLocation("/signin");
      return;
    }
    
    // Handle direct founder chat - for investors who click "Chat" from a startup details page
    if (isDirectFounderChat && user.role === "investor") {
      const founderId = params.founderId;
      
      if (founderId) {
        console.log("Direct founder chat requested with founder ID:", founderId);
        
        // Find or create a chat with this founder
        findOrCreateChatWithFounder(parseInt(founderId, 10));
      } else {
        console.error("No founder ID provided for direct chat");
        toast({
          title: "Error",
          description: "Cannot start chat: missing founder information",
          variant: "destructive",
        });
        setLocation("/chat");
      }
    }
    
    // Handle normal chat route with ID parameter
    else if (params.id && !isDirectFounderChat) {
      console.log("Setting active chat from URL parameter:", params.id);
      setActiveChatId(parseInt(params.id, 10));
    }
  }, [user, params, isDirectFounderChat, setLocation]);
  
  // Function to find existing chat or create a new one with founder
  const findOrCreateChatWithFounder = async (founderId: number) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // First, try to find an existing chat between the investor and this founder
      if (chats && chats.length > 0) {
        // Find a chat that connects this investor with the specific founder
        const existingChat = chats.find((chat: any) => 
          chat.founderId === founderId && chat.investorId === user.id
        );
        
        if (existingChat) {
          console.log("Found existing chat:", existingChat.id);
          setActiveChatId(existingChat.id);
          setLocation(`/chat/${existingChat.id}`);
          setLoading(false);
          return;
        }
      }
      
      // If no existing chat found, create a new one
      console.log("No existing chat found, creating a new one with founder:", founderId);
      
      // Basic chat data
      const chatData = {
        founderId: founderId,
        investorId: user.id,
        founderName: "Founder", // Will be filled by backend
        investorName: user.username || "Investor",
      };
      
      // Create the chat
      createChatMutation.mutate(chatData);
      
    } catch (error) {
      console.error("Error finding/creating chat:", error);
      toast({
        title: "Error",
        description: "Failed to connect with the founder. Please try again.",
        variant: "destructive",
      });
      setLocation("/chat");
    } finally {
      setLoading(false);
    }
  };
  
  // Update active chat when chat data changes
  useEffect(() => {
    if (chatData) {
      setActiveChat(chatData);
      setLoading(false);
    }
  }, [chatData]);
  
  // Handle chat selection
  const handleSelectChat = (chatId: string | number) => {
    const numericChatId = typeof chatId === 'string' ? parseInt(chatId, 10) : chatId;
    setActiveChatId(numericChatId);
    // Update the URL without refreshing the page
    setLocation(`/chat/${numericChatId}`);
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Chat List */}
        <div className="md:col-span-1">
          <ChatList 
            onSelectChat={handleSelectChat}
            activeChatId={activeChatId || undefined}
          />
        </div>
        
        {/* Chat Interface */}
        <div className="md:col-span-3">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-32" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : activeChat ? (
            <ChatInterface 
              chatId={activeChat.id}
              otherUserId={user.role === "founder" ? activeChat.investorId : activeChat.founderId}
              otherUserName={user.role === "founder" ? activeChat.investorName : activeChat.founderName}
              otherUserAvatar={user.role === "founder" ? activeChat.investorAvatar : activeChat.founderAvatar}
            />
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center h-[60vh]">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-center text-muted-foreground">
                    {user.role === "founder" 
                      ? "Select a conversation to view messages from investors." 
                      : "Select a startup to start a conversation or view existing chats."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
