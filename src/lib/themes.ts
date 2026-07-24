// Automatic radial tree layout for the "Making Of" map, computed purely from
// the parent/child structure in content/themes.json — no hand-placed
// coordinates. Each node is placed relative to its parent: regions spread
// evenly in a full circle around the root, and every deeper generation fans
// out across an arc centered on its own parent's outward direction, so the
// tree visibly "grows" outward from the center. Re-nesting a theme in the
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

  // Nodes are allowed to sit close together, even overlap a little at the
  // edges — the reading panel's theatrical spotlight (see focusMul in
  // making-of.astro) is what keeps things legible: whatever isn't part of
  // the selected branch fades into the background, so a dim box behind a
  // lit one reads as depth, not clutter. Only the root needs a hard rule —
  // it's a single very wide, short box that stays lit at all times, so a
  // same-brightness region sitting behind it would genuinely disappear.
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
