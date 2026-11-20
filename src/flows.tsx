import type { Ctx, Flow, Reply } from './chat'
import { CLQ, DOCS, EXS, IQ, SC, SUP, TERMS, detect, genCover, jo, type FlowId } from './data'
import {
  Board, ContractDoc, CoverResult, CustomDoc, DocResult, IvFeedback, JobsPage, Note, QuizCard,
  Step, SupportCard, SupportEasy, WorryResult, resetContract,
} from './widgets'

const HOME: Reply = { label: '🏠 메뉴로', value: 'home' }
const FLOWS = new Set<string>(['home', 'worry', 'docs', 'cover', 'interview', 'contract', 'support', 'jobs', 'board'])

/** 마지막 선택지: 값이 flow id면 그 흐름으로 이동, 아니면 값을 돌려줌 */
async function next(c: Ctx, replies: Reply[], input?: { placeholder: string }) {
  const a = await c.ask({ replies, input })
  if (a.kind === 'text') {
    c.run('worry', a.text)
    return null
  }
  const [id, arg] = a.value.split(':')
  if (FLOWS.has(id) || id === 'doc' || id === 'supportDetail') {
    c.run(id as FlowId, arg === undefined ? undefined : id === 'supportDetail' ? Number(arg) : arg)
    return null
  }
  return a.value
}

function pickTextFile(): Promise<string | null> {
  return new Promise((res) => {
    const el = document.createElement('input')
    el.type = 'file'
    el.accept = '.txt,text/plain'
    el.onchange = () => {
      const f = el.files?.[0]
      if (!f) return res(null)
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = () => res(null)
      r.readAsText(f)
    }
    el.click()
  })
}

