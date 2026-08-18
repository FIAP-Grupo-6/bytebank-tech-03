import { Fragment } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { colors, fonts } from '@/theme';
import { formatCompact } from '@/lib/format';
import type { MonthPoint } from '@/types';

interface GroupedBarChartProps {
  data: MonthPoint[];
  width: number;
  height?: number;
}

const PADDING_TOP = 14;
const PADDING_BOTTOM = 26;
const PADDING_LEFT = 44;
const BAR_GAP = 3;
const GROUP_GAP = 14;

/**
 * Barras agrupadas: entrada e saída lado a lado por mês.
 *
 * Duas barras por mês em vez de uma barra de saldo líquido porque o saldo
 * esconde a informação que interessa: R$ 0 de saldo pode ser "não movimentei
 * nada" ou "gastei tudo que entrou", e são situações bem diferentes.
 */
export function GroupedBarChart({ data, width, height = 190 }: GroupedBarChartProps) {
  const plotWidth = width - PADDING_LEFT;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const max = Math.max(...data.map((point) => Math.max(point.credit, point.debit)), 1);
  // Arredonda o topo da escala para o eixo não terminar num número quebrado.
  const scaleMax = niceCeil(max);

  const groupWidth = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.max((groupWidth - GROUP_GAP - BAR_GAP) / 2, 4);

  const toY = (value: number) => PADDING_TOP + plotHeight * (1 - value / scaleMax);

  const gridLines = [0, 0.5, 1];

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Grade de referência: três linhas bastam para dar noção de escala
            sem transformar o gráfico em papel milimetrado. */}
        {gridLines.map((ratio) => {
          const y = PADDING_TOP + plotHeight * (1 - ratio);
          return (
            <Fragment key={ratio}>
              <Line
                x1={PADDING_LEFT}
                y1={y}
                x2={width}
                y2={y}
                stroke={colors.border}
                strokeWidth={1}
              />
              <SvgText
                x={PADDING_LEFT - 8}
                y={y + 4}
                fill={colors.textFaint}
                fontSize={10}
                fontFamily={fonts.regular}
                textAnchor="end"
              >
                {formatCompact(scaleMax * ratio)}
              </SvgText>
            </Fragment>
          );
        })}

        {data.map((point, index) => {
          const groupX = PADDING_LEFT + index * groupWidth + GROUP_GAP / 2;
          const creditHeight = Math.max(plotHeight * (point.credit / scaleMax), 0);
          const debitHeight = Math.max(plotHeight * (point.debit / scaleMax), 0);

          return (
            <Fragment key={point.key}>
              {point.credit > 0 && (
                <Rect
                  x={groupX}
                  y={toY(point.credit)}
                  width={barWidth}
                  height={creditHeight}
                  rx={3}
                  fill={colors.primary}
                />
              )}
              {point.debit > 0 && (
                <Rect
                  x={groupX + barWidth + BAR_GAP}
                  y={toY(point.debit)}
                  width={barWidth}
                  height={debitHeight}
                  rx={3}
                  fill={colors.danger}
                />
              )}
              <SvgText
                x={groupX + barWidth + BAR_GAP / 2}
                y={height - 8}
                fill={colors.textMuted}
                fontSize={11}
                fontFamily={fonts.medium}
                textAnchor="middle"
              >
                {point.label}
              </SvgText>
            </Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

/** Arredonda para cima até 1, 2 ou 5 × potência de 10, pra escala ficar legível. */
function niceCeil(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}
