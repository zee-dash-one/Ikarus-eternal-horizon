type BalanceLeaf = Record<string, unknown>

export function getBalancePath(root: BalanceLeaf, path: string): unknown {
  let cur: unknown = root
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') {
      return undefined
    }
    cur = (cur as BalanceLeaf)[key]
  }
  return cur
}

export function setBalancePath(root: BalanceLeaf, path: string, value: unknown): void {
  const keys = path.split('.')
  const last = keys.pop()
  if (!last) {
    return
  }
  let cur: BalanceLeaf = root
  for (const key of keys) {
    cur = cur[key] as BalanceLeaf
  }
  cur[last] = value
}
