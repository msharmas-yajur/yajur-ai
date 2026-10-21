(function () {
	'use strict';
	var DIR = '/kodai1994/hls/video-compare/';
	var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>', PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
	var $ = function (id) { return document.getElementById(id); };
	function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
	function mmss(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
	var vl = $('vl'), vr = $('vr'), opts = [], side = { l: 'original', r: 'clearer' }, zoom = 1, sound = false, ox = 50, oy = 40;

	function label(k) { return (opts.filter(function (o) { return o.key === k; })[0] || {}).label || k; }
	function setSide(which, key) {
		var v = which === 'l' ? vl : vr, other = which === 'l' ? vr : vl, t = other.currentTime || 0, playing = !other.paused;
		side[which] = key; v.src = DIR + key + '.mp4';
		v.addEventListener('loadedmetadata', function once() { v.removeEventListener('loadedmetadata', once); v.currentTime = t; if (playing) v.play().catch(function () {}); });
		$('tag-' + which).textContent = label(key);
		drawOpts(); applySound();
	}
	function applySound() { vl.muted = !sound; vr.muted = true; }   // one sound only: the left-hand video's
	function drawOpts() {
		var box = $('opts'); box.textContent = '';
		opts.forEach(function (o) {
			var c = el('section', 'opt' + (side.l === o.key ? ' is-l' : '') + (side.r === o.key ? ' is-r' : ''));
			c.append(el('h2', '', o.label), el('p', '', o.desc), el('div', 'cost', o.cost));
			var s = el('div', 'sides');
			[['l', 'Left'], ['r', 'Right']].forEach(function (x) {
				var b = el('button', '', x[1]); b.type = 'button'; b.disabled = !o.ready;
				b.setAttribute('aria-pressed', String(side[x[0]] === o.key));
				b.setAttribute('aria-label', 'Show ' + o.label + ' on the ' + x[1].toLowerCase());
				b.addEventListener('click', function () { if (side[x[0]] !== o.key) setSide(x[0], o.key); });
				s.appendChild(b);
			});
			c.appendChild(s); box.appendChild(c);
		});
	}
	// Keep the two together: the left one leads.
	function draw() { $('play').innerHTML = vl.paused ? PLAY : PAUSE; $('play').setAttribute('aria-label', vl.paused ? 'Play' : 'Pause'); $('time').textContent = mmss(vl.currentTime) + ' / ' + mmss(vl.duration || 30); }
	setInterval(function () { if (!vl.paused && Math.abs(vr.currentTime - vl.currentTime) > 0.1) vr.currentTime = vl.currentTime; }, 500);
	['play', 'pause', 'timeupdate', 'loadedmetadata'].forEach(function (e) { vl.addEventListener(e, draw); });
	vl.addEventListener('seeked', function () { vr.currentTime = vl.currentTime; });
	$('play').addEventListener('click', function () {
		if (vl.paused) { vr.currentTime = vl.currentTime; Promise.all([vl.play(), vr.play()]).catch(function () {}); }
		else { vl.pause(); vr.pause(); }
	});
	// The divider line is drawn over the stage; the split itself is inside the zoomed picture, so
	// at 2x it's placed where that line falls on the enlarged picture.
	function layout() {
		var p = +$('cut').value, c = zoom > 1 ? ox + (p - ox) / zoom : p;
		$('stage').style.setProperty('--cut', p + '%');
		vr.style.clipPath = 'inset(0 0 0 ' + c + '%)';
		$('zoom').style.transformOrigin = (zoom > 1 ? ox : 50) + '% ' + (zoom > 1 ? oy : 40) + '%';
		$('zoom').style.transform = 'scale(' + zoom + ')';
	}
	$('cut').addEventListener('input', layout);
	// At 2x, where the divider is let go is where to look
	$('cut').addEventListener('pointerup', function (ev) {
		if (zoom === 1) return;
		var r = $('stage').getBoundingClientRect();
		ox = (ev.clientX - r.left) / r.width * 100; oy = (ev.clientY - r.top) / r.height * 100;
		layout();
	});
	document.querySelectorAll('[data-z]').forEach(function (b) {
		b.addEventListener('click', function () {
			zoom = +b.dataset.z; ox = +$('cut').value; layout();
			document.querySelectorAll('[data-z]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
		});
	});
	document.querySelectorAll('[data-snd]').forEach(function (b) {
		b.addEventListener('click', function () {
			sound = b.dataset.snd === 'on'; applySound();
			document.querySelectorAll('[data-snd]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
		});
	});
	$('stage').addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

	fetch(DIR + 'options.json', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
		if (r.status === 401) throw new Error('Sign in on the Kodai 1994 page first, then come back here.');
		if (!r.ok) throw new Error('The clips couldn’t be loaded (' + r.status + ').');
		return r.json();
	}).then(function (list) {
		opts = list; $('status').remove(); $('layout').hidden = false;
		layout();
		setSide('l', 'original'); setSide('r', 'clearer'); draw();
	}).catch(function (ex) { $('status').textContent = ex.message; });
})();
