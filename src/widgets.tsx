import { useState, type ReactNode } from 'react'
import { useApi } from './chat'
import { useStored, writeStored } from './store'
import {
  CATS, DOCS, EL, EZ, IQ, JOBS, POS0, SUP, SUP_QZ, TERMS, jo,
  type Doc, type FlowId, type Post, type Quiz, type Scenario,
} from './data'

/* ===== 기본 블록 ===== */
export const Note = ({ children, tone }: { children: ReactNode; tone?: 'ok' | 'warn' }) => (
  <div className={`note ${tone ?? ''}`}>{children}</div>
)
export const Demo = () => <Note>🧪 체험용 예시예요. 실제 AI 분석 결과가 아니에요.</Note>
export const Blk = ({ t, children, warn }: { t: ReactNode; children: ReactNode; warn?: boolean }) => (
  <section className={`blk ${warn ? 'warn' : ''}`}>
    <h4>{t}</h4>
    <div>{children}</div>
  </section>
)
export const Step = ({ i, n }: { i: number; n: number }) => (
  <div className="step">
    <span>
      질문 {i}/{n}
    </span>
    <div className="bar">
      <div style={{ width: `${(i / n) * 100}%` }} />
    </div>
  </div>
)
const List = ({ items }: { items: ReactNode[] }) => (
  <ul className="dots">
    {items.map((x, i) => (
      <li key={i}>{x}</li>
    ))}
  </ul>
)

export function TermButton({ i, label, seen, onSeen }: { i: number; label?: string; seen?: boolean; onSeen?: () => void }) {
  const api = useApi()
  const t = TERMS[i]
  return (
    <button
      className={`term ${seen ? 'seen' : ''}`}
      onClick={() => {
        onSeen?.()
        api.sheet(t[0], <TermBody i={i} />)
      }}
    >
      {label ?? t[0]}
      {seen ? ' ✓' : ''}
    </button>
  )
}
const TermBody = ({ i }: { i: number }) => (
  <>
    <p>{TERMS[i][1]}</p>
    <Note>{TERMS[i][2]}</Note>
    <p className="sm">법적인 판단이 아니에요. 걱정되면 상담 기관에 물어봐요.</p>
  </>
)

/* ===== 체크리스트 / 퀴즈 ===== */
export function Checklist({ k, items }: { k: string; items: string[] }) {
  const [done, setDone] = useStored<number[]>('ck_' + k, [])
  return (
    <div className="checks">
      {items.map((x, i) => {
        const on = done.includes(i)
        return (
          <button
            key={i}
            role="checkbox"
            aria-checked={on}
            className={`ck ${on ? 'd' : ''}`}
            onClick={() => setDone((d) => (d.includes(i) ? d.filter((y) => y !== i) : [...d, i]))}
          >
            <i>{on ? '✓' : ''}</i>
            <span>{x}</span>
          </button>
        )
      })}
      <div className="sm">
        {done.length}/{items.length} 완료
      </div>
    </div>
  )
}

export function QuizCard({ q }: { q: Quiz }) {
  const [pick, setPick] = useState<number | null>(null)
  return (
    <div className="quiz">
      <b>📝 확인해 봐요</b>
      <p>{q.q}</p>
      {q.o.map((o, i) => (
        <button
          key={i}
          className={`opt ${pick === null ? '' : i === q.a ? 'ok' : i === pick ? 'no' : 'dim'}`}
          onClick={() => setPick(i)}
        >
          {o}
        </button>
      ))}
      {pick !== null && (
        <Note tone={pick === q.a ? 'ok' : 'warn'}>
          {pick === q.a ? '👏 맞아요! ' : '괜찮아요, 다시 알아봐요. '}
          {q.e}
        </Note>
      )}
    </div>
  )
}

