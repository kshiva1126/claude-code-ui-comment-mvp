import { CommentOverlay } from './CommentOverlay'

export default function App() {
  return (
    <main style={{ padding: 48 }}>
      <h1 data-ai-target="hero-title">Build something great.</h1>
      <p data-ai-target="hero-description">
        ブラウザのコメントからClaude Codeが変更します。
      </p>
      <button data-ai-target="primary-button">Get Started</button>
      <CommentOverlay />
    </main>
  )
}
