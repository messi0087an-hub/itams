// Returns 0-100 health score and color band for an asset
export function calculateHealthScore(asset, maintenanceRecords = []) {
  let score = 100

  // Age penalty: -2 pts per year old, max -30
  if (asset.purchase_date) {
    const years = (Date.now() - new Date(asset.purchase_date)) / (1000 * 60 * 60 * 24 * 365)
    score -= Math.min(30, Math.round(years * 2))
  }

  // Warranty: expired = -15
  if (asset.warranty_expiry) {
    if (new Date(asset.warranty_expiry) < new Date()) score -= 15
    else {
      const daysLeft = (new Date(asset.warranty_expiry) - Date.now()) / (1000 * 60 * 60 * 24)
      if (daysLeft < 90) score -= 5
    }
  } else {
    score -= 10
  }

  // Status penalty
  if (asset.status === "retired") score -= 40
  if (asset.status === "maintenance") score -= 20

  // Maintenance history bonus: +2 per completed record, max +15
  const completedMaint = maintenanceRecords.filter(m => m.status === "completed").length
  score += Math.min(15, completedMaint * 2)

  // Overdue maintenance penalty: -10 per overdue
  const overdueMaint = maintenanceRecords.filter(m => {
    if (m.status !== "pending") return false
    return new Date(m.scheduled_date) < new Date(new Date().toDateString())
  }).length
  score -= overdueMaint * 10

  score = Math.max(0, Math.min(100, score))

  let band = "green"
  if (score <= 40) band = "red"
  else if (score <= 70) band = "yellow"

  return { score, band }
}

export const HEALTH_COLORS = {
  green:  { bg: "bg-green-500/20",  text: "text-green-400",  bar: "bg-green-500",  label: "Healthy" },
  yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400", bar: "bg-yellow-500", label: "Fair" },
  red:    { bg: "bg-red-500/20",    text: "text-red-400",    bar: "bg-red-500",    label: "Needs Attention" },
}
