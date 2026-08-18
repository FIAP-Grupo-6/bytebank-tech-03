import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

/**
 * Anima um número de zero até `target`.
 *
 * Este é o único lugar do app onde `useNativeDriver` fica em `false`, e por um
 * motivo concreto: o valor precisa voltar para o JS a cada frame para ser
 * formatado como moeda. Driver nativo não consegue interpolar texto.
 *
 * O custo é aceitável porque anima um único valor por 700 ms, uma vez.
 */
export function useCountUp(target: number, duration = 700): number {
  const animated = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(target);
  const previous = useRef(0);

  useEffect(() => {
    const from = previous.current;
    previous.current = target;

    animated.setValue(0);
    const listener = animated.addListener(({ value }) => {
      setDisplay(from + (target - from) * value);
    });

    const animation = Animated.timing(animated, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      // Garante o valor exato no fim: interpolação em ponto flutuante costuma
      // parar em 0.9999 e deixar centavos de diferença.
      if (finished) setDisplay(target);
    });

    return () => {
      animation.stop();
      animated.removeListener(listener);
    };
  }, [target, duration, animated]);

  return display;
}
