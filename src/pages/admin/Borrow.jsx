import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import * as XLSX from "xlsx"
import { supabase } from "../../lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../../context/AuthContext"
import { checkBorrowReminders, sendBorrowUpdateEmail, sendNewBorrowAdminEmail, sendBorrowStatusAdminEmail, getAdminEmails } from "../../lib/emailService"
import { createNotification, notifyAdmins } from "../../lib/notifications"
import { EmptyState, LoadingSkeleton } from "../../components/EmptyState"
import { getLastNMonths, getYears, matchesMonth } from "../../lib/dateFilters"

function SuccessToast({ message }) {
  if (!message) return null
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)",
      borderRadius: "12px", padding: "12px 18px",
      display: "flex", alignItems: "center", gap: "10px",
      backdropFilter: "blur(12px)", boxShadow: "0 0 20px rgba(34,197,94,0.2)",
      animation: "slideInFromTop 0.3s ease-out",
    }}>
      <style>{`@keyframes slideInFromTop { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <span>✅</span>
      <span style={{color:"#86efac",fontSize:"14px",fontWeight:500}}>{message}</span>
    </div>
  )
}

const slideInStyle = `@keyframes slideInFromTop { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`

function AnimatedError({ message, onDismiss }) {
  if (!message) return null
  return (
    <div style={{animation:"slideInFromTop 0.3s ease-out",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:"12px",padding:"12px 16px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"10px",boxShadow:"0 0 20px rgba(239,68,68,0.15)"}}>
      <span style={{fontSize:"18px"}}>⚠️</span>
      <span style={{color:"#fca5a5",fontSize:"14px",flex:1}}>{message}</span>
      <button onClick={onDismiss} style={{color:"#9ca3af",background:"none",border:"none",cursor:"pointer",fontSize:"16px"}}>✕</button>
    </div>
  )
}

function exportBorrowsToExcel(borrows) {
  const rows = borrows.map(b => ({
    "Asset": b.assets?.name || "",
    "Serial No.": b.assets?.serial_number || "",
    "Borrower": b.borrower_name || "",
    "Signed Off By": b.signed_off_by || "",
    "Date Borrowed": b.borrowed_at ? new Date(b.borrowed_at).toLocaleDateString() : "",
    "Due Date": b.due_date ? new Date(b.due_date).toLocaleDateString() : "",
    "Returned": b.returned_at ? new Date(b.returned_at).toLocaleDateString() : "Active",
    "Notes": b.notes || "",
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Borrows")
  XLSX.writeFile(wb, `borrows_${new Date().toISOString().split("T")[0]}.xlsx`)
}

function getDaysRemaining(dueDate) {
  if (!dueDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
}

function DueBadge({ dueDate }) {
  const days = getDaysRemaining(dueDate)
  if (days === null) return null

  let color, label
  if (days < 0) {
    color = "bg-red-500/20 border-red-500/50 text-red-400"
    label = `${Math.abs(days)}d overdue`
  } else if (days === 0) {
    color = "bg-red-500/20 border-red-500/50 text-red-400"
    label = "Due today!"
  } else if (days < 3) {
    color = "bg-red-500/20 border-red-500/50 text-red-400"
    label = `${days}d left`
  } else if (days < 7) {
    color = "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
    label = `${days}d left`
  } else {
    color = "bg-green-500/20 border-green-500/50 text-green-400"
    label = `${days}d left`
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${color} font-medium`}>
      ⏱ {label}
    </span>
  )
}

