export const SUPABASE_URL = 'https://wiqvbqsdzienhjmnaonx.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcXZicXNkemllbmhqbW5hb254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzA5NjYsImV4cCI6MjA5MDY0Njk2Nn0.qpJHeH4QHt29dYY4jYueFRTxZkg_f7t7Z2IIcVooOmg';

// Set EXPO_PUBLIC_API_URL in frontend/.env to override (e.g. for production).
// Falls back to local FastAPI dev server when unset.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
