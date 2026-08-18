import { useEffect, useMemo } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Entrada em cascata: devolve um `Animated.Value` por item, animados em
 * sequência com um intervalo curto entre eles.
 *
 * Tudo com driver nativo: só mexemos em `opacity` e `translateY`, que a UI
 * thread resolve sem passar pelo JS.
 */
export function useStaggeredEntrance(count: number, stagger = 70) {
  const values = useMemo(
    () => Array.from({ length: count }, () => new Animated.Value(0)),
    [count]
  );

  useEffect(() => {
    const animations = values.map((value) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );

    const sequence = Animated.stagger(stagger, animations);
    sequence.start();

    return () => sequence.stop();
  }, [values, stagger]);

  /** Estilo pronto para espalhar no `Animated.View`. */
  const styleFor = (index: number) => {
    const value = values[index] ?? new Animated.Value(1);
    return {
      opacity: value,
      transform: [
        {
          translateY: value.interpolate({
            inputRange: [0, 1],
            outputRange: [14, 0],
          }),
        },
      ],
    };
  };

  return { styleFor };
}
