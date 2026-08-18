import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';

/**
 * Rota raiz: só decide o destino. O `_layout` já esperou a sessão carregar,
 * então aqui `user` é confiável.
 */
export default function Index() {
  const { user } = useAuth();
  return <Redirect href={user ? '/dashboard' : '/login'} />;
}
