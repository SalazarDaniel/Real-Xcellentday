import Link from "next/link";
import { Check } from "lucide-react";

const FEATURES = [
  {
    n: "01",
    title: "Organización impecable",
    text: "Gestiona todos los detalles de cada evento en un solo lugar. Desde la lista de invitados hasta los proveedores.",
  },
  {
    n: "02",
    title: "Comunicación fluida",
    text: "Mantén a tus clientes informados en tiempo real. Comparte actualizaciones y recibe feedback al instante.",
  },
  {
    n: "03",
    title: "Automatización inteligente",
    text: "Dedica menos tiempo a tareas repetitivas y más a lo que realmente importa: crear momentos mágicos.",
  },
];

const PLANES = [
  {
    nombre: "Básico",
    desc: "Gestión limitada de clientes",
    precio: "Gratis",
    cta: "Empieza gratis",
    bg: "bg-white",
    items: ["1 evento activo", "Hasta 50 invitados", "Gestión básica de clientes", "Soporte por email", "Dashboard básico"],
  },
  {
    nombre: "Profesional",
    desc: "Gestión de pagos, proveedores e invitados",
    precio: "$499",
    cta: "Elegir plan Profesional",
    bg: "bg-[#e9e4f0]",
    popular: true,
    items: ["Hasta 5 eventos activos", "Invitados ilimitados", "Gestión de pagos y proveedores", "Control completo de invitados", "Reportes básicos", "Soporte prioritario", "Integraciones básicas"],
  },
  {
    nombre: "Premium",
    desc: "Funciones completas, reportes avanzados y soporte prioritario",
    precio: "$999",
    cta: "Elegir plan Premium",
    bg: "bg-[#f6efe6]",
    items: ["Eventos ilimitados", "Invitados ilimitados", "Todo lo del plan Profesional", "Reportes avanzados y analytics", "Plantillas personalizadas", "Soporte 24/7 dedicado", "Integraciones avanzadas", "Exportación de datos", "Marca personalizada"],
  },
];

const FOOTER = [
  { t: "Producto", l: ["Características", "Precios", "Integraciones"] },
  { t: "Empresa", l: ["Sobre nosotros", "Blog", "Contacto"] },
  { t: "Legal", l: ["Privacidad", "Términos", "Cookies"] },
];

/*
 * Las fotografías del diseño (hero y la galería) no se pudieron exportar desde Figma todavía.
 * Los bloques <Foto> reservan su lugar y proporción; reemplázalos por <Image> cuando estén en /public.
 */
function Foto({ className, label }: { className: string; label: string }) {
  return <div role="img" aria-label={label} className={`bg-gradient-to-br ${className}`} />;
}

