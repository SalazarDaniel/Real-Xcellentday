import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireRole } from "@/components/app-shell";
import { Loading } from "@/components/ui";
import Detalle from "./detalle";

export const metadata: Metadata = { title: "Detalle del evento" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <RequireRole rol="WEDDING_PLANNER">
        <Detalle />
      </RequireRole>
    </Suspense>
  );
}
