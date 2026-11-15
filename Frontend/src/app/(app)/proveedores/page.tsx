import type { Metadata } from "next";
import { RequireRole } from "@/components/app-shell";
import ProveedoresView from "./proveedores-view";

export const metadata: Metadata = { title: "Proveedores" };

export default function Page() {
  return (
    <RequireRole rol="WEDDING_PLANNER">
      <ProveedoresView />
    </RequireRole>
  );
}
