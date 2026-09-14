import { AppErrorState } from "@/components/errors/AppErrorState";

export const metadata = {
  title: "Sem conexao | IGE Almoxarifado",
};

export default function ConnectionPageAlias() {
  return <AppErrorState variant="connection" />;
}