function isOverdueBorrow(borrow) {
  if (borrow.returned_at) return false
  if (!borrow.due_date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(borrow.due_date) < today
}

export default function Borrow() {
  const { userProfile, canBorrow, userCountry, isAdmin, isStandardUser } = useAuth()
  const location = useLocation()
  const [borrows, setBorrows] = useState([])
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [borrowSuccess, setBorrowSuccess] = useState(false)
  const [returnSuccess, setReturnSuccess] = useState(false)
  const [returnedAssetName, setReturnedAssetName] = useState("")
  const [borrowedAssetName, setBorrowedAssetName] = useState("")
  const [dueBorrows, setDueBorrows] = useState([])
  const [dismissedDueAlert, setDismissedDueAlert] = useState(false)
  const [pendingExtensions, setPendingExtensions] = useState([])
  const [dismissedExtAlert, setDismissedExtAlert] = useState(false)
  const [extendingId, setExtendingId] = useState(null)
  const [extendDate, setExtendDate] = useState("")
  const [filterBorrowStatus, setFilterBorrowStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [monthFilter, setMonthFilter] = useState("")
  const [yearFilter, setYearFilter] = useState("")
  const [formError, setFormError] = useState("")
  const [toast, setToast] = useState("")

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }
  const [form, setForm] = useState({
    category: "", asset_id: "", borrowing_for: "myself", customer_name: "",
    borrower_email: "", notes: "", borrow_date: new Date().toISOString().split("T")[0], due_date: ""
  })

  useEffect(() => {
    fetchBorrows()
    checkBorrowReminders()
  }, [])

  useEffect(() => {
    if (userProfile !== null && userProfile !== undefined) {
      fetchAssets()
    }
  }, [userProfile, userCountry])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const assetId = params.get("asset_id")
    if (!assetId || assets.length === 0) return
    const match = assets.find(x => x.id === assetId)
    if (!match) return
    setForm(f => (f.asset_id === assetId ? f : { ...f, category: match.category || "", asset_id: assetId }))
    setShowForm(true)
    setAssets(prev => {
      if (prev[0]?.id === assetId) return prev
      return [match, ...prev.filter(x => x.id !== assetId)]
    })
  }, [assets.length, location.search])

  const fetchBorrows = async () => {
    const { data } = await supabase
      .from("borrow_history")
      .select("*, assets(name, serial_number)")
      .order("borrowed_at", { ascending: false })

    const rows = data || []
    setBorrows(rows)
    setLoading(false)

    const activeRows = rows.filter(b => !b.returned_at)
    const overdue = activeRows.filter(b => {
      if (!b.due_date) return false
      return getDaysRemaining(b.due_date) <= 0
    })
    setDueBorrows(overdue)
    setDismissedDueAlert(false)

    const pending = activeRows.filter(b => b.extension_pending)
    setPendingExtensions(pending)
    setDismissedExtAlert(false)
  }

  const fetchAssets = async () => {
    const hasAssetIdParam = new URLSearchParams(location.search).has("asset_id")

    if (isStandardUser && userProfile) {
      let q = supabase.from("assets").select("id, name, serial_number, status, category, assigned_user, location, condition").order("name")
      if (userCountry) q = q.eq("country", userCountry)
      const { data, error } = await q
      const mine = (data || []).filter(a =>
        a.status !== "retired" &&
        (a.assigned_user === userProfile?.email ||
        a.assigned_user === userProfile?.name ||
        (a.assigned_user && userProfile?.name &&
          a.assigned_user.toLowerCase() === userProfile.name.toLowerCase()))
      )
      setAssets(mine)
    } else {
      let q = supabase.from("assets").select("id, name, serial_number, status, category, location, condition").order("name")
      if (!hasAssetIdParam) q = q.eq("status", "available")
      if (userCountry) q = q.eq("country", userCountry)
      const { data } = await q
      setAssets(data || [])
    }
  }

  const handleBorrow = async (e) => {
    e.preventDefault()
    setFormError("")
    if (!form.asset_id) { setFormError("Please select an asset."); return }
    if (!form.due_date) { setFormError("Please set a return date."); return }

    const selectedAsset = assets.find(a => a.id === form.asset_id)
    const isForCustomer  = form.borrowing_for === "customer"
    const signedOffBy    = userProfile?.name || userProfile?.email || "Unknown"
    const signedOffEmail = userProfile?.email || null

    const borrowerName  = isForCustomer ? form.customer_name : signedOffBy
    const borrowerEmail = isForCustomer ? (form.borrower_email || null) : signedOffEmail

    const notesParts = [`Borrowed by ${signedOffBy}`]
    if (isForCustomer) notesParts.push(`for customer: ${form.customer_name}`)
    if (form.notes) notesParts.push(form.notes)

    const { error } = await supabase.from("borrow_history").insert([{
      asset_id:         form.asset_id,
      borrowed_at:      form.borrow_date ? new Date(form.borrow_date).toISOString() : new Date().toISOString(),
      due_date:         form.due_date || null,
      borrower_name:    borrowerName,
      borrower_email:   borrowerEmail,
      borrowing_for:    form.borrowing_for,
      customer_name:    isForCustomer ? form.customer_name : null,
      signed_off_by:    signedOffBy,
      signed_off_email: signedOffEmail,
      notes:            notesParts.join(" — "),
    }])

    if (!error) {
      await supabase.from("assets").update({
        status: "assigned",
        assigned_user: borrowerName,
      }).eq("id", form.asset_id)

      createNotification(userProfile?.id, "📦 Asset Borrowed", `"${selectedAsset?.name || "Asset"}" borrowed successfully`, "info", userProfile?.country)
      notifyAdmins(userProfile?.country, "📦 New Borrow Request", `${borrowerName || userProfile?.name || "A user"} borrowed "${selectedAsset?.name || "an asset"}"`, "info")
      getAdminEmails().then(adminEmails => {
        if (adminEmails?.length) {
          sendNewBorrowAdminEmail(adminEmails, borrowerName || userProfile?.name || "A user", selectedAsset?.name || "an asset", form.due_date)
        }
      })
      if (borrowerEmail) sendBorrowUpdateEmail(borrowerEmail, selectedAsset?.name || "Asset", "confirmed")
      setBorrowedAssetName(selectedAsset?.name || "Asset")
      setShowForm(false)
      setForm({ category: "", asset_id: "", borrowing_for: "myself", customer_name: "", borrower_email: "", notes: "", borrow_date: new Date().toISOString().split("T")[0], due_date: "" })
      setBorrowSuccess(true)
      fetchBorrows()
      fetchAssets()
      setTimeout(() => setBorrowSuccess(false), 2500)
    } else {
      setFormError(error.message)
    }
  }

  const handleReturn = async (borrow) => {
    setReturnedAssetName(borrow.assets?.name || "Asset")
    await supabase.from("borrow_history").update({
      returned_at: new Date().toISOString(),
      extension_pending: false
    }).eq("id", borrow.id)
    await supabase.from("assets").update({
      status: "assigned"
    }).eq("id", borrow.asset_id)
    notifyAdmins(userProfile?.country, "🔄 Asset Returned", `${borrow.borrower_name || "A user"} returned "${borrow.assets?.name || "an asset"}"`, "info")
    const returnedByEmail = borrow.borrower_email || borrow.signed_off_email
    if (returnedByEmail) sendBorrowUpdateEmail(returnedByEmail, borrow.assets?.name || "Asset", "returned")
    getAdminEmails().then(adminEmails => {
      if (adminEmails?.length) {
        sendBorrowStatusAdminEmail(adminEmails, borrow.borrower_name || "A user", borrow.assets?.name || "an asset", "returned")
      }
    })

    setReturnSuccess(true)
    setTimeout(() => {
      setReturnSuccess(false)
      fetchBorrows()
      fetchAssets()
    }, 2500)
  }

  const handleExtend = async (borrow) => {
    if (!extendDate) return
    const updates = {
      due_date: extendDate,
      extended_at: new Date().toISOString(),
      extension_pending: true,
    }
    if (!borrow.original_due_date && borrow.due_date) {
      updates.original_due_date = borrow.due_date
    }
    const { error } = await supabase
      .from("borrow_history")
      .update(updates)
      .eq("id", borrow.id)

    if (!error) {
      notifyAdmins(userProfile?.country, "📅 Borrow Extended", `${borrow.borrower_name || "A user"} extended borrow of "${borrow.assets?.name || "an asset"}" to ${extendDate}`, "info")
      getAdminEmails().then(adminEmails => {
        if (adminEmails?.length) {
          sendBorrowStatusAdminEmail(adminEmails, borrow.borrower_name || "A user", borrow.assets?.name || "an asset", `extended until ${extendDate}`)
        }
      })
      setExtendingId(null)
      setExtendDate("")
      showToast("Return date extended successfully!")
      fetchBorrows()
    } else {
      showToast(error.message)
    }
  }

  const dismissExtension = async (borrowId) => {
    await supabase
      .from("borrow_history")
      .update({ extension_pending: false })
      .eq("id", borrowId)
    fetchBorrows()
  }

  const handleArchiveBorrow = async (borrow) => {
    await supabase.from("borrow_history").update({ archived: true }).eq("id", borrow.id)
    notifyAdmins(userProfile?.country, "🗂️ Borrow Archived", `Borrow record for "${borrow.assets?.name || "an asset"}" was archived`, "info")
    fetchBorrows()
  }

  const activeBorrows = borrows.filter(b => !b.returned_at)
  const returnedBorrows = borrows.filter(b => b.returned_at)
  const todayStr = new Date().toISOString().split("T")[0]

  const matchesSearchAndMonth = (b) => {
    if (!matchesMonth(b.borrowed_at, monthFilter, yearFilter)) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matches = b.assets?.name?.toLowerCase().includes(q) || b.borrower_name?.toLowerCase().includes(q)
      if (!matches) return false
    }
    return true
  }

  const filteredActiveBorrows = activeBorrows.filter(b => {
    let statusMatch
    if (filterBorrowStatus === "all") statusMatch = true
    else if (filterBorrowStatus === "active") statusMatch = !isOverdueBorrow(b)
    else if (filterBorrowStatus === "overdue") statusMatch = isOverdueBorrow(b)
    else statusMatch = false
    return statusMatch && matchesSearchAndMonth(b)
  })

  const filteredReturnedBorrows = returnedBorrows.filter(b => {
    const statusMatch = filterBorrowStatus === "all" || filterBorrowStatus === "returned"
    return statusMatch && matchesSearchAndMonth(b)
  })

  const selectClass = "bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"

  return (
    <div className="p-4 md:p-8">
      <style>{slideInStyle}</style>

      {/* Borrow Success Animation */}
      <AnimatePresence>
        {borrowSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-center"
            >
              {["🎊", "📤", "🎊"].map((emoji, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: -60 }}
                  transition={{ delay: i * 0.2, duration: 1 }}
                  className="absolute text-3xl"
                  style={{ left: `${40 + i * 10}%` }}
                >
                  {emoji}
                </motion.div>
              ))}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-24 h-24 bg-blue-500/20 border-2 border-blue-500/50 rounded-full mb-4"
                style={{ boxShadow: "0 0 40px rgba(59, 130, 246, 0.4)" }}
              >
                <span className="text-5xl">📤</span>
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">Asset Borrowed!</h2>
              <p className="text-gray-400">{borrowedAssetName} has been borrowed successfully</p>
              <div className="mt-4 w-48 mx-auto h-1 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5, ease: "linear" }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return Success Animation */}
      <AnimatePresence>
        {returnSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-24 h-24 bg-green-500/20 border-2 border-green-500/50 rounded-full mb-4"
                style={{ boxShadow: "0 0 40px rgba(34, 197, 94, 0.4)" }}
              >
                <span className="text-5xl">📥</span>
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">Asset Returned!</h2>
              <p className="text-gray-400">{returnedAssetName} has been returned successfully</p>
              <div className="mt-4 w-48 mx-auto h-1 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5, ease: "linear" }}
                  className="h-full bg-green-500 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extension Request Alert Banner */}
      <AnimatePresence>
        {pendingExtensions.length > 0 && !dismissedExtAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-purple-500/10 border border-purple-500/40 rounded-xl p-4 flex items-start gap-3"
          >
            <span className="text-2xl shrink-0">📋</span>
            <div className="flex-1">
              <p className="text-purple-400 font-semibold text-sm">
                {pendingExtensions.length === 1
                  ? "1 extension request pending review"
                  : `${pendingExtensions.length} extension requests pending review`}
              </p>
              <ul className="mt-1 space-y-0.5">
                {pendingExtensions.map(b => (
                  <li key={b.id} className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">
                      • {b.assets?.name || "Asset"} → extended to {new Date(b.due_date).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => dismissExtension(b.id)}
                      className="text-purple-400 hover:text-purple-300 text-xs underline"
                    >
                      Acknowledge
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setDismissedExtAlert(true)}
              className="text-gray-500 hover:text-gray-300 text-sm shrink-0"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overdue / Due Today Alert Banner */}
      <AnimatePresence>
        {dueBorrows.length > 0 && !dismissedDueAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-red-500/10 border border-red-500/40 rounded-xl p-4 flex items-start gap-3"
          >
            <span className="text-2xl shrink-0">🔔</span>
            <div className="flex-1">
              <p className="text-red-400 font-semibold text-sm">
                {dueBorrows.length === 1
                  ? "1 asset is overdue or due today!"
                  : `${dueBorrows.length} assets are overdue or due today!`}
              </p>
              <ul className="mt-1 space-y-0.5">
                {dueBorrows.map(b => (
                  <li key={b.id} className="text-gray-400 text-xs">
                    • {b.assets?.name || "Asset"} — due {new Date(b.due_date).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setDismissedDueAlert(true)}
              className="text-gray-500 hover:text-gray-300 text-sm shrink-0"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Borrow / Return</h1>
          <p className="text-gray-400 mt-1 text-sm">{activeBorrows.length} active borrows</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportBorrowsToExcel(borrows)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: "rgba(30,41,59,0.8)", border: "1px solid rgba(59,130,246,0.4)", color: "#60a5fa" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.15)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(30,41,59,0.8)"}
          >
            📥 Export Excel
          </button>
          {canBorrow && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium"
            >
              + Borrow Asset
            </motion.button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by asset or borrower name..."
          className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm flex-1 min-w-[200px]"
        />
        <select value={filterBorrowStatus} onChange={e => setFilterBorrowStatus(e.target.value)} className={selectClass}>
          <option value="all">All Borrows</option>
          <option value="active">Active</option>
          <option value="returned">Returned</option>
          <option value="overdue">Overdue</option>
        </select>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className={selectClass}>
          <option value="">All Months</option>
          {getLastNMonths().map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className={selectClass}>
          <option value="">All Years</option>
          {getYears().map(y => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>

      {/* Borrow Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleBorrow}
            className="bg-gray-900/80 rounded-xl border border-gray-800 p-4 mb-6"
          >
            <h2 className="text-white font-semibold mb-4">Borrow an Asset</h2>
            <AnimatedError message={formError} onDismiss={() => setFormError("")} />
            <div className="space-y-3">

              {/* Category */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value, asset_id: "" })}
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="">Select category…</option>
                  {["Laptop","Monitor","Portable Speaker","Microphone","Clicker","Others"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Asset — shown after category selected */}
              {form.category && (() => {
                const knownCats = ["Laptop","Monitor","Portable Speaker","Microphone","Clicker"]
                const filtered = form.category === "Others"
                  ? assets.filter(a => !knownCats.includes(a.category))
                  : assets.filter(a => (a.category || "").toLowerCase() === form.category.toLowerCase())
                const listToShow = filtered
                const noMatch = filtered.length === 0
                return (
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Select Asset *</label>
                    {noMatch && assets.length > 0 && (
                      <p className="text-yellow-500 text-xs mb-1">No assets match this category — showing all available assets</p>
                    )}
                    {assets.length === 0 ? (
                      <p className="text-gray-500 text-sm py-3 text-center">No available assets right now</p>
                    ) : (
                      <select
                        value={form.asset_id}
                        onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
                        required
                        className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                      >
                        <option value="">Select available asset…</option>
                        {listToShow.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} — {a.serial_number || "No S/N"} | {a.location || "No location"} | {a.condition || "Good"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })()}

              {/* Borrowing for */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Borrowing For *</label>
                <div className="flex gap-2">
                  {[
                    { value: "myself",   label: "👤 Myself" },
                    { value: "customer", label: "🤝 Customer / External" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, borrowing_for: opt.value, customer_name: "", borrower_email: "" })}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        form.borrowing_for === opt.value
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Signed-off by */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Signed Off By</label>
                <input
                  type="text"
                  value={userProfile?.name || userProfile?.email || ""}
                  readOnly
                  className="w-full bg-gray-800/50 text-gray-400 rounded-lg px-4 py-3 border border-gray-700/50 text-sm cursor-not-allowed"
                />
              </div>

              <AnimatePresence>
                {form.borrowing_for === "customer" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                  >
                    <label className="text-gray-400 text-sm mb-2 block">Customer / External Name *</label>
                    <input
                      type="text"
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      placeholder="e.g. John Smith"
                      required={form.borrowing_for === "customer"}
                      className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {form.borrowing_for === "customer" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                  >
                    <label className="text-gray-400 text-sm mb-2 block">
                      Customer Email <span className="text-gray-600">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={form.borrower_email}
                      onChange={(e) => setForm({ ...form, borrower_email: e.target.value })}
                      placeholder="e.g. john@customer.com"
                      className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Date Borrowed */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">
                  Date Borrowed <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.borrow_date}
                  required
                  onChange={(e) => setForm({ ...form, borrow_date: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm [color-scheme:dark]"
                />
              </div>

              {/* Return date */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">
                  Return Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  min={todayStr}
                  required
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm [color-scheme:dark]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">
                  Notes <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any additional notes…"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
                Confirm Borrow
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFormError("") }} className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <SuccessToast message={toast} />

      {/* Active Borrows */}
      {(filterBorrowStatus === "all" || filterBorrowStatus === "active" || filterBorrowStatus === "overdue") && (
        <div className="mb-6">
          <h2 className="text-white font-semibold mb-4">Active Borrows</h2>
          {loading ? (
            <LoadingSkeleton rows={3} cols={2} />
          ) : filteredActiveBorrows.length === 0 ? (
            <EmptyState preset="borrows" emoji="📤" title="No active borrows" sub="All assets are currently available" />
          ) : (
            <div className="space-y-3">
              {filteredActiveBorrows.map((borrow) => {
                const overdue = isOverdueBorrow(borrow)
                return (
                  <motion.div
                    key={borrow.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-gray-900/80 rounded-xl border p-4 ${overdue ? "border-l-4 border-red-500 bg-red-500/5 border-red-500/30" : "border-gray-800"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium">{borrow.assets?.name || "—"}</p>
                          {overdue && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-medium">
                              Overdue
                            </span>
                          )}
                          {borrow.extension_pending && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 font-medium">
                              Extension pending
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs mt-1">{borrow.assets?.serial_number || ""}</p>
                        <p className="text-gray-400 text-sm mt-2">{borrow.notes || "—"}</p>
                        {borrow.borrowing_for === "customer" && borrow.customer_name && (
                          <p className="text-xs text-blue-400 mt-1">
                            🤝 For customer: {borrow.customer_name}
                            {borrow.signed_off_by && ` · Signed off by: ${borrow.signed_off_by}`}
                          </p>
                        )}
                        <div className="mt-2 space-y-0.5">
                          <p className="text-gray-500 text-xs">
                            Borrowed: {new Date(borrow.borrowed_at).toLocaleDateString()}
                          </p>
                          {borrow.original_due_date && (
                            <p className="text-gray-500 text-xs">
                              Original return date: {new Date(borrow.original_due_date).toLocaleDateString()}
                            </p>
                          )}
                          {borrow.due_date && (
                            <div className="flex items-center gap-2">
                              <p className="text-gray-500 text-xs">
                                {borrow.original_due_date ? "Extended to:" : "Due:"}{" "}
                                {new Date(borrow.due_date).toLocaleDateString()}
                              </p>
                              <DueBadge dueDate={borrow.due_date} />
                            </div>
                          )}
                          {borrow.extended_at && (
                            <p className="text-gray-600 text-xs">
                              Extended on: {new Date(borrow.extended_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <AnimatePresence>
                          {extendingId === borrow.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 flex items-center gap-2 flex-wrap"
                            >
                              <input
                                type="date"
                                value={extendDate}
                                min={borrow.due_date || todayStr}
                                onChange={(e) => setExtendDate(e.target.value)}
                                className="bg-gray-800 text-white rounded-lg px-3 py-1.5 border border-gray-700 focus:border-purple-500 focus:outline-none text-sm [color-scheme:dark]"
                              />
                              <button
                                onClick={() => handleExtend(borrow)}
                                disabled={!extendDate}
                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                              >
                                Confirm Extension
                              </button>
                              <button
                                onClick={() => { setExtendingId(null); setExtendDate("") }}
                                className="text-gray-500 hover:text-gray-300 text-sm"
                              >
                                Cancel
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {isStandardUser && borrow.signed_off_email === userProfile?.email && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleReturn(borrow)}
                            className="text-green-400 hover:text-green-300 text-sm px-3 py-1 rounded border border-green-400/30 transition-all"
                          >
                            Return
                          </motion.button>
                          {borrow.due_date && extendingId !== borrow.id && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => { setExtendingId(borrow.id); setExtendDate("") }}
                              className="text-purple-400 hover:text-purple-300 text-sm px-3 py-1 rounded border border-purple-400/30 transition-all"
                            >
                              Extend
                            </motion.button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Return History */}
      {(filterBorrowStatus === "all" || filterBorrowStatus === "returned") && filteredReturnedBorrows.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-4">Return History</h2>
          <div className="space-y-3">
            {filteredReturnedBorrows.map((borrow) => (
              <div key={borrow.id} className={"bg-gray-900/80 rounded-xl border border-gray-800 p-4"}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-white font-medium">{borrow.assets?.name || "—"}</p>
                    <p className="text-gray-500 text-xs mt-1">{borrow.assets?.serial_number || ""}</p>
                    <p className="text-gray-400 text-sm mt-2">{borrow.notes || "—"}</p>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-gray-500 text-xs">
                        Borrowed: {new Date(borrow.borrowed_at).toLocaleDateString()}
                      </p>
                      {borrow.original_due_date && (
                        <p className="text-gray-500 text-xs">
                          Original return date: {new Date(borrow.original_due_date).toLocaleDateString()}
                        </p>
                      )}
                      {borrow.due_date && (
                        <p className="text-gray-500 text-xs">
                          {borrow.original_due_date ? "Extended to:" : "Was due:"}{" "}
                          {new Date(borrow.due_date).toLocaleDateString()}
                        </p>
                      )}
                      {borrow.extended_at && (
                        <p className="text-gray-600 text-xs">
                          Extended on: {new Date(borrow.extended_at).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs">
                        Returned: {new Date(borrow.returned_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {isAdmin && !borrow.archived && (
                    <button
                      onClick={() => handleArchiveBorrow(borrow)}
                      className="text-gray-400 hover:text-gray-300 text-sm px-3 py-1 rounded border border-gray-600/30 transition-all shrink-0"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
