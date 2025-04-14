import { useState, useEffect, useRef } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Clock, CheckCheck, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { database } from "@/firebase/config";
import { ref, onValue, push, set, serverTimestamp, update, get } from "firebase/database";

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
  read?: boolean;
  delivered?: boolean;
}

const ChatInterface = ({ chatId, otherUserInfo }: ChatInterfaceProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userRole = user?.role || localStorage.getItem('user_role') || 'investor';
  const unreadCountField = userRole === 'founder' ? 'founderUnread' : 'investorUnread';
  const otherUnreadField = userRole === 'founder' ? 'investorUnread' : 'founderUnread';

  // Mark messages as read when the chat is opened
  useEffect(() => {
    if (!chatId || !user) return;
    
    // Update the unread count for the current user
    const chatRef = ref(database, `chats/${chatId}`);
    update(chatRef, {
      [unreadCountField]: 0, // Reset unread count for current user
      lastAccessed: {
        [user.id]: Date.now() // Update last accessed timestamp
      }
    });
    
    // Mark all messages from the other user as read
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    get(messagesRef).then((snapshot) => {
      if (snapshot.exists()) {
        const updates: Record<string, any> = {};
        
        snapshot.forEach((childSnapshot) => {
          const msg = childSnapshot.val();
          // Only mark messages from the other user as read
          if (msg.senderId !== user.id && !msg.read) {
            updates[`${childSnapshot.key}/read`] = true;
          }
        });
        
        // Update all messages at once if there are any updates
        if (Object.keys(updates).length > 0) {
          update(messagesRef, updates);
        }
      }
    });
  }, [chatId, user, unreadCountField]);
  
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
          const timeA = typeof a.timestamp === 'number' ? a.timestamp : Date.parse(a.timestamp || Date.now());
          const timeB = typeof b.timestamp === 'number' ? b.timestamp : Date.parse(b.timestamp || Date.now());
          return timeA - timeB;
        });
        
        setMessages(messageList);
        
        // Mark all messages from other user as read
        if (user) {
          const updates: Record<string, any> = {};
          
          messageList.forEach((msg) => {
            // Only mark messages from the other user as read
            if (msg.senderId !== user.id && !msg.read) {
              updates[`${msg.id}/read`] = true;
            }
          });
          
          // Update all messages at once if there are any updates
          if (Object.keys(updates).length > 0) {
            update(messagesRef, updates);
            
            // Also update the unread counter for this chat
            update(ref(database, `chats/${chatId}`), {
              [unreadCountField]: 0 // Reset unread count
            });
          }
        }
      } else {
        setMessages([]);
      }
      setLoading(false);
    });
    
    // Typing indicator listener
    const typingRef = ref(database, `chats/${chatId}/typing/${otherUserInfo?.id || 'other'}`);
    const typingUnsubscribe = onValue(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const typingData = snapshot.val();
        // Check if typing timestamp is recent (within last 5 seconds)
        const isRecentTyping = Date.now() - typingData < 5000;
        setTypingIndicator(isRecentTyping);
      } else {
        setTypingIndicator(false);
      }
    });
    
    // Cleanup
    return () => {
      unsubscribe();
      typingUnsubscribe();
    };
  }, [chatId, user, unreadCountField, otherUserInfo?.id]);

  // Send typing indicator
  const handleTyping = () => {
    if (!user || !chatId) return;
    
    // Update typing status in Firebase
    const typingRef = ref(database, `chats/${chatId}/typing/${user.id}`);
    set(typingRef, Date.now());
  };

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
        read: false,
        delivered: true
      });
      
      // Update chat metadata
      const chatRef = ref(database, `chats/${chatId}`);
      update(chatRef, {
        lastMessage: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        timestamp: serverTimestamp(),
        [otherUnreadField]: (await get(ref(database, `chats/${chatId}/${otherUnreadField}`))).val() + 1 || 1
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
  }, [messages, typingIndicator]);
  
  // Format timestamp for display
  const formatMessageTime = (timestamp: number | string): string => {
    if (!timestamp) return '';
    
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp) 
      : new Date(timestamp);
      
    // Check if message is from today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
      date.getMonth() === today.getMonth() && 
      date.getFullYear() === today.getFullYear();
    
    if (isToday) {
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    }
  };

  // Get message status icon
  const getMessageStatus = (msg: FirebaseMessage, isCurrentUser: boolean) => {
    if (!isCurrentUser) return null;

    if (msg.read) {
      return <CheckCheck className="h-4 w-4 text-blue-500" />;
    } else if (msg.delivered) {
      return <Check className="h-4 w-4 text-gray-400" />;
    } else {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }
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
            {otherUserInfo?.name || (userRole === "founder" ? "Investor" : "Founder")}
          </span>
        </CardTitle>
        <CardDescription>
          {otherUserInfo?.role || "Chat participant"}
        </CardDescription>
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
                            {getMessageStatus(msg, isCurrentUser)}
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
                
                {/* Typing indicator */}
                {typingIndicator && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-2 max-w-[80%]">
                      <Avatar className="h-8 w-8 mt-1">
                        {otherUserInfo?.avatar ? (
                          <AvatarImage src={otherUserInfo.avatar} alt={otherUserInfo.name || "User"} />
                        ) : null}
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          {otherUserInfo?.name?.substring(0, 2) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {otherUserInfo?.name || "User"}
                          </span>
                        </div>
                        <div className="mt-1 p-3 rounded-lg bg-gray-100 text-gray-800">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "600ms" }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
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
              onInput={handleTyping}
              disabled={sending || loading || !user}
              className="min-h-[44px]"
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
