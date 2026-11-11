// Automatic radial tree layout for the "Making Of" map, computed purely from
// the parent/child structure in content/themes.json — no hand-placed
// coordinates. Each node is placed relative to its parent: regions spread
// evenly in a full circle around the root, and every deeper generation fans
// out across an arc centered on its own parent's outward direction, so the
// tree visibly "grows" outward from the center. A final pass then nudges
// apart any boxes that would overlap on screen. Re-nesting a theme in the
// CMS just changes which parent it fans out from; nothing needs re-placing.

// Node content is an ordered list of blocks, not a fixed blurb+media split —
// editors choose exactly where each image/audio/video clip sits relative to
// the surrounding text by reordering blocks, the same pattern used for the
// Home page (content/pages/home.json).
export interface RawContentBlock {
  type: 'text' | 'image' | 'audio' | 'video';
  text: string | null;
  file: string | null;
  caption: string | null;
}

export interface RawThemeNode {
  id: string;
  number: string;
  label: string;
  level: number;
  parent: string | null;
  blocks: RawContentBlock[] | null;
  questions: string[] | null;
  authors: string | null;
}

export interface RawCrossLink {
  from: string;
  to: string;
  note: string;
}

export interface RawThemesData {
  regionColors: Record<string, string>;
  nodes: RawThemeNode[];
  crossLinks: RawCrossLink[];
}

export interface LayoutNode {
  id: string;
  number: string;
  label: string;
  level: number;
  parent: string | null;
  blocks: RawContentBlock[];
  questions: string[];
  authors: string | null;
  color: string;
  x: number;
  y: number;
  children: string[];
}

export interface LayoutLink {
  from: string;
  to: string;
  note: string;
}

export interface ThemeMap {
  nodes: LayoutNode[];
  links: LayoutLink[];
  regionColors: Record<string, string>;
  bbox: { minx: number; miny: number; maxx: number; maxy: number };
}

const RADIUS = [950, 780, 560, 500];
const ARC = [160, 130, 100];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Mirrors of the map page's own constants (LEVEL_CFG, ZLEVEL, F in
// making-of.astro) — the relaxation pass below needs to know roughly how big
// each node is drawn and how its depth plane scales, to tell what overlaps.
// Change one, change the other.
const NODE_BOX: Record<number, { w: number; font: number; px: number; py: number }> = {
  [-1]: { w: 1400, font: 124, px: 60, py: 46 },
  0: { w: 760, font: 84, px: 36, py: 30 },
  1: { w: 440, font: 44, px: 22, py: 18 },
  2: { w: 380, font: 36, px: 18, py: 14 },
  3: { w: 330, font: 31, px: 16, py: 12 },
};
const PLANE_Z: Record<number, number> = { [-1]: 40, 0: 340, 1: 660, 2: 980, 3: 1300 };
const FOCAL = 1300;
// A typical overview camera distance. Nodes on different depth planes
// shift against each other as the camera moves (parallax), so "overlap" is
// judged from here; nodes sharing a plane keep their spacing at any zoom.
const RELAX_CAM_Z = -3800;

function estimateBox(n: RawThemeNode): { w: number; h: number } {
  const b = NODE_BOX[n.level] ?? NODE_BOX[3];
  // Courier is monospaced: ~0.6em per character
  const perLine = Math.max(4, Math.floor((b.w - b.px * 2) / (b.font * 0.6)));
  let lines = 1;
  let run = 0;
  n.label.split(/\s+/).forEach((word) => {
    const need = run ? run + 1 + word.length : word.length;
    if (run && need > perLine) {
      lines++;
      run = word.length;
    } else run = need;
  });
  let h = b.py * 2 + lines * b.font * 1.15;
  if (n.level >= 1) h += b.font * 0.44 * 1.2 + b.font * 0.18;
  return { w: b.w, h };
}

function relaxLayout(nodes: RawThemeNode[], pos: Record<string, { x: number; y: number; angle: number }>) {
  const items = nodes
    .filter((n) => pos[n.id])
    .map((n) => {
      const k = FOCAL / ((PLANE_Z[n.level] ?? 0) - RELAX_CAM_Z);
      const box = estimateBox(n);
      const px = pos[n.id].x * k;
      const py = pos[n.id].y * k;
      return {
        id: n.id,
        k,
        px,
        py,
        ox: px,
        oy: py,
        // half-extents on screen, with breathing room
        hw: (box.w * k * 1.1) / 2,
        hh: (box.h * k * 1.22) / 2,
        // the root and the regions are the map's skeleton — they stay put
        fixed: n.level <= 0,
      };
    });

  for (let iter = 0; iter < 120; iter++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (a.fixed && b.fixed) continue;
        const dx = b.px - a.px;
        const dy = b.py - a.py;
        const ox = a.hw + b.hw - Math.abs(dx);
        const oy = a.hh + b.hh - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        // separate along whichever axis needs the smaller push
        const alongX = ox < oy;
        const push = (alongX ? ox : oy) + 0.5;
        const dir = (alongX ? dx : dy) >= 0 ? 1 : -1;
        const wa = a.fixed ? 0 : b.fixed ? 1 : 0.5;
        const wb = b.fixed ? 0 : a.fixed ? 1 : 0.5;
        if (alongX) {
          a.px -= dir * push * wa;
          b.px += dir * push * wb;
        } else {
          a.py -= dir * push * wa;
          b.py += dir * push * wb;
        }
      }
    }
    if (!moved) break;
    // a light pull back toward where the radial layout put each node, so
    // the tree keeps its shape instead of drifting apart
    items.forEach((it) => {
      if (it.fixed) return;
      it.px += (it.ox - it.px) * 0.02;
      it.py += (it.oy - it.py) * 0.02;
    });
  }

  items.forEach((it) => {
    if (it.fixed) return;
    pos[it.id].x = it.px / it.k;
    pos[it.id].y = it.py / it.k;
  });
}