export const flows: Record<FlowId, Flow> = {
  async home(c) {
    c.api.home()
  },

  async worry(c, arg) {
    let text = typeof arg === 'string' ? arg : ''
    if (!text) {
      await c.say('어떤 고민이 있나요? 짧게 써도 괜찮아요. 예시를 눌러도 돼요.')
      const a = await c.ask({ replies: EXS.map((x) => ({ label: x, value: x })), input: { placeholder: '여기에 입력해요' } })
      text = a.kind === 'text' ? a.text : a.value
    }
    let k = detect(text)
    if (!k) {
      await c.say('어떤 고민에 가까운지 골라 줄래요?')
      const a = await c.ask({ replies: Object.entries(SC).map(([key, s]) => ({ label: s.n, value: key })) })
      if (a.kind !== 'reply') return
      k = a.value
    }
    const sc = SC[k]
    await c.say(
      <>
        <b>‘{sc.n}’</b> 고민이군요. 질문 {sc.qs.length}개로 함께 정리해 볼게요.
        <br />
        보기를 고르거나 직접 적어도 돼요.
      </>,
    )
    const ans: { t: string; i: number; c: string; a: string }[] = []
    for (let i = 0; i < sc.qs.length; i++) {
      const q = sc.qs[i]
      await c.say(
        <>
          <Step i={i + 1} n={sc.qs.length} />
          {q.q}
        </>,
      )
      const a = await c.ask({ replies: q.o.map((o, j) => ({ label: o.t, value: String(j) })), input: { placeholder: '직접 입력할게요' } })
      if (a.kind === 'reply') {
        const o = q.o[Number(a.value)]
        ans.push({ t: o.t, i: Number(a.value), c: o.c, a: o.a })
      } else ans.push({ t: a.text, i: -1, c: '내가 적은 어려움이 정확히 무엇인지', a: '적은 내용을 한 문장으로 정리해요.' })
    }
    await c.say('정리했어요 ✨', { delay: 700 })
    await c.say(<WorryResult text={text} sc={sc} k={k} ans={ans} />, { wide: true })
    const v = await next(c, [
      ...sc.go.map(([l, id], i) => ({ label: l + ' →', value: id, primary: i === 0 })),
      { label: '✏️ 답변 다시 하기', value: 'redo' },
      { label: '💬 다른 고민 이야기하기', value: 'worry' },
      HOME,
    ])
    if (v === 'redo') c.run('worry', text)
  },

  async docs(c) {
    await c.say('어떤 문서를 쉽게 읽어 볼까요?')
    const v = await next(c, [
      { label: '📄 예시 근로계약서', value: 'doc:contract' },
      { label: '📢 예시 채용 공고', value: 'doc:job0' },
      { label: '✍️ 내용 직접 붙여넣기', value: 'paste' },
      { label: '📁 txt 파일 올리기', value: 'file' },
      { label: '📷 사진 올리기', value: 'photo' },
      HOME,
    ])
    if (v === 'photo') {
      await c.say('사진 속 글자 읽기는 아직 연결되지 않았어요. 예시 문서나 직접 붙여넣기로 체험해 주세요 🙏')
      return c.run('docs')
    }
    let text: string | null = null
    if (v === 'paste') {
      await c.say(
        <>
          문서 내용을 아래 입력칸에 붙여 넣어 주세요.
          <br />
          <span className="sm">🔒 올린 내용은 서버로 보내거나 저장하지 않아요.</span>
        </>,
      )
      const a = await c.ask({ input: { placeholder: '문서 내용을 붙여 넣어요', multiline: true } })
      if (a.kind === 'text') text = a.text
    } else if (v === 'file') {
      text = await pickTextFile()
      if (text === null) {
        await c.say('파일을 읽지 못했어요. 다시 골라 주세요.')
        return c.run('docs')
      }
    }
    if (text !== null) c.run('docCustom', text)
  },

  async doc(c, arg) {
    const k = String(arg)
    const d = DOCS[k]
    await c.say(
      <>
        <b>{d.n}</b>
        {jo(d.n.replace(/\(.*\)$/, ''), '을', '를')} 쉽게 풀어 볼게요.
      </>,
    )
    await c.say(<DocResult k={k} />, { wide: true, delay: 700 })
    for (;;) {
      const v = await next(c, [
        { label: '🔁 다시 설명해 줘', value: 'again' },
        { label: '💡 예시로 알려줘', value: 'example' },
        { label: d.prac[0] + ' →', value: d.prac[1], primary: true },
        { label: '📄 다른 문서 보기', value: 'docs' },
        HOME,
      ])
      if (v === 'again') await c.say(<>{d.what} 천천히 한 가지씩 읽어요. 모르는 말은 눌러서 확인해요.</>)
      else if (v === 'example') {
        const t = d.terms[0]
        await c.say(
          <>
            <b>{TERMS[t][0]}</b>
            <br />
            {TERMS[t][2]}
          </>,
        )
      } else return
    }
  },

  async docCustom(c, arg) {
    await c.say('넣어 준 글을 살펴봤어요. 체험용이라 할 수 있는 일이 정해져 있어요.', { delay: 700 })
    await c.say(<CustomDoc text={String(arg ?? '')} />, { wide: true })
    await next(c, [{ label: '예시 근로계약서로 체험하기 →', value: 'doc:contract', primary: true }, { label: '📄 다른 문서 보기', value: 'docs' }, HOME])
  },

  async cover(c) {
    await c.say(
      <>
        자기소개서는 나를 소개하는 글이에요.
        <br />① 지원하는 일 ② 경험 ③ 잘하는 점 ④ 지원 이유를 차례로 물어볼게요.
      </>,
    )
    const ans: string[] = []
    for (let i = 0; i < CLQ.length; i++) {
      const [q, ph, help] = CLQ[i]
      await c.say(
        <>
          <Step i={i + 1} n={CLQ.length} />
          {q}
        </>,
      )
      for (;;) {
        const a = await c.ask({ replies: [{ label: '💡 도움말', value: 'help' }], input: { placeholder: ph } })
        if (a.kind === 'text') {
          ans.push(a.text)
          break
        }
        await c.say(<>💡 {help}</>, { delay: 250 })
      }
    }
    await c.say('글을 만들었어요 ✨ 내 말투로 고쳐 보세요. 그대로 내지 않아도 괜찮아요.', { delay: 700 })
    await c.say(<CoverResult initial={genCover(ans)} />, { wide: true })
    await next(c, [{ label: '🎤 면접 연습하러 가기 →', value: 'interview', primary: true }, { label: '✍️ 처음부터 다시 쓰기', value: 'cover' }, HOME])
  },

  async interview(c) {
    await c.say(
      <>
        면접은 회사 사람과 짧게 대화하는 시간이에요 🎤
        <br />
        정답은 하나가 아니에요. 천천히, 내 말로 답하면 돼요.
      </>,
    )
    for (let i = 0; i < IQ.length; i++) {
      const q = IQ[i]
      let retry = true
      while (retry) {
        await c.say(
          <>
            <Step i={i + 1} n={IQ.length} />
            {q.q}
          </>,
        )
        let text = ''
        for (;;) {
          const a = await c.ask({
            replies: [...q.o.map((o, j) => ({ label: o, value: String(j) })), { label: '💡 도움말', value: 'help' }],
            input: { placeholder: '직접 답해 볼래요' },
          })
          if (a.kind === 'reply' && a.value === 'help') {
            await c.say(<>💡 {q.h}</>, { delay: 250 })
            continue
          }
          text = a.kind === 'text' ? a.text : q.o[Number(a.value)]
          break
        }
        await c.say(<IvFeedback i={i} text={text} />, { wide: true, delay: 700 })
        const a = await c.ask({
          replies: [
            { label: i < IQ.length - 1 ? '다음 질문 →' : '마치기 →', value: 'next', primary: true },
            { label: '🔁 다시 답해 보기', value: 'retry' },
          ],
        })
        retry = a.kind === 'reply' && a.value === 'retry'
      }
    }
    await c.say(<>수고했어요 👏 {IQ.length}개 질문에 모두 답했어요. 다시 해 보면 더 편해져요.</>)
    await next(c, [{ label: '🔁 다시 연습하기', value: 'interview' }, { label: '✍️ 자기소개서 쓰기', value: 'cover' }, { label: '🏛️ 지원 정보 보기', value: 'support' }, HOME])
  },

  async contract(c) {
    await c.say(
      <>
        가상 근로계약서를 같이 읽어 봐요 📑
        <br />
        <b>밑줄 친 말</b>을 눌러 뜻을 확인하고, 6개를 모두 확인해 보세요.
      </>,
    )
    await c.say(<ContractDoc />, { wide: true })
    await c.say(
      <div className="stack">
        <QuizCard q={{ q: '급여는 언제 받나요?', o: ['매월 25일', '매주 금요일', '계약 마지막 날'], a: 0, e: '지급일이 매월 25일이라고 적혀 있어요.' }} />
        <QuizCard q={{ q: '휴게시간은 언제인가요?', o: ['09:00~10:00', '12:00~13:00', '18:00 이후'], a: 1, e: '12:00~13:00가 휴게시간이에요.' }} />
      </div>,
      { wide: true },
    )
    const v = await next(c, [{ label: '📄 예시 근로계약서 풀이 보기', value: 'doc:contract' }, { label: '🔁 처음부터 다시', value: 'reset' }, HOME])
    if (v === 'reset') {
      resetContract()
      c.run('contract')
    }
  },

  async support(c) {
    await c.say(
      <>
        어떤 지원 정보가 궁금해요?
        <Note>🟡 아래는 모두 예시 정보예요. 실제 신청 전에 공식 기관에서 꼭 확인하세요.</Note>
      </>,
    )
    await next(c, [...SUP.map((s, i) => ({ label: `${s.i} ${s.n}`, value: 'supportDetail:' + i })), HOME])
  },

  async supportDetail(c, arg) {
    const i = Number(arg)
    await c.say(<b>{SUP[i].n}</b>)
    await c.say(<SupportCard i={i} />, { wide: true })
    const v = await next(c, [{ label: '쉽게 이해하기 →', value: 'easy', primary: true }, { label: '🏛️ 다른 지원 정보', value: 'support' }, HOME])
    if (v !== 'easy') return
    await c.say('쉬운 말로 다시 풀어 볼게요.')
    await c.say(<SupportEasy i={i} />, { wide: true })
    await next(c, [{ label: '🏛️ 다른 지원 정보', value: 'support' }, HOME])
  },

  async jobs(c) {
    c.api.page(<JobsPage />)
    await c.say('취업 정보 화면을 열었어요 📢 공고를 둘러보고 돌아오면 이어서 도와줄게요.')
    for (;;) {
      const v = await next(c, [{ label: '📢 취업 정보 다시 열기', value: 'reopen', primary: true }, { label: '🎤 면접 연습하기', value: 'interview' }, { label: '💬 고민 정리하기', value: 'worry' }, HOME])
      if (v !== 'reopen') return
      c.api.page(<JobsPage />)
    }
  },

  async board(c) {
    await c.say('다른 사람들의 경험을 읽고 나눠 봐요 🗣️ 글을 누르면 공감하고 댓글을 달 수 있어요.')
    await c.say(<Board />, { wide: true })
    await next(c, [{ label: '💬 고민 정리하기', value: 'worry' }, HOME])
  },
}
