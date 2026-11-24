// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/common.js. Replace module by module; do not edit in place.
/* Shared helpers for the XP desktop apps: DOM builder with ru/en binding, menus, toolbars,
   status bars, clipboard, icons and the content data (projects, contacts).
   Defines window.XPApps; registers no app itself. */
(function () {
  'use strict';

  var reducedMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function isDict(v) {
    return v && typeof v === 'object' && !v.nodeType && !Array.isArray(v) && ('ru' in v || 'en' in v);
  }

  function svg(body, vb) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (vb || '0 0 32 32') + '" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /* ---------------------------------------------------------------- icons (32x32, original) */
  // Style: flat fills, a darker 1px outline, a soft white highlight on the upper half, a faint ground shadow.
  var SH = '<ellipse cx="16" cy="29.5" rx="11" ry="1.6" fill="#000" opacity=".18"/>';
  var icons = {
    folder: svg(SH +
      '<path d="M3 8.5c0-1 .7-1.7 1.7-1.7h7l2.2 2.4h13.4c1 0 1.7.7 1.7 1.7V26c0 1-.7 1.7-1.7 1.7H4.7C3.7 27.7 3 27 3 26z" fill="#e8b33a" stroke="#a87412"/>' +
      '<path d="M3.6 12.6h24.8l-1 14.2c0 .5-.4.9-.9.9H5.5c-.5 0-.9-.4-.9-.9z" fill="#ffd767" stroke="#c18a1c"/>' +
      '<path d="M4.4 13.4h23.2l-.2 4.2c-7 1.4-15.6 1.4-22.8 0z" fill="#fff" opacity=".45"/>'),
    projects: svg(SH +
      '<path d="M3 8.5c0-1 .7-1.7 1.7-1.7h7l2.2 2.4h13.4c1 0 1.7.7 1.7 1.7V26c0 1-.7 1.7-1.7 1.7H4.7C3.7 27.7 3 27 3 26z" fill="#e8b33a" stroke="#a87412"/>' +
      '<rect x="8" y="5" width="15" height="12" rx="1" fill="#fff" stroke="#7a8ca8"/>' +
      '<path d="M10 8h9M10 10.5h11M10 13h7" stroke="#4a7fd4" stroke-width="1.2"/>' +
      '<path d="M3.6 12.6h24.8l-1 14.2c0 .5-.4.9-.9.9H5.5c-.5 0-.9-.4-.9-.9z" fill="#ffd767" stroke="#c18a1c"/>' +
      '<path d="M4.4 13.4h23.2l-.2 4.2c-7 1.4-15.6 1.4-22.8 0z" fill="#fff" opacity=".45"/>' +
      '<path d="M22 17.5l1.6 3.2 3.5.5-2.5 2.4.6 3.5-3.2-1.7-3.1 1.7.6-3.5-2.5-2.4 3.5-.5z" fill="#3d8ef0" stroke="#1d5bb0" stroke-linejoin="round"/>'),
    verifikat: svg(SH +
      '<path d="M16 3l11 4v8c0 7-4.8 11.6-11 14-6.2-2.4-11-7-11-14V7z" fill="#2f9e5b" stroke="#17663a"/>' +
      '<path d="M16 4.6l9.4 3.4v7c0 1.1-.1 2-.4 3-5.6-1.6-12.4-1.6-18 0-.3-1-.4-1.9-.4-3V8z" fill="#fff" opacity=".28"/>' +
      '<path d="M10.5 15.8l3.8 3.8 7.4-7.6" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'),
    kompy: svg(SH +
      '<circle cx="16" cy="16" r="13.6" fill="#fff"/>' +
      '<circle cx="16" cy="16" r="12.4" fill="none" stroke="#0a7ff2" stroke-width="3.4"/>' +
      '<path d="M16 7.4l2.3 6.3 6.3 2.3-6.3 2.3-2.3 6.3-2.3-6.3-6.3-2.3 6.3-2.3z" fill="#0a7ff2" stroke="#0a7ff2" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="16" cy="16" r="1.6" fill="#fff"/>'),
    wax: svg(SH +
      '<path d="M6 7h20l-2.6 21H8.6z" fill="#f2f2ee" stroke="#8a8a86"/>' +
      '<path d="M6.6 11.2h18.8" stroke="#c9c9c4"/>' +
      '<ellipse cx="16" cy="7" rx="10" ry="2.6" fill="#fff" stroke="#8a8a86"/>' +
      '<ellipse cx="16" cy="7.3" rx="8.4" ry="1.8" fill="#b03adf"/>' +
      '<path d="M11 6.6l2.4-1.4 1.6 1.6-2.2 1.2zM17.4 6.2l2.6-.8.8 1.6-2.6.6z" fill="#e7b6ff" opacity=".85"/>' +
      '<path d="M9 10l1.8 16" stroke="#fff" stroke-width="1.4" opacity=".7"/>'),
    resume: svg(SH +
      '<path d="M7 3h13l6 6v19H7z" fill="#fff" stroke="#6b7d99"/>' +
      '<path d="M20 3v6h6" fill="#dfe7f3" stroke="#6b7d99" stroke-linejoin="round"/>' +
      '<rect x="10" y="7" width="6" height="7" rx=".6" fill="#9cc0ef" stroke="#4f78b6" stroke-width=".8"/>' +
      '<circle cx="13" cy="9.6" r="1.5" fill="#fff"/><path d="M10.6 13.6c.5-1.6 1.4-2.2 2.4-2.2s1.9.6 2.4 2.2" fill="#fff"/>' +
      '<path d="M10 17h13M10 19.5h13M10 22h9M10 24.5h11" stroke="#7d93b5" stroke-width="1.1"/>' +
      '<path d="M18 7.5h5M18 10h5" stroke="#d14b3c" stroke-width="1.2"/>'),
    computer: svg(SH +
      '<rect x="4" y="3.5" width="24" height="18" rx="2" fill="#d9d4c3" stroke="#7d7764"/>' +
      '<rect x="6.5" y="6" width="19" height="13" fill="#2b62d1" stroke="#1b3f8a"/>' +
      '<path d="M6.5 15.5c4-3 9-3.4 19-1.2V19h-19z" fill="#4fae3c"/>' +
      '<path d="M6.5 6h19v5c-6 1.6-13 1.6-19 0z" fill="#fff" opacity=".25"/>' +
      '<path d="M12 21.5h8l1.5 3.5h-11z" fill="#c4bea9" stroke="#7d7764"/>' +
      '<rect x="7" y="25" width="18" height="3" rx="1" fill="#e7e2d1" stroke="#7d7764"/>' +
      '<circle cx="24.5" cy="20.2" r=".7" fill="#4ade55"/>'),
    contact: svg(SH +
      '<rect x="3" y="7" width="26" height="18" rx="1.5" fill="#fffdf4" stroke="#8a7a52"/>' +
      '<path d="M3.6 7.8L16 17.5 28.4 7.8" fill="none" stroke="#8a7a52"/>' +
      '<path d="M3.6 24.4l9.2-8.8M28.4 24.4l-9.2-8.8" stroke="#c8bb94"/>' +
      '<rect x="21.5" y="9.5" width="5" height="5.5" fill="#e55a3c" stroke="#a5321b" stroke-width=".8"/>' +
      '<circle cx="11" cy="22" r="5.4" fill="#2f7fe0" stroke="#1a56a8"/>' +
      '<path d="M12.4 22a1.4 1.4 0 1 1-1.4-1.4 1.4 1.4 0 0 1 1.4 1.4v.6c0 .8.6 1.3 1.2 1.3.8 0 1.3-.9 1.3-1.9a3.9 3.9 0 1 0-1.6 3.1" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>'),
    terminal: svg(SH +
      '<rect x="3" y="5" width="26" height="22" rx="1.5" fill="#101418" stroke="#3a4048"/>' +
      '<rect x="3" y="5" width="26" height="4.5" rx="1.5" fill="#3b7be0"/>' +
      '<path d="M3.5 7.5h25" stroke="#fff" opacity=".35"/>' +
      '<path d="M7.5 13l4 3-4 3" fill="none" stroke="#5dd35a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M14 20h7" stroke="#5dd35a" stroke-width="1.8" stroke-linecap="round"/><path d="M7.5 23.5h12" stroke="#6c7684" stroke-width="1.2" stroke-linecap="round"/>'),
    minesweeper: svg(SH +
      '<rect x="3.5" y="3.5" width="25" height="25" fill="#c6c6c6" stroke="#7b7b7b"/>' +
      '<path d="M4 28V4h24" fill="none" stroke="#fff" stroke-width="1.5"/>' +
      '<path d="M21 3.5v9" stroke="#333" stroke-width="1.2"/><path d="M21 4l6 2.5-6 2.5z" fill="#e2603e" stroke="#a82b10" stroke-width=".6"/>' +
      '<path d="M16 7.5v17M7.5 16h17M10 10l12 12M22 10L10 22" stroke="#111" stroke-width="2"/>' +
      '<circle cx="16" cy="16" r="6" fill="#111"/>' +
      '<rect x="13" y="12.6" width="2.6" height="2.6" fill="#fff"/>'),
    paint: svg(SH +
      '<path d="M15.5 4C8 4 3 9 3 15.2 3 21 7.6 26 13.6 26c2 0 2.5-1.2 2-2.6-.6-1.6.2-3 2-3h3.4C25.6 20.4 29 18 29 13.5 29 8 23 4 15.5 4z" fill="#f1dfb5" stroke="#9c7f45"/>' +
      '<circle cx="9.5" cy="14" r="2.2" fill="#e03b3b"/><circle cx="12.5" cy="8.8" r="2.2" fill="#f2b705"/>' +
      '<circle cx="18.6" cy="8.2" r="2.2" fill="#38a84a"/><circle cx="23.6" cy="12" r="2.2" fill="#2f6fe0"/>' +
      '<circle cx="9.4" cy="20" r="1.9" fill="#fff" stroke="#9c7f45" stroke-width=".7"/>' +
      '<path d="M29.5 17.5L19.4 27.6" stroke="#8a5a2b" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M19.6 27.4l-2.4.9.9-2.4z" fill="#333"/>'),
    recycleEmpty: svg(SH +
      '<path d="M7 9h18l-2 18.5H9z" fill="#cfe0f1" stroke="#5f7d9f" opacity=".95"/>' +
      '<path d="M9 9.5l1.2 17.5M12.5 9.5l.6 17.5M16 9.5v17.5M19.5 9.5l-.6 17.5M23 9.5l-1.2 17.5" stroke="#8fa9c6" stroke-width=".8"/>' +
      '<ellipse cx="16" cy="9" rx="9.5" ry="2.4" fill="#e6eef8" stroke="#5f7d9f"/>' +
      '<path d="M13 17.2l1.7-2.8 1.8 2.8M18.7 18.8l-1.7 2.8h-3.3M12.6 19.6l1.6 2" fill="none" stroke="#2f9e5b" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>'),
    recycleFull: svg(SH +
      '<path d="M10 9l2-5.5 6 1.5-1 5z" fill="#fff" stroke="#8a95a5"/>' +
      '<path d="M16 9.5l4-6.2 4.6 3-2.6 4.2z" fill="#fff4c0" stroke="#a89548"/>' +
      '<path d="M7 9h18l-2 18.5H9z" fill="#cfe0f1" stroke="#5f7d9f" opacity=".95"/>' +
      '<path d="M9 9.5l1.2 17.5M12.5 9.5l.6 17.5M16 9.5v17.5M19.5 9.5l-.6 17.5M23 9.5l-1.2 17.5" stroke="#8fa9c6" stroke-width=".8"/>' +
      '<ellipse cx="16" cy="9" rx="9.5" ry="2.4" fill="#e6eef8" stroke="#5f7d9f" fill-opacity=".7"/>' +
      '<path d="M13 17.2l1.7-2.8 1.8 2.8M18.7 18.8l-1.7 2.8h-3.3M12.6 19.6l1.6 2" fill="none" stroke="#2f9e5b" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>'),
    browser: svg(SH +
      '<circle cx="15.5" cy="16" r="10.5" fill="#3d8de8" stroke="#1c5aa6"/>' +
      '<path d="M8.5 9.5c2.5.5 3 2.6 5.2 2.4 1.6-.2 1.2 2.6 3.2 3 2.2.5 1.6 3.4-.4 4.4-1.6.8-1.2 3.2-2.8 4.6-1.8-2.2-1.2-4.4-3-5.6-2-1.4-4-2-4.6-4.6.2-1.6.9-3 2.4-4.2zM19 6.5c1.6.2 3.4 1.4 4.6 3-1.4.6-2.8 0-3.6-.8-.6-.6-1.4-1.2-1-2.2zM22.4 17c1.2-.4 2.6.2 3.4 1-.4 2-1.4 3.8-2.8 5.2-.4-2.2-1.8-3.6-.6-6.2z" fill="#47b04a"/>' +
      '<path d="M7 12.5a10 10 0 0 1 17.6-2.2C19 8 12 9 7 12.5z" fill="#fff" opacity=".35"/>' +
      '<ellipse cx="16" cy="16.5" rx="14" ry="5" fill="none" stroke="#f3a91e" stroke-width="2.2" transform="rotate(-24 16 16.5)"/>' +
      '<path d="M4.4 22.7c2.8 1.3 8.4.4 14-2.4" fill="none" stroke="#ffe08a" stroke-width=".9" stroke-linecap="round"/>'),
    notepad: svg(SH +
      '<rect x="6" y="5" width="20" height="23" fill="#fff" stroke="#6b7d99"/>' +
      '<rect x="6" y="5" width="20" height="4" fill="#5a8fd8" stroke="#2f5fa3"/>' +
      '<path d="M9 4v3.2M13 4v3.2M17 4v3.2M21 4v3.2" stroke="#555" stroke-width="1.3" stroke-linecap="round"/>' +
      '<path d="M9 13h14M9 16h14M9 19h14M9 22h10M9 25h12" stroke="#a9bcd8"/>'),
    calc: svg(SH +
      '<rect x="6" y="3" width="20" height="25" rx="2" fill="#d6d3c8" stroke="#77725f"/>' +
      '<rect x="8.5" y="5.5" width="15" height="5" fill="#c8dcb4" stroke="#6c7a5e"/>' +
      '<path d="M18 8.8h4" stroke="#334" stroke-width="1.2"/>' +
      '<g fill="#f7f6f0" stroke="#8b8673" stroke-width=".7"><rect x="8.5" y="13" width="4" height="3"/><rect x="14" y="13" width="4" height="3"/><rect x="8.5" y="17.5" width="4" height="3"/><rect x="14" y="17.5" width="4" height="3"/><rect x="8.5" y="22" width="4" height="3"/><rect x="14" y="22" width="4" height="3"/></g>' +
      '<rect x="19.5" y="13" width="4" height="7.5" fill="#e7743c" stroke="#9e4617" stroke-width=".7"/>' +
      '<rect x="19.5" y="22" width="4" height="3" fill="#5a8fd8" stroke="#2f5fa3" stroke-width=".7"/>'),
    doc: svg(SH +
      '<path d="M7 3h13l6 6v19H7z" fill="#fff" stroke="#6b7d99"/><path d="M20 3v6h6" fill="#dfe7f3" stroke="#6b7d99" stroke-linejoin="round"/>' +
      '<path d="M10 12h13M10 15h13M10 18h13M10 21h9M10 24h11" stroke="#7d93b5"/>'),
    txt: svg(SH +
      '<path d="M7 3h13l6 6v19H7z" fill="#fff" stroke="#6b7d99"/><path d="M20 3v6h6" fill="#dfe7f3" stroke="#6b7d99" stroke-linejoin="round"/>' +
      '<path d="M10 12h13M10 15h11M10 18h13M10 21h8" stroke="#9aa6b5"/>'),
    image: svg(SH +
      '<rect x="3.5" y="5.5" width="25" height="21" fill="#fff" stroke="#6b7d99"/>' +
      '<rect x="5.5" y="7.5" width="21" height="17" fill="#9fd0ff"/>' +
      '<path d="M5.5 21l6-6 4 4 3-3 8 8v.5h-21z" fill="#3e9a48"/><circle cx="21.5" cy="11.5" r="2" fill="#ffd24a"/>'),
    url: svg(SH +
      '<path d="M7 3h13l6 6v19H7z" fill="#fff" stroke="#6b7d99"/><path d="M20 3v6h6" fill="#dfe7f3" stroke="#6b7d99" stroke-linejoin="round"/>' +
      '<circle cx="15" cy="18" r="6" fill="#3d8de8" stroke="#1c5aa6"/><path d="M11 16c2 .6 2.2 2.4 4 2.2M17.4 14.2c.8.8 1.4 2 .6 3.2" stroke="#47b04a" stroke-width="1.6" fill="none"/>' +
      '<path d="M18 22.5l3 3 1.2-3.8z" fill="#fff" stroke="#333" stroke-width=".8"/>'),
    ghost: svg(SH +
      '<path d="M7 3h13l6 6v19H7z" fill="#f2f2f2" stroke="#a5a5a5" stroke-dasharray="2 1.4"/><path d="M20 3v6h6" fill="#e5e5e5" stroke="#a5a5a5"/>' +
      '<path d="M11 21c0-4 2.2-7 5-7s5 3 5 7v3l-1.6-1.2-1.7 1.2-1.7-1.2-1.7 1.2-1.6-1.2L11 24z" fill="#fff" stroke="#b8b8b8"/>' +
      '<circle cx="14.4" cy="19" r=".9" fill="#999"/><circle cx="17.6" cy="19" r=".9" fill="#999"/>'),
    info: svg('<circle cx="16" cy="16" r="13" fill="#2f74d0" stroke="#1a4f96"/><path d="M6 13a11 11 0 0 1 20 0c-6-2.4-14-2.4-20 0z" fill="#fff" opacity=".35"/><circle cx="16" cy="9.5" r="2" fill="#fff"/><path d="M13.5 14h3.5v9h2v2h-6v-2h1.5v-7h-1z" fill="#fff"/>'),
    warn: svg('<path d="M16 3l14 25H2z" fill="#ffd23f" stroke="#a37c00" stroke-linejoin="round"/><path d="M14.6 11h2.8l-.6 9h-1.6z" fill="#222"/><circle cx="16" cy="23.5" r="1.6" fill="#222"/>')
  };

  /* small 16px toolbar glyphs */
  var g16 = {
    back: svg('<circle cx="8" cy="8" r="7" fill="#3fae3f" stroke="#237a23"/><path d="M2.5 6a6 6 0 0 1 11 0c-3.5-1.3-7.5-1.3-11 0z" fill="#fff" opacity=".45"/><path d="M9.5 4.5L6 8l3.5 3.5M6.2 8H12" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>', '0 0 16 16'),
    fwd: svg('<circle cx="8" cy="8" r="7" fill="#3fae3f" stroke="#237a23"/><path d="M2.5 6a6 6 0 0 1 11 0c-3.5-1.3-7.5-1.3-11 0z" fill="#fff" opacity=".45"/><path d="M6.5 4.5L10 8l-3.5 3.5M9.8 8H4" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>', '0 0 16 16'),
    up: svg('<path d="M1 4.5c0-.6.4-1 1-1h4l1.2 1.3H14c.6 0 1 .4 1 1V13c0 .6-.4 1-1 1H2c-.6 0-1-.4-1-1z" fill="#ffd767" stroke="#b07d17"/><path d="M8 12.5V7M5.6 9.2L8 6.8l2.4 2.4" fill="none" stroke="#237a23" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '0 0 16 16'),
    search: svg('<circle cx="6.5" cy="6.5" r="4.3" fill="#dff0ff" stroke="#3a5f8f" stroke-width="1.6"/><path d="M4.5 5a2.5 2.5 0 0 1 3-1.2" stroke="#fff" fill="none"/><path d="M9.8 9.8l4.4 4.4" stroke="#7a5a2f" stroke-width="2.4" stroke-linecap="round"/>', '0 0 16 16'),
    folders: svg('<path d="M1 4.5c0-.6.4-1 1-1h4l1.2 1.3H14c.6 0 1 .4 1 1V13c0 .6-.4 1-1 1H2c-.6 0-1-.4-1-1z" fill="#ffd767" stroke="#b07d17"/><path d="M3.5 8h4M3.5 10.5h6" stroke="#b07d17"/>', '0 0 16 16'),
    views: svg('<rect x="1.5" y="1.5" width="5" height="5" fill="#7fb2f0" stroke="#2f5fa3"/><rect x="9.5" y="1.5" width="5" height="5" fill="#7fb2f0" stroke="#2f5fa3"/><rect x="1.5" y="9.5" width="5" height="5" fill="#7fb2f0" stroke="#2f5fa3"/><rect x="9.5" y="9.5" width="5" height="5" fill="#7fb2f0" stroke="#2f5fa3"/>', '0 0 16 16'),
    print: svg('<rect x="4" y="1.5" width="8" height="5" fill="#fff" stroke="#666"/><rect x="1.5" y="6" width="13" height="6" rx="1" fill="#cfcabb" stroke="#6b6655"/><rect x="4" y="10" width="8" height="4.5" fill="#fff" stroke="#666"/><circle cx="12.3" cy="8" r=".8" fill="#3fae3f"/>', '0 0 16 16'),
    preview: svg('<path d="M2.5 1.5h7l3 3v10h-10z" fill="#fff" stroke="#6b7d99"/><circle cx="7.5" cy="9" r="3" fill="#dff0ff" stroke="#3a5f8f" stroke-width="1.3"/><path d="M9.6 11.1l3.4 3.4" stroke="#7a5a2f" stroke-width="1.8" stroke-linecap="round"/>', '0 0 16 16'),
    copy: svg('<rect x="1.5" y="1.5" width="8" height="10" fill="#fff" stroke="#6b7d99"/><rect x="6.5" y="4.5" width="8" height="10" fill="#fff" stroke="#3a5f8f"/><path d="M8.5 7.5h4M8.5 9.5h4M8.5 11.5h3" stroke="#7fa0cc"/>', '0 0 16 16'),
    cut: svg('<circle cx="4.5" cy="12" r="2.4" fill="none" stroke="#c33" stroke-width="1.4"/><circle cx="11.5" cy="12" r="2.4" fill="none" stroke="#c33" stroke-width="1.4"/><path d="M5.8 10.2L11 1.5M10.2 10.2L5 1.5" stroke="#555" stroke-width="1.3"/>', '0 0 16 16'),
    paste: svg('<rect x="2" y="2.5" width="10" height="12" rx="1" fill="#c9974f" stroke="#7d5a24"/><rect x="4.5" y="1.2" width="5" height="2.6" rx=".6" fill="#ddd" stroke="#666"/><rect x="6.5" y="6" width="8" height="9" fill="#fff" stroke="#3a5f8f"/>', '0 0 16 16'),
    home: svg('<path d="M1.5 8L8 2l6.5 6" fill="none" stroke="#a33" stroke-width="1.6" stroke-linejoin="round"/><path d="M3.5 7.5v7h9v-7L8 3.5z" fill="#f4e6c4" stroke="#7d6a3d"/><rect x="6.6" y="10" width="2.8" height="4.5" fill="#7d5a24"/>', '0 0 16 16'),
    refresh: svg('<path d="M13 6.5A5.3 5.3 0 0 0 3 6M3 9.5A5.3 5.3 0 0 0 13 10" fill="none" stroke="#2f8a2f" stroke-width="1.8"/><path d="M14 2.5v4.3H9.7zM2 13.5V9.2h4.3z" fill="#2f8a2f"/>', '0 0 16 16'),
    stop: svg('<rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="#e04a3a" stroke="#9b2418"/><path d="M5 5l6 6M11 5l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>', '0 0 16 16'),
    star: svg('<path d="M8 1.2l2 4.2 4.6.6-3.4 3.2.9 4.6L8 11.5l-4.1 2.3.9-4.6L1.4 6l4.6-.6z" fill="#ffd23f" stroke="#a37c00" stroke-linejoin="round"/>', '0 0 16 16'),
    send: svg('<rect x="1.5" y="4" width="11" height="8" fill="#fffdf4" stroke="#8a7a52"/><path d="M1.8 4.4L7 8.4l5.2-4" fill="none" stroke="#8a7a52"/><path d="M10 10.5h5M12.8 8.2l2.3 2.3-2.3 2.3" fill="none" stroke="#237a23" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>', '0 0 16 16'),
    undo: svg('<path d="M5 4L1.8 7.2 5 10.4" fill="none" stroke="#2f5fa3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.5 7.2h7a4 4 0 0 1 0 8H7" fill="none" stroke="#2f5fa3" stroke-width="1.8" stroke-linecap="round"/>', '0 0 16 16'),
    redo: svg('<path d="M11 4l3.2 3.2L11 10.4" fill="none" stroke="#2f5fa3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 7.2h-7a4 4 0 0 0 0 8H9" fill="none" stroke="#2f5fa3" stroke-width="1.8" stroke-linecap="round"/>', '0 0 16 16'),
    link: svg('<path d="M6.8 9.2l2.4-2.4" stroke="#2f5fa3" stroke-width="1.6"/><path d="M7.5 4.5l1.6-1.6a2.6 2.6 0 0 1 3.7 3.7l-1.6 1.6M8.5 11.5l-1.6 1.6a2.6 2.6 0 0 1-3.7-3.7l1.6-1.6" fill="none" stroke="#2f5fa3" stroke-width="1.6" stroke-linecap="round"/>', '0 0 16 16'),
    trash: svg('<path d="M3.5 4.5h9l-1 10h-7z" fill="#cfe0f1" stroke="#5f7d9f"/><rect x="2.5" y="2.5" width="11" height="2" fill="#e6eef8" stroke="#5f7d9f"/><path d="M6 6.5v6M8 6.5v6M10 6.5v6" stroke="#8fa9c6"/>', '0 0 16 16'),
    restore: svg('<path d="M3 8a5 5 0 1 0 1.6-3.7" fill="none" stroke="#2f8a2f" stroke-width="1.8"/><path d="M1.6 2.2v4.4H6z" fill="#2f8a2f"/>', '0 0 16 16'),
    props: svg('<rect x="1.5" y="2.5" width="13" height="11" fill="#fff" stroke="#6b7d99"/><rect x="1.5" y="2.5" width="13" height="2.5" fill="#3b7be0"/><path d="M3.5 7.5h5M3.5 9.5h7M3.5 11.5h4" stroke="#7d93b5"/><rect x="10.5" y="9.5" width="3" height="3" fill="#ffd23f" stroke="#a37c00" stroke-width=".7"/>', '0 0 16 16')
  };

  /* Windows XP bitmaps replace the drawn icons wherever the set has one. An icon with an original 16 px version (XP_ICO[key + '16'])
     carries both: the 16 px one (class xi16) shows in 16 px slots, see xp.css. */
  var g24 = {};
  (function () {
    var B = window.XP_ICO || {};
    function img(src, cls, size, pixel) { return '<image' + (cls ? ' class="' + cls + '"' : '') + ' href="' + src + '" width="' + size + '" height="' + size + '"' + (pixel ? ' style="image-rendering:pixelated"' : '') + '/>'; }
    var map = { folder: 'folder', projects: 'mydocs', computer: 'computer', contact: 'mail', terminal: 'console', minesweeper: 'mine', paint: 'paint',
      browser: 'ie', notepad: 'notepad', calc: 'calc', recycleEmpty: 'recycle', recycleFull: 'recycleFull', txt: 'txt', url: 'iepaper',
      resume: 'rtf', doc: 'rtf', image: 'jpg', ghost: 'unknown', info: 'info', warn: 'warn' };
    var pixel = { url: 1 };
    Object.keys(map).forEach(function (k) {
      var a = B[map[k]], b = B[map[k] + '16'];
      if (!a) { a = b; b = null; }
      if (a && icons[k]) icons[k] = svg(b ? img(a, 'xi32', 32, pixel[k]) + img(b, 'xi16', 32) : img(a, '', 32, pixel[k]), '0 0 32 32');
    });
    // toolbar glyphs: [16 px original, 24 px original for the large toolbar buttons]
    var gmap = { back: ['tbBack', 'tbBack24'], fwd: ['tbFwd', 'tbFwd24'], up: ['tbUp', 'tbUp24'], search: ['search16'], folders: ['tbFolders', 'tbFolders24'],
      views: ['tbViews', 'tbViews24'], print: ['tbPrint'], preview: ['tbPreview'], copy: ['tbCopy', 'tbCopy24'], cut: ['tbCut', 'tbCut24'],
      paste: ['tbPaste', 'tbPaste24'], home: ['tbHome', 'tbHome24'], refresh: ['tbRefresh', 'tbRefresh24'], stop: ['tbStop', 'tbStop24'], star: ['star16', 'tbFave24'],
      send: ['tbSend'], undo: ['tbUndo', 'tbUndo24'], redo: ['tbRedo', 'tbRedo24'], link: ['iepaper'], trash: ['recycle16', 'recycle24'], restore: ['tbRestore'],
      props: ['tbProps'], computer: ['computer16'], warn: ['warn16'], bold: ['tbBold'], italic: ['tbItalic'], underline: ['tbUnderline'], hardware: ['hardware16'] };
    Object.keys(gmap).forEach(function (k) {
      var a = B[gmap[k][0]], b = B[gmap[k][1]];
      if (a) g16[k] = svg(img(a, '', 16), '0 0 16 16');
      if (b) g24[k] = svg(img(b, '', 24), '0 0 24 24');
    });
    // Internet Explorer's Go button (normal / hot)
    if (B.tbGo) g16.go = svg(img(B.tbGo, 'xn', 20) + (B.tbGoHot ? img(B.tbGoHot, 'xh', 20) : ''), '0 0 20 20');
  })();

  /* ---------------------------------------------------------------- content data */
  var person = {
    name: { ru: 'Даниил Иванов', en: 'Daniil Ivanov' },
    role: { ru: 'Fullstack-разработчик', en: 'Fullstack developer' },
    city: { ru: 'Пхукет, Таиланд', en: 'Phuket, Thailand' }
  };

  /* the desktop's own OS name; the shell may override via XPApps.osName before apps render */
  var osName = { ru: 'Windows XD', en: 'Windows XD' };
  var osEdition = { ru: 'Professional', en: 'Professional' };
  var osVersion = 'Windows XD 5.1 (build 2026.11, Phuket)';
  var pcName = 'PHUKET-PC';

  var contacts = [
    { id: 'telegram', label: 'Telegram', value: 't.me/work_veselov', href: 'https://t.me/work_veselov', note: { ru: 'быстрее всего', en: 'fastest' }, color: '#2aa3df' },
    { id: 'email', label: 'E-mail', value: 'donya.withlove@gmail.com', href: null, note: { ru: 'для длинных писем', en: 'for longer letters' }, color: '#d9534f' },
    { id: 'github', label: 'GitHub', value: 'github.com/le5tef', href: 'https://github.com/le5tef', note: { ru: 'код и пет-проекты', en: 'code and side projects' }, color: '#333' },
    { id: 'site', label: { ru: 'Сайт', en: 'Website' }, value: 'donya.dev', href: 'https://donya.dev', note: { ru: 'вы здесь', en: 'you are here' }, color: '#2f9e5b' }
  ];

  /* Projects: adding a project = adding one object here.
     shots[].kind refers to a drawing in XPApps.mocks (projects.js); unknown kinds get a generic frame. */
  var projects = [
    {
      id: 'verifikat',
      icon: 'verifikat',
      name: { ru: 'Верификат', en: 'Verifikat' },
      tagline: { ru: 'Проверка подлинности товаров по QR-коду', en: 'Product authenticity check by QR code' },
      type: { ru: 'Коммерческий проект', en: 'Commercial project' },
      period: { ru: 'июль 2025 — сентябрь 2026', en: 'Jul 2025 — Sep 2026' },
      role: { ru: 'Fullstack-разработчик, проектная работа', en: 'Fullstack developer, project work' },
      url: 'https://verifikat.ru',
      summary: {
        ru: 'B2B-платформа: производители проходят модерацию и получают партии уникальных кодов, печатают их как QR на упаковке, а покупатель сканирует код и видит, что товар настоящий. Я делал бэкенд, фоновую генерацию и экспорт кодов, общую UI-библиотеку для трёх фронтендов и переезд инфраструктуры.',
        en: 'A B2B platform: manufacturers pass moderation and receive batches of unique codes, print them as QR codes on packaging, and a buyer scans one to see that the product is genuine. I built the backend, background code generation and export, a shared UI library for three frontends, and moved the infrastructure.'
      },
      stack: ['Python', 'Django', 'DRF', 'SimpleJWT', 'Celery', 'Redis', 'Channels', 'PostgreSQL', 'S3', 'Vue 3', 'Pinia', 'Vite', 'Docker Compose', 'Caddy', 'GitLab CI'],
      highlights: [
        { ru: 'REST API на Django/DRF с двумя контурами JWT-авторизации: сотрудники платформы и производители. Права в виде строк, общие для API и фронта, и журнал действий сотрудников.',
          en: 'REST API on Django/DRF with two separate JWT contours: platform staff and manufacturers. String permissions shared by the API and the frontend, plus an audit log of staff actions.' },
        { ru: 'Генерация партий кодов на Celery: большие партии уходят в фон, прогресс приходит по WebSocket (Channels) с троттлингом, есть отмена и перезапуск.',
          en: 'Batch code generation on Celery: large batches go to the background, progress arrives over WebSocket (Channels) with throttling, and jobs can be cancelled and restarted.' },
        { ru: 'Экспорт QR в векторный PDF для печати на ленте и в ZIP для партий до ~800 тыс. кодов. Постраничный генератор вместо одного большого документа: память больше не растёт с размером партии.',
          en: 'QR export to vector PDF for print tape and to ZIP, for batches of up to ~800k codes. A page-by-page generator instead of one huge document keeps memory flat regardless of batch size.' },
        { ru: 'Модерация товаров и партий как конечный автомат плюс чат производителя с поддержкой в реальном времени.',
          en: 'Moderation of products and batches as a state machine, plus a real-time chat between manufacturers and support.' },
        { ru: 'Общая UI-библиотека на Vue 3 для трёх SPA (админка, кабинет производителя, публичный сайт), публикация в GitLab Package Registry из CI.',
          en: 'A shared Vue 3 UI library for three SPAs (admin panel, manufacturer dashboard, public site), published to the GitLab Package Registry from CI.' },
        { ru: 'Переезд с Yandex Serverless на Docker Compose + Caddy с автоматическим HTTPS, CI/CD в GitLab. Бэкенд покрыт тестами (600+).',
          en: 'Moved from Yandex Serverless to Docker Compose + Caddy with automatic HTTPS, CI/CD in GitLab. The backend is covered by 600+ tests.' }
      ],
      shots: [
        { kind: 'verify', title: { ru: 'Проверка кода покупателем', en: 'A buyer checks a code' } },
        { kind: 'batches', title: { ru: 'Портал производителя: партии кодов', en: 'Manufacturer portal: code batches' } },
        { kind: 'exports', title: { ru: 'Портал производителя: экспорт кодов в PDF', en: 'Manufacturer portal: exporting codes to PDF' } }
      ]
    },
    {
      id: 'wax',
      icon: 'wax',
      name: { ru: 'Wax', en: 'Wax' },
      tagline: { ru: 'Промоакция: спрятанные стаканчики с ваксом и QR-коды', en: 'A promo: hidden cups of skate wax with QR codes' },
      type: { ru: 'Свой проект, открытый код', en: 'Own project, open source' },
      period: { ru: 'акция моего бывшего бренда, переписан в 2026', en: 'my former brand\'s campaign, rewritten in 2026' },
      role: { ru: 'Автор: идея, 3D, фронтенд', en: 'Author: idea, 3D, frontend' },
      url: 'https://wax.donya.dev',
      repo: 'https://github.com/le5tef/wax',
      summary: {
        ru: 'Когда-то я продавал наждачки для скейтбордов и устроил акцию: прятал по городу стаканчики с ваксом, а на дне каждого был QR-код. Нашедший сканировал его и попадал на этот сайт: промокод из ссылки расшифровывается в цвет стаканчика, стаканчик появляется в 3D именно этого цвета, а говорилка поздравляет с подарком. Сейчас проект переписан на TypeScript и выложен в открытый доступ, есть демо без кода.',
        en: 'I used to sell skateboard griptape and ran a promo: I hid cups of skate wax around the city with a QR code on the bottom of each. Whoever found one scanned it and landed on this site: the promo code in the link decodes into the cup\'s colour, the cup appears in 3D in exactly that colour, and a talking mouth congratulates you on the gift. The project is now rewritten in TypeScript and open source, with a demo that needs no code.'
      },
      stack: ['Vue 3', 'TypeScript', 'Vite', 'three.js', 'Vitest', 'ESLint', 'GitHub Actions'],
      highlights: [
        { ru: 'Промокод кодирует цвет: шифр Виженера плюс контрольная сумма CRC-8, случайная строка проходит примерно 1 раз из 12 000. Коды для любого цвета выдаёт CLI-генератор.',
          en: 'The promo code encodes a colour: a Vigenère cipher plus a CRC-8 checksum, so a random string passes about once in 12,000. A CLI generator issues codes for any colour.' },
        { ru: '3D-сцена на three.js: модель стаканчика, анимация раскрытия на одном таймлайне с плавными переходами, полная очистка WebGL при уходе со страницы.',
          en: 'A three.js scene: the cup model, a reveal animation on one eased timeline, and full WebGL cleanup when you leave the page.' },
        { ru: 'Говорилка с пиксельным ртом печатает реплики; русский и английский с автоопределением языка, название цвета склоняется («тебе попался розовый вакс»).',
          en: 'A talking pixel mouth types the lines; Russian and English with language detection, and the colour gets a proper name ("you found a pink wax").' },
        { ru: 'Строгий TypeScript, тесты кодека и таймлайна на Vitest, линтер и CI в GitHub Actions.',
          en: 'Strict TypeScript, Vitest tests for the codec and the timeline, linting and CI on GitHub Actions.' }
      ],
      shots: [
        { kind: 'wax-landing', title: { ru: 'Без кода: говорилка спрашивает промокод', en: 'No code: the mouth asks for a promo code' } },
        { kind: 'wax-reveal', title: { ru: 'Код принят: стаканчик нужного цвета', en: 'Code accepted: the cup in its colour' } }
      ]
    },
    {
      id: 'kompy',
      icon: 'kompy',
      name: { ru: 'Компи', en: 'Kompi' },
      tagline: { ru: 'Подбор страны и визового маршрута для переезда', en: 'Finds a country and a visa route for relocation' },
      type: { ru: 'Свой проект, в работе', en: 'Own project, in progress' },
      period: { ru: 'с сентября 2026', en: 'since Sep 2026' },
      role: { ru: 'Автор: продукт, бэкенд, фронтенд, бот, деплой', en: 'Author: product, backend, frontend, bot, deployment' },
      url: 'https://kompy.app',
      summary: {
        ru: 'Человек проходит квиз: гражданство, доход, сбережения, семья, цели, отношение к рискам. Движок прогоняет профиль по 21 стране и примерно 140 визовым маршрутам и отдаёт топ стран с объяснением, почему подходит каждая. Полный отчёт приходит PDF-файлом от Telegram-бота. Вокруг этого: гайды по странам на трёх языках, новостной канал и своя аналитика.',
        en: 'A person takes a quiz: citizenship, income, savings, family, goals, attitude to risk. The engine runs the profile through 21 countries and about 140 visa routes and returns the top countries with the reasons each one fits. The full report arrives as a PDF from a Telegram bot. Around it: country guides in three languages, a news channel and in-house analytics.'
      },
      stack: ['Vue 3', 'TypeScript', 'Pinia', 'Vite', 'vue-i18n', 'Python', 'Django 5', 'django-ninja', 'aiogram 3', 'SQLite (WAL)', 'WeasyPrint', 'Playwright', 'Docker Compose', 'Traefik'],
      highlights: [
        { ru: 'Движок рекомендаций в два шага: сначала отсев маршрутов, которые не проходят по жёстким условиям, потом ранжирование оставшихся. Результат детерминированный, и к каждой стране приложены причины.',
          en: 'A two-step recommendation engine: first it gates out routes that fail hard requirements, then ranks the rest. The result is deterministic and every country comes with its reasons.' },
        { ru: 'Адаптивный квиз: после базовых вопросов бэкенд считает трёх кандидатов и добавляет вопросы только про них.',
          en: 'An adaptive quiz: after the base questions the backend computes three candidates and adds questions only about them.' },
        { ru: 'Отчёт собирается в PDF из HTML и CSS (WeasyPrint) и уходит пользователю в Telegram. Бот на aiogram, вход на сайт через него же по одноразовой ссылке.',
          en: 'The report is built as a PDF from HTML and CSS (WeasyPrint) and sent to the user in Telegram. The bot runs on aiogram and also signs users in to the site with a one-time link.' },
        { ru: 'Публичные гайды по странам отдаёт Django на трёх языках (ru, en, es), квиз работает как SPA с пре-рендером. Один домен, маршруты делит Traefik.',
          en: 'Public country guides are served by Django in three languages (ru, en, es), while the quiz is a pre-rendered SPA. One domain, with Traefik splitting the routes.' },
        { ru: 'Новостной канал: посты по расписанию готовит AI-агент, а публикует человек кнопкой в боте.',
          en: 'A news channel: an AI agent drafts posts on a schedule, and a human publishes them with a button in the bot.' },
        { ru: 'Своя аналитика без сторонних счётчиков, с определением страны по офлайн-базе. Четыре контейнера в Docker Compose, TLS от Let\'s Encrypt, e2e-тесты на Playwright без выхода в интернет.',
          en: 'In-house analytics with no third-party counters and country lookup from an offline database. Four containers in Docker Compose, TLS from Let\'s Encrypt, Playwright e2e tests that never touch the internet.' }
      ],
      shots: [
        { kind: 'kompy-quiz', title: { ru: 'Квиз: первый шаг, гражданство', en: 'The quiz: step one, citizenship' } },
        { kind: 'kompy-report', title: { ru: 'Результат: страна, маршрут и причины', en: 'The result: the country, the route and the reasons' } },
        { kind: 'kompy-pdf', title: { ru: 'PDF-отчёт от бота: обложка и страница страны', en: 'The PDF report from the bot: cover and a country page' } }
      ]
    }
  ];

  /* ids the terminal / browser can open, with friendly aliases */
  var appAliases = {
    projects: 'projects', project: 'projects', explorer: 'projects',
    resume: 'resume', cv: 'resume', wordpad: 'resume',
    about: 'about', computer: 'about', mycomputer: 'about', sysinfo: 'about',
    contact: 'contact', mail: 'contact', contacts: 'contact',
    terminal: 'terminal', cmd: 'terminal',
    minesweeper: 'minesweeper', mines: 'minesweeper', winmine: 'minesweeper',
    paint: 'paint', brush: 'paint', mspaint: 'paint',
    recycle: 'recycle', bin: 'recycle', trash: 'recycle',
    browser: 'browser', navigator: 'browser', ie: 'browser', iexplore: 'browser', internet: 'browser',
    notepad: 'notepad', readme: 'notepad',
    calc: 'calc', calculator: 'calc'
  };

  /* ---------------------------------------------------------------- helpers */
  function phuketNow(api) {
    var t = null;
    try { t = api && api.phuketTime && api.phuketTime(); } catch (e) { t = null; }
    var d = new Date(Date.now() + 7 * 3600e3);
    var out = { h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds(), date: d };
    if (t && typeof t.h === 'number') { out.h = t.h; out.m = t.m || 0; }
    return out;
  }
  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }

  function copyText(text) {
    return new Promise(function (resolve) {
      function fallback() {
        try {
          var ta = document.createElement('textarea');
          ta.value = text; ta.setAttribute('readonly', '');
          ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.top = '0';
          document.body.appendChild(ta); ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta); resolve(!!ok);
        } catch (e) { resolve(false); }
      }
      try {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(function () { resolve(true); }, fallback);
        } else fallback();
      } catch (e) { fallback(); }
    });
  }

  function reduced() { return !!(reducedMQ && reducedMQ.matches); }

  /* ---------------------------------------------------------------- per-app UI kit */
  function ui(api) {
    var bindings = [];
    var cleanups = [];
    var dead = false;
    var unLang = null;

    function t(d) { if (d == null) return ''; if (isDict(d)) return api.t(d); return String(d); }
    function bind(fn) { fn(); bindings.push(fn); return fn; }
    function refresh() { if (dead) return; for (var i = 0; i < bindings.length; i++) { try { bindings[i](); } catch (e) { if (window.console) console.error(e); } } }
    try { unLang = api.onLang(refresh); } catch (e) { unLang = null; }

    function append(node, c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) { c.forEach(function (x) { append(node, x); }); return; }
      if (c.nodeType) { node.appendChild(c); return; }
      if (isDict(c)) { var tn = document.createTextNode(''); bind(function () { tn.nodeValue = t(c); }); node.appendChild(tn); return; }
      node.appendChild(document.createTextNode(String(c)));
    }

    /* h('div.a.b#id', {attr..., on: {click: fn}, html: '...'}, children) */
    function h(sel, attrs, children) {
      if (attrs && (attrs.nodeType || Array.isArray(attrs) || typeof attrs === 'string' || isDict(attrs))) { children = attrs; attrs = null; }
      var m = sel.split(/(?=[.#])/);
      var node = document.createElement(m[0] || 'div');
      for (var i = 1; i < m.length; i++) {
        if (m[i][0] === '.') node.classList.add(m[i].slice(1)); else node.id = m[i].slice(1);
      }
      if (attrs) Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'on') { Object.keys(v).forEach(function (ev) { node.addEventListener(ev, v[ev]); }); return; }
        if (k === 'html') { node.innerHTML = v; return; }
        if (k === 'style' && typeof v === 'object') { Object.keys(v).forEach(function (s) { node.style.setProperty(s, v[s]); }); return; }
        if (k === 'class') { String(v).split(/\s+/).forEach(function (c) { if (c) node.classList.add(c); }); return; }
        if (k === 'text') { if (isDict(v)) bind(function () { node.textContent = t(v); }); else node.textContent = v; return; }
        if (isDict(v)) { bind(function () { node.setAttribute(k, t(v)); }); return; }
        if (v === true) node.setAttribute(k, ''); else node.setAttribute(k, v);
      });
      append(node, children);
      return node;
    }

    function icon(name, cls) {
      var s = document.createElement('span');
      s.className = 'xpa-ico' + (cls ? ' ' + cls : '');
      s.innerHTML = icons[name] || g16[name] || '';
      return s;
    }
    function glyph(name) {
      var s = document.createElement('span');
      s.className = 'xpa-g16';
      s.innerHTML = g16[name] || '';
      return s;
    }

    function sound(n) { try { api.sound(n); } catch (e) { /* shell without sound */ } }

    function listen(target, ev, fn, opt) {
      target.addEventListener(ev, fn, opt);
      cleanups.push(function () { target.removeEventListener(ev, fn, opt); });
    }
    function onCleanup(fn) { cleanups.push(fn); }
    function every(ms, fn) { var id = setInterval(fn, ms); cleanups.push(function () { clearInterval(id); }); return id; }
    function later(ms, fn) { var id = setTimeout(fn, ms); cleanups.push(function () { clearTimeout(id); }); return id; }

    /* ------------ menu bar: menus = [{label, items: [{label, key, action, disabled(), checked(), sep}]}] */
    function menubar(menus) {
      var bar = h('div.xpa-menubar', { role: 'menubar' });
      var openIdx = -1, drop = null, buttons = [];

      function close(focusBack) {
        if (drop && drop.parentNode) drop.parentNode.removeChild(drop);
        drop = null;
        if (openIdx >= 0 && buttons[openIdx]) { buttons[openIdx].classList.remove('open'); buttons[openIdx].setAttribute('aria-expanded', 'false'); if (focusBack) buttons[openIdx].focus(); }
        openIdx = -1;
      }
      function itemsEls() { return drop ? Array.prototype.slice.call(drop.querySelectorAll('.xpa-mi:not([aria-disabled="true"])')) : []; }
      function open(i, focusFirst) {
        close(false);
        openIdx = i;
        var b = buttons[i]; b.classList.add('open'); b.setAttribute('aria-expanded', 'true');
        drop = h('div.xpa-menu', { role: 'menu' });
        menus[i].items.forEach(function (it) {
          if (it.sep) { drop.appendChild(h('div.xpa-msep', { role: 'separator' })); return; }
          var dis = typeof it.disabled === 'function' ? it.disabled() : !!it.disabled;
          var chk = typeof it.checked === 'function' ? it.checked() : !!it.checked;
          var mi = h('div.xpa-mi', { role: it.checked ? 'menuitemcheckbox' : 'menuitem', tabindex: '-1', 'aria-disabled': dis ? 'true' : 'false', 'aria-checked': it.checked ? String(chk) : null }, [
            h('span.xpa-mi-chk' + (chk ? (it.radio ? '.radio' : '.on') : '')),
            h('span.xpa-mi-l', t(it.label)),
            h('span.xpa-mi-k', it.key || '')
          ]);
          function run() {
            if (dis) { sound('error'); return; }
            close(false); sound('click');
            try { it.action && it.action(); } catch (e) { if (window.console) console.error(e); }
          }
          mi.addEventListener('click', run);
          mi.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); } });
          mi.addEventListener('mouseenter', function () { if (!dis) mi.focus(); });
          drop.appendChild(mi);
        });
        drop.addEventListener('keydown', function (e) {
          var els = itemsEls(), k = els.indexOf(document.activeElement);
          if (e.key === 'ArrowDown') { e.preventDefault(); (els[(k + 1) % els.length] || els[0]).focus(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); (els[(k - 1 + els.length) % els.length] || els[0]).focus(); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); open((openIdx + 1) % menus.length, true); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); open((openIdx - 1 + menus.length) % menus.length, true); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
          else if (e.key === 'Tab') { close(false); }
        });
        bar.appendChild(drop);
        // position under the button, clamped inside the bar's width
        var left = b.offsetLeft;
        drop.style.left = left + 'px';
        var maxLeft = Math.max(0, bar.clientWidth - drop.offsetWidth - 2);
        if (left > maxLeft) drop.style.left = maxLeft + 'px';
        if (focusFirst) { var f = itemsEls()[0]; if (f) f.focus(); }
      }

      menus.forEach(function (m, i) {
        var b = h('button.xpa-mb', { type: 'button', role: 'menuitem', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, m.label);
        b.addEventListener('click', function () { if (openIdx === i) close(false); else open(i, false); });
        b.addEventListener('mouseenter', function () { if (openIdx >= 0 && openIdx !== i) open(i, false); });
        b.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i, true); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); buttons[(i + 1) % buttons.length].focus(); if (openIdx >= 0) open((i + 1) % menus.length, false); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length].focus(); if (openIdx >= 0) open((i - 1 + menus.length) % menus.length, false); }
          else if (e.key === 'Escape') { close(false); }
        });
        buttons.push(b); bar.appendChild(b);
      });
      bar.appendChild(h('span.xpa-menubar-fill'));
      listen(document, 'pointerdown', function (e) { if (drop && !bar.contains(e.target)) close(false); }, true);
      bind(function () { if (drop) close(false); });
      bar.closeMenu = close;
      return bar;
    }

    /* toolbar button: {g: glyph name or html, label, title, onClick, showLabel, disabled} */
    function tbtn(o) {
      var b = h('button.xpa-tb', { type: 'button', title: o.title || o.label, 'aria-label': o.title || o.label }, [
        o.g ? (o.g.indexOf('<') === 0 ? h('span.xpa-g16', { html: o.g }) : o.big && g24[o.g] ? h('span.xpa-g16.x24', { html: g24[o.g] }) : glyph(o.g)) : null,
        o.showLabel ? h('span.xpa-tb-l', o.label) : null,
        o.drop ? h('span.xpa-tb-dd', '▾') : null
      ]);
      if (o.big) b.classList.add('big');
      if (o.disabled) b.disabled = true;
      if (o.onClick) b.addEventListener('click', function (e) { sound('click'); o.onClick(e); });
      return b;
    }
    function toolbar(children, cls) { return h('div.xpa-toolbar' + (cls ? '.' + cls : ''), { role: 'toolbar' }, children); }
    function tsep() { return h('span.xpa-tsep'); }

    function statusbar(n) {
      var cells = [];
      var el = h('div.xpa-status');
      for (var i = 0; i < n; i++) { var c = h('div.xpa-st'); cells.push(c); el.appendChild(c); }
      el.appendChild(h('div.xpa-grip', { 'aria-hidden': 'true' }));
      var bound = [];
      return {
        el: el,
        set: function (i, v) { bound[i] = v; cells[i].textContent = t(v); },
        cell: function (i) { return cells[i]; },
        _r: bind(function () { for (var i = 0; i < bound.length; i++) if (bound[i] != null) cells[i].textContent = t(bound[i]); })
      };
    }

    function button(label, onClick, opts) {
      opts = opts || {};
      var b = h('button.xpa-btn' + (opts.primary ? '.primary' : ''), { type: 'button', title: opts.title || null }, label);
      if (onClick) b.addEventListener('click', function (e) { onClick(e, b); });
      return b;
    }

    /* copy button with a short "Copied" state */
    function copyButton(getText, opts) {
      opts = opts || {};
      var label = h('span', opts.label || { ru: 'Копировать', en: 'Copy' });
      var b = h('button.xpa-btn.xpa-copy', { type: 'button', title: opts.title || { ru: 'Скопировать в буфер обмена', en: 'Copy to clipboard' } }, [glyph('copy'), label]);
      var timer = null;
      b.addEventListener('click', function () {
        var text = typeof getText === 'function' ? getText() : getText;
        copyText(text).then(function (ok) {
          sound(ok ? 'click' : 'error');
          b.classList.toggle('ok', ok); b.classList.toggle('fail', !ok);
          label.textContent = ok ? t({ ru: 'Скопировано', en: 'Copied' }) : t({ ru: 'Не вышло: выделите вручную', en: 'Failed: select it manually' });
          clearTimeout(timer);
          timer = setTimeout(function () { b.classList.remove('ok', 'fail'); label.textContent = t(opts.label || { ru: 'Копировать', en: 'Copy' }); }, 1600);
          if (opts.onCopied) opts.onCopied(ok);
        });
      });
      cleanups.push(function () { clearTimeout(timer); });
      return b;
    }

    function dialog(o) {
      try { api.dialog(o); return; } catch (e) { /* fall through */ }
      window.alert((t(o.title) || '') + '\n\n' + (t(o.text) || ''));
    }
    function aboutDialog(name, extra) {
      dialog({
        title: { ru: 'О программе', en: 'About' },
        icon: 'info',
        text: t(name) + '\n' + t({ ru: 'Версия 1.0 · сделано вручную для этого рабочего стола', en: 'Version 1.0 · handmade for this desktop' }) + (extra ? '\n\n' + t(extra) : ''),
        buttons: [{ label: 'OK', primary: true }]
      });
    }

    /* root element for an app */
    function root(contentEl, cls, narrowAt) {
      var r = h('div.xpa.' + cls);
      contentEl.appendChild(r);
      var bp = narrowAt || 520;
      function measure() { var w = r.clientWidth; if (w) { r.classList.toggle('xpa-narrow', w < bp); r.classList.toggle('xpa-tiny', w < 380); } }
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(measure); ro.observe(r);
        cleanups.push(function () { ro.disconnect(); });
      } else { listen(window, 'resize', measure); }
      setTimeout(measure, 0);
      return r;
    }

    function destroy() {
      dead = true;
      cleanups.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
      cleanups = []; bindings = [];
      if (typeof unLang === 'function') { try { unLang(); } catch (e) { /* ignore */ } }
    }

    return {
      t: t, h: h, bind: bind, refresh: refresh, icon: icon, glyph: glyph, sound: sound,
      listen: listen, onCleanup: onCleanup, every: every, later: later,
      menubar: menubar, toolbar: toolbar, tbtn: tbtn, tsep: tsep, statusbar: statusbar,
      button: button, copyButton: copyButton, dialog: dialog, aboutDialog: aboutDialog,
      root: root, destroy: destroy, lang: function () { try { return api.lang(); } catch (e) { return 'en'; } }
    };
  }

  function register(def) {
    if (window.XPDesktop && typeof window.XPDesktop.registerApp === 'function') window.XPDesktop.registerApp(def);
  }

  window.XPApps = {
    version: 1,
    icons: icons, g16: g16, g24: g24, svg: svg,
    person: person, contacts: contacts, osName: osName, osEdition: osEdition, osVersion: osVersion, pcName: pcName, projects: projects, appAliases: appAliases,
    ui: ui, copyText: copyText, phuketNow: phuketNow, pad: pad, reduced: reduced, isDict: isDict,
    register: register,
    findProject: function (id) { for (var i = 0; i < projects.length; i++) if (projects[i].id === id) return projects[i]; return null; }
  };
})();

export {};
