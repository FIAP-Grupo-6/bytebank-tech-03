import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, type } from '@/theme';

interface OptionSheetProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Rótulo de uma opção "nenhum/todos" no topo. */
  clearLabel?: string;
  onClear?: () => void;
}

/**
 * Seletor em folha inferior.
 *
 * Escolhido em vez do `Picker` nativo porque o Picker do Android abre um diálogo
 * com o tema do sistema, ignorando as cores do app. No meio de um formulário
 * escuro, ele aparece branco.
 */
export function OptionSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  clearLabel,
  onClear,
}: OptionSheetProps) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      slide.setValue(0);
      return;
    }
    Animated.timing(slide, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [340, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Toque fora fecha, é o padrão esperado em folha inferior. */}
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + spacing.md, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.grabber} />

        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <FlatList
          data={options}
          keyExtractor={(item) => item}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            clearLabel && onClear ? (
              <Row
                label={clearLabel}
                selected={selected === null}
                onPress={() => {
                  onClear();
                  onClose();
                }}
                muted
              />
            ) : null
          }
          renderItem={({ item }) => (
            <Row
              label={item}
              selected={item === selected}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </Animated.View>
    </Modal>
  );
}

function Row({
  label,
  selected,
  onPress,
  muted = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Text style={[styles.rowLabel, muted && styles.rowLabelMuted]}>{label}</Text>
      {selected ? (
        <Ionicons name="checkmark" size={18} color={colors.primary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '76%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { ...type.h2, color: colors.text },
  list: { paddingHorizontal: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowPressed: { backgroundColor: colors.surfaceHover },
  rowLabel: { ...type.body, color: colors.text },
  rowLabelMuted: { color: colors.textMuted },
  separator: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
});
