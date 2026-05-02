import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"

export default function AddAsset() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    name: "", category: "", brand_model: "", serial_number: "",
    asset_tag: "", location: "", assigned_user: "", department: "",
    status: "available", purchase_date: "", purchase_price: "",
    warranty_expiry: "", remarks: ""
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const cleanForm = {
      name: form.name,
      country: "Singapore",
      status: form.status,
    }
    if (form.category) cleanForm.category = form.category
    if (form.brand_model) cleanForm.brand_model = form.brand_model
    if (form.serial_number) cleanForm.serial_number = form.serial_number
    if (form.asset_tag) cleanForm.asset_tag = form.asset_tag
    if (form.location) cleanForm.location = form.location
    if (form.assigned_user) cleanForm.assigned_user = form.assigned_user
    if (form.department) cleanForm.department = form.department
    if (form.purchase_date) cleanForm.purchase_date = form.purchase_date
    if (form.purchase_price) cleanForm.purchase_price = parseFloat(form.purchase_price)
    if (form.warranty_expiry) cleanForm.warranty_expiry = form.warranty_expiry
    if (form.remarks) cleanForm.remarks = form.remarks

    const { error } = await supabase.from("assets").insert([cleanForm])
    if (!error) {
      setSuccess(true)
      setTimeout(() => navigate("/admin/assets"), 3000)
    } else {
      alert(error.message)
    }
    setLoading(false)
  }

  const fields = [
    { name: "name", label: "Asset Name *", placeholder: "e.g. Dell XPS 13", required: true },
    { name: "category", label: "Category", placeholder: "e.g. Laptop, Monitor" },
    { name: "brand_model", label: "Brand / Model", placeholder: "e.g. Dell XPS 13 9310" },
    { name: "serial_number", label: "Serial Number", placeholder: "e.g. ABC123XYZ" },
    { name: "asset_tag", label: "Asset Tag", placeholder: "e.g. COM/2024/0001" },
    { name: "location", label: "Location", placeholder: "e.g. Level 19, Singapore" },
    { name: "assigned_user", label: "Assigned To", placeholder: "e.g. John Doe" },
    { name: "department", label: "Department", placeholder: "e.g. IT, Finance" },
    { name: "purchase_date", label: "Purchase Date", type: "date" },
    { name: "purchase_price", label: "Purchase Price (SGD)", placeholder: "e.g. 1500", type: "number" },
    { name: "warranty_expiry", label: "Warranty Expiry", type: "date" },
  ]

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Floating emojis */}
        {["🎊", "🎉", "✨", "🎊", "🎉", "✨", "🎊"].map((emoji, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 100, x: (i - 3) * 80 }}
            animate={{ opacity: [0, 1, 1, 0], y: -200 }}
            transition={{ delay: i * 0.15, duration: 2, ease: "easeOut" }}
            className="absolute text-3xl"
            style={{ left: `${15 + i * 12}%`, bottom: "20%" }}
          >
            {emoji}
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
          className="relative z-10 text-center"
        >
          {/* Big success icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-28 h-28 bg-green-500/20 border-2 border-green-500/50 rounded-full mb-6"
            style={{ boxShadow: "0 0 40px rgba(34, 197, 94, 0.3)" }}
          >
            <span className="text-6xl">✅</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-bold text-white mb-3"
          >
            Asset Added!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-400 text-lg mb-2"
          >
            {form.name} has been registered successfully
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-gray-600 text-sm"
          >
            Redirecting to assets...
          </motion.p>

          {/* Progress bar */}
          <motion.div
            className="mt-6 w-48 mx-auto h-1 bg-gray-800 rounded-full overflow-hidden"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "linear" }}
              className="h-full bg-green-500 rounded-full"
            />
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-3xl"
    >
      <button
        onClick={() => navigate("/admin/assets")}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-all"
      >
        ← Back to Assets
      </button>

      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Add New Asset</h1>
      <p className="text-gray-400 mb-8">Fill in the details to register a new asset</p>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="text-gray-400 text-sm mb-2 block">{field.label}</label>
              <input
                type={field.type || "text"}
                name={field.name}
                value={form[field.name]}
                onChange={handleChange}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
          ))}

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
            >
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-gray-400 text-sm mb-2 block">Remarks</label>
            <textarea
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-all"
          >
            {loading ? "Saving..." : "Save Asset"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/assets")}
            className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-lg transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  )
}