const EMPTY = '–';

const KST_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export const formatKstMonthDayTime = (dateTime: string | null | undefined) => {
  if (!dateTime) return EMPTY;
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return EMPTY;
  const parts = KST_PARTS.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value ?? '';

  return `${part('month')}/${part('day')} ${part('hour')}:${part('minute')}`;
};
