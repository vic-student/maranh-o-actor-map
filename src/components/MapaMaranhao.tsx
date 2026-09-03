import { useEffect, useMemo, useRef, useState } from "react";
import geo from "@/data/ma-municipios.json";
import atoresData from "@/data/atores.json";

type Ator = {
  nome: string;
  tipo: string;
  descricao: string;
  municipio: string | null;
  endereco: string;
};

const atores = atoresData as Ator[];

const W = 800;
const H = 900;
const MIN_ZOOM = 1;
const MAX_ZOOM = 24;

const features = (geo as {
  features: {
    properties: { name: string; code: string };
    geometry: { type: string; coordinates: number[][][] | number[][][][] };
  }[];
}).features;

function bounds() {
  let minX = 1e9,
    maxX = -1e9,
    minY = 1e9,
    maxY = -1e9;
  for (const f of features) {
    const polys =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates as number[][][]]
        : (f.geometry.coordinates as number[][][][]);
    for (const p of polys)
      for (const ring of p)
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
  }
  return { minX, maxX, minY, maxY };
}

const B = bounds();
const LAT0 = ((B.minY + B.maxY) / 2) * (Math.PI / 180);
const KX = Math.cos(LAT0);
const spanX = (B.maxX - B.minX) * KX;
const spanY = B.maxY - B.minY;
const SCALE = Math.min(W / spanX, H / spanY) * 0.96;
const OX = (W - spanX * SCALE) / 2;
const OY = (H - spanY * SCALE) / 2;

function project(lon: number, lat: number): [number, number] {
  return [OX + (lon - B.minX) * KX * SCALE, OY + (B.maxY - lat) * SCALE];
}

const paths = features.map((f) => {
  const polys =
    f.geometry.type === "Polygon"
      ? [f.geometry.coordinates as number[][][]]
      : (f.geometry.coordinates as number[][][][]);
  let d = "";
  let cx = 0,
    cy = 0,
    n = 0;
  for (const p of polys)
    for (const ring of p) {
      ring.forEach(([lon, lat], i) => {
        const [x, y] = project(lon, lat);
        d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
        cx += x;
        cy += y;
        n++;
      });
      d += "Z";
    }
  return { name: f.properties.name, code: f.properties.code, d, cx: cx / n, cy: cy / n };
});

const tipos = Array.from(new Set(atores.map((a) => a.tipo))).sort();

export default function MapaMaranhao() {
  const [ativos, setAtivos] = useState<string[]>(tipos);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  const filtrados = useMemo(
    () => atores.filter((a) => ativos.includes(a.tipo)),
    [ativos],
  );

  const porMunicipio = useMemo(() => {
    const m = new Map<string, Ator[]>();
    for (const a of filtrados) {
      if (!a.municipio) continue;
      const arr = m.get(a.municipio) ?? [];
      arr.push(a);
      m.set(a.municipio, arr);
    }
    return m;
  }, [filtrados]);

  const semLocal = filtrados.filter((a) => !a.municipio).length;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const { zoom: z, offset: o } = stateRef.current;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * Math.exp(-dy * 0.0018)));
      const k = next / z;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      setZoom(next);
      setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const moved = useRef(false);

  const zoomBotao = (fator: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = rect.width / 2;
    const py = rect.height / 2;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * fator));
    const k = next / zoom;
    setZoom(next);
    setOffset({ x: px - (px - offset.x) * k, y: py - (py - offset.y) * k });
  };

  const listaSelecionada = selecionado ? (porMunicipio.get(selecionado) ?? []) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tipos.map((t) => {
            const on = ativos.includes(t);
            return (
              <button
                key={t}
                onClick={() =>
                  setAtivos((prev) =>
                    prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            );
          })}
          <button
            onClick={() => setAtivos(ativos.length === tipos.length ? [] : tipos)}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40"
          >
            {ativos.length === tipos.length ? "Limpar" : "Todos"}
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-xl border border-border bg-card"
          style={{ touchAction: "none", cursor: drag.current ? "grabbing" : "grab" }}
          onPointerDown={(e) => {
            moved.current = false;
            drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const dx = e.clientX - drag.current.x;
            const dy = e.clientY - drag.current.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
            setOffset({ x: drag.current.ox + dx, y: drag.current.oy + dy });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="h-[70vh] w-full select-none">
            <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
              {paths.map((p) => {
                const lista = porMunicipio.get(p.name);
                const temAtor = !!lista?.length;
                const sel = selecionado === p.name;
                return (
                  <path
                    key={p.code}
                    d={p.d}
                    className={
                      temAtor
                        ? sel
                          ? "fill-[var(--ator-strong)]"
                          : "fill-[var(--ator)] hover:fill-[var(--ator-strong)]"
                        : "fill-muted hover:fill-accent"
                    }
                    stroke="var(--color-border)"
                    strokeWidth={0.6 / zoom}
                    onMouseEnter={() => setHover(p.name)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => {
                      if (!moved.current) setSelecionado(p.name);
                    }}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}
            </g>
          </svg>

          {hover && (
            <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-popover/95 px-3 py-1.5 text-xs font-medium text-popover-foreground shadow">
              {hover} · {porMunicipio.get(hover)?.length ?? 0} ator(es)
            </div>
          )}

          <div className="absolute bottom-3 right-3 flex flex-col gap-1">
            <button
              onClick={() => zoomBotao(1.4)}
              className="h-8 w-8 rounded-md border border-border bg-card text-lg leading-none text-foreground hover:bg-accent"
            >
              +
            </button>
            <button
              onClick={() => zoomBotao(1 / 1.4)}
              className="h-8 w-8 rounded-md border border-border bg-card text-lg leading-none text-foreground hover:bg-accent"
            >
              −
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="h-8 w-8 rounded-md border border-border bg-card text-[10px] font-semibold text-foreground hover:bg-accent"
            >
              RESET
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Roxo = municípios com atores · Cinza = sem atores · Use a roda do mouse para zoom e
          arraste para navegar. {semLocal} ator(es) sem município identificado.
        </p>
      </div>

      <aside className="rounded-xl border border-border bg-card p-4">
        {selecionado ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">{selecionado}</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {listaSelecionada.length} ator(es) no filtro atual
            </p>
            <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
              {listaSelecionada.map((a, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{a.nome}</p>
                  <span className="mt-1 inline-block rounded-full bg-[var(--ator)] px-2 py-0.5 text-[10px] font-medium text-[var(--ator-foreground)]">
                    {a.tipo}
                  </span>
                  {a.descricao && (
                    <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">
                      {a.descricao}
                    </p>
                  )}
                  {a.endereco && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{a.endereco}</p>
                  )}
                </div>
              ))}
              {listaSelecionada.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum ator neste município com os filtros atuais.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Clique em um município para ver os atores cadastrados.
          </p>
        )}
      </aside>
    </div>
  );
}
