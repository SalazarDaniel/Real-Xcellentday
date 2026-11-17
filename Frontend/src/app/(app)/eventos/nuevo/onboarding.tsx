"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { Button, Card, Loading, Notice, TextField, cx } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { fecha, hoyISO, money } from "@/lib/format";
import type { Boda, EventoForm, ParejaForm, PresupuestoForm } from "@/lib/types";

type Errors = Record<string, string>;

const PAREJA0: ParejaForm = { nombre_contrayente1: "", nombre_contrayente2: "", correo: "", telefono: "" };
const EVENTO0: EventoForm = { fecha: "", lugar: "", estilo: "", invitados_estimados: "" };
const PRESUP0: PresupuestoForm = { monto_total: "", conceptos: [] };

const PASOS = ["Pareja", "Evento", "Presupuesto"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarPareja(p: ParejaForm): Errors {
  const e: Errors = {};
  if (!p.nombre_contrayente1.trim()) e.nombre_contrayente1 = "Escribe el nombre del primer contrayente";
  if (!p.nombre_contrayente2.trim()) e.nombre_contrayente2 = "Escribe el nombre del segundo contrayente";
  if (!EMAIL.test(p.correo.trim())) e.correo = "Escribe un correo válido, por ejemplo nombre@correo.com";
  if (!/^\d{10}$/.test(p.telefono)) e.telefono = "El teléfono debe tener 10 dígitos, sin espacios";
  return e;
}

function validarEvento(ev: EventoForm): Errors {
  const e: Errors = {};
  if (!ev.fecha) e.fecha = "Elige la fecha de la boda";
  else if (ev.fecha <= hoyISO()) e.fecha = "La fecha de la boda debe ser futura";
  if (!ev.lugar.trim()) e.lugar = "Escribe el lugar del evento";
  if (!ev.estilo.trim()) e.estilo = "Describe el estilo, por ejemplo «Hacienda clásica»";
  const n = Number(ev.invitados_estimados);
  if (!Number.isInteger(n) || n < 1) e.invitados_estimados = "Escribe un número de invitados mayor a cero";
  return e;
}

function validarPresupuesto(p: PresupuestoForm): Errors {
  const e: Errors = {};
  if (!(Number(p.monto_total) > 0)) e.monto_total = "El monto debe ser mayor a cero";
  p.conceptos.forEach((c, i) => {
    if (!c.descripcion.trim()) e[`c${i}d`] = "Escribe el concepto o quítalo";
    if (!(Number(c.monto_acordado) > 0)) e[`c${i}m`] = "El monto debe ser mayor a cero";
  });
  return e;
}

export default function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const borradorParam = params.get("borrador");
  const [borradorId, setBorradorId] = useState<number | null>(borradorParam ? Number(borradorParam) : null);
  const [cargando, setCargando] = useState(!!borradorParam);
  const [paso, setPaso] = useState(1); // 4 = revisión
  const [pareja, setPareja] = useState(PAREJA0);
  const [evento, setEvento] = useState(EVENTO0);
  const [presupuesto, setPresupuesto] = useState(PRESUP0);
  const [errors, setErrors] = useState<Errors>({});
  const [aviso, setAviso] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Retomar un borrador (también el que crea el modal «Registrar nueva pareja»)
  useEffect(() => {
    if (!borradorParam) return;
    api<Boda>(`/bodas/${borradorParam}`)
      .then((b) => {
        const d = b.datos_borrador ?? {};
        const p = { ...PAREJA0, ...(d.pareja ?? {}) };
        const ev = { ...EVENTO0, ...(d.evento ?? {}) };
        setPareja(p);
        setEvento(ev);
        setPresupuesto({ ...PRESUP0, ...(d.presupuesto ?? {}), conceptos: d.presupuesto?.conceptos ?? [] });
        // Si al paso guardado le faltan datos, se abre ese paso para completarlos
        setPaso(Object.keys(validarPareja(p)).length ? 1 : b.paso_onboarding);
      })
      .catch((e: ApiError) => setAviso({ tone: "danger", text: e.message }))
      .finally(() => setCargando(false));
  }, [borradorParam]);

  const validadores = [() => validarPareja(pareja), () => validarEvento(evento), () => validarPresupuesto(presupuesto)];

  function siguiente(e: FormEvent) {
    e.preventDefault();
    const errs = validadores[paso - 1]();
    setErrors(errs);
    setAviso(null);
    if (Object.keys(errs).length === 0) setPaso(paso + 1);
  }

  async function guardarBorrador() {
    setAviso(null);
    const body = { paso: Math.min(paso, 3), pareja, evento, presupuesto };
    try {
      const b = borradorId
        ? await api<Boda>(`/bodas/borradores/${borradorId}`, { method: "PUT", body })
        : await api<Boda>("/bodas/borradores", { method: "POST", body });
      setBorradorId(b.id);
      setAviso({ tone: "success", text: "Borrador guardado. Puedes retomarlo desde Mis Eventos." });
    } catch (err) {
      setAviso({ tone: "danger", text: (err as ApiError).message });
    }
  }

  async function confirmar() {
    setEnviando(true);
    setAviso(null);
    try {
      const body = {
        pareja: { ...pareja, correo: pareja.correo.trim() },
        evento: { ...evento, invitados_estimados: Number(evento.invitados_estimados) },
        presupuesto: {
          monto_total: Number(presupuesto.monto_total),
          conceptos: presupuesto.conceptos.map((c) => ({ ...c, monto_acordado: Number(c.monto_acordado) })),
        },
      };
      const q = borradorId ? `?borrador_id=${borradorId}` : "";
      const boda = await api<Boda>(`/bodas/onboarding${q}`, { method: "POST", body });
      router.replace(`/eventos/${boda.id}?creada=1`);
    } catch (err) {
      setAviso({ tone: "danger", text: (err as ApiError).message });
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <Loading />;

  const setP = (k: keyof ParejaForm) => (e: { target: { value: string } }) => setPareja({ ...pareja, [k]: e.target.value });
  const setE = (k: keyof EventoForm) => (e: { target: { value: string } }) => setEvento({ ...evento, [k]: e.target.value });
  const setConcepto = (i: number, k: "descripcion" | "monto_acordado", v: string) =>
    setPresupuesto({ ...presupuesto, conceptos: presupuesto.conceptos.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
  const sumaConceptos = presupuesto.conceptos.reduce((s, c) => s + (Number(c.monto_acordado) || 0), 0);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <Link href="/eventos" className="flex w-fit items-center gap-2 text-sm text-black/70 hover:text-black">
        <ArrowLeft className="size-4" aria-hidden />
        Volver a eventos
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] leading-[48px] font-semibold tracking-[-0.32px]">Nuevo evento</h1>
        <p className="text-[15px] text-black/60">
          {paso <= 3 ? `Paso ${paso} de 3: completa el expediente de la boda` : "Revisa los datos antes de confirmar"}
        </p>
      </header>

      <ol aria-label="Avance del registro" className="grid grid-cols-3 gap-3">
        {PASOS.map((nombre, i) => {
          const n = i + 1;
          const hecho = paso > n;
          const actual = paso === n;
          return (
            <li key={nombre} aria-current={actual ? "step" : undefined} className="flex flex-col gap-2">
              <span className={cx("h-1 rounded-full", hecho || actual ? "bg-black" : "bg-black/10")} />
              <span className={cx("flex items-center gap-1.5 text-[13px]", actual ? "font-medium" : "text-black/50")}>
                {hecho ? <Check className="size-3.5" aria-hidden /> : null}
                {nombre}
              </span>
            </li>
          );
        })}
      </ol>

      {aviso ? <Notice tone={aviso.tone}>{aviso.text}</Notice> : null}

      {paso <= 3 ? (
        <Card className="p-6">
          <form onSubmit={siguiente} noValidate className="flex flex-col gap-6">
            {paso === 1 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <h2 className="font-display text-[22px] font-semibold sm:col-span-2">¿Quiénes se casan?</h2>
                <TextField label="Nombre del contrayente 1" value={pareja.nombre_contrayente1} onChange={setP("nombre_contrayente1")} error={errors.nombre_contrayente1} maxLength={100} />
                <TextField label="Nombre del contrayente 2" value={pareja.nombre_contrayente2} onChange={setP("nombre_contrayente2")} error={errors.nombre_contrayente2} maxLength={100} />
                <TextField label="Correo de contacto" type="email" value={pareja.correo} onChange={setP("correo")} error={errors.correo} />
                <TextField label="Teléfono" inputMode="numeric" maxLength={10} value={pareja.telefono} onChange={(e) => setPareja({ ...pareja, telefono: e.target.value.replace(/\D/g, "") })} error={errors.telefono} hint="10 dígitos" />
              </div>
            )}
            {paso === 2 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <h2 className="font-display text-[22px] font-semibold sm:col-span-2">El evento</h2>
                <TextField label="Fecha de la boda" type="date" min={hoyISO()} value={evento.fecha} onChange={setE("fecha")} error={errors.fecha} />
                <TextField label="Invitados estimados" type="number" min={1} value={evento.invitados_estimados} onChange={setE("invitados_estimados")} error={errors.invitados_estimados} />
                <TextField label="Lugar" value={evento.lugar} onChange={setE("lugar")} error={errors.lugar} placeholder="Hacienda, salón, playa…" />
                <TextField label="Estilo del evento" value={evento.estilo} onChange={setE("estilo")} error={errors.estilo} placeholder="Hacienda clásica, boho, minimalista…" />
              </div>
            )}
            {paso === 3 && (
              <div className="flex flex-col gap-6">
                <h2 className="font-display text-[22px] font-semibold">Presupuesto inicial</h2>
                <TextField label="Monto total disponible (MXN)" type="number" min={0} step="0.01" value={presupuesto.monto_total} onChange={(e) => setPresupuesto({ ...presupuesto, monto_total: e.target.value })} error={errors.monto_total} />
                <fieldset className="flex flex-col gap-4">
                  <legend className="mb-2 text-sm font-medium">Conceptos de gasto previstos (opcional)</legend>
                  {presupuesto.conceptos.map((c, i) => (
                    <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_180px_auto]">
                      <TextField label="Concepto" value={c.descripcion} placeholder="Banquete, fotografía…" error={errors[`c${i}d`]} onChange={(e) => setConcepto(i, "descripcion", e.target.value)} />
                      <TextField label="Monto" type="number" min={0} step="0.01" value={c.monto_acordado} error={errors[`c${i}m`]} onChange={(e) => setConcepto(i, "monto_acordado", e.target.value)} />
                      <Button type="button" variant="ghost" icon={Trash2} className="h-[50px]" aria-label={`Quitar concepto ${i + 1}`} onClick={() => setPresupuesto({ ...presupuesto, conceptos: presupuesto.conceptos.filter((_, j) => j !== i) })} />
                    </div>
                  ))}
                  <Button type="button" variant="outline" icon={Plus} className="w-fit" onClick={() => setPresupuesto({ ...presupuesto, conceptos: [...presupuesto.conceptos, { descripcion: "", monto_acordado: "" }] })}>
                    Agregar concepto
                  </Button>
                  {Number(presupuesto.monto_total) > 0 && sumaConceptos > Number(presupuesto.monto_total) ? (
                    <Notice tone="warning">Los conceptos suman {money(sumaConceptos)}, más que el presupuesto total.</Notice>
                  ) : null}
                </fieldset>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
              <Button type="button" variant="ghost" onClick={() => void guardarBorrador()}>Guardar borrador</Button>
              <span className="flex-1" />
              {paso > 1 && (
                <Button type="button" variant="outline" onClick={() => { setErrors({}); setPaso(paso - 1); }}>Anterior</Button>
              )}
              <Button type="submit">{paso === 3 ? "Revisar" : "Siguiente"}</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="flex flex-col gap-6 p-6">
          <h2 className="font-display text-[22px] font-semibold">Resumen</h2>
          <dl className="flex flex-col divide-y divide-line">
            <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]">
              <dt className="text-xs tracking-[0.3px] text-black/50 uppercase">Pareja</dt>
              <dd>
                {pareja.nombre_contrayente1} & {pareja.nombre_contrayente2}
                <span className="block text-sm text-black/60">{pareja.correo} · {pareja.telefono}</span>
              </dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]">
              <dt className="text-xs tracking-[0.3px] text-black/50 uppercase">Evento</dt>
              <dd>
                {fecha(evento.fecha, { month: "long", weekday: "long" })}
                <span className="block text-sm text-black/60">
                  {evento.lugar} · estilo {evento.estilo.toLowerCase()} · {evento.invitados_estimados} invitados
                </span>
              </dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]">
              <dt className="text-xs tracking-[0.3px] text-black/50 uppercase">Presupuesto</dt>
              <dd>
                {money(Number(presupuesto.monto_total))}
                {presupuesto.conceptos.length > 0 && (
                  <ul className="mt-1 text-sm text-black/60">
                    {presupuesto.conceptos.map((c, i) => (
                      <li key={i}>{c.descripcion}: {money(Number(c.monto_acordado))}</li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3 border-t border-line pt-6">
            <Button variant="outline" onClick={() => setPaso(3)}>Anterior</Button>
            <span className="flex-1" />
            <Button disabled={enviando} onClick={() => void confirmar()}>
              {enviando ? "Registrando…" : "Confirmar y crear evento"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
