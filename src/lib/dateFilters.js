export function getLastNMonths(n = 12) {
  const now = new Date()
  const months = []
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("en-SG", { month: "long", year: "numeric" })
    months.push({ value, label })
  }
  return months
}

export function matchesMonth(dateStr, monthValue) {
  if (!dateStr || !monthValue) return true
  const d = new Date(dateStr)
  const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  return value === monthValue
}
