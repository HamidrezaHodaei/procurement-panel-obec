'use client';

import * as React from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  JALALI_MONTHS, JALALI_WEEKDAYS_SHORT, formatJalali, isoToJalali, jalaliMonthLength, jalaliToIso,
  parseJalaliInput, toFaDigits, todayIso
} from '@/lib/jalali';
import { OptionSelect } from './form-parts';

/**
 * Shamsi (Jalali) date picker. Value is a Gregorian ISO string (YYYY-MM-DD) so the database
 * and APIs stay standard; everything the user sees and types is Jalali.
 * Styled with the reference project's Popover/Button/Input primitives.
 */
export function JalaliDatePicker({
  value, onChange, placeholder = '۱۴۰۵/۰۱/۰۱', invalid, disabled, className, clearable = true
}: {
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
}) {
  const [text, setText] = React.useState(formatJalali(value));
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setText(formatJalali(value)), [value]);

  const commit = () => {
    if (text.trim() === '') return onChange(null);
    const iso = parseJalaliInput(text);
    if (iso) onChange(iso);
    else setText(formatJalali(value)); // invalid → revert
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Input
        dir='ltr'
        className='text-center tabular-nums'
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button type='button' variant='outline' size='icon' disabled={disabled} aria-label='انتخاب تاریخ' />}>
          <Icons.calendar />
        </PopoverTrigger>
        <PopoverContent align='end' className='w-auto p-0'>
          <JalaliCalendar
            value={value}
            onSelect={(iso) => { onChange(iso); setOpen(false); }}
            onClear={clearable ? () => { onChange(null); setOpen(false); } : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function JalaliCalendar({ value, onSelect, onClear }: { value?: string | null; onSelect: (iso: string) => void; onClear?: () => void }) {
  const today = isoToJalali(todayIso())!;
  const start = isoToJalali(value) ?? today;
  const [y, setY] = React.useState(start.jy);
  const [m, setM] = React.useState(start.jm);

  const first = jalaliToIso(y, m, 1)!;
  const [fy, fm, fd] = first.split('-').map(Number);
  const offset = (new Date(fy, fm - 1, fd).getDay() + 1) % 7; // Saturday = 0
  const len = jalaliMonthLength(y, m);
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: len }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const move = (delta: number) => {
    let nm = m + delta, ny = y;
    if (nm < 1) { nm = 12; ny -= 1; } else if (nm > 12) { nm = 1; ny += 1; }
    setM(nm); setY(ny);
  };
  const years = Array.from({ length: 41 }, (_, i) => today.jy - 30 + i);
  const sel = isoToJalali(value);

  return (
    <div className='w-[17.5rem] space-y-2 p-3' dir='rtl'>
      <div className='flex items-center gap-1'>
        <Button type='button' variant='ghost' size='icon-sm' onClick={() => move(-1)} aria-label='ماه قبل'><Icons.chevronLeft className='rtl:rotate-180' /></Button>
        <OptionSelect className='h-7 flex-1' value={m} onChange={(v) => setM(Number(v))} options={JALALI_MONTHS.map((n, i) => ({ value: i + 1, label: n }))} />
        <OptionSelect className='h-7 w-24' value={y} onChange={(v) => setY(Number(v))} options={years.map((yy) => ({ value: yy, label: toFaDigits(yy) }))} />
        <Button type='button' variant='ghost' size='icon-sm' onClick={() => move(1)} aria-label='ماه بعد'><Icons.chevronRight className='rtl:rotate-180' /></Button>
      </div>
      <div className='text-muted-foreground grid grid-cols-7 text-center text-[0.8rem]'>
        {JALALI_WEEKDAYS_SHORT.map((d) => <div key={d} className='py-1'>{d}</div>)}
      </div>
      <div className='grid grid-cols-7 gap-y-1'>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const isSel = sel && sel.jy === y && sel.jm === m && sel.jd === d;
          const isToday = today.jy === y && today.jm === m && today.jd === d;
          return (
            <Button
              key={i} type='button' size='icon' variant={isSel ? 'default' : 'ghost'}
              className={cn('mx-auto size-8 font-normal', isToday && !isSel && 'bg-muted')}
              onClick={() => onSelect(jalaliToIso(y, m, d)!)}
            >
              {toFaDigits(d)}
            </Button>
          );
        })}
      </div>
      <div className='flex justify-between border-t pt-2'>
        <Button type='button' variant='ghost' size='sm' onClick={() => onSelect(todayIso())}>امروز</Button>
        {onClear && <Button type='button' variant='ghost' size='sm' onClick={onClear}>پاک کردن</Button>}
      </div>
    </div>
  );
}
