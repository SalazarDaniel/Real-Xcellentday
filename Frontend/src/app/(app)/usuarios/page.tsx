import type { Metadata } from "next";
import { RequireRole } from "@/components/app-shell";
import UsuariosView from "./usuarios-view";

export const metadata: Metadata = { title: "Usuarios" };

export default function Page() {
  return (
    <RequireRole rol="ADMINISTRADOR">
      <UsuariosView />
    </RequireRole>
  );
}
