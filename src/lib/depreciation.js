const LIFESPAN_YEARS = 5

export function calcDepreciation(purchasePrice, purchaseDate) {
  if (!purchasePrice || !purchaseDate) return null

  const price = parseFloat(purchasePrice)
  if (isNaN(price) || price <= 0) return null

  const msPerYear = 1000 * 60 * 60 * 24 * 365.25
  const yearsOld = (Date.now() - new Date(purchaseDate)) / msPerYear
  const perYear = price / LIFESPAN_YEARS
  const depreciated = Math.min(price, perYear * Math.max(0, yearsOld))
  const currentValue = Math.max(0, price - depreciated)
  const percentDepreciated = Math.min(100, (depreciated / price) * 100)
  const remainingYears = Math.max(0, LIFESPAN_YEARS - yearsOld)

  return {
    originalPrice: price,
    currentValue: Math.round(currentValue * 100) / 100,
    perYear: Math.round(perYear * 100) / 100,
    percentDepreciated: Math.round(percentDepreciated * 10) / 10,
    percentRemaining: Math.round((100 - percentDepreciated) * 10) / 10,
    yearsOld: Math.round(yearsOld * 10) / 10,
    remainingYears: Math.round(remainingYears * 10) / 10,
    fullyDepreciated: yearsOld >= LIFESPAN_YEARS,
  }
}

export function fmtSGD(val) {
  return `SGD ${Number(val).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
