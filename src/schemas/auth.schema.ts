import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail.')
    .pipe(z.email('E-mail em formato inválido.')),
  password: z.string().min(1, 'Informe sua senha.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .min(2, 'O nome precisa de pelo menos 2 caracteres.')
      .max(60, 'O nome pode ter no máximo 60 caracteres.'),
    email: z
      .string()
      .min(1, 'Informe seu e-mail.')
      .pipe(z.email('E-mail em formato inválido.')),
    password: z
      .string()
      .min(6, 'A senha precisa de pelo menos 6 caracteres.')
      .regex(/[a-zA-Z]/, 'A senha precisa ter pelo menos uma letra.')
      .regex(/[0-9]/, 'A senha precisa ter pelo menos um número.'),
    confirmPassword: z.string().min(1, 'Repita a senha.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não são iguais.',
  });

export type SignUpFormValues = z.infer<typeof signUpSchema>;
