const STATUS_LABELS = {
  available: "Unassigned",
  assigned: "Assigned",
  maintenance: "Maintenance",
  retired: "Retired",
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status
}
