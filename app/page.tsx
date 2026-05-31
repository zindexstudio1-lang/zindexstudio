import { redirect } from "next/navigation";

export default function Home() {
  // Redirige automáticamente a la vista de login
  redirect("/login");
}