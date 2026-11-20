import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiCtx, useChat, type Api } from './chat'
import { flows } from './flows'
import { Menu } from './widgets'

const Logo = ({ size = 120 }: { size?: number }) => (
  <svg width={size} height={size * 0.58} viewBox="0 0 120 70" role="img" aria-label="줄넘기 로고">
    <path d="M6 62C18 40 40 18 62 24C80 30 78 52 58 56C38 58 34 34 52 22C70 10 96 8 112 8" fill="none" stroke="var(--g)" strokeWidth="7" strokeLinecap="round" />
    <path d="M6 62C18 40 40 18 62 24C80 30 78 52 58 56C38 58 34 34 52 22C70 10 96 8 112 8" fill="none" stroke="var(--g-soft)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" />
  </svg>
)
const Avatar = () => (
  <span className="avatar" aria-hidden>
    <svg viewBox="0 0 64 64">
      <path d="M8 52C16 36 26 22 36 24C46 26 44 40 34 42C24 43 22 30 32 22C40 15 50 12 58 12" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
    </svg>
  </span>
)

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="intro">
      <div className="intro-mid">
        <Logo />
        <h1>줄넘기</h1>
        <p className="slo">취업 준비, 한 걸음씩 함께해요</p>
        <p className="sub">
          어려운 취업 정보를 쉽게 이해하고, 직접 연습하며
          <br />
          나에게 맞는 일자리를 찾아봐요.
        </p>
        <ul className="intro-feat">
          <li>💡 이해하기 · 어려운 정보를 쉽게</li>
          <li>🎯 연습하기 · 자기소개서와 면접</li>
          <li>🔎 활용하기 · 지원 정보와 경험 나눔</li>
        </ul>
      </div>
      <button className="btn big" onClick={onStart}>
        줄넘기와 대화 시작하기
      </button>
      <p className="sm center">체험용 프로토타입이에요. 실제 AI가 연결되어 있지 않아요.</p>
    </div>
  )
}

export default function App() {
  const [started, setStarted] = useState(false)
  const { msgs, typing, pending, run, answer } = useChat(flows)
  const [sheet, setSheet] = useState<{ title: string; node: ReactNode } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const api: Api = useMemo(
    () => ({
      run,
      sheet: (title, node) => setSheet({ title, node }),
      closeSheet: () => setSheet(null),
      toast: (m) => {
        setToast(m)
        setTimeout(() => setToast(null), 1800)
      },
    }),
    [run],
  )

  useEffect(() => {
    if (started) run('home', undefined, { clear: true })
  }, [started, run])

  useEffect(() => {
    const last = msgs[msgs.length - 1]
    // 긴 카드는 카드의 시작 부분이 보이도록
    if (last?.wide && !typing) document.getElementById('m' + last.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs.length, typing, pending])

  useEffect(() => {
    if (!sheet) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(null)
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [sheet])

  const canType = !!pending?.input
  const send = () => {
    const t = draft.trim()
    if (!t || !canType) return
    setDraft('')
    answer({ kind: 'text', text: t }, t)
  }
  const replies = pending?.replies ?? []
  const longReplies = replies.some((r) => r.label.length > 16)

  return (
    <ApiCtx.Provider value={api}>
      <div id="app">
        {!started ? (
          <Intro onStart={() => setStarted(true)} />
        ) : (
          <>
            <header className="top">
              <Avatar />
              <div className="top-t">
                <b>줄넘기</b>
                <small>{typing ? '입력 중…' : '취업 준비 도우미'}</small>
              </div>
              <button className="icon-btn" onClick={() => api.sheet('메뉴', <Menu onPick={() => setSheet(null)} />)} aria-label="메뉴">
                ☰
              </button>
              <button className="icon-btn" onClick={() => run('home', undefined, { clear: true })} aria-label="새 대화">
                ↺
              </button>
            </header>

            <main className="thread" aria-live="polite">
              {msgs.map((m) =>
                m.from === 'user' ? (
                  <div key={m.id} className="row-u">
                    <div className="bub me">{m.node}</div>
                  </div>
                ) : (
                  <div key={m.id} id={'m' + m.id} className="row-b">
                    <Avatar />
                    <div className={`bub bot ${m.wide ? 'wide' : ''}`}>{m.node}</div>
                  </div>
                ),
              )}
              {typing && (
                <div className="row-b">
                  <Avatar />
                  <div className="bub bot typing" aria-label="입력 중">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </main>

            <footer className="dock">
              {replies.length > 0 && (
                <div className={`replies ${longReplies ? 'long' : ''}`}>
                  {replies.map((r) => (
                    <button key={r.value + r.label} className={`qr ${r.primary ? 'primary' : ''}`} onClick={() => answer({ kind: 'reply', value: r.value }, r.label)}>
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
              <div className={`composer ${canType ? '' : 'off'}`}>
                <textarea
                  ref={inputRef}
                  rows={pending?.input?.multiline ? 4 : 1}
                  value={draft}
                  disabled={!canType}
                  placeholder={canType ? pending!.input!.placeholder : replies.length ? '위에서 골라 주세요' : '잠시만요…'}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !pending?.input?.multiline) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  aria-label="메시지 입력"
                />
                <button className="send" onClick={send} disabled={!canType || !draft.trim()} aria-label="보내기">
                  ↑
                </button>
              </div>
            </footer>
          </>
        )}

        {sheet && (
          <div className="ov" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
            <div className="sheet" role="dialog" aria-modal="true" aria-label={sheet.title}>
              <div className="grab" />
              <h3>{sheet.title}</h3>
              <div className="sheet-body">{sheet.node}</div>
              <button className="btn o" onClick={() => setSheet(null)}>
                닫기
              </button>
            </div>
          </div>
        )}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </ApiCtx.Provider>
  )
}
