import { useState } from 'react'

const MUSCLE_COLORS = {
  'Pectoraux':  '#6366f1',
  'Dos':        '#10b981',
  'Épaules':    '#f59e0b',
  'Biceps':     '#ef4444',
  'Triceps':    '#a855f7',
  'Jambes':     '#3b82f6',
  'Abdominaux': '#14b8a6',
}

const GROUPS = [
  {
    muscle: 'Pectoraux',
    exercises: [
      { name: 'Développé incliné', variants: [
        { label: 'Machine',  fullName: 'Développé incliné machine' },
        { label: 'Barre',    fullName: 'Développé incliné barre' },
        { label: 'Haltères', fullName: 'Développé incliné haltères' },
      ]},
      { name: 'Développé couché', variants: [
        { label: 'Machine',  fullName: 'Développé couché machine' },
        { label: 'Barre',    fullName: 'Développé couché barre' },
        { label: 'Haltères', fullName: 'Développé couché haltères' },
      ]},
      { name: 'Pec deck', variants: [
        { label: 'Machine',  fullName: 'Pec deck machine' },
        { label: 'Poulies',  fullName: 'Pec deck poulies' },
      ]},
      { name: 'Écarté haltères', variants: null },
      { name: 'Pompes',          variants: null },
    ],
  },
  {
    muscle: 'Dos',
    exercises: [
      { name: 'Tractions', variants: null },
      { name: 'Tirage vertical', variants: [
        { label: 'Machine',  fullName: 'Tirage vertical machine' },
        { label: 'Poulies',  fullName: 'Tirage vertical poulies' },
      ]},
      { name: 'Tirage horizontal', variants: [
        { label: 'Machine — prise large',  fullName: 'Tirage horizontal machine prise large' },
        { label: 'Machine — prise serrée', fullName: 'Tirage horizontal machine prise serrée' },
        { label: 'Poulies — prise large',  fullName: 'Tirage horizontal poulies prise large' },
        { label: 'Poulies — prise serrée', fullName: 'Tirage horizontal poulies prise serrée' },
      ]},
      { name: 'Tirage unilatéral poulies', variants: null },
      { name: 'Shrugs',               variants: null },
      { name: 'Soulevé de terre',     variants: null },
      { name: 'Pullover',             variants: null },
    ],
  },
  {
    muscle: 'Épaules',
    exercises: [
      { name: 'Développé militaire',  variants: null },
      { name: 'Élévations latérales', variants: null },
      { name: 'Oiseau',               variants: null },
    ],
  },
  {
    muscle: 'Biceps',
    exercises: [
      { name: 'Curl marteau', variants: [
        { label: 'Poulies',  fullName: 'Curl marteau poulies' },
        { label: 'Haltères', fullName: 'Curl marteau haltères' },
      ]},
      { name: 'Curl classique', variants: null },
      { name: 'Curl barre',     variants: null },
      { name: 'Preacher curl', variants: [
        { label: 'Machine',  fullName: 'Preacher curl machine' },
        { label: 'Haltères', fullName: 'Preacher curl haltères' },
      ]},
    ],
  },
  {
    muscle: 'Triceps',
    exercises: [
      { name: 'Pushdown poulies', variants: null },
      { name: 'Dips',             variants: null },
      { name: 'Kickback', variants: [
        { label: 'Poulies',  fullName: 'Kickback poulies' },
        { label: 'Haltères', fullName: 'Kickback haltères' },
      ]},
      { name: 'Skull crusher', variants: [
        { label: 'Haltères', fullName: 'Skull crusher haltères' },
        { label: 'Barre',    fullName: 'Skull crusher barre' },
      ]},
      { name: 'Extension horizontale poulies haute', variants: null },
    ],
  },
  {
    muscle: 'Jambes',
    exercises: [
      { name: 'Presse à cuisses',        variants: null },
      { name: 'Squat',                   variants: null },
      { name: 'Leg extension',           variants: null },
      { name: 'Leg curl', variants: [
        { label: 'Assis',   fullName: 'Leg curl assis' },
        { label: 'Allongé', fullName: 'Leg curl allongé' },
      ]},
      { name: 'Fentes bulgares',         variants: null },
      { name: 'Hip-thrust',              variants: null },
      { name: 'Hack squat',              variants: null },
      { name: 'Soulevé de terre roumain', variants: null },
      { name: 'Extension mollet', variants: [
        { label: 'Presse',     fullName: 'Extension mollet presse' },
        { label: 'Barre',      fullName: 'Extension mollet barre' },
        { label: 'Hack squat', fullName: 'Extension mollet hack squat' },
        { label: 'Machine',    fullName: 'Extension mollet machine' },
      ]},
    ],
  },
  {
    muscle: 'Abdominaux',
    exercises: [
      { name: 'Crunchs',           variants: null },
      { name: 'Planche',           variants: null },
      { name: 'Relevés de jambes', variants: null },
    ],
  },
]

