import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ChatInterface from "@/components/chat/ChatInterface";
import { database } from "@/firebase/config";
import { ref, onValue, get, update, push, set, serverTimestamp } from "firebase/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const { id } = useParams();
  const chatId = id;
  console.log("Chat page opened with ID:", chatId);
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [activeChat, setActiveChat] = useState<string | undefined>(chatId);
  const [chats, setChats] = useState<FirebaseChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatData, setActiveChatData] = useState<FirebaseChat | null>(null);
  const [activeChatLoading, setActiveChatLoading] = useState(false);
  const [otherUserInfo, setOtherUserInfo] = useState<{
    id: string;
    name?: string;
    role?: string;
    avatar?: string;
  } | null>(null);
  
  // Check if user is authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/signin');
    }
  }, [user, authLoading, setLocation]);
  
  // Determine if user is the founder or investor
  const isFounder = user?.role === "founder";
  
  // Load user's chats from Firebase
  useEffect(() => {
    if (!user || authLoading) return;
    
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
        return isFounder 
          ? chat.founderId === user.id
          : chat.investorId === user.id;
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
  }, [user, authLoading, isFounder]);
  
  // Load active chat data and other user info
  useEffect(() => {
    if (!activeChat || !user) return;
    
    setActiveChatLoading(true);
    
    // Reference to the selected chat
    const chatRef = ref(database, `chats/${activeChat}`);
    
    // Get chat data
    get(chatRef).then(async (snapshot) => {
      if (snapshot.exists()) {
        const chatData = {
          id: activeChat,
          ...snapshot.val()
        };
        
        setActiveChatData(chatData);
        
        // Determine other user in chat
        const otherUserId = isFounder ? chatData.investorId : chatData.founderId;
        
        // Get other user's info
        const userRef = ref(database, `users/${otherUserId}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          setOtherUserInfo({
            id: otherUserId,
            name: userData.username || "User",
            role: userData.role,
            avatar: userData.profilePicture || null,
          });
        }
        
        // Mark as read for current user
        if (isFounder && chatData.founderUnread && chatData.founderUnread > 0) {
          update(chatRef, { founderUnread: 0 });
        } else if (!isFounder && chatData.investorUnread && chatData.investorUnread > 0) {
          update(chatRef, { investorUnread: 0 });
        }
      } else {
        setActiveChatData(null);
        setOtherUserInfo(null);
      }
      setActiveChatLoading(false);
    }).catch(error => {
      console.error("Error loading active chat:", error);
      setActiveChatData(null);
      setOtherUserInfo(null);
      setActiveChatLoading(false);
    });
  }, [activeChat, user, isFounder]);
  
  // Determine if user is a participant in this chat
  const isChatParticipant = activeChatData 
    ? (isFounder && String(activeChatData.founderId) === String(user?.id)) || 
      (!isFounder && String(activeChatData.investorId) === String(user?.id))
    : false;

  // If active chat ID is invalid, reset
  useEffect(() => {
    if (chatId && !activeChatLoading && !activeChatData) {
      setActiveChat(undefined);
    }
  }, [chatId, activeChatLoading, activeChatData]);

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

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Messages</h1>
      <p className="text-gray-600 mb-8">Communicate with {isFounder ? "investors" : "startup founders"}</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Chat List */}
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
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground">
                  No conversations yet. Start by connecting with {isFounder ? "investors" : "startups"}.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                  {chats.map((chat) => {
                    const unreadCount = isFounder ? chat.founderUnread : chat.investorUnread;
                    return (
                      <button
                        key={chat.id}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-start ${
                          activeChat === chat.id 
                            ? "bg-primary/10 border border-primary" 
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setActiveChat(chat.id)}
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
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="md:col-span-3">
          {!activeChat ? (
            <div className="flex flex-col items-center justify-center h-[70vh] p-6">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
              <p className="text-center text-muted-foreground">
                Choose a conversation from the list to start messaging.
              </p>
            </div>
          ) : activeChatLoading ? (
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-40" />
              </div>
              <Skeleton className="h-[60vh]" />
            </div>
          ) : !isChatParticipant ? (
            <div className="flex flex-col items-center justify-center h-[70vh] p-6">
              <MessageSquare className="h-16 w-16 text-destructive mb-4" />
              <h3 className="text-xl font-medium mb-2">Access Denied</h3>
              <p className="text-center text-muted-foreground">
                You don't have permission to view this conversation.
              </p>
            </div>
          ) : (
            <ChatInterface 
              chatId={activeChat}
              otherUserInfo={otherUserInfo || undefined}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default Chat;
