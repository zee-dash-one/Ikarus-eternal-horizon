/**
 * Shared Equips UI: exclusive slot dropdowns, stacking general list, resolved four-pack.
 */

import {
  EQUIP_SLOT_IDS,
  GENERAL_MOD_IDS,
  legalIdsForSlot,
  type EquipSlotId,
} from '../../gameobjects/equipment/equipment'
import type { DebuggerEquipsBind } from './debugger'

interface TextHandle {
  readonly el: HTMLSelectElement | HTMLInputElement
  read(): string
}

interface ResolvedHandle {
  readonly el: HTMLElement
  readonly field: 'damage' | 'rate' | 'speed' | 'radius'
}

const SLOT_LABELS: Record<EquipSlotId, string> = {
  weapon: 'Weapon',
  dash: 'Dash',
  bomb: 'Bomb',
  wings: 'Wings',
  shield: 'Shield',
  armor: 'Armor',
  rockets: 'Rockets',
  engine: 'Engine',
  collector: 'Collector',
  converter: 'Converter',
  lab: 'Lab',
}

export function mountEquipsBlock(
  host: HTMLElement,
  bind: DebuggerEquipsBind,
  slots: readonly EquipSlotId[] = EQUIP_SLOT_IDS,
): { sync: () => void } {
  const selects: TextHandle[] = []
  const resolved: ResolvedHandle[] = []
  const generalHost = document.createElement('div')
  generalHost.className = 'debug-equips-general'

  group(host, 'Slots')
  for (const slot of slots) {
    selects.push(slotSelect(host, bind, slot))
  }

  group(host, 'General')
  const addRow = document.createElement('label')
  addRow.className = 'debug-row debug-selectrow'
  const addName = document.createElement('span')
  addName.className = 'debug-label'
  addName.textContent = 'add'
  const addSelect = document.createElement('select')
  addSelect.dataset.bind = 'equips.general.add'
  const blank = document.createElement('option')
  blank.value = ''
  blank.textContent = '(choose)'
  addSelect.append(blank)
  for (const id of GENERAL_MOD_IDS) {
    const opt = document.createElement('option')
    opt.value = id
    opt.textContent = id
    addSelect.append(opt)
  }
  const addBtn = document.createElement('button')
  addBtn.type = 'button'
  addBtn.textContent = 'Add'
  addBtn.addEventListener('click', () => {
    if (addSelect.value === '') {
      return
    }
    bind.addGeneral(addSelect.value)
    addSelect.value = ''
    renderGeneral(generalHost, bind)
  })
  addRow.append(addName, addSelect, addBtn)
  host.append(addRow)
  host.append(generalHost)
  renderGeneral(generalHost, bind)

  group(host, 'Resolved weapon')
  for (const field of ['damage', 'rate', 'speed', 'radius'] as const) {
    resolved.push(resolvedRow(host, field, bind))
  }

  return {
    sync() {
      for (const handle of selects) {
        if (document.activeElement === handle.el) {
          continue
        }
        handle.el.value = handle.read()
      }
      if (document.activeElement !== addSelect) {
        /* keep picker idle */
      }
      renderGeneral(generalHost, bind)
      const snap = bind.resolved()
      for (const handle of resolved) {
        handle.el.textContent = snap ? formatNum(snap[handle.field]) : '—'
      }
    },
  }
}

function slotSelect(host: HTMLElement, bind: DebuggerEquipsBind, slot: EquipSlotId): TextHandle {
  const row = document.createElement('label')
  row.className = 'debug-row debug-selectrow'
  const name = document.createElement('span')
  name.className = 'debug-label'
  name.textContent = SLOT_LABELS[slot]
  const select = document.createElement('select')
  select.dataset.bind = `equips.slots.${slot}`
  const empty = document.createElement('option')
  empty.value = ''
  empty.textContent = '(none)'
  select.append(empty)
  for (const id of legalIdsForSlot(slot)) {
    const opt = document.createElement('option')
    opt.value = id
    opt.textContent = id
    select.append(opt)
  }
  select.addEventListener('input', () => {
    bind.setSlot(slot, select.value === '' ? null : select.value)
  })
  row.append(name, select)
  host.append(row)
  return {
    el: select,
    read: () => bind.state().slots[slot] ?? '',
  }
}

function renderGeneral(host: HTMLElement, bind: DebuggerEquipsBind): void {
  host.replaceChildren()
  const list = bind.state().general
  if (list.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'debug-row'
    empty.textContent = '(none)'
    host.append(empty)
    return
  }
  list.forEach((id, index) => {
    const row = document.createElement('div')
    row.className = 'debug-row'
    const name = document.createElement('span')
    name.className = 'debug-label'
    name.textContent = id
    name.dataset.bind = `equips.general.${index}`
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.textContent = 'Remove'
    remove.addEventListener('click', () => {
      bind.removeGeneral(index)
      renderGeneral(host, bind)
    })
    row.append(name, remove)
    host.append(row)
  })
}

function resolvedRow(
  host: HTMLElement,
  field: 'damage' | 'rate' | 'speed' | 'radius',
  bind: DebuggerEquipsBind,
): ResolvedHandle {
  const row = document.createElement('div')
  row.className = 'debug-row'
  const name = document.createElement('span')
  name.className = 'debug-label'
  name.textContent = field
  const value = document.createElement('span')
  value.className = 'debug-value'
  value.dataset.bind = `equips.resolved.${field}`
  const snap = bind.resolved()
  value.textContent = snap ? formatNum(snap[field]) : '—'
  row.append(name, value)
  host.append(row)
  return { el: value, field }
}

function group(host: HTMLElement, label: string): void {
  const el = document.createElement('div')
  el.className = 'debug-group'
  el.textContent = label
  host.append(el)
}

function formatNum(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}
