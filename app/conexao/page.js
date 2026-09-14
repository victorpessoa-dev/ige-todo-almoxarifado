import { AppErrorState } from "@/components/errors/AppErrorState";

export const metadata = {
  title: "Sem conexao | IGE Almoxarifado",
};

export default function ConnectionPage() {
  return <AppErrorState variant="connection" />;
}
