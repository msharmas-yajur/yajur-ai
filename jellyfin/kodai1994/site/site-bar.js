// Kodai 1994: the top bar of the pages outside the main app (identify.html, audio-compare.html),
// the same as index.html's. Include it right after <div id="site-bar" data-current="…">, before
// theme.js wires the theme switches (on DOMContentLoaded). data-current marks the page in the menu.
(function () {
	'use strict';
	var slot = document.getElementById('site-bar');
	if (!slot) return;
	var APP = '/kodai1994/';
	var PAGES = [['home', APP + '#view=home', 'Home'], ['videos', APP + '#view=videos', 'Videos'], ['photos', APP + '#view=photos', 'Photos'],
		['people', APP + '#view=people', 'People'], ['memories', APP + '#view=memories', 'Memories'],
		['identify', APP + 'identify.html', 'Identify faces'], ['sound', APP + 'audio-compare.html', 'Sound'], ['enhance', APP + 'video-compare.html', 'Video Enhancement']];
	var bar = document.createElement('div');
	bar.className = 'site-bar'; bar.id = 'bar';
	bar.innerHTML =
		'<a class="bar__home" href="' + APP + '#view=home" aria-label="Home" title="Home"><img class="logo" src="/kodai1994/brand/logo.png" alt="Sri Sathya Sai Centenary Celebrations" width="72" height="72"><span class="bar__brand">KODAI 1994</span></a>' +
		'<nav class="views nav" id="nav" aria-label="Pages">' +
		PAGES.map(function (p) { return '<a href="' + p[1] + '"' + (p[0] === slot.dataset.current ? ' aria-current="page"' : '') + '>' + p[2] + '</a>'; }).join('') +
		'<div class="nav__extra"><span class="muted" id="signed-in"></span>' +
		'<button class="theme-toggle" data-theme-toggle type="button" aria-label="Switch theme"></button>' +
		'<a href="' + APP + '#account">Account</a><a href="' + APP + '#signout">Sign out</a></div>' +
		'</nav>' +
		'<div class="bar__actions">' +
		'<a class="icon-round" href="' + APP + '#search" aria-label="Search" title="Search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></a>' +
		'<a class="icon-round" href="' + APP + '#notifications" aria-label="Notifications" title="Notifications"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg></a>' +
		'<button class="theme-toggle" data-theme-toggle type="button" aria-label="Switch theme"></button>' +
		'<a class="btn btn--quiet acct" id="acct" href="' + APP + '#account" aria-label="Account"><span class="acct__avatar" id="acct-avatar" aria-hidden="true"></span><span class="acct__name" id="acct-name">Account</span></a>' +
		'<a class="btn btn--quiet" href="' + APP + '#signout">Sign out</a>' +
		'<button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="nav" aria-label="Menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg></button>' +
		'</div>';
	slot.replaceWith(bar);

	// Tablets and phones: the pages fold into a menu (as on the main pages)
	var btn = bar.querySelector('#menu-btn');
	function setOpen(open) { bar.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); }
	btn.addEventListener('click', function (ev) { ev.stopPropagation(); setOpen(!bar.classList.contains('is-open')); });
	document.addEventListener('click', function (ev) { if (!bar.contains(ev.target)) setOpen(false); });
	document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') setOpen(false); });

	// Who's signed in, on the Account button
	fetch(APP + 'api/me', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (me) {
		if (!me) return;
		var who = me.displayName || me.username;
		bar.querySelector('#signed-in').textContent = 'Signed in as ' + who;
		bar.querySelector('#acct-name').textContent = who; bar.querySelector('#acct').title = who;
		bar.querySelector('#acct-avatar').textContent = who.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
		bar.querySelector('#acct').setAttribute('aria-label', 'Account: signed in as ' + who);
	}).catch(function () {});
})();