/* ===== 메뉴 ===== */
const MENU: [string, [string, string, string, FlowId][]][] = [
  ['💡 이해하기', [['💬', '고민 정리하기', '취업 고민을 이야기하면 함께 정리해요', 'worry'], ['📄', '서류 쉽게 읽기', '근로계약서, 채용 공고를 쉽게 풀어요', 'docs']]],
  ['🎯 연습하기', [['✍️', '자기소개서', '질문에 답하며 한 편 만들어요', 'cover'], ['🎤', '면접', '예상 질문에 답해 봐요', 'interview'], ['📑', '가상 근로계약서', '모르는 말을 눌러 확인해요', 'contract']]],
  ['🔎 활용하기', [['🏛️', '지원 정보', '지원 제도와 신청 방법', 'support'], ['📢', '취업 정보', '채용 공고와 직무 소개', 'jobs'], ['🗣️', '경험 나눔', '다른 사람의 경험 읽기', 'board']]],
]
export function Menu({ onPick }: { onPick?: () => void }) {
  const api = useApi()
  return (
    <div className="menu">
      {MENU.map(([g, items]) => (
        <div key={g}>
          <div className="menu-g">{g}</div>
          <div className="menu-items">
            {items.map(([ic, t, d, id]) => (
              <button
                key={id}
                className="mi"
                onClick={() => {
                  onPick?.()
                  api.run(id, undefined, { echo: `${ic} ${t}` })
                }}
              >
                <span className="ic">{ic}</span>
                <span>
                  <b>{t}</b>
                  <small>{d}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ===== 고민 정리 결과 ===== */
export function WorryResult({ text, sc, k, ans }: { text: string; sc: Scenario; k: string; ans: { t: string; i: number; c: string; a: string }[] }) {
  const check = [...new Set([...sc.bc, ...ans.map((x) => x.c)])]
  const acts = [...new Set([...ans.map((x) => x.a), ...sc.ba])]
  return (
    <div className="stack">
      <Demo />
      <Blk t="① 지금 고민하는 점">{text}</Blk>
      <Blk t="② 함께 확인한 내용">
        {ans.map((x, i) => (
          <div key={i} className="qa">
            <small>{sc.qs[i].q}</small>
            <b>{x.t}</b>
          </div>
        ))}
      </Blk>
      <Blk t="③ 알아보면 좋은 정보">
        <List items={check} />
      </Blk>
      <Blk t="④ 이렇게 준비해 보세요">
        <Checklist k={'j' + k + ans.map((x) => x.i).join('')} items={acts} />
      </Blk>
      <Blk t="⑤ 다음에 해볼 수 있는 활동">
        <List items={sc.nx} />
      </Blk>
      <QuizCard q={sc.qz} />
      <p className="sm">나에게 꼭 맞는 일이나 정답을 AI가 정해 주지 않아요. 알아보고 고르는 것은 내가 해요.</p>
    </div>
  )
}

/* ===== 문서 풀이 ===== */
export function DocResult({ k }: { k: string }) {
  const d: Doc = DOCS[k]
  return (
    <div className="stack">
      <Demo />
      <Blk t="이 문서는 무엇인가요?">{d.what}</Blk>
      <div className="cards2">
        {d.cards.map(([ic, t, b]) => (
          <div className="mini" key={t}>
            <span className="mini-ic">{ic}</span>
            <b>{t}</b>
            <p>{b}</p>
          </div>
        ))}
      </div>
      <Blk t="어려운 말 풀이">
        <p className="sm">눌러서 예시도 볼 수 있어요.</p>
        {d.terms.map((i) => (
          <div key={i} className="termrow">
            <TermButton i={i} />
            <span>{TERMS[i][1]}</span>
          </div>
        ))}
      </Blk>
      <Blk t="체크리스트">
        <Checklist k={'d' + k} items={d.checks} />
      </Blk>
      <QuizCard q={d.qz} />
      <Note>법적 효력이나 계약의 안전성은 AI가 확정하지 않아요.</Note>
    </div>
  )
}

export function CustomDoc({ text }: { text: string }) {
  const nums = [...new Set(text.match(/\d[\d,.]*\s*(?:만\s*)?원|\d{1,2}:\d{2}|\d+\s*(?:시간|개월|년|일)/g) ?? [])]
  const found = TERMS.map((t, i) => [t, i] as const).filter(([t]) => text.includes(t[0]))
  return (
    <div className="stack">
      <Blk t="✅ 체험용에서 할 수 있는 일">
        <List items={['글자 모양으로 금액, 시간, 기간 찾기', '아는 말(예: 수습기간)이 있으면 뜻 보여 주기']} />
      </Blk>
      <Blk t="⚠️ 할 수 없는 일" warn>
        <List items={['문서 전체의 뜻 이해와 요약', '계약이 안전한지, 불리한지 판단', '사진 속 글자 읽기']} />
      </Blk>
      <div className="paper">{text.slice(0, 1000) || '(내용 없음)'}</div>
      <Blk t="글자 모양으로 찾은 것">
        {nums.length ? (
          <div className="tags">
            {nums.map((n) => (
              <span className="tag" key={n}>
                {n}
              </span>
            ))}
          </div>
        ) : (
          '찾은 것이 없어요.'
        )}
      </Blk>
      <Blk t="풀이가 있는 말">
        {found.length
          ? found.map(([t, i]) => (
              <div key={i} className="termrow">
                <TermButton i={i} />
                <span>{t[1]}</span>
              </div>
            ))
          : '풀이가 있는 말을 찾지 못했어요.'}
      </Blk>
      <Note>AI가 문서를 읽고 분석한 결과가 아니에요. 중요한 문서는 전문가나 상담 기관에 확인하세요.</Note>
    </div>
  )
}

/* ===== 자기소개서 ===== */
export function CoverResult({ initial }: { initial: string }) {
  const api = useApi()
  const [txt, setTxt] = useState(initial)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(txt)
      api.toast('복사했어요')
    } catch {
      api.toast('글을 길게 눌러 복사해 주세요')
    }
  }
  return (
    <div className="stack">
      <Note>🧪 내가 쓴 답을 문장으로 이은 예시예요. 아래 글을 직접 고쳐 보세요.</Note>
      <textarea className="editor" value={txt} onChange={(e) => setTxt(e.target.value)} aria-label="자기소개서 편집" />
      <div className="row">
        <button className="btn" onClick={copy}>
          📋 복사하기
        </button>
        <button className="btn o" onClick={() => setTxt(initial)}>
          처음 글로 되돌리기
        </button>
      </div>
    </div>
  )
}

/* ===== 면접 피드백 ===== */
export function IvFeedback({ i, text }: { i: number; text: string }) {
  const r = EL[i].map(([n, re]) => [n, re.test(text)] as const)
  const ok = r.filter((x) => x[1])
  const no = r.filter((x) => !x[1])
  return (
    <div className="stack">
      <Note>🧪 체험용 피드백이에요. 정해 둔 말이 들어 있는지만 확인해요.</Note>
      <Blk t="👍 잘한 점">
        {ok.length ? <List items={ok.map(([n]) => `${n}${jo(n, '이', '가')} 들어 있어요.`)} /> : '답해 본 것 자체가 좋은 시작이에요.'}
      </Blk>
      <Blk t="🌱 보완할 점" warn>
        {no.length ? <List items={no.map(([n]) => `${n}${jo(n, '을', '를')} 넣어 보세요.`)} /> : '필요한 내용이 다 들어 있어요. 경험을 하나 더하면 더 좋아요.'}
      </Blk>
      <Blk t="💬 답변 예시">{IQ[i].ex}</Blk>
      <p className="sm">좋은 답은 여러 가지예요.</p>
    </div>
  )
}

/* ===== 가상 근로계약서 ===== */
export function ContractDoc() {
  const [seen, setSeen] = useStored<number[]>('cv', [])
  const T = (i: number, l: string) => (
    <TermButton i={i} label={l} seen={seen.includes(i)} onSeen={() => !seen.includes(i) && setSeen([...seen, i])} />
  )
  return (
    <div className="stack">
      <div className="step">
        <span>확인한 말 {seen.length}/6</span>
        <div className="bar">
          <div style={{ width: `${(seen.length / 6) * 100}%` }} />
        </div>
      </div>
      <div className="paper contract">
        <b>근로계약서(가상)</b>
        <ol>
          <li>근로기간: 2026.12.01부터 ({T(0, '수습기간')} 3개월)</li>
          <li>근무장소: 서울 ○○ 사무실</li>
          <li>
            {T(1, '소정근로시간')}: 09:00~18:00 ({T(4, '휴게시간')} 12:00~13:00)
          </li>
          <li>근무일 / {T(2, '주휴일')}: 월~금 / 일요일</li>
          <li>임금: 월 2,200,000원 ({T(3, '세전 급여')})</li>
          <li>{T(5, '지급일')}: 매월 25일</li>
        </ol>
      </div>
      {seen.length >= 6 && <Note tone="ok">🎉 학습 완료! 6개 말을 모두 확인했어요.</Note>}
    </div>
  )
}
export const resetContract = () => writeStored('cv', [])

/* ===== 지원 정보 ===== */
export function SupportCard({ i }: { i: number }) {
  const s = SUP[i]
  return (
    <div className="stack">
      <span className="tag">🟡 예시 정보 · 검증 전</span>
      <Blk t="🎁 도움 내용">{s.what}</Blk>
      <Blk t="👤 신청 대상">{s.who}</Blk>
      <Blk t="📝 신청 방법">{s.how}</Blk>
      <Blk t="📎 준비 서류">{s.docs}</Blk>
      <Blk t="🔗 공식 링크">
        {s.url ? (
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            {s.url}
          </a>
        ) : (
          '공식 홈페이지 확인 필요'
        )}
      </Blk>
      <p className="sm">📅 최종 확인일: 확인 전</p>
    </div>
  )
}
export function SupportEasy({ i }: { i: number }) {
  const z = EZ[i]
  return (
    <div className="stack">
      <Note>🧪 예시 정보를 쉽게 풀어 쓴 체험용 설명이에요. 실제 조건은 공식 기관에서 꼭 확인하세요.</Note>
      <Blk t="👤 누가 신청할 수 있나요?">{z[0]}</Blk>
      <Blk t="📝 어떻게 신청하나요?">{z[1]}</Blk>
      <Blk t="📎 무엇을 준비하나요?">{z[2]}</Blk>
      <Blk t="⚠️ 꼭 확인할 것" warn>
        신청 기간과 조건은 바뀔 수 있어요.
      </Blk>
      <Blk t="체크리스트">
        <Checklist k={'s' + i} items={['내가 대상인지 물어봤나요?', '신청 방법을 확인했나요?', '준비 서류를 확인했나요?', '신청 기간을 확인했나요?']} />
      </Blk>
      <QuizCard q={SUP_QZ} />
    </div>
  )
}

/* ===== 취업 정보 ===== */
export function JobsCard() {
  const api = useApi()
  return (
    <div className="stack">
      <Note>예시 공고예요. 실제 공고가 아니에요.</Note>
      {JOBS.map(([t, b], i) => (
        <div className="job" key={t}>
          <span className="tag">🟡 예시 공고</span>
          <b>{t}</b>
          <p>{b}</p>
          <button className="btn" onClick={() => api.run('doc', 'job' + i, { echo: `"${t}" 쉽게 이해하기` })}>
            쉽게 이해하기 →
          </button>
        </div>
      ))}
      <Blk t="🧑‍💼 직무 소개 · 사무보조">서류를 정리하고 문서 작성을 도와요.</Blk>
      <Blk t="📦 직무 소개 · 매장 관리 보조">물건을 진열하고, 남은 물건(재고)을 확인해요.</Blk>
    </div>
  )
}

/* ===== 경험 나눔 ===== */
export function Board() {
  const api = useApi()
  const [posts] = useStored<Post[]>('posts', POS0)
  const [f, setF] = useState('전체')
  const list = posts.map((p, i) => ({ p, i })).filter((x) => f === '전체' || x.p.c === f)
  return (
    <div className="stack">
      <Note>개인의 경험이며 모든 상황에 적용되는 정답은 아니에요.</Note>
      <div className="chips">
        {['전체', ...CATS].map((c) => (
          <button key={c} className={`chip ${f === c ? 'on' : ''}`} onClick={() => setF(c)}>
            {c}
          </button>
        ))}
      </div>
      {list.map(({ p, i }) => (
        <button key={i} className="post" onClick={() => api.sheet(p.t, <PostDetail i={i} />)}>
          <span className="pill">{p.c}</span>
          <b>{p.t}</b>
          <small>
            {p.b.slice(0, 40)}
            {p.b.length > 40 ? '…' : ''}
          </small>
          <small className="meta">
            {p.liked ? '♥' : '♡'} {p.l} · 💬 {p.cm.length}
          </small>
        </button>
      ))}
      <button className="btn" onClick={() => api.sheet('경험 쓰기', <WritePost onDone={() => setF('전체')} />)}>
        ✏️ 내 경험 쓰기
      </button>
    </div>
  )
}
function PostDetail({ i }: { i: number }) {
  const api = useApi()
  const [posts, setPosts] = useStored<Post[]>('posts', POS0)
  const [cm, setCm] = useState('')
  const x = posts[i]
  const upd = (p: Partial<Post>) => setPosts(posts.map((y, j) => (j === i ? { ...y, ...p } : y)))
  return (
    <>
      <span className="pill">{x.c}</span>
      <p className="postbody">{x.b}</p>
      <p className="sm">개인의 경험이며 정답은 아니에요.</p>
      <div className="row">
        <button className={`btn o ${x.liked ? 'liked' : ''}`} onClick={() => upd({ liked: !x.liked, l: x.l + (x.liked ? -1 : 1) })}>
          {x.liked ? '♥' : '♡'} 공감 {x.l}
        </button>
        <button className="btn o" onClick={() => api.toast('신고가 접수되었다고 가정해요')}>
          🚩 신고
        </button>
      </div>
      <h4>댓글 {x.cm.length}</h4>
      {x.cm.map((c, j) => (
        <div className="comment" key={j}>
          {c}
        </div>
      ))}
      <div className="row">
        <input value={cm} onChange={(e) => setCm(e.target.value)} placeholder="따뜻한 댓글을 남겨요" aria-label="댓글" />
        <button
          className="btn slim"
          onClick={() => {
            if (!cm.trim()) return
            upd({ cm: [...x.cm, cm.trim()] })
            setCm('')
          }}
        >
          등록
        </button>
      </div>
    </>
  )
}
function WritePost({ onDone }: { onDone: () => void }) {
  const api = useApi()
  const [posts, setPosts] = useStored<Post[]>('posts', POS0)
  const [c, setC] = useState(CATS[0])
  const [t, setT] = useState('')
  const [b, setB] = useState('')
  return (
    <>
      <Note>🔒 이름, 전화번호, 회사 이름 같은 개인정보는 쓰지 마세요.</Note>
      <div className="chips">
        {CATS.map((x) => (
          <button key={x} className={`chip ${c === x ? 'on' : ''}`} onClick={() => setC(x)}>
            {x}
          </button>
        ))}
      </div>
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder="제목" aria-label="제목" />
      <textarea value={b} onChange={(e) => setB(e.target.value)} placeholder="짧게 써도 괜찮아요" aria-label="내용" />
      <button
        className="btn"
        onClick={() => {
          if (!t.trim() || !b.trim()) return api.toast('제목과 내용을 적어 주세요')
          setPosts([{ c, t: t.trim(), b: b.trim(), l: 0, cm: [], liked: false }, ...posts])
          onDone()
          api.closeSheet()
          api.toast('올렸어요')
        }}
      >
        올리기
      </button>
    </>
  )
}
