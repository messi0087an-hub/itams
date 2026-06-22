import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"

const C = {
  accent: "#06b6d4", teal: "#14b8a6",
  card: "rgba(6,182,212,0.06)", border: "rgba(6,182,212,0.18)",
  text: "#ffffff", sub: "#94a3b8",
  success: "#10b981", warning: "#f59e0b", error: "#ef4444",
}

const CLASS_TYPES = ["AWS", "CISCO", "Microsoft", "Red Hat", "Soft Skills", "PMI", "ISC2", "Palo Alto", "Other"]

const inputStyle = {
  width: "100%", background: "rgba(6,182,212,0.06)", color: "#fff",
  border: "1px solid rgba(6,182,212,0.2)", borderRadius: "8px",
  padding: "9px 12px", fontSize: "13px", outline: "none", boxSizing: "border-box",
}

function Field({ label, children }) {
  return (
    <div>
      <p style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "5px", fontWeight: "600" }}>{label}</p>
      {children}
    </div>
  )
}

function PackingBadge({ gifts }) {
  if (!gifts?.length) return <span style={{ background: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.2)", borderRadius: "8px", padding: "2px 8px", fontSize: "11px" }}>No gifts</span>
  const allDist = gifts.every(g => g.is_distributed)
  const allPacked = gifts.every(g => g.is_packed)
  if (allDist) return <span style={{ background: "rgba(16,185,129,0.15)", color: C.success, border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", padding: "2px 8px", fontSize: "11px", fontWeight: "600" }}>🟢 Distributed</span>
  if (allPacked) return <span style={{ background: "rgba(245,158,11,0.15)", color: C.warning, border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "2px 8px", fontSize: "11px", fontWeight: "600" }}>🟡 Packed</span>
  return <span style={{ background: "rgba(239,68,68,0.12)", color: C.error, border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "2px 8px", fontSize: "11px", fontWeight: "600" }}>🔴 Not Packed</span>
}

export default function MarketingClasses() {
  const { userProfile, canManageMarketing } = useAuth()
  const [classes, setClasses] = useState([])
  const [items, setItems] = useState([])
  const [variants, setVariants] = useState([])
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGiftModal, setShowGiftModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeClass, setActiveClass] = useState(null)
  const [giftList, setGiftList] = useState([{ item_id: "", variant_id: "", quantity: 1 }])

  const [form, setForm] = useState({
    class_name: "", class_type: "", class_date: "", end_date: "", pax_count: 0, pax_confirmed: 0,
    account_manager: "", person_in_charge: "", classroom: "", trainer_name: "", notes: "",
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: c }, { data: i }, { data: v }, { data: s }] = await Promise.all([
      supabase.from("marketing_classes").select("*, marketing_class_gifts(*, marketing_items(name), marketing_item_variants(variant_name, color))").order("class_date", { ascending: false }),
      supabase.from("marketing_items").select("id, name, unit").order("name"),
      supabase.from("marketing_item_variants").select("*"),
      supabase.from("marketing_stock").select("item_id, quantity"),
    ])
    setClasses(c || [])
    setItems(i || [])
    setVariants(v || [])
    setStock(s || [])
    setLoading(false)
  }

  const getItemStock = (itemId) =>
    stock.filter(s => s.item_id === itemId).reduce((sum, s) => sum + s.quantity, 0)

  const isThisWeek = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1); start.setHours(0,0,0,0)
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999)
    return d >= start && d <= end
  }

  const handleSaveClass = async () => {
    if (!form.class_name || !form.class_date) return
    setSaving(true)
    await supabase.from("marketing_classes").insert({ ...form, pax_count: parseInt(form.pax_count) || 0, pax_confirmed: parseInt(form.pax_confirmed) || 0 })
    setSaving(false)
    setShowAddModal(false)
    setForm({ class_name: "", class_type: "", class_date: "", end_date: "", pax_count: 0, pax_confirmed: 0, account_manager: "", person_in_charge: "", classroom: "", trainer_name: "", notes: "" })
    fetchAll()
  }

  const handleAssignGifts = async () => {
    if (!showGiftModal) return
    setSaving(true)
    const valid = giftList.filter(g => g.item_id && g.quantity > 0)
    if (valid.length) {
      await supabase.from("marketing_class_gifts").insert(
        valid.map(g => ({ class_id: showGiftModal.id, item_id: g.item_id, variant_id: g.variant_id || null, quantity: parseInt(g.quantity) }))
      )
    }
    setSaving(false)
    setShowGiftModal(null)
    setGiftList([{ item_id: "", variant_id: "", quantity: 1 }])
    fetchAll()
  }

  const handleMarkPacked = async (classId, gifts) => {
    setSaving(true)
    const ids = gifts.map(g => g.id)
    if (ids.length) {
      await supabase.from("marketing_class_gifts").update({ is_packed: true, packed_by: userProfile.id, packed_at: new Date().toISOString() }).in("id", ids)
    }
    setSaving(false)
    fetchAll()
  }

  const handleMarkDistributed = async (classId, gifts) => {
    setSaving(true)
    const ids = gifts.map(g => g.id)
    if (ids.length) {
      await supabase.from("marketing_class_gifts").update({ is_distributed: true, distributed_by: userProfile.id, distributed_at: new Date().toISOString() }).in("id", ids)
    }
    setSaving(false)
    fetchAll()
  }

  const weekClasses = classes.filter(c => isThisWeek(c.class_date))
  const otherClasses = classes.filter(c => !isThisWeek(c.class_date))

  return (
    <div className="pt-20 md:pt-6" style={{ paddingLeft: "24px", paddingRight: "24px", paddingBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: C.text, fontSize: "24px", fontWeight: "800", marginBottom: "4px" }}>🎁 Class Gifts</h1>
          <p style={{ color: C.sub, fontSize: "13px" }}>{classes.length} classes total</p>
        </div>
        {canManageMarketing && (
          <button onClick={() => setShowAddModal(true)} style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, color: "#fff", border: "none", borderRadius: "10px", padding: "10px 18px", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>
            + Add Class
          </button>
        )}
      </div>

      {/* This week's classes */}
      {weekClasses.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ color: C.accent, fontSize: "15px", fontWeight: "700", marginBottom: "12px" }}>📅 This Week's Classes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {weekClasses.map(cls => <ClassCard key={cls.id} cls={cls} onAssign={() => { setShowGiftModal(cls); setGiftList([{ item_id: "", variant_id: "", quantity: 1 }]) }} onPacked={() => handleMarkPacked(cls.id, cls.marketing_class_gifts)} onDistributed={() => handleMarkDistributed(cls.id, cls.marketing_class_gifts)} canManage={canManageMarketing} items={items} variants={variants} getItemStock={getItemStock} />)}
          </div>
        </div>
      )}

      {/* All classes */}
      <div>
        <h2 style={{ color: "#e2e8f0", fontSize: "15px", fontWeight: "700", marginBottom: "12px" }}>All Classes</h2>
        {loading ? <p style={{ color: C.sub }}>Loading...</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {classes.map(cls => <ClassCard key={cls.id} cls={cls} onAssign={() => { setShowGiftModal(cls); setGiftList([{ item_id: "", variant_id: "", quantity: 1 }]) }} onPacked={() => handleMarkPacked(cls.id, cls.marketing_class_gifts)} onDistributed={() => handleMarkDistributed(cls.id, cls.marketing_class_gifts)} canManage={canManageMarketing} items={items} variants={variants} getItemStock={getItemStock} />)}
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      <AnimatePresence>
        {showAddModal && (
          <Modal title="Add New Class" onClose={() => setShowAddModal(false)}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Field label="Class Name *"><input value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} placeholder="e.g. AWS Cloud Practitioner" style={inputStyle} /></Field>
              <Field label="Course Type">
                <select value={form.class_type} onChange={e => setForm({ ...form, class_type: e.target.value })} style={inputStyle}>
                  <option value="">Select type</option>
                  {CLASS_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <Field label="Start Date *"><input type="date" value={form.class_date} onChange={e => setForm({ ...form, class_date: e.target.value })} style={inputStyle} /></Field>
                <Field label="End Date"><input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} style={inputStyle} /></Field>
                <Field label="Pax Count"><input type="number" min={0} value={form.pax_count} onChange={e => setForm({ ...form, pax_count: e.target.value })} style={inputStyle} /></Field>
                <Field label="Pax Confirmed"><input type="number" min={0} value={form.pax_confirmed} onChange={e => setForm({ ...form, pax_confirmed: e.target.value })} style={inputStyle} /></Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <Field label="Account Manager"><input value={form.account_manager} onChange={e => setForm({ ...form, account_manager: e.target.value })} style={inputStyle} /></Field>
                <Field label="Person in Charge"><input value={form.person_in_charge} onChange={e => setForm({ ...form, person_in_charge: e.target.value })} style={inputStyle} /></Field>
                <Field label="Classroom"><input value={form.classroom} onChange={e => setForm({ ...form, classroom: e.target.value })} placeholder="e.g. Room 1" style={inputStyle} /></Field>
                <Field label="Trainer"><input value={form.trainer_name} onChange={e => setForm({ ...form, trainer_name: e.target.value })} style={inputStyle} /></Field>
              </div>
              <Field label="Notes"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></Field>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, background: "rgba(148,163,184,0.1)", color: C.sub, border: "none", borderRadius: "10px", padding: "10px", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSaveClass} disabled={saving || !form.class_name || !form.class_date} style={{ flex: 2, background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, color: "#fff", border: "none", borderRadius: "10px", padding: "10px", fontWeight: "600", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save Class"}</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Assign Gifts Modal */}
      <AnimatePresence>
        {showGiftModal && (
          <Modal title={`Assign Gifts — ${showGiftModal.class_name}`} onClose={() => setShowGiftModal(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {giftList.map((g, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 30px", gap: "6px", alignItems: "end" }}>
                  <Field label={i === 0 ? "Item" : ""}>
                    <select value={g.item_id} onChange={e => { const arr = [...giftList]; arr[i].item_id = e.target.value; arr[i].variant_id = ""; setGiftList(arr) }} style={inputStyle}>
                      <option value="">Select item</option>
                      {items.map(it => <option key={it.id} value={it.id}>{it.name} (stock: {getItemStock(it.id)})</option>)}
                    </select>
                  </Field>
                  <Field label={i === 0 ? "Variant" : ""}>
                    <select value={g.variant_id} onChange={e => { const arr = [...giftList]; arr[i].variant_id = e.target.value; setGiftList(arr) }} style={inputStyle}>
                      <option value="">Any</option>
                      {variants.filter(v => v.item_id === g.item_id).map(v => <option key={v.id} value={v.id}>{v.variant_name}{v.color ? ` (${v.color})` : ""}</option>)}
                    </select>
                  </Field>
                  <Field label={i === 0 ? "Qty" : ""}>
                    <input type="number" min={1} value={g.quantity} onChange={e => { const arr = [...giftList]; arr[i].quantity = e.target.value; setGiftList(arr) }} style={inputStyle} />
                  </Field>
                  {giftList.length > 1 && (
                    <button onClick={() => setGiftList(prev => prev.filter((_, idx) => idx !== i))} style={{ color: C.error, background: "none", border: "none", cursor: "pointer", fontSize: "18px", paddingBottom: "2px" }}>✕</button>
                  )}
                </div>
              ))}
              <button onClick={() => setGiftList(prev => [...prev, { item_id: "", variant_id: "", quantity: 1 }])}
                style={{ background: "rgba(6,182,212,0.08)", color: C.accent, border: `1px dashed ${C.border}`, borderRadius: "8px", padding: "8px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>
                + Add Another Item
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setShowGiftModal(null)} style={{ flex: 1, background: "rgba(148,163,184,0.1)", color: C.sub, border: "none", borderRadius: "10px", padding: "10px", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleAssignGifts} disabled={saving} style={{ flex: 2, background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, color: "#fff", border: "none", borderRadius: "10px", padding: "10px", fontWeight: "600", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Assign Gifts"}</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

function ClassCard({ cls, onAssign, onPacked, onDistributed, canManage, items, variants, getItemStock }) {
  const gifts = cls.marketing_class_gifts || []
  const allDist = gifts.length > 0 && gifts.every(g => g.is_distributed)
  const allPacked = gifts.length > 0 && gifts.every(g => g.is_packed)

  return (
    <motion.div whileHover={{ scale: 1.005 }} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
        <div>
          <p style={{ color: C.text, fontWeight: "700", fontSize: "15px" }}>{cls.class_name}</p>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
            {cls.class_type && <span style={{ background: "rgba(6,182,212,0.1)", color: C.accent, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "1px 8px", fontSize: "11px" }}>{cls.class_type}</span>}
            <PackingBadge gifts={gifts} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {canManage && <button onClick={onAssign} style={{ background: "rgba(6,182,212,0.12)", color: C.accent, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "5px 10px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>🎁 Assign Gifts</button>}
          {canManage && !allPacked && gifts.length > 0 && <button onClick={onPacked} style={{ background: "rgba(245,158,11,0.12)", color: C.warning, border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "5px 10px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>📦 Mark Packed</button>}
          {canManage && allPacked && !allDist && <button onClick={onDistributed} style={{ background: "rgba(16,185,129,0.12)", color: C.success, border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", padding: "5px 10px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>✅ Mark Distributed</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "6px", marginBottom: "10px" }}>
        <Info icon="📅" label={cls.class_date} />
        {cls.classroom && <Info icon="🏫" label={cls.classroom} />}
        {cls.pax_confirmed > 0 && <Info icon="👥" label={`${cls.pax_confirmed} pax confirmed`} />}
        {cls.account_manager && <Info icon="👤" label={cls.account_manager} />}
        {cls.person_in_charge && <Info icon="🙋" label={cls.person_in_charge} />}
      </div>

      {gifts.length > 0 && (
        <div>
          <p style={{ color: C.sub, fontSize: "11px", marginBottom: "5px" }}>Assigned gifts:</p>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {gifts.map(g => (
              <span key={g.id} style={{ background: "rgba(6,182,212,0.08)", color: C.text, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "3px 10px", fontSize: "11px" }}>
                {g.marketing_items?.name || "?"} × {g.quantity}
                {g.marketing_item_variants?.variant_name && ` (${g.marketing_item_variants.variant_name})`}
                {g.is_distributed ? " ✅" : g.is_packed ? " 📦" : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function Info({ icon, label }) {
  return <span style={{ color: "#94a3b8", fontSize: "11px" }}>{icon} {label}</span>
}

const C_local = C

function Modal({ title, onClose, children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: "#0f2730", border: `1px solid ${C_local.border}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "560px", maxHeight: "85vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ color: C_local.text, fontSize: "17px", fontWeight: "700" }}>{title}</h2>
          <button onClick={onClose} style={{ color: "#94a3b8", background: "none", border: "none", cursor: "pointer", fontSize: "20px" }}>✕</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}
