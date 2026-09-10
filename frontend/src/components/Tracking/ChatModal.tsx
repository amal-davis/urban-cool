import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../Modal/Modal'
import { SendIcon } from '../icons/Icons'
import { createSeedChatMessages } from '../../data/tracking'
import type { ChatMessage } from '../../data/tracking'

interface ChatModalProps {
  open: boolean
  onClose: () => void
  technicianName: string
}

/**
 * Frontend-only chat — reuses the project's existing Modal (no second
 * dialog implementation) rather than a bespoke overlay. Messages live in
 * local `useState`, seeded fresh each time the modal opens (see
 * data/tracking.ts's createSeedChatMessages) — no backend/WebSocket exists
 * yet.
 *
 * Future real-time wiring: replace `setMessages((prev) => [...prev, sent])`
 * in handleSend with an emit to a real chat channel, and add a subscription
 * effect (scoped to `open`, cleaned up on close/unmount) that appends
 * incoming messages the same way — the message list/input/send UI below
 * needs no change either way, it only ever renders whatever `messages`
 * currently holds.
 */
export function ChatModal({ open, onClose, technicianName }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => createSeedChatMessages())
  const [draft, setDraft] = useState('')

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return

    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        sender: 'customer',
        text,
        time: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
      },
    ])
    setDraft('')
  }

  return (
    <Modal open={open} onClose={onClose} title={technicianName}>
      <div className="chat-modal">
        <ul className="chat-modal__messages">
          {messages.map((message) => (
            <li key={message.id} className={`chat-modal__message chat-modal__message--${message.sender}`}>
              <span className="chat-modal__sender">{message.sender === 'technician' ? technicianName : 'You'}</span>
              <p className="chat-modal__text">{message.text}</p>
              <span className="chat-modal__time">{message.time}</span>
            </li>
          ))}
        </ul>

        <form className="chat-modal__composer" onSubmit={handleSend}>
          <label htmlFor="chat-message-input" className="visually-hidden">
            Type a message
          </label>
          <input
            id="chat-message-input"
            type="text"
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="chat-modal__send icon-button" aria-label="Send message" disabled={!draft.trim()}>
            <SendIcon />
          </button>
        </form>
      </div>
    </Modal>
  )
}
