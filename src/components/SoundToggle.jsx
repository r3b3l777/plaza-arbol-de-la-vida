import { setSound, useSoundState } from '../lib/brandAudio'

/**
 * Botón flotante para activar/silenciar el ambiente de marca (ElevenLabs).
 * Vive junto al botón de WhatsApp; el ambiente respeta la política de autoplay
 * (solo suena tras un gesto). Barras animadas indican el estado.
 */
export default function SoundToggle() {
  const on = useSoundState()
  return (
    <button
      type="button"
      onClick={() => setSound(!on)}
      className="sound-toggle"
      aria-pressed={on}
      aria-label={on ? 'Silenciar ambiente' : 'Activar ambiente de la plaza'}
      title={on ? 'Silenciar ambiente' : 'Activar ambiente'}
    >
      <span className={`sound-bars ${on ? 'is-on' : ''}`} aria-hidden="true">
        <i /><i /><i /><i />
      </span>
    </button>
  )
}
