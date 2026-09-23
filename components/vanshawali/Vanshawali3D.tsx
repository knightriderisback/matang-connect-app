"use client";

import { useEffect, useMemo, useState } from "react";
import { X, RotateCcw, Maximize2, Sparkles, Users, Info, ZoomIn, ZoomOut } from "lucide-react";

type Person = {
  id: string;
  display_name: string;
  gender?: string | null;
  birth_year?: number | null;
  birth_date?: string | null;
  photo_url?: string | null;
  relation?: string;
  via_id?: string;
  via_parent_id?: string;
  via_child_id?: string;
};
type Tree = {
  centre: Person;
  parents?: Person[];
  spouses?: Person[];
  children?: Person[];
  siblings?: Person[];
  levels_up?: Person[][];
  levels_down?: Person[][];
  spouses_of?: Record<string, Person[]>;
  siblings_of?: Record<string, Person[]>;
};

const REL = {
  self: "#f5b942",
  parent: "#8b5cf6",
  grandparent: "#3b82f6",
  ancestor: "#14b8a6",
  child: "#10b981",
  grandchild: "#f97316",
  spouse: "#ec4899",
  sibling: "#facc15",
} as const;

function ageOf(p: Person) {
  const y = p.birth_year || (p.birth_date ? Number(p.birth_date.slice(0, 4)) : 0);
  return y > 1800 ? Math.max(0, new Date().getFullYear() - y) : null;
}
function generation(p: Person, center: string) {
  const r = String(p.relation || "").toLowerCase();
  if (p.id === center || r === "self") return 0;
  if (r === "father" || r === "mother" || r === "parent") return 1;
  if (r === "grandfather" || r === "grandmother") return 2;
  if (r === "child" || r === "son" || r === "daughter") return -1;
  if (r === "grandchild") return -2;
  return 0;
}
function relationColor(p: Person, center: string) {
  const r = String(p.relation || "").toLowerCase();
  const g = generation(p, center);
  if (r === "spouse") return REL.spouse;
  if (r === "sibling" || r === "brother" || r === "sister") return REL.sibling;
  if (g === 0) return REL.self;
  if (g === 1) return REL.parent;
  if (g === 2) return REL.grandparent;
  if (g > 2) return REL.ancestor;
  if (g === -1) return REL.child;
  return REL.grandchild;
}
function gender(p: Person) {
  const g = String(p.gender || "").toLowerCase();
  return g === "female" || g === "f" ? "female" : g === "male" || g === "m" ? "male" : "neutral";
}

