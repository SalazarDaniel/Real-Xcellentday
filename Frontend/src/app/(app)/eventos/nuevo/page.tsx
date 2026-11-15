import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireRole } from "@/components/app-shell";
import { Loading } from "@/components/ui";
import Onboarding from "./onboarding";

export const metadata: Metadata = { title: "Nuevo evento" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <RequireRole rol="WEDDING_PLANNER">
        <Onboarding />
      </RequireRole>
    </Suspense>
  );
}
