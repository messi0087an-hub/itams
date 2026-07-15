import { useEffect, useState } from "react"
import { supabase } from "./supabase"

export const CURRENCIES = [
  { code: "SGD", symbol: "S$" },
  { code: "MYR", symbol: "RM" },
  { code: "IDR", symbol: "Rp" },
  { code: "USD", symbol: "$" },
  { code: "PHP", symbol: "₱" },
  { code: "THB", symbol: "฿" },
  { code: "VND", symbol: "₫" },
  { code: "CNY", symbol: "¥" },
]

const SYMBOLS = Object.fromEntries(CURRENCIES.map(c => [c.code, c.symbol]))

export function useCurrency() {
  const [currency, setCurrency] = useState("SGD")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from("system_settings")
      .select("currency")
      .eq("id", "global")
      .single()
      .then(({ data }) => {
        if (!active) return
        if (data?.currency) setCurrency(data.currency)
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  return { currency, symbol: SYMBOLS[currency] || currency, loading }
}
