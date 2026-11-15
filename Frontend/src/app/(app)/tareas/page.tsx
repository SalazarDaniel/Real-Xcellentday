import type { Metadata } from "next";
import { RequireRole } from "@/components/app-shell";
import { TareasLista } from "@/components/tareas";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Tareas" };

export default function Page() {
  return (
    <RequireRole rol="WEDDING_PLANNER">
      <div className="flex flex-col gap-8">
        <PageHeader title="Tareas" sub="Pendientes de todas tus bodas activas" />
        <TareasLista />
      </div>
    </RequireRole>
  );
}
