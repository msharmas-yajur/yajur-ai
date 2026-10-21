(function () {
	'use strict';
	var HLS = '/kodai1994/hls/';
	function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
	function crop(node, src, ph, b) {
		var W = ph.w, H = ph.h, side = Math.max(b.w * W, b.h * H) * 1.4;
		var sx = Math.min(side / W, 1), sy = Math.min(side / H, 1);
		var left = Math.max(0, Math.min(1 - sx, b.x + b.w / 2 - sx / 2)), top = Math.max(0, Math.min(1 - sy, b.y + b.h / 2 - sy / 2));
		node.style.backgroundImage = 'url("' + src + '")';
		node.style.backgroundSize = (100 / sx) + '% ' + (100 / sy) + '%';
		node.style.backgroundPosition = (sx >= 1 ? 0 : left / (1 - sx) * 100) + '% ' + (sy >= 1 ? 0 : top / (1 - sy) * 100) + '%';
	}
	fetch(HLS + 'photos/photos.json', { credentials: 'same-origin' }).then(function (r) {
		if (r.status === 401) throw new Error('Sign in on the Kodai 1994 page first, then reload this page.');
		return r.json();
	}).then(function (photos) {
		document.getElementById('status').remove();
		var list = document.getElementById('list');
		photos.forEach(function (ph, i) {
			if (Number(ph.id) >= 101) return;   // members' uploads have no enhanced copy (as the photo viewer knows)
			var sec = el('section', 'photo');
			sec.appendChild(el('h2', '', 'Photo ' + (i + 1) + '  ·  ' + ph.w + '×' + ph.h + ' → ' + ph.w * 2 + '×' + ph.h * 2));
			var cmp = el('div', 'compare');
			var before = el('img'); before.src = HLS + 'photos/' + ph.src; before.alt = 'Original photo ' + (i + 1);
			var afterBox = el('div', 'after'); var after = el('img'); after.src = HLS + 'photos-enhanced/' + ph.id + '.jpg'; after.alt = 'Enhanced photo ' + (i + 1);
			afterBox.appendChild(after);
			after.onerror = function () { sec.remove(); };   // not enhanced (yet): nothing to compare
			var range = el('input'); range.type = 'range'; range.min = 0; range.max = 100; range.value = 50; range.setAttribute('aria-label', 'Compare original and enhanced');
			range.addEventListener('input', function () { cmp.style.setProperty('--cut', range.value + '%'); });
			[before, afterBox, el('div', 'bar'), el('div', 'knob', '↔'), el('span', 'tag tag--before', 'Original'), el('span', 'tag tag--after', 'Enhanced'), range].forEach(function (n) { cmp.appendChild(n); });
			cmp.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
			sec.appendChild(cmp);
			var faces = el('div', 'faces'); sec.appendChild(faces);
			fetch('/kodai1994/api/photo-faces?photo=' + ph.id, { credentials: 'same-origin', headers: { 'X-Kodai': '1' } })
				.then(function (r) { return r.ok ? r.json() : []; }).then(function (list) {
					list.forEach(function (fc) {
						var pair = el('div', 'pair'), a = el('div'), b = el('div');
						crop(a, HLS + 'photos/' + ph.src, ph, fc.box); crop(b, HLS + 'photos-enhanced/' + ph.id + '.jpg', ph, fc.box);
						pair.appendChild(a); pair.appendChild(b);
						pair.appendChild(el('span', '', 'original')); pair.appendChild(el('span', '', 'enhanced'));
						pair.appendChild(el('p', '', fc.name));
						faces.appendChild(pair);
					});
				});
			list.appendChild(sec);
		});
	}).catch(function (ex) { document.getElementById('status').textContent = ex.message; });
})();
