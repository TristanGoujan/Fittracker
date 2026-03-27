import { useReducer, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { animate } from 'animejs'
import Navbar from '../components/Navbar'
import ExerciseRow from '../components/ExerciseRow'
import { createSession } from '../api/sessions'
import { useAuth } from '../hooks/useAuth'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState = {
  name: '',
  date: new Date().toISOString().split('T')[0],
  exercises: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.value }
    case 'SET_DATE':
      return { ...state, date: action.value }
    case 'ADD_EXERCISE':
      return {
        ...state,
        exercises: [
          ...state.exercises,
          { exercise_id: '', rest_seconds: 90, sets: [{ weight_kg: '', reps: '' }] },
        ],
      }
    case 'REMOVE_EXERCISE':
      return { ...state, exercises: state.exercises.filter((_, i) => i !== action.index) }
    case 'SET_EXERCISE_FIELD':
      return {
        ...state,
        exercises: state.exercises.map((ex, i) =>
          i === action.index ? { ...ex, [action.field]: action.value } : ex
        ),
      }
    case 'ADD_SET':
      return {
        ...state,
        exercises: state.exercises.map((ex, i) =>
          i === action.index
            ? { ...ex, sets: [...ex.sets, { weight_kg: '', reps: '' }] }
            : ex
        ),
      }
    case 'REMOVE_SET':
      return {
        ...state,
        exercises: state.exercises.map((ex, i) =>
          i === action.index
            ? { ...ex, sets: ex.sets.filter((_, j) => j !== action.setIndex) }
            : ex
        ),
      }
    case 'UPDATE_SET':
      return {
        ...state,
        exercises: state.exercises.map((ex, i) =>
          i === action.index
            ? {
                ...ex,
                sets: ex.sets.map((set, j) =>
                  j === action.setIndex ? { ...set, [action.field]: action.value } : set
                ),
              }
            : ex
        ),
      }
    default:
      return state
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function NewSession() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [exerciseOptions, setExerciseOptions] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const successRef = useRef(null)

  // Charger le catalogue d'exercices
  useEffect(() => {
    fetch(`${API}/api/exercises`)
      .then((r) => r.json())
      .then(setExerciseOptions)
      .catch(() => {})
  }, [])

  // Animation de succès
  useEffect(() => {
    if (success && successRef.current) {
      animate(successRef.current, {
        opacity: [0, 1],
        scale: [0.85, 1],
        duration: 500,
        easing: 'easeOutBack',
      })
      const t = setTimeout(() => navigate('/'), 1800)
      return () => clearTimeout(t)
    }
  }, [success, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (state.exercises.length === 0) {
      return setError('Ajoute au moins un exercice.')
    }
    for (const ex of state.exercises) {
      if (!ex.exercise_id) return setError('Sélectionne un exercice pour chaque ligne.')
    }

    setLoading(true)
    try {
      await createSession(token, {
        name: state.name,
        session_date: state.date,
        exercises: state.exercises.map((ex, i) => ({
          exercise_id: ex.exercise_id,
          rest_seconds: ex.rest_seconds,
          order_index: i,
          sets: ex.sets.map((s) => ({
            weight_kg: s.weight_kg !== '' ? Number(s.weight_kg) : null,
            reps: s.reps !== '' ? Number(s.reps) : null,
          })),
        })),
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-8">Nouvelle séance</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom + date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-sm mb-1.5">Nom de la séance</label>
              <input
                type="text"
                value={state.name}
                onChange={(e) => dispatch({ type: 'SET_NAME', value: e.target.value })}
                className="w-full bg-zinc-900 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-600"
                placeholder="Push day, Full body…"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-1.5">Date</label>
              <input
                type="date"
                value={state.date}
                onChange={(e) => dispatch({ type: 'SET_DATE', value: e.target.value })}
                required
                className="w-full bg-zinc-900 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Liste d'exercices */}
          <div className="space-y-4">
            {state.exercises.map((ex, i) => (
              <ExerciseRow
                key={i}
                exercise={ex}
                index={i}
                exerciseOptions={exerciseOptions}
                dispatch={dispatch}
              />
            ))}
          </div>

          {/* Ajouter exercice */}
          <button
            type="button"
            onClick={() => dispatch({ type: 'ADD_EXERCISE' })}
            className="w-full border border-dashed border-zinc-700 hover:border-indigo-500 text-zinc-500 hover:text-indigo-400 rounded-xl py-4 transition-colors text-sm"
          >
            + Ajouter un exercice
          </button>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || state.exercises.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 transition-colors"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer la séance'}
          </button>
        </form>
      </main>

      {/* Overlay de succès */}
      {success && (
        <div
          ref={successRef}
          className="fixed inset-0 bg-zinc-950/95 flex items-center justify-center opacity-0"
        >
          <div className="text-center">
            <div className="text-7xl mb-6">✓</div>
            <p className="text-3xl font-bold text-white">Séance enregistrée !</p>
            <p className="text-zinc-500 mt-3">Redirection vers le dashboard…</p>
          </div>
        </div>
      )}
    </div>
  )
}
