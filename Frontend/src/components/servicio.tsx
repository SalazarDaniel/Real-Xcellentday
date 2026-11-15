import type { LucideIcon } from "lucide-react";
import { Camera, Flower2, Music, Sparkles, Utensils } from "lucide-react";
import { TIPO_SERVICIO } from "@/lib/format";
import type { TipoServicio } from "@/lib/types";
import { cx } from "./ui";

/** Colores por tipo de servicio, muestreados del diseño de Figma (tarjetas de proveedores). */
export const SERVICIO: Record<TipoServicio, { icon: LucideIcon; bar: string; soft: string; badge: string; ink: string }> = {
  LUGAR: { icon: Sparkles, bar: "#e8dcc2", soft: "rgb(232 220 194 / 0.3)", badge: "rgb(232 220 194 / 0.85)", ink: "#80796b" },
  FOTOGRAFIA: { icon: Camera, bar: "#d6d6d6", soft: "#efefef", badge: "#dbdbdb", ink: "#767676" },
  BANQUETE: { icon: Utensils, bar: "#b8c1a3", soft: "#e6e9e0", badge: "#c1c9b0", ink: "#656a5a" },
  MUSICA: { icon: Music, bar: "#d4b46a", soft: "#efe5cf", badge: "#e1c98f", ink: "#6e5a2c" },
  FLORES: { icon: Flower2, bar: "#e7c8c2", soft: "#f4ebe9", badge: "#e9cfca", ink: "#7f6e6b" },
  OTRO: { icon: Sparkles, bar: "#e2e2e1", soft: "#f2f2f2", badge: "#e5e5e4", ink: "#767676" },
};

export function ServicioIcon({ tipo, className }: { tipo: TipoServicio; className?: string }) {
  const s = SERVICIO[tipo];
  const Icon = s.icon;
  return (
    <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-[10px]", className)} style={{ background: s.soft, color: s.ink }} aria-hidden>
      <Icon className="size-5" />
    </span>
  );
}

export function ServicioBadge({ tipo }: { tipo: TipoServicio }) {
  const s = SERVICIO[tipo];
  return (
    <span className="inline-flex h-[21px] w-fit items-center rounded px-2 text-[11px] font-medium" style={{ background: s.badge, color: s.ink }}>
      {TIPO_SERVICIO[tipo]}
    </span>
  );
}
