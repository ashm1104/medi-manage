## Packages
@supabase/supabase-js | Supabase client for authentication and database interaction
lucide-react | Beautiful icons for the dashboard
date-fns | Date formatting for tables and inputs
clsx | Utility for conditional class names
tailwind-merge | Utility for merging tailwind classes

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  sans: ["'Inter'", "sans-serif"],
  display: ["'Outfit'", "sans-serif"],
}
Supabase URL and Anon Key are expected in environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
The app assumes standard Supabase Auth flows.
