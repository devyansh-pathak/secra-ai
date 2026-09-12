import { createContext, useContext } from 'react'
// Theme is now fixed — Aether Obsidian only. No toggle needed.
const ThemeContext = createContext({ isDark: true, toggle: () => {} })
export function ThemeProvider({ children }) {
  return <ThemeContext.Provider value={{ isDark: true, toggle: () => {} }}>{children}</ThemeContext.Provider>
}
export const useTheme = () => useContext(ThemeContext)
