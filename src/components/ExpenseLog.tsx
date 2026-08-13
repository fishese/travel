import { useMemo, useState } from 'react'
import { useSetting } from '../lib/useSetting'
import { localDateStr } from '../lib/dateUtils'

interface Expense {
  id: string
  date: string
  amount: number
  currency: string
  note: string
}
const EMPTY: Expense[] = []
const COMMON_CURRENCIES = ['HKD', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'TWD', 'THB', 'AUD', 'CAD']

export function ExpenseLog() {
  const [expenses, setExpenses] = useSetting<Expense[]>('travel_expenses', EMPTY)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('HKD')
  const [note, setNote] = useState('')

  const totals = useMemo(() => {
    const result: Record<string, number> = {}
    for (const expense of expenses) result[expense.currency] = (result[expense.currency] ?? 0) + expense.amount
    return Object.entries(result)
  }, [expenses])

  function addExpense() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    setExpenses((prev) => [
      { id: Math.random().toString(36).slice(2, 9), date: localDateStr(), amount: value, currency, note: note.trim() },
      ...prev,
    ])
    setAmount('')
    setNote('')
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] p-3 mt-2">
      <h2 className="text-sm font-semibold mb-1">Expense log</h2>
      <p className="text-xs text-[var(--color-muted)] mb-2">Quickly record spending without turning this into a budget planner. Totals stay grouped by currency.</p>
      <div className="flex gap-2">
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="Amount" aria-label="Expense amount" className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Expense currency" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm">
          {COMMON_CURRENCIES.map((code) => <option key={code}>{code}</option>)}
        </select>
      </div>
      <div className="flex gap-2 mt-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addExpense()} placeholder="What was it? (optional)" className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
        <button type="button" onClick={addExpense} disabled={!amount} className="rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50">Add</button>
      </div>
      {totals.length > 0 && <p className="text-xs text-[var(--color-pine)] mt-2">Totals: {totals.map(([code, total]) => `${total.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${code}`).join(' · ')}</p>}
      {expenses.length > 0 && (
        <div className="mt-2 space-y-1">
          {expenses.slice(0, 8).map((expense) => (
            <div key={expense.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">{expense.note || 'Expense'} <span className="text-[var(--color-muted)]">· {expense.date}</span></span>
              <span className="tabular shrink-0">{expense.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {expense.currency}</span>
              <button type="button" aria-label={`Delete ${expense.note || 'expense'}`} onClick={() => setExpenses((prev) => prev.filter((item) => item.id !== expense.id))} className="text-[var(--color-muted)]">×</button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
