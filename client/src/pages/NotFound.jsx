import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { animate, stagger } from 'animejs'

export default function NotFound() {
  const numRef   = useRef(null)
  const textRef  = useRef(null)
  const btnRef   = useRef(null)
  const glowRef  = useRef(null)

  useEffect(() => {
    // Chiffres 404 qui tombent
    animate(numRef.current, {
      opacity:      [0, 1],
      translateY:   [-40, 0],
      duration:     700,
      easing:       'easeOutBack',
    })

    // Texte + bouton en cascade
    animate([textRef.current, btnRef.current], {
      opacity:    [0, 1],
      translateY: [16, 0],
      duration:   500,
      delay:      stagger(120, { start: 300 }),
      easing:     'easeOutQuad',
    })

    // Pulsation du glow
    animate(glowRef.current, {
      scale:   [1, 1.15],
      opacity: [0.5, 0.25],
      duration: 2800,
      loop:    true,
      direction: 'alternate',
      easing:  'easeInOutSine',
    })
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white px-6 text-center"
      style={{ background: 'linear-gradient(135deg, #020810 0%, #07101f 50%, #020810 100%)' }}
    >
      {/* Glow derrière le 404 */}
      <div
        ref={glowRef}
        className="absolute pointer-events-none"
        style={{
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--ac-d),0.18) 0%, transparent 65%)',
        }}
      />

      {/* 404 */}
      <div ref={numRef} className="relative" style={{ opacity: 0 }}>
        <span
          className="font-black select-none leading-none"
          style={{
            fontSize: 'clamp(6rem, 22vw, 14rem)',
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, rgb(var(--ac-l)) 0%, rgb(var(--ac-d)) 60%, rgba(var(--ac-dd),0.4) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </span>
      </div>

      {/* Message */}
      <div ref={textRef} className="mt-2 mb-8" style={{ opacity: 0 }}>
        <p className="text-xl font-black text-white mb-2">Page introuvable</p>
        <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
          Cette page n'existe pas ou a été déplacée.
          <br />
          Retourne à l'entraînement.
        </p>
      </div>

      {/* CTA */}
      <div ref={btnRef} style={{ opacity: 0 }}>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
            boxShadow: '0 4px 20px rgba(var(--ac-d),0.4)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 30px rgba(var(--ac-d),0.6)' }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--ac-d),0.4)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          Retour au dashboard
        </Link>
      </div>
    </div>
  )
}
