import { useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { motion, AnimatePresence } from "framer-motion"

const SIZES = {
  small: {
    label: "Small", mm: "38 × 25 mm",
    printW: 38, printH: 25, printQr: 17,
    previewScale: 3.8, // px per mm for preview
    fontPt: 5.5, fontSmPt: 4.5,
  },
  medium: {
    label: "Medium", mm: "63 × 38 mm",
    printW: 63, printH: 38, printQr: 27,
    previewScale: 3.2,
    fontPt: 7.5, fontSmPt: 6,
  },
  large: {
    label: "Large", mm: "90 × 55 mm",
    printW: 90, printH: 55, printQr: 40,
    previewScale: 2.7,
    fontPt: 10, fontSmPt: 8,
  },
}

function LabelPreview({ asset, assetUrl, sizeKey, qrRef }) {
  const s = SIZES[sizeKey]
  const pw = s.printW * s.previewScale
  const ph = s.printH * s.previewScale
  const qrSize = s.printQr * s.previewScale
  const pad = s.printW < 50 ? 5 : 8
  const gap = s.printW < 50 ? 4 : 7
  const fsPx = s.fontPt * 1.33
  const fsSmPx = s.fontSmPt * 1.33

  return (
    <div
      ref={qrRef}
      className="bg-white rounded border border-gray-300 shadow-sm flex items-center overflow-hidden"
      style={{ width: pw, height: ph, padding: pad, gap, flexShrink: 0 }}
    >
      <div style={{ flexShrink: 0 }}>
        <QRCodeSVG value={assetUrl} size={qrSize} level="H" />
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <p style={{ fontWeight: 700, fontSize: fsPx, color: "#111", lineHeight: 1.2, marginBottom: 2, wordBreak: "break-word" }}>
          {asset.name}
        </p>
        {asset.asset_tag && (
          <p style={{ fontSize: fsSmPx, color: "#374151", marginBottom: 1 }}>Tag: {asset.asset_tag}</p>
        )}
        {asset.serial_number && (
          <p style={{ fontSize: fsSmPx, color: "#374151", marginBottom: 1 }}>S/N: {asset.serial_number}</p>
        )}
        <p style={{ fontSize: Math.max(fsSmPx - 1.5, 5), color: "#9ca3af", marginTop: 2 }}>
          Trainocate Singapore
        </p>
      </div>
    </div>
  )
}

function buildPrintHtml(assets, assetUrlBase, sizeKey, qty, svgMap) {
  const s = SIZES[sizeKey]
  const pad = s.printW < 50 ? "1.5mm" : "2.5mm"
  const gap = s.printW < 50 ? "1.5mm" : "2.5mm"

  const labels = assets.flatMap(asset => {
    const svgStr = (svgMap[asset.id] || "")
      .replace(/width="[^"]*"/, `width="${s.printQr}mm"`)
      .replace(/height="[^"]*"/, `height="${s.printQr}mm"`)
    const fsPt = s.fontPt
    const fsSmPt = s.fontSmPt

    const single = `
      <div class="label" style="
        width:${s.printW}mm; height:${s.printH}mm;
        border:1px solid #d1d5db; border-radius:2mm;
        display:flex; align-items:center; gap:${gap}; padding:${pad};
        font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;
        background:#fff; overflow:hidden;
      ">
        <div style="flex-shrink:0;">${svgStr}</div>
        <div style="flex:1; min-width:0; overflow:hidden;">
          <div style="font-size:${fsPt}pt; font-weight:700; color:#111; line-height:1.2; margin-bottom:0.8mm; word-break:break-word;">${asset.name}</div>
          ${asset.asset_tag ? `<div style="font-size:${fsSmPt}pt; color:#374151; margin-bottom:0.4mm;">Tag: ${asset.asset_tag}</div>` : ""}
          ${asset.serial_number ? `<div style="font-size:${fsSmPt}pt; color:#374151; margin-bottom:0.4mm;">S/N: ${asset.serial_number}</div>` : ""}
          <div style="font-size:${Math.max(fsSmPt - 1.5, 4)}pt; color:#9ca3af; margin-top:auto;">Trainocate Singapore</div>
        </div>
      </div>`
    return Array(qty).fill(single)
  })

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>QR Labels — ITAMS</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#fff; }
  .page { display:flex; flex-wrap:wrap; gap:3mm; padding:8mm; }
  .label { page-break-inside:avoid; }
  @media print { @page { margin:5mm; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head>
<body><div class="page">${labels.join("")}</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`
}

export default function QRLabelModal({ assets, assetUrlBase, onClose }) {
  const [size, setSize] = useState("medium")
  const [qty, setQty] = useState(1)
  // Map of asset.id → ref for each hidden QR
  const qrRefs = useRef({})
  const previewRef = useRef()

  const isBulk = assets.length > 1
  const firstAsset = assets[0]
  const firstUrl = assetUrlBase + firstAsset.id

  const handlePrint = () => {
    // Collect SVG strings from hidden refs
    const svgMap = {}
    assets.forEach(asset => {
      const el = qrRefs.current[asset.id]?.querySelector("svg")
      if (el) svgMap[asset.id] = new XMLSerializer().serializeToString(el)
    })

    const html = buildPrintHtml(assets, assetUrlBase, size, qty, svgMap)
    const win = window.open("", "_blank", "width=900,height=700")
    if (!win) { alert("Please allow pop-ups to print labels."); return }
    win.document.write(html)
    win.document.close()
  }

  const s = SIZES[size]
  const totalLabels = assets.length * qty

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl overflow-y-auto"
        style={{ maxHeight: "92vh", boxShadow: "0 0 50px rgba(59,130,246,0.15)" }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-bold text-lg">🏷️ Print QR Labels</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                {isBulk ? `${assets.length} assets selected` : firstAsset.name}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none transition-all">✕</button>
          </div>

          {/* Size selector */}
          <div className="mb-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Label Size</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(SIZES).map(([key, val]) => (
                <button key={key} onClick={() => setSize(key)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    size === key
                      ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                  }`}>
                  <p>{val.label}</p>
                  <p className={`text-xs mt-0.5 font-normal ${size === key ? "text-blue-200" : "text-gray-500"}`}>{val.mm}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Qty */}
          <div className="mb-5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
              {isBulk ? "Copies per asset" : "Quantity"}
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-lg flex items-center justify-center transition-all">−</button>
              <span className="text-white font-bold text-xl w-8 text-center">{qty}</span>
              <button onClick={() => setQty(q => Math.min(20, q + 1))}
                className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-lg flex items-center justify-center transition-all">+</button>
              {isBulk && (
                <span className="text-gray-500 text-sm">= {totalLabels} total labels</span>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="mb-5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
              {isBulk ? `Preview (first asset)` : "Preview"}
            </p>
            <div className="bg-gray-800/60 rounded-xl p-4 flex items-center justify-center overflow-x-auto">
              <LabelPreview
                asset={firstAsset}
                assetUrl={firstUrl}
                sizeKey={size}
                qrRef={previewRef}
              />
            </div>
          </div>

          {/* Hidden QR codes for all assets (for serialization) */}
          <div style={{ position: "fixed", opacity: 0, pointerEvents: "none", left: -9999, top: -9999 }}>
            {assets.map(asset => (
              <div key={asset.id} ref={el => { if (el) qrRefs.current[asset.id] = el }}>
                <QRCodeSVG value={assetUrlBase + asset.id} size={200} level="H" />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-all">
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handlePrint}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
              🖨️ Print {totalLabels} Label{totalLabels !== 1 ? "s" : ""}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
