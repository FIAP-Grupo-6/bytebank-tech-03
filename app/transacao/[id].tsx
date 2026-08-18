import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyField } from '@/components/transactions/CurrencyField';
import { DateField } from '@/components/transactions/DateField';
import { ReceiptField } from '@/components/transactions/ReceiptField';
import { Button } from '@/components/ui/Button';
import { Input, PickerField } from '@/components/ui/Input';
import { OptionSheet } from '@/components/ui/OptionSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/contexts/TransactionsContext';
import { notify } from '@/lib/alert';
import { getCategoryNames, getSubcategories } from '@/lib/categories';
import { toFriendlyMessage } from '@/lib/errors';
import { fetchTransactionById } from '@/services/transactions.service';
import { deleteReceipt } from '@/services/receipts.service';
import {
  transactionSchema,
  type TransactionFormValues,
} from '@/schemas/transaction.schema';
import { colors, radius, spacing, type } from '@/theme';
import type { TransactionType } from '@/types';

export default function TransactionFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'nova';

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { saveTransaction } = useTransactions();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categorySheet, setCategorySheet] = useState(false);
  const [subcategorySheet, setSubcategorySheet] = useState(false);
  /** Recibo que estava salvo e foi trocado — apagado só depois do save. */
  const [replacedReceiptPath, setReplacedReceiptPath] = useState<string | null>(null);

  const { control, handleSubmit, watch, setValue, reset, formState } =
    useForm<TransactionFormValues>({
      resolver: zodResolver(transactionSchema),
      defaultValues: {
        type: 'Debit',
        value: 0,
        category: '',
        subcategory: undefined,
        description: '',
        date: new Date().toISOString(),
      },
      mode: 'onBlur',
    });

  const type = watch('type');
  const category = watch('category');
  const receiptUrl = watch('receiptUrl');
  const receiptPath = watch('receiptPath');
  const receiptName = watch('receiptName');
  const receiptType = watch('receiptType');

  // Carrega a transação existente no modo edição.
  useEffect(() => {
    if (isNew || !id) return;

    let active = true;
    (async () => {
      try {
        const existing = await fetchTransactionById(id);
        if (!active) return;

        if (!existing) {
          notify('Transação não encontrada', 'Ela pode ter sido excluída.', () =>
            router.back()
          );
          return;
        }

        reset({
          type: existing.type,
          value: existing.value,
          category: existing.category,
          subcategory: existing.subcategory,
          description: existing.description ?? '',
          date: existing.date,
          receiptUrl: existing.receiptUrl,
          receiptPath: existing.receiptPath,
          receiptName: existing.receiptName,
          receiptType: existing.receiptType,
        });
      } catch (caught) {
        notify('Erro ao carregar', toFriendlyMessage(caught), () => router.back());
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id, isNew, reset, router]);

  /**
   * Trocar o tipo invalida categoria e subcategoria — "Alimentação" não existe
   * em entradas. Limpar aqui evita que o usuário só descubra o problema ao
   * tentar salvar.
   */
  const handleTypeChange = (nextType: TransactionType) => {
    if (nextType === type) return;
    setValue('type', nextType, { shouldValidate: false });
    setValue('category', '', { shouldValidate: false });
    setValue('subcategory', undefined, { shouldValidate: false });
  };

  const onSubmit = async (values: TransactionFormValues) => {
    setSaving(true);
    try {
      await saveTransaction(
        {
          type: values.type,
          value: values.value,
          category: values.category,
          subcategory: values.subcategory,
          description: values.description?.trim() || undefined,
          date: values.date,
          receiptUrl: values.receiptUrl,
          receiptPath: values.receiptPath,
          receiptName: values.receiptName,
          receiptType: values.receiptType,
        },
        isNew ? undefined : id
      );

      // Só agora o recibo antigo pode ir: se o save falhar, o arquivo ainda
      // está lá e a transação continua consistente.
      if (replacedReceiptPath) await deleteReceipt(replacedReceiptPath);

      router.back();
    } catch (caught) {
      notify(
        'Não foi possível salvar',
        caught instanceof Error ? caught.message : 'Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const subcategories = category ? getSubcategories(type, category) : [];

  if (loading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isNew ? 'Nova transação' : 'Editar transação'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tipo primeiro: ele determina quais categorias existem. */}
        <View style={styles.segmented}>
          {(
            [
              { label: 'Saída', value: 'Debit' as const, color: colors.danger },
              { label: 'Entrada', value: 'Credit' as const, color: colors.primary },
            ]
          ).map((option) => {
            const active = type === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleTypeChange(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={option.label}
                style={[
                  styles.segment,
                  active && { backgroundColor: option.color, borderColor: option.color },
                ]}
              >
                <Ionicons
                  name={option.value === 'Credit' ? 'arrow-down' : 'arrow-up'}
                  size={15}
                  color={active ? colors.backgroundDeep : colors.textMuted}
                />
                <Text
                  style={[styles.segmentLabel, active && styles.segmentLabelActive]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Controller
          control={control}
          name="value"
          render={({ field, fieldState }) => (
            <CurrencyField
              label="Valor"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              tone={type === 'Credit' ? 'credit' : 'debit'}
            />
          )}
        />

        <Controller
          control={control}
          name="category"
          render={({ field, fieldState }) => (
            <PickerField
              label="Categoria"
              value={field.value || null}
              placeholder="Escolher categoria"
              error={fieldState.error?.message}
              onPress={() => setCategorySheet(true)}
              trailing={
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              }
            />
          )}
        />

        <Controller
          control={control}
          name="subcategory"
          render={({ field, fieldState }) => (
            <PickerField
              label="Subcategoria"
              value={field.value ?? null}
              placeholder={
                category ? 'Opcional' : 'Escolha uma categoria primeiro'
              }
              error={fieldState.error?.message}
              disabled={!category}
              onPress={() => setSubcategorySheet(true)}
              trailing={
                field.value ? (
                  <Pressable
                    onPress={() => setValue('subcategory', undefined)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Limpar subcategoria"
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textFaint} />
                  </Pressable>
                ) : (
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                )
              }
            />
          )}
        />

        <Controller
          control={control}
          name="date"
          render={({ field, fieldState }) => (
            <DateField
              label="Data"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              maximumDate={new Date()}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <Input
              label="Descrição"
              placeholder="Ex.: mercado do mês"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              hint={`${(field.value ?? '').length}/120`}
              maxLength={120}
              multiline
            />
          )}
        />

        {user ? (
          <ReceiptField
            userId={user.uid}
            value={{
              url: receiptUrl,
              path: receiptPath,
              name: receiptName,
              mimeType: receiptType,
            }}
            onUploadingChange={setUploading}
            error={formState.errors.receiptUrl?.message}
            onChange={(next) => {
              // Guarda o caminho antigo para apagar depois do save.
              if (receiptPath && receiptPath !== next.path) {
                setReplacedReceiptPath(receiptPath);
              }
              setValue('receiptUrl', next.url, { shouldValidate: false });
              setValue('receiptPath', next.path, { shouldValidate: false });
              setValue('receiptName', next.name, { shouldValidate: false });
              setValue('receiptType', next.mimeType, { shouldValidate: false });
            }}
          />
        ) : null}

        <Button
          label={
            uploading ? 'Aguardando o recibo…' : isNew ? 'Salvar transação' : 'Salvar alterações'
          }
          onPress={handleSubmit(onSubmit)}
          loading={saving}
          disabled={uploading}
          style={styles.submit}
        />
      </ScrollView>

      <OptionSheet
        visible={categorySheet}
        title={type === 'Credit' ? 'Categoria da entrada' : 'Categoria da saída'}
        options={getCategoryNames(type)}
        selected={category || null}
        onSelect={(next) => {
          setValue('category', next, { shouldValidate: true });
          // Subcategoria antiga pode não existir na nova categoria.
          setValue('subcategory', undefined, { shouldValidate: false });
        }}
        onClose={() => setCategorySheet(false)}
      />

      <OptionSheet
        visible={subcategorySheet}
        title="Subcategoria"
        options={subcategories}
        selected={watch('subcategory') ?? null}
        clearLabel="Sem subcategoria"
        onClear={() => setValue('subcategory', undefined, { shouldValidate: true })}
        onSelect={(next) => setValue('subcategory', next, { shouldValidate: true })}
        onClose={() => setSubcategorySheet(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.backgroundDeep,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...type.h2, color: colors.text },
  headerSpacer: { width: 24 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  segmented: { flexDirection: 'row', gap: spacing.md },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentLabel: { ...type.bodyMedium, color: colors.textMuted },
  segmentLabelActive: { color: colors.backgroundDeep },
  submit: { marginTop: spacing.md },
});
