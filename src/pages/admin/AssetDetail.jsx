import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate, useParams } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"

export default function AssetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  const qrRef = useRef()

  useEffect(() => {
    fetchAsset()
  }, [id])

  const fetchAsset = async () => {
    const { data } = await supabase.from("assets").select("*").eq("id", id).single()
    setAsset(data)
    setLoading(false)
  }

  const handlePrintQR = () => {
    const svgEl = qrRef.current?.querySelector("svg")
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const win = window.open("")
    win.document.write(`
      <html><body style="display:flex;flex-direction:column;align-items:center;padding:40px;font-family:sans-serif;">
        <h2>${asset.name}</h2>
        <p>Serial: ${asset.serial_number || "N/A"} | Tag: ${asset.asset_tag || "N/A"}</p>
        ${svgData}
        <p style="margin-top:10px;font-size:12px;color:#666">${id}</p>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  const statusColor = {
    available: "bg-green-500/20 text-green-400",
    assigned: "bg-blue-500/20 text-blue-400",
    maintenance: "bg-yellow-500/20 text-yellow-400",
    retired: "bg-red-500/20 text-red-400",
  }

  if (loading) return <div className="p-8 text-white">Loading...</div>
  if (!asset) return <div className="p-8 text-white">Asset not found</div>

  return (
    <div className="p-8 max-w-4xl">
      <button
        onClick={() => navigate("/admin/assets")}
        className="text-gray-400 hover:text-white mb-6 transition-all block"
      >
        ← Back to Assets
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{asset.name}</h1>
          <p className="text-gray-400 mt-1">{asset.category} — {asset.brand_model || "N/A"}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[asset.status] || "bg-gray-500/20 text-gray-400"}`}>
          {asset.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asset Details */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold mb-4">Asset Details</h2>
          <div className="space-y-3">
            {[
              { label: "Serial Number", value: asset.serial_number },
              { label: "Asset Tag", value: asset.asset_tag },
              { label: "Location", value: asset.location },
              { label: "Assigned To", value: asset.assigned_user },
              { label: "Department", value: asset.department },
              { label: "Purchase Date", value: asset.purchase_date },
              { label: "Purchase Price", value: asset.purchase_price ? `SGD ${asset.purchase_price}` : null },
              { label: "Warranty Expiry", value: asset.warranty_expiry },
              { label: "Remarks", value: asset.remarks },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500 text-sm">{label}</span>
                <span className="text-white text-sm">{value || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col items-center">
          <h2 className="text-white font-semibold mb-6">QR Code</h2>
          <div ref={qrRef} className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              value={`${window.location.origin}/admin/assets/${id}`}
              size={180}
              level="H"
            />
          </div>
          <p className="text-gray-500 text-xs mt-3 text-center">Scan to view asset details</p>
          <button
            onClick={handlePrintQR}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm transition-all"
          >
            Print QR Code
          </button>
        </div>
      </div>
    </div>
  )
}