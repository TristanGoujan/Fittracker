export default function ExerciseRow({ exercise, index, exerciseOptions, dispatch }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      {/* En-tête : sélection exercice + repos + supprimer */}
      <div className="flex gap-3 items-center">
        <select
          value={exercise.exercise_id}
          onChange={(e) =>
            dispatch({
              type: 'SET_EXERCISE_FIELD',
              index,
              field: 'exercise_id',
              value: Number(e.target.value) || '',
            })
          }
          className="flex-1 bg-zinc-800 text-white rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Choisir un exercice…</option>
          {exerciseOptions.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name} — {ex.muscle_group}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            value={exercise.rest_seconds}
            onChange={(e) =>
              dispatch({
                type: 'SET_EXERCISE_FIELD',
                index,
                field: 'rest_seconds',
                value: Number(e.target.value),
              })
            }
            className="w-16 bg-zinc-800 text-white rounded-lg px-2 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-center"
            min="0"
          />
          <span className="text-zinc-500 text-xs">sec</span>
        </div>

        <button
          type="button"
          onClick={() => dispatch({ type: 'REMOVE_EXERCISE', index })}
          className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Séries */}
      <div className="space-y-2">
        <div className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] gap-2 px-1">
          <span className="text-xs text-zinc-600">#</span>
          <span className="text-xs text-zinc-500">Poids (kg)</span>
          <span className="text-xs text-zinc-500">Reps</span>
          <span />
        </div>

        {exercise.sets.map((set, j) => (
          <div key={j} className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] gap-2 items-center">
            <span className="text-zinc-600 text-sm text-center">{j + 1}</span>
            <input
              type="number"
              value={set.weight_kg}
              onChange={(e) =>
                dispatch({ type: 'UPDATE_SET', index, setIndex: j, field: 'weight_kg', value: e.target.value })
              }
              className="bg-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-center"
              placeholder="—"
              min="0"
              step="0.5"
            />
            <input
              type="number"
              value={set.reps}
              onChange={(e) =>
                dispatch({ type: 'UPDATE_SET', index, setIndex: j, field: 'reps', value: e.target.value })
              }
              className="bg-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-center"
              placeholder="—"
              min="0"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'REMOVE_SET', index, setIndex: j })}
              disabled={exercise.sets.length <= 1}
              className="text-zinc-600 hover:text-red-400 disabled:opacity-0 transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: 'ADD_SET', index })}
        className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        + Série
      </button>
    </div>
  )
}
