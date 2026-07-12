import { useThemeController } from '../lib/theme'

export function ThemeToggle() {
  const { effective, toggle } = useThemeController()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={effective === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-full border border-[var(--color-border)] w-8 h-8 flex items-center justify-center text-sm shrink-0"
    >
      {effective === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