function findGroupInfo(fullName) {
  for (const group of GROUPS) {
    for (const ex of group.exercises) {
      if (!ex.variants) {
        if (ex.name === fullName) return { muscle: group.muscle, exName: ex.name, variantLabel: null }
      } else {
        const v = ex.variants.find(v => v.fullName === fullName)
        if (v) return { muscle: group.muscle, exName: ex.name, variantLabel: v.label }
      }
    }
  }
  return null
}

export default function ExerciseRow({ exercise, index, exerciseOptions, dispatch }) {
  // Picker state hoisted here — no sub-component
  const [pickerOpen,   setPickerOpen]   = useState(false)
  const [pickerStep,   setPickerStep]   = useState('groups') // 'groups' | 'variants'
  const [pendingGroup, setPendingGroup] = useState(null)

  const nameToId = Object.fromEntries((exerciseOptions ?? []).map(o => [o.name, o.id]))

  const current   = (exerciseOptions ?? []).find(ex => ex.id === exercise.exercise_id)
  const groupInfo = current ? findGroupInfo(current.name) : null
  const color     = groupInfo ? MUSCLE_COLORS[groupInfo.muscle] : 'rgba(var(--ac-l),1)'

  function openPicker() {
    setPickerStep('groups')
    setPendingGroup(null)
    setPickerOpen(v => !v)
  }

  function handleGroupExerciseClick(ex) {
    if (!ex.variants) {
      // Sélection directe
      const found = (exerciseOptions ?? []).find(o => o.name === ex.name)
      if (found) dispatch({ type: 'SET_EXERCISE_FIELD', index, field: 'exercise_id', value: found.id })
      setPickerOpen(false)
    } else {
      // Passe à l'étape variantes
      setPendingGroup(ex)
      setPickerStep('variants')
    }
  }

  function handleVariantClick(fullName) {
    const id = nameToId[fullName]
    if (id) {
      dispatch({ type: 'SET_EXERCISE_FIELD', index, field: 'exercise_id', value: id })
      setPickerOpen(false)
      setPickerStep('groups')
      setPendingGroup(null)
    }
  }

  function backToGroups() {
    setPendingGroup(null)
    setPickerStep('groups')
  }

  // Exercices pas couverts par GROUPS (legacy)
  const covered = new Set(
    GROUPS.flatMap(g => g.exercises.flatMap(ex =>
      ex.variants ? ex.variants.map(v => v.fullName) : [ex.name]
    ))
  )
  const legacy = (exerciseOptions ?? []).filter(o => !covered.has(o.name))

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.1)' }}
    >
      {/* ── En-tête ── */}
      <div className="flex gap-3 items-start">
        <div className="flex-1">

          {/* Bouton principal */}
          <button
            type="button"
            onClick={openPicker}
            className="w-full text-left rounded-xl px-4 py-3 transition-all flex items-center justify-between gap-3"
            style={{
              background: current ? `${color}10` : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${current ? color + '35' : 'rgba(var(--ac),0.12)'}`,
            }}
          >
            {current ? (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: `${color}99` }}>
                  {groupInfo?.muscle ?? current.muscle_group}
                </p>
                <p className="text-sm font-bold text-white truncate">
                  {groupInfo?.exName ?? current.name}
                  {groupInfo?.variantLabel && (
                    <span className="ml-2 font-normal text-xs" style={{ color: `${color}bb` }}>
                      {groupInfo.variantLabel}
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <span className="text-sm" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
                Choisir un exercice…
              </span>
            )}
            <svg
              width="14" height="14" viewBox="0 0 24 24"
              fill={current ? color : 'rgba(var(--ac-lt),0.3)'}
              style={{ transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
            >
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>

          {/* ── Panel picker ── */}
          {pickerOpen && (
            <div
              className="mt-1.5 rounded-xl p-3"
              style={{ background: 'rgba(8,15,31,0.97)', border: '1px solid rgba(var(--ac),0.15)' }}
            >

              {/* ── ÉTAPE 1 : liste des exercices groupés ── */}
              {pickerStep === 'groups' && (
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {GROUPS.map(group => {
                    const c = MUSCLE_COLORS[group.muscle]
                    return (
                      <div key={group.muscle}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2 px-1" style={{ color: `${c}99` }}>
                          {group.muscle}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.exercises.map(ex => (
                            <button
                              key={ex.name}
                              type="button"
                              onClick={() => handleGroupExerciseClick(ex)}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = `${c}18`; e.currentTarget.style.borderColor = `${c}50`; e.currentTarget.style.color = '#fff' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                            >
                              {ex.name}
                              {ex.variants && (
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5 }}>
                                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {legacy.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Autres</p>
                      <div className="flex flex-wrap gap-1.5">
                        {legacy.map(ex => (
                          <button
                            key={ex.id}
                            type="button"
                            onClick={() => { dispatch({ type: 'SET_EXERCISE_FIELD', index, field: 'exercise_id', value: ex.id }); setPickerOpen(false) }}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}
                          >
                            {ex.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── ÉTAPE 2 : choix de la variante ── */}
              {pickerStep === 'variants' && pendingGroup && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      type="button"
                      onClick={backToGroups}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                      </svg>
                      Retour
                    </button>
                    <p className="text-sm font-bold text-white">{pendingGroup.name}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {pendingGroup.variants.map(v => {
                      const inDb    = v.fullName in nameToId
                      const muscle  = GROUPS.find(g => g.exercises.some(e => e.name === pendingGroup.name))?.muscle
                      const c       = MUSCLE_COLORS[muscle] || '#6366f1'
                      return (
                        <button
                          key={v.fullName}
                          type="button"
                          onClick={() => handleVariantClick(v.fullName)}
                          disabled={!inDb}
                          className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{
                            background: `${c}14`,
                            border: `1.5px solid ${c}35`,
                            color: c,
                          }}
                          onMouseEnter={e => { if (inDb) { e.currentTarget.style.background = `${c}28`; e.currentTarget.style.borderColor = `${c}70` } }}
                          onMouseLeave={e => { if (inDb) { e.currentTarget.style.background = `${c}14`; e.currentTarget.style.borderColor = `${c}35` } }}
                        >
                          {v.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Fermer */}
              <div className="flex justify-end mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                  type="button"
                  onClick={() => { setPickerOpen(false); setPickerStep('groups'); setPendingGroup(null) }}
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Repos */}
        <div className="flex items-center gap-1.5 shrink-0 pt-2.5">
          <input
            type="number"
            value={exercise.rest_seconds}
            onChange={(e) => dispatch({ type: 'SET_EXERCISE_FIELD', index, field: 'rest_seconds', value: Number(e.target.value) })}
            className="w-16 text-white text-sm rounded-xl px-2 py-2.5 outline-none text-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(var(--ac),0.12)' }}
            min="0"
          />
          <span className="text-xs" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>sec</span>
        </div>

        {/* Supprimer */}
        <button
          type="button"
          onClick={() => dispatch({ type: 'REMOVE_EXERCISE', index })}
          className="shrink-0 pt-2.5"
          style={{ color: 'rgba(255,255,255,0.2)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>

      {/* ── Séries ── */}
      <div className="space-y-2">
        <div className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] gap-2 px-1">
          <span className="text-xs" style={{ color: 'rgba(var(--ac-lt),0.25)' }}>#</span>
          <span className="text-xs" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>Poids (kg)</span>
          <span className="text-xs" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>Reps</span>
          <span />
        </div>

        {exercise.sets.map((set, j) => (
          <div key={j} className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] gap-2 items-center">
            <span className="text-xs text-center font-bold" style={{ color: current ? `${color}66` : 'rgba(255,255,255,0.2)' }}>
              {j + 1}
            </span>
            <input
              type="number"
              value={set.weight_kg}
              onChange={(e) => dispatch({ type: 'UPDATE_SET', index, setIndex: j, field: 'weight_kg', value: e.target.value })}
              className="text-white text-sm rounded-xl px-3 py-2 outline-none text-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(var(--ac),0.1)' }}
              placeholder="—" min="0" step="0.5"
            />
            <input
              type="number"
              value={set.reps}
              onChange={(e) => dispatch({ type: 'UPDATE_SET', index, setIndex: j, field: 'reps', value: e.target.value })}
              className="text-white text-sm rounded-xl px-3 py-2 outline-none text-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(var(--ac),0.1)' }}
              placeholder="—" min="0"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'REMOVE_SET', index, setIndex: j })}
              disabled={exercise.sets.length <= 1}
              className="transition-colors disabled:opacity-0"
              style={{ color: 'rgba(255,255,255,0.2)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: 'ADD_SET', index })}
        className="text-sm font-semibold transition-colors"
        style={{ color: current ? `${color}99` : 'rgba(var(--ac-lt),0.3)' }}
        onMouseEnter={e => { e.currentTarget.style.color = current ? color : 'rgba(var(--ac-lt),0.5)' }}
        onMouseLeave={e => { e.currentTarget.style.color = current ? `${color}99` : 'rgba(var(--ac-lt),0.3)' }}
      >
        + Série
      </button>
    </div>
  )
}
