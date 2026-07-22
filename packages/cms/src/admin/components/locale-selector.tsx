interface LocaleSelectorProps {
  value: string;
  onChange: (locale: string) => void;
  locales: string[];
}

export function LocaleSelector({ locales, onChange, value }: LocaleSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
      aria-label="Locale"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {l.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
