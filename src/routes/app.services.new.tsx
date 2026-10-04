import { createFileRoute } from "@tanstack/react-router";
import { ServiceEntryForm } from "@/components/services/ServiceEntryForm";

export const Route = createFileRoute("/app/services/new")({
  head: () => ({
    meta: [
      { title: "New service — Stackwise" },
      { name: "description", content: "Register a new service job: customer, product, problem, receiving details." },
      { property: "og:title", content: "New service — Stackwise" },
      { property: "og:description", content: "Register a new service job." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewServicePage,
});

function NewServicePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">New service</h1>
        <p className="text-sm text-muted-foreground">
          Register a product for repair or warranty service.
        </p>
      </div>
      <ServiceEntryForm />
    </div>
  );
}
