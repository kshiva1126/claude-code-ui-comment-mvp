import { useEffect, useState } from 'react'

type Target = { targetId: string; pagePath: string }
type Proposal = { id: string; title: string; description: string; diff?: string }
type CommentRecord = {
  commentId: string
  pagePath: string
  targetId: string
  comment: string
  status: 'waiting' | 'proposed' | 'applying' | 'completed' | 'error'
  proposals: Proposal[]
  approvedProposalId?: string
  message?: string
}

const statusLabels: Record<CommentRecord['status'], string> = {
  waiting: '解析中…',
  proposed: '提案あり（選んでください）',
  applying: '編集中…',
  completed: '完了',
  error: 'エラー',
}

export function CommentOverlay() {
  const [picking, setPicking] = useState(false)
  const [target, setTarget] = useState<Target | null>(null)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('')
  const [records, setRecords] = useState<CommentRecord[]>([])

  useEffect(() => {
    const events = new EventSource('/api/events')
    events.onmessage = (event) => {
      const record = JSON.parse(event.data) as CommentRecord
      setRecords((current) => [
        record,
        ...current.filter((r) => r.commentId !== record.commentId),
      ])
    }
    return () => events.close()
  }, [])

  useEffect(() => {
    if (!picking) return
    document.body.classList.add('ui-comment-picking')

    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return
      const element = event.target.closest('[data-ai-target]')
      if (!element) return

      event.preventDefault()
      event.stopPropagation()
      const targetId = element.getAttribute('data-ai-target')
      if (!targetId) return
      setTarget({ targetId, pagePath: window.location.pathname })
      setPicking(false)
      setStatus('')
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.body.classList.remove('ui-comment-picking')
      document.removeEventListener('click', onClick, true)
    }
  }, [picking])

  async function post(path: string, body: unknown) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  }

  async function sendComment() {
    if (!target || !comment.trim()) return
    setStatus('送信中…')
    try {
      await post('/api/comments', {
        type: 'ui.comment.created',
        pagePath: target.pagePath,
        targetId: target.targetId,
        comment: comment.trim(),
      })
      setStatus('')
      setComment('')
      setTarget(null)
    } catch (error) {
      setStatus(`送信失敗: ${String(error)}`)
    }
  }

  async function approve(record: CommentRecord, proposal: Proposal) {
    try {
      await post('/api/approvals', {
        type: 'ui.proposal.approved',
        commentId: record.commentId,
        proposalId: proposal.id,
      })
    } catch (error) {
      setStatus(`承認の送信失敗: ${String(error)}`)
    }
  }

  return (
    <aside className="ui-comment-panel">
      <strong>UI Comment</strong>
      <div>
        <button onClick={() => setPicking((value) => !value)}>
          {picking ? '選択を中止' : '画面から要素を選択'}
        </button>
      </div>
      <div>対象: {target?.targetId ?? '未選択'}</div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="例: 見出しの文字をもっと大きくして"
        rows={3}
        maxLength={1000}
      />
      <button disabled={!target || !comment.trim()} onClick={sendComment}>
        Claude Codeへ送信
      </button>
      <small role="status">{status}</small>

      {records.length > 0 && (
        <ol className="ui-comment-threads">
          {records.map((record) => (
            <li key={record.commentId} className="ui-comment-thread">
              <div>
                <code>{record.targetId}</code>: {record.comment}
              </div>
              <small>{statusLabels[record.status]}</small>
              {record.message && <small>{record.message}</small>}
              {record.proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="ui-comment-proposal"
                  data-approved={record.approvedProposalId === proposal.id}
                >
                  <strong>{proposal.title}</strong>
                  <p>{proposal.description}</p>
                  {proposal.diff && <pre>{proposal.diff}</pre>}
                  {record.status === 'proposed' && (
                    <button onClick={() => approve(record, proposal)}>
                      この案で編集
                    </button>
                  )}
                </div>
              ))}
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}
