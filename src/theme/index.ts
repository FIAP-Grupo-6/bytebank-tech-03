/**
 * Design tokens do ByteBank.
 *
 * Continuidade visual da Fase 2: os valores abaixo são a conversão para HEX
 * dos tokens HSL definidos em `apps/host/src/app/globals.css` do monorepo web.
 * Mesma marca, outro meio, o app não inventa uma identidade nova.
 */

export const colors = {
  background: '#121417', // hsl(220 14% 8%)
  backgroundDeep: '#0D0F11', // hsl(220 14% 6%), headers e barras
  surface: '#16181D', // hsl(220 14% 10%), cards
  surfaceHover: '#23272F', // hsl(220 14% 16%), destaque/pressionado
  surfaceAlt: '#1F2229', // hsl(220 14% 14%)

  primary: '#14B861', // hsl(148 80% 40%), verde da marca
  primaryDark: '#119750',
  primarySoft: 'rgba(20, 184, 97, 0.14)', // verde translúcido p/ fundos de destaque
  ring: '#1AE679', // hsl(148 80% 50%), anel de foco

  danger: '#FF6B6B', // hsl(0 100% 71%), erro e saída de dinheiro
  dangerSoft: 'rgba(255, 107, 107, 0.14)',

  text: '#E0E4EB', // hsl(215 20% 90%)
  textMuted: '#A3B0C2', // hsl(215 20% 70%)
  textFaint: '#6B7789', // terciário / placeholders

  border: '#21242C', // hsl(220 14% 15%)

  /** Paleta categórica dos gráficos: parte do verde da marca e gira o matiz
   *  sem sair do registro escuro da interface. */
  chart: [
    '#14B861',
    '#3BA5D9',
    '#B98CE8',
    '#E8B84B',
    '#E8724B',
    '#4BE8C4',
    '#E84B8C',
    '#8CB94B',
  ] as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

/** Plus Jakarta Sans, mesma família da Fase 2. */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 32, letterSpacing: -0.8 },
  h1: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.semibold, fontSize: 18, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15 },
  small: { fontFamily: fonts.regular, fontSize: 13 },
  smallMedium: { fontFamily: fonts.medium, fontSize: 13 },
  /** Rótulo em caixa alta, usado como "eyebrow" de seção */
  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
} as const;

export const theme = { colors, spacing, radius, fonts, type } as const;
