import { TABS, useActiveTab } from '../lib/tabs'

export function TabBar() {
  const [active, setActive] = useActiveTab()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] max-w-md mx-auto flex">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActive(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
          className={
            'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ' +
            (active === tab.id ? 'text-[var(--color-pine)]' : 'text-[var(--color-muted)]')
          }
        >
          <span className="text-lg" aria-hidden>
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