export function buildThemeMap(raw: RawThemesData): ThemeMap {
  const byId: Record<string, RawThemeNode> = {};
  raw.nodes.forEach((n) => (byId[n.id] = n));

  const childrenOf: Record<string, string[]> = {};
  raw.nodes.forEach((n) => {
    if (n.parent) (childrenOf[n.parent] ??= []).push(n.id);
  });

  const root = raw.nodes.find((n) => n.level === -1);
  if (!root) throw new Error('themes.json: missing a root node with level -1');

  const pos: Record<string, { x: number; y: number; angle: number }> = {
    [root.id]: { x: 0, y: 0, angle: -90 },
  };

  // The fan-out below spaces siblings by angle alone, without regard to how
  // wide their boxes are, so neighbours (and first-ring themes of adjacent
  // regions) can land on top of each other. relaxLayout() afterwards nudges
  // any such pairs apart.
  function layoutChildren(parentId: string) {
    const kids = childrenOf[parentId] || [];
    if (!kids.length) return;
    const parent = pos[parentId];
    const parentNode = byId[parentId];
    const level = parentNode.level + 1;
    const radius = RADIUS[Math.min(level, RADIUS.length - 1)];

    if (parentId === root.id) {
      // Regions: spread evenly around the full circle, starting off-axis
      // (-45 instead of -90) so a region never lands directly above/below or
      // left/right of the root node — the root's box is much wider than it
      // is tall, so an axis-aligned region can sit inside its horizontal
      // extent even at a generous radius, while a diagonal placement clears
      // it using the root's (much smaller) vertical extent instead.
      kids.forEach((id, i) => {
        const angle = -45 + (360 / kids.length) * i;
        const rad = (angle * Math.PI) / 180;
        pos[id] = { x: parent.x + radius * Math.cos(rad), y: parent.y + radius * Math.sin(rad), angle };
      });
    } else {
      // Deeper generations: fan across an arc centered on the parent's own
      // outward direction, so the tree keeps growing away from the center.
      const arc = ARC[Math.min(level - 1, ARC.length - 1)];
      kids.forEach((id, i) => {
        const angle = kids.length === 1 ? parent.angle : parent.angle - arc / 2 + (arc * i) / (kids.length - 1);
        const rad = (angle * Math.PI) / 180;
        pos[id] = { x: parent.x + radius * Math.cos(rad), y: parent.y + radius * Math.sin(rad), angle };
      });
    }
    kids.forEach((id) => layoutChildren(id));
  }
  layoutChildren(root.id);

  relaxLayout(raw.nodes, pos);

  function topRegionLabel(n: RawThemeNode): string | null {
    let cur: RawThemeNode | undefined = n;
    while (cur && cur.level > 0) {
      cur = cur.parent ? byId[cur.parent] : undefined;
    }
    return cur && cur.level === 0 ? cur.label : null;
  }

  const nodes: LayoutNode[] = raw.nodes.map((n) => {
    const p = pos[n.id] || { x: 0, y: 0 };
    let color = raw.regionColors.root;
    if (n.level === 0) {
      color = raw.regionColors[slugify(n.label)] || raw.regionColors.root;
    } else if (n.level > 0) {
      const topLabel = topRegionLabel(n);
      color = (topLabel && raw.regionColors[slugify(topLabel)]) || raw.regionColors.root;
    }
    return {
      id: n.id,
      number: n.number,
      label: n.label,
      level: n.level,
      parent: n.parent,
      blocks: n.blocks || [],
      questions: n.questions || [],
      authors: n.authors,
      color,
      x: p.x,
      y: p.y,
      children: childrenOf[n.id] || [],
    };
  });

  let minx = Infinity;
  let miny = Infinity;
  let maxx = -Infinity;
  let maxy = -Infinity;
  nodes.forEach((n) => {
    minx = Math.min(minx, n.x);
    miny = Math.min(miny, n.y);
    maxx = Math.max(maxx, n.x);
    maxy = Math.max(maxy, n.y);
  });

  const links: LayoutLink[] = raw.crossLinks.map((l) => ({ from: l.from, to: l.to, note: l.note }));

  return { nodes, links, regionColors: raw.regionColors, bbox: { minx, miny, maxx, maxy } };
}
