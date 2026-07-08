import { WHATSAPP_URL } from '../data/site'

export default function WhatsAppFloat() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="wa-pulse fixed right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-[0_10px_28px_-6px_rgba(37,211,102,0.55)] transition-transform duration-300 hover:scale-110 cursor-pointer"
      style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <svg viewBox="0 0 32 32" width="28" height="28" fill="#fff" aria-hidden="true">
        <path d="M16.04 3C9.37 3 3.96 8.4 3.96 15.06c0 2.25.62 4.43 1.8 6.35L3 29l7.78-2.7a12.6 12.6 0 0 0 5.26 1.14h.01c6.67 0 12.08-5.4 12.08-12.07C28.13 8.4 22.72 3 16.04 3zm0 21.86h-.01a10.06 10.06 0 0 1-5.13-1.4l-.37-.22-4.62 1.6 1.55-4.5-.24-.38a9.98 9.98 0 0 1-1.55-5.4c0-5.55 4.52-10.06 10.08-10.06 2.7 0 5.23 1.05 7.13 2.96a10 10 0 0 1 2.96 7.12c0 5.56-4.53 10.08-10.08 10.08zm5.53-7.55c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.08-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.65-.94-2.26-.25-.6-.5-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.25 5.15 4.56.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.07-.13-.27-.2-.57-.35z" />
      </svg>
    </a>
  )
}
