import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/services")({
  component: ServicesLayout,
});

function ServicesLayout() {
  return <Outlet />;
}
