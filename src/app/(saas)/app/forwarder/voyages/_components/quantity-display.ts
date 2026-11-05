export const quantityTimestamp = (value: string | null | undefined) => {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
};

export const quantityPercent = (value: string | number) =>
  new Intl.NumberFormat('ko-KR', { style: 'percent', maximumFractionDigits: 2 }).format(
    Number(value)
  );
