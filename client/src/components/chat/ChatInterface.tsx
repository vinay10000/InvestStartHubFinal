import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Paperclip, CheckCircle2, FileIcon, Download, Image as ImageIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

export interface ChatInterfaceProps {
  chatId: string;
  otherUserId: string;
  otherUserName?: string;
  otherUserAvatar?: string;
}

interface MongoMessage {
  id: string | number;
  text: string;
  senderId: string | number;
  timestamp: number;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  readBy?: string[]; // Array of user IDs who read the message
  reactions?: Record<string, string[]>; // Map of reaction emoji to array of user IDs
  chatId?: string | number;
  createdAt?: Date | null;
}

const ChatInterface = ({ chatId, otherUserId, otherUserName, otherUserAvatar }: ChatInterfaceProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MongoMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userRole = user?.role || localStorage.getItem('user_role') || 'investor';
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load messages from MongoDB
  useEffect(() => {
    if (!chatId) return;
    
    setLoading(true);
    
    // Function to fetch messages from API
    const fetchMessages = async () => {
      try {
        // Fetch messages from MongoDB API
        const response = await fetch(`/api/chats/${chatId}/messages`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        
        const data = await response.json();
        
        if (!data || !data.messages) {
          setMessages([]);
          setLoading(false);
          return;
        }
        
        // Sort messages by timestamp (oldest first)
        const messageList = [...data.messages].sort((a: MongoMessage, b: MongoMessage) => {
          const timeA = a.timestamp || 0;
          const timeB = b.timestamp || 0;
          return timeA - timeB;
        });
        
        setMessages(messageList);
        setLoading(false);
        
        // Scroll to bottom
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
        setLoading(false);
      }
    };
    
    // Fetch messages initially
    fetchMessages();
    
    // Poll for new messages every 5 seconds
    const intervalId = setInterval(fetchMessages, 5000);
    
    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [chatId]);
  
  // Mark messages as read when chat is opened
  useEffect(() => {
    if (!chatId || !user) return;
    
    const markAsRead = async () => {
      try {
        // Update unread count using API
        const response = await fetch(`/api/chats/${chatId}/read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user.id,
            userRole: user.role
          })
        });
        
        if (!response.ok) {
          console.error('Failed to mark chat as read');
        }
      } catch (error) {
        console.error('Error marking chat as read:', error);
      }
    };
    
    markAsRead();
  }, [chatId, user]);
  
  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;
    
    try {
      setSending(true);
      
      // Create new message via API
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          senderId: user.id,
          text: newMessage.trim(),
          timestamp: Date.now(),
          chatId: chatId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      // Send message via WebSocket for instant delivery
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        // For real-time notification, send through WebSocket
        socketRef.current.send(JSON.stringify({
          type: 'chat_message',
          chatId,
          senderId: user.id.toString(),
          content: newMessage.trim(),
          timestamp: Date.now()
        }));
        
        // Also stop any typing indicator
        socketRef.current.send(JSON.stringify({
          type: 'typing_indicator',
          chatId,
          senderId: user.id.toString(),
          isTyping: false,
          timestamp: Date.now()
        }));
      }
      
      // Clear input
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again later",
        variant: "destructive"
      });
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
    if (!chatId || !user || !socketRef.current) return;
    
    // Clear previous typing timeout if exists
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing indicator via WebSocket
    if (socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'typing_indicator',
        chatId,
        senderId: user.id.toString(),
        isTyping: true,
        timestamp: Date.now()
      }));
      
      // Set timeout to stop typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'typing_indicator',
            chatId,
            senderId: user.id.toString(),
            isTyping: false,
            timestamp: Date.now()
          }));
        }
      }, 3000);
    }
    
    // Fallback to MongoDB API if WebSocket isn't available
    fetch(`/api/chats/${chatId}/typing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.id,
        isTyping: true,
        timestamp: Date.now()
      })
    }).catch(error => {
      console.error('Error sending typing indicator:', error);
    });
  };
  
  // Setup WebSocket connection
  useEffect(() => {
    if (!chatId || !user) return;
    
    // Setup WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      socketRef.current = socket;
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        switch (data.type) {
          case 'typing_indicator':
            if (data.chatId === chatId && data.senderId !== user.id.toString()) {
              const isTyping = data.isTyping;
              setTypingUsers(prev => ({
                ...prev,
                [data.senderId]: isTyping
              }));
              
              // Auto-clear typing indicator after 3 seconds if still true
              if (isTyping) {
                setTimeout(() => {
                  setTypingUsers(prev => ({
                    ...prev,
                    [data.senderId]: false
                  }));
                }, 3000);
              }
            }
            break;
            
          case 'read_receipt':
            // Handle read receipts
            if (data.messageId) {
              // Update the read status in the UI
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === data.messageId 
                    ? { 
                        ...msg, 
                        readBy: [...(msg.readBy || []), data.userId]
                      } 
                    : msg
                )
              );
            }
            break;
            
          case 'reaction':
            // Handle message reactions
            if (data.messageId && data.emoji) {
              setMessages(prev => 
                prev.map(msg => {
                  if (msg.id === data.messageId) {
                    const reactions = { ...(msg.reactions || {}) };
                    const currentReaction = [...(reactions[data.emoji] || [])];
                    
                    if (data.added) {
                      // Add reaction if not already there
                      if (!currentReaction.includes(data.userId)) {
                        currentReaction.push(data.userId);
                      }
                    } else {
                      // Remove reaction
                      const index = currentReaction.indexOf(data.userId);
                      if (index !== -1) {
                        currentReaction.splice(index, 1);
                      }
                    }
                    
                    // Update the reactions object
                    if (currentReaction.length > 0) {
                      reactions[data.emoji] = currentReaction;
                    } else {
                      delete reactions[data.emoji];
                    }
                    
                    return {
                      ...msg,
                      reactions
                    };
                  }
                  return msg;
                })
              );
            }
            break;
            
          case 'new_message':
            // For demo purposes - in production, you'd likely refresh from the database
            if (data.message && data.message.chatId === chatId) {
              setMessages(prev => [...prev, data.message]);
              
              // Scroll to bottom on new message
              setTimeout(() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }, 100);
            }
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [chatId, user]);
  
  // Listen for typing indicators from MongoDB
  useEffect(() => {
    if (!chatId || !otherUserId) return;
    
    const checkTypingStatus = async () => {
      try {
        const response = await fetch(`/api/chats/${chatId}/typing/${otherUserId}`);
        
        if (!response.ok) {
          return;
        }
        
        const data = await response.json();
        
        if (data && data.isTyping) {
          setTypingIndicator(true);
          // Clear typing indicator after 3 seconds
          setTimeout(() => setTypingIndicator(false), 3000);
        } else {
          setTypingIndicator(false);
        }
      } catch (error) {
        console.error('Error checking typing status:', error);
      }
    };
    
    // Check immediately
    checkTypingStatus();
    
    // And then poll every 2 seconds
    const intervalId = setInterval(checkTypingStatus, 2000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [chatId, otherUserId]);
  
  // Handle file upload
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !chatId || !user) return;
    
    const file = event.target.files[0];
    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;
    
    // Max file size: 10MB
    if (fileSize > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setUploadingFile(true);
      setUploadProgress(0);
      
      // Create a unique file ID
      const fileId = uuidv4();
      
      // Upload to ImageKit through backend
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', `chat_${chatId}_${fileId}`);
      
      // Upload file using fetch with progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/imagekit/upload', true);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      };
      
      xhr.onload = async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          
          try {
            // Send file message using MongoDB API
            const messageResponse = await fetch(`/api/chats/${chatId}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                senderId: user.id,
                text: `Shared a file: ${fileName}`,
                timestamp: Date.now(),
                chatId: chatId,
                fileUrl: response.url,
                fileName: fileName,
                fileType: fileType
              })
            });
            
            if (!messageResponse.ok) {
              throw new Error('Failed to send file message');
            }
            
            // Update chat with last message
            const chatUpdateResponse = await fetch(`/api/chats/${chatId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                lastMessage: `Shared a file: ${fileName}`,
                timestamp: Date.now(),
                // Increment unread count for the other user
                ...(user.role === "founder" 
                  ? { investorUnread: 1 } // Incrementing by 1
                  : { founderUnread: 1 })
              })
            });
            
            if (!chatUpdateResponse.ok) {
              console.error('Failed to update chat last message');
            }
            
            toast({
              title: "File uploaded",
              description: "File has been shared successfully"
            });
          } catch (error) {
            console.error('Error sending file message:', error);
            toast({
              title: "Upload failed",
              description: "Failed to send file message",
              variant: "destructive"
            });
          }
        } else {
          throw new Error("Upload failed");
        }
        
        setUploadingFile(false);
        setUploadProgress(0);
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      
      xhr.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Failed to upload file. Please try again.",
          variant: "destructive"
        });
        
        setUploadingFile(false);
        setUploadProgress(0);
      };
      
      xhr.send(formData);
      
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
      
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };
  
  // Mark message as read
  const markAsRead = async (messageId: string | number) => {
    if (!user || !chatId) return;
    
    try {
      // Send read status update to MongoDB API
      const response = await fetch(`/api/chats/${chatId}/messages/${messageId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id.toString(),
          timestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        console.error('Failed to mark message as read');
        return;
      }
      
      // Then, send read receipt via WebSocket for real-time notification
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'read_receipt',
          messageId,
          userId: user.id.toString(),
          chatId,
          timestamp: Date.now()
        }));
      }
      
      // Update local message state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                readBy: [...(msg.readBy || []), user.id.toString()]
              } 
            : msg
        )
      );
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };
  
  // Handle message reactions
  const handleReaction = async (messageId: string | number, emoji: string) => {
    if (!user || !chatId) return;
    
    try {
      // Find the current message in our state
      const message = messages.find(msg => msg.id === messageId);
      if (!message) return;
      
      const reactions: Record<string, string[]> = message.reactions || {};
      const currentReaction: string[] = reactions[emoji] || [];
      
      // Check if user has already reacted with this emoji
      const userIdStr = user.id.toString();
      const hasReacted = currentReaction.includes(userIdStr);
      
      // Send reaction update to MongoDB API
      const response = await fetch(`/api/chats/${chatId}/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userIdStr,
          emoji,
          add: !hasReacted,
          timestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        console.error('Failed to update message reaction');
        return;
      }
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => {
          if (msg.id === messageId) {
            const updatedReactions = { ...(msg.reactions || {}) };
            const reactionUsers = [...(updatedReactions[emoji] || [])];
            
            if (hasReacted) {
              // Remove user's reaction
              const filteredUsers = reactionUsers.filter(id => id !== userIdStr);
              if (filteredUsers.length > 0) {
                updatedReactions[emoji] = filteredUsers;
              } else {
                delete updatedReactions[emoji];
              }
            } else {
              // Add user's reaction
              updatedReactions[emoji] = [...reactionUsers, userIdStr];
            }
            
            return {
              ...msg,
              reactions: updatedReactions
            };
          }
          return msg;
        })
      );
      
      // Notify via WebSocket
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'reaction',
          messageId,
          userId: userIdStr,
          chatId,
          emoji,
          added: !hasReacted,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error("Error handling reaction:", error);
    }
  };
  
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
                        className={`max-w-[70%] rounded-lg p-3 group ${
                          isCurrentUser 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}
                        onMouseEnter={() => markAsRead(message.id)}
                      >
                        <p className="text-sm">{message.text}</p>
                        
                        {/* File attachment */}
                        {message.fileUrl && (
                          <div className="mt-2 border rounded p-2 bg-background/50">
                            {message.fileType?.startsWith('image/') ? (
                              <div className="space-y-2">
                                <a 
                                  href={message.fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img 
                                    src={message.fileUrl} 
                                    alt={message.fileName || "Image"} 
                                    className="max-w-full max-h-40 rounded object-cover"
                                  />
                                </a>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs truncate max-w-[120px]">{message.fileName}</span>
                                  <a 
                                    href={message.fileUrl} 
                                    download={message.fileName}
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <FileIcon className="h-4 w-4" />
                                  <span className="text-xs truncate max-w-[120px]">{message.fileName}</span>
                                </div>
                                <a 
                                  href={message.fileUrl} 
                                  download={message.fileName}
                                  className="text-primary hover:text-primary/80"
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Message reactions */}
                        {message.reactions && Object.keys(message.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {Object.entries(message.reactions).map(([emoji, users]: [string, string[]]) => (
                              <div 
                                key={emoji} 
                                className={`
                                  text-xs rounded-full px-1.5 py-0.5 
                                  ${users.includes(String(user?.id)) 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted hover:bg-primary/10'
                                  } 
                                  cursor-pointer inline-flex items-center
                                `}
                                onClick={() => handleReaction(message.id, emoji)}
                              >
                                <span>{emoji}</span>
                                <span className="ml-1">{users.length}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Reaction buttons */}
                        <div 
                          className="flex items-center space-x-1 mt-1 -mb-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {['👍', '❤️', '😂'].map((emoji) => (
                            <button
                              key={emoji}
                              className="text-xs hover:bg-primary/10 rounded-full px-1.5 py-0.5"
                              onClick={() => handleReaction(message.id, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        
                        {/* Message footer */}
                        <div className="flex items-center justify-between text-xs opacity-70 mt-1">
                          <span>
                            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : ''}
                          </span>
                          
                          {/* Message status indicator */}
                          <div className="flex items-center">
                            {isCurrentUser && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="ml-1">
                                      {message.readBy && message.readBy.includes(String(otherUserId)) ? (
                                        <CheckCircle2 className="h-3 w-3 text-primary" />
                                      ) : (
                                        <CheckCircle2 className="h-3 w-3 text-muted-foreground/60" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {message.readBy && message.readBy.includes(String(otherUserId)) 
                                        ? "Read" 
                                        : "Sent"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
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
              {/* File upload progress */}
              {uploadingFile && (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Uploading file...</span>
                    <span className="text-xs font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
              
              {/* Message input with attachment button */}
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onInput={handleTyping}
                    disabled={sending || uploadingFile || loading || !user}
                    className="pr-10"
                  />
                  
                  {/* Hidden file input */}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={uploadingFile || sending}
                  />
                  
                  {/* File attachment button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile || sending || loading || !user}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending || uploadingFile || loading || !user}
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