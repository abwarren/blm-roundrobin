// ==UserScript==
// @name         BLM Parlay Builder — PokerBet Overlay
// @namespace    https://blm.nousresearch.com
// @version      0.1.0
// @description  Build parlays from PokerBet live basketball O/U markets
// @author       RedCapeTech (abwarren)
// @match        https://www.pokerbet.co.za/en/sports/live*
// @match        https://www.pokerbet.co.za/en/sports
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      localhost
// @connect      127.0.0.1
// @require      file:///home/wa/projects/blm-roundrobin/overlay/src/main.js
// ==/UserScript==

/* BLM Parlay Builder — Entry point
 *
 * The @require directives load each module from the local filesystem
 * during development. For release, these are bundled into a single file.
 *
 * During dev, run a local HTTP server:
 *   cd projects/blm-roundrobin/overlay && python3 -m http.server 8765
 *
 * Then switch @require to:
 *   @require http://localhost:8765/src/main.js
 */
