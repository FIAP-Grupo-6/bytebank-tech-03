import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { notify } from '@/lib/alert';
import { signUpSchema, type SignUpFormValues } from '@/schemas/auth.schema';
import { colors, spacing, type } from '@/theme';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, submitting } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (values: SignUpFormValues) => {
    try {
      await signUp(values.displayName, values.email, values.password);
    } catch (caught) {
      notify(
        'Não foi possível criar a conta',
        caught instanceof Error ? caught.message : 'Tente novamente.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.intro}>
          <Text style={styles.title}>Criar sua conta</Text>
          <Text style={styles.subtitle}>
            Leva menos de um minuto. Depois você já pode lançar sua primeira
            transação.
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="displayName"
            render={({ field, fieldState }) => (
              <Input
                label="Nome"
                placeholder="Como você quer ser chamado"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Input
                label="E-mail"
                placeholder="voce@exemplo.com"
                value={field.value}
                onChangeText={field.onChange}
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
                placeholder="Mínimo de 6 caracteres"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                hint="Use pelo menos uma letra e um número."
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
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

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <Input
                label="Repetir senha"
                placeholder="Digite a senha novamente"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="go"
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />

          <Button
            label="Criar conta"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            style={styles.submit}
          />
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
    gap: spacing.xl,
  },
  back: { alignSelf: 'flex-start', paddingVertical: spacing.sm },
  intro: { gap: spacing.sm },
  title: { ...type.display, fontSize: 28, color: colors.text },
  subtitle: { ...type.body, color: colors.textMuted, lineHeight: 22 },
  form: { gap: spacing.lg },
  submit: { marginTop: spacing.sm },
});
