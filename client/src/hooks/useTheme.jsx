import { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = {
  blue: {
    id: 'blue',
    name: 'Bleu',
    swatch: '#3b82f6',
    vars: {
      '--ac':    '59,130,246',
      '--ac-d':  '37,99,235',
      '--ac-dd': '29,78,216',
      '--ac-l':  '96,165,250',
      '--ac-lt': '147,197,253',
    },
  },
  violet: {
    id: 'violet',
    name: 'Violet',
    swatch: '#8b5cf6',
    vars: {
      '--ac':    '139,92,246',
      '--ac-d':  '124,58,237',
      '--ac-dd': '109,40,217',
      '--ac-l':  '167,139,250',
      '--ac-lt': '196,181,253',
    },
  },
  green: {
    id: 'green',
    name: 'Vert',
    swatch: '#10b981',
    vars: {
      '--ac':    '16,185,129',
      '--ac-d':  '5,150,105',
      '--ac-dd': '4,120,87',
      '--ac-l':  '52,211,153',
      '--ac-lt': '110,231,183',
    },
  },
  amber: {
    id: 'amber',
    name: 'Ambre',
    swatch: '#f59e0b',
    vars: {
      '--ac':    '245,158,11',
      '--ac-d':  '217,119,6',
      '--ac-dd': '180,83,9',
      '--ac-l':  '251,191,36',
      '--ac-lt': '253,230,138',
    },
  },
  orange: {
    id: 'orange',
    name: 'Orange',
    swatch: '#f97316',
    vars: {
      '--ac':    '249,115,22',
      '--ac-d':  '234,88,12',
      '--ac-dd': '194,65,12',
      '--ac-l':  '251,146,60',
      '--ac-lt': '253,186,116',
    },
  },
}

const LS_KEY = 'fittracker:theme'

const ThemeContext = createContext(null)

function applyTheme(theme) {
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    const saved = localStorage.getItem(LS_KEY)
    return THEMES[saved] ? saved : 'blue'
  })

  useEffect(() => {
    applyTheme(THEMES[themeId])
    localStorage.setItem(LS_KEY, themeId)
  }, [themeId])

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
