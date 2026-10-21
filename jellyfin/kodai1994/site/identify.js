(function () {
	'use strict';
	var HLS = '/kodai1994/hls/', LIBRARY = 'Kodai 1994';
	var LIKELY = 0.35;  // worker.py: STRONG (scores at or above it are "likely", the rest "possible")
	var $ = function (id) { return document.getElementById(id); };
	function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
	function storeGet(store, key) { try { return window[store].getItem(key); } catch (e) { return null; } }
	function fmtTime(s) {
		s = Math.max(0, Math.floor(s || 0));
		var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
		return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(sec).padStart(2, '0');
	}
	function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

	var session = null;   // { userId }, from /api/me

	// Community service (same as index.html): identity comes from the kodai_auth cookie.
	function capi(path, opts) {
		opts = opts || {};
		var headers = { 'X-Kodai': '1' };
		if (opts.body) headers['Content-Type'] = 'application/json';
		return fetch('/kodai1994/api' + path, { method: opts.method || 'GET', headers: headers, credentials: 'same-origin', cache: 'no-store',
			body: opts.body ? JSON.stringify(opts.body) : undefined })
			.then(function (res) {
				return res.json().catch(function () { return {}; }).then(function (data) {
					if (!res.ok) { var err = new Error(data.error || 'The server answered ' + res.status + '. Try again in a moment.'); err.status = res.status; err.data = data; throw err; }
					return data;
				});
			});
	}
	// Jellyfin through the gateway, which adds the member's token from the HttpOnly cookie (as index.js)
	function jellyfin(path) {
		return fetch('/kodai1994/jf' + path, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
			if (!r.ok) throw Object.assign(new Error('Jellyfin answered ' + r.status), { status: r.status });
			return r.json();
		});
	}
	function getJson(url) { return fetch(url, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { if (!r.ok) throw Object.assign(new Error(r.status), { status: r.status }); return r.json(); }); }

	// "1994-04-14 - April 14th - Discourse (Tamil New Year)" → title + date; slug matches package-hls.sh.
	function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
	function parseName(name) {
		var m = /^(\d{4})-(\d{2})(?:-(\d{2}))? - (.*)$/.exec(name || '') || [null, '1994', '0', null, name];
		var rest = m[4], phrase = rest, detail = '';
		var split = /^((?:April|May)(?: [0-9]{1,2}(?:st|nd|rd|th))?(?: & [0-9]{1,2}(?:st|nd|rd|th))?)(?: \(date not recorded\))?(?: - (.*))?$/.exec(rest);
		if (split) { phrase = split[1]; detail = split[2] || ''; }
		var day = m[3] ? +m[3] : null;
		var date = day ? new Date(Date.UTC(+m[1], +m[2] - 1, day)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
			: phrase + ' 1994, date not recorded';
		return { title: detail ? phrase + ': ' + detail : phrase, date: date };
	}

	var state = { kind: 'video', videos: [], photos: [], photoById: {}, runs: {}, people: [], personById: {}, me: null,
		current: null, data: null, filter: 'pending', hot: null, player: null, poll: null, marks: [],
		show: /^(hand|found|both)$/.test(storeGet('localStorage', 'kodai-identify-show') || '') ? storeGet('localStorage', 'kodai-identify-show') : 'both' };

	function photoCrop(node, photoId, box) {
		var ph = state.photoById[photoId];
		if (!ph) return;
		var W = ph.w, H = ph.h, side = Math.max(box.w * W, box.h * H) * 1.5;
		var sx = Math.min(side / W, 1), sy = Math.min(side / H, 1);
		var left = Math.max(0, Math.min(1 - sx, box.x + box.w / 2 - sx / 2)), top = Math.max(0, Math.min(1 - sy, box.y + box.h / 2 - sy / 2));
		node.style.backgroundImage = 'url("' + HLS + 'photos/' + ph.src + '")';
		node.style.backgroundSize = (100 / sx) + '% ' + (100 / sy) + '%';
		node.style.backgroundPosition = (sx >= 1 ? 0 : left / (1 - sx) * 100) + '% ' + (sy >= 1 ? 0 : top / (1 - sy) * 100) + '%';
	}

	// ── Start: who am I, what's in the collection, what has been identified so far
	function signInFirst() {
		$('status').innerHTML = '';
		$('status').append('Sign in on the ', Object.assign(el('a', '', 'Kodai 1994 page'), { href: '/kodai1994/' }), ' first, then come back here.');
	}
	function start() {
		// Who's signed in: the HttpOnly cookie, which only the server can read
		capi('/session').then(function (s) { if (!s.signedIn) return signInFirst(); session = { userId: s.userId }; begin(); },
			function (e) { $('status').textContent = e.message; });
	}
	function begin() {
		Promise.all([
			jellyfin('/UserViews?userId=' + session.userId).then(function (views) {
				var lib = (views.Items || []).filter(function (v) { return v.Name === LIBRARY; })[0];
				if (!lib) throw new Error('This account can’t open the ' + LIBRARY + ' recordings.');
				return jellyfin('/Items?userId=' + session.userId + '&ParentId=' + lib.Id + '&Recursive=true&IncludeItemTypes=Movie,Video&SortBy=SortName&SortOrder=Ascending&Limit=500');
			}),
			getJson(HLS + 'ready.json').catch(function () { return []; }),
			getJson(HLS + 'photos/photos.json'),
			capi('/me'), capi('/people'), capi('/identify/runs')
		]).then(function (res) {
			var ready = {}; (res[1] || []).forEach(function (s) { ready[s] = true; });
			state.videos = (res[0].Items || []).map(function (it) { var p = parseName(it.Name); return { kind: 'video', key: slug(it.Name), title: p.title, sub: p.date }; })
				.filter(function (v) { return ready[v.key]; });
			state.photos = res[2].map(function (ph, i) { state.photoById[ph.id] = ph; return { kind: 'photo', key: ph.id, title: 'Photo ' + (i + 1), sub: ph.w + ' × ' + ph.h }; });
			state.me = res[3];
			setPeople(res[4]);
			setRuns(res[5]);
			$('status').hidden = true; $('layout').hidden = false;
			var m = /^#(video|photo)\/([a-z0-9-]+)$/.exec(location.hash);
			if (m) state.kind = m[1];
			renderTabs(); renderItems();
			if (m) select(m[1], m[2], true);
			setInterval(refreshRuns, 15000);
		}).catch(function (e) {
			$('status').textContent = e.status === 401 ? 'Your session has ended. Sign in again on the Kodai 1994 page.' : e.message;
		});
	}
	function setPeople(list) { state.people = list; state.personById = {}; list.forEach(function (p) { state.personById[p.id] = p; }); }
	function setRuns(list) { state.runs = {}; list.forEach(function (r) { state.runs[r.target] = r; }); }
	function refreshRuns() { capi('/identify/runs').then(function (l) { setRuns(l); renderItems(); }).catch(function () {}); }

	// ── Left: the list of recordings / photos with where each one stands
	function renderTabs() {
		document.querySelectorAll('.tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.kind === state.kind)); });
	}
	document.querySelectorAll('.tabs button').forEach(function (b) {
		b.addEventListener('click', function () { state.kind = b.dataset.kind; renderTabs(); renderItems(); });
	});
	function runLabel(run) {
		if (!run) return { text: 'Not identified yet' };
		var c = run.counts || {};
		if (run.status === 'queued') return { text: run.place > 0 ? 'Waiting: ' + plural(run.place, 'run') + ' ahead' : 'Starting…' };
		if (run.status === 'running') return { text: 'Identifying… ' + Math.round(run.progress * 100) + '%' };
		if (run.status === 'failed') return { text: 'Last run failed' };
		if (c.pending) return { text: c.pending + ' to review', review: true };
		if (c.confirmed) return { text: plural(c.confirmed, 'face') + ' confirmed' };
		return { text: run.status === 'cancelled' ? 'Cancelled' : 'Nothing left to review' };
	}
	function renderItems() {
		var ul = $('items'); ul.textContent = '';
		var list = state.kind === 'video' ? state.videos : state.photos;
		list.forEach(function (it) {
			var li = el('li'), b = el('button', 'item'), th = el('span', 'thumb'), txt = el('span');
			b.type = 'button';
			th.style.backgroundImage = 'url("' + (it.kind === 'video' ? HLS + it.key + '/thumb.jpg' : HLS + 'photos/' + state.photoById[it.key].thumb) + '")';
			var lab = runLabel(state.runs[it.kind + ':' + it.key]);
			txt.append(el('b', '', it.title), el('small', '', it.sub), el('small', lab.review ? 'is-review' : '', lab.text));
			b.append(th, txt);
			if (state.current && state.current.kind === it.kind && state.current.key === it.key) b.setAttribute('aria-current', 'true');
			b.addEventListener('click', function () { select(it.kind, it.key); });
			li.appendChild(b); ul.appendChild(li);
		});
	}

	// ── Right: one recording or photo, its run, and the faces to review
	function select(kind, key, fromHash) {
		var it = (kind === 'video' ? state.videos : state.photos).filter(function (x) { return x.key === key; })[0];
		if (!it) return;
		state.current = it; state.data = null; state.filter = 'pending'; state.hot = null;
		if (!fromHash) { try { history.replaceState(null, '', '#' + kind + '/' + key); } catch (e) {} }
		$('layout').classList.add('is-detail');
		renderItems();
		buildDetail();
		load();
	}
	function target() { return state.current.kind + ':' + state.current.key; }
	function load() {
		var t = target();
		return Promise.all([capi('/identify/suggestions?target=' + encodeURIComponent(t)),
			state.current.kind === 'photo' ? capi('/photo-faces?photo=' + state.current.key) : Promise.resolve([])]).then(function (res) {
			var d = res[0];
			if (!state.current || target() !== t) return;
			state.data = d; state.marks = res[1];
			if (d.run) { state.runs[t] = d.run; renderItems(); }
			renderRun(); renderFaces();
			clearTimeout(state.poll);
			if (d.run && (d.run.status === 'queued' || d.run.status === 'running')) state.poll = setTimeout(load, 4000);
		}).catch(function (e) { $('run-text').textContent = e.message; });
	}

	function buildDetail() {
		var it = state.current, d = $('detail');
		if (state.player) { state.player.dispose(); state.player = null; }
		clearTimeout(state.poll);
		d.textContent = '';
		var back = el('button', 'btn btn--quiet btn--small back', '← All ' + (it.kind === 'video' ? 'recordings' : 'photos'));
		back.type = 'button';
		back.addEventListener('click', function () { $('layout').classList.remove('is-detail'); });
		d.append(back, el('h2', '', it.title), el('p', 'muted', it.sub));
		d.insertAdjacentHTML('beforeend', '<div class="run" id="run"><p id="run-text">Loading…</p><span id="run-actions"></span><div class="bar" id="run-bar" hidden><span></span></div></div>');
		var stage = el('div', 'stage'); stage.id = 'stage';
		stage.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
		if (it.kind === 'video') {
			var v = el('video', 'video-js vjs-big-play-centered'); v.setAttribute('playsinline', ''); v.setAttribute('controls', '');
			stage.appendChild(v); d.appendChild(stage);
			state.player = videojs(v, { controls: true, preload: 'metadata', playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
				controlBar: { pictureInPictureToggle: false, skipButtons: { backward: 10, forward: 10 } }, poster: HLS + it.key + '/thumb.jpg' });
			state.player.src({ src: HLS + it.key + '/master.m3u8', type: 'application/x-mpegURL' });
		} else {
			var ph = state.photoById[it.key], img = el('img');
			img.src = HLS + 'photos/' + ph.src; img.alt = it.title; img.draggable = false;
			stage.append(img, Object.assign(el('div', 'boxes'), { id: 'boxes' }));
			d.appendChild(showBar());
			d.appendChild(stage);
		}
		var np = el('div', 'name-prompt'); np.id = 'name-prompt'; np.hidden = true; d.appendChild(np);
		var f = el('div', 'filters'); f.id = 'filters'; f.setAttribute('role', 'group'); f.setAttribute('aria-label', 'Show');
		d.appendChild(f);
		var faces = el('div'); faces.id = 'faces'; d.appendChild(faces);
	}

	// Faces marked by hand, faces identification found, or both, on the photo.
	function showBar() {
		var bar = el('div', 'show'), seg = el('span', 'seg');
		seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Faces on the photo');
		bar.append('Show');
		[['hand', 'Marked by hand'], ['found', 'Detected'], ['both', 'Both']].forEach(function (x) {
			var b = el('button', '', x[1]); b.type = 'button'; b.dataset.show = x[0];
			b.setAttribute('aria-pressed', String(state.show === x[0]));
			b.addEventListener('click', function () {
				state.show = x[0]; try { localStorage.setItem('kodai-identify-show', x[0]); } catch (e) {}
				seg.querySelectorAll('button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
				renderBoxes(state.data ? state.data.suggestions : []);
			});
			seg.appendChild(b);
		});
		var k1 = el('span', 'key'), k2 = el('span', 'key');
		k1.append(el('i'), 'by hand'); k2.append(el('i', 'is-found'), 'detected');
		bar.append(seg, k1, k2);
		return bar;
	}

	function renderRun() {
		var run = state.data.run, text = $('run-text'), acts = $('run-actions'), bar = $('run-bar');
		acts.textContent = '';
		var active = run && (run.status === 'queued' || run.status === 'running');
		bar.hidden = !active;
		if (active) bar.firstChild.style.width = Math.max(3, run.progress * 100) + '%';
		if (!run) text.textContent = 'This ' + (state.current.kind === 'video' ? 'recording' : 'photo') + ' hasn’t been identified yet. It takes about ' +
			(state.current.kind === 'video' ? '15–30 minutes for a recording' : 'a minute') + '; you can leave this page and come back.';
		else if (run.status === 'queued') text.textContent = run.place > 0 ? 'Waiting its turn: ' + plural(run.place, 'run') + ' ahead. Runs go one at a time so the recordings keep playing smoothly.' : 'Starting…';
		else if (run.status === 'running') text.textContent = (run.message || 'Identifying faces') + '…';
		else if (run.status === 'failed') text.textContent = run.message || 'The last run didn’t finish.';
		else if (run.status === 'cancelled') text.textContent = 'The last run was cancelled.';
		else text.textContent = 'Identified ' + new Date(run.finishedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) +
			' by ' + run.requestedBy + ', using ' + plural(run.refs || 0, 'marked face') + ' of ' + plural(run.people || 0, 'person').replace('persons', 'people') + '. ' + (run.message || '') + '.';
		if (active) {
			var cancel = el('button', 'btn btn--quiet btn--small', 'Cancel'); cancel.type = 'button';
			cancel.addEventListener('click', function () {
				cancel.disabled = true;
				capi('/identify/runs/' + run.id, { method: 'DELETE' }).then(load).catch(function (e) { text.textContent = e.message; cancel.disabled = false; });
			});
			acts.appendChild(cancel);
		} else {
			var go = el('button', 'btn', run ? 'Identify again' : 'Identify faces'); go.type = 'button';
			go.title = 'Faces already confirmed or rejected aren’t suggested again';
			go.addEventListener('click', function () {
				go.disabled = true;
				capi('/identify/runs', { method: 'POST', body: { target: target() } }).then(load).catch(function (e) { text.textContent = e.message; go.disabled = false; });
			});
			acts.appendChild(go);
		}
		var old = $('run').querySelector('.fresh'); if (old) old.remove();
		var d = state.data;
		if (state.current.kind !== 'photo' || !d.canClear || active) return;
		var fresh = el('div', 'fresh');
		if (d.cleared) {
			fresh.appendChild(el('p', '', plural(d.cleared.count, 'face') + ' marked by hand ' + (d.cleared.count === 1 ? 'was' : 'were') + ' set aside by ' + d.cleared.by +
				' for a fresh run. Confirm the faces below, or put the marks back.'));
			var restore = el('button', 'btn btn--quiet btn--small', 'Restore marks'); restore.type = 'button';
			restore.title = 'Marks for faces or people marked again since are left out';
			restore.addEventListener('click', function () {
				restore.disabled = true;
				capi('/identify/restore', { method: 'POST', body: { photo: state.current.key } }).then(function (r) {
					return load().then(function () { text.textContent = plural(r.restored, 'mark') + ' restored' + (r.skipped ? ', ' + r.skipped + ' left out (marked again since)' : '') + '.'; });
				}).catch(function (e) { text.textContent = e.message; restore.disabled = false; });
			});
			fresh.appendChild(restore);
		} else if ((state.marks || []).length) {
			fresh.appendChild(el('p', 'muted', 'Marks look wrong, or want to see what identification finds on its own? Set the ' +
				plural(state.marks.length, 'face') + ' marked by hand aside and identify the photo afresh. Who’s tagged in the photo stays.'));
			var clear = el('button', 'btn btn--quiet btn--small', 'Clear marks and re-run'); clear.type = 'button';
			clear.addEventListener('click', function () {
				clear.hidden = true;
				var sure = el('button', 'btn btn--small', 'Clear ' + state.marks.length + ' marks and re-run'), no = el('button', 'btn btn--quiet btn--small', 'Keep them');
				sure.type = no.type = 'button';
				var ask = el('span', '', ''); ask.append(sure, ' ', no); fresh.appendChild(ask);
				no.addEventListener('click', function () { ask.remove(); clear.hidden = false; });
				sure.addEventListener('click', function () {
					sure.disabled = no.disabled = true;
					capi('/identify/clear', { method: 'POST', body: { photo: state.current.key } }).then(load).catch(function (e) { text.textContent = e.message; ask.remove(); clear.hidden = false; });
				});
			});
			fresh.appendChild(clear);
		} else return;
		$('run').appendChild(fresh);
	}

	// ── The faces, grouped by who they might be
	function renderFaces() {
		var all = state.data.suggestions, counts = { pending: 0, confirmed: 0, rejected: 0 };
		all.forEach(function (s) { counts[s.status]++; });
		var f = $('filters'); f.textContent = '';
		[['pending', 'To review'], ['confirmed', 'Confirmed'], ['rejected', 'Not them / skipped']].forEach(function (x) {
			var b = el('button', '', x[1] + ' (' + counts[x[0]] + ')'); b.type = 'button';
			b.setAttribute('aria-pressed', String(state.filter === x[0]));
			b.addEventListener('click', function () { state.filter = x[0]; renderFaces(); });
			f.appendChild(b);
		});
		f.hidden = !all.length;
		var box = $('faces'); box.textContent = '';
		var list = all.filter(function (s) { return s.status === state.filter; });
		renderBoxes(all);
		if (!list.length) {
			if (all.length || (state.data.run && state.data.run.status === 'done'))
				box.appendChild(el('div', 'empty-state', state.filter === 'pending' ? (all.length ? 'Everything here has been reviewed.' : 'No faces to review.') : 'Nothing here yet.'));
			return;
		}
		var groups = [], byKey = {};
		list.forEach(function (s) {
			var pid = s.status === 'confirmed' ? s.finalPersonId : (state.personById[s.personId] ? s.personId : null);
			var key = s.kind === 'check' ? 'c' : pid ? 'p' + pid : (s.status === 'pending' ? 'u' + s.cluster : 'x');
			if (key === 'c') pid = null;
			if (!byKey[key]) { byKey[key] = { key: key, personId: pid, cluster: s.cluster, items: [] }; groups.push(byKey[key]); }
			byKey[key].items.push(s);
		});
		groups.forEach(function (g) {
			g.items.sort(function (a, b) { return (a.start == null ? 0 : a.start) - (b.start == null ? 0 : b.start); });
			g.best = Math.max.apply(null, g.items.map(function (s) { return s.score || 0; }));
			g.likely = g.items.filter(function (s) { return (s.score || 0) >= LIKELY; }).length;
		});
		// Recognised people first (most likely matches, then best match), then unrecognised
		// groups (most seen first).
		groups.sort(function (a, b) {
			return (b.key === 'c') - (a.key === 'c') || (!a.personId) - (!b.personId) || (a.personId ? (b.likely - a.likely) || (b.best - a.best) : b.items.length - a.items.length);
		});
		var unknownN = 0;
		groups.forEach(function (g) { box.appendChild(renderGroup(g, g.personId || g.key === 'c' ? null : ++unknownN)); });
	}

	function renderGroup(g, unknownN) {
		var sec = el('section', 'group'), who = el('div', 'who'), cards = el('div', 'cards');
		var p = g.personId ? state.personById[g.personId] : null;
		var face = el('div', 'face');
		if (p && p.portrait) { photoCrop(face, p.portrait.photo, p.portrait.box); face.title = p.name + ', marked on a 1994 photo'; }
		else { face.classList.add('face--none'); face.textContent = p ? p.name.charAt(0) : '?'; }
		var name = p ? p.name : g.key === 'c' ? 'Marked by hand: double-check' : g.key === 'x' ? 'Skipped faces' : 'Unknown person ' + unknownN;
		who.append(face, el('h3', '', name));
		var pend = g.items.filter(function (s) { return s.status === 'pending'; });
		var likelyPend = pend.filter(function (s) { return (s.score || 0) >= LIKELY; });
		var unit = state.current.kind === 'video' ? 'moment' : 'face';
		if (g.key === 'c') who.appendChild(el('p', 'muted', 'These faces were marked by hand, but look much more like someone else.'));
		else who.appendChild(el('p', 'muted', plural(g.items.length, unit) +
			(p && state.filter === 'pending' ? ' · ' + g.likely + ' likely' : '') + (p && !p.portrait ? ' · no 1994 face marked' : '')));
		if (g.key === 'c') {
			// one at a time: each is a correction of someone's mark
		} else if (likelyPend.length > 1 && p) {
			// Only the likely ones: possible matches are wrong too often to confirm unseen.
			var all = el('button', 'btn btn--yes btn--small', 'Confirm ' + likelyPend.length + ' likely'); all.type = 'button';
			all.addEventListener('click', function () { bulk(all, likelyPend, 'confirm', g.personId); });
			who.appendChild(all);
		} else if (pend.length > 1 && !p) {
			var nameAll = el('button', 'btn btn--small', 'Name all ' + pend.length + '…'); nameAll.type = 'button';
			nameAll.addEventListener('click', function () {
				var c = chooser(function (pid) { bulk(nameAll, pend, 'confirm', pid); }, function () { c.remove(); nameAll.hidden = false; });
				nameAll.hidden = true; who.appendChild(c);
			});
			var skipAll = el('button', 'btn btn--quiet btn--small', 'Skip all'); skipAll.type = 'button';
			skipAll.addEventListener('click', function () { bulk(skipAll, pend, 'reject'); });
			who.append(nameAll, skipAll);
		}
		// Likely matches first; possible ones folded away (most of them are someone else).
		var shown = g.items, folded = [];
		if (p && state.filter === 'pending') {
			shown = g.items.filter(function (s) { return (s.score || 0) >= LIKELY; });
			folded = g.items.filter(function (s) { return (s.score || 0) < LIKELY; })
				.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
			if (!shown.length) { shown = folded.slice(0, 4); folded = folded.slice(4); }
		}
		shown.forEach(function (s) { cards.appendChild(renderCard(s, p)); });
		if (folded.length) {
			var more = el('button', 'btn btn--quiet btn--small more', 'Show ' + plural(folded.length, 'possible match').replace('matchs', 'matches')); more.type = 'button';
			more.addEventListener('click', function () { more.remove(); folded.forEach(function (s) { cards.appendChild(renderCard(s, p)); }); });
			cards.appendChild(more);
		}
		sec.append(who, cards);
		return sec;
	}

	function scoreLabel(s) {
		if (s.score == null) return null;
		return s.score >= LIKELY ? ['Likely match', 'score score--likely'] : ['Possible match', 'score score--possible'];
	}

	function renderCheckCard(s, card, err) {
		var marked = state.personById[s.markPersonId], like = state.personById[s.personId];
		var mName = marked ? marked.name : 'someone', lName = like ? like.name : 'someone else';
		if (s.status === 'pending') {
			card.appendChild(el('p', 'note', 'Marked as ' + mName + '. Looks more like ' + lName + '.'));
			var acts = el('div', 'actions');
			var keep = el('button', 'btn btn--small', 'Keep ' + mName.split(' ')[0]); keep.type = 'button';
			keep.addEventListener('click', function () { review(card, s, 'reject', null, err); });
			acts.appendChild(keep);
			if (like) {
				var change = el('button', 'btn btn--quiet btn--small', 'It’s ' + lName.split(' ')[0]); change.type = 'button';
				change.title = 'Move this face mark to ' + lName;
				change.addEventListener('click', function () { review(card, s, 'confirm', like.id, err); });
				acts.appendChild(change);
			}
			var other = el('button', 'btn btn--quiet btn--small', 'Someone else…'); other.type = 'button';
			other.addEventListener('click', function () {
				acts.hidden = true;
				var c = chooser(function (pid) { review(card, s, 'confirm', pid, err); }, function () { c.remove(); acts.hidden = false; });
				card.insertBefore(c, err); c.querySelector('input').focus();
			});
			acts.appendChild(other);
			card.appendChild(acts);
			return;
		}
		var fp = state.personById[s.finalPersonId];
		var v = el('p', 'verdict');
		v.append(el('b', '', s.status === 'rejected' || s.finalPersonId === s.markPersonId ? 'Kept as ' + mName : 'Changed to ' + (fp ? fp.name : 'someone else')));
		v.append(el('span', 'muted', ' · ' + (s.reviewedBy || 'a member')));
		card.appendChild(v);
		if (s.canUndo) {
			var undo = el('button', 'btn btn--quiet btn--small', 'Undo'); undo.type = 'button';
			undo.addEventListener('click', function () { review(card, s, 'undo', null, err); });
			card.appendChild(undo);
		}
	}

	function renderCard(s, p) {
		var card = el('article', 'card'), crop = el('div', 'crop');
		card.dataset.id = s.id;
		if (state.hot === s.id) card.classList.add('is-hot');
		crop.style.backgroundImage = 'url("' + s.crop + '")';
		if (state.current.kind === 'video') {
			var watch = el('button', '', '▶ Watch'); watch.type = 'button';
			watch.addEventListener('click', function () { watchAt(s); });
			crop.appendChild(watch);
		} else {
			crop.addEventListener('mouseenter', function () { hot(s.id); });
		}
		var meta = el('div', 'meta');
		meta.appendChild(el('span', '', state.current.kind === 'video' ? fmtTime(s.start) + (s.end - s.start >= 1 ? '–' + fmtTime(s.end) : '') : 'Face ' + faceNumber(s)));
		var sl = s.status === 'pending' && p ? scoreLabel(s) : null;
		if (sl) { var sc = el('span', sl[1], sl[0]); sc.title = 'Similarity ' + s.score.toFixed(2); meta.appendChild(sc); }
		card.append(crop, meta);
		var err = el('p', 'error'); err.hidden = true;
		if (s.kind === 'check') {
			renderCheckCard(s, card, err);
		} else if (s.status === 'pending') {
			var alts = s.alternatives.filter(function (a) { return a.personId !== s.personId && a.score >= 0.18 && state.personById[a.personId]; }).slice(0, 2);
			if (alts.length) {
				var ap = el('div', 'alts'); ap.append(p ? 'Or maybe ' : 'Closest: ');
				alts.forEach(function (a, i) {
					var b = el('button', '', state.personById[a.personId].name); b.type = 'button';
					b.title = 'Confirm as ' + state.personById[a.personId].name;
					b.addEventListener('click', function () { review(card, s, 'confirm', a.personId, err); });
					if (i) ap.append(', ');
					ap.appendChild(b);
				});
				card.appendChild(ap);
			}
			var acts = el('div', 'actions');
			if (p) {
				var yes = el('button', 'btn btn--yes btn--small', 'Yes, ' + p.name.split(' ')[0]); yes.type = 'button';
				yes.title = 'Confirm: this is ' + p.name;
				yes.addEventListener('click', function () { review(card, s, 'confirm', p.id, err); });
				var no = el('button', 'btn btn--quiet btn--small', 'Not them'); no.type = 'button';
				no.addEventListener('click', function () { review(card, s, 'reject', null, err); });
				acts.append(yes, no);
			}
			var other = el('button', 'btn btn--quiet btn--small', p ? 'Someone else…' : 'Who is this?'); other.type = 'button';
			other.addEventListener('click', function () {
				acts.hidden = true;
				var c = chooser(function (pid) { review(card, s, 'confirm', pid, err); }, function () { c.remove(); acts.hidden = false; });
				card.insertBefore(c, err);
				c.querySelector('input').focus();
			});
			acts.appendChild(other);
			if (!p) {
				var skip = el('button', 'btn btn--quiet btn--small', 'Skip'); skip.type = 'button';
				skip.title = 'Not someone on the People list, or too unclear';
				skip.addEventListener('click', function () { review(card, s, 'reject', null, err); });
				acts.appendChild(skip);
			}
			card.appendChild(acts);
		} else {
			var v = el('p', 'verdict' + (s.status === 'rejected' ? ' is-no' : ''));
			var fp = state.personById[s.finalPersonId];
			if (s.status === 'confirmed') v.append(el('b', '', fp ? fp.name : 'Confirmed'));
			else v.append(el('b', '', p ? 'Not ' + p.name : 'Skipped'));
			v.append(el('span', 'muted', ' · ' + (s.byHand ? 'marked by hand by ' : '') + (s.reviewedBy || 'a member')));
			card.appendChild(v);
			if (s.canUndo) {
				var undo = el('button', 'btn btn--quiet btn--small', 'Undo'); undo.type = 'button';
				undo.title = s.status === 'confirmed' ? (state.current.kind === 'video' ? 'Also takes them out of the event' : 'Also removes the face mark') : '';
				undo.addEventListener('click', function () { review(card, s, 'undo', null, err); });
				card.appendChild(undo);
			}
		}
		card.appendChild(err);
		return card;
	}

	function faceNumber(s) {
		var list = state.data.suggestions;
		for (var i = 0; i < list.length; i++) if (list[i].id === s.id) return i + 1;
		return '';
	}
	function renderBoxes(all) {
		var layer = $('boxes');
		if (!layer) return;
		layer.textContent = '';
		if (state.show !== 'found') (state.marks || []).forEach(function (m) {
			var d = el('div', 'is-hand');
			d.style.left = m.box.x * 100 + '%'; d.style.top = m.box.y * 100 + '%'; d.style.width = m.box.w * 100 + '%'; d.style.height = m.box.h * 100 + '%';
			d.appendChild(el('span', '', m.name.split(' ')[0])); d.title = m.name + ', marked by hand';
			layer.appendChild(d);
		});
		if (state.show === 'hand') return;
		all.forEach(function (s, i) {
			if (s.kind === 'check') return;  // that box is a hand mark
			var d = el('div', 'is-found');
			d.style.left = s.box.x * 100 + '%'; d.style.top = s.box.y * 100 + '%'; d.style.width = s.box.w * 100 + '%'; d.style.height = s.box.h * 100 + '%';
			if (s.status !== 'pending') d.classList.add('is-done');
			if (state.hot === s.id) d.classList.add('is-hot');
			d.appendChild(el('span', '', String(i + 1)));
			layer.appendChild(d);
		});
	}
	function hot(id) {
		state.hot = id;
		document.querySelectorAll('.card').forEach(function (c) { c.classList.toggle('is-hot', +c.dataset.id === id); });
		renderBoxes(state.data.suggestions);
	}
	function watchAt(s) {
		hot(s.id);
		if (!state.player) return;
		var t = Math.max(0, (s.frame != null ? s.frame : s.start) - 1);
		$('stage').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
		state.player.currentTime(t);
		var pr = state.player.play(); if (pr && pr.catch) pr.catch(function () {});
	}

	// ── Decisions
	function review(card, s, action, personId, err) {
		card.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
		err.hidden = true;
		var body = { action: action }; if (personId) body.person = personId;
		return capi('/identify/suggestions/' + s.id, { method: 'POST', body: body }).then(load).catch(function (e) {
			card.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
			if (e.status === 409 && /name others will see/.test(e.message)) return askName(function () { review(card, s, action, personId, err); });
			err.textContent = e.message; err.hidden = false;
		});
	}
	function bulk(btn, items, action, personId) {
		btn.disabled = true;
		var i = 0, label = btn.textContent;
		(function next() {
			if (i >= items.length) return load();
			btn.textContent = (action === 'confirm' ? 'Confirming ' : 'Skipping ') + (i + 1) + ' of ' + items.length + '…';
			var body = { action: action }; if (personId) body.person = personId;
			capi('/identify/suggestions/' + items[i].id, { method: 'POST', body: body }).then(function () { i++; next(); }).catch(function (e) {
				if (e.status === 409 && /name others will see/.test(e.message)) { btn.textContent = label; btn.disabled = false; return askName(function () { bulk(btn, items.slice(i), action, personId); }); }
				if (e.status === 409 || e.status === 404) { i++; return next(); }  // someone else got there first
				btn.textContent = label; btn.disabled = false; load(); alertLine(e.message);
			});
		})();
	}
	function alertLine(msg) { $('run-text').textContent = msg; }

	// Events show who added them, so confirming in a recording needs the name others will see.
	function askName(then) {
		var box = $('name-prompt'); box.textContent = ''; box.hidden = false;
		var lab = el('label', '', 'Your name, as others will see it on the events you confirm:'); lab.htmlFor = 'my-name';
		var inp = el('input'); inp.id = 'my-name'; inp.maxLength = 60; inp.autocomplete = 'name';
		var save = el('button', 'btn btn--small', 'Save and continue'); save.type = 'button';
		var err = el('p', 'error'); err.hidden = true;
		save.addEventListener('click', function () {
			save.disabled = true;
			capi('/me', { method: 'PUT', body: { displayName: inp.value } }).then(function (r) {
				state.me.displayName = r.displayName; $('signed-in').textContent = 'Signed in as ' + r.displayName; $('acct-name').textContent = r.displayName;
				box.hidden = true; then();
			}).catch(function (e) { save.disabled = false; err.textContent = e.message; err.hidden = false; });
		});
		inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') save.click(); });
		box.append(lab, inp, save, err);
		box.scrollIntoView({ block: 'center' }); inp.focus();
	}

	// Type-ahead over the People list; can add a missing name.
	function chooser(onPick, onCancel) {
		var box = el('div', 'choose'), inp = el('input'), ul = el('ul'), row = el('div', 'row');
		inp.placeholder = 'Type a name'; inp.setAttribute('aria-label', 'Who is this?'); inp.autocomplete = 'off';
		var cancel = el('button', 'btn btn--quiet btn--small', 'Cancel'); cancel.type = 'button';
		cancel.addEventListener('click', onCancel);
		var options = [], sel = 0;
		function draw() {
			var q = inp.value.trim().toLowerCase().replace(/\s+/g, ' ');
			options = state.people.filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 40)
				.map(function (p) { return { label: p.name, id: p.id }; });
			if (q.length >= 2 && !state.people.some(function (p) { return p.name.toLowerCase() === q; }))
				options.push({ label: 'Add “' + inp.value.trim() + '” to the People list', add: inp.value.trim() });
			sel = Math.min(sel, Math.max(0, options.length - 1));
			ul.textContent = '';
			options.forEach(function (o, i) {
				var li = el('li'), b = el('button', '', o.label); b.type = 'button'; b.setAttribute('aria-selected', String(i === sel));
				b.addEventListener('click', function () { pick(o); });
				li.appendChild(b); ul.appendChild(li);
			});
		}
		function pick(o) {
			if (o.id) return onPick(o.id);
			capi('/people', { method: 'POST', body: { name: o.add } }).catch(function (e) { if (e.status === 409 && e.data && e.data.person) return e.data.person; throw e; })
				.then(function (person) { return capi('/people').then(function (l) { setPeople(l); onPick(person.id); }); })
				.catch(function (e) { inp.setCustomValidity(e.message); inp.reportValidity(); });
		}
		inp.addEventListener('input', function () { sel = 0; inp.setCustomValidity(''); draw(); });
		inp.addEventListener('keydown', function (ev) {
			if (ev.key === 'ArrowDown') { sel = Math.min(options.length - 1, sel + 1); draw(); ev.preventDefault(); }
			else if (ev.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); ev.preventDefault(); }
			else if (ev.key === 'Enter' && options[sel]) { pick(options[sel]); ev.preventDefault(); }
			else if (ev.key === 'Escape') onCancel();
		});
		row.appendChild(cancel);
		box.append(inp, ul, row);
		draw();
		setTimeout(function () { inp.focus(); }, 0);
		return box;
	}

	window.addEventListener('hashchange', function () {
		var m = /^#(video|photo)\/([a-z0-9-]+)$/.exec(location.hash);
		if (m && !(state.current && state.current.kind === m[1] && state.current.key === m[2])) { state.kind = m[1]; renderTabs(); select(m[1], m[2], true); }
	});
	start();
})();
