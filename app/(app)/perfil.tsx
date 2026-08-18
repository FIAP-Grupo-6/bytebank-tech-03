import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/contexts/TransactionsContext';
import { confirm, notify } from '@/lib/alert';
import { formatBRL } from '@/lib/format';
import { colors, radius, spacing, type } from '@/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, submitting } = useAuth();
  const { summary } = useTransactions();

  const initials = (user?.displayName ?? 'Você')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const handleSignOut = () => {
    confirm(
      'Sair da conta?',
      'Você vai precisar entrar novamente.',
      'Sair',
      async () => {
        try {
          await signOut();
        } catch (caught) {
          notify(
            'Não foi possível sair',
            caught instanceof Error ? caught.message : 'Tente novamente.'
          );
        }
      },
      { destructive: true }
    );
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl },
      ]}
    >
      <Text style={styles.title}>Perfil</Text>

      <Card style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.identityInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {user?.displayName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
      </Card>

      <View>
        <SectionLabel>Resumo da conta</SectionLabel>
        <Card>
          <Row label="Entradas acumuladas" value={formatBRL(summary?.totalCredit ?? 0)} />
          <Row label="Saídas acumuladas" value={formatBRL(summary?.totalDebit ?? 0)} />
          <Row
            label="Saldo atual"
            value={formatBRL(summary?.balance ?? 0)}
            tone={(summary?.balance ?? 0) < 0 ? 'danger' : 'primary'}
            last
          />
        </Card>
      </View>

      <View>
        <SectionLabel>Sobre</SectionLabel>
        <Card>
          <Row label="Versão" value="3.0.0" />
          <Row label="Projeto" value="FIAP Pós-Tech · Grupo 6" last />
        </Card>
      </View>

      <Button
        label="Sair da conta"
        variant="danger"
        onPress={handleSignOut}
        loading={submitting}
        icon={<Ionicons name="log-out-outline" size={18} color={colors.danger} />}
      />
    </ScrollView>
  );
}

function Row({
  label,
  value,
  tone,
  last = false,
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'danger';
  last?: boolean;
}) {
  const color =
    tone === 'primary' ? colors.primary : tone === 'danger' ? colors.danger : colors.text;

  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  title: { ...type.h1, color: colors.text },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...type.h2, color: colors.primary },
  identityInfo: { flex: 1, gap: 2 },
  name: { ...type.h2, color: colors.text },
  email: { ...type.small, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  rowLabel: { ...type.body, color: colors.textMuted },
  rowValue: { ...type.bodyMedium },
});
