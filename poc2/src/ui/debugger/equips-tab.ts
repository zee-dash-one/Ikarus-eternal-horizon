/**
 * SDD-G08 Equips tab — exclusive slots + general mods, bound to the live sim.
 */

import type { EquipsState } from '../../gameobjects/equipment/equipment'
import { cloneEquips, EQUIP_SLOT_IDS } from '../../gameobjects/equipment/equipment'
import type { DebuggerBinds, DebuggerTab } from './debugger'
import { mountEquipsBlock } from './equips-fields'

type ListKey =
  | 'weapons'
  | 'bombs'
  | 'wings'
  | 'shields'
  | 'armors'
  | 'energyCollectors'
  | 'energyConverters'

interface TextHandle {
  readonly kind: 'text'
  readonly el: HTMLInputElement | HTMLSelectElement
  read(): string
}

interface EquipsClone {
  equips: EquipsState
  weapons: string[]
  bombs: string[]
  wings: string[]
  shields: string[]
  armors: string[]
  energyCollectors: string[]
  energyConverters: string[]
}

export class EquipsTab implements DebuggerTab {
  readonly id = 'equips' as const
  private readonly _binds: DebuggerBinds
  private readonly _handles: TextHandle[] = []
  private _defaults: EquipsClone | null = null
  private _form: HTMLFormElement | null = null
  private _blockSync: (() => void) | null = null

  constructor(binds: DebuggerBinds) {
    this._binds = binds
  }

  mount(panel: HTMLElement): void {
    const form = document.createElement('form')
    form.className = 'debug-form'
    form.autocomplete = 'off'
    form.addEventListener('submit', (event) => {
      event.preventDefault()
    })

    const block = mountEquipsBlock(form, this._binds.equips, EQUIP_SLOT_IDS)
    this._blockSync = block.sync

    this._group(form, 'Owned (inventory)')
    this._list(form, 'weapons', 'loadout.weapons')
    this._list(form, 'bombs', 'loadout.bombs')
    this._list(form, 'wings', 'loadout.wings')
    this._list(form, 'shields', 'loadout.shields')
    this._list(form, 'armors', 'loadout.armors')
    this._list(form, 'energyCollectors', 'loadout.energyCollectors')
    this._list(form, 'energyConverters', 'loadout.energyConverters')

    panel.append(form)
    this._form = form
    this._defaults = cloneOwned(this._binds)
    this.sync()
  }

  sync(): void {
    this._blockSync?.()
    for (const handle of this._handles) {
      if (document.activeElement === handle.el) {
        continue
      }
      handle.el.value = handle.read()
    }
  }

  reset(): void {
    const defaults = this._defaults
    if (!defaults) {
      return
    }
    const live = this._binds.ship.snapshot().loadout
    for (const slot of EQUIP_SLOT_IDS) {
      this._binds.equips.setSlot(slot, defaults.equips.slots[slot])
    }
    while (this._binds.equips.state().general.length > 0) {
      this._binds.equips.removeGeneral(0)
    }
    for (const id of defaults.equips.general) {
      this._binds.equips.addGeneral(id)
    }
    replaceList(live, 'weapons', defaults.weapons)
    replaceList(live, 'bombs', defaults.bombs)
    replaceList(live, 'wings', defaults.wings)
    replaceList(live, 'shields', defaults.shields)
    replaceList(live, 'armors', defaults.armors)
    replaceList(live, 'energyCollectors', defaults.energyCollectors)
    replaceList(live, 'energyConverters', defaults.energyConverters)
    this.sync()
  }

  dispose(): void {
    this._handles.length = 0
    this._form?.remove()
    this._form = null
    this._defaults = null
    this._blockSync = null
  }

  private _group(host: HTMLElement, label: string): void {
    const el = document.createElement('div')
    el.className = 'debug-group'
    el.textContent = label
    host.append(el)
  }

  private _list(host: HTMLElement, label: string, path: string): void {
    const row = document.createElement('label')
    row.className = 'debug-row debug-textrow'
    const name = document.createElement('span')
    name.className = 'debug-label'
    name.textContent = label
    const input = document.createElement('input')
    input.type = 'text'
    input.dataset.bind = path
    input.placeholder = 'id, id'
    const key = path.replace('loadout.', '') as ListKey
    input.addEventListener('input', () => {
      replaceList(this._binds.ship.snapshot().loadout, key, parseList(input.value))
    })
    row.append(name, input)
    host.append(row)
    this._handles.push({
      kind: 'text',
      el: input,
      read: () => this._binds.ship.snapshot().loadout[key].join(', '),
    })
  }
}

function cloneOwned(binds: DebuggerBinds): EquipsClone {
  const port = binds.ship.snapshot()
  return {
    equips: cloneEquips(binds.equips.state()),
    weapons: [...port.loadout.weapons],
    bombs: [...port.loadout.bombs],
    wings: [...port.loadout.wings],
    shields: [...port.loadout.shields],
    armors: [...port.loadout.armors],
    energyCollectors: [...port.loadout.energyCollectors],
    energyConverters: [...port.loadout.energyConverters],
  }
}

function parseList(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function replaceList(
  loadout: { [key: string]: unknown },
  key: ListKey,
  values: readonly string[],
): void {
  const current = loadout[key]
  if (Array.isArray(current) && !Object.isFrozen(current)) {
    current.length = 0
    current.push(...values)
    return
  }
  loadout[key] = [...values]
}
