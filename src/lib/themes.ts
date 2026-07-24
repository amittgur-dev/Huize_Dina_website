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
// Half-diagonal of each level's on-screen box (measured from the rendered
// LEVEL_CFG sizes in making-of.astro, worst case across wrapped labels) —
// the safe clearance radius regardless of which direction a box sits from
// another, since boxes stay axis-aligned rather than rotating to face their
// neighbor. Index 0 is the root; 1-4 are regions through level-3 leaves.
const CLEARANCE = [760, 410, 255, 225, 175];

function clearanceFor(level: number): number {
  return CLEARANCE[Math.min(level + 1, CLEARANCE.length - 1)];
}

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

  const MARGIN = 1.12;
  // Parent and child sit at different camera z-depths (see ZLEVEL in
  // making-of.astro), so under the perspective camera their on-screen gap
  // isn't just their world-space distance times some shared scale — a
  // branch that's off-center from wherever the camera happens to be looking
  // gets extra parallax compression between its own depth layers. A flat
  // world-space clearance check (accurate for same-depth siblings) isn't
  // enough for cross-depth parent/child pairs, so they get a larger margin.
  const PARENT_MARGIN = 2.5;

  // Minimum angle (in degrees) between two points at `radius` so two boxes
  // needing `combinedClearance` between their centers don't touch.
  function minGapDeg(radius: number, combinedClearance: number): number {
    const ratio = Math.min(0.98, (combinedClearance * MARGIN) / radius);
    return (2 * Math.asin(ratio) * 180) / Math.PI;
  }

  // Radius that puts n points, evenly spread across `arcSpan` degrees
  // (or the full circle when arcSpan is 360), far enough apart that
  // `combinedClearance` fits between any two adjacent ones.
  function radiusForGap(arcSpan: number, n: number, combinedClearance: number): number {
    const halfGapDeg = arcSpan / n / 2;
    return (combinedClearance * MARGIN) / Math.sin(halfGapDeg * (Math.PI / 180));
  }

  // `angularBudget` is how much of the circle this branch is allowed to fan
  // across without risking crossing into a sibling branch's territory — it
  // shrinks every generation so deep fans can't bleed sideways into a
  // neighboring cousin branch.
  function layoutChildren(parentId: string, angularBudget: number) {
    const kids = childrenOf[parentId] || [];
    const n = kids.length;
    if (!n) return;
    const parent = pos[parentId];
    const parentNode = byId[parentId];
    const level = parentNode.level + 1;
    const baseRadius = RADIUS[Math.min(level, RADIUS.length - 1)];
    const clearance = clearanceFor(level);
    const parentClearance = clearanceFor(parentNode.level);

    if (parentId === root.id) {
      // Regions: spread evenly around the full circle, starting off-axis
      // (-45 instead of -90) so a region never lands directly above/below or
      // left/right of the root node — the root's box is much wider than it
      // is tall, so an axis-aligned region can sit inside its horizontal
      // extent even at a generous radius, while a diagonal placement clears
      // it using the root's (much smaller) vertical extent instead.
      const slice = 360 / n;
      let radius = baseRadius;
      if (minGapDeg(radius, clearance * 2) > slice) radius = radiusForGap(360, n, clearance * 2);
      // Regions also need to individually clear the root's own box —
      // required distance depends on the region's angle relative to root's
      // (wide, short) box, so use the conservative half-diagonal bound.
      radius = Math.max(radius, (parentClearance + clearance) * PARENT_MARGIN);
      kids.forEach((id, i) => {
        const angle = -45 + slice * i;
        const rad = (angle * Math.PI) / 180;
        pos[id] = { x: parent.x + radius * Math.cos(rad), y: parent.y + radius * Math.sin(rad), angle };
        layoutChildren(id, slice * 0.82);
      });
    } else {
      // Deeper generations: fan across an arc centered on the parent's own
      // outward direction, so the tree keeps growing away from the center.
      // The arc widens with sibling count (so a lone child doesn't fan at
      // all, and a crowded parent spreads further) but never past its
      // angular budget; if even the budget isn't enough room at the default
      // radius, push this branch further out instead so siblings still
      // clear each other.
      let arc = 0;
      let radius = baseRadius;
      if (n > 1) {
        const needed = minGapDeg(baseRadius, clearance * 2) * (n - 1);
        if (needed <= angularBudget) {
          arc = needed;
        } else {
          arc = angularBudget;
          radius = Math.max(baseRadius, radiusForGap(arc, n - 1, clearance * 2));
        }
      }
      // A lone child fans at zero degrees — sitting directly on the same ray
      // as its parent — so sibling spacing alone doesn't guarantee it clears
      // the parent's own box. Require the radius to cover both boxes'
      // clearance radii regardless of sibling count; this is conservative
      // (it doesn't know the actual angle relative to each box's width vs.
      // height) but guarantees no parent/child overlap at any orientation.
      radius = Math.max(radius, (parentClearance + clearance) * PARENT_MARGIN);
      kids.forEach((id, i) => {
        const angle = n === 1 ? parent.angle : parent.angle - arc / 2 + (arc * i) / (n - 1);
        const rad = (angle * Math.PI) / 180;
        pos[id] = { x: parent.x + radius * Math.cos(rad), y: parent.y + radius * Math.sin(rad), angle };
        const childBudget = n > 1 ? Math.max(24, (arc / (n - 1)) * 0.82) : angularBudget * 0.82;
        layoutChildren(id, childBudget);
      });
    }
  }
  layoutChildren(root.id, 360);

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
