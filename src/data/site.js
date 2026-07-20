/**
 * Datos reales de Plaza Árbol de la Vida (Metepec).
 * Única fuente de verdad para contenido, contacto y assets.
 */

export const WHATSAPP_URL =
  'https://wa.me/527291108119?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20el%20local%20disponible'

export const PHONE_DISPLAY = '722 238 5599'
export const PHONE_TEL = '+527222385599'
export const LEASE_EMAIL = 'johnarriaga@plazaarboldelavida.com'

export const ADDRESS = 'Av. Adolfo López Mateos 2330, Bella Vista, 52172 Metepec, Méx.'
export const HOURS = '7:00 – 23:30 · todos los días'
export const RATING = { score: '4.6', reviews: 62 }

export const MAPS_URL = 'https://www.google.com/maps/place/Plaza+%C3%81rbol+de+la+Vida'
export const MAPS_EMBED =
  'https://www.google.com/maps?q=Plaza+Árbol+de+la+Vida,+Adolfo+López+Mateos+2330,+Bella+Vista,+Metepec&output=embed'

export const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/plzarboldelavidamet/' },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61570155641586' },
  { label: 'X / Twitter', href: 'https://x.com/PArboldelaVida' },
]

export const TENANTS = [
  { name: 'CHOPO Laboratorios', img: '/img/chopo-laboratorios.webp', desc: 'Laboratorio clínico de análisis y estudios médicos para toda la familia.', tag: 'Salud' },
  { name: 'Farmacias Similares', img: '/img/farmacias-similares.webp', desc: 'Medicamentos genéricos y consulta médica de bajo costo.', tag: 'Salud' },
  { name: 'Asados Don Abel', img: '/img/asados-don-abel.webp', desc: 'Desayunos y asados al carbón en un ambiente tradicional mexicano.', tag: 'Gastronomía' },
  { name: 'Chick In', img: '/img/chick-in.webp', desc: 'Pollo frito y comida rápida casual para toda ocasión.', tag: 'Gastronomía' },
  { name: "Samper's", img: '/img/samper-s.webp', desc: 'Nevería y heladería con sabores artesanales desde 1977.', tag: 'Gastronomía' },
  { name: "Luigi's Ristorante Italiano", img: '/img/luigi-s-ristorante-italiano.webp', desc: 'Cocina italiana tradicional: pastas, pizzas y sabores de la trattoria.', tag: 'Gastronomía' },
  { name: 'Inspira Dental Group', img: '/img/inspira-dental-group.webp', desc: 'Clínica de odontología integral y estética dental.', tag: 'Salud' },
  { name: 'Yadea', img: '/img/yadea.webp', desc: 'Motocicletas y vehículos eléctricos para la movilidad urbana.', tag: 'Movilidad' },
  { name: 'Meraki Apples', img: '/img/meraki-apples.webp', desc: 'Manzanas acarameladas y postres artesanales hechos con amor.', tag: 'Gastronomía' },
  { name: 'Irma Aguilar Art Gallery', img: '/img/irma-aguilar-art-gallery.webp', desc: 'Galería dedicada a exhibir obra contemporánea local.', tag: 'Arte' },
  { name: 'María, Casa de la Belleza', img: '/img/maria-casa-de-la-belleza.webp', desc: 'Salón integral: cabello, uñas y tratamientos estéticos.', tag: 'Belleza' },
  { name: 'Carola Pan & Café', img: '/img/carola-pan-cafe.webp', desc: 'Panadería de autor y cafetería de especialidad.', tag: 'Gastronomía' },
  { name: 'Froyoh! Frozen Yogurt', img: '/img/froyoh-frozen-yogurt.webp', desc: 'Yogurt helado con toppings frescos y naturales.', tag: 'Gastronomía' },
  { name: 'Balanco Wellness & Studio', img: '/img/balanco-wellness-studio.webp', desc: 'Estudio de pilates, yoga y bienestar integral.', tag: 'Bienestar' },
  { name: 'La Clásica Barbería', img: '/img/la-clasica-barberia.webp', desc: 'Barbería de estilo clásico y cuidado masculino.', tag: 'Belleza' },
  { name: 'Relié Spa', img: '/img/relie-spa.webp', desc: 'Spa y tratamientos de relajación, masaje y belleza.', tag: 'Bienestar' },
  { name: 'Army Room', img: '/img/army-room.webp', desc: 'Gimnasio funcional con entrenamiento de alta intensidad.', tag: 'Bienestar' },
  { name: 'Roller Shape Studio', img: '/img/roller-shape-studio.webp', desc: 'Acondicionamiento físico y patinaje en un formato único.', tag: 'Bienestar' },
  { name: 'Chérie Boutique', img: '/img/cherie-boutique.webp', desc: 'Boutique de moda y accesorios para dama.', tag: 'Moda' },
]

// Todos los logos de inquilinos comparten el mismo tamaño intrínseco: se
// declara aquí para poner width/height en el <img> y reservar el hueco.
export const TENANT_LOGO_SIZE = { w: 420, h: 280 }

export const GALLERY = [
  { src: '/img/hd/lobby.webp', w: 900, h: 1123, alt: 'Lobby con el mural del logo y escaleras de la plaza', caption: 'Lobby principal', big: true },
  { src: '/img/hd/luigis.webp', w: 731, h: 1110, alt: "Fachada de Luigi's Ristorante en la plaza", caption: 'Terraza gastronómica' },
  { src: '/img/hd/carola.webp', w: 731, h: 1110, alt: 'Carola Pan & Café en la plaza', caption: 'Pan & café de autor' },
  { src: '/img/hd/asados.webp', w: 731, h: 1110, alt: 'Fachada de Asados Don Abel en la plaza', caption: 'Asados al carbón' },
  { src: '/img/estacionamiento-al-atardecer.webp', w: 900, h: 579, alt: 'La plaza al atardecer', caption: 'Atardecer en la plaza' },
]

// Muro de concreto con el logo — panel visual de Arte & Cultura
export const LOBBY_PHOTO = '/img/hd/muro.webp'
export const LOBBY_PHOTO_SIZE = { w: 731, h: 1110 }

// Assets generados con IA (Higgsfield) en la paleta de la marca
export const METAL_TEXTURE = '/img/textura-metal-liquido.webp' // textura metal líquido (poster/estático)
export const METAL_TEXTURE_SIZE = { w: 1280, h: 715 }
export const METAL_TEXTURE_VIDEO = '/video/textura-metal.mp4' // textura animada (loop, sin audio)
export const TREE_MODEL = '/models/arbol-logo.glb' // árbol del logotipo en 3D (Higgsfield sam_3_3d)

// Foto a sangre completa (PhotoBreak). Se sirve en dos anchos vía srcset: el
// teléfono baja 137 KB en vez de 238 KB, y el escritorio conserva los 1920 px.
export const HERO_PHOTO = '/img/plaza-arbol-de-la-vida-al-atardecer.webp'
export const HERO_PHOTO_SM = '/img/plaza-arbol-de-la-vida-al-atardecer-1200.webp'
export const HERO_PHOTO_SRCSET = `${HERO_PHOTO_SM} 1200w, ${HERO_PHOTO} 1920w`
export const HERO_PHOTO_SIZE = { w: 1920, h: 1234 }

// Árbol del logotipo en PNG→WebP: portada de la intro y fondo estático que
// se muestra al instante mientras el 3D carga.
export const BRAND_TREE = '/img/arbol-marca-blanco.webp'
export const BRAND_TREE_SIZE = { w: 432, h: 442 }
