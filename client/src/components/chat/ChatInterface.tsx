import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send } from "lucide-react";
import { database } from "@/firebase/config";
import { ref, onValue, push, set, serverTimestamp, update } from "firebase/database";

export interface ChatInterfaceProps {
  chatId: string;
  otherUserId: string;
  otherUserName?: string;
  otherUserAvatar?: string;
}

interface FirebaseMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
}

const ChatInterface = ({ chatId, otherUserId, otherUserName, otherUserAvatar }: ChatInterfaceProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userRole = user?.role || localStorage.getItem('user_role') || 'investor';
  
  // Load messages from Firebase
  useEffect(() => {
    if (!chatId) return;
    
    setLoading(true);
    
    // Reference to messages for this chat
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    
    // Listen for message updates
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMessages([]);
        setLoading(false);
        return;
      }
      
      // Convert object to array and sort by timestamp
      const messageList = Object.entries(data).map(([id, messageData]: [string, any]) => ({
        id,
        ...messageData
      })).sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(messageList);
      setLoading(false);
      
      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [chatId]);
  
  // Mark messages as read when chat is opened
  useEffect(() => {
    if (!chatId || !user) return;
    
    const chatRef = ref(database, `chats/${chatId}`);
    
    // Update unread count based on user role
    if (user.role === "founder") {
      update(chatRef, { founderUnread: 0 });
    } else {
      update(chatRef, { investorUnread: 0 });
    }
  }, [chatId, user]);
  
  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;
    
    try {
      setSending(true);
      
      const messagesRef = ref(database, `chats/${chatId}/messages`);
      const newMessageRef = push(messagesRef);
      
      const messageData = {
        senderId: user.id,
        text: newMessage.trim(),
        timestamp: serverTimestamp()
      };
      
      await set(newMessageRef, messageData);
      
      // Update last message and unread count
      const chatRef = ref(database, `chats/${chatId}`);
      const updates: Record<string, any> = {
        lastMessage: newMessage.trim(),
        timestamp: serverTimestamp()
      };
      
      // Increment unread count for the other user
      if (user.role === "founder") {
        updates.investorUnread = (updates.investorUnread || 0) + 1;
      } else {
        updates.founderUnread = (updates.founderUnread || 0) + 1;
      }
      
      await update(chatRef, updates);
      
      // Clear input
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };
  
  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Handle typing indicator
  const handleTyping = () => {
    if (!chatId || !user) return;
    
    const typingRef = ref(database, `chats/${chatId}/typing/${user.id}`);
    set(typingRef, Date.now());
  };
  
  // Listen for typing indicators
  useEffect(() => {
    if (!chatId || !otherUserId) return;
    
    const typingRef = ref(database, `chats/${chatId}/typing/${otherUserId}`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        setTypingIndicator(true);
        // Clear typing indicator after 3 seconds
        setTimeout(() => setTypingIndicator(false), 3000);
      } else {
        setTypingIndicator(false);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [chatId, otherUserId]);
  
  return (
    <Card className="h-[80vh] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center">
          <Avatar className="h-10 w-8 mr-3">
            {otherUserAvatar ? (
              <AvatarImage src={otherUserAvatar} alt={otherUserName || "User"} />
            ) : null}
            <AvatarFallback>
              {otherUserName?.substring(0, 2) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">
              {otherUserName || (userRole === "founder" ? "Investor" : "Founder")}
            </CardTitle>
            <CardDescription>
              {otherUserName ? "Chat participant" : "Chat participant"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 flex flex-col">
        {loading ? (
          <div className="flex-1 p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => {
                  const isCurrentUser = message.senderId === String(user?.id);
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isCurrentUser && (
                        <Avatar className="h-8 w-8 mr-2">
                          {otherUserAvatar ? (
                            <AvatarImage src={otherUserAvatar} alt={otherUserName || "User"} />
                          ) : null}
                          <AvatarFallback>
                            {otherUserName?.substring(0, 2) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div 
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isCurrentUser 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {typingIndicator && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{otherUserName || "User"} is typing...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onInput={handleTyping}
                  disabled={sending || loading || !user}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending || loading || !user}
                >
                  {sending ? (
                    <Skeleton className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatInterface;