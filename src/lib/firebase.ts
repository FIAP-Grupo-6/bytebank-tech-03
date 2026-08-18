import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * `getReactNativePersistence` existe no build React Native do @firebase/auth
 * (`dist/rn/index.js`) e é reexportado por `firebase/auth`, mas não aparece nos
 * tipos públicos do pacote (`auth-public.d.ts`). O Metro resolve em runtime pela
 * condição de export "react-native"; aqui só ensinamos o tipo ao TypeScript.
 *
 * Optamos por um cast pontual em vez de `declare module 'firebase/auth'`: num
 * arquivo .d.ts sem import/export de topo, aquela declaração *substitui* o
 * módulo em vez de aumentá-lo, e todo o resto do `firebase/auth` deixa de ter
 * tipos.
 */
const { getReactNativePersistence } = firebaseAuth as typeof firebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

/**
 * Variáveis com prefixo EXPO_PUBLIC_ são embutidas no bundle pelo Expo.
 * Isso é esperado: as chaves do Firebase Web são públicas por design.
 * Quem protege os dados são as Security Rules (ver pasta `firebase/`).
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Falha cedo e com mensagem legível. Sem isto, um `.env` ausente virava um
 * `auth/invalid-api-key` no meio da tela de login, bem mais difícil de ligar
 * à causa real.
 */
const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  throw new Error(
    `Firebase não configurado. Faltam as chaves: ${missing.join(', ')}.\n` +
      'Copie .env.example para .env e preencha com os dados do seu projeto, ' +
      'depois reinicie o bundler com: npx expo start --clear'
  );
}

/** `getApps()` evita reinicializar o app durante o Fast Refresh. */
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * `initializeAuth` + `getReactNativePersistence` é o que mantém o usuário logado
 * entre aberturas do app. Sem isso o Firebase usa memória e a sessão morre a
 * cada reload (o sintoma clássico é "tenho que logar toda vez").
 *
 * O try/catch cobre o Fast Refresh, que reexecuta este módulo com o auth já
 * inicializado (`auth/already-initialized`).
 */
function resolveAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = resolveAuth();
export const db = getFirestore(app);
