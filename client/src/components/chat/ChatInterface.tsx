import { useState, useEffect, useRef } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { database } from "@/firebase/config";
import { ref, onValue, push, set, serverTimestamp } from "firebase/database";

interface ChatInterfaceProps {
  chatId: string; // Using string for Firebase chat IDs
  otherUserInfo?: {
    id: string;
    name?: string;
    role?: string;
    avatar?: string;
  };
}

interface FirebaseMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: number | string;
  senderName?: string;
  senderAvatar?: string;
}

const ChatInterface = ({ chatId, otherUserInfo }: ChatInterfaceProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Firebase message listener
  useEffect(() => {
    if (!chatId || !user) return;
    
    setLoading(true);
    
    // Reference to the chat messages in Firebase
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    
    // Subscribe to real-time updates
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object of messages to array and sort by timestamp
        const messageList = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }));
        
        // Sort by timestamp
        messageList.sort((a, b) => {
          const timeA = typeof a.timestamp === 'number' ? a.timestamp : Date.parse(a.timestamp);
          const timeB = typeof b.timestamp === 'number' ? b.timestamp : Date.parse(b.timestamp);
          return timeA - timeB;
        });
        
        setMessages(messageList);
      } else {
        setMessages([]);
      }
      setLoading(false);
    });
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [chatId, user]);

  // Send message to Firebase
  const handleSendMessage = async () => {
    if (!message.trim() || !user || !chatId) return;
    
    try {
      setSending(true);
      
      // Create a new message reference
      const newMessageRef = push(ref(database, `chats/${chatId}/messages`));
      
      // Get current timestamp from server
      await set(newMessageRef, {
        senderId: user.id,
        senderName: user.username || 'User',
        senderAvatar: user.profilePicture || '',
        content: message,
        timestamp: serverTimestamp(),
      });
      
      // Clear the input
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  // Format timestamp for display
  const formatMessageTime = (timestamp: number | string): string => {
    if (!timestamp) return '';
    
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp) 
      : new Date(timestamp);
    
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <>
      <CardHeader className="bg-gray-50 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          {otherUserInfo?.avatar && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherUserInfo.avatar} alt={otherUserInfo.name || "User"} />
              <AvatarFallback>{otherUserInfo.name?.substring(0, 2) || "U"}</AvatarFallback>
            </Avatar>
          )}
          <span>
            Conversation with {otherUserInfo?.name || (user?.role === "founder" ? "Investor" : "Founder")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex flex-col h-[60vh]">
        {loading ? (
          <div className="flex-1 p-4 space-y-4">
            <div className="flex items-start space-x-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-3/4 rounded-md" />
              </div>
            </div>
            <div className="flex items-start space-x-2 justify-end">
              <div className="space-y-2 items-end">
                <Skeleton className="h-4 w-24 ml-auto" />
                <Skeleton className="h-16 w-2/3 rounded-md" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p className="mb-2">No messages yet</p>
                  <p className="text-sm">Start the conversation by sending a message below.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isCurrentUser = user && msg.senderId === user.id;
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-[80%] ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Avatar className="h-8 w-8 mt-1">
                          {msg.senderAvatar ? (
                            <AvatarImage src={msg.senderAvatar} alt={msg.senderName || "User"} />
                          ) : null}
                          <AvatarFallback className={isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}>
                            {msg.senderName?.substring(0, 2) || (isCurrentUser ? 'Me' : 'U')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {isCurrentUser ? 'You' : msg.senderName || 'User'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatMessageTime(msg.timestamp)}
                            </span>
                          </div>
                          <div className={`mt-1 p-3 rounded-lg ${
                            isCurrentUser 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        )}
        
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || loading || !user}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!message.trim() || sending || loading || !user}
            >
              {sending ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
};

export default ChatInterface;
