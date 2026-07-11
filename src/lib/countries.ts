import countriesData from '../data/countries.json'

export interface EmergencyNumbers {
  police: string
  ambulance: string
  fire: string
}
export interface EmbassyContact {
  name_en: string
  phone: string
  address_en: string
  official_url: string
}
export interface DiveEmergency {
  applicable: boolean
  dan_hotline: string
  nearest_hyperbaric_note_en: string
  official_url: string
}
export interface FoodLink {
  label: string
  url: string
}
export interface PowerInfo {
  voltage: string
  plugs: string
  note: string
}
export interface TippingInfo {
  customary: boolean
  default_percents: number[]
  tip_on: string
  note_en: string
  note_zh?: string
}
export interface SalesTaxInfo {
  price_display: 'tax_included' | 'tax_added'
  default_rate_percent: number
  regions: { name: string; rate_percent: number; note?: string }[]
  note_en: string
}
export interface TaxRefundInfo {
  available: boolean
  scheme_name_en: string
  typical_rate_percent: number
  min_purchase_note_en: string
  how_it_works_en: string
  where_to_claim_en: string
  tips_en: string[]
  official_url: string
}
export interface VisaCaution {
  level: string
  summary: string
  official_url: string
}
export interface PreArrivalForm {
  id: string
  name_en: string
  name_zh: string
  official_url: string
  applies_to: string
  required_level: string
  lead_days_before: number
  notes_en: string
  notes_zh: string
  confidence: string
}

export interface Country {
  iso2: string
  name_en: string
  name_zh: string
  currency: string
  emergency: EmergencyNumbers
  embassy_hk: EmbassyContact
  dive_emergency: DiveEmergency
  last_verified: string
  food_links: FoodLink[]
  power: PowerInfo
  tipping: TippingInfo
  sales_tax: SalesTaxInfo
  tax_refund: TaxRefundInfo
  visa_caution: VisaCaution
  pre_arrival_forms: PreArrivalForm[]
}

export interface Airport {
  iata: string
  name: string
  city: string
  country_iso2: string
  reference_point_en: string
  typical_transport_en: string
  typical_minutes: number
  international_departure_buffer_hours: number
  assumptions_en: string
}

// Cast once — the JSON is produced by the Gemini pipeline (see
// docs/country-db-gemini-prompt.md) and manually verified before being
// dropped in here, but isn't structurally guaranteed by TypeScript itself.
const data = countriesData as unknown as { countries: Country[]; airports: Airport[] }

export function listCountries(): Country[] {
  return [...data.countries].sort((a, b) => a.name_en.localeCompare(b.name_en))
}

export function getCountry(iso2: string): Country | undefined {
  return data.countries.find((c) => c.iso2 === iso2)
}

export function getAirportsForCountry(iso2: string): Airport[] {
  return data.airports.filter((a) => a.country_iso2 === iso2)
}
