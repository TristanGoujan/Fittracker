import { useState, useEffect } from 'react'

const LS_KEY = 'fittracker:pinned_prs'

function loadPinned() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) ?? []
  } catch {
    return []
  }
}

export default function PRWidget({ prs }) {
  const [pinned, setPinned] = useState(loadPinned)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(pinned))
  }, [pinned])

  function addExercise(id) {
    if (!pinned.includes(id)) setPinned((p) => [...p, id])
    setAdding(false)
    setSearch('')
  }

  function removeExercise(id) {
    setPinned((p) => p.filter((x) => x !== id))
  }

  const prMap = Object.fromEntries((prs ?? []).map((p) => [p.exercise_id, p]))
  const pinnedData = pinned.map((id) => prMap[id]).filter(Boolean)

  const available = (prs ?? []).filter(
    (p) => !pinned.includes(p.exercise_id)
  )
  const filtered = search
    ? available.filter((p) =>
        p.exercise_name.toLowerCase().includes(search.toLowerCase())
      )
    : available

  if (!prs) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Personal Records</h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            + Ajouter un PR
          </button>
        )}
      </div>

      {/* Sélecteur d'exercice */}
      {adding && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un exercice…"
            className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-600"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.length === 0 && (
              <p className="text-zinc-600 text-sm px-1">Aucun résultat</p>
            )}
            {filtered.map((p) => (
              <button
                key={p.exercise_id}
                onClick={() => addExercise(p.exercise_id)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex justify-between"
              >
                <span>{p.exercise_name}</span>
                <span className="text-zinc-600">{p.muscle_group}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setAdding(false); setSearch('') }}
            className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Cartes PR */}
      {pinnedData.length === 0 && !adding && (
        <p className="text-zinc-600 text-sm">
          Aucun PR épinglé — clique sur "+ Ajouter un PR" pour suivre tes records.
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {pinnedData.map((pr) => (
          <div
            key={pr.exercise_id}
            className="bg-zinc-900 rounded-xl p-4 relative group"
          >
            <button
              onClick={() => removeExercise(pr.exercise_id)}
              className="absolute top-2 right-2 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
            >
              ✕
            </button>
            <p className="text-zinc-500 text-xs mb-1 truncate">{pr.muscle_group}</p>
            <p className="text-white text-sm font-medium truncate mb-2">{pr.exercise_name}</p>
            <p className="text-indigo-400 text-2xl font-bold">
              {pr.weight_kg}
              <span className="text-zinc-500 text-sm font-normal ml-1">kg</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
