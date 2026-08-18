import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

export const RECEIPTS_BUCKET = 'receipts';

/** A anon key é pública por design; quem protege o bucket são as policies em `supabase/storage-policies.sql`. */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const missing = [
  !supabaseUrl && 'EXPO_PUBLIC_SUPABASE_URL',
  !supabaseAnonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
].filter(Boolean);

if (missing.length > 0) {
  throw new Error(
    `Supabase não configurado. Faltam as chaves: ${missing.join(', ')}.\n` +
      'Copie .env.example para .env e preencha com os dados do seu projeto, ' +
      'depois reinicie o bundler com: npx expo start --clear'
  );
}

/** Identidade continua sendo o Firebase Auth, isso aqui é só bucket de arquivos. */
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
