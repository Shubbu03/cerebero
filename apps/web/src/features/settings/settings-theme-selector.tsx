import {
  CheckIcon,
  DesktopIcon,
  MoonIcon,
  SunIcon,
} from '@phosphor-icons/react'

import { useTheme } from '../../app/theme-context'

const themeOptions = [
  { description: 'Warm paper', icon: SunIcon, label: 'Light', value: 'light' },
  { description: 'Night study', icon: MoonIcon, label: 'Dark', value: 'dark' },
  {
    description: 'Match device',
    icon: DesktopIcon,
    label: 'System',
    value: 'system',
  },
] as const

export function SettingsThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <fieldset className="grid w-full min-w-0 grid-cols-3 gap-2 md:w-96 md:shrink-0">
      <legend className="sr-only">Theme</legend>
      {themeOptions.map(({ description, icon: Icon, label, value }) => (
        <div className="min-w-0" key={value}>
          <input
            checked={theme === value}
            className="peer sr-only"
            id={`settings-theme-${value}`}
            name="settings-theme"
            onChange={() => setTheme(value)}
            type="radio"
            value={value}
          />
          <label
            className="border-border-subtle bg-surface text-secondary hover:border-border-strong peer-checked:border-accent-strong peer-checked:bg-accent/5 peer-checked:text-primary peer-focus-visible:ring-focus rounded-control duration-fast peer-focus-visible:ring-offset-canvas flex cursor-pointer flex-col gap-3 border p-3 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2"
            htmlFor={`settings-theme-${value}`}
          >
            <span className="flex items-center justify-between gap-2">
              <Icon aria-hidden="true" size={20} />
              {theme === value ? (
                <CheckIcon
                  aria-hidden="true"
                  className="text-accent-strong"
                  size={14}
                  weight="bold"
                />
              ) : null}
            </span>
            <span>
              <span className="block text-sm font-semibold">{label}</span>
              <span className="text-secondary mt-0.5 block text-xs">
                {description}
              </span>
            </span>
          </label>
        </div>
      ))}
    </fieldset>
  )
}
