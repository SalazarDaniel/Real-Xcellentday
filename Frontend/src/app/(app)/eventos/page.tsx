import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireRole } from "@/components/app-shell";
import { Loading } from "@/components/ui";
import EventosView from "./eventos-view";

export const metadata: Metadata = { title: "Mis Eventos" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <RequireRole rol="WEDDING_PLANNER">
        <EventosView />
      </RequireRole>
    </Suspense>
  );
}
