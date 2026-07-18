const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function getLastNMonths() {
  return MONTH_NAMES.map((label, i) => ({ value: String(i + 1).padStart(2, "0"), label }))
}

export function getYears() {
  return [2024, 2025, 2026, 2027]
}

export function matchesMonth(dateStr, monthValue, yearValue) {
  if (!dateStr) return true
  if (!monthValue && !yearValue) return true
  const d = new Date(dateStr)
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = String(d.getFullYear())
  if (monthValue && month !== monthValue) return false
  if (yearValue && year !== yearValue) return false
  return true
}
