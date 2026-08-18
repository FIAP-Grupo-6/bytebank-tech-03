import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { colors, type } from '@/theme';
import { formatBRL } from '@/lib/format';
import type { CategorySlice } from '@/types';

interface DonutChartProps {
  slices: CategorySlice[];
  size?: number;
  thickness?: number;
  /** Texto grande no centro. */
  centerValue: number;
  centerLabel: string;
}

/**
 * Rosca desenhada com `strokeDasharray` em círculos concêntricos.
 *
 * Escrito à mão em vez de usar uma lib de gráficos por um motivo prático: as
 * bibliotecas populares de chart em RN (gifted-charts, victory-native novo)
 * dependem de módulos nativos, tipo `react-native-linear-gradient` ou Skia,
 * que não existem no Expo Go. Com `react-native-svg`, que já vem no Expo Go,
 * o app roda sem prebuild e o vídeo da entrega pode ser gravado direto no
 * celular.
 */
export function DonutChart({
  slices,
  size = 200,
  thickness = 26,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Deslocamento acumulado de cada fatia, calculado antes do render para não
  // mutar variável dentro do map.
  let running = 0;
  const arcs = slices.map((slice) => {
    const length = slice.share * circumference;
    const arc = { ...slice, length, offset: running };
    running += length;
    return arc;
  });

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        {/* Trilha de fundo: mantém o anel visível mesmo com uma fatia só. */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.surfaceAlt}
          strokeWidth={thickness}
          fill="none"
        />

        {/* Roda -90° para a primeira fatia começar no topo, não às 3 horas. */}
        <G rotation={-90} originX={center} originY={center}>
          {arcs.map((arc) => (
            <Circle
              key={arc.category}
              cx={center}
              cy={center}
              r={radius}
              stroke={arc.color}
              strokeWidth={thickness}
              fill="none"
              strokeLinecap="butt"
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </G>
      </Svg>

      {/* O centro é View sobreposta, não <Text> do SVG: assim herda a fonte da
          marca e o ajuste automático de tamanho. */}
      <View style={[styles.center, { width: size, height: size }]} pointerEvents="none">
        <Text style={styles.centerLabel}>{centerLabel}</Text>
        <Text style={styles.centerValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatBRL(centerValue)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'center' },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
  },
  centerLabel: { ...type.label, color: colors.textFaint },
  centerValue: { ...type.h2, color: colors.text, marginTop: 2 },
});
