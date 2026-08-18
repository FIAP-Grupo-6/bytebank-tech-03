import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { confirm, notify } from '@/lib/alert';
import { loginSchema, type LoginFormValues } from '@/schemas/auth.schema';
import { colors, radius, spacing, type } from '@/theme';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, submitting, resetPassword } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  /**
   * Erro de login mostrado em banner na própria tela, não em `Alert`: um
   * popup depende de UI nativa que a Web não tem (ver `@/lib/alert`) e some
   * sozinho, então "senha errada" acabava sem nenhum feedback visível.
   */
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, getValues } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    // Valida ao sair do campo em vez de a cada tecla: erro aparecendo enquanto
    // se digita o e-mail é ruído, não ajuda.
    mode: 'onBlur',
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      // Não navega aqui: o porteiro no _layout redireciona quando a sessão muda.
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Tente novamente.');
    }
  };

  const handleForgotPassword = () => {
    const email = getValues('email').trim();

    if (!email) {
      notify(
        'Informe o e-mail',
        'Digite seu e-mail no campo acima e toque em "Esqueci minha senha" novamente.'
      );
      return;
    }

    confirm('Redefinir senha', `Enviar o link de redefinição para ${email}?`, 'Enviar', async () => {
      try {
        await resetPassword(email);
        notify('Link enviado', 'Confira sua caixa de entrada.');
      } catch (caught) {
        notify(
          'Não foi possível enviar',
          caught instanceof Error ? caught.message : 'Tente novamente.'
        );
      }
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Ionicons name="trending-up" size={22} color={colors.backgroundDeep} />
          </View>
          <Text style={styles.wordmark}>ByteBank</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.title}>Suas finanças, organizadas</Text>
          <Text style={styles.subtitle}>
            Entre para ver seu saldo, lançar transações e acompanhar para onde o
            dinheiro está indo.
          </Text>
        </View>

        <View style={styles.form}>
          {formError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Input
                label="E-mail"
                placeholder="voce@exemplo.com"
                value={field.value}
                onChangeText={(next) => {
                  field.onChange(next);
                  setFormError(null);
                }}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Input
                label="Senha"
                placeholder="Sua senha"
                value={field.value}
                onChangeText={(next) => {
                  field.onChange(next);
                  setFormError(null);
                }}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit(onSubmit)}
                trailing={
                  <Pressable
                    onPress={() => setShowPassword((current) => !current)}
                    hitSlop={10}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: showPassword }}
                    accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color={colors.textMuted}
                    />
                  </Pressable>
                }
              />
            )}
          />

          <Pressable
            onPress={handleForgotPassword}
            style={styles.forgot}
            accessibilityRole="button"
          >
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </Pressable>

          <Button label="Entrar" onPress={handleSubmit(onSubmit)} loading={submitting} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ainda não tem conta?</Text>
          <Link href="/cadastro" asChild>
            <Pressable accessibilityRole="link">
              <Text style={styles.footerLink}>Criar conta</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { ...type.h1, color: colors.text },
  intro: { gap: spacing.sm },
  title: { ...type.display, fontSize: 28, color: colors.text },
  subtitle: { ...type.body, color: colors.textMuted, lineHeight: 22 },
  form: { gap: spacing.lg },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { ...type.small, color: colors.danger, flex: 1 },
  forgot: { alignSelf: 'flex-start' },
  forgotText: { ...type.smallMedium, color: colors.primary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: { ...type.small, color: colors.textMuted },
  footerLink: { ...type.smallMedium, color: colors.primary },
});
