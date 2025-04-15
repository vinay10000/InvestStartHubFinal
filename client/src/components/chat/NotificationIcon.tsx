import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { database } from "@/firebase/config";
import { ref, onValue } from "firebase/database";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";

const NotificationIcon = () => {
  const { user } = useSimpleAuth();
  const [, navigate] = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isFounder = user?.role === "founder" || localStorage.getItem('user_role') === "founder";
  const unreadCountField = isFounder ? 'founderUnread' : 'investorUnread';
  
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Reference to all chats
    const chatsQuery = ref(database, "chats");
    
    // Listen for chat updates
    const unsubscribe = onValue(chatsQuery, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setNotifications([]);
        setUnreadCount(0);
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
      
      // Calculate total unread count
      const totalUnread = chatList.reduce((total, chat) => {
        return total + (chat[unreadCountField] || 0);
      }, 0);
      
      // Get notifications for chats with unread messages
      const notificationItems = chatList
        .filter(chat => chat[unreadCountField] && chat[unreadCountField] > 0)
        .map(chat => ({
          id: chat.id,
          name: isFounder ? chat.investorName || "Investor" : chat.startupName || "Startup",
          avatar: isFounder ? chat.investorAvatar : chat.founderAvatar,
          unreadCount: chat[unreadCountField] || 0,
          lastMessage: chat.lastMessage || "New message",
        }))
        .sort((a, b) => b.unreadCount - a.unreadCount); // Sort by unread count (highest first)
      
      setUnreadCount(totalUnread);
      setNotifications(notificationItems);
      setLoading(false);
    });
    
    return () => {
      unsubscribe();
    };
  }, [user, isFounder, unreadCountField]);

  const handleNotificationClick = (chatId: string) => {
    navigate(`/chat/${chatId}`);
  };

  if (loading || !user) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center px-1 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-4 px-2 text-center text-muted-foreground">
            No unread messages
          </div>
        ) : (
          notifications.map(notification => (
            <DropdownMenuItem 
              key={notification.id}
              className="py-2 cursor-pointer"
              onClick={() => handleNotificationClick(notification.id)}
            >
              <div className="flex items-start w-full">
                <Avatar className="h-8 w-8 mr-2">
                  {notification.avatar ? (
                    <AvatarImage src={notification.avatar} />
                  ) : null}
                  <AvatarFallback>
                    {notification.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{notification.name}</p>
                    <Badge variant="destructive" className="h-5 min-w-[20px] text-xs ml-2">
                      {notification.unreadCount}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {notification.lastMessage}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-center cursor-pointer"
              onClick={() => navigate("/chat")}
            >
              View all messages
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationIcon;