// Custom Decap CMS preview for the "Making Of: Themes" collection — mirrors
// the reading panel from the live /making-of map (same fonts, colors, and
// block layout) so editors see roughly what a theme node will look like on
// the site while they're writing it, without needing the full interactive
// map here. Uses the no-build-step `createClass`/`h`/`CMS` globals the
// vendored bundle exposes, since this file isn't run through a bundler.
(function () {
  function toPlain(value, fallback) {
    if (value == null) return fallback;
    if (typeof value.toJS === 'function') return value.toJS();
    return value;
  }

  function get(data, key, fallback) {
    var value = typeof data.get === 'function' ? data.get(key) : data[key];
    return value == null ? fallback : value;
  }

  // Shared by every preview below: Decap's getAsset() resolves a stored
  // field path to a displayable URL, but throws if the media library isn't
  // ready yet (e.g. right after a fresh login) — fall back to "no image"
  // rather than crashing the whole preview pane.
  function resolveSrc(getAsset, file) {
    if (!file) return null;
    try {
      var resolved = getAsset(file);
      return resolved && resolved.toString ? resolved.toString() : resolved;
    } catch (e) {
      return null;
    }
  }

  var ThemePreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;
      var data = entry.get('data') || {};

      var number = get(data, 'number', '');
      var label = get(data, 'label', '(untitled theme)');
      var authors = get(data, 'authors', null);
      var parent = get(data, 'parent', null);
      var questions = toPlain(get(data, 'questions', null), []);
      var blocks = toPlain(get(data, 'blocks', null), []);

      var blockEls = blocks.map(function (b, i) {
        if (!b) return null;
        if (b.type === 'text') {
          return h('div', { key: i, className: 'mk-block-text' }, b.text || '');
        }
        var src = resolveSrc(getAsset, b.file);
        var mediaEl;
        if (b.type === 'image') {
          mediaEl = src
            ? h('img', { src: src, alt: b.caption || '' })
            : h('div', { className: 'mk-block-empty' }, 'No image selected yet');
        } else if (b.type === 'video') {
          mediaEl = src
            ? h('video', { src: src, controls: true })
            : h('div', { className: 'mk-block-empty' }, 'No video selected yet');
        } else if (b.type === 'audio') {
          mediaEl = h(
            'div',
            { className: 'mk-block-audio-wrap' },
            src ? h('audio', { src: src, controls: true }) : h('div', { className: 'mk-block-empty' }, 'No audio selected yet'),
          );
        } else {
          return null;
        }
        return h(
          'div',
          { key: i, className: 'mk-block-media' },
          mediaEl,
          b.caption ? h('div', { className: 'mk-block-caption' }, b.caption) : null,
        );
      });

      return h(
        'div',
        { className: 'mk-preview-panel' },
        parent ? h('div', { className: 'mk-eyebrow mk-preview-crumb' }, 'part of: ' + parent) : null,
        h('h2', { className: 'mk-panel-title' }, (number ? number + ' — ' : '') + label),
        authors ? h('div', { className: 'mk-panel-authors' }, 'DRAFT · ' + authors) : null,
        h('div', { className: 'mk-panel-rule' }),
        h('div', { className: 'mk-panel-blocks' }, blockEls),
        questions.length
          ? h(
              'div',
              { className: 'mk-panel-questions' },
              h('div', { className: 'mk-eyebrow mk-panel-label' }, 'Open questions'),
              questions.map(function (q, i) {
                return h('div', { key: i, className: 'mk-question' }, q);
              }),
            )
          : null,
      );
    },
  });

  // Custom preview for the Team page (file collection "pages", file "team")
  // — mirrors team.astro's grid rows so headshots preview at their real
  // ~190px bordered square instead of full native resolution.
  var TeamPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;
      var data = entry.get('data') || {};

      var eyebrow = get(data, 'eyebrow', '');
      var title = get(data, 'title', 'Team');
      var members = toPlain(get(data, 'members', null), []);

      var rows = members.map(function (m, i) {
        if (!m) return null;
        var src = resolveSrc(getAsset, m.photo);
        return h(
          'div',
          { key: i, className: 'tm-row' },
          h(
            'div',
            { className: 'tm-photo' },
            src ? h('img', { src: src, alt: m.name || '' }) : h('div', { className: 'tm-photo-empty' }, 'No photo yet'),
          ),
          h(
            'div',
            null,
            h('div', { className: 'tm-name' }, m.name || '(unnamed)'),
            m.role ? h('div', { className: 'tm-role' }, m.role) : null,
            m.bio ? h('div', { className: 'tm-bio' }, m.bio) : null,
          ),
        );
      });

      return h(
        'div',
        { className: 'cp-page' },
        eyebrow ? h('div', { className: 'cp-eyebrow' }, eyebrow) : null,
        h('h1', { className: 'cp-title' }, title),
        h('div', { className: 'tm-list' }, rows),
      );
    },
  });

  // Custom preview for the Home page (file collection "pages", file "home")
  // — mirrors index.astro's block layout so inline photos preview capped to
  // the real ~680px reading column instead of full native resolution.
  var HomePreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;
      var data = entry.get('data') || {};

      var eyebrow = get(data, 'eyebrow', '');
      var title = get(data, 'title', 'Home');
      var blocks = toPlain(get(data, 'blocks', null), []);
      var sourceNote = get(data, 'sourceNote', '');
      var links = toPlain(get(data, 'links', null), []);

      var blockEls = blocks.map(function (b, i) {
        if (!b) return null;
        if (b.type === 'text') {
          return h('div', { key: i, className: 'hp-text' }, b.text || '');
        }
        if (b.type === 'image') {
          var src = resolveSrc(getAsset, b.file);
          return h(
            'figure',
            { key: i, className: 'hp-image-block' },
            src ? h('img', { src: src, alt: b.alt || '' }) : h('div', { className: 'hp-image-empty' }, 'No image selected yet'),
            b.caption ? h('figcaption', { className: 'hp-image-caption' }, b.caption) : null,
          );
        }
        return null;
      });

      return h(
        'div',
        { className: 'cp-page' },
        eyebrow ? h('div', { className: 'cp-eyebrow' }, eyebrow) : null,
        h('h1', { className: 'cp-title' }, title),
        h(
          'div',
          { className: 'hp-inner' },
          blockEls,
          sourceNote ? h('div', { className: 'hp-source-note' }, sourceNote) : null,
          links.length
            ? h(
                'div',
                { className: 'hp-links-row' },
                links.map(function (l, i) {
                  return h('span', { key: i }, l && l.label);
                }),
              )
            : null,
        ),
      );
    },
  });

  // Custom preview for the Timelines folder collection (dejong/engers/swaab)
  // — mirrors timelines.astro's three image-size variants (default/full/
  // zoom, chosen the same way: full flag first, then whether zoom is set)
  // so event photos preview at roughly their real card-frame size instead
  // of full native resolution. Renders events as a simple single-column
  // list rather than the live page's alternating two-column spine — that
  // layout depends on build-time pixel math (src/lib/timelines.ts) that
  // doesn't apply here, and isn't what this preview needs to get right.
  var TL_TAG_LABELS = { mina: 'Mina', sara: 'Sara', both: 'Mina & Sara' };

  // Mirrors toLabel() in src/lib/timelines.ts. Many real events carry only a
  // legacy `serial` (an Excel day number) rather than an ISO date; without
  // resolving that here the preview labelled them "(undated)" while the live
  // site showed a proper date, which reads as broken data to an editor.
  var TL_EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
  var TL_DAY_MS = 86400000;
  var TL_MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];

  function tlFormatDate(ev) {
    if (ev.date_label) return ev.date_label;
    var serial = null;
    if (ev.serial != null && ev.serial !== '') {
      serial = Number(ev.serial);
    } else if (ev.date_iso) {
      var p = String(ev.date_iso).split('-').map(Number);
      if (p.length >= 3 && p.every(function (n) { return isFinite(n); })) {
        serial = (Date.UTC(p[0], p[1] - 1, p[2]) - TL_EXCEL_EPOCH_MS) / TL_DAY_MS;
      }
    }
    if (serial == null || !isFinite(serial)) return '(no date yet)';
    var dt = new Date(TL_EXCEL_EPOCH_MS + serial * TL_DAY_MS);
    return dt.getUTCDate() + ' ' + TL_MONTHS[dt.getUTCMonth()] + ' ' + dt.getUTCFullYear();
  }

  var TimelinePreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;
      var data = entry.get('data') || {};

      var name = get(data, 'name', '');
      var title = get(data, 'title', name || 'Timeline');
      var years = get(data, 'years', '');
      var episode = get(data, 'episode', '');
      var events = toPlain(get(data, 'events', null), []);

      var eventEls = events.map(function (ev, i) {
        if (!ev) return null;
        var imgEl = null;
        var img = ev.image;
        if (img && img.file) {
          var src = resolveSrc(getAsset, img.file);
          if (src) {
            var variant = img.full ? 'full' : img.zoom ? 'zoom' : 'default';
            var imgStyle =
              variant === 'zoom'
                ? { objectPosition: img.focus || 'center', transform: 'scale(' + (img.zoom || 1) + ')', transformOrigin: img.focus || 'center' }
                : undefined;
            imgEl = h(
              'div',
              { className: 'tl-ph-wrap' },
              h('img', { className: 'tl-img-' + variant, src: src, alt: img.caption || '', style: imgStyle }),
              img.caption ? h('div', { className: 'tl-img-caption' }, img.caption) : null,
            );
          }
        }
        return h(
          'div',
          { key: i, className: 'tl-event' },
          h('div', { className: 'tl-date' }, tlFormatDate(ev)),
          ev.sister ? h('div', { className: 'tl-tag' }, TL_TAG_LABELS[ev.sister] || ev.sister) : null,
          ev.heading ? h('div', { className: 'tl-heading' }, ev.heading) : null,
          ev.text ? h('div', { className: 'tl-text' }, ev.text) : null,
          imgEl,
        );
      });

      return h(
        'div',
        { className: 'cp-page' },
        h('div', { className: 'cp-eyebrow' }, 'Episode ' + episode + (years ? ' · ' + years : '')),
        h('h1', { className: 'cp-title' }, title),
        h('div', { className: 'tl-list' }, eventEls),
      );
    },
  });

  // Custom preview for the Podcast page (file collection "pages", file
  // "podcast") — no image fields, so this wasn't part of the original
  // oversized-image fix, but without it the editor falls back to Decap's
  // generic flat label:value dump, which also silently omits any field
  // that's currently empty (including the Audio file field on every act
  // before one's attached) — easy to mistake for "the field doesn't
  // exist". Mirrors podcast.astro's card/act layout, including its real
  // "Recording to follow" fallback text, and plays the actual audio file
  // when one's attached so an editor can confirm an upload worked without
  // leaving the CMS.
  var PodcastPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;
      var data = entry.get('data') || {};

      var eyebrow = get(data, 'eyebrow', '');
      var title = get(data, 'title', 'Podcast');
      var episodes = toPlain(get(data, 'episodes', null), []);
      var footerNote = get(data, 'footerNote', '');

      var episodeEls = episodes.map(function (ep, i) {
        if (!ep) return null;
        var acts = ep.acts || [];
        var actEls = acts.map(function (act, j) {
          if (!act) return null;
          var src = resolveSrc(getAsset, act.audio);
          return h(
            'div',
            { key: j, className: 'pc-act' },
            h('div', { className: 'pc-act-title' }, act.title || '(untitled act)'),
            src ? h('audio', { src: src, controls: true }) : h('div', { className: 'pc-act-note' }, 'Recording to follow'),
          );
        });
        return h(
          'div',
          { key: i, className: 'pc-card' },
          h(
            'div',
            { className: 'pc-card-head' },
            h('div', { className: 'pc-ep-title' }, ep.title || '(untitled episode)'),
            ep.numeral ? h('div', { className: 'pc-numeral' }, ep.numeral) : null,
          ),
          h('div', { className: 'pc-acts' }, actEls),
        );
      });

      return h(
        'div',
        { className: 'cp-page' },
        eyebrow ? h('div', { className: 'cp-eyebrow' }, eyebrow) : null,
        h('h1', { className: 'cp-title' }, title),
        h('div', { className: 'pc-list' }, episodeEls),
        footerNote ? h('div', { className: 'pc-footer-note' }, footerNote) : null,
      );
    },
  });

  CMS.registerPreviewStyle(
    [
      "body { background:#161320; margin:0; }",
      ".mk-preview-panel { font-family:'Courier Prime','Courier New',monospace; color:#e6e1d9; background:#262230; padding:26px 28px 44px; box-sizing:border-box; min-height:100vh; }",
      ".mk-eyebrow { text-transform:uppercase; letter-spacing:0.16em; font-weight:400; }",
      ".mk-preview-crumb { font-size:11px; color:#9a938a; margin-bottom:6px; }",
      ".mk-panel-title { font-weight:700; font-size:30px; line-height:1.14; letter-spacing:-0.02em; margin:4px 0 0; color:#f2eee6; }",
      ".mk-panel-authors { font-size:12px; letter-spacing:0.03em; color:#9a938a; margin-top:12px; }",
      ".mk-panel-rule { height:1px; background:#48c6a8; opacity:0.45; margin:18px 0; }",
      ".mk-panel-blocks { display:flex; flex-direction:column; gap:1.1rem; }",
      ".mk-block-text { font-size:17px; line-height:1.7; color:#e6e1d9; white-space:pre-wrap; }",
      ".mk-block-media { border:1px solid rgba(230,225,217,0.16); background:rgba(0,0,0,0.22); }",
      ".mk-block-media img, .mk-block-media video { display:block; width:100%; max-height:360px; object-fit:cover; }",
      ".mk-block-media audio { display:block; width:100%; }",
      ".mk-block-audio-wrap { padding:14px; }",
      ".mk-block-caption { font-size:12px; font-style:italic; line-height:1.5; color:#9a938a; padding:8px 10px; }",
      ".mk-block-empty { padding:14px; font-size:13px; color:#655e55; font-style:italic; }",
      ".mk-panel-label { font-size:12px; color:#9a938a; margin:26px 0 10px; }",
      ".mk-question { font-style:italic; font-size:16px; line-height:1.5; color:#e6e1d9; border-left:2px solid #48c6a8; padding-left:14px; margin:11px 0; }",

      // Shared page-header chrome (eyebrow + title) reused by Team/Home/
      // Timelines below — mirrors the live site's Hero component.
      ".cp-page { font-family:'Courier Prime','Courier New',monospace; color:#e0dbd4; background:#2c2830; padding:30px 32px 60px; box-sizing:border-box; min-height:100vh; }",
      ".cp-eyebrow { font-size:12px; letter-spacing:0.3em; text-transform:uppercase; color:rgba(224,219,212,0.5); margin-bottom:0.6rem; }",
      ".cp-title { font-size:2rem; font-weight:400; letter-spacing:0.03em; color:rgba(224,219,212,0.92); margin:0 0 1.8rem; }",

      // Team (mirrors src/pages/team.astro's .row/.photo/.name/.role/.bio)
      ".tm-list { display:flex; flex-direction:column; }",
      ".tm-row { display:grid; grid-template-columns:190px 1fr; gap:2.2rem; padding:1.6rem 0; border-bottom:1px solid rgba(255,255,255,0.08); align-items:start; }",
      ".tm-row:last-child { border-bottom:none; }",
      ".tm-photo { border:1px solid rgba(224,219,212,0.14); padding:6px; background:rgba(20,17,25,0.5); }",
      ".tm-photo img { width:100%; aspect-ratio:1/1; object-fit:cover; display:block; filter:saturate(0.95) brightness(0.97); }",
      ".tm-photo-empty { width:100%; aspect-ratio:1/1; display:flex; align-items:center; justify-content:center; text-align:center; font-size:11px; font-style:italic; color:#655e55; }",
      ".tm-name { font-size:15px; letter-spacing:0.05em; color:rgba(224,219,212,0.92); }",
      ".tm-role { font-size:13px; letter-spacing:0.14em; text-transform:uppercase; color:rgba(72,198,168,0.72); margin:0.45rem 0 0.9rem; line-height:1.7; }",
      ".tm-bio { font-size:14px; line-height:1.7; color:rgba(224,219,212,0.62); white-space:pre-wrap; }",

      // Home (mirrors src/pages/index.astro's .text-block/.image-block)
      ".hp-inner { max-width:680px; }",
      ".hp-text { font-size:15px; line-height:1.85; color:rgba(224,219,212,0.68); white-space:pre-wrap; }",
      ".hp-text + .hp-text { margin-top:1.6rem; }",
      ".hp-image-block { margin:2.4rem 0; border:1px solid rgba(224,219,212,0.14); padding:6px; background:rgba(20,17,25,0.5); }",
      ".hp-image-block img { width:100%; display:block; filter:saturate(0.55) brightness(0.9); }",
      ".hp-image-empty { padding:40px; text-align:center; font-size:12px; font-style:italic; color:#655e55; }",
      ".hp-image-caption { font-size:10px; letter-spacing:0.05em; color:rgba(224,219,212,0.32); padding:0.45rem 0.3rem 0.2rem; }",
      ".hp-source-note { font-size:12px; line-height:1.7; color:rgba(224,219,212,0.38); margin-top:2rem; font-style:italic; }",
      ".hp-links-row { margin-top:2.4rem; padding-top:1.6rem; border-top:1px solid rgba(255,255,255,0.08); display:flex; gap:2rem; flex-wrap:wrap; }",
      ".hp-links-row span { font-size:13px; letter-spacing:0.12em; text-transform:uppercase; color:#48c6a8; }",

      // Timelines (mirrors src/pages/timelines.astro's .ci/.ph-wrap/img-* variants)
      ".tl-list { display:flex; flex-direction:column; gap:1.2rem; max-width:410px; }",
      ".tl-event { background:rgba(20,17,25,0.97); border:1px solid rgba(72,198,168,0.35); border-radius:2px; padding:1.1rem 1.3rem; }",
      ".tl-date { font-size:15px; font-weight:700; letter-spacing:0.06em; color:rgba(58,168,190,0.8); font-family:'JetBrains Mono',monospace; margin-bottom:0.5rem; }",
      ".tl-tag { font-size:11.5px; letter-spacing:0.26em; text-transform:uppercase; margin-bottom:0.5rem; color:rgba(224,219,212,0.42); }",
      ".tl-heading { font-size:12px; letter-spacing:0.16em; text-transform:uppercase; margin-bottom:0.6rem; color:#48c6a8; }",
      ".tl-text { font-size:15px; color:rgba(224,219,212,0.82); line-height:1.8; white-space:pre-wrap; }",
      ".tl-ph-wrap { margin-top:1rem; border:1px solid rgba(224,219,212,0.12); overflow:hidden; background:rgba(0,0,0,0.25); }",
      ".tl-img-default { max-width:100%; max-height:420px; width:auto; height:auto; display:block; margin:0 auto; }",
      ".tl-img-full { max-width:100%; display:block; }",
      ".tl-img-zoom { width:100%; display:block; height:320px; object-fit:cover; }",
      ".tl-img-caption { font-size:12px; letter-spacing:0.05em; color:rgba(224,219,212,0.62); padding:0.5rem 0.65rem; font-style:italic; }",

      // Podcast (mirrors src/pages/podcast.astro's .card/.card-inner/.act)
      ".pc-list { display:flex; flex-direction:column; gap:1.6rem; max-width:620px; }",
      ".pc-card { background:rgba(20,17,25,0.94); border:1px solid rgba(72,198,168,0.4); border-radius:2px; padding:1.4rem 1.6rem 1.5rem; }",
      ".pc-card-head { display:flex; align-items:baseline; justify-content:space-between; gap:1rem; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:0.9rem; margin-bottom:0.2rem; }",
      ".pc-ep-title { font-size:1.1rem; letter-spacing:0.04em; color:rgba(224,219,212,0.92); }",
      ".pc-numeral { font-size:26px; color:rgba(224,219,212,0.16); line-height:1; }",
      ".pc-act { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem 0; border-bottom:1px solid rgba(255,255,255,0.06); }",
      ".pc-act:last-child { border-bottom:none; padding-bottom:0; }",
      ".pc-act-title { font-size:0.92rem; letter-spacing:0.04em; color:rgba(224,219,212,0.88); }",
      ".pc-act-note { font-size:11.5px; font-style:italic; color:rgba(224,219,212,0.4); }",
      ".pc-act audio { height:32px; max-width:220px; }",
      ".pc-footer-note { text-align:center; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:rgba(224,219,212,0.3); margin-top:0.5rem; }",
    ].join('\n'),
    { raw: true },
  );

  CMS.registerPreviewTemplate('themes', ThemePreview);
  // Registered by each FILE's own name, not the collection name — Decap
  // keys file-collection previews by entry slug (= file name), unlike
  // folder collections which key by the collection's own name (confirmed
  // in node_modules/decap-cms-core/src/reducers/collections.ts's
  // selectTemplateName: FILES -> slug, FOLDER -> collection.get('name')).
  CMS.registerPreviewTemplate('team', TeamPreview);
  CMS.registerPreviewTemplate('home', HomePreview);
  CMS.registerPreviewTemplate('podcast', PodcastPreview);
  // "timelines" is a *files* collection (three files, each with its own
  // schema — see config.yml), so it registers per file name, not once
  // under the collection name the way the folder collections above do.
  CMS.registerPreviewTemplate('dejong', TimelinePreview);
  CMS.registerPreviewTemplate('engers', TimelinePreview);
  CMS.registerPreviewTemplate('swaab', TimelinePreview);
})();
