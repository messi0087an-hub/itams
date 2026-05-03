import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import { Html5Qrcode } from "html5-qrcode"
import { motion, AnimatePresence } from "framer-motion"

export default function Scanner() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [manualInput, setManualInput] = useState("")
  const scannerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const startScanning = async () => {
    setError("")
    setResult(null)
    setAsset(null)
    setScanning(true)

    try {
      const scanner = new Html5Qrcode("qr-reader")
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 30,
          qrbox: { width: 300, height: 300 },
        },
        async (decodedText) => {
          await scanner.stop()
          setScanning(false)
          setResult(decodedText)
          await handleScanResult(decodedText)
        },
        () => {}
      )
    } catch (err) {
      setError("Could not access camera. Please allow camera access and try again.")
      setScanning(false)
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setScanning(false)
  }

  const handleScanResult = async (text) => {
    setLoading(true)
    setAsset(null)

    let assetId = null
    if (text.includes("/admin/assets/")) {
      assetId = text.split("/admin/assets/")[1]
    }

    if (assetId) {
      const { data } = await supabase
        .from("assets")
        .select("*")
        .eq("id", assetId)
        .single()
      if (data) {
        setAsset(data)
      } else {
        setError("Asset not found in ITAMS database.")
      }
    } else {
      const { data } = await supabase
        .from("assets")
        .select("*")
        .ilike("serial_number", `%${text.trim()}%`)
        .limit(1)
        .single()
      if (data) {
        setAsset(data)
      } else {
        setError(`No asset found with barcode: "${text}". Try manual search below.`)
      }
    }
    setLoading(false)
  }

  const handleManualSearch = async (e) => {
    e.preventDefault()
    if (!manualInput.trim()) return
    setLoading(true)
    setError("")
    setAsset(null)
    setResult(manualInput)

    const { data } = await supabase
      .from("assets")
      .select("*")
      .or(`serial_number.ilike.%${manualInput}%,asset_tag.ilike.%${manualInput}%,name.ilike.%${manualInput}%`)
      .limit(1)
      .single()

    if (data) {
      setAsset(data)
    } else {
      setError(`No asset found matching "${manualInput}"`)
    }
    setLoading(false)
  }

  const statusColor = {
    available: "bg-green-500/20 text-green-400 border-green-500/30",
    assigned: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    maintenance: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    retired: "bg-red-500/20 text-red-400 border-red-500/30",
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">🔍 Asset Scanner</h1>
        <p className="text-gray-400 mt-1 text-sm">Scan QR codes or barcodes to find assets instantly</p>
      </div>

      {/* Scanner Box */}
      <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-4 mb-6">
        <div
          id="qr-reader"
          style={{
            width: "100%",
            minHeight: scanning ? "350px" : "0px",
            display: scanning ? "block" : "none",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        />

        {scanning && (
          <div className="text-center mt-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <p className="text-red-400 text-sm font-medium">Scanning... Point at QR code or barcode</p>
            </div>
            <button
              onClick={stopScanning}
              className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm transition-all"
            >
              Stop Scanning
            </button>
          </div>
        )}

        {!scanning && (
          <div className="text-center py-8">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              📷
            </motion.div>
            <p className="text-gray-400 mb-2 text-sm">
              Scan an ITAMS QR code sticker
            </p>
            <p className="text-gray-500 mb-6 text-xs">
              OR any manufacturer barcode on the device
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startScanning}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all"
              style={{ boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}
            >
              📷 Start Scanning
            </motion.button>
          </div>
        )}
      </div>

      {/* Manual Search */}
      <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-4 mb-6">
        <h2 className="text-white font-semibold mb-1">Manual Search</h2>
        <p className="text-gray-400 text-xs mb-3">Type serial number, asset tag, or name</p>
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="e.g. FG5W5Y2 or Dell XPS..."
            className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-6 text-center mb-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Looking up asset...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4"
        >
          <p className="text-red-400 text-sm">❌ {error}</p>
        </motion.div>
      )}

      {/* Asset Result */}
      <AnimatePresence>
        {asset && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="bg-gray-900/80 rounded-2xl border border-gray-800 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">✅</span>
                  <p className="text-green-400 text-sm font-medium">Asset Found!</p>
                </div>
                <h2 className="text-xl font-bold text-white">{asset.name}</h2>
                <p className="text-gray-400 text-sm">{asset.category} — {asset.brand_model || "N/A"}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor[asset.status] || "bg-gray-500/20 text-gray-400"}`}>
                {asset.status}
              </span>
            </div>

            <div className="space-y-2 mb-6">
              {[
                { label: "Serial Number", value: asset.serial_number },
                { label: "Asset Tag", value: asset.asset_tag },
                { label: "Location", value: asset.location },
                { label: "Assigned To", value: asset.assigned_user },
                { label: "Department", value: asset.department },
                { label: "Warranty Expiry", value: asset.warranty_expiry },
                { label: "Remarks", value: asset.remarks },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex justify-between py-2 border-b border-gray-800 last:border-0">
                  <span className="text-gray-500 text-sm">{label}</span>
                  <span className="text-white text-sm font-medium text-right ml-4">{value}</span>
                </div>
              ) : null)}
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = `/admin/assets/${asset.id}`}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium text-sm"
              >
                View Full Details
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setAsset(null); setResult(null); setError(""); setManualInput("") }}
                className="bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl text-sm"
              >
                Scan Again
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}