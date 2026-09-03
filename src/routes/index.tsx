import { createFileRoute } from "@tanstack/react-router";
import MapaMaranhao from "@/components/MapaMaranhao";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mapa do Ecossistema de Inovação do Maranhão" },
      {
        name: "description",
        content:
          "Mapa interativo dos 217 municípios do Maranhão com os atores do ecossistema de inovação: startups, hubs, mentores, instituições e mais.",
      },
      { property: "og:title", content: "Mapa do Ecossistema de Inovação do Maranhão" },
      {
        property: "og:description",
        content:
          "Explore por município os atores do ecossistema de inovação maranhense, com filtros por tipo de ator.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-8">
      <header className="mx-auto mb-6 max-w-[1400px]">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Ecossistema de Inovação do Maranhão
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atores distribuídos pelos municípios maranhenses
        </p>
      </header>
      <div className="mx-auto max-w-[1400px]">
        <MapaMaranhao />
      </div>
    </main>
  );
}
