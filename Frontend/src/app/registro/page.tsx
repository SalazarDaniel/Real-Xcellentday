import type { Metadata } from "next";
import RegistroForm from "./registro-form";

export const metadata: Metadata = { title: "Crea tu cuenta" };

export default function Page() {
  return <RegistroForm />;
}
