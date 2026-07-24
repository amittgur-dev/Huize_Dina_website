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

      function resolveSrc(file) {
        if (!file) return null;
        try {
          var resolved = getAsset(file);
          return resolved && resolved.toString ? resolved.toString() : resolved;
        } catch (e) {
          return null;
        }
      }

      var blockEls = blocks.map(function (b, i) {
        if (!b) return null;
        if (b.type === 'text') {
          return h('div', { key: i, className: 'mk-block-text' }, b.text || '');
        }
        var src = resolveSrc(b.file);
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
    ].join('\n'),
    { raw: true },
  );

  CMS.registerPreviewTemplate('themes', ThemePreview);
})();
