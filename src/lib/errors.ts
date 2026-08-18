/**
 * O Firebase devolve códigos como `auth/invalid-credential`. Jogar isso na tela
 * não ajuda ninguém: cada mensagem abaixo diz o que aconteceu e o que fazer.
 */

const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'E-mail em formato inválido.',
  'auth/user-disabled': 'Esta conta está desativada. Fale com o suporte.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já tem conta. Faça login.',
  'auth/weak-password': 'A senha precisa de pelo menos 6 caracteres.',
  'auth/too-many-requests':
    'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
  'auth/network-request-failed':
    'Sem conexão com o servidor. Verifique sua internet.',
  'auth/operation-not-allowed':
    'Login por e-mail e senha está desativado no console do Firebase.',
  'auth/requires-recent-login':
    'Por segurança, entre novamente antes de repetir esta ação.',
};

const FIRESTORE_MESSAGES: Record<string, string> = {
  'permission-denied':
    'Sem permissão para esta operação. Confira as regras do Firestore.',
  unavailable: 'Servidor indisponível. Tente novamente em instantes.',
  'failed-precondition':
    'A consulta exige um índice que ainda não existe. Veja a seção de índices no README.',
  'deadline-exceeded': 'A operação demorou demais. Tente novamente.',
  cancelled: 'Operação cancelada.',
  'resource-exhausted': 'Cota do Firebase esgotada. Tente mais tarde.',
  unauthenticated: 'Sua sessão expirou. Entre novamente.',
};

/** O storage-js do Supabase não usa códigos como o Firebase, só `message`, então mapeamos pelo texto. */
const SUPABASE_STORAGE_MESSAGES: Record<string, string> = {
  'The resource already exists': 'Já existe um arquivo com esse nome. Tente novamente.',
  'Duplicate': 'Já existe um arquivo com esse nome. Tente novamente.',
  'The resource was not found': 'Arquivo não encontrado no servidor.',
  'new row violates row-level security policy':
    'Sem permissão para enviar este arquivo. Confira as policies do bucket.',
  'Payload too large': 'O recibo precisa ter no máximo 5 MB.',
};

function extractCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return null;
}

function extractSupabaseStorageMessage(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('message' in error)) return null;
  const { message } = error as { message?: unknown };
  if (typeof message !== 'string') return null;

  const match = Object.entries(SUPABASE_STORAGE_MESSAGES).find(([known]) =>
    message.toLowerCase().includes(known.toLowerCase())
  );
  return match ? match[1] : null;
}

/**
 * Traduz qualquer erro do Firebase ou do Supabase Storage para uma frase exibível.
 * Se o código/mensagem for desconhecido, devolve o fallback em vez de vazar o cru.
 */
export function toFriendlyMessage(
  error: unknown,
  fallback = 'Não foi possível concluir a operação. Tente novamente.'
): string {
  const code = extractCode(error);

  if (code) {
    const known =
      AUTH_MESSAGES[code] ??
      FIRESTORE_MESSAGES[code] ??
      // Erros do Firestore chegam sem prefixo, mas às vezes com "firestore/".
      FIRESTORE_MESSAGES[code.replace(/^firestore\//, '')];

    if (known) return known;
  }

  const supabaseStorageMessage = extractSupabaseStorageMessage(error);
  if (supabaseStorageMessage) return supabaseStorageMessage;

  if (!code) return fallback;

  if (__DEV__) {
    // Em desenvolvimento vale ver o código para poder mapeá-lo depois.
    return `${fallback} (${code})`;
  }
  return fallback;
}

/**
 * `failed-precondition` é o erro de índice ausente. Vale destacar porque a
 * mensagem original do Firebase traz um link que cria o índice em um clique.
 */
export function isMissingIndexError(error: unknown): boolean {
  return extractCode(error) === 'failed-precondition';
}
