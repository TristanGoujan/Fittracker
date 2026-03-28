import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { animate } from 'animejs'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
import Navbar from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'
import { getProfile, updateProfile, uploadAvatar, changePassword, deleteAccount } from '../api/auth'
import { getBodyWeight, addBodyWeight, deleteBodyWeight } from '../api/bodyweight'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

// ─── Password strength ────────────────────────────────────────────────────────

function getStrength(pwd) {
  if (!pwd) return 0
  let s = 0
  if (pwd.length >= 8)  s++
  if (pwd.length >= 12) s++
  if (/[A-Z]/.test(pwd)) s++
  if (/[0-9]/.test(pwd)) s++
  if (/[^A-Za-z0-9]/.test(pwd)) s++
  return s
}
const STRENGTH_LABEL = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort']
const STRENGTH_COLOR = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']

// ─── Shared input style ───────────────────────────────────────────────────────

const INPUT_STYLE = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(var(--ac),0.12)',
}
const INPUT_FOCUS  = { borderColor: 'rgba(var(--ac),0.4)' }
const INPUT_BLUR   = { borderColor: 'rgba(var(--ac),0.12)' }

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(var(--ac-lt),0.45)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, type = 'text', placeholder, min, step }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      step={step}
      className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none transition-all placeholder:opacity-20"
      style={INPUT_STYLE}
      onFocus={(e) => Object.assign(e.currentTarget.style, INPUT_FOCUS)}
      onBlur={(e)  => Object.assign(e.currentTarget.style, INPUT_BLUR)}
    />
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({ children, danger = false, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{
        background: danger ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'rgba(var(--ac),0.1)'}`,
      }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
      {children}
    </p>
  )
}

// ─── Feedback button (Anime.js) ────────────────────────────────────────────────

function SaveButton({ loading, success, onClick, label = 'Enregistrer', successLabel = 'Enregistré !' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (success && ref.current) {
      animate(ref.current, { scale: [1, 1.05, 1], duration: 400, easing: 'easeOutBack' })
    }
  }, [success])

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={loading || success}
      className="px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: success
          ? 'linear-gradient(135deg, #059669, #047857)'
          : 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
        boxShadow: success
          ? '0 4px 16px rgba(5,150,105,0.3)'
          : '0 4px 16px rgba(var(--ac-d),0.3)',
      }}
    >
      {loading ? 'Enregistrement…' : success ? successLabel : label}
    </button>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AvatarUploader({ username, avatarUrl, onUpload }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 256
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        canvas.width  = Math.round(img.width  * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const base64 = canvas.toDataURL('image/jpeg', 0.82)
        setUploading(true)
        onUpload(base64).finally(() => setUploading(false))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const initials = (username ?? '?').slice(0, 2).toUpperCase()

  return (
    <div className="relative w-24 h-24 shrink-0">
      <div
        className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center font-black text-2xl text-white select-none"
        style={{ background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>

      {/* Upload overlay */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        title="Changer la photo"
      >
        {uploading ? (
          <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity=".25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        )}
      </button>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ─── Delete account modal ─────────────────────────────────────────────────────

function DeleteModal({ onConfirm, onClose, loading }) {
  const [pwd, setPwd] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#0c1a35', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <h3 className="text-white font-black text-lg mb-1">Supprimer le compte</h3>
        <p className="text-sm mb-5" style={{ color: 'rgba(var(--ac-lt),0.45)' }}>
          Cette action est irréversible. Toutes tes séances et données seront définitivement supprimées.
        </p>
        <Field label="Confirme ton mot de passe">
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Mot de passe actuel"
            className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none placeholder:opacity-20"
            style={INPUT_STYLE}
            onFocus={(e) => Object.assign(e.currentTarget.style, INPUT_FOCUS)}
            onBlur={(e)  => Object.assign(e.currentTarget.style, INPUT_BLUR)}
          />
        </Field>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 text-sm font-semibold py-2.5 rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(pwd)}
            disabled={loading || !pwd}
            className="flex-1 text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-40"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }}
          >
            {loading ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Body weight section ──────────────────────────────────────────────────────

function BodyWeightSection({ token }) {
  const [entries, setEntries]     = useState([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [date, setDate]           = useState(() => new Date().toISOString().slice(0, 10))
  const [weight, setWeight]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    getBodyWeight(token)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoadingEntries(false))
  }, [token])

  // Build / rebuild chart whenever entries change
  useEffect(() => {
    if (!chartRef.current) return
    if (chartInstance.current) {
      chartInstance.current.destroy()
      chartInstance.current = null
    }
    if (entries.length === 0) return

    const style = getComputedStyle(document.documentElement)
    const ac   = style.getPropertyValue('--ac').trim()    || '59,130,246'
    const acL  = style.getPropertyValue('--ac-l').trim()  || '96,165,250'
    const acLt = style.getPropertyValue('--ac-lt').trim() || '147,197,253'

    const labels = entries.map((e) =>
      new Date(e.entry_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    )

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data: entries.map((e) => e.weight_kg),
            borderColor: `rgba(${ac},1)`,
            backgroundColor: `rgba(${ac},0.08)`,
            borderWidth: 2,
            pointBackgroundColor: `rgba(${acL},1)`,
            pointBorderColor: '#1e3a5f',
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(5,15,35,0.95)',
            borderColor: `rgba(${ac},0.2)`,
            borderWidth: 1,
            titleColor: `rgba(${acLt},0.6)`,
            bodyColor: '#fff',
            callbacks: {
              label: (item) => ` ${item.raw} kg`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: `rgba(${ac},0.05)` },
            ticks: { color: `rgba(${acLt},0.4)`, maxTicksLimit: 8, font: { size: 11 } },
          },
          y: {
            grid: { color: `rgba(${ac},0.05)` },
            ticks: {
              color: `rgba(${acLt},0.4)`,
              font: { size: 11 },
              callback: (v) => `${v} kg`,
            },
          },
        },
      },
    })

    return () => {
      chartInstance.current?.destroy()
      chartInstance.current = null
    }
  }, [entries])

  async function handleAdd() {
    if (!weight || !date) return
    setSaving(true)
    try {
      const entry = await addBodyWeight(token, { weight_kg: Number(weight), entry_date: date })
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.entry_date !== entry.entry_date)
        return [...filtered, entry].sort((a, b) => a.entry_date.localeCompare(b.entry_date))
      })
      setWeight('')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteBodyWeight(token, id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
    } catch {
      // ignore
    }
  }

  const latest = entries[entries.length - 1]
  const first  = entries[0]
  const diff   = latest && first && latest !== first
    ? (latest.weight_kg - first.weight_kg).toFixed(1)
    : null

  return (
    <Card>
      <SectionTitle>Évolution du poids</SectionTitle>

      {/* Stats rapides */}
      {latest && (
        <div className="flex gap-4 mb-5 flex-wrap">
          <div
            className="flex-1 min-w-28 rounded-xl px-4 py-3 text-center"
            style={{ background: 'rgba(var(--ac),0.06)', border: '1px solid rgba(var(--ac),0.1)' }}
          >
            <p className="text-xl font-black text-white">{latest.weight_kg} <span className="text-sm font-normal" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>kg</span></p>
            <p className="text-xs uppercase tracking-wider mt-0.5" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>Dernier poids</p>
          </div>
          {diff !== null && (
            <div
              className="flex-1 min-w-28 rounded-xl px-4 py-3 text-center"
              style={{ background: 'rgba(var(--ac),0.06)', border: '1px solid rgba(var(--ac),0.1)' }}
            >
              <p className="text-xl font-black" style={{ color: Number(diff) < 0 ? '#22c55e' : Number(diff) > 0 ? '#f97316' : '#94a3b8' }}>
                {Number(diff) > 0 ? '+' : ''}{diff} <span className="text-sm font-normal" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>kg</span>
              </p>
              <p className="text-xs uppercase tracking-wider mt-0.5" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>Évolution totale</p>
            </div>
          )}
          <div
            className="flex-1 min-w-28 rounded-xl px-4 py-3 text-center"
            style={{ background: 'rgba(var(--ac),0.06)', border: '1px solid rgba(var(--ac),0.1)' }}
          >
            <p className="text-xl font-black text-white">{entries.length}</p>
            <p className="text-xs uppercase tracking-wider mt-0.5" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>Mesures</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {loadingEntries ? (
        <div className="h-48 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ) : entries.length >= 2 ? (
        <div className="relative h-48 mb-5">
          <canvas ref={chartRef} />
        </div>
      ) : entries.length === 1 ? (
        <div className="h-20 flex items-center justify-center mb-5 rounded-xl text-sm"
          style={{ background: 'rgba(var(--ac),0.04)', border: '1px solid rgba(var(--ac),0.08)', color: 'rgba(var(--ac-lt),0.4)' }}>
          Ajoute au moins 2 mesures pour voir la courbe
        </div>
      ) : null}

      {/* Add entry form */}
      <div
        className="flex gap-3 items-end flex-wrap pt-4"
        style={{ borderTop: '1px solid rgba(var(--ac),0.08)' }}
      >
        <div className="flex-1 min-w-32">
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(var(--ac-lt),0.45)' }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none transition-all"
            style={INPUT_STYLE}
            onFocus={(e) => Object.assign(e.currentTarget.style, INPUT_FOCUS)}
            onBlur={(e)  => Object.assign(e.currentTarget.style, INPUT_BLUR)}
          />
        </div>
        <div className="flex-1 min-w-28">
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(var(--ac-lt),0.45)' }}>Poids (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="75.5"
            min="1"
            step="0.1"
            className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none transition-all placeholder:opacity-20"
            style={INPUT_STYLE}
            onFocus={(e) => Object.assign(e.currentTarget.style, INPUT_FOCUS)}
            onBlur={(e)  => Object.assign(e.currentTarget.style, INPUT_BLUR)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !weight || !date}
          className="text-sm font-bold px-5 py-3 rounded-xl transition-all disabled:opacity-40 shrink-0"
          style={{
            background: saveSuccess
              ? 'linear-gradient(135deg,#059669,#047857)'
              : 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
            boxShadow: saveSuccess
              ? '0 4px 14px rgba(5,150,105,0.25)'
              : '0 4px 14px rgba(var(--ac-d),0.25)',
            color: '#fff',
          }}
        >
          {saving ? '…' : saveSuccess ? '✓' : 'Ajouter'}
        </button>
      </div>

      {/* Past entries list */}
      {entries.length > 0 && (
        <div className="mt-4 space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {[...entries].reverse().map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl group"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(var(--ac),0.07)' }}
            >
              <span className="text-sm" style={{ color: 'rgba(var(--ac-lt),0.55)' }}>
                {new Date(e.entry_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-white">{e.weight_kg} kg</span>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg"
                  style={{ color: '#f87171' }}
                  title="Supprimer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

const GOALS = [
  { value: 'muscle', label: 'Prise de masse' },
  { value: 'cut',    label: 'Sèche' },
  { value: 'strength', label: 'Force' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'fitness',  label: 'Remise en forme' },
]

export default function Profile() {
  const { token, user, updateUser, logout } = useAuth()
  const navigate = useNavigate()

  const headerRef  = useRef(null)
  const formRef    = useRef(null)
  const bwRef      = useRef(null)
  const pwdRef     = useRef(null)
  const dangerRef  = useRef(null)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [form, setForm] = useState({
    username: '', email: '', weight_kg: '', height_cm: '',
    birth_date: '', goal: '', weekly_target: '',
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)
  const [formError, setFormError] = useState('')

  // Password state
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState('')

  // Delete modal
  const [showDelete, setShowDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // ── Fetch profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    getProfile(token)
      .then((data) => {
        setProfile(data)
        // Synchronise l'avatar dans le contexte auth pour la Navbar
        updateUser({ avatar_url: data.avatar_url })
        setForm({
          username:      data.username      ?? '',
          email:         data.email         ?? '',
          weight_kg:     data.weight_kg     ?? '',
          height_cm:     data.height_cm     ?? '',
          birth_date:    data.birth_date    ?? '',
          goal:          data.goal          ?? '',
          weekly_target: data.weekly_target ?? '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  // ── Animations d'entrée ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return
    const targets = [headerRef, formRef, bwRef, pwdRef, dangerRef].map((r) => r.current).filter(Boolean)
    targets.forEach((el, i) => {
      animate(el, {
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 500,
        delay: i * 80,
        easing: 'easeOutQuad',
      })
    })
  }, [profile])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function setF(field) {
    return (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      setFormSuccess(false)
      setFormError('')
    }
  }

  async function handleSaveProfile() {
    setFormError('')
    setFormLoading(true)
    try {
      const updated = await updateProfile(token, {
        username:      form.username,
        email:         form.email,
        weight_kg:     form.weight_kg     !== '' ? Number(form.weight_kg)     : null,
        height_cm:     form.height_cm     !== '' ? Number(form.height_cm)     : null,
        birth_date:    form.birth_date    || null,
        goal:          form.goal          || null,
        weekly_target: form.weekly_target !== '' ? Number(form.weekly_target) : null,
      })
      setProfile((prev) => ({ ...prev, ...updated }))
      updateUser({ username: updated.username, email: updated.email })
      setFormSuccess(true)
      setTimeout(() => setFormSuccess(false), 3000)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleAvatar(base64) {
    try {
      const res = await uploadAvatar(token, base64)
      setProfile((prev) => ({ ...prev, avatar_url: res.avatar_url }))
      updateUser({ avatar_url: res.avatar_url })
    } catch (err) {
      // ignore silently — avatar non critique
    }
  }

  async function handleChangePassword() {
    setPwdError('')
    if (pwd.next !== pwd.confirm) {
      return setPwdError('Les mots de passe ne correspondent pas')
    }
    setPwdLoading(true)
    try {
      await changePassword(token, pwd.current, pwd.next)
      setPwdSuccess(true)
      setPwd({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwdSuccess(false), 3000)
    } catch (err) {
      setPwdError(err.message)
    } finally {
      setPwdLoading(false)
    }
  }

  async function handleDeleteAccount(password) {
    setDeleteError('')
    setDeleteLoading(true)
    try {
      await deleteAccount(token, password)
      logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(err.message)
      setDeleteLoading(false)
    }
  }

  const strength = getStrength(pwd.next)

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'linear-gradient(135deg, #020810 0%, #07101f 40%, #050c1a 70%, #020810 100%)' }}
    >
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {loading ? (
          <div className="space-y-4">
            {[96, 280, 200, 120].map((h, i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{ height: `${h}px`, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.08)' }}
              />
            ))}
          </div>
        ) : (
          <>
            {/* ── En-tête de profil ─────────────────────────────────────── */}
            <div ref={headerRef} style={{ opacity: 0 }}>
              <Card>
                <div className="flex items-center gap-6 flex-wrap">
                  <AvatarUploader
                    username={profile?.username}
                    avatarUrl={profile?.avatar_url}
                    onUpload={handleAvatar}
                  />

                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-black text-white">@{profile?.username}</h2>
                    <p className="text-sm mt-0.5" style={{ color: 'rgba(var(--ac-lt),0.45)' }}>{profile?.email}</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(var(--ac-lt),0.25)' }}>
                      Membre depuis{' '}
                      {new Date(profile?.created_at).toLocaleDateString('fr-FR', {
                        month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div
                  className="grid grid-cols-3 gap-3 mt-6 pt-5"
                  style={{ borderTop: '1px solid rgba(var(--ac),0.08)' }}
                >
                  {[
                    { label: 'Séances', value: profile?.stats?.total_sessions ?? 0 },
                    { label: 'Meilleure série', value: `${profile?.stats?.best_streak ?? 0}j` },
                    {
                      label: 'Volume total',
                      value: (profile?.stats?.total_volume ?? 0).toLocaleString('fr-FR'),
                      unit: 'kg',
                    },
                  ].map(({ label, value, unit }) => (
                    <div key={label} className="text-center">
                      <p className="text-2xl font-black text-white">
                        {value}
                        {unit && <span className="text-sm font-normal ml-1" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>{unit}</span>}
                      </p>
                      <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Programme actif */}
                {profile?.current_program && (() => {
                  const PROG_INFO = {
                    ppl: { name: 'Push Pull Legs', color: '#6366f1' },
                    ul: { name: 'Upper / Lower', color: '#10b981' },
                    fullbody: { name: 'Full Body', color: '#f59e0b' },
                    bro: { name: 'Bro Split', color: '#ef4444' },
                    arnold: { name: 'Arnold Split', color: '#a855f7' },
                    custom: { name: 'Programme libre', color: '#64748b' },
                  }
                  const p = PROG_INFO[profile.current_program]
                  if (!p) return null
                  return (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(var(--ac),0.08)' }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>Programme actif</p>
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold"
                        style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}35` }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        {p.name}
                      </span>
                    </div>
                  )
                })()}
              </Card>
            </div>

            {/* ── Informations personnelles ─────────────────────────────── */}
            <div ref={formRef} style={{ opacity: 0 }}>
              <Card>
                <SectionTitle>Informations personnelles</SectionTitle>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nom d'utilisateur">
                      <TextInput value={form.username} onChange={setF('username')} placeholder="johndoe" />
                    </Field>
                    <Field label="Email">
                      <TextInput value={form.email} onChange={setF('email')} type="email" placeholder="ton@email.com" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Field label="Poids (kg)">
                      <TextInput value={form.weight_kg} onChange={setF('weight_kg')} type="number" placeholder="75" min="0" step="0.5" />
                    </Field>
                    <Field label="Taille (cm)">
                      <TextInput value={form.height_cm} onChange={setF('height_cm')} type="number" placeholder="175" min="0" />
                    </Field>
                    <Field label="Date de naissance">
                      <TextInput value={form.birth_date} onChange={setF('birth_date')} type="date" />
                    </Field>
                    <Field label="Séances / semaine">
                      <TextInput value={form.weekly_target} onChange={setF('weekly_target')} type="number" placeholder="4" min="1" />
                    </Field>
                  </div>

                  <Field label="Objectif principal">
                    <select
                      value={form.goal}
                      onChange={setF('goal')}
                      className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none transition-all"
                      style={INPUT_STYLE}
                      onFocus={(e) => Object.assign(e.currentTarget.style, INPUT_FOCUS)}
                      onBlur={(e)  => Object.assign(e.currentTarget.style, INPUT_BLUR)}
                    >
                      <option value="" style={{ background: '#080f1f' }}>Choisir un objectif…</option>
                      {GOALS.map((g) => (
                        <option key={g.value} value={g.value} style={{ background: '#080f1f' }}>{g.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {formError && (
                  <p
                    className="text-sm rounded-xl px-4 py-3 mt-4"
                    style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    {formError}
                  </p>
                )}

                <div className="flex justify-end mt-5">
                  <SaveButton
                    loading={formLoading}
                    success={formSuccess}
                    onClick={handleSaveProfile}
                    label="Enregistrer"
                    successLabel="Modifications enregistrées !"
                  />
                </div>
              </Card>
            </div>

            {/* ── Évolution du poids ────────────────────────────────────── */}
            <div ref={bwRef} style={{ opacity: 0 }}>
              <BodyWeightSection token={token} />
            </div>

            {/* ── Changement de mot de passe ────────────────────────────── */}
            <div ref={pwdRef} style={{ opacity: 0 }}>
              <Card>
                <SectionTitle>Mot de passe</SectionTitle>

                <div className="space-y-4">
                  <Field label="Mot de passe actuel">
                    <TextInput
                      type="password"
                      value={pwd.current}
                      onChange={(e) => { setPwd((p) => ({ ...p, current: e.target.value })); setPwdError('') }}
                      placeholder="••••••••"
                    />
                  </Field>

                  <Field label="Nouveau mot de passe">
                    <TextInput
                      type="password"
                      value={pwd.next}
                      onChange={(e) => { setPwd((p) => ({ ...p, next: e.target.value })); setPwdError('') }}
                      placeholder="8 caractères minimum"
                    />
                    {/* Indicateur de force */}
                    {pwd.next && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <div
                              key={n}
                              className="flex-1 h-1 rounded-full transition-all"
                              style={{
                                background: n <= strength
                                  ? STRENGTH_COLOR[strength]
                                  : 'rgba(255,255,255,0.08)',
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-xs font-semibold" style={{ color: STRENGTH_COLOR[strength] }}>
                          {STRENGTH_LABEL[strength]}
                        </p>
                      </div>
                    )}
                  </Field>

                  <Field label="Confirmer le nouveau mot de passe">
                    <TextInput
                      type="password"
                      value={pwd.confirm}
                      onChange={(e) => { setPwd((p) => ({ ...p, confirm: e.target.value })); setPwdError('') }}
                      placeholder="••••••••"
                    />
                    {pwd.confirm && pwd.next !== pwd.confirm && (
                      <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>
                        Les mots de passe ne correspondent pas
                      </p>
                    )}
                  </Field>
                </div>

                {pwdError && (
                  <p
                    className="text-sm rounded-xl px-4 py-3 mt-4"
                    style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    {pwdError}
                  </p>
                )}

                <div className="flex justify-end mt-5">
                  <SaveButton
                    loading={pwdLoading}
                    success={pwdSuccess}
                    onClick={handleChangePassword}
                    label="Changer le mot de passe"
                    successLabel="Mot de passe mis à jour !"
                  />
                </div>
              </Card>
            </div>

            {/* ── Zone dangereuse ───────────────────────────────────────── */}
            <div ref={dangerRef} style={{ opacity: 0 }}>
              <Card danger>
                <SectionTitle>Zone dangereuse</SectionTitle>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-white font-bold text-sm">Supprimer le compte</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
                      Supprime définitivement ton compte et toutes tes données d'entraînement.
                    </p>
                    {deleteError && (
                      <p className="text-xs mt-2" style={{ color: '#f87171' }}>{deleteError}</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setDeleteError(''); setShowDelete(true) }}
                    className="text-sm font-bold px-5 py-2.5 rounded-xl transition-all shrink-0"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)' }}
                  >
                    Supprimer le compte
                  </button>
                </div>
              </Card>
            </div>
          </>
        )}
      </main>

      {showDelete && (
        <DeleteModal
          loading={deleteLoading}
          onConfirm={handleDeleteAccount}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}
