import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { OptionSheet } from '@/components/ui/OptionSheet';
import { confirm, notify } from '@/lib/alert';
import {
  pickReceiptDocument,
  pickReceiptFromCamera,
  pickReceiptFromLibrary,
  uploadReceipt,
  type PickedReceipt,
} from '@/services/receipts.service';
import { colors, radius, spacing, type } from '@/theme';

export interface ReceiptValue {
  url?: string;
  path?: string;
  name?: string;
  mimeType?: string;
}

interface ReceiptFieldProps {
  userId: string;
  value: ReceiptValue;
  onChange: (value: ReceiptValue) => void;
  /** Avisa o formulário para bloquear o botão salvar durante o envio. */
  onUploadingChange?: (uploading: boolean) => void;
  error?: string;
}

const SOURCES = ['Tirar foto', 'Escolher da galeria', 'Escolher arquivo (PDF)'] as const;

/**
 * Anexo de recibo.
 *
 * O upload acontece na hora em que o arquivo é escolhido, não no submit. Motivo:
 * enviar 3 MB no submit deixa o usuário olhando um botão travado sem saber se
 * o app morreu. Fazendo aqui, ele vê a barra encher e o botão de salvar só
 * espera se ainda estiver em andamento.
 */
export function ReceiptField({
  userId,
  value,
  onChange,
  onUploadingChange,
  error,
}: ReceiptFieldProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const setUploadingState = (next: boolean) => {
    setUploading(next);
    onUploadingChange?.(next);
  };

  const handlePicked = async (picked: PickedReceipt | null) => {
    if (!picked) return;

    setUploadingState(true);
    setProgress(0);

    try {
      const uploaded = await uploadReceipt(userId, picked, setProgress);
      onChange({
        url: uploaded.url,
        path: uploaded.path,
        name: uploaded.name,
        mimeType: uploaded.mimeType,
      });
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'Não foi possível enviar o recibo. Tente novamente.';
      notify('Recibo não enviado', message);
    } finally {
      setUploadingState(false);
      setProgress(0);
    }
  };

  const handleSelectSource = async (source: string) => {
    try {
      if (source === SOURCES[0]) return handlePicked(await pickReceiptFromCamera());
      if (source === SOURCES[1]) return handlePicked(await pickReceiptFromLibrary());
      return handlePicked(await pickReceiptDocument());
    } catch (caught) {
      notify(
        'Permissão necessária',
        caught instanceof Error ? caught.message : 'Não foi possível abrir o seletor.'
      );
    }
  };

  const confirmRemove = () => {
    confirm(
      'Remover recibo?',
      'O arquivo será desanexado desta transação.',
      'Remover',
      // O arquivo no Storage só é apagado quando a transação é salva ou
      // excluída, assim cancelar o formulário não destrói nada.
      () => onChange({}),
      { cancelLabel: 'Manter', destructive: true }
    );
  };

  const isPdf = value.mimeType === 'application/pdf';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Recibo</Text>

      {value.url ? (
        <View style={styles.attached}>
          {isPdf ? (
            <View style={styles.pdfBox}>
              <Ionicons name="document-text-outline" size={22} color={colors.textMuted} />
            </View>
          ) : (
            <Image
              source={{ uri: value.url }}
              style={styles.thumb}
              contentFit="cover"
              transition={180}
              accessibilityLabel="Prévia do recibo anexado"
            />
          )}

          <View style={styles.attachedInfo}>
            <Text style={styles.attachedName} numberOfLines={1}>
              {value.name ?? 'Recibo anexado'}
            </Text>
            <Pressable
              onPress={() => value.url && Linking.openURL(value.url)}
              accessibilityRole="link"
              accessibilityLabel="Abrir recibo"
            >
              <Text style={styles.attachedAction}>Abrir</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={confirmRemove}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Remover recibo"
          >
            <Ionicons name="trash-outline" size={19} color={colors.danger} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setSheetOpen(true)}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Anexar recibo"
          accessibilityState={{ busy: uploading }}
          style={({ pressed }) => [
            styles.dropzone,
            pressed && styles.dropzonePressed,
            !!error && styles.dropzoneError,
          ]}
        >
          {uploading ? (
            <View style={styles.uploading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.uploadingText}>
                Enviando… {Math.round(progress * 100)}%
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
              </View>
            </View>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={22} color={colors.textMuted} />
              <Text style={styles.dropzoneTitle}>Anexar recibo</Text>
              <Text style={styles.dropzoneHint}>Foto, imagem ou PDF de até 5 MB</Text>
            </>
          )}
        </Pressable>
      )}

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <OptionSheet
        visible={sheetOpen}
        title="Anexar recibo"
        options={[...SOURCES]}
        selected={null}
        onSelect={handleSelectSource}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...type.smallMedium, color: colors.textMuted },
  dropzone: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    minHeight: 108,
  },
  dropzonePressed: { borderColor: colors.primary, backgroundColor: colors.surfaceHover },
  dropzoneError: { borderColor: colors.danger },
  dropzoneTitle: { ...type.bodyMedium, color: colors.text, marginTop: spacing.xs },
  dropzoneHint: { ...type.small, color: colors.textFaint },
  uploading: { alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  uploadingText: { ...type.smallMedium, color: colors.textMuted },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
  attached: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.surface },
  pdfBox: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedInfo: { flex: 1, gap: 2 },
  attachedName: { ...type.smallMedium, color: colors.text },
  attachedAction: { ...type.small, color: colors.primary },
  error: { ...type.small, color: colors.danger },
});