function MiniHuman({ person, color, selected, onClick }: { person: Person; color: string; selected: boolean; onClick: () => void }) {
  const age = ageOf(person);
  const small = age != null && age < 13;
  const child = age != null && age < 5;
  const elderly = age != null && age > 70;
  const g = gender(person);
  const scale = child ? 0.58 : small ? 0.72 : elderly ? 0.92 : 1;
  const skin = "#c98b62";
  const clothes = g === "female" ? "#7c3aed" : g === "male" ? "#164e63" : "#475569";
  return (
    <button type="button" onClick={onClick} className="group relative w-[86px] h-[138px] [transform-style:preserve-3d] focus:outline-none" style={{ transform: "scale(" + scale + ")" }}>
      <span className="absolute inset-x-0 bottom-1 h-3 rounded-full opacity-60 blur-sm" style={{ background: color }} />
      <span className="absolute left-1/2 top-2 -translate-x-1/2 w-[30px] h-[30px] rounded-full border-2 shadow-lg [transform:translateZ(14px)] overflow-hidden" style={{ background: skin, borderColor: selected ? "#fff" : color }}>
        {person.photo_url ? <img src={person.photo_url} alt="" className="w-full h-full object-cover" /> : <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-black/20" />}
      </span>
      <span className="absolute left-1/2 top-[31px] -translate-x-1/2 w-[43px] h-[58px] rounded-[45%_45%_25%_25%] border border-white/20 shadow-xl [transform:translateZ(8px)]" style={{ background: clothes }}>
        <span className="absolute left-1/2 top-2 -translate-x-1/2 w-3 h-5 rounded-full bg-white/15" />
      </span>
      <span className="absolute left-[18px] top-[38px] w-3 h-11 rounded-full origin-top -rotate-[12deg] shadow [transform:translateZ(6px)]" style={{ background: clothes }} />
      <span className="absolute right-[18px] top-[38px] w-3 h-11 rounded-full origin-top rotate-[12deg] shadow [transform:translateZ(6px)]" style={{ background: clothes }} />
      <span className="absolute left-[27px] top-[84px] w-3.5 h-35 rounded-full origin-top rotate-[2deg] shadow [transform:translateZ(5px)]" style={{ background: elderly ? "#334155" : "#1e293b" }} />
      <span className="absolute right-[27px] top-[84px] w-3.5 h-35 rounded-full origin-top -rotate-[2deg] shadow [transform:translateZ(5px)]" style={{ background: elderly ? "#334155" : "#1e293b" }} />
      <span className="absolute left-1/2 -translate-x-1/2 top-[118px] whitespace-nowrap rounded-lg border px-2 py-1 text-[9px] font-bold shadow-xl backdrop-blur bg-black/45 text-white [transform:translateZ(22px)]" style={{ borderColor: selected ? "#fff" : color }}>
        {person.display_name}
      </span>
      <span className="absolute left-1/2 -translate-x-1/2 top-[136px] whitespace-nowrap text-[8px] text-slate-300 [transform:translateZ(20px)]">
        {person.relation || "Family"}
        {age != null ? " · " + age + "y" : ""}
      </span>
    </button>
  );
}

export default function Vanshawali3D({ rootId, onClose }: { rootId: string; onClose: () => void }) {
  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Person | null>(null);
  const [zoom, setZoom] = useState(0.82);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/vanshawali?userId=" + encodeURIComponent(rootId), { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (live) { if (!d.tree) throw Error(d.error || "Family tree unavailable"); setTree(d.tree); } })
      .catch(e => live && setError(e.message || "Could not load family tree"))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [rootId]);

  const people = useMemo(() => {
    if (!tree) return [];
    const a: Person[] = [];
    const add = (p?: Person) => { if (p && !a.some(x => x.id === p.id)) a.push(p); };
    add(tree.centre);
    [...(tree.parents || []), ...(tree.spouses || []), ...(tree.children || []), ...(tree.siblings || [])].forEach(add);
    (tree.levels_up || []).flat().forEach(add);
    (tree.levels_down || []).flat().forEach(add);
    Object.values(tree.spouses_of || {}).flat().forEach(add);
    Object.values(tree.siblings_of || {}).flat().forEach(add);
    return a;
  }, [tree]);

  const layout = useMemo(() => {
    if (!tree) return [];
    const groups = new Map<number, Person[]>();
    people.forEach(p => {
      const g = generation(p, tree.centre.id);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(p);
    });
    const out: { p: Person; x: number; y: number; z: number }[] = [];
    Array.from(groups.keys()).sort((a,b) => b-a).forEach(g => {
      const list = groups.get(g)!;
      const gap = Math.max(120, 760 / Math.max(2, list.length));
      const mid = (list.length - 1) / 2;
      list.forEach((p, i) => out.push({ p, x: (i - mid) * gap, y: -g * 190, z: Math.sin(i * 1.4 + g) * 60 }));
    });
    return out;
  }, [people, tree]);

  const edgeList = useMemo(() => {
    if (!tree) return [];
    const edges: { a: string; b: string; color: string; style: string }[] = [];
    const seen = new Set<string>();
    const add = (a?: string, b?: string, color?: string, style = "blood") => {
      if (!a || !b || a === b || !layout.some(x => x.p.id === a) || !layout.some(x => x.p.id === b)) return;
      const k = [a,b].sort().join("|") + color;
      if (seen.has(k)) return;
      seen.add(k); edges.push({ a, b, color: color || REL.self, style });
    };
    people.forEach(p => {
      const v = p.via_id || p.via_parent_id || p.via_child_id;
      const r = String(p.relation || "").toLowerCase();
      add(v, p.id, r === "spouse" ? REL.spouse : ["sibling","brother","sister"].includes(r) ? REL.sibling : relationColor(p, tree.centre.id), r === "spouse" ? "marriage" : "blood");
    });
    (tree.parents || []).forEach(p => add(p.id, tree.centre.id, REL.parent));
    (tree.children || []).forEach(p => add(tree.centre.id, p.id, REL.child));
    (tree.spouses || []).forEach(p => add(tree.centre.id, p.id, REL.spouse, "marriage"));
    (tree.siblings || []).forEach(p => add(tree.centre.id, p.id, REL.sibling, "sibling"));
    return edges;
  }, [layout, people, tree]);

  const point = (id: string) => layout.find(x => x.p.id === id);
  const reset = () => setZoom(0.82);

  return (
    <div className="fixed inset-0 z-[100] bg-[#06111d] text-white overflow-hidden">
      <style>{`
        .v3d-stage { perspective: 1100px; perspective-origin: 50% 48%; }
        .v3d-world { transform-style: preserve-3d; }
        .v3d-node { transform-style: preserve-3d; }
        .v3d-node:hover { filter: brightness(1.15) drop-shadow(0 18px 24px rgba(0,0,0,.45)); }
        @keyframes v3dPulse { 0%,100%{opacity:.35;transform:scale(1)} 50%{opacity:.85;transform:scale(1.08)} }
        .v3d-pulse { animation:v3dPulse 2.4s ease-in-out infinite; }
      `}</style>
      <div className="absolute inset-x-0 top-0 z-30 p-3 flex items-start justify-between bg-gradient-to-b from-[#06111d] via-[#06111d]/90 to-transparent">
        <div><p className="text-[10px] uppercase tracking-[.22em] text-cyan-200/70">Digital Family Universe</p><h2 className="text-lg font-bold">3D Vansh Vruksh</h2><p className="text-[10px] text-slate-300">Living lineage · generations · relationships</p></div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center"><X size={18}/></button>
      </div>

      <div className="absolute left-3 top-24 z-20 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md p-3 text-[10px] text-slate-200">
        <div className="flex items-center gap-2 font-semibold mb-2"><Sparkles size={13} className="text-amber-300"/>Relationship key</div>
        {Object.entries({Self:REL.self,Parents:REL.parent,Grandparents:REL.grandparent,Ancestors:REL.ancestor,Children:REL.child,Spouse:REL.spouse,Siblings:REL.sibling}).map(([k,c])=><div key={k} className="flex items-center gap-2 py-0.5"><span className="w-2.5 h-2.5 rounded-full" style={{background:c}}/>{k}</div>)}
      </div>

      <div className="absolute right-3 top-24 z-20 flex flex-col gap-2">
        <button onClick={()=>setZoom(z=>Math.min(1.35,z+.12))} className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center"><ZoomIn size={16}/></button>
        <button onClick={()=>setZoom(z=>Math.max(.42,z-.12))} className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center"><ZoomOut size={16}/></button>
        <button onClick={reset} className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center"><RotateCcw size={15}/></button>
        <button onClick={()=>document.documentElement.requestFullscreen?.()} className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center"><Maximize2 size={15}/></button>
      </div>

      <div className="absolute left-3 bottom-4 z-30 flex gap-2 text-[10px] text-slate-300">
        <span className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/10 flex items-center gap-1.5"><Users size={12}/>{people.length} people</span>
        <span className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/10">Scroll/Pinch = zoom · drag = move view · tap = inspect</span>
      </div>

      {loading && <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#06111d]/90"><div className="text-center"><p className="text-sm font-semibold text-amber-300">Building your family universe…</p><p className="text-[10px] text-slate-400 mt-1">Loading generations and relationships</p></div></div>}
      {error && !loading && <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#06111d]/95"><div className="max-w-sm text-center px-6"><p className="text-sm font-semibold text-red-300">3D view could not start</p><p className="text-xs text-slate-400 mt-2">{error}</p><button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold">Back to Vanshavali</button></div></div>}

      {!loading && tree && (
        <div className="absolute inset-0 v3d-stage overflow-auto touch-pan-x touch-pan-y">
          <div className="min-w-[1100px] min-h-full flex items-center justify-center py-32">
            <div className="relative v3d-world" style={{ width: 980, height: 980, transform: "scale(" + zoom + ")" }}>
              <div className="absolute left-1/2 top-1/2 w-[720px] h-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10 v3d-pulse" />
              <div className="absolute left-1/2 top-1/2 w-[430px] h-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/10" />
              <svg className="absolute inset-0 pointer-events-none overflow-visible" viewBox="-490 -490 980 980">
                {edgeList.map((e,i)=>{const a=point(e.a),b=point(e.b);if(!a||!b)return null;const ax=a.x,ay=a.y,bx=b.x,by=b.y;const mx=(ax+bx)/2;const d="M "+ax+" "+ay+" Q "+mx+" "+(Math.min(ay,by)-55)+" "+bx+" "+by;return <path key={i} d={d} fill="none" stroke={e.color} strokeWidth={e.style==="marriage"?3:2.4} strokeDasharray={e.style==="marriage"?"8 7":"10 7"} opacity=".82"/>})}
              </svg>
              {layout.map(({p,x,y,z})=><div key={p.id} className="absolute left-1/2 top-1/2 v3d-node" style={{transform:"translate3d("+(x-43)+"px,"+(y-55)+"px,"+z+"px)"}}><MiniHuman person={p} color={relationColor(p,tree.centre.id)} selected={selected?.id===p.id} onClick={()=>setSelected(p)}/></div>)}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="absolute right-3 bottom-16 z-40 w-64 rounded-2xl border border-white/10 bg-[#07111f]/90 backdrop-blur-xl p-4 shadow-2xl">
          <div className="flex justify-between gap-2"><div><p className="text-sm font-bold">{selected.display_name}</p><p className="text-[10px] text-slate-400">{selected.relation || "Family member"}{ageOf(selected)!=null ? " · age " + ageOf(selected) : ""}</p></div><button onClick={()=>setSelected(null)}><X size={14}/></button></div>
          <div className="mt-3 space-y-1 text-[10px] text-slate-300"><p>Generation: {generation(selected,tree?.centre.id||"")===0?"Your generation":generation(selected,tree?.centre.id||"")>0 ? generation(selected,tree?.centre.id||"")+" level(s) above" : Math.abs(generation(selected,tree?.centre.id||""))+" level(s) below"}</p>{selected.birth_year&&<p>Born: {selected.birth_year}</p>}</div>
          <div className="mt-3 rounded-xl bg-white/5 p-2 text-[9px] text-slate-400 flex gap-2"><Info size={12} className="text-cyan-300 shrink-0"/>Relationship, age, generation and visual identity are driven from the existing family data.</div>
        </div>
      )}
    </div>
  );
}
