import { useCallback, useSyncExternalStore } from 'react'

/** localStorage 기반 공유 상태. 같은 key를 쓰는 컴포넌트끼리 자동 동기화 */
const listeners = new Map<string, Set<() => void>>()
const cache = new Map<string, unknown>()
const PREFIX = 'jn_'

function read<T>(key: string, init: T): T {
  if (cache.has(key)) return cache.get(key) as T
  let v = init
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw) v = JSON.parse(raw)
  } catch {
    /* 사생활 보호 모드 등 */
  }
  cache.set(key, v)
  return v
}

export function writeStored<T>(key: string, v: T) {
  cache.set(key, v)
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(v))
  } catch {
    /* noop */
  }
  listeners.get(key)?.forEach((f) => f())
}

export function useStored<T>(key: string, init: T): [T, (v: T | ((p: T) => T)) => void] {
  const sub = useCallback(
    (f: () => void) => {
      if (!listeners.has(key)) listeners.set(key, new Set())
      listeners.get(key)!.add(f)
      return () => listeners.get(key)!.delete(f)
    },
    [key],
  )
  const v = useSyncExternalStore(sub, () => read(key, init))
  const set = useCallback(
    (n: T | ((p: T) => T)) => writeStored(key, typeof n === 'function' ? (n as (p: T) => T)(read(key, init)) : n),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  return [v, set]
}
