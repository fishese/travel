import type { ComponentType } from 'react'
import { CurrencyCalculator } from './components/CurrencyCalculator'
import { CountrySelector } from './components/CountrySelector'
import { WeatherCard } from './components/WeatherCard'
import { Cheatsheet } from './components/Cheatsheet'
import { FlightsSection } from './components/FlightsSection'
import { HotelsSection } from './components/HotelsSection'
import { BookingsSection } from './components/BookingsSection'
import { DiveCertsSection } from './components/DiveCertsSection'
import { DocumentVault } from './components/DocumentVault'
import { ReminderFeed } from './components/ReminderFeed'
import { ThemeToggle } from './components/ThemeToggle'
import { TabBar } from './components/TabBar'
import { FloatingShortcut } from './components/FloatingShortcut'
import { useActiveTab } from './lib/tabs'
import { useSectionOrder } from './lib/sectionOrder'

interface SectionProps {
  onMoveUp?: () => void
  onMoveDown?: () => void
}

// Planner tab's reorderable sections. Keys must match
// lib/sectionOrder.ts's DEFAULT_SECTION_ORDER. Cheatsheet lives in its own
// tab now, not mixed in with these.
const SECTION_COMPONENTS: Record<string, ComponentType<SectionProps>> = {
  flights: FlightsSection,
  hotels: HotelsSection,
  bookings: BookingsSection,
  'dive-certs': DiveCertsSection,
  documents: DocumentVault,
}

function App() {
  const [activeTab] = useActiveTab()
  const { order, moveUp, moveDown } = useSectionOrder()

  return (
    <>
      <main className="min-h-screen px-3 py-3 pb-24 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-lg">Travel Toolkit</h1>
          <ThemeToggle />
        </div>

        {activeTab === 'dashboard' && (
          <>
            <ReminderFeed />
            <WeatherCard />
            <CountrySelector />
          </>
        )}

        {activeTab === 'money' && <CurrencyCalculator />}

        {activeTab === 'planner' &&
          order.map((id, idx) => {
            const Section = SECTION_COMPONENTS[id]
            if (!Section) return null
            return (
              <Section
                key={id}
                onMoveUp={idx > 0 ? () => moveUp(id) : undefined}
                onMoveDown={idx < order.length - 1 ? () => moveDown(id) : undefined}
              />
            )
          })}

        {activeTab === 'cheatsheet' && <Cheatsheet />}
      </main>

      <FloatingShortcut />
      <TabBar />
    </>
  )
}

export default App
