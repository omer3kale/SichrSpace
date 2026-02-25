'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { QuerySnapshot, DocumentData } from 'firebase/firestore'
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebaseClient'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/useAuth'

/* ── Types ── */
interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  createdAt: Timestamp | null
}

interface Conversation {
  id: string
  name: string
  lastMessage: string
}

/* ── Seed conversations for the sidebar ── */
const seedConversations: Conversation[] = [
  { id: 'demo-conversation', name: 'Max Mustermann', lastMessage: '' },
  { id: 'support-conversation', name: 'SichrPlace Support', lastMessage: '' },
]

export default function ChatPage() {
  const { user } = useAuth()
  const currentUserId = user ? String(user.id) : 'anonymous'
  const currentUserName = user ? `${user.firstName} ${user.lastName}` : 'Anonymous'

  const [conversations] = useState<Conversation[]>(seedConversations)
  const [activeConversationId, setActiveConversationId] = useState<string | null>('demo-conversation')
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  /* ── Subscribe to messages for the active conversation ── */
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const messagesRef = collection(db, 'conversations', activeConversationId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const incoming: Message[] = snapshot.docs.map((d: DocumentData) => ({
          id: d.id as string,
          senderId: (d.data().senderId as string) ?? '',
          senderName: (d.data().senderName as string) ?? '',
          content: (d.data().content as string) ?? '',
          createdAt: (d.data().createdAt as Timestamp | null) ?? null,
        }))
        setMessages(incoming)
        setLoading(false)
      },
      (err: Error) => {
        console.error('Firestore subscription error:', err)
        setError('Could not load messages. Please try again later.')
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [activeConversationId])

  /* ── Auto-scroll to bottom when messages change ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── Send a message ── */
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !activeConversationId) return

    const text = newMessage.trim()
    setNewMessage('')
    setError(null)

    try {
      const conversationRef = doc(db, 'conversations', activeConversationId)

      // Ensure conversation document exists / update metadata
      await setDoc(
        conversationRef,
        {
          participants: [currentUserId],
          lastMessage: text,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      // Add the message to the subcollection
      await addDoc(collection(conversationRef, 'messages'), {
        senderId: currentUserId,
        senderName: currentUserName,
        content: text,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Send error:', err)
      setError('Could not send message. Please try again.')
    }
  }

  /* ── Format timestamp ── */
  function formatTime(ts: Timestamp | null): string {
    if (!ts) return ''
    const d = ts.toDate()
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  /* ── Active conversation name ── */
  const activeName =
    conversations.find((c) => c.id === activeConversationId)?.name ?? 'Chat'

  return (
    <ProtectedRoute>
    <div className="chat-layout-wrapper">
      {/* ======= Header ======= */}
      <SiteHeader />

      <main className="chat-page">
        <div className="chat-layout">

          {/* ── Sidebar ── */}
          <aside className="chat-sidebar">
            <h2 className="chat-sidebar-title">
              <i className="fa-solid fa-comments" /> Conversations
            </h2>
            <div className="chat-conversation-list">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  className={
                    'chat-conversation-item' +
                    (conv.id === activeConversationId ? ' chat-conversation-item-active' : '')
                  }
                  onClick={() => setActiveConversationId(conv.id)}
                >
                  <span className="chat-conversation-name">{conv.name}</span>
                  {conv.lastMessage && (
                    <span className="chat-conversation-last">{conv.lastMessage}</span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* ── Main Panel ── */}
          <section className="chat-main">
            {/* Active conversation header */}
            <div className="chat-main-header">
              <h2 className="chat-main-title">{activeName}</h2>
              <p className="chat-main-subtitle">
                {activeConversationId ? 'Live chat powered by Firebase' : 'Select a conversation'}
              </p>
            </div>

            {/* Messages area */}
            <div className="chat-messages">
              {loading && (
                <p className="chat-status">Loading messages...</p>
              )}

              {!loading && messages.length === 0 && (
                <p className="chat-status">
                  No messages yet. Say hello to start the conversation.
                </p>
              )}

              {messages.map((msg) => {
                const isOwn = msg.senderId === currentUserId
                return (
                  <div
                    key={msg.id}
                    className={
                      'chat-message-row ' +
                      (isOwn ? 'chat-message-row-own' : 'chat-message-row-other')
                    }
                  >
                    <div
                      className={
                        'chat-message-bubble ' +
                        (isOwn ? 'chat-message-bubble-own' : '')
                      }
                    >
                      <div className="chat-message-content">{msg.content}</div>
                      <div className="chat-message-meta">
                        <span className="chat-message-sender">{msg.senderName}</span>
                        <span className="chat-message-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Error banner */}
            {error && <p className="chat-error">{error}</p>}

            {/* Input form */}
            <form className="chat-input" onSubmit={handleSend}>
              <input
                type="text"
                className="chat-input-field"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={!activeConversationId}
              />
              <button
                type="submit"
                className="chat-input-button"
                disabled={!activeConversationId || !newMessage.trim()}
                aria-label="Send message"
              >
                <i className="fa-solid fa-paper-plane" />
              </button>
            </form>
          </section>

        </div>
      </main>

      {/* ======= Footer ======= */}
      <footer className="chat-footer">
        <LogoLink size={36} />
        <p className="chat-footer-copy">
          &copy; {new Date().getFullYear()} SichrPlace. All rights reserved.
        </p>
        <nav className="chat-footer-nav">
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/about">About</Link>
          <Link href="/">Home</Link>
        </nav>
      </footer>
    </div>
    </ProtectedRoute>
  )
}
