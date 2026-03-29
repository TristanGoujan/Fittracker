import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { animate } from 'animejs'
import { useAuth } from '../hooks/useAuth'
import { getFriends, getFriendRequests, getPendingOut, searchUsers, sendRequest, acceptRequest, declineRequest, blockUser, removeFriend } from '../api/friends'
import { getFeed } from '../api/feed'
import { react as reactToSession, getComments, addComment, deleteComment, getLeaderboard, getPRLeaderboard } from '../api/social'

const EMOJIS = ['💪', '🔥', '👊', '🎯', '⚡']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatVolume(vol) {
  if (!vol) return '0 kg'
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}t`
  return `${Math.round(vol)} kg`
}

function formatDuration(min) {
  if (!min) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function Avatar({ username, avatarUrl, size = 36 }) {
  const initials = (username || '?').slice(0, 2).toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.35,
        color: 'white',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {avatarUrl ? <img src={avatarUrl} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  )
}

// ─── EmojiBurst ───────────────────────────────────────────────────────────────

// Trajectoires des particules : centre + 4 éclats latéraux
const BURST_PARTICLES = [
  { x:   0, y: -80, r:  -8, s: 2.2, delay:  0 },
  { x: -42, y: -58, r: -28, s: 1.6, delay: 30 },
  { x:  42, y: -58, r:  25, s: 1.6, delay: 30 },
  { x: -24, y: -90, r:  12, s: 1.4, delay: 55 },
  { x:  24, y: -90, r: -14, s: 1.4, delay: 55 },
]

function EmojiBurst({ emoji, onDone }) {
  const containerRef = useRef(null)
  useEffect(() => {
    if (!containerRef.current) return
    let done = 0
    let settled = false
    const total = BURST_PARTICLES.length
    Array.from(containerRef.current.children).forEach((el, i) => {
      const p = BURST_PARTICLES[i]
      animate(el, {
        translateX: [0, p.x],
        translateY: [0, p.y],
        rotate:     [0, p.r],
        scale:      [0.4, p.s],
        opacity:    [1, 0],
        duration:   820,
        delay:      p.delay,
        easing:     'easeOutCubic',
        onComplete: () => { done++; if (done === total && !settled) { settled = true; onDone() } },
      })
    })
    return () => { settled = true }
  }, [])
  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', bottom: 6, left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none', zIndex: 20,
      }}
    >
      {BURST_PARTICLES.map((_, i) => (
        <span key={i} style={{ position: 'absolute', fontSize: 20, lineHeight: 1, whiteSpace: 'nowrap' }}>
          {emoji}
        </span>
      ))}
    </div>
  )
}

// ─── FeedCard ─────────────────────────────────────────────────────────────────

function FeedCard({ session, token, currentUserId }) {
  const [reactions, setReactions] = useState(session.reactions || [])
  const [myReaction, setMyReaction] = useState(session.my_reaction || null)
  const [commentCount, setCommentCount] = useState(session.comment_count || 0)
  const [bursts, setBursts] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  async function handleReact(emoji) {
    try {
      const res = await reactToSession(token, session.id, emoji)
      if (res.action !== 'removed') {
        setBursts(b => [...b, { id: Date.now() + Math.random(), emoji }])
      }
      // Recompute reactions
      if (res.action === 'removed') {
        setMyReaction(null)
        setReactions(prev => {
          const updated = prev.map(r => r.emoji === emoji ? { ...r, count: r.count - 1 } : r)
          return updated.filter(r => r.count > 0)
        })
      } else if (res.action === 'replaced') {
        const prevEmoji = myReaction
        setMyReaction(emoji)
        setReactions(prev => {
          let updated = prev.map(r => {
            if (r.emoji === prevEmoji) return { ...r, count: r.count - 1 }
            if (r.emoji === emoji) return { ...r, count: r.count + 1 }
            return r
          }).filter(r => r.count > 0)
          if (!updated.find(r => r.emoji === emoji)) {
            updated = [...updated, { emoji, count: 1 }]
          }
          return updated
        })
      } else {
        setMyReaction(emoji)
        setReactions(prev => {
          const existing = prev.find(r => r.emoji === emoji)
          if (existing) return prev.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r)
          return [...prev, { emoji, count: 1 }]
        })
      }
    } catch (err) {
      console.error('Erreur réaction:', err)
    }
  }

  async function loadComments() {
    if (loadingComments) return
    setLoadingComments(true)
    try {
      const data = await getComments(token, session.id)
      setComments(data)
    } catch (err) {
      console.error('Erreur chargement commentaires:', err)
    } finally {
      setLoadingComments(false)
    }
  }

  function toggleComments() {
    if (!showComments && comments.length === 0) loadComments()
    setShowComments(v => !v)
  }

  async function handleSubmitComment(e) {
    e.preventDefault()
    if (!commentText.trim() || submittingComment) return
    setSubmittingComment(true)
    try {
      const newComment = await addComment(token, session.id, commentText.trim())
      setComments(prev => [...prev, newComment])
      setCommentCount(c => c + 1)
      setCommentText('')
    } catch (err) {
      console.error('Erreur commentaire:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await deleteComment(token, commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      setCommentCount(c => c - 1)
    } catch (err) {
      console.error('Erreur suppression commentaire:', err)
    }
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(var(--ac),0.08)',
        borderRadius: 16,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar username={session.username} avatarUrl={session.avatar_url} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>{session.username}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {formatDate(session.session_date)}
          </div>
        </div>
        <Link
          to={`/profile/${session.user_id}`}
          style={{
            fontSize: 12,
            color: 'rgb(var(--ac-l))',
            textDecoration: 'none',
            padding: '4px 10px',
            borderRadius: 8,
            border: '1px solid rgba(var(--ac),0.2)',
          }}
        >
          Voir profil
        </Link>
      </div>

      {/* Session info */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'white', marginBottom: 8 }}>
          {session.name || 'Séance'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 12, fontWeight: 600,
            background: 'rgba(var(--ac),0.1)',
            color: 'rgb(var(--ac-l))',
            padding: '3px 10px', borderRadius: 20,
            border: '1px solid rgba(var(--ac),0.15)',
          }}>
            {formatVolume(session.volume)}
          </span>
          {session.duration_min && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.6)',
              padding: '3px 10px', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {formatDuration(session.duration_min)}
            </span>
          )}
          <span style={{
            fontSize: 12, fontWeight: 600,
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.6)',
            padding: '3px 10px', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {session.exercise_count} exercice{session.exercise_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Top exercises */}
      {session.top_exercises && session.top_exercises.length > 0 && (
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          {session.top_exercises.join(' · ')}
        </div>
      )}

      {/* Reactions */}
      <div style={{ position: 'relative' }}>
        {bursts.map(b => (
          <EmojiBurst key={b.id} emoji={b.emoji} onDone={() => setBursts(p => p.filter(x => x.id !== b.id))} />
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {EMOJIS.map(emoji => {
            const reactionData = reactions.find(r => r.emoji === emoji)
            const count = reactionData ? reactionData.count : 0
            const isActive = myReaction === emoji
            return (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: `1px solid ${isActive ? 'rgba(var(--ac),0.4)' : 'rgba(255,255,255,0.08)'}`,
                  background: isActive ? 'rgba(var(--ac),0.12)' : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: isActive ? 'rgb(var(--ac-l))' : 'rgba(255,255,255,0.5)',
                  fontWeight: count > 0 ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                <span>{emoji}</span>
                {count > 0 && <span style={{ fontSize: 12 }}>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Comments toggle */}
      <button
        onClick={toggleComments}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 13,
          textAlign: 'left',
          padding: 0,
        }}
      >
        💬 {commentCount} commentaire{commentCount !== 1 ? 's' : ''} {showComments ? '▲' : '▼'}
      </button>

      {/* Comments section */}
      {showComments && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loadingComments ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Chargement...</div>
          ) : (
            <>
              {comments.map(comment => (
                <div key={comment.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Avatar username={comment.username} avatarUrl={comment.avatar_url} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'white' }}>{comment.username}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                        {new Date(comment.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{comment.content}</div>
                  </div>
                  {comment.user_id === currentUserId && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.2)', fontSize: 12, padding: '2px 4px',
                      }}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
          <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              maxLength={300}
              placeholder="Ajouter un commentaire..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(var(--ac),0.12)',
                borderRadius: 10,
                padding: '8px 12px',
                color: 'white',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              style={{
                background: 'rgba(var(--ac),0.15)',
                border: '1px solid rgba(var(--ac),0.25)',
                borderRadius: 10,
                padding: '8px 14px',
                color: 'rgb(var(--ac-l))',
                fontSize: 13,
                fontWeight: 600,
                cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                opacity: commentText.trim() ? 1 : 0.5,
              }}
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// ─── FeedTab ──────────────────────────────────────────────────────────────────

function FeedTab({ token, userId }) {
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const feedRef    = useRef(null)
  const animatedRef = useRef(false)

  useEffect(() => {
    setLoading(true)
    getFeed(token)
      .then(setFeed)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (feed.length === 0 || !feedRef.current || animatedRef.current) return
    animatedRef.current = true
    const cards = Array.from(feedRef.current.children)
    cards.forEach(c => { c.style.opacity = '0' })
    requestAnimationFrame(() => {
      cards.forEach((el, i) => {
        animate(el, { opacity: [0, 1], translateY: [22, 0], delay: i * 65, duration: 440, easing: 'easeOutQuad' })
      })
    })
  }, [feed.length])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
      Chargement du fil d'actualité...
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#f87171' }}>{error}</div>
  )

  if (feed.length === 0) return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 24px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(var(--ac),0.06)',
        borderRadius: 16,
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 16 }}>🏋️</div>
      <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
        Aucune activité récente parmi tes amis.<br />
        Ajoute des amis pour voir leur activité.
      </div>
    </div>
  )

  return (
    <div ref={feedRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {feed.map(session => (
        <FeedCard key={session.id} session={session} token={token} currentUserId={userId} />
      ))}
    </div>
  )
}

// ─── AmisTab ──────────────────────────────────────────────────────────────────

function AmisTab({ token }) {
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [pendingOut, setPendingOut] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [openKebab, setOpenKebab] = useState(null)
  const debounceRef = useRef(null)

  const loadAll = useCallback(async () => {
    try {
      const [f, r, p] = await Promise.all([getFriends(token), getFriendRequests(token), getPendingOut(token)])
      setFriends(f)
      setRequests(r)
      setPendingOut(p)
    } catch (err) {
      console.error('Erreur chargement amis:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadAll() }, [loadAll])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) { setSearchResults([]); setSearching(false); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchUsers(token, searchQuery.trim())
        setSearchResults(results)
      } catch (err) {
        console.error('Erreur recherche:', err)
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery, token])

  async function handleSendRequest(userId) {
    try {
      await sendRequest(token, userId)
      await loadAll()
      // Update search results
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, friendship_status: 'pending' } : u))
    } catch (err) {
      console.error('Erreur envoi demande:', err)
    }
  }

  async function handleAccept(friendshipId) {
    try {
      await acceptRequest(token, friendshipId)
      await loadAll()
    } catch (err) {
      console.error('Erreur acceptation:', err)
    }
  }

  async function handleDecline(friendshipId) {
    try {
      await declineRequest(token, friendshipId)
      await loadAll()
    } catch (err) {
      console.error('Erreur refus:', err)
    }
  }

  async function handleRemoveFriend(friendshipId) {
    try {
      await removeFriend(token, friendshipId)
      setFriends(prev => prev.filter(f => f.friendship_id !== friendshipId))
      setOpenKebab(null)
    } catch (err) {
      console.error('Erreur suppression ami:', err)
    }
  }

  async function handleBlock(userId) {
    try {
      await blockUser(token, userId)
      setFriends(prev => prev.filter(f => f.id !== userId))
      setOpenKebab(null)
    } catch (err) {
      console.error('Erreur blocage:', err)
    }
  }

  const pendingOutIds = new Set(pendingOut.map(p => p.receiver_id))
  const friendIds = new Set(friends.map(f => f.id))

  function getActionButton(user) {
    const status = user.friendship_status
    if (status === 'accepted' || friendIds.has(user.id)) {
      return (
        <span style={{
          fontSize: 12, padding: '4px 12px', borderRadius: 20,
          background: 'rgba(16,185,129,0.1)', color: 'rgb(16,185,129)',
          border: '1px solid rgba(16,185,129,0.2)',
        }}>Ami</span>
      )
    }
    if (status === 'blocked') {
      return (
        <span style={{
          fontSize: 12, padding: '4px 12px', borderRadius: 20,
          background: 'rgba(239,68,68,0.1)', color: '#f87171',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>Bloqué</span>
      )
    }
    if (status === 'pending' || pendingOutIds.has(user.id)) {
      return (
        <span style={{
          fontSize: 12, padding: '4px 12px', borderRadius: 20,
          background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>Demande envoyée</span>
      )
    }
    return (
      <button
        onClick={() => handleSendRequest(user.id)}
        style={{
          fontSize: 12, padding: '4px 12px', borderRadius: 20,
          background: 'rgba(var(--ac),0.1)', color: 'rgb(var(--ac-l))',
          border: '1px solid rgba(var(--ac),0.2)', cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Ajouter
      </button>
    )
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Search bar */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher un utilisateur..."
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(var(--ac),0.12)',
            borderRadius: 12,
            padding: '10px 16px',
            color: 'white',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Search results */}
      {searchQuery.trim() && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Résultats
          </div>
          {searching ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '8px 0' }}>Recherche...</div>
          ) : searchResults.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '8px 0' }}>Aucun résultat</div>
          ) : (
            searchResults.map(user => (
              <div
                key={user.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(var(--ac),0.06)',
                }}
              >
                <Avatar username={user.username} avatarUrl={user.avatar_url} size={36} />
                <span style={{ flex: 1, fontWeight: 600, color: 'white', fontSize: 14 }}>{user.username}</span>
                {getActionButton(user)}
              </div>
            ))
          )}
        </div>
      )}

      {/* Incoming requests */}
      {requests.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Demandes reçues ({requests.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requests.map(req => (
              <div
                key={req.friendship_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(var(--ac),0.04)',
                  border: '1px solid rgba(var(--ac),0.1)',
                }}
              >
                <Avatar username={req.username} avatarUrl={req.avatar_url} size={36} />
                <span style={{ flex: 1, fontWeight: 600, color: 'white', fontSize: 14 }}>{req.username}</span>
                <button
                  onClick={() => handleAccept(req.friendship_id)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    background: 'rgba(16,185,129,0.15)', color: 'rgb(16,185,129)',
                    border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer',
                  }}
                >
                  Accepter
                </button>
                <button
                  onClick={() => handleDecline(req.friendship_id)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)',
                    border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                  }}
                >
                  Refuser
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
          Mes amis ({friends.length})
        </div>
        {friends.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(var(--ac),0.06)',
            borderRadius: 12, color: 'rgba(255,255,255,0.3)', fontSize: 14,
          }}>
            Tu n'as pas encore d'amis. Utilise la recherche pour en ajouter !
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {friends.map(friend => (
              <div
                key={friend.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(var(--ac),0.06)',
                  position: 'relative',
                }}
              >
                <Avatar username={friend.username} avatarUrl={friend.avatar_url} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'white', fontSize: 14 }}>{friend.username}</div>
                  {friend.active_this_week && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgb(16,185,129)' }} />
                      <span style={{ fontSize: 11, color: 'rgb(16,185,129)' }}>Actif cette semaine</span>
                    </div>
                  )}
                </div>
                <Link
                  to={`/profile/${friend.id}`}
                  style={{
                    fontSize: 12, color: 'rgb(var(--ac-l))', textDecoration: 'none',
                    padding: '4px 10px', borderRadius: 8,
                    border: '1px solid rgba(var(--ac),0.2)',
                  }}
                >
                  Voir profil
                </Link>
                {/* Kebab menu */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setOpenKebab(openKebab === friend.id ? null : friend.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.3)', fontSize: 18, padding: '4px 8px',
                      borderRadius: 8,
                    }}
                  >
                    ⋮
                  </button>
                  {openKebab === friend.id && (
                    <div
                      style={{
                        position: 'absolute', right: 0, top: '100%', zIndex: 50,
                        background: 'rgba(5,12,28,0.97)',
                        border: '1px solid rgba(var(--ac),0.15)',
                        borderRadius: 10, overflow: 'hidden',
                        minWidth: 160,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      }}
                    >
                      <button
                        onClick={() => handleRemoveFriend(friend.friendship_id)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '10px 14px', background: 'none', border: 'none',
                          color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        Retirer ami
                      </button>
                      <button
                        onClick={() => handleBlock(friend.id)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '10px 14px', background: 'none', border: 'none',
                          color: '#f87171', fontSize: 13, cursor: 'pointer',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        Bloquer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ClassementTab ────────────────────────────────────────────────────────────

const METRICS = [
  { id: 'volume',   label: 'Volume semaine', icon: '📊' },
  { id: 'squat',    label: 'Squat',          icon: '🏋' },
  { id: 'bench',    label: 'Développé couché', icon: '💪' },
  { id: 'deadlift', label: 'Soulevé de terre', icon: '⚡' },
]

function ClassementTab({ token }) {
  const [metric, setMetric] = useState('volume')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const podiumRef = useRef(null)

  useEffect(() => {
    if (loading || data.length < 3 || !podiumRef.current) return
    Array.from(podiumRef.current.children).forEach((el, i) => {
      animate(el, { translateY: [55, 0], opacity: [0, 1], delay: 80 + i * 110, duration: 580, easing: 'easeOutBack' })
    })
  }, [loading, data.length])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const fetch = metric === 'volume'
      ? getLeaderboard(token)
      : getPRLeaderboard(token, metric)
    fetch
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token, metric])

  function getWeekRange() {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    return `${fmt(monday)} – ${fmt(sunday)}`
  }

  function formatValue(entry) {
    if (metric === 'volume') {
      const v = entry.weekly_volume || 0
      if (v === 0) return '—'
      return v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${Math.round(v)} kg`
    }
    const w = entry.pr_weight || 0
    if (w === 0) return '—'
    return entry.pr_reps ? `${w} kg × ${entry.pr_reps}` : `${w} kg`
  }

  function formatValueShort(entry) {
    if (metric === 'volume') {
      const v = entry.weekly_volume || 0
      if (v === 0) return '—'
      return v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${Math.round(v)} kg`
    }
    const w = entry.pr_weight || 0
    return w === 0 ? '—' : `${w} kg`
  }

  function getSub(entry) {
    if (metric === 'volume') {
      return `${entry.sessions_count || 0} séance${(entry.sessions_count || 0) !== 1 ? 's' : ''}`
    }
    return entry.pr_reps ? `${entry.pr_reps} reps` : 'Pas de données'
  }

  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Metric selector */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
      }}>
        {METRICS.map(m => (
          <button
            key={m.id}
            onClick={() => setMetric(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
              background: metric === m.id ? 'rgba(var(--ac),0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${metric === m.id ? 'rgba(var(--ac),0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: metric === m.id ? 'rgb(var(--ac-l))' : 'rgba(255,255,255,0.4)',
              fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>
          {metric === 'volume' ? 'Cette semaine' : METRICS.find(m => m.id === metric)?.label}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
          {metric === 'volume' ? getWeekRange() : 'Meilleur résultat de tous les temps'}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
          Chargement…
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#f87171', fontSize: 14 }}>{error}</div>
      )}

      {!loading && !error && data.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          Aucune donnée disponible. Ajoute des amis pour voir le classement !
        </div>
      )}

      {!loading && !error && data.length > 0 && (() => {
        const top3 = data.slice(0, 3)
        const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3

        return (
          <>
            {/* Podium */}
            {top3.length >= 3 && (
              <div ref={podiumRef} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12 }}>
                {podiumOrder.map(entry => {
                  const rank = data.findIndex(e => e.user_id === entry.user_id) + 1
                  const isCenter = rank === 1
                  const medalColor = medalColors[rank - 1]
                  return (
                    <div key={entry.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: medalColor }}>#{rank}</div>
                      <div style={{
                        width: isCenter ? 56 : 44, height: isCenter ? 56 : 44,
                        borderRadius: '50%',
                        background: entry.avatar_url ? 'transparent' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: isCenter ? 18 : 14, color: 'white',
                        border: `2px solid ${medalColor}`,
                        boxShadow: `0 0 12px ${medalColor}40`, overflow: 'hidden',
                      }}>
                        {entry.avatar_url
                          ? <img src={entry.avatar_url} alt={entry.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : entry.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ fontSize: isCenter ? 13 : 11, fontWeight: 700, color: 'white', textAlign: 'center', maxWidth: 72 }}>
                        {entry.username}{entry.is_me && ' (toi)'}
                      </div>
                      <div style={{ fontSize: isCenter ? 15 : 12, fontWeight: 700, color: medalColor }}>
                        {formatValueShort(entry)}
                      </div>
                      <div style={{
                        width: '100%', minWidth: isCenter ? 80 : 64,
                        height: isCenter ? 72 : 44,
                        background: `${medalColor}10`,
                        border: `1px solid ${medalColor}25`,
                        borderRadius: '8px 8px 0 0',
                      }} />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Full table */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(var(--ac),0.08)', borderRadius: 12, overflow: 'hidden' }}>
              {data.map((entry, index) => (
                <div
                  key={entry.user_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 16px',
                    borderBottom: index < data.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: entry.is_me ? 'rgba(var(--ac),0.05)' : 'transparent',
                  }}
                >
                  <div style={{
                    width: 26, textAlign: 'center', fontWeight: 700, fontSize: 13,
                    color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'rgba(255,255,255,0.3)',
                  }}>
                    #{index + 1}
                  </div>
                  <Avatar username={entry.username} avatarUrl={entry.avatar_url} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'white', fontSize: 14 }}>
                      {entry.username}
                      {entry.is_me && (
                        <span style={{
                          marginLeft: 8, fontSize: 10, fontWeight: 600,
                          background: 'rgba(var(--ac),0.12)', color: 'rgb(var(--ac-l))',
                          padding: '2px 8px', borderRadius: 20,
                          border: '1px solid rgba(var(--ac),0.2)',
                        }}>C'est toi</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                      {getSub(entry)}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>
                    {formatValue(entry)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      })()}
    </div>
  )
}

// ─── Social page ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'amis', label: 'Amis' },
  { id: 'classement', label: 'Classement' },
]

export default function Social() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('feed')
  const tabContentRef = useRef(null)

  useEffect(() => {
    if (!tabContentRef.current) return
    animate(tabContentRef.current, { translateX: [16, 0], opacity: [0, 1], duration: 320, easing: 'easeOutQuad' })
  }, [activeTab])

  return (
    <div style={{ minHeight: '100vh', background: '#020810' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px 80px' }}>
        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: 0 }}>Social</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginTop: 4 }}>
            Suis la progression de tes amis
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(var(--ac),0.08)',
            borderRadius: 12,
            padding: 4,
            marginBottom: 28,
          }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.15s',
                background: activeTab === tab.id ? 'rgba(var(--ac),0.12)' : 'transparent',
                color: activeTab === tab.id ? 'rgb(var(--ac-l))' : 'rgba(255,255,255,0.4)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div ref={tabContentRef}>
          {activeTab === 'feed' && <FeedTab token={token} userId={user?.id} />}
          {activeTab === 'amis' && <AmisTab token={token} />}
          {activeTab === 'classement' && <ClassementTab token={token} />}
        </div>
      </div>
    </div>
  )
}
