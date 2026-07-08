import { TENANTS } from '../data/site'

export default function Marquee() {
  const names = TENANTS.map((t) => t.name)
  return (
    <div className="relative overflow-hidden border-y border-plata/15 panel-dark py-5" aria-hidden="true">
      <div className="marquee-track flex w-max whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center">
            {names.map((n) => (
              <span
                key={`${copy}-${n}`}
                className="inline-flex items-center gap-5 px-5 font-serif italic text-lg sm:text-xl text-blanco/75"
              >
                {n}
                <span className="not-italic text-plata/60 text-xs">◆</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
