import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import type { FlowId } from './data'

export type Reply = { label: string; value: string; primary?: boolean }
export type Ask = { replies?: Reply[]; input?: { placeholder: string; multiline?: boolean } }
export type Answer = { kind: 'reply'; value: string } | { kind: 'text'; text: string }
export type Msg = { id: number; from: 'bot' | 'user' | 'divider'; node: ReactNode; wide?: boolean }

export interface Ctx {
  /** 봇 말풍선 (타이핑 표시 후) */
  say(node: ReactNode, opts?: { wide?: boolean; delay?: number }): Promise<void>
  /** 빠른 답장/입력을 기다림. 답하면 사용자 말풍선이 자동으로 붙음 */
  ask(a: Ask): Promise<Answer>
  /** 사용자 말풍선을 바로 붙임 (시연 모드 자동 답변용) */
  user(text: string): void
  run(id: FlowId, arg?: unknown): void
  /** 화면 API (바텀시트, 전체 화면 페이지 등) */
  api: Api
}
export type Flow = (c: Ctx, arg?: unknown) => Promise<void>

const ABORT = Symbol('abort')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useChat(flows: Record<FlowId, Flow>, apiRef: { current: Api | null }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const [pending, setPending] = useState<Ask | null>(null)
  const token = useRef(0)
  const nextId = useRef(0)
  const waiter = useRef<{ res: (a: Answer) => void; rej: (e: unknown) => void } | null>(null)

  const push = useCallback((m: Omit<Msg, 'id'>) => setMsgs((p) => [...p, { ...m, id: ++nextId.current }]), [])

  const run = useCallback(
    (id: FlowId, arg?: unknown, opts?: RunOpts) => {
      const t = ++token.current
      waiter.current?.rej(ABORT)
      waiter.current = null
      setPending(null)
      setTyping(false)
      if (opts?.clear) setMsgs([])
      if (opts?.echo) push({ from: 'user', node: opts.echo })

      const fast = !!opts?.fast
      const guard = () => {
        if (token.current !== t) throw ABORT
      }
      const ctx: Ctx = {
        async say(node, o) {
          guard()
          setTyping(true)
          await sleep(fast ? 40 : (o?.delay ?? 420))
          guard()
          setTyping(false)
          push({ from: 'bot', node, wide: o?.wide })
        },
        ask(a) {
          guard()
          setPending(a)
          return new Promise<Answer>((res, rej) => {
            waiter.current = { res, rej }
          })
        },
        user(text) {
          guard()
          push({ from: 'user', node: text })
        },
        run: (nid, narg) => run(nid, narg),
        get api() {
          return apiRef.current!
        },
      }
      flows[id](ctx, arg).catch((e) => {
        if (e !== ABORT) console.error(e)
      })
    },
    [flows, push, apiRef],
  )

  const answer = useCallback(
    (a: Answer, echo: string) => {
      const w = waiter.current
      if (!w) return
      waiter.current = null
      setPending(null)
      push({ from: 'user', node: echo })
      w.res(a)
    },
    [push],
  )

  /** 진행 중인 대화 흐름 멈추기 (메뉴로 돌아갈 때) */
  const stop = useCallback(() => {
    token.current++
    waiter.current?.rej(ABORT)
    waiter.current = null
    setPending(null)
    setTyping(false)
  }, [])

  return { msgs, typing, pending, run, answer, stop }
}

export type RunOpts = { echo?: string; clear?: boolean; /** 타이핑 애니메이션 생략(캡처 화면용) */ fast?: boolean }
export type Demo = { step: number; cap: boolean }

/* 말풍선 안의 위젯(버튼, 바텀시트)이 쓰는 API */
export type Api = {
  run: (id: FlowId, arg?: unknown, opts?: RunOpts) => void
  sheet: (title: string, node: ReactNode) => void
  closeSheet: () => void
  /** 대화창 위에 전체 화면 페이지 열기 (null이면 닫기) */
  page: (node: ReactNode | null) => void
  /** 첫 목록(메뉴) 화면으로 */
  home: () => void
  toast: (m: string) => void
  /** 시연 모드 상태 (꺼져 있으면 null) */
  demo: () => Demo | null
  /** 시연 모드 단계 이동 (0 소개, 1~5 STEP, 6 완료) */
  goStep: (n: number) => void
  exitDemo: () => void
  enterDemo: () => void
  /** 캡처용 화면 바로 열기 */
  capGo: (i: number) => void
}
export const ApiCtx = createContext<Api>(null as unknown as Api)
export const useApi = () => useContext(ApiCtx)
