import { CurrencyCalculator } from './components/CurrencyCalculator'
import { CountrySelector } from './components/CountrySelector'
import { Cheatsheet } from './components/Cheatsheet'

function App() {
  return (
    <main className="min-h-screen px-4 py-6 max-w-md mx-auto">
      <h1 className="font-display text-xl mb-4">Travel Toolkit</h1>
      <CountrySelector />
      <CurrencyCalculator />
      <Cheatsheet />
    </main>
  )
}

export default App
