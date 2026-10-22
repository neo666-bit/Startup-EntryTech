export const fmtInt = (n: number): string => Math.round(n).toLocaleString('pt-BR');

export const fmtDec = (n: number, digits = 1): string =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const WEEKDAYS_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const weekdayShort = (weekday: number): string => WEEKDAYS_SHORT[weekday];
export const weekdayLong = (weekday: number): string => WEEKDAYS_LONG[weekday];

/** Ex.: "qua, 22 out" */
export const dateLabel = (d: Date): string => `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
