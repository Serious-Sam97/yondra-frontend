import DashboardShell from "@/components/dashboard/DashboardShell";
import "./hifi.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
