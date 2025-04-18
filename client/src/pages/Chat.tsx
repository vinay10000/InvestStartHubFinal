import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { database } from "@/firebase/config";
import { ref, onValue } from "firebase/database";
import ChatInterface from "@/components/chat/ChatInterface";
import ChatList from "@/components/chat/ChatList";

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

const Chat = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<FirebaseChat | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);
  
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
