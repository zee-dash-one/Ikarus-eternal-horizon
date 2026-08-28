import type { ReactNode } from 'react'

export function TabBar<T extends string>({
  tabs,
  active,
  onSelect,
  className = 'pause-tab-group',
}: {
  readonly tabs: ReadonlyArray<{ id: T; label: string }>
  readonly active: T
  readonly onSelect: (id: T) => void
  readonly className?: string
}) {
  return (
    <nav className={className} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`pause-tab-btn${active === tab.id ? ' pause-tab-btn--active' : ''}`}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export function TabPanel({
  visible,
  children,
  className = 'pause-tab',
}: {
  readonly visible: boolean
  readonly children: ReactNode
  readonly className?: string
}) {
  if (!visible) {
    return null
  }
  return (
    <div className={className} role="tabpanel">
      {children}
    </div>
  )
}
