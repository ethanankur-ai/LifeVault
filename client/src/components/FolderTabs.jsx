// A row of folder index tabs sitting on a line. Used for the main menu and the member filters.
// tabs: [{ value, label, color? }]; the selected tab turns ink-black, the others keep their colour.
export default function FolderTabs({ label, tabs, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 overflow-x-auto border-b-2 border-ink pt-1">
      {tabs.map((t) => {
        const on = t.value === value
        return (
          <button
            key={t.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(t.value)}
            className={`min-h-11 shrink-0 rounded-t-[10px] px-3.5 font-mono text-[13px] font-semibold tracking-wide uppercase transition hover:-translate-y-0.5 ${on ? 'bg-ink text-white' : 'text-ink'}`}
            style={on ? undefined : { background: t.color ?? '#D5D9DF' }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
