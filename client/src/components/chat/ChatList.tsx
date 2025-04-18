import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { database } from "@/firebase/config";
import { ref, onValue, get, push, set } from "firebase/database";
import { useStartups } from "@/hooks/useStartups";

interface ChatListProps {
  onSelectChat: (chatId: string) => void;
  activeChatId?: string;
}

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

const ChatList = ({ onSelectChat, activeChatId }: ChatListProps) => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [chats, setChats] = useState<FirebaseChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [allStartups, setAllStartups] = useState<any[]>([]);
  const [loadingStartups, setLoadingStartups] = useState(true);
  
  // Determine if user is the founder or investor
  const isFounder = user?.role === "founder";
  
  // Get all startups for investors
  const { useAllStartups } = useStartups();
  const { data: startupsData, isLoading: startupsLoading, refetch: refetchStartups } = useAllStartups();
  
  // Load all startups for investors
  useEffect(() => {
    if (!isFounder && startupsData) {
      setAllStartups(startupsData.startups || []);
      setLoadingStartups(false);
    }
  }, [isFounder, startupsData]);
  
  // Add a refresh button for startups
  const handleRefreshStartups = () => {
    setLoadingStartups(true);
    refetchStartups();
  };
  
  // Load user's chats from Firebase
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    
    // Reference to all chats (we'll filter client-side)
    const chatsQuery = ref(database, `chats`);
    
    // Listen for chat updates
    const unsubscribe = onValue(chatsQuery, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setChats([]);
        setLoading(false);
        return;
      }
      
      // Convert object to array and filter by user's role
      const chatList = Object.entries(data).map(([id, chatData]: [string, any]) => ({
        id,
        ...chatData
      })).filter(chat => {
        // Filter chats where user is a participant
        // Convert IDs to strings for comparison to handle both number and string types
        const userId = String(user.id);
        const founderId = String(chat.founderId);
        const investorId = String(chat.investorId);
        
        return isFounder 
          ? founderId === userId
          : investorId === userId;
      });
      
      // Sort by timestamp (most recent first)
      chatList.sort((a, b) => {
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        return timeB - timeA;
      });
      
      setChats(chatList);
      setLoading(false);
    });
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [user, isFounder]);
  
  // Format chat name for display
  const getChatName = (chat: FirebaseChat) => {
    if (isFounder) {
      return chat.investorName || `Investor ${chat.investorId.substring(0, 5)}...`;
    } else {
      return chat.startupName || `Startup ${chat.startupId.substring(0, 5)}...`;
    }
  };
  
  // Get avatar for display
  const getChatAvatar = (chat: FirebaseChat) => {
    return isFounder ? chat.investorAvatar : chat.founderAvatar;
  };
  
  // Handle starting a new chat with a startup
  const handleStartNewChat = async (startupId: string, founderId: string, startupName: string) => {
    if (!user) return;
    
    try {
      // Create a new chat in Firebase
      const chatsRef = ref(database, "chats");
      const newChatRef = push(chatsRef);
      const chatId = newChatRef.key as string;
      
      // Set up the chat data
      await set(newChatRef, {
        founderId: String(founderId),
        investorId: String(user.id),
        startupId: String(startupId),
        startupName: startupName,
        founderName: "Founder",
        investorName: user.username || "Investor",
        founderAvatar: "",
        investorAvatar: user.profilePicture || "",
        timestamp: Date.now(),
        founderUnread: 0,
        investorUnread: 0,
        lastMessage: "",
        lastAccessed: {
          [user.id]: Date.now()
        }
      });
      
      // Navigate to the new chat
      setLocation(`/chat/${chatId}`);
      onSelectChat(chatId);
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };
  
  return (
    <Card className="md:col-span-1">
      <CardHeader>
        <CardTitle>Conversations</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* For investors: Show all startups they can message */}
            {!isFounder && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Available Startups</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRefreshStartups}
                    disabled={loadingStartups}
                  >
                    {loadingStartups ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
                {loadingStartups ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : allStartups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No startups available</p>
                ) : (
                  <ScrollArea className="h-[20vh]">
                    <div className="space-y-2">
                      {allStartups.map((startup) => {
                        // Check if there's already a chat with this startup
                        const existingChat = chats.find(
                          chat => String(chat.startupId) === String(startup.id)
                        );
                        
                        if (existingChat) {
                          return null; // Skip if chat already exists
                        }
                        
                        return (
                          <button
                            key={startup.id}
                            className="w-full text-left p-3 rounded-lg transition-colors flex items-start hover:bg-muted"
                            onClick={() => handleStartNewChat(
                              startup.id.toString(),
                              startup.founderId.toString(),
                              startup.name
                            )}
                          >
                            <Avatar className="h-10 w-10 mr-3 mt-1">
                              {startup.logo ? (
                                <AvatarImage src={startup.logo} />
                              ) : null}
                              <AvatarFallback>
                                {startup.name.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">
                                {startup.name}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                Click to start a conversation
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
            
            {/* Show existing chats */}
            <h3 className="text-sm font-medium mb-2">
              {isFounder ? "Messages from Investors" : "Your Conversations"}
            </h3>
            
            {chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground">
                  {isFounder 
                    ? "No messages from investors yet." 
                    : "No conversations yet. Start by connecting with startups."}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[40vh]">
                <div className="space-y-2">
                  {chats.map((chat) => {
                    const unreadCount = isFounder ? chat.founderUnread : chat.investorUnread;
                    return (
                      <button
                        key={chat.id}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-start ${
                          activeChatId === chat.id 
                            ? "bg-primary/10 border border-primary" 
                            : "hover:bg-muted"
                        }`}
                        onClick={() => onSelectChat(chat.id)}
                      >
                        <Avatar className="h-10 w-10 mr-3 mt-1">
                          {getChatAvatar(chat) ? (
                            <AvatarImage src={getChatAvatar(chat)} />
                          ) : null}
                          <AvatarFallback>
                            {getChatName(chat).substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium flex items-center gap-2">
                            {getChatName(chat)}
                            {unreadCount && unreadCount > 0 && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                                {unreadCount}
                              </Badge>
                            )}
                          </div>
                          {chat.lastMessage && (
                            <div className="text-sm text-muted-foreground truncate">
                              {chat.lastMessage}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatList; 