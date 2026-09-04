import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// `expo export` statically renders the web target in Node, where there is no
// window and AsyncStorage's localStorage backing throws the moment the auth
// client tries to restore a session. On the server there is no session to
// restore, so skip storage and persistence there. React Native defines
// `window`, so native and the browser are unaffected — this only matters
// during `eas update` / `expo export`, which bundle every platform.
const isServerRender = typeof window === 'undefined'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isServerRender ? undefined : AsyncStorage,
    autoRefreshToken: !isServerRender,
    persistSession: !isServerRender,
    detectSessionInUrl: false,
  },
})
