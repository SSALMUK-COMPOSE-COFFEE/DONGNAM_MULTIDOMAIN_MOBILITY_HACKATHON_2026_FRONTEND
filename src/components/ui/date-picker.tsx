'use client';

import { cn } from 'cn';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Popover } from 'radix-ui';
import { type ComponentProps, type KeyboardEvent, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { todayKstIso } from '@/utils/kst';

type DatePickerProps = Omit<ComponentProps<'button'>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
};

const dateString = (date: Date) =>
  `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseDate = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(2000, month - 1, day, 12);
  date.setFullYear(year);

  return year >= 1 && dateString(date) === value ? date : null;
};

const dayAfter = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);

  return next;
};

const monthAfter = (date: Date, amount: number) => {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + amount);
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, last));

  return next;
};

export function DatePicker({
  value,
  onValueChange,
  min,
  max,
  placeholder = '날짜 선택',
  className,
  disabled,
  ...props
}: DatePickerProps) {
  const today = todayKstIso();
  const todayDate = parseDate(today)!;
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => parseDate(value) ?? todayDate);
  const [view, setView] = useState<'day' | 'month' | 'year'>('day');
  const [yearStart, setYearStart] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const instructionsId = useId();
  const lower = parseDate(min) ? min! : '0001-01-01';
  const upper = parseDate(max) ? max! : '9999-12-31';
  const selected = parseDate(value);
  const cursorValue = dateString(cursor);
  const monthStart = new Date(cursor);
  monthStart.setDate(1);
  const monthEnd = monthAfter(monthStart, 1);
  monthEnd.setDate(0);
  const days = Array.from({ length: monthEnd.getDate() }, (_, index) =>
    dayAfter(monthStart, index)
  );
  const available = (date: Date) =>
    date.getFullYear() >= 1 &&
    date.getFullYear() <= 9999 &&
    dateString(date) >= lower &&
    dateString(date) <= upper;
  const clamp = (date: Date) => {
    if (date.getFullYear() < 1) return parseDate(lower)!;
    if (date.getFullYear() > 9999) return parseDate(upper)!;
    const day = dateString(date);
    if (day < lower) return parseDate(lower)!;
    if (day > upper) return parseDate(upper)!;

    return date;
  };
  const focusDay = () =>
    contentRef.current?.querySelector<HTMLButtonElement>('[data-focus-day="true"]')?.focus();
  const move = (date: Date) => {
    setCursor(clamp(date));
    requestAnimationFrame(focusDay);
  };
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const lowerYear = Number(lower.slice(0, 4));
  const upperYear = Number(upper.slice(0, 4));
  const monthAvailable = (targetYear: number, targetMonth: number) => {
    const prefix = `${String(targetYear).padStart(4, '0')}-${String(targetMonth + 1).padStart(2, '0')}`;

    return (
      targetYear >= 1 && targetYear <= 9999 && `${prefix}-01` <= upper && `${prefix}-31` >= lower
    );
  };
  const focusOption = () => {
    const content = contentRef.current;
    const target =
      content?.querySelector<HTMLButtonElement>('[data-option-focus="true"]:not(:disabled)') ??
      content?.querySelector<HTMLButtonElement>('[data-calendar-option]:not(:disabled)');
    target?.focus();
  };
  const showView = (next: 'day' | 'month' | 'year') => {
    if (next === 'year') setYearStart(Math.min(Math.max(Math.floor(year / 10) * 10, 1), 9988));
    setView(next);
    requestAnimationFrame(next === 'day' ? focusDay : focusOption);
  };
  const changeYearPage = (direction: number) => {
    if (direction < 0 && yearStart <= lowerYear) return;
    if (direction > 0 && yearStart + 11 >= upperYear) return;
    setYearStart(start => Math.min(Math.max(start + direction * 12, 1), 9988));
    requestAnimationFrame(focusOption);
  };
  const onOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const options = Array.from(
      contentRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-calendar-option]:not(:disabled)'
      ) ?? []
    );
    const index = options.indexOf(event.currentTarget);
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[event.key];
    let target = index;
    if (typeof step === 'number') target = Math.min(Math.max(index + step, 0), options.length - 1);
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = options.length - 1;
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      const direction = event.key === 'PageUp' ? -1 : 1;
      if (view === 'year') changeYearPage(direction);
      else {
        setCursor(clamp(monthAfter(cursor, direction * 12)));
        requestAnimationFrame(focusOption);
      }

      return;
    } else return;
    event.preventDefault();
    options[target]?.focus();
  };
  const navigation = {
    year: {
      previous: yearStart <= lowerYear,
      next: yearStart + 11 >= upperYear,
      label: '연도 범위',
    },
    month: { previous: year <= lowerYear, next: year >= upperYear, label: '해' },
    day: {
      previous: dateString(dayAfter(monthStart, -1)) < lower,
      next: dateString(dayAfter(monthEnd, 1)) > upper,
      label: '달',
    },
  }[view];
  const previousDisabled = navigation.previous;
  const nextDisabled = navigation.next;
  const pageLabel = navigation.label;
  const navigate = (direction: number) => {
    if (view === 'year') changeYearPage(direction);
    else setCursor(clamp(monthAfter(cursor, direction * (view === 'month' ? 12 : 1))));
  };
  const choose = (date: Date) => {
    if (!available(date)) return;
    onValueChange(dateString(date));
    setOpen(false);
  };
  const onDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    const amount = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    let next: Date | undefined;
    if (typeof amount === 'number') next = dayAfter(date, amount);
    if (event.key === 'Home') next = dayAfter(date, -date.getDay());
    if (event.key === 'End') next = dayAfter(date, 6 - date.getDay());
    if (event.key === 'PageUp') next = monthAfter(date, event.shiftKey ? -12 : -1);
    if (event.key === 'PageDown') next = monthAfter(date, event.shiftKey ? 12 : 1);
    if (next) {
      event.preventDefault();
      move(next);
    }
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={next => {
        if (next) {
          setCursor(clamp(parseDate(value) ?? parseDate(todayKstIso())!));
          setView('day');
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <Button
          {...props}
          type="button"
          variant="outline"
          disabled={disabled}
          data-slot="date-picker-trigger"
          className={cn(
            'w-full justify-between font-normal tabular-nums',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          <span>{selected ? value.replaceAll('-', '.') : placeholder}</span>
          <CalendarDaysIcon aria-hidden className="size-4 text-muted-foreground" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={contentRef}
          aria-label="날짜 선택"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={event => {
            event.preventDefault();
            focusDay();
          }}
          onEscapeKeyDown={event => event.stopPropagation()}
          className="z-[60] max-h-[var(--radix-popover-content-available-height)] w-[292px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-[8px] border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-[4px]"
              aria-label={`이전 ${pageLabel}`}
              disabled={previousDisabled}
              onClick={() => navigate(-1)}
            >
              <ChevronLeftIcon aria-hidden />
            </Button>
            <div className="flex items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`${year}년, 연도 선택`}
                aria-pressed={view === 'year'}
                onClick={() => showView('year')}
                className="rounded-[4px] px-1 font-semibold"
              >
                {year}년
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`${month + 1}월, 월 선택`}
                aria-pressed={view === 'month'}
                onClick={() => showView('month')}
                className="rounded-[4px] px-1 font-semibold"
              >
                {month + 1}월
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-[4px]"
              aria-label={`다음 ${pageLabel}`}
              disabled={nextDisabled}
              onClick={() => navigate(1)}
            >
              <ChevronRightIcon aria-hidden />
            </Button>
          </div>
          <p
            id={headingId}
            aria-live="polite"
            className={
              view === 'year' ? 'mb-3 text-center text-xs text-muted-foreground' : 'sr-only'
            }
          >
            {view === 'year'
              ? `${yearStart}–${yearStart + 11}년 · 연도 선택`
              : `${year}년 ${view === 'month' ? '· 월 선택' : `${month + 1}월`}`}
          </p>
          {view !== 'day' && (
            <div role="group" aria-labelledby={headingId} className="grid grid-cols-3 gap-2 py-1">
              {Array.from({ length: 12 }, (_, index) => {
                const optionYear = view === 'year' ? yearStart + index : year;
                const optionMonth = view === 'month' ? index : month;
                const isSelected =
                  selected?.getFullYear() === optionYear &&
                  (view === 'year' || selected?.getMonth() === optionMonth);
                const focused = view === 'year' ? optionYear === year : optionMonth === month;
                const enabled =
                  view === 'year'
                    ? optionYear >= lowerYear && optionYear <= upperYear
                    : monthAvailable(optionYear, optionMonth);

                return (
                  <Button
                    key={index}
                    type="button"
                    variant={isSelected ? 'default' : 'ghost'}
                    className="h-11 rounded-[4px] tabular-nums"
                    disabled={!enabled}
                    aria-pressed={isSelected}
                    data-calendar-option
                    data-option-focus={focused}
                    onKeyDown={onOptionKeyDown}
                    onClick={() => {
                      const next = monthAfter(
                        cursor,
                        (optionYear - year) * 12 + optionMonth - month
                      );
                      setCursor(clamp(next));
                      const nextView = view === 'year' ? 'month' : 'day';
                      setView(nextView);
                      requestAnimationFrame(nextView === 'day' ? focusDay : focusOption);
                    }}
                  >
                    {view === 'year' ? `${optionYear}년` : `${optionMonth + 1}월`}
                  </Button>
                );
              })}
            </div>
          )}
          <p id={instructionsId} className="sr-only">
            방향키로 날짜 이동, Page Up과 Page Down으로 월 이동, Enter로 선택합니다.
          </p>
          {view === 'day' && (
            <table
              role="grid"
              aria-labelledby={headingId}
              aria-describedby={instructionsId}
              className="w-full table-fixed border-collapse text-center text-sm"
            >
              <thead>
                <tr>
                  {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                    <th
                      key={day}
                      scope="col"
                      className="h-8 text-xs font-normal text-muted-foreground"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(
                  { length: Math.ceil((monthStart.getDay() + days.length) / 7) },
                  (_, week) => (
                    <tr key={week}>
                      {Array.from({ length: 7 }, (_, weekday) => {
                        const day = days[week * 7 + weekday - monthStart.getDay()];
                        if (!day) return <td key={weekday} />;
                        const iso = dateString(day);
                        const isSelected = iso === value;

                        return (
                          <td key={weekday} aria-selected={isSelected} className="p-0.5">
                            <Button
                              type="button"
                              variant={isSelected ? 'default' : 'ghost'}
                              size="icon"
                              className={cn(
                                'h-9 w-full rounded-[4px] font-normal tabular-nums',
                                iso === today &&
                                  !isSelected &&
                                  'bg-accent font-semibold text-accent-foreground ring-1 ring-primary/40 ring-inset'
                              )}
                              aria-label={`${day.getFullYear()}년 ${day.getMonth() + 1}월 ${day.getDate()}`}
                              {...(iso === today ? { 'aria-current': 'date' as const } : {})}
                              data-focus-day={iso === cursorValue}
                              tabIndex={iso === cursorValue ? 0 : -1}
                              disabled={!available(day)}
                              onKeyDown={event => onDayKeyDown(event, day)}
                              onClick={() => choose(day)}
                            >
                              {day.getDate()}
                            </Button>
                          </td>
                        );
                      })}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
            <span className="text-xs text-muted-foreground">오늘 {today.replaceAll('-', '.')}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-[4px]"
              disabled={!available(todayDate)}
              onClick={() => choose(todayDate)}
            >
              오늘 선택
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
