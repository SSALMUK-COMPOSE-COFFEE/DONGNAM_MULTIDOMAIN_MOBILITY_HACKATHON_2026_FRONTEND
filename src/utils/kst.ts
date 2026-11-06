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

const KST_DATE_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const todayKstIso = (now = new Date()) => {
  const parts = KST_DATE_PARTS.formatToParts(now);

  return ['year', 'month', 'day']
    .map(type => parts.find(part => part.type === type)?.value ?? '')
    .join('-');
};
