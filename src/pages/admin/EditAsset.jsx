import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate, useParams } from "react-router-dom"

export default function EditAsset() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    name: "", category: "", brand_model: "", serial_number: "",
    asset_tag: "", location: "", assigned_user: "", department: "",
    status: "available", purchase_date: "", purchase_price: "",
    warranty_expiry: "", remarks: ""
  })

  useEffect(() => {
    fetchAsset()
  }, [id])

  const fetchAsset = async () => {
    const { data } = await supabase.from("assets").select("*").eq("id", id).single()
    if (data) {
      setForm({
        name: data.name || "",
        category: data.category || "",
        brand_model: data.brand_model || "",
        serial_number: data.serial_number || "",
        asset_tag: data.asset_tag || "",
        location: data.location || "",
        assigned_user: data.assigned_user || "",
        department: data.department || "",
        status: data.status || "available",
        purchase_date: data.purchase_date || "",
        purchase_price: data.purchase_price || "",
        warranty_expiry: data.warranty_expiry || "",
        remarks: data.remarks || ""
      })
    }
    setFetching(false)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const cleanForm = {
      name: form.name,
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

    const { error } = await supabase.from("assets").update(cleanForm).eq("id", id)
    if (!error) {
      setSuccess(true)
      setTimeout(() => navigate("/admin/assets"), 1500)
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

  if (fetching) return (
    <div className="p-8 text-white">Loading asset...</div>
  )

  return (
    <div className="p-8 max-w-3xl">
      <button
        onClick={() => navigate("/admin/assets")}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-all"
      >
        ← Back to Assets
      </button>

      <h1 className="text-3xl font-bold text-white mb-2">Edit Asset</h1>
      <p className="text-gray-400 mb-8">Update the asset details below</p>

      {success && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 mb-6">
          ✅ Asset updated successfully! Redirecting...
        </div>
      )}

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
            {loading ? "Saving..." : "Update Asset"}
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
    </div>
  )
}