export default function Landing() {
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[90px] max-w-[1280px] items-center justify-between px-6">
          <Link href="/" className="font-display text-[28px] font-semibold">Xcellent Day</Link>
          <nav aria-label="Principal" className="flex items-center gap-2 text-sm sm:gap-8">
            <a href="#funciones" className="hidden text-black/70 hover:text-black md:inline">Sobre nosotros</a>
            <a href="#precios" className="hidden text-black/70 hover:text-black md:inline">Pricing</a>
            <Link href="/login" className="text-black/70 hover:text-black">Iniciar sesión</Link>
            <Link href="/registro" className="bg-black px-5 py-2.5 font-medium text-white hover:bg-black/85">Registrarse</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1280px] items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-32">
          <div className="flex flex-col gap-8">
            <h1 className="font-display text-6xl leading-[1.05] font-semibold tracking-[-0.02em] sm:text-7xl">
              Planea
              <br />
              bodas sin
              <br />
              estrés.
            </h1>
            <p className="max-w-[440px] text-lg leading-relaxed text-black/60">
              La plataforma todo-en-uno para wedding planners que quieren crear momentos inolvidables con menos trabajo.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/registro" className="bg-black px-8 py-4 text-sm font-medium text-white hover:bg-black/85">Comienza ahora</Link>
              <Link href="/login" className="border border-black/15 px-8 py-4 text-sm font-medium hover:bg-black/5">Ver demo</Link>
            </div>
          </div>
          <div className="relative pb-12 pl-12">
            <Foto label="Mesa de banquete iluminada para una boda" className="aspect-[584/600] w-full from-[#1b2a6b] via-[#2c48c9] to-[#0d1640]" />
            <div className="absolute bottom-0 left-0 size-32 bg-sand-soft" aria-hidden />
          </div>
        </section>

        {/* Funciones */}
        <section id="funciones" className="mx-auto flex max-w-[1280px] flex-col gap-20 px-6 py-24">
          <div className="flex max-w-[672px] flex-col gap-6">
            <h2 className="font-display text-5xl leading-tight font-semibold">
              Todo lo que
              <br />
              necesitas para brillar
            </h2>
            <p className="text-lg text-black/60">Herramientas diseñadas para simplificar tu día a día y llevar tus eventos al siguiente nivel.</p>
          </div>
          <div className="grid gap-12 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.n} className="flex flex-col gap-5">
                <span className="flex size-12 items-center justify-center bg-sand-soft font-display text-lg font-semibold">{f.n}</span>
                <h3 className="font-display text-2xl font-semibold">{f.title}</h3>
                <p className="text-[15px] leading-relaxed text-black/60">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <Foto label="Agenda de bodas sobre una manta" className="aspect-[612/400] from-[#d8cfc4] via-[#b9a58f] to-[#8a6b4f]" />
            <Foto label="Flor blanca sobre tela de seda" className="aspect-[612/400] from-[#f4efe9] via-[#ece5dc] to-[#e2d8cc]" />
          </div>
        </section>

        {/* Testimonio */}
        <section className="bg-[#f6f4f1] px-6 py-28">
          <figure className="mx-auto flex max-w-[976px] flex-col items-center gap-10 text-center">
            <blockquote className="font-display text-3xl leading-snug italic sm:text-4xl">
              &ldquo;Desde que uso Xcellent Day, puedo gestionar el doble de eventos con la mitad del estrés. Es exactamente lo que necesitaba.&rdquo;
            </blockquote>
            <figcaption className="flex flex-col gap-1">
              <span className="text-sm font-medium">María Sánchez</span>
              <span className="text-xs text-black/50">Wedding Planner, Barcelona</span>
            </figcaption>
          </figure>
        </section>

        {/* Precios */}
        <section id="precios" className="bg-gradient-to-b from-[#f6f4f1] via-white to-[#f6f4f1] px-6 py-28">
          <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-16">
            <div className="flex flex-col gap-4 text-center">
              <h2 className="font-display text-5xl font-semibold">Planes y precios</h2>
              <p className="max-w-[560px] text-black/60">Elige el plan que mejor se adapte a tu evento y empieza a planear sin complicaciones.</p>
            </div>
            <div className="grid w-full max-w-[1000px] gap-6 md:grid-cols-3">
              {PLANES.map((p) => (
                <article key={p.nombre} className={`relative flex flex-col gap-6 rounded-xl border border-black/10 p-8 shadow-[0_10px_25px_rgba(0,0,0,0.08)] ${p.bg}`}>
                  {p.popular ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-black px-4 py-1 text-[11px] font-medium text-white">Más popular</span>
                  ) : null}
                  <div className="flex flex-col gap-2">
                    <h3 className="font-display text-2xl font-semibold">{p.nombre}</h3>
                    <p className="min-h-10 text-xs text-black/50">{p.desc}</p>
                  </div>
                  <p className="font-display text-4xl font-semibold">
                    {p.precio}
                    {p.precio !== "Gratis" ? <span className="font-sans text-sm font-normal text-black/50"> / mes</span> : null}
                  </p>
                  <Link href="/registro" className="rounded-md bg-black py-3 text-center text-sm font-medium text-white hover:bg-black/85">{p.cta}</Link>
                  <ul className="flex flex-col gap-3 text-[13px]">
                    {p.items.map((i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="size-4 shrink-0" aria-hidden />
                        {i}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p className="text-xs text-black/50">Todos los planes incluyen 14 días de prueba gratis. Cancela en cualquier momento.</p>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-32">
          <div className="mx-auto flex max-w-[848px] flex-col items-center gap-8 text-center">
            <h2 className="font-display text-5xl leading-tight font-semibold sm:text-6xl">¿Lista para transformar tu negocio?</h2>
            <p className="max-w-[560px] text-black/60">Únete a cientos de wedding planners que ya están creando bodas extraordinarias con menos esfuerzo.</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/registro" className="bg-black px-10 py-4 text-sm font-medium text-white hover:bg-black/85">Comienza gratis</Link>
              <span className="text-xs text-black/40">Sin tarjeta de crédito requerida</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 px-6 pt-20 pb-10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <p className="font-display text-2xl font-semibold">Xcellent Day</p>
              <p className="max-w-[220px] text-xs text-black/50">La plataforma de gestión para wedding planners modernos.</p>
            </div>
            {FOOTER.map((c) => (
              <div key={c.t} className="flex flex-col gap-3">
                <p className="text-xs font-medium tracking-[0.1em] uppercase">{c.t}</p>
                {c.l.map((l) => <span key={l} className="text-xs text-black/50">{l}</span>)}
              </div>
            ))}
          </div>
          <p className="border-t border-black/5 pt-8 text-xs text-black/40">© {2026} Xcellent Day. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
