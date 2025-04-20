import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { database } from "@/firebase/config";
import { ref, onValue, get, set, push } from "firebase/database";
import ChatInterface from "@/components/chat/ChatInterface";
import ChatList from "@/components/chat/ChatList";
import { toast } from "@/hooks/use-toast";

interface FirebaseChat {
  id: string;
  founderId: string;
  investorId: string;
  startupId: string;
  startupName?: string;
  founderName?: string;
  investorName?: string;
  founderAvatar?: string;
  investorAvatar?: string;
  lastMessage?: string;
  timestamp?: number;
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
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<FirebaseChat | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    
    // Handle direct founder chat - for investors who click "Chat" from a startup details page
    if (isDirectFounderChat && user.role === "investor") {
      const founderId = params.founderId;
      
      if (founderId) {
        console.log("Direct founder chat requested with founder ID:", founderId);
        
        // Find or create a chat with this founder
        findOrCreateChatWithFounder(founderId);
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
      setActiveChatId(params.id);
    }
  }, [user, params, isDirectFounderChat, setLocation]);
  
  // Function to find existing chat or create a new one with founder
  const findOrCreateChatWithFounder = async (founderId: string) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // First, try to find an existing chat between the investor and this founder
      const chatsRef = ref(database, 'chats');
      const snapshot = await get(chatsRef);
      
      if (snapshot.exists()) {
        const chats = snapshot.val();
        
        // Find a chat that connects this investor with the specific founder
        const existingChatId = Object.keys(chats).find(chatId => {
          const chat = chats[chatId];
          return chat.founderId === founderId && chat.investorId === user.uid;
        });
        
        if (existingChatId) {
          console.log("Found existing chat:", existingChatId);
          setActiveChatId(existingChatId);
          setLoading(false);
          return;
        }
      }
      
      // If no existing chat found, create a new one
      console.log("No existing chat found, creating a new one with founder:", founderId);
      
      // Create a new chat entry
      const newChatRef = push(ref(database, 'chats'));
      const chatId = newChatRef.key;
      
      if (!chatId) {
        throw new Error("Failed to generate chat ID");
      }
      
      // Basic chat data
      const chatData = {
        founderId,
        investorId: user.uid,
        timestamp: Date.now(),
        founderName: "Founder", // You might want to fetch the actual name
        investorName: user.username || "Investor",
        founderAvatar: "",
        investorAvatar: user.profilePicture || "",
      };
      
      // Set the chat data
      await set(newChatRef, chatData);
      
      console.log("Created new chat:", chatId);
      setActiveChatId(chatId);
      
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
  
  // Load active chat data when chat ID changes
  useEffect(() => {
    if (!activeChatId) {
      setActiveChat(null);
      return;
    }
    
    setLoading(true);
    
    // Reference to the active chat
    const chatRef = ref(database, `chats/${activeChatId}`);
    
    // Listen for chat updates
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setActiveChat(null);
        setLoading(false);
        return;
      }
      
      setActiveChat({
        id: activeChatId,
        ...data
      });
      setLoading(false);
    });
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [activeChatId]);
  
  // Handle chat selection
  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    // Update the URL without refreshing the page
    setLocation(`/chat/${chatId}`);
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
