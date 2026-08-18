import { useEffect, useState } from 'react';

/**
 * Atrasa a propagação de um valor. Usado no campo de busca: sem isso, cada
 * tecla refiltraria a lista inteira.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
