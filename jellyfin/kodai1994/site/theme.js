// Light / dark theme for every Kodai 1994 page. Loaded in <head> without defer, so the
// saved choice applies before the page is drawn (no flash). Dark is the default.
// Any element with data-theme-toggle becomes a switch; pages can listen for "themechange".
(function () {
	'use strict';
	var KEY = 'yajur-kodai-theme', root = document.documentElement;
	var BG = { dark: '#0c1912', light: '#f6f2ea' };
	// Lucide sun and moon (ISC licence)
	var SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>';
	var MOON = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';
	function saved() { try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } }
	function current() { return root.dataset.theme === 'light' ? 'light' : 'dark'; }
	function apply(theme) {
		if (theme === 'light') root.dataset.theme = 'light'; else delete root.dataset.theme;
		var meta = document.querySelector('meta[name=theme-color]');
		if (meta) meta.content = BG[theme];
		document.querySelectorAll('[data-theme-toggle]').forEach(paint);
	}
	function paint(b) {
		var light = current() === 'light';
		// shows what you'd switch to
		b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (light ? MOON : SUN) + '</svg>';
		var label = light ? 'Switch to the dark theme' : 'Switch to the light theme';
		b.setAttribute('aria-label', label); b.title = label;
	}
	apply(saved());
	document.addEventListener('DOMContentLoaded', function () {
		apply(current());
		document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
			b.addEventListener('click', function () {
				var next = current() === 'light' ? 'dark' : 'light';
				try { localStorage.setItem(KEY, next); } catch (e) {}
				apply(next);
				document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
			});
		});
	});
})();
