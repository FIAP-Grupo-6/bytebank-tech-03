import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { colors, radius, spacing, type } from '@/theme';

export interface Section {
  key: string;
  label: string;
  render: () => React.ReactNode;
}

interface SectionSwitcherProps {
  sections: Section[];
}

// Habilita o LayoutAnimation no Android, que ainda exige opt-in explícito.
// if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
//   UIManager.setLayoutAnimationEnabledExperimental(true);
// }

/**
 * Alternador de seções do dashboard. É a peça animada central do app.
 *
 * Três animações compostas, todas com `Animated` do React Native (o que o
 * desafio pede) e todas com `useNativeDriver: true`, porque só mexem em
 * `opacity` e `transform`. O indicador desliza sob a aba escolhida
 * (`translateX`), com a largura medida no layout em vez de fração fixa,
 * assim rótulos de tamanhos diferentes não desalinham o indicador. A seção
 * que sai desaparece deslizando para o lado de onde veio o toque, a que
 * entra aparece do lado oposto (a direção carrega informação: dá pra sentir
 * se andou pra esquerda ou pra direita). E o conteúdo novo entra com um
 * `Easing.out` mais longo que a saída, pra dar aquela sensação de "chegar e
 * assentar" em vez de piscar.
 */
export function SectionSwitcher({ sections }: SectionSwitcherProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  /** Índice realmente renderizado, troca só no meio da animação de saída. */
  const [renderedIndex, setRenderedIndex] = useState(0);
  const [tabWidth, setTabWidth] = useState(0);

  const indicatorX = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentShift = useRef(new Animated.Value(0)).current;

  const previousIndex = useRef(0);

  useEffect(() => {
    if (tabWidth === 0) return;

    Animated.spring(indicatorX, {
      toValue: activeIndex * tabWidth,
      useNativeDriver: true,
      // Mola curta: responde ao toque sem aquele balanço de brinquedo.
      stiffness: 220,
      damping: 22,
      mass: 0.7,
    }).start();
  }, [activeIndex, tabWidth, indicatorX]);

  useEffect(() => {
    const from = previousIndex.current;
    if (from === activeIndex) return;

    const direction = activeIndex > from ? 1 : -1;
    previousIndex.current = activeIndex;

    Animated.sequence([
      // Saída: some empurrando para o lado contrário ao movimento.
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 120,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(contentShift, {
          toValue: -14 * direction,
          duration: 120,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Troca o conteúdo com a tela invisível e reposiciona do outro lado.
      Animated.timing(contentShift, {
        toValue: 18 * direction,
        duration: 0,
        useNativeDriver: true,
      }),
      // Entrada: mais longa que a saída, com desaceleração.
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentShift, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Troca o conteúdo exatamente quando a opacidade chega a zero.
    const timer = setTimeout(() => {
      LayoutAnimation.configureNext({
        duration: 220,
        update: { type: 'easeInEaseOut' },
      });
      setRenderedIndex(activeIndex);
    }, 120);

    return () => clearTimeout(timer);
  }, [activeIndex, contentOpacity, contentShift]);

  const onTabsLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width / sections.length;
    setTabWidth(width);
    // Sem animar na primeira medição, senão o indicador entra voando da esquerda.
    indicatorX.setValue(activeIndex * width);
  };

  const active = sections[renderedIndex] ?? sections[0];

  return (
    <View>
      <View style={styles.tabs} onLayout={onTabsLayout}>
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.indicator,
              { width: tabWidth - 6, transform: [{ translateX: indicatorX }] },
            ]}
          />
        )}

        {sections.map((section, index) => {
          const isActive = index === activeIndex;
          return (
            <Pressable
              key={section.key}
              onPress={() => setActiveIndex(index)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={section.label}
            >
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                numberOfLines={1}
              >
                {section.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View
        style={{
          opacity: contentOpacity,
          transform: [{ translateX: contentShift }],
        }}
      >
        {active?.render()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginBottom: spacing.lg,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: { ...type.smallMedium, color: colors.textFaint },
  tabLabelActive: { color: colors.text },
});
