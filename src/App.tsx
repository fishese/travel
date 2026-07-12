import { CurrencyCalculator } from './components/CurrencyCalculator'
import { CountrySelector } from './components/CountrySelector'
import { WeatherCard } from './components/WeatherCard'
import { Cheatsheet } from './components/Cheatsheet'
import { FlightsSection } from './components/FlightsSection'
import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <main className="min-h-screen px-3 py-3 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-lg">Travel Toolkit</h1>
        <ThemeToggle />
      </div>
      <WeatherCard />
      <CountrySelector />
      <CurrencyCalculator />
      <FlightsSection />
      <Cheatsheet />
    </main>
  )
}

export default App
