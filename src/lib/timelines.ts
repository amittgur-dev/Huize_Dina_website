// Layout engine for the Timelines page, ported from the design prototype's
// renderVals() logic (design_reference/Polyphonic Archive.dc.html) so the
// spacing/scale behavior matches exactly, but computed at Astro build time
// instead of every animation frame in the browser.

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 86400000;
const MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];

export interface RawImage {
  file: string;
  caption: string;
  full?: boolean | null;
  focus?: string | null;
  zoom?: number | null;
}

export interface RawEvent {
  date_iso: string | null;
  date_label: string | null;
  serial: number | null;
  heading: string;
  text: string;
  sister?: 'mina' | 'sara' | 'both' | null;
  image?: RawImage | null;
}

export interface RawTimeline {
  slug: string;
  episode: string;
  name: string;
  title: string;
  years: string;
  events: RawEvent[];
}

export interface PositionedImage {
  src: string;
  caption: string;
  variant: 'full' | 'zoom' | 'default';
  focus: string;
  zoom: number;
}

export interface PositionedEvent {
  idx: number;
  top: number;
  isLeft: boolean;
  date: string;
  heading: string;
  text: string;
  tag: 'mina' | 'sara' | 'both' | null;
  tagLabel: string;
  image: PositionedImage | null;
}

export interface RulerMark {
  year: string;
  top: number;
}

export interface BuiltTimeline {
  slug: string;
  episode: string;
  name: string;
  title: string;
  years: string;
  events: PositionedEvent[];
  rulers: RulerMark[];
  totalH: number;
  yrMin: number;
  yrMax: number;
  tagIndex: { mina: number; sara: number };
}

function toSerial(ev: RawEvent): number {
  if (ev.serial != null) return ev.serial;
  const [y, m, d] = (ev.date_iso as string).split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - EXCEL_EPOCH_MS) / DAY_MS;
}

function toLabel(ev: RawEvent, serial: number): string {
  if (ev.date_label) return ev.date_label;
  const dt = new Date(EXCEL_EPOCH_MS + serial * DAY_MS);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

function estimateHeight(ev: RawEvent): number {
  let h = 116;
  h += Math.ceil(ev.text.length / 30) * 34;
  if (ev.image) h += ev.image.full ? 640 : 430;
  return h;
}

const TAG_LABELS: Record<string, string> = { mina: 'Mina', sara: 'Sara', both: 'Mina & Sara' };

export function buildTimeline(raw: RawTimeline): BuiltTimeline {
  const PAD = 300;
  const SEQ_GAP = 110;
  const SIDE_GAP = 56;

  const serials = raw.events.map(toSerial);
  const MIN = Math.min(...serials);
  const MAX = Math.max(...serials);
  const span = Math.max(1, MAX - MIN);
  const SCALE = Math.max(0.42, 4200 / span);

  let lBot = PAD - 120;
  let rBot = PAD - 120;
  let prevPos = PAD - SEQ_GAP;
  const tops: number[] = raw.events.map((ev, i) => {
    const isLeft = i % 2 === 1;
    const base = PAD + (serials[i] - MIN) * SCALE;
    const sideBot = isLeft ? lBot : rBot;
    const pos = Math.max(base, sideBot + SIDE_GAP, prevPos + SEQ_GAP);
    prevPos = pos;
    const h = estimateHeight(ev);
    if (isLeft) lBot = pos + h;
    else rBot = pos + h;
    return Math.round(pos);
  });
  const totalH = Math.max(lBot, rBot) + 320;

  const tagIndex = { mina: -1, sara: -1 };
  raw.events.forEach((ev, i) => {
    if (ev.sister === 'mina' && tagIndex.mina < 0) tagIndex.mina = i;
    if (ev.sister === 'sara' && tagIndex.sara < 0) tagIndex.sara = i;
  });

  const events: PositionedEvent[] = raw.events.map((ev, i) => {
    let image: PositionedImage | null = null;
    if (ev.image) {
      const variant: PositionedImage['variant'] = ev.image.full ? 'full' : ev.image.zoom ? 'zoom' : 'default';
      image = {
        src: `/${ev.image.file}`,
        caption: ev.image.caption,
        variant,
        focus: ev.image.focus || 'center',
        zoom: ev.image.zoom || 1,
      };
    }
    return {
      idx: i,
      top: tops[i],
      isLeft: i % 2 === 1,
      date: toLabel(ev, serials[i]),
      heading: ev.heading,
      text: ev.text,
      tag: ev.sister ?? null,
      tagLabel: ev.sister ? TAG_LABELS[ev.sister] : '',
      image,
    };
  });

  const yrMin = new Date(EXCEL_EPOCH_MS + MIN * DAY_MS).getUTCFullYear();
  const yrMax = new Date(EXCEL_EPOCH_MS + MAX * DAY_MS).getUTCFullYear();
  const step = Math.max(1, Math.round((yrMax - yrMin) / 5));
  const rulers: RulerMark[] = [];
  for (let y = yrMin; y <= yrMax; y += step) {
    const s = (Date.UTC(y, 0, 1) - EXCEL_EPOCH_MS) / DAY_MS;
    if (s < MIN) continue;
    rulers.push({ year: String(y), top: Math.round(PAD + (s - MIN) * SCALE) });
  }

  return {
    slug: raw.slug,
    episode: raw.episode,
    name: raw.name,
    title: raw.title,
    years: raw.years,
    events,
    rulers,
    totalH,
    yrMin,
    yrMax,
    tagIndex,
  };
}
