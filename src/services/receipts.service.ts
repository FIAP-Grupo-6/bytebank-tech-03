import { decode as decodeBase64 } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { RECEIPTS_BUCKET, supabase } from '@/lib/supabase';

/** Espelha o limite das policies do bucket (ver supabase/storage-policies.sql). */
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export interface PickedReceipt {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  /**
   * Só populado na Web: `expo-file-system` não implementa leitura de arquivo
   * lá (ver `readBytes` abaixo), então o upload usa este `File` do browser.
   */
  file?: File;
}

export interface UploadedReceipt {
  url: string;
  /** Caminho no bucket, guardado no documento para permitir o delete. */
  path: string;
  name: string;
  mimeType: string;
}

function extensionFor(mimeType: string, fallbackName: string): string {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType.startsWith('image/')) return 'jpg';

  const fromName = fallbackName.split('.').pop();
  return fromName && fromName.length <= 5 ? fromName : 'bin';
}

// Seleção

/** Foto da galeria. Devolve `null` se o usuário cancelar. */
export async function pickReceiptFromLibrary(): Promise<PickedReceipt | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      'Precisamos de acesso à galeria para anexar o recibo. Libere nas configurações do sistema.'
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsMultipleSelection: false,
  });

  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  return {
    uri: asset.uri,
    name: asset.fileName ?? `recibo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
    size: asset.fileSize,
    file: asset.file,
  };
}

/** Foto tirada na hora. */
export async function pickReceiptFromCamera(): Promise<PickedReceipt | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      'Precisamos de acesso à câmera para fotografar o recibo. Libere nas configurações do sistema.'
    );
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });

  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  return {
    uri: asset.uri,
    name: asset.fileName ?? `recibo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
    size: asset.fileSize,
    file: asset.file,
  };
}

/** PDF ou imagem vindos do gerenciador de arquivos. */
export async function pickReceiptDocument(): Promise<PickedReceipt | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
    size: asset.size ?? undefined,
    file: asset.file,
  };
}

// Upload

/** base64 → ArrayBuffer evita o Blob vazio que alguns content providers do Android devolvem em `fetch(uri)`. */
async function readAsBase64(uri: string): Promise<string> {
  // O entrypoint `/legacy` é quem expõe o readAsStringAsync.
  const FileSystem = await import('expo-file-system/legacy');
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Bytes prontos pro upload.
 *
 * Na Web, `expo-file-system` não implementa `readAsStringAsync`, mas o picker
 * já devolve o `File` do browser em `file`, que o SDK do Supabase aceita
 * direto. Nas outras plataformas, lê via base64 (ver `readAsBase64`).
 */
async function readBytes(file: PickedReceipt): Promise<File | ArrayBuffer> {
  if (file.file) return file.file;
  return decodeBase64(await readAsBase64(file.uri));
}

/**
 * Envia o recibo para `receipts/{uid}/{arquivo}` e devolve a URL pública.
 *
 * `onProgress` alimenta a barra da tela do formulário. O SDK do Supabase não
 * expõe progresso real, então só marcamos início e fim.
 */
export async function uploadReceipt(
  userId: string,
  file: PickedReceipt,
  onProgress?: (ratio: number) => void
): Promise<UploadedReceipt> {
  if (file.size != null && file.size > MAX_RECEIPT_BYTES) {
    throw new Error('O recibo precisa ter no máximo 5 MB.');
  }

  const extension = extensionFor(file.mimeType, file.name);
  const path = `receipts/${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;

  onProgress?.(0.1);

  const bytes = await readBytes(file);

  if (bytes instanceof ArrayBuffer) {
    if (bytes.byteLength === 0) {
      throw new Error('Não foi possível ler o arquivo do recibo. Tente novamente.');
    }
    if (bytes.byteLength > MAX_RECEIPT_BYTES) {
      throw new Error('O recibo precisa ter no máximo 5 MB.');
    }
  }

  onProgress?.(0.4);

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, bytes, { contentType: file.mimeType, upsert: false });

  if (error) throw error;

  onProgress?.(1);

  const {
    data: { publicUrl },
  } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);

  return { url: publicUrl, path, name: file.name, mimeType: file.mimeType };
}

/**
 * Apaga o arquivo do bucket.
 *
 * Não propaga erro: se o arquivo já não existe, o objetivo (não deixar lixo)
 * está cumprido, e falhar aqui bloquearia a exclusão da transação em si.
 */
export async function deleteReceipt(path: string): Promise<void> {
  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).remove([path]);
  if (error && __DEV__) console.warn('[receipts] falha ao apagar recibo', path, error);
}
