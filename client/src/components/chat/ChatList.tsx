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
import { useStartups } from "@/hooks/useStartups";

interface ChatListProps {
  onSelectChat: (chatId: string) => void;
  activeChatId?: string;
}

interface MongoChat {
  id: string | number;
  founderId: string | number;
  investorId: string | number;
  startupId: string | number;
  startupName?: string;
  founderName?: string;
  investorName?: string;
  founderAvatar?: string;
  investorAvatar?: string;
  lastMessage?: string;
  timestamp?: number;
  founderUnread?: number;
  investorUnread?: number;
  createdAt?: Date | null;
}

const ChatList = ({ onSelectChat, activeChatId }: ChatListProps) => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [chats, setChats] = useState<MongoChat[]>([]);
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
  
  // Load user's chats from MongoDB
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    
    // Function to fetch chats from API
    const fetchChats = async () => {
      try {
        // Get all chats from MongoDB API
        const response = await fetch('/api/chats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch chats');
        }
        
        const data = await response.json();
        
        if (!data || !data.chats || !Array.isArray(data.chats)) {
          setChats([]);
          setLoading(false);
          return;
        }
        
        // Filter chats where user is a participant
        const chatList = data.chats.filter((chat: MongoChat) => {
          // Convert IDs to strings for comparison to handle both number and string types
          const userId = String(user.id);
          const founderId = String(chat.founderId);
          const investorId = String(chat.investorId);
          
          return isFounder 
            ? founderId === userId
            : investorId === userId;
        });
        
        // Sort by timestamp (most recent first)
        chatList.sort((a: MongoChat, b: MongoChat) => {
          const timeA = a.timestamp || 0;
          const timeB = b.timestamp || 0;
          return timeB - timeA;
        });
        
        setChats(chatList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching chats:', error);
        setChats([]);
        setLoading(false);
      }
    };
    
    // Fetch chats initially
    fetchChats();
    
    // Poll for updates every 10 seconds
    const intervalId = setInterval(fetchChats, 10000);
    
    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [user, isFounder]);
  
  // Format chat name for display
  const getChatName = (chat: MongoChat) => {
    if (isFounder) {
      if (chat.investorName) {
        return chat.investorName;
      } else if (chat.investorId) {
        // Make sure investorId is a string before using substring
        const investorIdStr = String(chat.investorId);
        return `Investor ${investorIdStr.substring(0, 5)}...`;
      } else {
        return "Investor";
      }
    } else {
      if (chat.startupName) {
        return chat.startupName;
      } else if (chat.startupId) {
        // Make sure startupId is a string before using substring
        const startupIdStr = String(chat.startupId);
        return `Startup ${startupIdStr.substring(0, 5)}...`;
      } else {
        return "Startup";
      }
    }
  };
  
  // Get avatar for display
  const getChatAvatar = (chat: MongoChat) => {
    return isFounder ? chat.investorAvatar : chat.founderAvatar;
  };
  
  // Handle starting a new chat with a startup
  const handleStartNewChat = async (startupId: string, founderId: string, startupName: string) => {
    if (!user) return;
    
    try {
      // Create a new chat in MongoDB using API
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
          lastMessage: ""
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create chat');
      }
      
      const chatData = await response.json();
      const chatId = chatData.id || chatData.chat?.id;
      
      if (!chatId) {
        throw new Error('No chat ID returned from API');
      }
      
      // Navigate to the new chat
      setLocation(`/chat/${chatId}`);
      onSelectChat(String(chatId));
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
                                {(startup?.name || "ST").substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">
                                {startup?.name || "Startup"}
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