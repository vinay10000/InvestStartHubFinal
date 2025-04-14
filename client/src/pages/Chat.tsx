import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import ChatInterface from "@/components/chat/ChatInterface";

const Chat = () => {
  const { id } = useParams();
  const chatId = id ? parseInt(id) : undefined;
  const { user } = useAuth();
  const { getChats, getChat } = useChat();

  const [activeChat, setActiveChat] = useState<number | undefined>(chatId);
  
  const { data: chatsData, isLoading: chatsLoading } = getChats(user?.id || 0, user?.role || "investor");
  const { data: activeChatData, isLoading: activeChatLoading } = getChat(activeChat || 0);
  
  const chats = chatsData?.chats || [];
  const activeFounderId = activeChatData?.chat?.founderId;
  const activeInvestorId = activeChatData?.chat?.investorId;
  const activeStartupId = activeChatData?.chat?.startupId;

  // Determine if user is the founder or investor in this chat
  const isFounder = user?.role === "founder";
  const isChatParticipant = 
    (isFounder && activeFounderId === user?.id) || 
    (!isFounder && activeInvestorId === user?.id);

  useEffect(() => {
    if (chatId && !activeChatLoading && !activeChatData) {
      // Invalid chat ID, reset
      setActiveChat(undefined);
    }
  }, [chatId, activeChatLoading, activeChatData]);

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
            {chatsLoading ? (
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
                <div className="space-y-4">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        activeChat === chat.id 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setActiveChat(chat.id)}
                    >
                      <div className="font-medium">
                        {isFounder 
                          ? `Investor #${chat.investorId}` 
                          : `Startup #${chat.startupId}`}
                      </div>
                      <div className="text-sm truncate">
                        {isFounder 
                          ? "Discuss your startup with this investor" 
                          : "Discuss investment opportunities"}
                      </div>
                    </button>
                  ))}
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
              currentUserId={user?.id || 0} 
              isFounder={isFounder}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default Chat;
