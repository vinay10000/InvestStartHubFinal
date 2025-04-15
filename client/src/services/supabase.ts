import supabase from '../lib/supabase';
import { Database } from '../types/supabase';

// User types
type User = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

// Startup types
type Startup = Database['public']['Tables']['startups']['Row'];
type StartupInsert = Database['public']['Tables']['startups']['Insert'];
type StartupUpdate = Database['public']['Tables']['startups']['Update'];

// Document types
type Document = Database['public']['Tables']['documents']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'];

// Transaction types
type Transaction = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

// Chat types
type Chat = Database['public']['Tables']['chats']['Row'];
type ChatInsert = Database['public']['Tables']['chats']['Insert'];

// Message types
type Message = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// User operations
export const createUser = async (user: UserInsert): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  
  return data;
};

export const getUserByAuthId = async (authId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .single();
  
  if (error) {
    console.error('Error getting user by auth ID:', error);
    return null;
  }
  
  return data;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
  
  return data;
};

export const updateUser = async (id: string, updates: UserUpdate): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating user:', error);
    return null;
  }
  
  return data;
};

// Startup operations
export const createStartup = async (startup: StartupInsert): Promise<Startup | null> => {
  const { data, error } = await supabase
    .from('startups')
    .insert(startup)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating startup:', error);
    return null;
  }
  
  return data;
};

export const getStartups = async (): Promise<Startup[]> => {
  const { data, error } = await supabase
    .from('startups')
    .select('*');
  
  if (error) {
    console.error('Error getting startups:', error);
    return [];
  }
  
  return data || [];
};

export const getStartupsByFounderId = async (founderId: string): Promise<Startup[]> => {
  const { data, error } = await supabase
    .from('startups')
    .select('*')
    .eq('founder_id', founderId);
  
  if (error) {
    console.error('Error getting startups by founder ID:', error);
    return [];
  }
  
  return data || [];
};

export const getStartupById = async (id: string): Promise<Startup | null> => {
  const { data, error } = await supabase
    .from('startups')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error getting startup by ID:', error);
    return null;
  }
  
  return data;
};

export const updateStartup = async (id: string, updates: StartupUpdate): Promise<Startup | null> => {
  const { data, error } = await supabase
    .from('startups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating startup:', error);
    return null;
  }
  
  return data;
};

// Document operations
export const createDocument = async (document: DocumentInsert): Promise<Document | null> => {
  const { data, error } = await supabase
    .from('documents')
    .insert(document)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating document:', error);
    return null;
  }
  
  return data;
};

export const getDocumentsByStartupId = async (startupId: string): Promise<Document[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('startup_id', startupId);
  
  if (error) {
    console.error('Error getting documents by startup ID:', error);
    return [];
  }
  
  return data || [];
};

// Transaction operations
export const createTransaction = async (transaction: TransactionInsert): Promise<Transaction | null> => {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating transaction:', error);
    return null;
  }
  
  return data;
};

export const getTransactionsByStartupId = async (startupId: string): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('startup_id', startupId);
  
  if (error) {
    console.error('Error getting transactions by startup ID:', error);
    return [];
  }
  
  return data || [];
};

export const getTransactionsByInvestorId = async (investorId: string): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('investor_id', investorId);
  
  if (error) {
    console.error('Error getting transactions by investor ID:', error);
    return [];
  }
  
  return data || [];
};

// Chat operations
export const createChat = async (chat: ChatInsert): Promise<Chat | null> => {
  const { data, error } = await supabase
    .from('chats')
    .insert(chat)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating chat:', error);
    return null;
  }
  
  return data;
};

export const getChatsByUserId = async (userId: string, role: 'founder' | 'investor'): Promise<Chat[]> => {
  const field = role === 'founder' ? 'founder_id' : 'investor_id';
  
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq(field, userId);
  
  if (error) {
    console.error(`Error getting chats by ${role} ID:`, error);
    return [];
  }
  
  return data || [];
};

export const getChatById = async (id: string): Promise<Chat | null> => {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error getting chat by ID:', error);
    return null;
  }
  
  return data;
};

// Message operations
export const createMessage = async (message: MessageInsert): Promise<Message | null> => {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating message:', error);
    return null;
  }
  
  return data;
};

export const getMessagesByChatId = async (chatId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error getting messages by chat ID:', error);
    return [];
  }
  
  return data || [];
};

// Real-time subscriptions
export const subscribeToMessages = (
  chatId: string,
  callback: (message: Message) => void
): (() => void) => {
  const subscription = supabase
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      },
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const subscribeToTransactions = (
  startupId: string,
  callback: (transaction: Transaction) => void
): (() => void) => {
  const subscription = supabase
    .channel(`transactions:${startupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `startup_id=eq.${startupId}`
      },
      (payload) => {
        callback(payload.new as Transaction);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};