import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { PickerField } from '@/components/ui/Input';
import { formatDateBR } from '@/lib/date';
import { colors, radius, spacing, type } from '@/theme';

interface DateFieldProps {
  label: string;
  /** ISO 8601. */
  value: string;
  onChange: (isoDate: string) => void;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  /** Permite limpar o campo, usado nos filtros, não no formulário. */
  onClear?: () => void;
}

/**
 * Campo de data.
 *
 * Android e iOS precisam de fluxos diferentes e é isso que este componente
 * esconde: no Android o seletor é um diálogo do sistema que já traz botões de
 * OK/Cancelar; no iOS ele é um componente inline, então precisa de um modal com
 * botão de confirmação, senão o usuário gira a roda e não tem como fechar.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
  minimumDate,
  maximumDate,
  placeholder = 'Selecionar data',
  onClear,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => (value ? new Date(value) : new Date()));

  const openPicker = () => {
    setDraft(value ? new Date(value) : new Date());
    setOpen(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type === 'set' && selected) {
      onChange(selected.toISOString());
    }
  };

  return (
    <>
      <PickerField
        label={label}
        value={value ? formatDateBR(value) : null}
        placeholder={placeholder}
        error={error}
        onPress={openPicker}
        trailing={
          value && onClear ? (
            <Pressable
              onPress={onClear}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Limpar ${label}`}
            >
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </Pressable>
          ) : (
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          )
        }
      />

      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={styles.cancel}>Cancelar</Text>
              </Pressable>
              <Text style={styles.title}>{label}</Text>
              <Pressable
                onPress={() => {
                  onChange(draft.toISOString());
                  setOpen(false);
                }}
                hitSlop={10}
              >
                <Text style={styles.confirm}>Confirmar</Text>
              </Pressable>
            </View>

            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              locale="pt-BR"
              themeVariant="dark"
              onChange={(_event, selected) => {
                if (selected) setDraft(selected);
              }}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              style={styles.picker}
            />
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...type.bodyMedium, color: colors.text },
  cancel: { ...type.body, color: colors.textMuted },
  confirm: { ...type.bodyMedium, color: colors.primary },
  picker: { alignSelf: 'stretch' },
});
