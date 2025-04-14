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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { formatDateTime } from "@/lib/utils";

interface ChatInterfaceProps {
  chatId: number;
  currentUserId: number;
  isFounder: boolean;
}

interface Message {
  id: string;
  senderId: number;
  content: string;
  createdAt: string;
}

const ChatInterface = ({ chatId, currentUserId, isFounder }: ChatInterfaceProps) => {
  const [message, setMessage] = useState("");
  const { sendMessage, useRealtimeMessages } = useChat();
  const sendMessageMutation = sendMessage();
  const { messages, loading } = useRealtimeMessages(chatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    try {
      await sendMessageMutation.mutateAsync({
        chatId,
        senderId: currentUserId,
        content: message,
      });
      
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
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

  return (
    <>
      <CardHeader className="bg-gray-50 border-b">
        <CardTitle className="text-lg">
          {isFounder ? "Conversation with Investor" : "Conversation with Startup Founder"}
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
                {messages.map((msg: Message) => {
                  const isCurrentUser = msg.senderId === currentUserId;
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-[80%] ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarFallback className={isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}>
                            {isCurrentUser ? 'You' : isFounder ? 'Inv' : 'Fou'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {isCurrentUser ? 'You' : isFounder ? 'Investor' : 'Founder'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(msg.createdAt)}
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
              disabled={sendMessageMutation.isPending}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
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
