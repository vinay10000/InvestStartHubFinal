export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_id: string | null
          username: string
          email: string
          password: string
          role: 'founder' | 'investor'
          wallet_address: string | null
          profile_picture: string | null
          created_at: string
        }
        Insert: {
          id?: string
          auth_id?: string | null
          username: string
          email: string
          password: string
          role: 'founder' | 'investor'
          wallet_address?: string | null
          profile_picture?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          auth_id?: string | null
          username?: string
          email?: string
          password?: string
          role?: 'founder' | 'investor'
          wallet_address?: string | null
          profile_picture?: string | null
          created_at?: string
        }
      }
      startups: {
        Row: {
          id: string
          founder_id: string
          name: string
          description: string
          pitch: string
          investment_stage: string
          category: string | null
          funding_goal: string | null
          funding_goal_eth: string | null
          current_funding: string | null
          logo_url: string | null
          website_url: string | null
          upi_id: string | null
          upi_qr_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          name: string
          description: string
          pitch: string
          investment_stage: string
          category?: string | null
          funding_goal?: string | null
          funding_goal_eth?: string | null
          current_funding?: string | null
          logo_url?: string | null
          website_url?: string | null
          upi_id?: string | null
          upi_qr_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          name?: string
          description?: string
          pitch?: string
          investment_stage?: string
          category?: string | null
          funding_goal?: string | null
          funding_goal_eth?: string | null
          current_funding?: string | null
          logo_url?: string | null
          website_url?: string | null
          upi_id?: string | null
          upi_qr_code?: string | null
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          startup_id: string
          name: string
          type: 'pitch_deck' | 'financial_report' | 'investor_agreement' | 'risk_disclosure'
          file_url: string
          file_id: string | null
          file_name: string | null
          mime_type: string | null
          file_size: number | null
          created_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          name: string
          type: 'pitch_deck' | 'financial_report' | 'investor_agreement' | 'risk_disclosure'
          file_url: string
          file_id?: string | null
          file_name?: string | null
          mime_type?: string | null
          file_size?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          name?: string
          type?: 'pitch_deck' | 'financial_report' | 'investor_agreement' | 'risk_disclosure'
          file_url?: string
          file_id?: string | null
          file_name?: string | null
          mime_type?: string | null
          file_size?: number | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          startup_id: string
          investor_id: string
          amount: string
          payment_method: 'metamask' | 'upi'
          transaction_id: string | null
          status: 'pending' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          investor_id: string
          amount: string
          payment_method: 'metamask' | 'upi'
          transaction_id?: string | null
          status: 'pending' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          investor_id?: string
          amount?: string
          payment_method?: 'metamask' | 'upi'
          transaction_id?: string | null
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          founder_id: string
          investor_id: string
          startup_id: string
          created_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          investor_id: string
          startup_id: string
          created_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          investor_id?: string
          startup_id?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          sender_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          sender_id?: string
          content?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}