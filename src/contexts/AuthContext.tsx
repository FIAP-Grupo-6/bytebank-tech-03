import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { auth, db } from '@/lib/firebase';
import { toFriendlyMessage } from '@/lib/errors';
import type { AppUser } from '@/types';

interface AuthContextValue {
  user: AppUser | null;
  /**
   * `true` só até o Firebase restaurar a sessão do AsyncStorage.
   * O roteador espera por isso antes de decidir a tela inicial. Sem essa
   * espera o app pisca a tela de login antes de abrir o dashboard.
   */
  initializing: boolean;
  /** `true` durante login/cadastro/logout. */
  submitting: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAppUser(user: User): AppUser {
  return {
    uid: user.uid,
    email: user.email ?? '',
    // Quem cadastrou antes do campo de nome existir cai no trecho antes do @.
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Você',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? toAppUser(firebaseUser) : null);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      throw new Error(toFriendlyMessage(error, 'Não foi possível entrar.'));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const signUp = useCallback(
    async (displayName: string, email: string, password: string) => {
      setSubmitting(true);
      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        const name = displayName.trim();

        await Promise.all([
          updateProfile(
            credential.user,
            { displayName: name }
          ),
          setDoc(
            doc(db, 'users', credential.user.uid),
            {
              displayName: name,
              email: email.trim(),
              createdAt: serverTimestamp(),
            }
          )
        ])

        // `updateProfile` não redispara onAuthStateChanged, então o nome só
        // apareceria depois de um reload sem este set explícito.
        setUser({ uid: credential.user.uid, email: email.trim(), displayName: name });
      } catch (error) {
        throw new Error(toFriendlyMessage(error, 'Não foi possível criar a conta.'));
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    setSubmitting(true);
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw new Error(toFriendlyMessage(error, 'Não foi possível sair.'));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      throw new Error(
        toFriendlyMessage(error, 'Não foi possível enviar o e-mail de redefinição.')
      );
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, submitting, signIn, signUp, signOut, resetPassword }),
    [user, initializing, submitting, signIn, signUp, signOut, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  }
  return context;
}
