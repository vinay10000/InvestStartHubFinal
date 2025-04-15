import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
const supabaseUrl = import.meta.env.SUPABASE_URL || '';
const supabaseKey = import.meta.env.SUPABASE_API_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials are missing. Please set SUPABASE_URL and SUPABASE_API_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to create startup in Supabase
export const createSupabaseStartup = async (startupData: any) => {
  const { data, error } = await supabase
    .from('startups')
    .insert([startupData])
    .select();
  
  if (error) {
    console.error('Error creating startup in Supabase:', error);
    throw error;
  }

  return data?.[0];
};

// Helper function to get all startups from Supabase
export const getSupabaseStartups = async () => {
  const { data, error } = await supabase
    .from('startups')
    .select('*');
  
  if (error) {
    console.error('Error fetching startups from Supabase:', error);
    throw error;
  }

  return data || [];
};

// Helper function to get a startup by ID from Supabase
export const getSupabaseStartupById = async (id: string | number) => {
  const { data, error } = await supabase
    .from('startups')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching startup ${id} from Supabase:`, error);
    throw error;
  }

  return data;
};

// Helper function to update a startup in Supabase
export const updateSupabaseStartup = async (id: string | number, startupData: any) => {
  const { data, error } = await supabase
    .from('startups')
    .update(startupData)
    .eq('id', id)
    .select();
  
  if (error) {
    console.error(`Error updating startup ${id} in Supabase:`, error);
    throw error;
  }

  return data?.[0];
};

// Helper function to create a document in Supabase
export const createSupabaseDocument = async (documentData: any) => {
  const { data, error } = await supabase
    .from('documents')
    .insert([documentData])
    .select();
  
  if (error) {
    console.error('Error creating document in Supabase:', error);
    throw error;
  }

  return data?.[0];
};

// Helper function to get documents for a startup from Supabase
export const getSupabaseDocumentsByStartupId = async (startupId: string | number) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('startupId', startupId);
  
  if (error) {
    console.error(`Error fetching documents for startup ${startupId} from Supabase:`, error);
    throw error;
  }

  return data || [];
};

// Helper function to delete a document from Supabase
export const deleteSupabaseDocument = async (id: string | number) => {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error(`Error deleting document ${id} from Supabase:`, error);
    throw error;
  }

  return true;
};