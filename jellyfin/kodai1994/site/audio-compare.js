(function () {
	'use strict';
	var DIR = '/kodai1994/hls/audio-compare/';
	var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>', PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
	function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
	function mmss(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
	var decks = [];
	function clip(c) {
		var sec = el('section', 'clip');
		var p = el('p', 'muted'); p.append(el('span', 'place', c.kind === 'outdoor' ? 'Outdoors' : 'Indoors'), c.why + ' · from ' + mmss(c.at) + ' into the recording');
		sec.append(el('h2', '', c.title), p);
		var audios = {};
		c.variants.forEach(function (v) { audios[v.key] = new Audio(DIR + c.id + '-' + v.key + '.m4a'); audios[v.key].preload = 'metadata'; });
		var which = c['default'], deck = el('div', 'deck');
		var play = el('button', 'play'); play.type = 'button'; play.innerHTML = PLAY; play.setAttribute('aria-label', 'Play ' + c.title);
		var seg = el('span', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Version');
		var time = el('span', 'time', '0:00 / 0:40'), track = el('div', 'track'), fill = el('span');
		track.appendChild(fill);
		function cur() { return audios[which]; }
		function draw() {
			var a = cur(); fill.style.width = (a.duration ? a.currentTime / a.duration * 100 : 0) + '%';
			time.textContent = mmss(a.currentTime) + ' / ' + mmss(a.duration || 40);
			play.innerHTML = a.paused ? PLAY : PAUSE;
		}
		c.variants.forEach(function (v) {
			var b = el('button', '', v.label); b.type = 'button'; b.dataset.key = v.key; b.setAttribute('aria-pressed', String(v.key === which));
			b.addEventListener('click', function () {
				if (v.key === which) return;
				var from = cur(), to = audios[v.key], wasPlaying = !from.paused;
				to.currentTime = from.currentTime; from.pause(); which = v.key;
				seg.querySelectorAll('button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
				if (wasPlaying) to.play();
				draw();
			});
			seg.appendChild(b);
		});
		var api = { stop: function () { Object.keys(audios).forEach(function (k) { audios[k].pause(); }); } };
		play.addEventListener('click', function () {
			var a = cur();
			if (a.paused) { decks.forEach(function (d) { if (d !== api) d.stop(); }); a.play(); } else a.pause();
		});
		track.addEventListener('click', function (ev) {
			var a = cur(), r = track.getBoundingClientRect();
			if (a.duration) a.currentTime = (ev.clientX - r.left) / r.width * a.duration;
		});
		Object.keys(audios).forEach(function (k) {
			['timeupdate', 'play', 'pause', 'loadedmetadata', 'ended'].forEach(function (ev) { audios[k].addEventListener(ev, draw); });
		});
		decks.push(api);
		deck.append(play, seg, time, track);
		sec.appendChild(deck);
		return sec;
	}
	fetch(DIR + 'clips.json', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
		if (r.status === 401) throw new Error('Sign in on the Kodai 1994 page first, then come back here.');
		if (!r.ok) throw new Error('The clips couldn’t be loaded (' + r.status + ').');
		return r.json();
	}).then(function (list) {
		document.getElementById('status').remove();
		var box = document.getElementById('list');
		list.forEach(function (c) { box.appendChild(clip(c)); });
	}).catch(function (ex) { document.getElementById('status').textContent = ex.message; });
})();
