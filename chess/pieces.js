// Tactics Chess: the piece art. Flat silhouettes on a 45 × 45 grid, drawn for this game.
// Each piece is a body (filled in the side's colour, outlined) and detail lines (in the contrasting colour).
(function (root) {
  'use strict';
  const ART = {
    pawn: {
      body: '<path d="M22.5 9a4.2 4.2 0 0 0-3.4 6.7A6.6 6.6 0 0 0 16 21.2c0 2.2 1 4.1 2.6 5.3C15.4 28 11.5 31.8 11.5 38.5h22c0-6.7-3.9-10.5-7.1-12 1.6-1.2 2.6-3.1 2.6-5.3a6.6 6.6 0 0 0-3.1-5.5A4.2 4.2 0 0 0 22.5 9z"/>',
      lines: '',
    },
    rook: {
      body: '<path d="M9 39h27v-3.5H9z"/><path d="M12 35.5l1.5-4h18l1.5 4z"/><path d="M14 31.5V17h17v14.5z"/><path d="M11 14V9h4v2.5h4.5V9h6v2.5H30V9h4v5l-3 3H14z"/>',
      lines: '<path d="M14 17h17M13.5 31.5h18M12 35.5h21"/>',
    },
    knight: {
      body: '<path d="M24 10c7.5.8 13 6.5 13.3 16 .2 6.5-.3 10-.3 13H16.5c0-5 1.6-8 5.5-11.4 2.5-2.2 2.9-5.2 1.6-7-1 1.8-2.8 2.8-4.8 3.5-1.5.5-2.4 1.7-3.2 2.9-1.3 2-4.5 1.8-5.7-.4-.9-1.6-.5-3.2.8-4.6 2-2.1 3.5-5 4.4-7.5.6-1.6 1.6-2.9 2.9-3.9l-.5-3.8 2.8 2.2 1.4-3.2z"/>',
      lines: '<circle cx="17.3" cy="18.6" r="1.1" fill="INK" stroke="none"/><path d="M26 13.5c4.6 1.8 7.8 6.4 8.3 13.5"/><path d="M11.6 25.2l1.4-.5"/>',
    },
    bishop: {
      body: '<circle cx="22.5" cy="8.3" r="2.6"/><path d="M22.5 11c-5.5 3.5-8 8-7.5 12.5.4 3 2.3 5 3 6.5h9c.7-1.5 2.6-3.5 3-6.5.5-4.5-2-9-7.5-12.5z"/><path d="M17.2 30h10.6l1 3.6H16.2z"/><path d="M10 39.5c4-1.2 8.5-2.2 12.5-5.9 4 3.7 8.5 4.7 12.5 5.9v.6H10z"/>',
      lines: '<path d="M20 20.5h5M22.5 18v5"/>',
    },
    queen: {
      body: '<path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.7 13.6-2.5-14.5-2.5 14.5-5.7-13.6L14 25 6.5 13.5z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5-1.5 1.5 0 2.5 0 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><circle cx="6.5" cy="12" r="2"/><circle cx="14.5" cy="9.5" r="2"/><circle cx="22.5" cy="8" r="2"/><circle cx="30.5" cy="9.5" r="2"/><circle cx="38.5" cy="12" r="2"/>',
      lines: '<path d="M11.5 30c6-1 16-1 22 0M12 33.5c6-1 15-1 21 0"/>',
    },
    king: {
      body: '<path d="M22.5 11.8V5.5M19.6 8.3h5.8" fill="none"/><path d="M18.6 21.2c0-4.3 1.8-7.4 3.9-7.4s3.9 3.1 3.9 7.4z"/><path d="M12.5 37.5c5.5 3 14.5 3 20 0V31s8.5-4.5 6-11c-3-6.5-12-4-16 3-4-7-13-9.5-16-3-2.5 6.5 6 11 6 11z"/>',
      lines: '<path d="M12.5 31c5.5-3 14.5-3 20 0M12.5 34.5c5.5-3 14.5-3 20 0"/>',
    },
  };
  // An <svg> of the piece for `side` ('white' or 'black').
  function pieceSVG(type, side, cls = '') {
    const a = ART[type], w = side === 'white';
    const fill = w ? '#fff' : '#1f1b18', edge = w ? '#1f1b18' : '#000', ink = w ? '#1f1b18' : '#ece4d4';
    return `<svg class="${cls}" viewBox="0 0 45 45" aria-hidden="true">` +
      `<g fill="${fill}" stroke="${edge}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${a.body}</g>` +
      `<g fill="none" stroke="${ink}" stroke-width="1.4" stroke-linecap="round">${a.lines.replace(/INK/g, ink)}</g></svg>`;
  }
  root.PIECES = { ART, pieceSVG };
})(typeof window !== 'undefined' ? window : globalThis);
