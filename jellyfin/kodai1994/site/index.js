(function () {
	'use strict';

	var LIBRARY = 'Kodai 1994', HLS = '/kodai1994/hls/';
	var CLIENT = 'Yajur Kodai 1994', VERSION = '2.0.0', STORE_KEY = 'yajur-kodai-session', VIEW_KEY = 'yajur-kodai-view';
	var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	var PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
	var $ = function (id) { return document.getElementById(id); };

	// ── Storage (wrapped: private windows / blocked storage must not break the page)
	function storeGet(store, key) { try { return window[store].getItem(key); } catch (e) { return null; } }
	function storeSet(store, key, val) { try { window[store].setItem(key, val); } catch (e) {} }
	function storeDel(store, key) { try { window[store].removeItem(key); } catch (e) {} }

	var deviceId = storeGet('localStorage', 'yajur-kodai-device');
	if (!deviceId) {
		deviceId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
		storeSet('localStorage', 'yajur-kodai-device', deviceId);
	}

	// Signed in: { userId, name, remember }. The Jellyfin token itself is in the kodai_auth
	// cookie, which the community service sets HttpOnly at sign-in (POST /api/session): this
	// page never sees it. The gateway adds it to /kodai1994/hls/, /kodai1994/api/ and
	// /kodai1994/jf/ (the page's Jellyfin calls). Sessions from before kept the token here,
	// in storage; boot() moves those over to the HttpOnly cookie and forgets the token.
	var session = null;
	try { session = JSON.parse(storeGet('sessionStorage', STORE_KEY) || storeGet('localStorage', STORE_KEY) || 'null'); } catch (e) {}
	function saveSession() {
		storeSet(session.remember ? 'localStorage' : 'sessionStorage', STORE_KEY, JSON.stringify({ userId: session.userId, name: session.name, remember: !!session.remember }));
	}

	// Which browser this is, for Jellyfin's Devices list (not a secret): a plain cookie the gateway reads.
	var COOKIE_PATH = '/kodai1994/';
	document.cookie = 'kodai_device=' + encodeURIComponent(deviceId) + '; Path=' + COOKIE_PATH + '; Max-Age=31536000; SameSite=Strict' + (location.protocol === 'https:' ? '; Secure' : '');
	// The cookie this page set itself before sign-in moved to the server (not HttpOnly)
	function clearMediaCookie() {
		[COOKIE_PATH, HLS].forEach(function (path) { document.cookie = 'kodai_auth=; Path=' + path + '; Max-Age=0; SameSite=Strict'; });
	}

	// ── Jellyfin API, through the gateway's /kodai1994/jf/ (it adds the token from the cookie)
	function api(path, opts) {
		opts = opts || {};
		var headers = {};
		if (opts.body) headers['Content-Type'] = 'application/json';
		return fetch('/kodai1994/jf' + path, { method: opts.method || 'GET', headers: headers, credentials: 'same-origin', cache: 'no-store',
			body: opts.body ? JSON.stringify(opts.body) : undefined, keepalive: !!opts.keepalive })
			.then(function (res) {
				if (res.status === 401 && session) { signOut(true); throw new Error('Your session has ended. Sign in again to keep watching.'); }
				if (!res.ok) throw new Error('The server answered ' + res.status + '. Try again in a moment.');
				return res.status === 204 ? null : res.json();
			});
	}

	// ── Community service (comments, display names, access requests) at /kodai1994/api.
	// Identity comes from the kodai_auth cookie; X-Kodai marks requests as coming from this page.
	var me = null, counts = {};
	function capi(path, opts) {
		opts = opts || {};
		var headers = Object.assign({ 'X-Kodai': '1' }, opts.headers || {});
		if (opts.body) headers['Content-Type'] = 'application/json';
		return fetch('/kodai1994/api' + path, { method: opts.method || 'GET', headers: headers, credentials: 'same-origin', cache: 'no-store',
			body: opts.body ? JSON.stringify(opts.body) : undefined })
			.then(function (res) {
				return res.json().catch(function () { return {}; }).then(function (data) {
					if (!res.ok) { var err = new Error(data.error || 'The server answered ' + res.status + '. Try again in a moment.'); err.status = res.status; throw err; }
					return data;
				});
			});
	}
	var relTime = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;
	function fmtWhen(iso) {
		var then = new Date(iso), secs = (then - Date.now()) / 1000, abs = Math.abs(secs);
		if (!relTime || abs > 30 * 86400) return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
		var units = [['day', 86400], ['hour', 3600], ['minute', 60]];
		for (var i = 0; i < units.length; i++) if (abs >= units[i][1]) return relTime.format(Math.round(secs / units[i][1]), units[i][0]);
		return 'just now';
	}
	function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

	// ── Names: "1994-04-14 - April 14th - Discourse (Tamil New Year)"
	// Must match slug() in package-hls.sh.
	function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
	function parse(item) {
		var m = /^(\d{4})-(\d{2})(?:-(\d{2}))? - (.*)$/.exec(item.Name || '') || [null, '1994', '0', null, item.Name];
		var rest = m[4], phrase = rest, detail = '';
		var split = /^((?:April|May)(?: [0-9]{1,2}(?:st|nd|rd|th))?(?: & [0-9]{1,2}(?:st|nd|rd|th))?)(?: \(date not recorded\))?(?: - (.*))?$/.exec(rest);
		if (split) { phrase = split[1]; detail = split[2] || ''; }
		var year = +m[1], month = +m[2], day = m[3] ? +m[3] : null;
		return {
			item: item, slug: slug(item.Name), year: year, month: month, day: day,
			title: detail || phrase, phrase: phrase,
			weekday: day ? new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }) : '',
			weekdayShort: day ? new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }) : '',
			longDate: day ? new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
				: MONTHS[month - 1] + ' ' + year + ', date not recorded'
		};
	}
	function fmtDuration(ticks) {
		if (!ticks) return '';
		var s = Math.round(ticks / 1e7), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
		return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(sec).padStart(2, '0');
	}
	function fmtHours(ticks) { return Math.round(ticks / 36e9) + ' hours'; }

	// ── Photo spiral on the sign-in page. A vanilla-JS port of React Bits' <InfiniteSpiral />
	// (auto motion + drag, eases to a stop on hover, pauses off-screen and for reduced
	// motion). Uses the public 320 px crops from prepare-photos.sh; full photos stay private.
	function createSpiral(root, items, o) {
		o = Object.assign({ speed: 0.55, radius: 170, cardWidth: 110, cardHeight: 110, verticalSpacing: 62, perspective: 1000,
			cardsPerTurn: 7, cardRadius: 10, centerScale: 1.2, edgeFade: 0.3, edgeBlur: 6 }, o || {});
		var clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };
		var modulo = function (v, d) { return ((v % d) + d) % d; };
		var smoothstep = function (a, b, v) { var x = clamp((v - a) / (b - a || 1), 0, 1); return x * x * (3 - 2 * x); };
		var stage = document.createElement('div'); stage.className = 'spiral__stage';
		root.classList.add('spiral'); root.style.perspective = o.perspective + 'px'; root.textContent = ''; root.appendChild(stage);
		items.forEach(function (src) { new Image().src = src; });
		var cards = items.map(function (src) {
			var c = document.createElement('div'); c.className = 'spiral__item';
			c.style.width = o.cardWidth + 'px'; c.style.height = o.cardHeight + 'px'; c.style.borderRadius = o.cardRadius + 'px';
			// A painted background, not an <img>: no "Save image as" or drag-out.
			c.style.backgroundImage = 'url("' + src + '")';
			stage.appendChild(c); return c;
		});
		var progress = 0, target = 0, autoSpeed = 0, hovered = false, visible = true, dragging = false, lastY = 0, settled = false;
		var frame = null, prev = 0, bounds = root.getBoundingClientRect();
		var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
		new ResizeObserver(function () { bounds = root.getBoundingClientRect(); }).observe(root);
		new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.02 }).observe(root);
		root.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
		root.addEventListener('dragstart', function (ev) { ev.preventDefault(); });
		root.addEventListener('mouseenter', function () { hovered = true; });
		root.addEventListener('mouseleave', function () { hovered = false; });
		root.addEventListener('pointerdown', function (ev) {
			if (ev.button !== 0) return;
			dragging = true; lastY = ev.clientY; target = progress;
			root.setPointerCapture(ev.pointerId); root.classList.add('is-dragging');
		});
		root.addEventListener('pointermove', function (ev) {
			if (!dragging) return;
			target -= (ev.clientY - lastY) / Math.max(o.verticalSpacing, 1); lastY = ev.clientY;
		});
		var stopDrag = function (ev) {
			if (!dragging) return; dragging = false; root.classList.remove('is-dragging');
			if (root.hasPointerCapture(ev.pointerId)) root.releasePointerCapture(ev.pointerId);
		};
		root.addEventListener('pointerup', stopDrag); root.addEventListener('pointercancel', stopDrag);

		function render(time) {
			var dt = Math.min((time - prev) / 1000, 0.05); prev = time;
			var want = visible && !reduced.matches && !dragging && !hovered ? o.speed : 0;
			autoSpeed += (want - autoSpeed) * (1 - Math.exp(-dt * 7));
			target += autoSpeed * dt;
			progress += (target - progress) * (1 - Math.exp(-dt * (dragging ? 22 : 11)));
			if (!dragging && Math.abs(autoSpeed) < 1e-3 && Math.abs(target - progress) < 1e-3) {
				autoSpeed = 0; progress = target;
				if (settled) { frame = requestAnimationFrame(render); return; }
				settled = true;
			} else {
				settled = false;
			}
			var count = cards.length, half = count / 2;
			var w = Math.max(bounds.width, 1), h = Math.max(bounds.height, 1);
			var fit = Math.min(1, w / (o.cardWidth * 2.8), h / (o.cardHeight * 2.35));
			var r = Math.min(o.radius, Math.max(72, w * 0.36)) * fit;
			var fadeStart = clamp(1 - o.edgeFade, 0, 0.98), turn = Math.max(o.cardsPerTurn, 1);
			cards.forEach(function (card, i) {
				var off = modulo(i - progress + half, count) - half;
				var edge = Math.min(Math.abs(off) / Math.max(half, 1), 1);
				var opacity = 1 - smoothstep(fadeStart, 1, edge);
				var focus = 1 - Math.min(Math.abs(off) / Math.max(turn * 0.65, 1), 1);
				var scale = (1 + (o.centerScale - 1) * focus) * fit;
				var a = off * (360 / turn) * Math.PI / 180;
				var x = Math.sin(a) * r, z = Math.cos(a) * r;
				var depthScale = clamp(o.perspective / Math.max(o.perspective - z, 1), 0.72, 1.45);
				var blur = o.edgeBlur * smoothstep(0.35, 1, edge);
				card.style.transform = 'translate(-50%, -50%) translate3d(' + x + 'px, ' + off * o.verticalSpacing * fit + 'px, 0) scale(' + scale * depthScale + ')';
				card.style.opacity = opacity.toFixed(3);
				card.style.filter = blur > 0.01 ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
				card.style.zIndex = String(Math.round((z / Math.max(r, 1) + 1) / 2 * 100000) + i);
			});
			frame = requestAnimationFrame(render);
		}
		return {
			start: function () { if (frame === null) { prev = performance.now(); bounds = root.getBoundingClientRect(); frame = requestAnimationFrame(render); } },
			stop: function () { if (frame !== null) { cancelAnimationFrame(frame); frame = null; } }
		};
	}
	var spiral = null;
	function loadSpiral() {
		fetch('/kodai1994/brand/spiral/spiral.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (files) {
			if (!files.length) return;
			var srcs = files.map(function (f) { return '/kodai1994/brand/spiral/' + f; });
			while (srcs.length < 21) srcs = srcs.concat(srcs.slice(0, 21 - srcs.length)); // a fuller helix
			spiral = createSpiral($('login-spiral'), srcs);
			if (!$('login-view').hidden) spiral.start();
		}).catch(function () {});
	}

	// ── Views
	function show(view) {
		$('login-view').hidden = view !== 'login';
		$('library-view').hidden = view !== 'library';
		document.documentElement.classList.toggle('is-login', view === 'login');
		if (spiral) { if (view === 'login') spiral.start(); else spiral.stop(); }
	}

	function signOut(expired) {
		closePlayer();
		if (!$('viewer').hidden) closePhoto();
		$('account').hidden = true;
		me = null; counts = {};
		// The server signs the token out with Jellyfin (unless it already ended) and clears the HttpOnly cookie.
		capi('/session', { method: 'DELETE' }).catch(function () {});
		session = null;
		storeDel('sessionStorage', STORE_KEY); storeDel('localStorage', STORE_KEY);
		clearMediaCookie();
		$('content').textContent = '';
		show('login');
	}

	$('login-form').addEventListener('submit', function (e) {
		e.preventDefault();
		var btn = $('login-btn'), err = $('login-error');
		btn.disabled = true; err.textContent = '';
		session = null;
		var remember = $('remember').checked;
		capi('/session', { method: 'POST', headers: { 'X-Kodai-Device-Name': (navigator.platform || 'Browser').replace(/[^A-Za-z0-9 ._-]/g, '') || 'Browser' },
			body: { username: $('user').value.trim(), password: $('pass').value, remember: remember } })
			.then(function (r) {
				session = { userId: r.userId, name: r.name, remember: remember };
				saveSession();
				$('pass').value = '';
				openLibrary();
			})
			.catch(function (ex) {
				err.textContent = ex instanceof TypeError ? 'Can’t reach the video server. Check your connection and try again.' : ex.message;
			})
			.then(function () { btn.disabled = false; });
	});
	$('logout').addEventListener('click', function () { signOut(false); });

	// ── Library
	var entries = [], ready = {}, photos = [], markerCounts = {}, captionStatus = {};   // captionStatus: GET /captions/status
	var uploads = [], uploadsByPhoto = {}, uploadPoll = null; // GET /photo-uploads
	function setUploads(list) {
		uploads = list || []; uploadsByPhoto = {};
		uploads.forEach(function (u) { if (u.photoId) uploadsByPhoto[u.photoId] = u; });
	}
	function reloadPhotos() {
		return Promise.all([
			fetch(HLS + 'photos/photos.json', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : photos; }),
			capi('/photo-uploads').catch(function () { return uploads; })
		]).then(function (res) { photos = res[0]; setUploads(res[1]); });
	}
	// While any of my photos are still being added, check every few seconds.
	function watchUploads() {
		clearTimeout(uploadPoll);
		if (!uploads.some(function (u) { return u.mine && u.status === 'pending'; })) return;
		uploadPoll = setTimeout(function () {
			reloadPhotos().then(function () { if (view === 'photos' && $('viewer').hidden) render(); watchUploads(); });
		}, 3000);
	}
	// Big or unusual files (HEIC from iPhones, >15 MB) become a JPEG in the browser first;
	// the server strips metadata from the copies it shows either way.
	var UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'], UPLOAD_MAX = 15 * 1024 * 1024;
	function prepareUpload(file) {
		if (UPLOAD_TYPES.indexOf(file.type) >= 0 && file.size <= UPLOAD_MAX) return Promise.resolve(file);
		var load = window.createImageBitmap ? createImageBitmap(file, { imageOrientation: 'from-image' }) : Promise.reject(new Error('unsupported'));
		return load.then(function (bmp) {
			var k = Math.min(1, 4096 / Math.max(bmp.width, bmp.height));
			var c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
			c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
			return new Promise(function (ok, fail) { c.toBlob(function (b) { b ? ok(b) : fail(new Error('encode')); }, 'image/jpeg', 0.92); });
		}).catch(function () { throw new Error('This browser can’t read that file. Save it as a JPEG and try again.'); });
	}
	// XMLHttpRequest rather than fetch: it reports upload progress (onProgress: 0-1).
	// A dropped connection or a 502/503/504 (the server restarting, a network blip) is
	// retried twice. If an earlier try did get through, the retry is told "already
	// added", which counts as done.
	var UPLOAD_RETRY_MS = [3000, 8000];
	function uploadOne(file, onProgress, onRetry) {
		return prepareUpload(file).then(function (blob) {
			function attempt(n) {
				return new Promise(function (ok, fail) {
					var x = new XMLHttpRequest();
					x.open('POST', '/kodai1994/api/photo-uploads');
					x.withCredentials = true;
					x.setRequestHeader('X-Kodai', '1');
					x.setRequestHeader('Content-Type', blob.type || 'image/jpeg');
					x.upload.onprogress = function (ev) { if (ev.lengthComputable) onProgress(ev.loaded / ev.total); };
					x.onload = function () {
						var d = {}; try { d = JSON.parse(x.responseText); } catch (e) {}
						if (x.status >= 200 && x.status < 300) return ok(d);
						if (n > 0 && x.status === 409) return ok({ status: 'pending' });
						var err = new Error(d.error || 'The server answered ' + x.status + '. Try this photo again in a minute.');
						err.status = x.status; err.retry = x.status === 502 || x.status === 503 || x.status === 504; fail(err);
					};
					x.onerror = function () { var err = new Error('The connection dropped. Try this photo again.'); err.retry = true; fail(err); };
					x.send(blob);
				}).catch(function (err) {
					if (!err.retry || n >= UPLOAD_RETRY_MS.length) throw err;
					if (onRetry) onRetry(n + 1);
					return new Promise(function (r) { setTimeout(r, UPLOAD_RETRY_MS[n]); }).then(function () { return attempt(n + 1); });
				});
			}
			return attempt(0);
		});
	}
	// One tile per chosen photo: preview, a ring that fills as it uploads, then ✓ or the problem.
	var RING = 2 * Math.PI * 17;
	function uploadTile(file) {
		var t = el('li', 'up-tile is-waiting'), pic = el('span', 'up-tile__pic'), name = el('span', 'up-tile__name', file.name), note = el('span', 'up-tile__note', 'Waiting…');
		var url = /^image\/(jpeg|png|webp|gif)$/.test(file.type) ? URL.createObjectURL(file) : null;
		if (url) pic.style.backgroundImage = 'url("' + url + '")';
		pic.innerHTML = '<svg class="up-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" class="up-ring__track"/>' +
			'<circle cx="20" cy="20" r="17" class="up-ring__bar" stroke-dasharray="' + RING + '" stroke-dashoffset="' + RING + '"/></svg><span class="up-ring__pct">0%</span>';
		t.setAttribute('aria-label', file.name);
		t.append(pic, name, note);
		var bar = pic.querySelector('.up-ring__bar'), pct = pic.querySelector('.up-ring__pct');
		return {
			el: t,
			progress: function (f) {
				t.className = 'up-tile is-uploading';
				var n = Math.round(f * 100);
				bar.setAttribute('stroke-dashoffset', String(RING * (1 - f)));
				pct.textContent = n + '%'; note.textContent = n < 100 ? 'Uploading ' + n + '%' : 'Saving…';
			},
			retrying: function (n) {
				t.className = 'up-tile is-waiting';
				bar.setAttribute('stroke-dashoffset', String(RING)); pct.textContent = '…';
				note.textContent = 'The connection hiccupped; trying again (' + n + ' of ' + UPLOAD_RETRY_MS.length + ')…';
			},
			done: function () {
				t.className = 'up-tile is-done'; bar.setAttribute('stroke-dashoffset', '0');
				pct.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'; // Lucide check
				note.textContent = 'Uploaded; it will appear below in a moment';
				if (url) setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
			},
			fail: function (msg) {
				t.className = 'up-tile is-error';
				pct.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'; // Lucide x
				note.textContent = msg;
			}
		};
	}
	var uploadLog = [], uploadSummary = null; // this visit's upload tiles; kept when the view re-renders
	function uploadBar() {
		var bar = el('div', 'upload'), list = el('ul', 'upload__list');
		uploadLog.forEach(function (li) { list.appendChild(li); });
		if (!uploadSummary) { uploadSummary = el('p', 'upload__summary'); uploadSummary.setAttribute('aria-live', 'polite'); }
		var input = el('input'); input.type = 'file'; input.multiple = true; input.hidden = true; input.id = 'photo-files';
		input.accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
		var pick = el('button', 'btn btn--quiet', 'Add photos'); pick.type = 'button'; pick.id = 'add-photos';
		var nameInput = null;
		bar.appendChild(el('p', 'muted', 'Have photos from Kodai 1994? Add them here. Only signed-in members see them; location and camera details are removed. You can also drop files here.'));
		if (!me || !me.displayName) {
			nameInput = el('input'); nameInput.type = 'text'; nameInput.maxLength = 60; nameInput.placeholder = 'Your name, as others will see it';
			nameInput.setAttribute('aria-label', 'Your name, as others will see it'); nameInput.id = 'upload-name';
			bar.appendChild(nameInput);
		}
		bar.append(pick, input, uploadSummary, list);
		pick.addEventListener('click', function () {
			if (nameInput && nameInput.value.trim().length < 2) { nameInput.focus(); nameInput.setCustomValidity('Enter your name first, at least 2 characters.'); nameInput.reportValidity(); return; }
			input.click();
		});
		if (nameInput) nameInput.addEventListener('input', function () { nameInput.setCustomValidity(''); });
		function send(files) {
			files = Array.prototype.slice.call(files || []);
			if (!files.length) return;
			pick.disabled = true;
			var setName = nameInput && nameInput.value.trim() ? capi('/me', { method: 'PUT', body: { displayName: nameInput.value } }).then(function (r) { if (me) me.displayName = r.displayName; }) : Promise.resolve();
			// Every photo gets its tile straight away; they upload one after another.
			var tiles = files.map(function (f) { var t = uploadTile(f); uploadLog.push(t.el); list.appendChild(t.el); return t; });
			var i = 0, added = 0, failed = 0;
			function summary() {
				uploadSummary.textContent = i < files.length || added + failed < files.length
					? 'Uploading ' + Math.min(i, files.length) + ' of ' + files.length + '…'
					: plural(added, 'photo') + ' uploaded' + (failed ? ', ' + failed + ' couldn’t be added' : '') + '.';
			}
			function next() {
				if (i >= files.length) {
					summary();
					pick.disabled = false; input.value = '';
					return reloadPhotos().then(function () { if (added) { render(); watchUploads(); } });
				}
				var f = files[i], t = tiles[i]; i++;
				summary(); t.progress(0);
				return uploadOne(f, t.progress, t.retrying).then(function () { added++; t.done(); })
					.catch(function (e) { failed++; t.fail(e.message); })
					.then(next);
			}
			setName.then(next).catch(function (e) { pick.disabled = false; tiles.forEach(function (t) { t.fail(e.message); }); });
		}
		input.addEventListener('change', function () { send(input.files); });
		bar.addEventListener('dragover', function (ev) { ev.preventDefault(); bar.classList.add('is-over'); });
		bar.addEventListener('dragleave', function () { bar.classList.remove('is-over'); });
		bar.addEventListener('drop', function (ev) {
			ev.preventDefault(); bar.classList.remove('is-over');
			if (nameInput && nameInput.value.trim().length < 2) { pick.click(); return; }
			send(ev.dataTransfer.files);
		});
		return bar;
	}
	var view = storeGet('localStorage', VIEW_KEY);
	var VIDEO_MODE_KEY = 'yajur-kodai-video-mode';
	var videoMode = /^(gallery|clips)$/.test(storeGet('localStorage', VIDEO_MODE_KEY) || '') ? storeGet('localStorage', VIDEO_MODE_KEY) : 'timeline';
	if (view === 'timeline' || view === 'gallery') { videoMode = view; view = 'videos'; }   // the old tabs, now Videos' sub-tabs
	if (['home', 'videos', 'photos', 'people', 'memories'].indexOf(view) < 0) view = 'home';

	function openLibrary() {
		show('library');
		$('signed-in').textContent = 'Signed in as ' + session.name;
		$('status').textContent = 'Loading the recordings…';
		loadPhoto();
		Promise.all([
			api('/UserViews?userId=' + session.userId).then(function (views) {
				var lib = (views.Items || []).filter(function (v) { return v.Name === LIBRARY; })[0];
				if (!lib) throw new Error('This account can’t open the ' + LIBRARY + ' recordings. Ask whoever sent you the link to check your access.');
				return api('/Items?userId=' + session.userId + '&ParentId=' + lib.Id + '&Recursive=true&IncludeItemTypes=Movie,Video' +
					'&SortBy=SortName&SortOrder=Ascending&EnableUserData=true&EnableImageTypes=Primary&Fields=DateCreated&Limit=500');
			}),
			fetch(HLS + 'ready.json', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
			fetch(HLS + 'photos/photos.json', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
			capi('/me').catch(function () { return null; }),
			capi('/counts').catch(function () { return {}; }),
			capi('/marker-counts').catch(function () { return {}; }),
			capi('/photo-uploads').catch(function () { return []; }),
			capi('/captions/status').catch(function () { return {}; })
		]).then(function (res) {
			me = res[3]; counts = res[4] || {}; markerCounts = res[5] || {}; captionStatus = res[7] || {};
			setUploads(res[6]); watchUploads();
			refreshRequestBadge();
			// Link in the request email: ...#requests opens the review panel for the admin.
			if (location.hash === '#requests' && me && me.isAdmin && $('account').hidden) openAccount();
			// Who's signed in, on the Account button
			var who = (me && me.displayName) || session.name || 'Account';
			$('acct-name').textContent = who; $('acct-avatar').textContent = initials(who);
			$('account-open').setAttribute('aria-label', 'Account: signed in as ' + who); $('account-open').title = who;
			// Links from the other pages' top bar (identify.html): #view=…, #account, #signout
			var vlink = /^#view=(home|videos|photos|people|memories)$/.exec(location.hash);
			if (vlink) { view = vlink[1]; storeSet('localStorage', VIEW_KEY, view); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
			if (location.hash === '#account') { try { history.replaceState(null, '', location.pathname); } catch (e) {} setTimeout(openAccount, 0); }
			if (location.hash === '#signout') { try { history.replaceState(null, '', location.pathname); } catch (e) {} signOut(); return; }
			if (location.hash === '#search') { try { history.replaceState(null, '', location.pathname); } catch (e) {} setTimeout(openSearch, 0); }
			if (location.hash === '#notifications') { try { history.replaceState(null, '', location.pathname); } catch (e) {} setTimeout(function () { $('bell').click(); }, 0); }
			loadNotifs();
			var link = /^#person\/(\d+)$/.exec(location.hash);
			if (link) { personId = Number(link[1]); view = 'person'; }
			var mlink = /^#memory\/(\d+)$/.exec(location.hash);
			if (mlink) { memoryId = Number(mlink[1]); view = 'memory'; }
			loadPhotoTags();
			ready = {}; res[1].forEach(function (s) { ready[s] = true; });
			photos = res[2];
			entries = (res[0].Items || []).map(parse).sort(function (a, b) {
				return (a.year - b.year) || (a.month - b.month) || ((a.day || 99) - (b.day || 99)) || a.item.Name.localeCompare(b.item.Name);
			});
			renderHero();
			render();
			$('status').textContent = entries.length ? '' : 'No recordings have been added yet.';
			clipFromHash();
		}).catch(function (ex) { $('status').textContent = ex.message; });
	}

	function loadPhoto() {
		var photo = new Image();
		photo.onload = function () {
			$('hero-photo').style.backgroundImage = 'url(' + HLS + 'backdrop.jpg)';
			$('hero-photo').classList.add('is-loaded');
		};
		photo.src = HLS + 'backdrop.jpg';
		$('backdrop').style.backgroundImage = 'url(' + HLS + 'backdrop-blur.jpg)';
		$('player').style.backgroundImage = 'url(' + HLS + 'backdrop-blur.jpg)';
	}

	function renderHero() {
		var total = entries.reduce(function (s, e) { return s + (e.item.RunTimeTicks || 0); }, 0);
		var waiting = entries.filter(function (e) { return !ready[e.slug]; }).length;
		$('lede').textContent = entries.length + ' recordings from Kodaikanal, ' + fmtHours(total) + ' in all, filmed between 3 April and 3 May 1994' +
			(photos.length ? ', and ' + photos.length + ' photographs.' : '.') +
			(waiting ? ' ' + waiting + (waiting === 1 ? ' is' : ' are') + ' still being prepared and will appear here when ' + (waiting === 1 ? 'it’s' : 'they’re') + ' ready.' : '');
		var watching = entries.filter(function (e) { return ready[e.slug] && e.item.UserData && e.item.UserData.PlaybackPositionTicks > 0; })
			.sort(function (a, b) { return (b.item.UserData.LastPlayedDate || '').localeCompare(a.item.UserData.LastPlayedDate || ''); })[0];
		var first = entries.filter(function (e) { return ready[e.slug]; })[0];
		var target = watching || first;
		$('hero-play').hidden = !target;
		if (!target) { $('hero-play-detail').textContent = ''; return; }
		$('hero-play-label').textContent = watching ? 'Continue watching' : 'Start with ' + target.phrase;
		$('hero-play-detail').textContent = watching ? target.title + ', from ' + fmtDuration(target.item.UserData.PlaybackPositionTicks) : '';
		$('hero-play').onclick = function () { play(target); };
	}

	function thumb(e) {
		var t = document.createElement('div'); t.className = 'thumb';
		if (ready[e.slug]) {
			var img = document.createElement('img');
			img.loading = 'lazy'; img.alt = ''; img.src = HLS + e.slug + '/thumb.jpg';
			img.onerror = function () { img.remove(); };
			t.appendChild(img);
			var p = document.createElement('span'); p.className = 'thumb__play'; p.innerHTML = PLAY_ICON; t.appendChild(p);
		} else {
			var tag = e.item.ImageTags && e.item.ImageTags.Primary;
			if (tag) {
				var card = document.createElement('img');
				card.className = 'thumb__card'; card.loading = 'lazy'; card.alt = '';
				card.src = '/kodai1994/jf/Items/' + e.item.Id + '/Images/Primary?maxWidth=400&quality=70&tag=' + tag;
				t.appendChild(card);
			}
			var w = document.createElement('span'); w.className = 'thumb__pending'; w.textContent = 'Being prepared'; t.appendChild(w);
		}
		var dur = fmtDuration(e.item.RunTimeTicks);
		if (dur) { var d = document.createElement('span'); d.className = 'thumb__time'; d.textContent = dur; t.appendChild(d); }
		var ud = e.item.UserData || {};
		if (ready[e.slug] && ud.PlaybackPositionTicks && e.item.RunTimeTicks) {
			var bar = document.createElement('div'); bar.className = 'thumb__progress';
			var fill = document.createElement('span'); fill.style.width = Math.min(100, ud.PlaybackPositionTicks / e.item.RunTimeTicks * 100) + '%';
			bar.appendChild(fill); t.appendChild(bar);
		}
		return t;
	}

	function note(e) {
		var ud = e.item.UserData || {}, parts = [], n = counts['video:' + e.slug] || 0;
		if (!ready[e.slug]) return 'Available soon';
		if (ud.PlaybackPositionTicks) parts.push('Continue from ' + fmtDuration(ud.PlaybackPositionTicks));
		else if (ud.Played) parts.push('Watched');
		if (n) parts.push(plural(n, 'comment'));
		return parts.join('. ');
	}

	// "Chapters 0" / "Events 2" under each title; zero when none have been added yet.
	function markerPills(e) {
		var c = markerCounts['video:' + e.slug] || { chapter: 0, event: 0 };
		var row = document.createElement('div'); row.className = 'mk-counts';
		[['chapter', 'Chapters'], ['event', 'Events'], ['clip', 'Clips']].forEach(function (k) {
			if (k[0] === 'clip' && !c.clip) return;   // clips only once there are some
			var pill = document.createElement('span'); pill.className = 'mk-count mk-count--' + k[0];
			pill.appendChild(document.createTextNode(k[1]));
			var n = document.createElement('b'); n.textContent = String(c[k[0]] || 0); pill.appendChild(n);
			pill.setAttribute('aria-label', (c[k[0]] || 0) + ' ' + k[1].toLowerCase());
			row.appendChild(pill);
		});
		var cs = captionStatus['video:' + e.slug];
		if (cs && cs.lines) {
			var cc = el('span', 'mk-count mk-count--cc', 'CC'); cc.title = 'Has captions and a transcript (computer-made)'; cc.setAttribute('aria-label', 'Has captions');
			row.appendChild(cc);
		}
		return row;
	}
	// A recording's description (written from its transcript, or by a moderator), if it has one
	function descriptionOf(e) { var cs = captionStatus['video:' + e.slug]; return cs && cs.description || ''; }

	function clickable(el, e) {
		if (ready[e.slug]) el.addEventListener('click', function () { play(e); });
		else { el.classList.add('is-pending'); el.setAttribute('aria-disabled', 'true'); }
	}

	// ── Videos: one page, seen as a timeline or a gallery
	function renderVideos(root) {
		var head = el('div', 'page-head'); head.appendChild(el('h2', '', 'Videos'));
		var tabs = el('div', 'subtabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Show the videos as');
		[['timeline', 'Timeline'], ['gallery', 'Gallery'], ['clips', 'Clips']].forEach(function (t) {
			var b = el('button', '', t[1]); b.type = 'button'; b.dataset.mode = t[0]; b.setAttribute('aria-pressed', String(videoMode === t[0]));
			b.addEventListener('click', function () { videoMode = t[0]; storeSet('localStorage', VIDEO_MODE_KEY, videoMode); render(); });
			tabs.appendChild(b);
		});
		head.appendChild(tabs); root.appendChild(head);
		({ gallery: renderGallery, clips: renderClips }[videoMode] || renderTimeline)(root);
	}

	// The frame of a recording at a time, from its seek-bar storyboard (a sprite sheet), as
	// the background of node; the recording's thumbnail until (or unless) that's there.
	var storyboards = {};
	function frameInto(node, slug, t) {
		node.style.backgroundImage = 'url("' + HLS + slug + '/thumb.jpg")';
		if (!storyboards[slug]) storyboards[slug] = fetch(HLS + slug + '/storyboard/storyboard.json', { credentials: 'same-origin', cache: 'no-store' })
			.then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
		storyboards[slug].then(function (sb) {
			if (!sb) return;
			var per = sb.cols * sb.rows, i = Math.min(Math.floor(t / sb.interval), sb.sheets * per - 1), k = i % per;
			node.style.backgroundImage = 'url("' + HLS + slug + '/storyboard/sb-' + String(Math.floor(i / per) + 1).padStart(3, '0') + '.jpg")';
			node.style.backgroundSize = (sb.cols * 100) + '% ' + (sb.rows * 100) + '%';
			node.style.backgroundPosition = (k % sb.cols) / (sb.cols - 1) * 100 + '% ' + Math.floor(k / sb.cols) / (sb.rows - 1) * 100 + '%';
		});
	}
	function clipCard(c) {
		var e = entryBySlug(c.target.slice(6));
		var b = el('button', 'card clip-card'); b.type = 'button';
		var th = el('div', 'thumb clip-card__frame'); frameInto(th, c.target.slice(6), c.start);
		th.appendChild(el('span', 'clip-card__len', clipLen(c)));
		var p = el('span', 'thumb__play'); p.innerHTML = PLAY_ICON; th.appendChild(p);
		b.appendChild(th);
		b.appendChild(el('h3', '', c.title));
		b.appendChild(el('p', 'muted', (e ? e.title : 'A recording') + ' · from ' + at(c.start)));
		if (c.people.length) b.appendChild(el('p', 'clip-card__people', 'With ' + c.people.map(function (x) { return x.name; }).join(', ')));
		var n = Object.keys(c.reactions.counts).reduce(function (s, k) { return s + c.reactions.counts[k]; }, 0);
		b.appendChild(el('p', 'clip-card__by muted', 'by ' + c.author + ' · ' + fmtWhen(c.createdAt) +
			(n ? ' · ' + Object.keys(c.reactions.counts).map(function (k) { return k + ' ' + c.reactions.counts[k]; }).join(' ') : '') +
			(c.comments ? ' · ' + plural(c.comments, 'comment') : '')));
		if (e && ready[e.slug]) b.addEventListener('click', function () { playClip(c); });
		else { b.classList.add('is-pending'); b.setAttribute('aria-disabled', 'true'); }
		return b;
	}
	function renderClips(root) {
		var status = el('p', 'muted', 'Loading the clips…'), grid = el('div', 'gallery clips');
		root.append(status, grid);
		capi('/clips').then(function (list) {
			status.textContent = list.length ? 'Highlights members have made, newest first. Make one from any recording: “Add a chapter, event, clip or memory” beside the video.'
				: 'No clips yet. While watching a recording, press “Add a chapter, event, clip or memory” beside the video and choose Clip.';
			list.forEach(function (c) { grid.appendChild(clipCard(c)); });
		}).catch(function (ex) { status.textContent = ex.message; });
	}

	// ── Home: what's happening on the site
	var AVATAR_HUES = [24, 145, 200, 330, 48, 265, 10, 175];
	function avatar(name) {
		var a = el('span', 'act__who', initials(name || '?'));
		var h = 0; for (var i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
		a.style.background = 'hsl(' + AVATAR_HUES[h % AVATAR_HUES.length] + ' 45% 72%)';
		a.setAttribute('aria-hidden', 'true');
		return a;
	}
	function dayLabel(iso) {
		var d = new Date(iso), t = new Date(); t.setHours(0, 0, 0, 0);
		var diff = Math.round((t - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
		if (diff === 0) return 'Today';
		if (diff === 1) return 'Yesterday';
		return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
	}
	function targetInfo(target) {
		if (!target) return null;
		if (target.indexOf('video:') === 0) {
			var e = entryBySlug(target.slice(6));
			return e ? { kind: 'video', e: e, label: e.title, pic: ready[e.slug] ? HLS + e.slug + '/thumb.jpg' : '' } : null;
		}
		if (target.indexOf('photo:') === 0) {
			var ph = photoById(target.slice(6));
			return ph ? { kind: 'photo', ph: ph, label: 'photo ' + (photos.indexOf(ph) + 1), pic: HLS + 'photos/' + ph.thumb } : null;
		}
		if (target.indexOf('memory:') === 0) return { kind: 'memory', id: Number(target.slice(7)), label: 'a memory' };
		if (target.indexOf('clip:') === 0) return { kind: 'clip', id: Number(target.slice(5)), label: 'a clip' };
		return null;
	}
	function openTarget(info, position) {
		if (!info) return;
		if (info.kind === 'video' && ready[info.e.slug]) play(info.e, position != null ? position : undefined);
		else if (info.kind === 'photo') openPhoto(photos.indexOf(info.ph));
		else if (info.kind === 'memory') openMemory(info.id);
		else if (info.kind === 'clip') openClip(info.id);
	}
	function at(pos) { return pos == null ? '' : (fmtDuration(pos * 1e7) || '0:00'); }

	var homeMemories = [];
	// "This week": the last seven days at a glance (instead of an email digest)
	function weekCard(w) {
		var c = el('section', 'side-card week'); c.appendChild(el('h3', '', 'This week'));
		var labels = [['memories', 'memory', 'memories'], ['photos', 'photo', 'photos'], ['clips', 'clip', 'clips'], ['chapters', 'chapter', 'chapters'], ['events', 'event', 'events'],
			['faces', 'face confirmed', 'faces confirmed'], ['comments', 'comment', 'comments'], ['members', 'member joined', 'members joined']];
		var chips = el('div', 'week__chips');
		labels.forEach(function (l) { var n = w.counts[l[0]] || 0; if (!n) return; var ch = el('span', 'week__chip'); ch.append(el('b', '', n.toLocaleString('en-IN')), document.createTextNode(' ' + (n === 1 ? l[1] : l[2]))); chips.appendChild(ch); });
		if (!chips.childNodes.length) chips.appendChild(el('span', 'muted', 'A quiet week so far.'));
		c.appendChild(chips);
		if (w.memories.length) {
			c.appendChild(el('p', 'week__sub', 'New memories'));
			var ul = el('ul', 'week__list');
			w.memories.forEach(function (m) { var li = el('li'), b = el('button', 'linkish', m.title); b.type = 'button'; b.addEventListener('click', function () { openMemory(m.id); }); li.append(b, el('small', 'muted', ' by ' + m.author)); ul.appendChild(li); });
			c.appendChild(ul);
		}
		if (w.active.length) c.appendChild(el('p', 'week__sub', 'Most active: ' + w.active.map(function (x) { return x.name; }).join(', ')));
		return c;
	}
	// "On this day": in April and May the same day in 1994; otherwise a different day of the visit each day
	function onThisDayCard() {
		var days = [], byDay = {};
		entries.forEach(function (e) { if (!e.day || !ready[e.slug]) return; var k = e.month + '-' + e.day; if (!byDay[k]) { byDay[k] = []; days.push(k); } byDay[k].push(e); });
		if (!days.length) return null;
		var t = new Date(), today = (t.getMonth() + 1) + '-' + t.getDate(), key = byDay[today] ? today : null, title = 'On this day in 1994';
		if (!key) { var doy = Math.floor((t - new Date(t.getFullYear(), 0, 0)) / 864e5); key = days[doy % days.length]; title = 'A day from the visit'; }
		var list = byDay[key], e0 = list[0];
		var c = el('section', 'side-card otd'); c.appendChild(el('h3', '', title));
		c.appendChild(el('p', 'otd__date', new Date(Date.UTC(1994, e0.month - 1, e0.day)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })));
		list.forEach(function (e) {
			var b = el('button', 'otd__rec'); b.type = 'button';
			var pic = el('span'); pic.style.backgroundImage = 'url("' + HLS + e.slug + '/thumb.jpg")';
			b.append(pic, el('b', '', e.title)); b.addEventListener('click', function () { play(e); });
			c.appendChild(b);
		});
		var slugs = list.map(function (e) { return 'video:' + e.slug; });
		var mems = homeMemories.filter(function (m) { return m.links.some(function (l) { return slugs.indexOf(l.target) >= 0; }); });
		if (mems.length) {
			c.appendChild(el('p', 'week__sub', plural(mems.length, 'memory').replace('memorys', 'memories') + ' of this day'));
			mems.slice(0, 3).forEach(function (m) { var b = el('button', 'linkish otd__mem', m.title); b.type = 'button'; b.addEventListener('click', function () { openMemory(m.id); }); c.appendChild(b); });
		}
		return c;
	}
	// Contribution milestones: who has added the most, by the round number they've passed
	var STEPS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500];
	function milestonesCard(members) {
		var verbs = { photos: ['added', 'photos'], chapters: ['added', 'chapters'], events: ['added', 'events'], clips: ['made', 'clips'], faces: ['marked', 'faces'], memories: ['wrote', 'memories'], comments: ['left', 'comments'] };
		var out = [];
		members.forEach(function (m) {
			Object.keys(verbs).forEach(function (k) {
				var n = m.contributions[k] || 0, step = STEPS.filter(function (x) { return n >= x; }).pop();
				if (step) out.push({ name: m.name, n: n, step: step, text: verbs[k][0] + ' ' + n.toLocaleString('en-IN') + ' ' + verbs[k][1], kind: k });
			});
		});
		if (!out.length) return null;
		out.sort(function (x, y) { return y.step - x.step || y.n - x.n; });
		var c = el('section', 'side-card'); c.appendChild(el('h3', '', 'Milestones'));
		var ul = el('ul', 'miles');
		out.slice(0, 6).forEach(function (o) {
			var li = el('li'), badge = el('span', 'miles__badge', o.step >= 1000 ? (o.step / 1000) + 'k' : String(o.step));
			badge.title = o.step + '+';
			var t = el('span'); t.append(el('b', '', o.name), document.createTextNode(' has ' + o.text));
			li.append(badge, t); ul.appendChild(li);
		});
		c.appendChild(ul);
		return c;
	}
	var homeFilter = 'all';
	var FEED_FILTERS = [['all', 'Everything'], ['memory', 'Memories'], ['comment', 'Comments'], ['chapter', 'Chapters'], ['event', 'Events'], ['clip', 'Clips'], ['photo', 'Photos & videos'], ['people', 'People']];
	function feedKind(it) {
		return it.type === 'video' ? 'photo' : (it.type === 'person' || it.type === 'joined') ? 'people' : it.type;
	}
	function renderHome(root) {
		var wrap = el('section', 'home');
		var welcome = el('div', 'home__welcome');
		var hello = (me && me.displayName) || session.name || '';
		welcome.appendChild(el('h2', '', hello ? 'Welcome back, ' + hello.split(' ')[0] : 'Welcome'));
		welcome.appendChild(el('p', 'muted', 'What everyone has been adding to Kodai 1994.'));
		wrap.appendChild(welcome);
		var main = el('div', 'home__main'), side = el('aside', 'home__side');
		wrap.append(main, side); root.appendChild(wrap);
		var status = el('p', 'muted', 'Loading what’s new…'); main.appendChild(status);
		var state = { items: [], seenAt: null, more: false };

		Promise.all([capi('/activity?limit=50'), capi('/members').catch(function () { return []; }),
			capi('/memories').catch(function () { return []; }), ensurePeople().catch(function () { return []; })]).then(function (res) {
			status.remove();
			var a = res[0];
			homeMemories = res[2];
			state.seenAt = a.seenAt; state.more = a.more;
			// New recordings: when Jellyfin added them (there are only a handful)
			var vids = entries.filter(function (e) { return e.item.DateCreated && ready[e.slug]; }).map(function (e) {
				return { type: 'video', at: new Date(e.item.DateCreated).toISOString().replace(/\.\d+Z$/, '+00:00'), target: 'video:' + e.slug };
			});
			state.items = a.items.concat(vids).sort(function (x, y) { return (y.at || '').localeCompare(x.at || ''); });
			drawFeatured(a.featured); drawSince(); drawFeed(); drawSide(a, res[1]);
			// Mark as seen a little later, so a quick reload still shows what was new.
			setTimeout(function () { capi('/activity/seen', { method: 'POST' }).catch(function () {}); }, 6000);
		}).catch(function (ex) { status.textContent = 'Couldn’t load the activity: ' + ex.message; });

		var featuredBox = el('div'), sinceBox = el('div'), filterBox = el('div', 'feed-filter'), feedBox = el('div');
		var feedTitle = el('h2', 'home__h', 'Activity');
		main.append(featuredBox, sinceBox, feedTitle, filterBox, feedBox);

		// 8. A memory a moderator pinned to the top of Home
		function drawFeatured(f) {
			featuredBox.textContent = '';
			if (!f) return;
			var card = el('article', 'featured'), lab = el('p', 'featured__label'); lab.append(icon('pin'), document.createTextNode('Featured memory'));
			card.append(lab, el('h3', '', f.title), el('p', 'featured__by', (f.kind === 'notes' ? 'Notes' : f.kind === 'recording' ? 'A recorded memory' : 'A memory') + ' by ' + f.author));
			if (f.excerpt) card.appendChild(el('p', 'featured__text', f.excerpt + (f.excerpt.length >= 420 ? '…' : '')));
			var pics = el('div', 'featured__pics');
			f.links.slice(0, 4).forEach(function (l) { var t = targetInfo(l.target); if (t && t.pic) { var sp = el('span'); sp.style.backgroundImage = 'url("' + t.pic + '")'; pics.appendChild(sp); } });
			if (pics.childNodes.length) card.appendChild(pics);
			var read = el('button', 'btn', 'Read the memory'); read.type = 'button';
			read.addEventListener('click', function () { openMemory(f.id); });
			card.appendChild(read);
			featuredBox.appendChild(card);
		}

		filterBox.setAttribute('role', 'group'); filterBox.setAttribute('aria-label', 'Show');
		FEED_FILTERS.forEach(function (f) {
			var b = el('button', '', f[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(homeFilter === f[0]));
			b.addEventListener('click', function () {
				homeFilter = f[0];
				filterBox.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
				drawFeed();
			});
			filterBox.appendChild(b);
		});
		function isNew(it) { return state.seenAt && it.at > state.seenAt; }

		function drawSince() {
			sinceBox.textContent = '';
			if (!state.seenAt) return;
			var fresh = state.items.filter(isNew);
			if (!fresh.length) return;
			var c = {}; fresh.forEach(function (it) { var k = feedKind(it) === 'photo' ? (it.type === 'video' ? 'video' : 'photo') : feedKind(it); c[k] = (c[k] || 0) + 1; });
			var bar = el('div', 'since');
			bar.appendChild(el('span', '', 'Since your last visit, ' + fmtWhen(state.seenAt) + ':'));
			[['photo', 'new photo'], ['video', 'new recording'], ['memory', 'memory'], ['clip', 'clip'], ['comment', 'comment'], ['chapter', 'chapter'], ['event', 'event'], ['people', 'new name or member', 'new names & members']].forEach(function (k) {
				if (!c[k[0]]) return;
				var chip = el('span', 'since__chip'); chip.append(el('b', '', String(c[k[0]])), document.createTextNode(' ' + (c[k[0]] === 1 ? k[1] : (k[2] || k[1].replace(/y$/, 'ie') + 's'))));
				bar.appendChild(chip);
			});
			sinceBox.appendChild(bar);
		}

		// Photos one person added close together read as one entry with a strip of them.
		function grouped(list) {
			var out = [];
			list.forEach(function (it) {
				var last = out[out.length - 1];
				if (it.type === 'photo' && last && last.type === 'photos' && last.actor === it.actor && Date.parse(last.items[last.items.length - 1].at) - Date.parse(it.at) < 3 * 36e5) {
					last.items.push(it); return;
				}
				if (it.type === 'photo') { out.push({ type: 'photos', actor: it.actor, at: it.at, items: [it] }); return; }
				out.push(it);
			});
			return out;
		}

		function drawFeed() {
			feedBox.textContent = '';
			var list = state.items.filter(function (it) { return homeFilter === 'all' || feedKind(it) === homeFilter; });
			if (!list.length) { feedBox.appendChild(el('p', 'feed-empty', homeFilter === 'all' ? 'Nothing here yet. Write a memory, add a chapter, or comment on a photo, and it will show up here.' : 'Nothing of this kind yet.')); }
			var day = null, ol = null;
			grouped(list).forEach(function (it) {
				var label = dayLabel(it.at);
				if (label !== day) {
					day = label;
					var sec = el('section', 'feed-day'); sec.appendChild(el('h3', '', label));
					ol = el('ol', 'feed'); sec.appendChild(ol); feedBox.appendChild(sec);
				}
				ol.appendChild(actItem(it));
			});
			if (state.more) {
				var more = el('button', 'btn btn--quiet feed-more', 'Show older'); more.type = 'button';
				more.addEventListener('click', function () {
					more.disabled = true;
					var last = state.items.filter(function (x) { return x.type !== 'video'; }).pop();
					capi('/activity?limit=50&before=' + encodeURIComponent(last ? last.at : '')).then(function (a) {
						state.more = a.more;
						var seen = {}; state.items.forEach(function (x) { seen[x.type + x.at + (x.id || x.memoryId || x.target || '')] = 1; });
						state.items = state.items.concat(a.items.filter(function (x) { return !seen[x.type + x.at + (x.id || x.memoryId || x.target || '')]; }));
						drawFeed();
					}).catch(function (ex) { more.disabled = false; more.textContent = ex.message; });
				});
				feedBox.appendChild(more);
			}
		}

		function actItem(it) {
			var li = el('li', 'act'), what = el('div', 'act__what'), body = el('div', 'act__body');
			var fresh = it.type === 'photos' ? it.items.some(isNew) : isNew(it);
			if (fresh) li.classList.add('is-new');
			var info = targetInfo(it.target), click = null;
			function who() { return el('b', '', it.actor || 'A member'); }
			function title(t) { return el('span', 'act__title', '“' + t + '”'); }
			function onTarget() { return info ? ' ' + (info.kind === 'video' ? 'in ' : 'on ') + (info.kind === 'photo' ? info.label : info.label) : ''; }
			switch (it.type) {
			case 'memory':
				what.append(who(), document.createTextNode(it.memoryKind === 'notes' ? ' shared notes ' : it.memoryKind === 'recording' ? ' recorded a memory ' : ' wrote a memory '), title(it.title));
				if (it.excerpt) body.appendChild(el('p', 'act__excerpt', it.excerpt));
				click = function () { openMemory(it.memoryId); };
				break;
			case 'comment':
				what.append(who(), document.createTextNode(' commented' + (info ? ' on ' + (info.kind === 'video' ? info.label + (it.position != null ? ' at ' + at(it.position) : '') : info.label) : '')));
				body.appendChild(el('p', 'act__excerpt is-quote', it.excerpt));
				click = function () { openTarget(info, it.position); };
				break;
			case 'chapter':
				what.append(who(), document.createTextNode(' added the chapter '), title(it.title), document.createTextNode(info ? ' to ' + info.label + ' at ' + at(it.position) : ''));
				click = function () { openTarget(info, it.position); };
				break;
			case 'event':
				what.append(who(), document.createTextNode(' tagged '), el('b', '', it.title || 'someone'), document.createTextNode(info ? ' in ' + info.label + ' at ' + at(it.position) : ''));
				click = function () { openTarget(info, it.position); };
				break;
			case 'clip':
				what.append(who(), document.createTextNode(' made the clip '), title(it.title),
					document.createTextNode(info ? ' from ' + info.label + ' (' + at(it.position) + '–' + at(it.end) + ')' : ''));
				click = function () { openClip(it.id); };
				break;
			case 'photos':
				var n = it.items.length;
				what.append(who(), document.createTextNode(n === 1 ? ' added a photo' : ' added ' + n + ' photos'));
				var strip = el('div', 'act__strip');
				it.items.slice(0, 6).forEach(function (pi) {
					var t = targetInfo(pi.target); if (!t) return;
					var sp = el('span'); sp.style.backgroundImage = 'url("' + t.pic + '")'; sp.title = 'Open ' + t.label;
					sp.addEventListener('click', function (ev) { ev.stopPropagation(); openTarget(t); });
					strip.appendChild(sp);
				});
				if (n > 6) strip.appendChild(el('em', '', '+' + (n - 6) + ' more'));
				body.appendChild(strip);
				var firstInfo = targetInfo(it.items[0].target);
				click = function () { if (firstInfo) openTarget(firstInfo); };
				info = null;
				break;
			case 'video':
				what.append(el('b', '', 'New recording: '), title(info ? info.label : 'a recording'), document.createTextNode(info ? ', ' + info.e.longDate : ''));
				click = function () { openTarget(info); };
				break;
			case 'person':
				what.append(who(), document.createTextNode(' added '), el('b', '', it.title), document.createTextNode(' to the People list'));
				click = function () { openPerson(it.personId); };
				break;
			case 'joined':
				what.append(who(), document.createTextNode(' joined Kodai 1994'));
				break;
			}
			if (fresh) what.appendChild(el('span', 'act__new', 'NEW'));
			if (info && info.pic) {
				var th = el('span', 'act__thumb'); th.style.backgroundImage = 'url("' + info.pic + '")';
				if (info.kind === 'video' && it.position != null) th.appendChild(el('small', '', at(it.position)));
				body.insertBefore(th, body.firstChild);
			}
			var when = el('time', 'act__when', fmtWhen(it.at)); when.dateTime = it.at; when.title = new Date(it.at).toLocaleString('en-GB');
			li.append(avatar(it.type === 'video' ? 'Kodai 1994' : it.actor), what, when);
			if (body.childNodes.length) li.appendChild(body);
			if (click) {
				li.classList.add('is-link'); li.tabIndex = 0; li.setAttribute('role', 'link');
				li.addEventListener('click', click);
				li.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') click(); });
			}
			li.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
			return li;
		}

		function drawSide(a, members) {
			if (a.week) side.appendChild(weekCard(a.week));
			var otd = onThisDayCard(); if (otd) side.appendChild(otd);
			var t = a.totals, hours = entries.reduce(function (s2, e) { return s2 + (e.item.RunTimeTicks || 0); }, 0);
			var col = el('section', 'side-card'); col.appendChild(el('h3', '', 'The collection'));
			var dl = el('dl', 'stats');
			[[entries.length, 'recordings'], [fmtHours(hours).replace(' hours', ''), 'hours of video'], [photos.length, 'photographs'],
			 [t.people, 'people named'], [t.chapters, t.chapters === 1 ? 'chapter' : 'chapters'], [t.events, t.events === 1 ? 'event' : 'events'], [t.clips || 0, t.clips === 1 ? 'clip' : 'clips'], [t.memories, t.memories === 1 ? 'memory' : 'memories'], [t.faces, 'faces marked'], [t.comments, t.comments === 1 ? 'comment' : 'comments']]
				.forEach(function (x) { var d = el('div'); d.append(el('dt', '', x[1]), el('dd', '', Number(x[0]).toLocaleString('en-IN'))); dl.appendChild(d); });
			col.appendChild(dl); side.appendChild(col);
			if (a.identify && a.identify.pending) {
				var help = el('section', 'side-card help-card'); help.appendChild(el('h3', '', 'Help name the faces'));
				help.appendChild(el('p', '', 'The computer found ' + a.identify.pending.toLocaleString('en-IN') + ' faces in the recordings and photos' +
					(a.identify.likely ? ', ' + a.identify.likely.toLocaleString('en-IN') + ' of them likely matches. A quick yes or no from you helps everyone.' : '. Do you recognise them?')));
				var go = el('a', 'btn', 'Identify faces'); go.href = 'identify.html'; help.appendChild(go);
				side.appendChild(help);
			}
			var ms = milestonesCard(members); if (ms) side.appendChild(ms);
			var mem = el('section', 'side-card'); mem.appendChild(el('h3', '', 'Members (' + members.length + ')'));
			var ul = el('ul', 'members');
			members.forEach(function (m) {
				var li = el('li'), name = el('b', '', m.name);
				if (m.lastSeen && Date.now() - Date.parse(m.lastSeen) < 15 * 6e4) { var dot = el('span', 'is-online'); dot.title = 'Here now'; name.appendChild(dot); }
				if (m.moderator) name.appendChild(el('span', 'badge-mod', 'Moderator'));
				var c = m.contributions, bits = [];
				if (c.memories) bits.push(plural(c.memories, 'memory').replace('memorys', 'memories'));
				if (c.photos) bits.push(plural(c.photos, 'photo'));
				if (c.chapters) bits.push(plural(c.chapters, 'chapter'));
				if (c.events) bits.push(plural(c.events, 'event'));
				if (c.comments) bits.push(plural(c.comments, 'comment'));
				if (c.faces) bits.push(plural(c.faces, 'face') + ' marked');
				var line = (m.joined ? 'Joined ' + new Date(m.joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Member') + (bits.length ? ' · ' + bits.slice(0, 2).join(', ') : '');
				var av = avatar(m.name), self = m.personId && people.filter(function (x) { return x.id === m.personId; })[0];
				if (self && portraitInto(av, self.portrait)) av.title = m.name + ' in 1994';
				li.append(av, name, el('small', '', line));
				if (self) {   // linked to their 1994 self: open that page
					li.classList.add('is-link'); li.tabIndex = 0; li.title = 'See ' + self.name + ' in 1994';
					li.addEventListener('click', function () { openPerson(self.id); });
				}
				ul.appendChild(li);
			});
			mem.appendChild(ul); side.appendChild(mem);
		}
	}

	function renderTimeline(root) {
		var months = [];
		entries.forEach(function (e) {
			var key = e.year + '-' + e.month, m = months[months.length - 1];
			if (!m || m.key !== key) { m = { key: key, label: MONTHS[e.month - 1] + ' ' + e.year, days: [] }; months.push(m); }
			var dkey = e.day || 'undated', d = m.days.filter(function (x) { return x.key === dkey; })[0];
			if (!d) { d = { key: dkey, entry: e, items: [] }; m.days.push(d); }
			d.items.push(e);
		});
		months.forEach(function (m) {
			// Undated recordings close their month.
			m.days.sort(function (a, b) { return (a.key === 'undated' ? 99 : a.key) - (b.key === 'undated' ? 99 : b.key); });
			var sec = document.createElement('section'); sec.className = 'month';
			var h = document.createElement('h2'); h.textContent = m.label; sec.appendChild(h);
			var list = document.createElement('ol'); list.className = 'days';
			m.days.forEach(function (d) {
				var li = document.createElement('li'); li.className = 'day' + (d.key === 'undated' ? ' day--undated' : '');
				var date = document.createElement('div'); date.className = 'day__date';
				var num = document.createElement('span'); num.className = 'day__num'; num.textContent = d.key === 'undated' ? '–' : d.key;
				var wd = document.createElement('span'); wd.className = 'day__wd';
				var wdLong = document.createElement('span'); wdLong.className = 'wd-long'; wdLong.textContent = d.key === 'undated' ? 'Date not recorded' : d.entry.weekday;
				var wdShort = document.createElement('span'); wdShort.className = 'wd-short'; wdShort.textContent = d.key === 'undated' ? 'Undated' : d.entry.weekdayShort;
				wd.appendChild(wdLong); wd.appendChild(wdShort);
				date.appendChild(num); date.appendChild(wd);
				var items = document.createElement('div'); items.className = 'day__items';
				d.items.forEach(function (e) {
					var b = document.createElement('button'); b.type = 'button'; b.className = 'entry';
					var text = document.createElement('div');
					var t = document.createElement('h3'); t.textContent = e.title;
					var p = document.createElement('p'); p.className = 'muted';
					p.textContent = [e.title !== e.phrase ? e.phrase : '', note(e)].filter(Boolean).join('. ');
					text.appendChild(t); text.appendChild(p);
					if (descriptionOf(e)) text.appendChild(el('p', 'entry__desc', descriptionOf(e)));
					text.appendChild(markerPills(e));
					b.appendChild(thumb(e)); b.appendChild(text);
					clickable(b, e);
					items.appendChild(b);
				});
				li.appendChild(date); li.appendChild(items); list.appendChild(li);
			});
			sec.appendChild(list); root.appendChild(sec);
		});
	}

	function renderGallery(root) {
		var grid = document.createElement('div'); grid.className = 'gallery';
		entries.forEach(function (e) {
			var b = document.createElement('button'); b.type = 'button'; b.className = 'card';
			var t = document.createElement('h3'); t.textContent = e.title;
			var p = document.createElement('p'); p.className = 'muted';
			p.textContent = [e.longDate, note(e)].filter(Boolean).join('. ');
			b.appendChild(thumb(e)); b.appendChild(t); b.appendChild(p);
			if (descriptionOf(e)) b.appendChild(el('p', 'card__desc', descriptionOf(e)));
			b.appendChild(markerPills(e));
			clickable(b, e);
			grid.appendChild(b);
		});
		root.appendChild(grid);
	}

	// "High res": the original (ow × oh, recorded by the worker for uploads; folder photos
	// fall back to their shown size) has at least HIRES_PIXELS pixels, about 2400 × 1700.
	var HIRES_PIXELS = 4e6, photoFilter = 'all';
	function isHires(ph) { return (ph.ow || ph.w) * (ph.oh || ph.h) >= HIRES_PIXELS; }
	function origSize(ph) { return (ph.ow || ph.w) + ' × ' + (ph.oh || ph.h); }
	function renderPhotos(root) {
		root.appendChild(uploadBar());
		var waiting = uploads.filter(function (u) { return u.mine && (u.status === 'pending' || u.status === 'failed'); });
		if (!photos.length && !waiting.length) { var p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No photographs have been added yet.'; root.appendChild(p); return; }
		var hires = photos.filter(isHires);
		if (hires.length) {
			var filt = el('div', 'photo-filter'); filt.setAttribute('role', 'group'); filt.setAttribute('aria-label', 'Show');
			[['all', 'All photos', photos.length], ['hires', 'High res', hires.length]].forEach(function (o) {
				var fb = el('button', '', o[1] + ' '); fb.type = 'button'; fb.appendChild(el('b', '', String(o[2])));
				fb.setAttribute('aria-pressed', String(photoFilter === o[0]));
				fb.addEventListener('click', function () { photoFilter = o[0]; render(); });
				filt.appendChild(fb);
			});
			root.appendChild(filt);
		}
		var shown = photoFilter === 'hires' && hires.length ? hires : photos;
		var grid = document.createElement('div'); grid.className = 'photos';
		grid.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
		grid.addEventListener('dragstart', function (ev) { ev.preventDefault(); });
		shown.forEach(function (ph, i) {
			var b = document.createElement('button'); b.type = 'button'; b.className = 'photo';
			b.setAttribute('aria-label', 'Open photo ' + (i + 1) + ' of ' + shown.length + (isHires(ph) ? ', high resolution' : ''));
			var img = document.createElement('img');
			img.loading = 'lazy'; img.alt = ''; img.src = HLS + 'photos/' + ph.thumb;
			img.width = ph.w; img.height = ph.h; // reserves the space before it loads
			b.appendChild(img);
			if (isHires(ph)) { var hr = el('span', 'photo__hires', 'High res'); hr.title = origSize(ph) + ' original'; b.appendChild(hr); }
			var n = counts['photo:' + ph.id] || 0;
			if (n) { var pill = document.createElement('span'); pill.className = 'photo__count'; pill.textContent = plural(n, 'comment'); b.appendChild(pill); }
			b.addEventListener('click', function () { openPhoto(i, shown); });
			grid.appendChild(b);
		});
		waiting.forEach(function (u) {
			var t = el('div', 'photo photo--pending');
			if (u.status === 'pending') t.textContent = 'Adding your photo…';
			else {
				t.textContent = '';
				var msg = el('span', '', u.message || 'That photo couldn’t be added.'), x = el('button', 'btn btn--quiet', 'Dismiss'); x.type = 'button';
				x.addEventListener('click', function () { capi('/photo-uploads/' + u.id, { method: 'DELETE' }).then(reloadPhotos).then(render); });
				var box = el('div'); box.style.textAlign = 'center'; box.style.padding = '12px'; box.append(msg, el('br'), x); t.appendChild(box);
			}
			grid.appendChild(t);
		});
		root.appendChild(grid);
	}

	// ── People who appear in the recordings. Members add themselves (or anyone they
	// recognise); a name can only be on the list once. Times and photos per person
	// come later, as a filtered list.
	var people = [], peopleQuery = '';
	function initials(name) {
		var parts = name.replace(/\b(sir|ji)\b/ig, '').trim().split(/\s+/).filter(Boolean);
		return ((parts[0] || name)[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
	}
	function renderPeople(root) {
		var wrap = el('section', 'people');
		var head = el('div', 'people__head'), intro = el('div');
		intro.appendChild(el('h2', '', 'People'));
		var count = el('p', 'muted', 'Loading…'); intro.appendChild(count);
		head.appendChild(intro); wrap.appendChild(head);

		var tools = el('div', 'people__tools');
		var search = el('input', 'field'); search.type = 'search'; search.placeholder = 'Find a name'; search.setAttribute('aria-label', 'Find a name');
		search.value = peopleQuery;
		var add = el('form', 'people__add');
		var input = el('input', 'field'); input.placeholder = 'Add a name'; input.maxLength = 80; input.setAttribute('aria-label', 'Name to add'); input.autocomplete = 'off';
		var addBtn = el('button', 'btn', 'Add'); addBtn.type = 'submit';
		var meBtn = el('button', 'btn btn--quiet'); meBtn.type = 'button'; meBtn.hidden = true;
		add.appendChild(input); add.appendChild(addBtn); add.appendChild(meBtn);
		tools.appendChild(search); tools.appendChild(add); wrap.appendChild(tools);
		var msg = el('p', 'people__msg muted'); msg.setAttribute('role', 'status'); wrap.appendChild(msg);
		var grid = el('ol', 'people__grid'); wrap.appendChild(grid);
		root.appendChild(wrap);

		function keyOf(n) { return n.toLowerCase().split(/\s+/).filter(Boolean).join(' '); }
		function draw(flashId) {
			grid.textContent = '';
			var q = keyOf(search.value);
			var shown = people.filter(function (pp) { return !q || keyOf(pp.name).indexOf(q) >= 0; });
			count.textContent = plural(people.length, 'person').replace('persons', 'people') + ' who appear in these recordings and photos. Add yourself if you were there, or anyone you recognise.';
			shown.forEach(function (pp) {
				var li = el('li', 'person' + (pp.id === flashId ? ' is-flash' : '')); li.dataset.id = pp.id;
				var av = el('span', 'person__avatar', initials(pp.name)); portraitInto(av, pp.portrait);
				li.appendChild(av);
				var openBtn = el('button', 'person__open'); openBtn.type = 'button';
				openBtn.appendChild(el('span', 'person__name', pp.name));
				openBtn.setAttribute('aria-label', 'Open ' + pp.name + "'s page");
				openBtn.addEventListener('click', function () { openPerson(pp.id); });
				li.appendChild(openBtn);
				var meta = el('span', 'person__meta');
				meta.appendChild(el('span', '', plural(pp.photos || 0, 'photo') + ', ' + plural(pp.moments || 0, 'moment')));
				if (pp.addedBy && pp.addedBy !== 'Member' && pp.addedBy !== 'Admin') meta.appendChild(el('span', '', 'added by ' + pp.addedBy));
				var acts = el('span', 'person__actions');
				if (pp.canEdit) {
					var ren = iconButton('pencil', 'Rename ' + pp.name);
					ren.addEventListener('click', function () {
						if (li.querySelector('form')) return;
						var f = el('form'), fi = el('input', 'field'), ok = el('button', 'btn btn--quiet', 'Save'), no = el('button', 'linkish', 'Cancel');
						fi.value = pp.name; fi.maxLength = 80; fi.setAttribute('aria-label', 'New name'); ok.type = 'submit'; no.type = 'button';
						f.appendChild(fi); f.appendChild(ok); f.appendChild(no); li.appendChild(f); fi.focus();
						no.addEventListener('click', function () { f.remove(); });
						f.addEventListener('submit', function (ev) {
							ev.preventDefault();
							capi('/people/' + pp.id, { method: 'PUT', body: { name: fi.value } }).then(function () { load(pp.id); })
								.catch(function (ex) { msg.textContent = ex.message; });
						});
					});
					acts.appendChild(ren);
				}
				if (pp.canDelete) {
					var del = iconButton('trash', 'Remove ' + pp.name), ask = null;
					// First click asks; a second click within 4 s removes.
					var disarm = function () { del.classList.remove('is-armed'); del.setAttribute('aria-label', 'Remove ' + pp.name); del.title = 'Remove ' + pp.name; if (ask) { ask.remove(); ask = null; } };
					del.addEventListener('click', function () {
						if (!del.classList.contains('is-armed')) {
							del.classList.add('is-armed'); del.setAttribute('aria-label', 'Click again to remove ' + pp.name); del.title = 'Click again to remove';
							ask = el('span', 'person__confirm', 'Remove ' + pp.name + '? Click the bin again.'); li.appendChild(ask);
							setTimeout(disarm, 4000); return;
						}
						capi('/people/' + pp.id, { method: 'DELETE' }).then(function () { msg.textContent = pp.name + ' was removed.'; load(); })
							.catch(function (ex) { disarm(); msg.textContent = ex.message; });
					});
					acts.appendChild(del);
				}
				li.appendChild(meta);
				if (acts.childNodes.length) li.appendChild(acts);
				grid.appendChild(li);
			});
			if (!shown.length) grid.appendChild(el('li', 'muted', people.length ? 'No names match “' + search.value + '”. Add it below if they’re missing.' : 'No names yet.'));
			// "Add me as …" when the member's own name isn't listed yet
			var mine = me && me.displayName;
			meBtn.hidden = !mine || people.some(function (pp) { return keyOf(pp.name) === keyOf(mine); });
			if (!meBtn.hidden) meBtn.textContent = 'Add me as ' + mine;
			if (flashId) { var f = grid.querySelector('.is-flash'); if (f) f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
		}
		function load(flashId) {
			return capi('/people').then(function (list) { people = list; peopleLoad = Promise.resolve(list); draw(flashId); })
				.catch(function (ex) { count.textContent = ex.message; });
		}
		function addName(name) {
			msg.textContent = ''; addBtn.disabled = meBtn.disabled = true;
			capi('/people', { method: 'POST', body: { name: name } }).then(function (pp) {
				input.value = ''; msg.textContent = pp.name + ' was added.'; return load(pp.id);
			}).catch(function (ex) {
				msg.textContent = ex.message;
				var hit = people.filter(function (pp) { return keyOf(pp.name) === keyOf(name); })[0];
				if (ex.status === 409 && hit) { search.value = ''; peopleQuery = ''; draw(hit.id); }
			}).then(function () { addBtn.disabled = meBtn.disabled = false; });
		}
		search.addEventListener('input', function () { peopleQuery = search.value; draw(); });
		add.addEventListener('submit', function (ev) { ev.preventDefault(); if (input.value.trim()) addName(input.value); });
		meBtn.addEventListener('click', function () { addName(me.displayName); });
		load();
	}

	// ── A person's page: the photos they're tagged in, and per video only their events.
	var personId = null;
	function openPerson(id) {
		personId = id; view = 'person';
		try { history.replaceState(null, '', '#person/' + id); } catch (e) {}
		render();
		$('content').scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	// A #person/<id> link opened or pasted while the page is already open
	window.addEventListener('hashchange', function () {
		var link = /^#person\/(\d+)$/.exec(location.hash);
		if (link && session && !$('library-view').hidden && Number(link[1]) !== personId) openPerson(Number(link[1]));
	});
	function closePerson() {
		personId = null; view = 'people';
		try { history.replaceState(null, '', location.pathname); } catch (e) {}
		render();
	}
	function renderPerson(root) {
		var wrap = el('section', 'profile');
		var back = el('button', 'btn btn--quiet profile__back', '← All people'); back.type = 'button';
		back.addEventListener('click', closePerson);
		wrap.appendChild(back);
		var status = el('p', 'muted', 'Loading…'); wrap.appendChild(status);
		root.appendChild(wrap);
		capi('/people/' + personId).then(function (d) {
			status.remove();
			var pp = d.person;
			var head = el('div', 'profile__head');
			var av = el('span', 'profile__avatar', initials(pp.name));
			if (portraitInto(av, pp.portrait)) av.title = pp.name + ' in 1994';
			head.appendChild(av);
			var t = el('div'); t.appendChild(el('h2', '', pp.name));
			var moments = d.videos.reduce(function (n, v) { return n + v.events.length; }, 0);
			t.appendChild(el('p', 'muted', 'Tagged in ' + plural(d.photos.length, 'photo') + ' and ' + plural(moments, 'moment') +
				' across ' + plural(d.videos.length, 'video') + '.'));
			head.appendChild(t); wrap.appendChild(head);
			// A member and their 1994 self
			var claim = el('div', 'claim');
			function drawClaim() {
				claim.textContent = '';
				if (pp.isMe) {
					claim.append(el('span', 'claim__me', 'This is you. You’ll hear when someone tags you.'));
					var undo = el('button', 'linkish', 'That’s not me'); undo.type = 'button';
					undo.addEventListener('click', function () { setClaim(false); }); claim.appendChild(undo);
				} else if (pp.member) {
					claim.appendChild(el('span', 'muted', 'Member: ' + pp.member));
					if (me && me.isAdmin) { var fix = el('button', 'linkish', 'Unlink'); fix.type = 'button'; fix.addEventListener('click', function () { setClaim(false); }); claim.appendChild(fix); }
				} else {
					var mine = el('button', 'btn btn--quiet btn--small', 'This is me'); mine.type = 'button';
					mine.title = 'Link your account to ' + pp.name + ': your 1994 portrait shows beside your name, and you hear when you’re tagged';
					mine.addEventListener('click', function () { setClaim(true); }); claim.appendChild(mine);
				}
			}
			function setClaim(on) {
				capi('/people/' + pp.id + '/member', { method: 'PUT', body: { claim: on } }).then(function () {
					pp.isMe = on; pp.member = on ? ((me && me.displayName) || session.name) : null;
					if (me) me.personId = on ? pp.id : null;
					drawClaim();
				}).catch(function (ex) { claim.appendChild(el('span', 'error', ex.message)); });
			}
			drawClaim(); t.appendChild(claim);
			// Someone in nearly every photo: identification leaves their face out; tagged by hand only.
			var detect = el('div', 'claim');
			function drawDetect() {
				detect.textContent = '';
				if (pp.noDetect) detect.appendChild(el('span', 'muted', 'Face identification leaves ' + pp.name + ' out. Mark their face by hand.'));
				if (!(me && me.isAdmin)) return;
				var b = el('button', pp.noDetect ? 'linkish' : 'btn btn--quiet btn--small', pp.noDetect ? 'Detect again' : 'Don’t detect this face'); b.type = 'button';
				b.title = pp.noDetect ? 'Suggest ' + pp.name + ' in face identification again' :
					'For someone in nearly every photo: identification stops suggesting them, and their faces aren’t listed as unknown';
				b.addEventListener('click', function () {
					b.disabled = true;
					capi('/people/' + pp.id + '/detect', { method: 'PUT', body: { detect: pp.noDetect } }).then(function (r) {
						pp.noDetect = !r.detect; drawDetect();
						if (r.removed) detect.appendChild(el('span', 'muted', plural(r.removed, 'unreviewed suggestion') + ' removed.'));
					}).catch(function (ex) { b.disabled = false; detect.appendChild(el('span', 'error', ex.message)); });
				});
				detect.appendChild(b);
			}
			drawDetect(); t.appendChild(detect);

			wrap.appendChild(el('h3', '', 'Faces from 1994'));
			if (!d.faces.length) {
				wrap.appendChild(el('p', 'muted', 'No face marked yet. Open a photo they’re in, press “Mark faces”, and draw a box around ' + pp.name + '’s face.'));
			} else {
				var strip = el('div', 'faces-strip');
				d.faces.forEach(function (fc) {
					var card = el('div', 'face-card');
					var img = el('button', 'face-card__img'); img.type = 'button';
					img.setAttribute('aria-label', 'Open the photo this face is from');
					portraitInto(img, { photo: fc.photo, box: fc.box });
					var isPortrait = pp.portrait && pp.portrait.faceId === fc.id;
					if (isPortrait) img.classList.add('is-portrait');
					var ph = photos.filter(function (x) { return x.id === fc.photo; })[0];
					img.addEventListener('click', function () { if (ph) openPhoto(photos.indexOf(ph)); });
					card.appendChild(img);
					card.appendChild(el('p', '', 'Photo ' + (ph ? photos.indexOf(ph) + 1 : fc.photo) + ', marked by ' + fc.markedBy));
					if (isPortrait) card.appendChild(el('p', '', 'Portrait'));
					else if (fc.canRemove) {
						var use = el('button', 'linkish', 'Use as portrait'); use.type = 'button';
						use.addEventListener('click', function () {
							capi('/people/' + pp.id + '/portrait', { method: 'PUT', body: { face: fc.id } }).then(render)
								.catch(function (ex) { use.textContent = ex.message; });
						});
						card.appendChild(use);
					}
					strip.appendChild(card);
				});
				wrap.appendChild(strip);
			}

			wrap.appendChild(el('h3', '', 'Photos'));
			var mine = d.photos.map(function (id) { return photos.filter(function (ph) { return ph.id === id; })[0]; }).filter(Boolean);
			if (!mine.length) {
				wrap.appendChild(el('p', 'muted', 'Not tagged in any photos yet. Open a photo and press + under “People in this photo”.'));
			} else {
				var grid = el('div', 'photos');
				grid.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
				mine.forEach(function (ph, i) {
					var b = el('button', 'photo'); b.type = 'button'; b.setAttribute('aria-label', 'Open photo ' + (i + 1) + ' of ' + mine.length);
					var img = el('img'); img.loading = 'lazy'; img.alt = ''; img.src = HLS + 'photos/' + ph.thumb; img.width = ph.w; img.height = ph.h;
					b.appendChild(img);
					b.addEventListener('click', function () { openPhoto(i, mine); });
					grid.appendChild(b);
				});
				wrap.appendChild(grid);
			}

			wrap.appendChild(el('h3', '', 'Videos'));
			if (!d.videos.length) {
				wrap.appendChild(el('p', 'muted', 'Not tagged in any videos yet. While watching, add an Event and tag ' + pp.name + ' with +.'));
			}
			d.videos.forEach(function (v) {
				var slug = v.target.replace(/^video:/, '');
				var e = entries.filter(function (x) { return x.slug === slug; })[0];
				var row = el('div', 'profile__video');
				if (e) row.appendChild(thumb(e)); else row.appendChild(el('div'));
				var info = el('div');
				info.appendChild(el('h4', '', e ? e.title : slug));
				if (e) info.appendChild(el('p', 'muted', e.longDate));
				var list = el('div', 'profile__moments');
				v.events.forEach(function (ev) {
					var m = el('button', 'moment'); m.type = 'button';
					m.appendChild(el('b', '', fmtDuration(ev.position * 1e7) || '0:00'));
					m.appendChild(el('span', '', ev.title));
					m.setAttribute('aria-label', 'Play ' + (e ? e.title : '') + ' from ' + (fmtDuration(ev.position * 1e7) || '0:00'));
					if (e && ready[e.slug]) m.addEventListener('click', function () { play(e, ev.position); });
					else m.disabled = true;
					list.appendChild(m);
				});
				info.appendChild(list);
				row.appendChild(info);
				wrap.appendChild(row);
			});
			if ((d.clips || []).length) {
				wrap.appendChild(el('h3', '', 'Clips'));
				var cg = el('div', 'gallery clips');
				d.clips.forEach(function (c) { cg.appendChild(clipCard(c)); });
				wrap.appendChild(cg);
			}
			wrap.appendChild(el('h3', '', 'Memories'));
			if (!(d.memories || []).length) {
				wrap.appendChild(el('p', 'muted', 'Not tagged in any memories yet. When writing a memory, tag ' + pp.name + ' under “Who it’s about”.'));
			} else {
				var ml = el('ul', 'profile__memories');
				d.memories.forEach(function (m) {
					var li = el('li'), b = el('button', 'linkish-row'); b.type = 'button';
					b.append(icon(memoryIcon(m)), el('span', '', m.title), el('small', 'muted', kindLabel(m) + ' by ' + m.author));
					b.addEventListener('click', function () { openMemory(m.id); });
					li.appendChild(b); ml.appendChild(li);
				});
				wrap.appendChild(ml);
			}
		}).catch(function (ex) { status.textContent = ex.message; });
	}

	// ── Memories: long-form articles and PDF notes, tagged to recordings and photos.
	// An article's text uses a little formatting: blank line = new paragraph, "## " heading,
	// "- " list, "> " quote, **bold**, *italic*. It's turned into elements here, never HTML.
	var memoryId = null, memoryDraft = null, memoryComments = null;
	function openMemory(id) {
		memoryId = id; view = 'memory';
		try { history.replaceState(null, '', '#memory/' + id); } catch (e) {}
		render(); $('content').scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	function closeMemory() {
		memoryId = null; memoryDraft = null; view = 'memories';
		try { history.replaceState(null, '', location.pathname); } catch (e) {}
		render();
	}
	window.addEventListener('hashchange', function () {
		var m = /^#memory\/(\d+)$/.exec(location.hash);
		if (m && session && !$('library-view').hidden && Number(m[1]) !== memoryId) openMemory(Number(m[1]));
	});
	function editMemory(draft) {
		memoryDraft = draft; view = 'memory-edit';
		try { history.replaceState(null, '', location.pathname); } catch (e) {}
		render(); $('content').scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	function inline(parent, text) {
		// **bold** and *italic*; everything else is plain text
		var re = /(\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*)/g, last = 0, m;
		while ((m = re.exec(text))) {
			if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
			parent.appendChild(el(m[2] ? 'strong' : 'em', '', m[2] || m[3]));
			last = re.lastIndex;
		}
		if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
	}
	function renderText(body) {
		var out = el('div', 'memory__body');
		String(body || '').replace(/\r/g, '').split(/\n\s*\n/).forEach(function (block) {
			var lines = block.split('\n').filter(function (l) { return l.trim(); });
			if (!lines.length) return;
			if (/^##\s/.test(lines[0]) && lines.length === 1) { var h = el(/^###\s/.test(lines[0]) ? 'h4' : 'h3'); inline(h, lines[0].replace(/^#+\s*/, '')); out.appendChild(h); return; }
			if (lines.every(function (l) { return /^\s*[-*]\s+/.test(l); })) {
				var ul = el('ul'); lines.forEach(function (l) { var li = el('li'); inline(li, l.replace(/^\s*[-*]\s+/, '')); ul.appendChild(li); }); out.appendChild(ul); return;
			}
			if (lines.every(function (l) { return /^\s*\d+[.)]\s+/.test(l); })) {
				var ol = el('ol'); lines.forEach(function (l) { var li = el('li'); inline(li, l.replace(/^\s*\d+[.)]\s+/, '')); ol.appendChild(li); }); out.appendChild(ol); return;
			}
			if (lines.every(function (l) { return /^>\s?/.test(l); })) { var q = el('blockquote'); inline(q, lines.map(function (l) { return l.replace(/^>\s?/, ''); }).join(' ')); out.appendChild(q); return; }
			var para = el('p');
			lines.forEach(function (l, i) { if (i) para.appendChild(el('br')); inline(para, l); });
			out.appendChild(para);
		});
		return out;
	}
	function entryBySlug(slug) { return entries.filter(function (e) { return e.slug === slug; })[0]; }
	function photoById(id) { return photos.filter(function (x) { return x.id === id; })[0]; }
	function tagLabel(l) {
		if (l.target.indexOf('video:') === 0) {
			var e = entryBySlug(l.target.slice(6));
			return { title: e ? e.title : 'A recording', sub: (e ? e.longDate : '') + (l.position != null ? ' · at ' + (fmtDuration(l.position * 1e7) || '0:00') : ''),
				pic: e && ready[e.slug] ? HLS + e.slug + '/thumb.jpg' : '' };
		}
		var ph = photoById(l.target.slice(6));
		return { title: ph ? 'Photo ' + (photos.indexOf(ph) + 1) : 'A photo (removed)', sub: '', pic: ph ? HLS + 'photos/' + ph.thumb : '' };
	}
	function openTag(l, links) {
		if (l.target.indexOf('video:') === 0) {
			var e = entryBySlug(l.target.slice(6));
			if (e && ready[e.slug]) play(e, l.position != null ? l.position : undefined);
			return;
		}
		// Open the photo among the memory's photos, so next/previous stay within them.
		var list = links.filter(function (x) { return x.target.indexOf('photo:') === 0; }).map(function (x) { return photoById(x.target.slice(6)); }).filter(Boolean);
		var ph = photoById(l.target.slice(6));
		if (ph) openPhoto(list.indexOf(ph), list);
	}
	function kindLabel(m) {
		return m.kind === 'notes' ? 'Notes (PDF)' : m.kind === 'recording' ? (m.media && m.media.kind === 'video' ? 'Video recording' : 'Voice recording') : 'Article';
	}

	function renderMemories(root) {
		var wrap = el('section', 'memories-view');
		var head = el('div', 'people__head'), intro = el('div');
		intro.appendChild(el('h2', '', 'Memories'));
		intro.appendChild(el('p', 'muted', 'Write down what you remember, tell it in your own voice or on video, or share your notes from that time as a PDF. Tag the recordings and photos it’s about: it shows up with them, and they show up with it.'));
		var acts = el('div', 'memories__actions');
		var write = el('button', 'btn', ''); write.type = 'button'; write.append(icon('pen-line'), document.createTextNode('Write a memory'));
		write.addEventListener('click', function () { editMemory({ kind: 'article', title: '', body: '', links: [] }); });
		var rec = el('button', 'btn btn--quiet', ''); rec.type = 'button'; rec.append(icon('mic'), document.createTextNode('Record a memory'));
		rec.addEventListener('click', function () { editMemory({ kind: 'recording', title: '', body: '', links: [] }); });
		var notes = el('button', 'btn btn--quiet', ''); notes.type = 'button'; notes.append(icon('file-text'), document.createTextNode('Share notes (PDF)'));
		notes.addEventListener('click', function () { editMemory({ kind: 'notes', title: '', body: '', links: [] }); });
		acts.append(write, rec, notes);
		head.append(intro, acts); wrap.appendChild(head);
		var status = el('p', 'muted', 'Loading…'); wrap.appendChild(status);
		root.appendChild(wrap);
		capi('/memories').then(function (list) {
			status.remove();
			if (!list.length) { wrap.appendChild(el('p', 'muted', 'No memories yet. Be the first to write one.')); return; }
			var ul = el('ul', 'memories__list');
			list.forEach(function (m) {
				var li = el('li'), b = el('button', 'memory-card'); b.type = 'button';
				var k = el('span', 'memory-card__kind'); k.append(icon(memoryIcon(m)),
					document.createTextNode(kindLabel(m) + ' · ' + m.author + ' · ' + fmtWhen(m.createdAt)));
				b.append(k, el('h3', '', m.title));
				if (m.excerpt) b.appendChild(el('p', '', m.excerpt.replace(/[#*>]/g, '').replace(/\s+/g, ' ')));
				var tags = el('span', 'memory-card__tags');
				m.links.slice(0, 6).forEach(function (l) { var t = el('span'), lab = tagLabel(l); if (lab.pic) t.style.backgroundImage = 'url("' + lab.pic + '")'; t.title = lab.title; tags.appendChild(t); });
				var extra = [];
				if (m.links.length) extra.push(plural(m.links.length, 'tag'));
				if (m.comments) extra.push(plural(m.comments, 'comment'));
				if (extra.length) tags.appendChild(el('small', 'muted', extra.join(' · ')));
				if (m.people.length) {
					var names = m.people.slice(0, 3).map(function (pp) { return pp.name; }).join(', ') + (m.people.length > 3 ? ' +' + (m.people.length - 3) : '');
					b.appendChild(el('p', 'memory-card__people', 'With ' + names));
				}
				b.appendChild(tags);
				b.addEventListener('click', function () { openMemory(m.id); });
				li.appendChild(b); ul.appendChild(li);
			});
			wrap.appendChild(ul);
		}).catch(function (ex) {
			// status may already be gone if drawing the list failed: show the problem anyway
			status.textContent = 'Couldn’t show the memories: ' + ex.message; wrap.appendChild(status);
		});
	}

	function renderMemory(root) {
		var wrap = el('article', 'memory');
		var back = el('button', 'btn btn--quiet profile__back', '← All memories'); back.type = 'button';
		back.addEventListener('click', closeMemory);
		wrap.appendChild(back);
		var status = el('p', 'muted', 'Loading…'); wrap.appendChild(status);
		root.appendChild(wrap);
		capi('/memories/' + memoryId).then(function (m) {
			status.remove();
			wrap.appendChild(el('h2', '', m.title));
			var meta = el('div', 'memory__meta');
			meta.append(icon(memoryIcon(m)),
				el('span', '', kindLabel(m) + ' by ' + m.author + ' · ' + fmtWhen(m.createdAt) + (m.updatedAt ? ' · edited' : '') +
					(m.media && m.media.duration ? ' · ' + (fmtDuration(Math.round(m.media.duration) * 1e7) || '0:00') : '')));
			if (m.canFeature) {
				var pin = iconButton('pin', m.featured ? 'Remove from Home' : 'Feature on Home');
				if (m.featured) pin.classList.add('is-armed');
				pin.addEventListener('click', function () {
					capi('/memories/' + m.id + '/feature', { method: 'PUT', body: { on: !m.featured } }).then(function (r) {
						m.featured = r.featured; pin.classList.toggle('is-armed', m.featured);
						pin.title = m.featured ? 'Remove from Home' : 'Feature on Home'; pin.setAttribute('aria-label', pin.title);
					});
				});
				meta.appendChild(pin);
			}
			if (m.canEdit) {
				var ed = iconButton('pencil', 'Edit');
				ed.addEventListener('click', function () { editMemory({ id: m.id, kind: m.kind, title: m.title, body: m.body, links: m.links.slice(), people: m.people.slice(), pdf: m.pdf }); });
				var del = iconButton('trash', 'Delete this memory');
				del.addEventListener('click', function () {
					if (!del.classList.contains('is-armed')) { del.classList.add('is-armed'); del.title = 'Click again to delete'; setTimeout(function () { del.classList.remove('is-armed'); del.title = 'Delete this memory'; }, 4000); return; }
					capi('/memories/' + m.id, { method: 'DELETE' }).then(closeMemory).catch(function (ex) { status.textContent = ex.message; wrap.insertBefore(status, wrap.children[1]); });
				});
				meta.append(ed, del);
			}
			wrap.appendChild(meta);
			if (m.people.length) {
				var who = el('div', 'memory__people'); who.setAttribute('aria-label', 'People in this memory');
				m.people.forEach(function (pp) {
					var c = el('button', 'chip-person', pp.name); c.type = 'button'; c.title = 'Open ' + pp.name + '’s page';
					c.addEventListener('click', function () { openPerson(pp.id); });
					who.appendChild(c);
				});
				wrap.appendChild(who);
			}
			if (m.media) wrap.appendChild(mediaBlock(m, function () { if (view === 'memory' && memoryId === m.id) render(); }));
			if (m.body) wrap.appendChild(renderText(m.body));
			if (m.pdf) wrap.appendChild(pdfPreview(m.pdf));
			wrap.appendChild(reactionBar('memory', m.id, m.reactions));
			if (m.links.length) {
				wrap.appendChild(el('h3', 'memory__section', 'Tagged recordings and photos'));
				var grid = el('div', 'memory__tagged');
				m.links.forEach(function (l) {
					var lab = tagLabel(l), b = el('button', 'memory__tag'), pic = el('span', 'pic'); b.type = 'button';
					if (lab.pic) pic.style.backgroundImage = 'url("' + lab.pic + '")';
					b.append(pic, el('b', '', lab.title));
					if (lab.sub) b.appendChild(el('small', '', lab.sub));
					b.addEventListener('click', function () { openTag(l, m.links); });
					grid.appendChild(b);
				});
				grid.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
				wrap.appendChild(grid);
			}
			memoryComments = el('div');
			wrap.appendChild(memoryComments);
			mountComments(memoryComments, commentsPanel('memory:' + m.id));
		}).catch(function (ex) { status.textContent = ex.message; });
	}

	// PDF preview with PDF.js (loaded on first use). Pages render as canvases when they
	// scroll near the screen; scripts in the PDF never run.
	var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/', pdfjsReady = null;
	function loadPdfJs() {
		if (!pdfjsReady) pdfjsReady = new Promise(function (ok, fail) {
			var sc = document.createElement('script'); sc.src = PDFJS + 'pdf.min.js';
			sc.integrity = 'sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e'; sc.crossOrigin = 'anonymous';
			sc.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(window.pdfjsLib); };
			sc.onerror = function () { pdfjsReady = null; fail(new Error('The PDF viewer couldn’t load. Check your connection and reload.')); };
			document.head.appendChild(sc);
		});
		return pdfjsReady;
	}
	function pdfPreview(url) {
		var box = el('div', 'memory__pdf'), status = el('p', 'muted', 'Loading the PDF…');
		box.appendChild(status);
		box.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
		loadPdfJs().then(function (lib) {
			return lib.getDocument({ url: url, withCredentials: true, isEvalSupported: false, enableXfa: false }).promise;
		}).then(function (doc) {
			status.textContent = plural(doc.numPages, 'page');
			var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
				es.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); en.target._draw(); } });
			}, { rootMargin: '600px 0px' }) : null;
			for (var n = 1; n <= doc.numPages; n++) (function (n) {
				var holder = el('div', 'memory__pdf-page'), canvas = el('canvas');
				canvas.setAttribute('aria-label', 'Page ' + n);
				holder.append(canvas, el('span', '', n + ' / ' + doc.numPages));
				box.appendChild(holder);
				holder._draw = function () {
					doc.getPage(n).then(function (pg) {
						var w = Math.max(320, box.clientWidth || 700), base = pg.getViewport({ scale: 1 });
						var vp = pg.getViewport({ scale: w / base.width * Math.min(2, window.devicePixelRatio || 1) });
						canvas.width = vp.width; canvas.height = vp.height;
						return pg.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
					}).catch(function () {});
				};
				if (io) io.observe(holder); else holder._draw();
			})(n);
		}).catch(function (ex) { status.textContent = ex && ex.message && /load|connection/.test(ex.message) ? ex.message : 'This PDF couldn’t be shown.'; });
		return box;
	}

	// Write or edit a memory. Draft: {id?, kind, title, body, links: [{target, position}], file?, pdf?}
	function renderMemoryEditor(root) {
		var d = memoryDraft, isNotes = d.kind === 'notes', isRec = d.kind === 'recording';
		var form = el('form', 'memory-edit'); form.noValidate = true;
		var back = el('button', 'btn btn--quiet profile__back', '← Cancel'); back.type = 'button';
		back.addEventListener('click', function () { if (d.id) openMemory(d.id); else closeMemory(); });
		form.append(back, el('h2', '', d.id ? 'Edit memory' : isNotes ? 'Share your notes' : isRec ? 'Record a memory' : 'Write a memory'));
		var nameInput = null;
		if (!me || !me.displayName) {
			var nl = el('div'), lab0 = el('label', '', 'Your name, as others will see it'); lab0.htmlFor = 'mem-name';
			nameInput = el('input', 'field'); nameInput.id = 'mem-name'; nameInput.maxLength = 60; nameInput.autocomplete = 'name';
			nl.append(lab0, nameInput); form.appendChild(nl);
		}
		var tl = el('div'), lab1 = el('label', '', 'Title'); lab1.htmlFor = 'mem-title';
		var title = el('input', 'field'); title.id = 'mem-title'; title.maxLength = 140; title.value = d.title || '';
		title.placeholder = isNotes ? 'For example, My diary from the Kodai trip' : isRec ? 'For example, What I remember about the picnic' : 'For example, The morning by the lake';
		title.addEventListener('input', function () { d.title = title.value; });
		tl.append(lab1, title); form.appendChild(tl);

		var rec = null;
		if (isRec && !d.id) {
			rec = recorder(function () {});
			leaveView = rec.destroy;
			var rl = el('div'); rl.append(el('label', '', 'Your recording'), rec.el); form.appendChild(rl);
		}

		if (isNotes && !d.id) {
			var pick = el('div', 'pdf-pick'), file = el('input'); file.type = 'file'; file.accept = 'application/pdf,.pdf'; file.hidden = true; file.id = 'mem-pdf';
			var choose = el('button', 'btn btn--quiet', ''); choose.type = 'button'; choose.append(icon('file-text'), document.createTextNode(d.file ? 'Choose another PDF' : 'Choose the PDF'));
			var pstat = el('span', 'muted', d.file ? (d.fileName || 'PDF') + ' added' : 'Up to 25 MB');
			choose.addEventListener('click', function () { file.click(); });
			file.addEventListener('change', function () {
				var f = file.files[0]; if (!f) return;
				if (f.size > 25 * 1024 * 1024) { pstat.textContent = 'That PDF is too large (25 MB at most).'; return; }
				choose.disabled = true; pstat.textContent = 'Uploading 0%';
				saveName().then(function () {
					return new Promise(function (ok, fail) {
						var x = new XMLHttpRequest(); x.open('POST', '/kodai1994/api/memory-files'); x.withCredentials = true;
						x.setRequestHeader('X-Kodai', '1'); x.setRequestHeader('Content-Type', 'application/pdf');
						x.upload.onprogress = function (ev) { if (ev.lengthComputable) pstat.textContent = 'Uploading ' + Math.round(ev.loaded / ev.total * 100) + '%'; };
						x.onload = function () { var r = {}; try { r = JSON.parse(x.responseText); } catch (e) {} if (x.status < 300) ok(r); else fail(new Error(r.error || 'The server answered ' + x.status + '.')); };
						x.onerror = function () { fail(new Error('The connection dropped. Try again.')); };
						x.send(f);
					});
				}).then(function (r) {
					d.file = r.file; d.fileName = f.name; d.pdf = '/kodai1994/memories/' + r.file;
					if (!title.value) { title.value = f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '); d.title = title.value; }
					pstat.textContent = f.name + ' added'; choose.disabled = false;
					var old = form.querySelector('.memory__pdf'); if (old) old.remove();
					pick.after(pdfPreview(d.pdf));
				}).catch(function (ex) { choose.disabled = false; pstat.textContent = ex.message; });
			});
			pick.append(choose, file, pstat);
			var pl = el('div'); pl.append(el('label', '', 'The PDF'), pick); form.appendChild(pl);
			if (d.pdf) form.appendChild(pdfPreview(d.pdf));
		}

		var bl = el('div', isNotes || isRec ? 'notes-body' : ''), lab2 = el('label', '', isNotes || isRec ? 'A note about it (optional)' : 'Your memory'); lab2.htmlFor = 'mem-body';
		var body = richEditor(d.body || '', isNotes ? 'What are these notes, and when did you write them?' : isRec ? 'Anything to add in writing: who’s speaking, when it was recorded…' : 'What happened, who was there, what do you remember most?',
			function (v) { d.body = v; });
		body.area.id = 'mem-body'; lab2.addEventListener('click', function () { body.focus(); });
		bl.append(lab2, body.el);
		form.appendChild(bl);

		// Tags: recordings (optionally at a moment) and photos
		d.people = d.people || [];
		var who = el('fieldset'); who.appendChild(el('legend', '', 'Who it’s about'));
		who.appendChild(el('p', 'hint', 'Tag the people in this memory. It will show on their page, and their names link to it.'));
		var pk = peoplePicker(d.people, function (list) { d.people = list.slice(); }, { label: null, empty: 'Press + to tag people.' });
		ensurePeople().catch(function () {});
		who.appendChild(pk.el);
		form.appendChild(who);
		var fs = el('fieldset'); fs.appendChild(el('legend', '', 'What it’s about'));
		fs.appendChild(el('p', 'hint', 'Tag the recordings and photos this is about. It will be listed with them, and readers can open them from here.'));
		var chips = el('div', 'tag-chips'); fs.appendChild(chips);
		function drawChips() {
			chips.textContent = '';
			if (!d.links.length) chips.appendChild(el('span', 'muted', 'Nothing tagged yet.'));
			d.links.forEach(function (l, i) {
				var lab = tagLabel(l), c = el('span', 'tag-chip'), pic = el('i'), x = el('button'); x.type = 'button';
				if (lab.pic) pic.style.backgroundImage = 'url("' + lab.pic + '")';
				x.setAttribute('aria-label', 'Untag ' + lab.title); x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' + ICONS.x + '</svg>';
				x.addEventListener('click', function () { d.links.splice(i, 1); drawChips(); drawPhotos(); });
				c.append(pic, document.createTextNode(lab.title + (lab.sub && l.position != null ? ' · ' + lab.sub.split(' · ').pop() : '')), x);
				chips.appendChild(c);
			});
		}
		var addRow = el('div', 'tag-add'), sel = recordingPicker(), at = el('input', 'field'), addBtn = el('button', 'btn btn--quiet', 'Tag recording');
		at.placeholder = 'at 12:30'; at.setAttribute('aria-label', 'Moment in the recording (optional)'); at.inputMode = 'numeric'; addBtn.type = 'button';
		addBtn.addEventListener('click', function () {
			if (!sel.value) { sel.open(); return; }
			var pos = at.value.trim() ? parseTime(at.value.replace(/^at\s*/i, '')) : null;
			if (at.value.trim() && pos == null) { at.setCustomValidity('Enter a time like 12:30 or 1:02:10.'); at.reportValidity(); return; }
			var target = 'video:' + sel.value;
			d.links = d.links.filter(function (l) { return l.target !== target; });
			d.links.push({ target: target, position: pos }); sel.clear(); at.value = ''; drawChips();
		});
		at.addEventListener('input', function () { at.setCustomValidity(''); });
		addRow.append(sel.el, at, addBtn); fs.appendChild(addRow);
		fs.appendChild(el('p', 'hint', 'Photos: tap to tag or untag.'));
		var grid = el('div', 'tag-photos'); fs.appendChild(grid);
		function drawPhotos() {
			grid.textContent = '';
			photos.forEach(function (ph, i) {
				var b = el('button'); b.type = 'button'; b.style.backgroundImage = 'url("' + HLS + 'photos/' + ph.thumb + '")';
				var target = 'photo:' + ph.id, on = d.links.some(function (l) { return l.target === target; });
				b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', 'Photo ' + (i + 1));
				b.addEventListener('click', function () {
					if (d.links.some(function (l) { return l.target === target; })) d.links = d.links.filter(function (l) { return l.target !== target; });
					else d.links.push({ target: target, position: null });
					drawChips(); drawPhotos();
				});
				grid.appendChild(b);
			});
		}
		drawChips(); drawPhotos();
		grid.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
		form.appendChild(fs);

		var err = el('p', 'error', ''), actions = el('div', 'form-actions');
		var save = el('button', 'btn', d.id ? 'Save changes' : isNotes ? 'Share notes' : isRec ? 'Share the recording' : 'Publish memory'); save.type = 'submit';
		actions.appendChild(save); form.append(err, actions);
		function saveName() {
			return nameInput && nameInput.value.trim()
				? capi('/me', { method: 'PUT', body: { displayName: nameInput.value } }).then(function (r) { if (me) me.displayName = r.displayName; })
				: Promise.resolve();
		}
		form.addEventListener('submit', function (ev) {
			ev.preventDefault(); err.textContent = '';
			if (nameInput && nameInput.value.trim().length < 2) { err.textContent = 'Enter your name, as others will see it.'; nameInput.focus(); return; }
			if (isNotes && !d.id && !d.file) { err.textContent = 'Choose the PDF first.'; return; }
			if (rec && !rec.value() && !d.media) { err.textContent = 'Record your memory, or choose a recording, first.'; return; }
			if (isRec && title.value.trim().length < 2) { err.textContent = 'Give it a title, at least 2 characters.'; title.focus(); return; }
			save.disabled = true;
			var links = d.links.map(function (l) { return { target: l.target, position: l.position }; });
			var peopleIds = d.people.map(function (pp) { return pp.id; });
			saveName().then(function () {
				// a recording goes up first (once: a retry after a failed save reuses it)
				if (!rec || d.media) return null;
				var label = save.textContent;
				return uploadRecording(rec.value(), function (f) { save.textContent = 'Sending ' + Math.round(f * 100) + '%'; })
					.then(function (r) { d.media = r.media; save.textContent = label; }, function (ex) { save.textContent = label; throw ex; });
			}).then(function () {
				return d.id
					? capi('/memories/' + d.id, { method: 'PUT', body: { title: title.value, body: body.value(), links: links, people: peopleIds } }).then(function () { return d.id; })
					: capi('/memories', { method: 'POST', body: { kind: d.kind, title: title.value, body: body.value(), file: d.file, media: d.media, links: links, people: peopleIds } }).then(function (r) { return r.id; });
			}).then(function (id) { memoryDraft = null; openMemory(id); })
				.catch(function (ex) { save.disabled = false; err.textContent = ex.message; });
		});
		root.appendChild(form);
		(nameInput || title).focus();
	}

	// Rich text for memories: bold, italic, bulleted and numbered lists, nothing more.
	// What's saved is the same light markup the reader shows (renderText): **bold**,
	// *italic*, "- " and "1. " lines, blank lines between paragraphs; never HTML. Older
	// memories' headings and quotes are kept as they were. Pasting brings in plain text.
	// Returns { el, area, value(), focus() }.
	var RT_ICONS = {
		bold: '<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
		italic: '<line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/>',
		list: '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
		'list-ordered': '<path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>'
	};
	function richEditor(markup, placeholder, onChange) {
		var root = el('div', 'rt');
		var bar = el('div', 'rt__bar'); bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Formatting');
		var area = el('div', 'rt__area'); area.contentEditable = 'true'; area.setAttribute('role', 'textbox'); area.setAttribute('aria-multiline', 'true');
		area.dataset.placeholder = placeholder;
		renderText(markup).childNodes.forEach(function (n) { area.appendChild(n.cloneNode(true)); });
		var tools = [['bold', 'Bold', 'bold', 'Ctrl+B'], ['italic', 'Italic', 'italic', 'Ctrl+I'],
			['insertUnorderedList', 'Bulleted list', 'list'], ['insertOrderedList', 'Numbered list', 'list-ordered']];
		var buttons = tools.map(function (t) {
			var b = el('button', 'rt__btn'); b.type = 'button'; b.title = t[1] + (t[3] ? ' (' + t[3] + ')' : '');
			b.setAttribute('aria-label', t[1]); b.setAttribute('aria-pressed', 'false');
			b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + RT_ICONS[t[2]] + '</svg>';
			b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });   // keep the selection
			b.addEventListener('click', function () { area.focus(); document.execCommand(t[0], false, null); changed(); });
			bar.appendChild(b); return b;
		});
		function paint() {
			if (!area.contains(document.getSelection().anchorNode)) return;
			tools.forEach(function (t, i) { var on = false; try { on = document.queryCommandState(t[0]); } catch (e) {} buttons[i].setAttribute('aria-pressed', String(on)); });
		}
		function changed() { paint(); if (onChange) onChange(value()); }
		document.addEventListener('selectionchange', paint);
		area.addEventListener('input', changed);
		area.addEventListener('paste', function (ev) {
			ev.preventDefault();
			var text = (ev.clipboardData || window.clipboardData).getData('text/plain');
			document.execCommand('insertText', false, text);
		});
		area.addEventListener('drop', function (ev) { ev.preventDefault(); });
		area.addEventListener('focus', function () { try { document.execCommand('defaultParagraphSeparator', false, 'p'); document.execCommand('styleWithCSS', false, false); } catch (e) {} });

		// DOM → markup
		function inlineOf(node) {
			var out = '';
			node.childNodes.forEach(function (c) {
				if (c.nodeType === 3) { out += c.nodeValue.replace(/\u00a0/g, ' '); return; }
				if (c.nodeType !== 1) return;
				var tag = c.tagName, inner = inlineOf(c);
				if (tag === 'BR') { out += '\n'; return; }
				var css = c.style || {};
				var bold = tag === 'B' || tag === 'STRONG' || /^(bold|[6-9]00)$/.test(css.fontWeight || '');
				var ital = tag === 'I' || tag === 'EM' || css.fontStyle === 'italic';
				var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner);   // keep spaces outside the marks
				if (!m[2]) { out += inner; return; }
				var t = m[2];
				if (ital) t = '*' + t + '*';
				if (bold) t = '**' + t + '**';
				out += m[1] + t + m[3];
			});
			return out;
		}
		// Browsers nest blocks unpredictably (a list inside a <p>, loose text before the first
		// paragraph), so walk the tree: block containers are entered, inline runs collected.
		var BLOCK = /^(P|DIV|UL|OL|LI|H[1-6]|BLOCKQUOTE)$/;
		function hasBlock(n) { return !!n.querySelector('p,div,ul,ol,h1,h2,h3,h4,h5,h6,blockquote'); }
		function value() {
			var blocks = [], para = '';
			function flush() { var t = para.replace(/^\n+|\n+$/g, '').replace(/[ \t]+\n/g, '\n').trim(); if (t) blocks.push(t); para = ''; }
			function walk(parent) {
				parent.childNodes.forEach(function (n) {
					if (n.nodeType === 3) { para += n.nodeValue; return; }
					if (n.nodeType !== 1) return;
					var tag = n.tagName;
					if (tag === 'BR') { para += '\n'; return; }
					if (tag === 'UL' || tag === 'OL') {
						flush();
						var lines = [];
						n.querySelectorAll(':scope > li').forEach(function (li, i) {
							var t = inlineOf(li).replace(/\s*\n\s*/g, ' ').trim();
							if (t) lines.push((tag === 'OL' ? (lines.length + 1) + '. ' : '- ') + t);
						});
						if (lines.length) blocks.push(lines.join('\n'));
						return;
					}
					if (tag === 'H3' || tag === 'H4') { flush(); blocks.push((tag === 'H3' ? '## ' : '### ') + inlineOf(n).trim()); return; }
					if (tag === 'BLOCKQUOTE') { flush(); blocks.push('> ' + inlineOf(n).replace(/\s*\n\s*/g, ' ').trim()); return; }
					if (BLOCK.test(tag)) { flush(); if (hasBlock(n)) walk(n); else para = inlineOf(n); flush(); return; }
					para += inlineOf(wrap(n));      // bold/italic/span run among loose text
				});
			}
			walk(area);
			flush();
			return blocks.join('\n\n').replace(/ /g, ' ').slice(0, 60000);
		}
		function wrap(n) { var w = document.createElement('span'); w.appendChild(n.cloneNode(true)); return w; }
		root.append(bar, area);
		return { el: root, area: area, value: value, focus: function () { area.focus(); } };
	}

	// Choose a recording: a button showing the choice, opening a searchable list with
	// thumbnails (the browser's own <select> list ignores the page's colours).
	// Returns { el, value, open(), clear() }.
	function recordingPicker() {
		var api = { value: '' }, root = el('div', 'rec-pick');
		var btn = el('button', 'rec-pick__btn'); btn.type = 'button'; btn.setAttribute('aria-haspopup', 'listbox');
		var panel = el('div', 'rec-pick__panel'); panel.hidden = true;
		var q = el('input', 'field'); q.placeholder = 'Search by date or title'; q.autocomplete = 'off'; q.setAttribute('aria-label', 'Search the recordings');
		var menu = el('ul', 'rec-pick__menu'); menu.setAttribute('role', 'listbox');
		panel.append(q, menu); root.append(btn, panel);
		var list = entries.filter(function (e) { return ready[e.slug]; }), shown = [], active = 0;
		function face(e) {
			btn.textContent = '';
			if (!e) { btn.appendChild(el('span', 'muted', 'Choose a recording…')); return; }
			var i = el('i'); i.style.backgroundImage = 'url("' + HLS + e.slug + '/thumb.jpg")';
			btn.append(i, el('span', '', e.longDate + ': ' + e.title));
		}
		function draw() {
			var k = nameKey(q.value);
			shown = list.filter(function (e) { return !k || nameKey(e.longDate + ' ' + e.title).indexOf(k) >= 0; });
			active = Math.min(active, Math.max(0, shown.length - 1));
			menu.textContent = '';
			if (!shown.length) menu.appendChild(el('li', 'is-empty', 'No recording matches “' + q.value + '”.'));
			shown.forEach(function (e, n) {
				var li = el('li'), i = el('i'), t = el('span');
				li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(n === active));
				i.style.backgroundImage = 'url("' + HLS + e.slug + '/thumb.jpg")';
				t.append(el('b', '', e.title), el('small', '', e.longDate));
				li.append(i, t);
				li.addEventListener('mousedown', function (ev) { ev.preventDefault(); choose(e); });
				menu.appendChild(li);
			});
		}
		function paint() {
			menu.querySelectorAll('[role=option]').forEach(function (li, n) { li.setAttribute('aria-selected', String(n === active)); if (n === active) li.scrollIntoView({ block: 'nearest' }); });
		}
		function choose(e) { api.value = e.slug; face(e); close(); btn.focus(); }
		function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
		api.open = function () { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); q.value = ''; active = 0; draw(); q.focus(); };
		api.clear = function () { api.value = ''; face(null); };
		btn.addEventListener('click', function () { if (panel.hidden) api.open(); else close(); });
		q.addEventListener('input', function () { active = 0; draw(); });
		q.addEventListener('keydown', function (ev) {
			if (ev.key === 'ArrowDown') { ev.preventDefault(); active = Math.min(active + 1, shown.length - 1); paint(); }
			else if (ev.key === 'ArrowUp') { ev.preventDefault(); active = Math.max(active - 1, 0); paint(); }
			else if (ev.key === 'Enter') { ev.preventDefault(); if (shown[active]) choose(shown[active]); }
			else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(); btn.focus(); }
		});
		q.addEventListener('blur', function () { setTimeout(function () { if (!root.contains(document.activeElement)) close(); }, 120); });
		face(null);
		api.el = root;
		return api;
	}

	// "Memories" in the player and photo viewer: what's tagged to this recording or photo.
	function memoriesSection(target, timeOf) {
		var sec = el('section', 'mem-side');
		sec.appendChild(el('h3', '', 'Memories'));
		var ul = el('ul'); sec.appendChild(ul);
		var write = el('button', 'btn btn--quiet', ''); write.type = 'button';
		write.append(icon('pen-line'), document.createTextNode(target.indexOf('video:') === 0 ? 'Write a memory about this recording' : 'Write a memory about this photo'));
		function startMemory(kind) {
			var pos = timeOf ? Math.floor(timeOf() || 0) : null;
			var link = { target: target, position: pos || null };
			if (target.indexOf('video:') === 0) closePlayer(); else closePhoto();
			editMemory({ kind: kind, title: '', body: '', links: [link] });
		}
		write.addEventListener('click', function () { startMemory('article'); });
		var say = el('button', 'btn btn--quiet', ''); say.type = 'button';
		say.append(icon('mic'), document.createTextNode('Record a memory'));
		say.addEventListener('click', function () { startMemory('recording'); });
		capi('/memories?target=' + encodeURIComponent(target)).then(function (list) {
			if (!list.length) ul.appendChild(el('li', 'muted', 'None yet.'));
			list.forEach(function (m) {
				var li = el('li'), b = el('button'); b.type = 'button';
				var txt = el('span'); txt.append(el('span', '', m.title), el('small', '', kindLabel(m) + ' by ' + m.author));
				b.append(icon(memoryIcon(m)), txt);
				b.addEventListener('click', function () {
					if (target.indexOf('video:') === 0) closePlayer(); else closePhoto();
					openMemory(m.id);
				});
				li.appendChild(b); ul.appendChild(li);
			});
		}).catch(function () { ul.appendChild(el('li', 'muted', 'Couldn’t load memories.')); });
		sec.append(write, say);
		return sec;
	}

	var leaveView = null;   // run when the view changes (the recorder lets go of the microphone and camera)
	function render() {
		if (leaveView) { leaveView(); leaveView = null; }
		var root = $('content'); root.textContent = '';
		var tab = view === 'person' ? 'people' : (view === 'memory' || view === 'memory-edit') ? 'memories' : view;
		document.querySelectorAll('.nav button[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === tab)); });
		$('hero').hidden = view !== 'home';
		if (view === 'person' && !personId) view = 'people';
		if (view === 'memory' && !memoryId) view = 'memories';
		if (view === 'memory-edit' && !memoryDraft) view = 'memories';
		if (memoryComments) { mountComments(memoryComments, null); memoryComments = null; }
		({ home: renderHome, videos: renderVideos, photos: renderPhotos, people: renderPeople, person: renderPerson,
			memories: renderMemories, memory: renderMemory, 'memory-edit': renderMemoryEditor })[view](root);
	}

	// ── Comments on a video ("video:<slug>") or photo ("photo:<id>")
	// opts.timeOf() → seconds into the video now; opts.seek(seconds) jumps there.
	function el(tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }
	// Lucide icons (lucide.dev, ISC licence), inlined: pencil, trash-2, file-text, pen-line, x.
	var ICONS = {
		'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
		'pen-line': '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
		x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
		pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
		pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
		trash: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
		mic: '<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
		video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
		upload: '<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
	};
	function memoryIcon(m) { return m.kind === 'notes' ? 'file-text' : m.kind === 'recording' ? (m.media && m.media.kind === 'video' ? 'video' : 'mic') : 'pen-line'; }

	// ── Recording a memory: the microphone (and camera) here in the browser, or a file from
	// the device. recorder() → { el, value() → {blob, mime, kind} | null, destroy() }.
	var REC_MAX_S = 600, REC_MAX_BYTES = 95 * 1024 * 1024;
	var REC_TYPES = { video: ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'], audio: ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'] };
	var FILE_TYPES = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', webm: 'video/webm', mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime' };
	function recorder(onChange) {
		var root = el('div', 'rec'), st = { blob: null, mime: '', kind: '', url: null, stream: null, mr: null, timer: null };
		var bar = el('div', 'rec__bar');
		function bigButton(cls, ic, text) { var b = el('button', cls); b.type = 'button'; b.append(icon(ic), document.createTextNode(text)); return b; }
		var voice = bigButton('btn', 'mic', 'Record your voice'), cam = bigButton('btn btn--quiet', 'video', 'Record a video'), pick = bigButton('btn btn--quiet', 'upload', 'Choose a recording');
		var file = el('input'); file.type = 'file'; file.accept = 'audio/*,video/*'; file.hidden = true;
		bar.append(voice, cam, pick, file);
		var live = el('div', 'rec__live'); live.hidden = true;
		var preview = el('video', 'rec__preview'); preview.muted = true; preview.playsInline = true; preview.autoplay = true; preview.setAttribute('playsinline', '');
		var row = el('div', 'rec__row'), dot = el('span', 'rec__dot'), clock = el('span', 'rec__clock', '0:00'), stop = el('button', 'btn', 'Stop'); stop.type = 'button';
		row.append(dot, clock, el('span', 'muted', 'of 10:00'), stop);
		live.append(preview, row);
		var done = el('div', 'rec__done'); done.hidden = true;
		var msg = el('p', 'hint', 'Up to 10 minutes. Like the recordings, it’s seen and heard by members only.');
		root.append(bar, live, done, msg);

		function say(text, isError) { msg.textContent = text; msg.className = isError ? 'error' : 'hint'; }
		function release() {
			if (st.stream) st.stream.getTracks().forEach(function (t) { t.stop(); });
			st.stream = null; clearInterval(st.timer); preview.srcObject = null;
		}
		function showDone() {
			live.hidden = true; bar.hidden = true; done.hidden = false; done.textContent = '';
			if (st.url) URL.revokeObjectURL(st.url);
			st.url = URL.createObjectURL(st.blob);
			var media = el(st.kind === 'video' ? 'video' : 'audio', 'rec__playback'); media.controls = true; media.src = st.url; media.preload = 'metadata';
			if (st.kind === 'video') media.playsInline = true;
			var again = el('button', 'linkish', 'Record or choose again'); again.type = 'button';
			again.addEventListener('click', function () { st.blob = null; done.hidden = true; bar.hidden = false; say('Up to 10 minutes. Like the recordings, it’s seen and heard by members only.'); onChange(null); });
			done.append(media, el('p', 'muted', (st.kind === 'video' ? 'Video' : 'Sound') + ' · ' + (st.blob.size / 1048576).toFixed(1) + ' MB. Play it back; if it’s right, give it a title and share it below.'), again);
			say('');
			onChange(st);
		}
		function start(kind) {
			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
				return say('This browser can’t record here. Record with your phone’s voice recorder or camera, then use “Choose a recording”.', true);
			}
			var mime = REC_TYPES[kind].filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0];
			if (!mime) return say('This browser can’t record ' + (kind === 'video' ? 'video' : 'sound') + ' here. Use “Choose a recording” instead.', true);
			say('Asking for the ' + (kind === 'video' ? 'camera and microphone' : 'microphone') + '…');
			navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: kind === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false })
				.then(function (stream) {
					st.stream = stream; st.kind = kind; st.mime = mime.split(';')[0];
					var chunks = [], mr = st.mr = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 96000, videoBitsPerSecond: 1000000 });
					mr.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
					mr.onstop = function () {
						release();
						if (!chunks.length) { bar.hidden = false; live.hidden = true; return say('Nothing was recorded. Try again.', true); }
						st.blob = new Blob(chunks, { type: st.mime }); showDone();
					};
					preview.hidden = kind !== 'video'; if (kind === 'video') preview.srcObject = stream;
					bar.hidden = true; live.hidden = false; say(kind === 'video' ? 'Recording. Look at the camera and tell your memory.' : 'Recording. Speak as you would to a friend.');
					var t0 = Date.now(); clock.textContent = '0:00';
					st.timer = setInterval(function () {
						var s = Math.floor((Date.now() - t0) / 1000);
						clock.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
						if (s >= REC_MAX_S && mr.state === 'recording') mr.stop();
					}, 250);
					mr.start(1000);
				})
				.catch(function (ex) {
					release();
					say(ex && ex.name === 'NotAllowedError' ? 'The browser wasn’t allowed to use the ' + (kind === 'video' ? 'camera and microphone' : 'microphone') + '. Allow it (the icon by the address), then try again.'
						: ex && ex.name === 'NotFoundError' ? 'No ' + (kind === 'video' ? 'camera' : 'microphone') + ' was found on this device.'
						: 'Recording couldn’t start: ' + (ex && ex.message || ex), true);
				});
		}
		voice.addEventListener('click', function () { start('audio'); });
		cam.addEventListener('click', function () { start('video'); });
		stop.addEventListener('click', function () { if (st.mr && st.mr.state === 'recording') st.mr.stop(); });
		pick.addEventListener('click', function () { file.click(); });
		file.addEventListener('change', function () {
			var f = file.files[0]; file.value = '';
			if (!f) return;
			var ext = (f.name.split('.').pop() || '').toLowerCase(), type = (f.type || FILE_TYPES[ext] || '').split(';')[0];
			if (type === 'audio/x-m4a') type = 'audio/mp4';
			if (!/^(audio|video)\//.test(type)) return say('That isn’t a sound or video recording.', true);
			if (f.size > REC_MAX_BYTES) return say('That recording is too large (95 MB at most). Choose a shorter one, or trim it first.', true);
			st.blob = f; st.mime = type; st.kind = type.indexOf('video/') === 0 ? 'video' : 'audio'; showDone();
		});
		return {
			el: root,
			value: function () { return st.blob ? { blob: st.blob, mime: st.mime, kind: st.kind } : null; },
			destroy: function () { if (st.mr && st.mr.state === 'recording') { st.mr.onstop = null; st.mr.stop(); } release(); if (st.url) URL.revokeObjectURL(st.url); }
		};
	}
	function uploadRecording(rec, onProgress) {
		return new Promise(function (ok, fail) {
			var x = new XMLHttpRequest(); x.open('POST', '/kodai1994/api/memory-media'); x.withCredentials = true;
			x.setRequestHeader('X-Kodai', '1'); x.setRequestHeader('Content-Type', rec.mime);
			x.upload.onprogress = function (ev) { if (ev.lengthComputable) onProgress(ev.loaded / ev.total); };
			x.onload = function () { var r = {}; try { r = JSON.parse(x.responseText); } catch (e) {} if (x.status < 300) ok(r); else fail(new Error(r.error || 'The server answered ' + x.status + '.')); };
			x.onerror = function () { fail(new Error('The connection dropped. Try again.')); };
			x.send(rec.blob);
		});
	}
	// A recording memory's recording, to play (or "being prepared", until it's ready)
	function mediaBlock(m, onReady) {
		var box = el('div', 'memory__media'), md = m.media;
		box.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
		if (!md) return box;
		if (md.status === 'ready') {
			var media = el(md.kind === 'video' ? 'video' : 'audio'); media.controls = true; media.preload = 'metadata'; media.src = md.src;
			media.setAttribute('controlslist', 'nodownload'); media.disablePictureInPicture = true;
			if (md.kind === 'video') { media.playsInline = true; if (md.poster) media.poster = md.poster; }
			box.appendChild(media);
		} else if (md.status === 'failed') {
			box.appendChild(el('p', 'error', md.message || 'This recording couldn’t be prepared.'));
		} else {
			box.appendChild(el('p', 'muted', 'The recording is being prepared. It’s usually ready within a minute or two.'));
			if (onReady) var poll = setInterval(function () {
				if (!box.isConnected) return clearInterval(poll);
				capi('/memories/' + m.id).then(function (fresh) { if (fresh.media && fresh.media.status !== 'pending') { clearInterval(poll); onReady(); } }).catch(function () {});
			}, 8000);
		}
		return box;
	}
	function icon(name) {
		var w = el('span', 'icon'); w.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>'; return w;
	}
	function iconButton(name, label) {
		var b = el('button', 'icon-btn'); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
		b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
		return b;
	}

	// 🙏 ❤️ 😊 under a memory or a comment: tap to add or take back yours
	var EMOJIS = [['🙏', 'Thank you'], ['❤️', 'Love'], ['😊', 'Smile']];
	function reactionBar(kind, id, data) {
		data = data || { counts: {}, mine: [] };
		var bar = el('div', 'reacts'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Reactions');
		function draw() {
			bar.textContent = '';
			EMOJIS.forEach(function (e) {
				var n = data.counts[e[0]] || 0, mine = data.mine.indexOf(e[0]) >= 0;
				var b = el('button', '', e[0]); b.type = 'button'; b.title = e[1];
				b.setAttribute('aria-pressed', String(mine)); b.setAttribute('aria-label', e[1] + (n ? ', ' + n : ''));
				if (n) b.appendChild(el('b', '', String(n)));
				b.addEventListener('click', function () {
					b.disabled = true;
					capi('/reactions', { method: 'POST', body: { kind: kind, id: id, emoji: e[0] } }).then(function (r) { data = r; draw(); })
						.catch(function () { b.disabled = false; });
				});
				bar.appendChild(b);
			});
		}
		draw();
		return bar;
	}
	function commentsPanel(target, opts) {
		opts = opts || {};
		var isVideo = target.indexOf('video:') === 0;
		var root = el('section', 'comments');
		root.appendChild(el('h3', 'comments__title', 'Comments'));
		var list = el('ol', 'comments__list'); root.appendChild(list);
		var empty = el('p', 'muted', target.indexOf('memory:') === 0 ? 'No comments yet. Add a thought, or something you remember too.'
			: 'No comments yet. Share a memory or a note about this ' + (isVideo ? 'recording.' : target.indexOf('clip:') === 0 ? 'clip.' : 'photo.'));
		empty.hidden = true; root.appendChild(empty);
		var status = el('p', 'muted', 'Loading comments…'); root.appendChild(status);

		var form = el('form', 'comments__form');
		var nameLabel, nameInput, nameHint;
		if (!me || !me.displayName) {
			nameLabel = el('label', '', 'Your name, as others will see it'); nameLabel.htmlFor = 'cn-' + target;
			nameInput = el('input', 'field'); nameInput.id = 'cn-' + target; nameInput.maxLength = 60; nameInput.required = true; nameInput.autocomplete = 'name';
			nameHint = el('p', 'hint', 'For example, Priya Sharma (Delhi). You can change it later under Account.');
			form.appendChild(nameLabel); form.appendChild(nameInput); form.appendChild(nameHint);
		}
		var label = el('label', '', 'Add a comment'); label.htmlFor = 'cb-' + target;
		var text = el('textarea', 'field'); text.id = 'cb-' + target; text.maxLength = 2000; text.required = true;
		form.appendChild(label); form.appendChild(text);
		var stamp, stampText;
		if (isVideo && opts.timeOf) {
			stamp = el('input'); stamp.type = 'checkbox'; stamp.checked = true;
			var stampLabel = el('label', 'check'); stampText = el('span');
			stampLabel.appendChild(stamp); stampLabel.appendChild(stampText); form.appendChild(stampLabel);
			var tick = function () { stampText.textContent = 'Link my comment to this moment (' + fmtDuration((opts.timeOf() || 0) * 1e7) + ')'; };
			tick(); root._tick = setInterval(tick, 1000);
		}
		var actions = el('div', 'form-actions'), post = el('button', 'btn', 'Post comment'); post.type = 'submit';
		actions.appendChild(post); form.appendChild(actions);
		var err = el('p', 'error'); err.setAttribute('role', 'alert'); form.appendChild(err);
		root.appendChild(form);

		function load() {
			return capi('/comments?target=' + encodeURIComponent(target)).then(function (items) {
				status.hidden = true; list.textContent = '';
				empty.hidden = items.length > 0;
				counts[target] = items.length;
				items.forEach(function (c) {
					var li = el('li', 'comment'), meta = el('div', 'comment__meta muted');
					meta.appendChild(el('strong', '', c.author));
					meta.appendChild(el('span', '', fmtWhen(c.createdAt)));
					if (c.position != null && opts.seek) {
						var chip = el('button', 'chip', 'at ' + fmtDuration(c.position * 1e7)); chip.type = 'button';
						chip.setAttribute('aria-label', 'Play from ' + fmtDuration(c.position * 1e7));
						chip.addEventListener('click', function () { opts.seek(c.position); });
						meta.appendChild(chip);
					}
					if (c.canDelete) {
						var del = el('button', 'linkish', 'Delete'); del.type = 'button';
						del.addEventListener('click', function () {
							if (del.dataset.armed !== '1') { del.dataset.armed = '1'; del.textContent = 'Delete this comment?'; setTimeout(function () { del.dataset.armed = ''; del.textContent = 'Delete'; }, 4000); return; }
							capi('/comments/' + c.id, { method: 'DELETE' }).then(load).catch(function (ex) { err.textContent = ex.message; });
						});
						meta.appendChild(del);
					}
					li.appendChild(meta);
					li.appendChild(el('p', 'comment__body', c.body));
					li.appendChild(reactionBar('comment', c.id, c.reactions));
					list.appendChild(li);
				});
			}).catch(function (ex) { status.hidden = false; status.textContent = ex.message; });
		}

		form.addEventListener('submit', function (ev) {
			ev.preventDefault();
			err.textContent = ''; post.disabled = true;
			var setName = nameInput ? capi('/me', { method: 'PUT', body: { displayName: nameInput.value } }).then(function (r) { if (me) me.displayName = r.displayName; }) : Promise.resolve();
			setName.then(function () {
				var body = { target: target, body: text.value };
				if (stamp && stamp.checked) body.position = Math.floor(opts.timeOf() || 0);
				return capi('/comments', { method: 'POST', body: body });
			}).then(function () {
				text.value = '';
				if (nameInput) { nameLabel.remove(); nameInput.remove(); nameHint.remove(); nameInput = null; }
				return load();
			}).catch(function (ex) { err.textContent = ex.message; })
			  .then(function () { post.disabled = false; });
		});

		load();
		return root;
	}
	function mountComments(slot, panel) {
		// The panel may sit inside a wrapper (photo viewer, player): stop every refresh timer.
		slot.querySelectorAll('.comments').forEach(function (c) { if (c._tick) clearInterval(c._tick); });
		slot.textContent = '';
		if (panel) slot.appendChild(panel);
	}

	// ── Account: display name, password, and (for the admin) access requests
	function refreshRequestBadge() {
		var badge = $('account-badge');
		if (!me || !me.isAdmin) { badge.hidden = true; return; }
		capi('/admin/requests').then(function (reqs) {
			badge.hidden = !reqs.length; badge.textContent = reqs.length;
			$('account-open').setAttribute('aria-label', reqs.length ? 'Account, ' + plural(reqs.length, 'access request') + ' waiting' : 'Account');
		}).catch(function () { badge.hidden = true; });
	}
	function renderRequests() {
		var box = $('requests-list');
		box.textContent = 'Loading…';
		capi('/admin/requests').then(function (reqs) {
			box.textContent = '';
			if (!reqs.length) { box.appendChild(el('p', 'muted', 'No requests waiting.')); }
			reqs.forEach(function (r) {
				var card = el('div', 'request');
				card.appendChild(el('strong', '', r.name));
				card.appendChild(el('p', 'muted', r.email + ', ' + fmtWhen(r.createdAt)));
				if (r.message) card.appendChild(el('p', '', r.message));
				var actions = el('div', 'form-actions');
				var yes = el('button', 'btn', 'Approve'), no = el('button', 'btn btn--quiet', 'Reject');
				yes.type = no.type = 'button';
				var msg = el('p', 'error'); msg.setAttribute('role', 'alert');
				yes.addEventListener('click', function () {
					yes.disabled = no.disabled = true;
					capi('/admin/requests/' + r.id + '/approve', { method: 'POST' }).then(function (made) {
						actions.remove();
						var text = 'Hello ' + made.name + ',\n\nYou can now watch the Kodai 1994 recordings.\n\nLink: ' + made.link + '\nUsername: ' + made.username + '\nPassword: ' + made.password;
						card.appendChild(el('p', 'ok', made.emailed
							? 'Approved. Their sign-in details were emailed to ' + made.username + '. A copy is below in case it doesn’t arrive; the password is shown only now.'
							: 'Approved. Email isn’t set up on the server, so send this to ' + made.name + ' yourself. The password is shown only now.'));
						var pre = el('pre', 'credentials', text); card.appendChild(pre);
						var copy = el('button', 'btn btn--quiet', 'Copy message'); copy.type = 'button';
						copy.addEventListener('click', function () {
							(navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { copy.textContent = 'Copied'; }, function () { copy.textContent = 'Select the text above and copy it'; });
						});
						card.appendChild(copy);
						refreshRequestBadge();
					}).catch(function (ex) { msg.textContent = ex.message; yes.disabled = no.disabled = false; });
				});
				no.addEventListener('click', function () {
					if (no.dataset.armed !== '1') { no.dataset.armed = '1'; no.textContent = 'Reject this request?'; setTimeout(function () { no.dataset.armed = ''; no.textContent = 'Reject'; }, 4000); return; }
					capi('/admin/requests/' + r.id + '/reject', { method: 'POST' }).then(function () { card.remove(); refreshRequestBadge(); })
						.catch(function (ex) { msg.textContent = ex.message; });
				});
				actions.appendChild(yes); actions.appendChild(no); card.appendChild(actions); card.appendChild(msg);
				box.appendChild(card);
			});
		}).catch(function (ex) { box.textContent = ex.message; });
	}
	// ── Recent actions (the audit log): moderators and the administrator
	var AUDIT_WORDS = {
		'signin': 'signed in', 'signin.fail': 'Wrong password for', 'request.approve': 'approved the access request of', 'request.reject': 'rejected the access request of',
		'moderator.add': 'made a moderator:', 'moderator.remove': 'is no longer a moderator:', 'comment.delete': 'removed their comment', 'comment.delete.other': 'removed a comment',
		'chapter.delete': 'removed their chapter', 'chapter.delete.other': 'removed a chapter', 'event.delete': 'removed their event', 'event.delete.other': 'removed an event',
		'clip.delete': 'removed their clip', 'clip.delete.other': 'removed a clip', 'memory.delete': 'removed their memory', 'memory.delete.other': 'removed a memory',
		'memory.feature.on': 'featured the memory', 'memory.feature.off': 'stopped featuring the memory', 'person.rename': 'renamed', 'person.delete': 'removed from People:',
		'person.detect.off': 'turned face finding off for', 'person.detect.on': 'turned face finding on for', 'person.unclaim.other': 'unlinked a member from',
		'photo.untag': 'untagged', 'face.unmark': 'unmarked the face of', 'photo.remove': 'removed their photo', 'photo.remove.other': 'removed a photo',
		'identify.clear': 'cleared the face marks on', 'identify.restore': 'restored the face marks on', 'identify.cancel.other': 'cancelled someone’s identification run',
		'sound.outdoor.add': 'marked an outdoor part in', 'sound.outdoor.delete': 'removed an outdoor part in', 'caption.edit': 'corrected a caption in',
		'caption.queue': 'asked for transcripts of', 'description.edit': 'changed the description of'
	};
	function auditTarget(t) {
		var info = targetInfo(t);
		return info ? (info.kind === 'photo' ? info.label : '“' + info.label + '”') : '';
	}
	function renderAudit(before) {
		var list = $('audit-list'), more = $('audit-more');
		if (!before) list.textContent = '';
		more.hidden = true;
		capi('/admin/audit?limit=40' + (before ? '&before=' + before : '')).then(function (r) {
			if (!r.items.length && !before) list.appendChild(el('li', 'muted', 'Nothing yet.'));
			r.items.forEach(function (a) {
				var li = el('li'), words = AUDIT_WORDS[a.action] || a.action;
				var actor = a.action === 'signin.fail' ? '' : (a.actor || 'A visitor') + ' ';
				var obj = a.action === 'signin.fail' ? (a.target || '').replace(/^user:/, '') : (a.detail || auditTarget(a.target));
				var where = a.detail && /^(video|photo):/.test(a.target || '') ? ' (' + auditTarget(a.target) + ')' : '';
				li.append(el('time', 'muted', fmtWhen(a.at)), document.createTextNode(' '), el('b', '', actor), document.createTextNode(words + (obj ? ' ' + obj : '') + where));
				li.title = new Date(a.at).toLocaleString('en-GB');
				list.appendChild(li);
			});
			if (r.more && r.items.length) { more.hidden = false; more.onclick = function () { renderAudit(r.items[r.items.length - 1].id); }; }
		}).catch(function (ex) { list.appendChild(el('li', 'error', ex.message)); });
	}
	// monitor.py's checks (every 5 minutes on the server)
	function renderSystem() {
		var list = $('system-list'); list.textContent = '';
		capi('/admin/status').then(function (s) {
			$('system-at').textContent = s.at ? 'Checked ' + fmtWhen(s.at) + '. Problems are emailed to the administrator.' : 'The monitor hasn’t run yet.';
			s.checks.forEach(function (c) {
				var li = el('li', c.ok ? '' : 'is-bad');
				li.append(el('b', '', c.ok ? '✓' : '!'), el('span', '', c.label + (c.ok ? '' : ': ' + c.detail + (c.since ? ' (since ' + fmtWhen(c.since) + ')' : ''))));
				if (c.ok) li.title = c.detail;
				list.appendChild(li);
			});
		}).catch(function (ex) { list.appendChild(el('li', 'error', ex.message)); });
	}
	function openAccount() {
		$('account-user').textContent = 'Signed in as ' + session.name;
		$('name-input').value = (me && me.displayName) || '';
		['name-ok', 'name-error', 'pw-ok', 'pw-error'].forEach(function (id) { $(id).textContent = ''; });
		$('requests').hidden = !(me && me.isAdmin);
		$('audit').hidden = $('system').hidden = !(me && me.isAdmin);
		if (me && me.isAdmin) { renderRequests(); renderAudit(); renderSystem(); }
		$('account').hidden = false;
		$('account-close').focus();
	}
	function closeAccount() { $('account').hidden = true; $('account-open').focus(); }
	$('account-open').addEventListener('click', openAccount);
	$('account-close').addEventListener('click', closeAccount);
	$('account').addEventListener('click', function (ev) { if (ev.target === $('account')) closeAccount(); });
	$('name-form').addEventListener('submit', function (ev) {
		ev.preventDefault(); $('name-ok').textContent = ''; $('name-error').textContent = '';
		capi('/me', { method: 'PUT', body: { displayName: $('name-input').value } }).then(function (r) {
			if (me) me.displayName = r.displayName;
			$('name-ok').textContent = 'Saved. Your comments now show “' + r.displayName + '”.';
		}).catch(function (ex) { $('name-error').textContent = ex.message; });
	});
	$('password-form').addEventListener('submit', function (ev) {
		ev.preventDefault(); $('pw-ok').textContent = ''; $('pw-error').textContent = '';
		if ($('pw-new').value !== $('pw-confirm').value) { $('pw-error').textContent = 'The two new passwords don’t match.'; return; }
		api('/Users/' + session.userId + '/Password', { method: 'POST', body: { CurrentPw: $('pw-current').value, NewPw: $('pw-new').value } })
			.then(function () { $('pw-ok').textContent = 'Password changed.'; $('password-form').reset(); })
			.catch(function (ex) { $('pw-error').textContent = /40[13]/.test(ex.message) ? 'The current password isn’t right.' : ex.message; });
	});

	// ── Request access (sign-in page)
	$('request-open').addEventListener('click', function () {
		$('request-form').hidden = false; $('request-open-row').hidden = true; $('req-name').focus();
	});
	$('request-form').addEventListener('submit', function (ev) {
		ev.preventDefault();
		var btn = $('req-btn'); btn.disabled = true; $('req-error').textContent = '';
		capi('/access-requests', { method: 'POST', body: { name: $('req-name').value, email: $('req-email').value, message: $('req-message').value, website: $('req-website').value } })
			.then(function () { $('request-form').hidden = true; $('request-done').hidden = false; })
			.catch(function (ex) { $('req-error').textContent = ex.message; })
			.then(function () { btn.disabled = false; });
	});

	// ── Zoom: scale + pan elements inside a clipping surface. Wheel zooms at the cursor (when
	// opts.wheel() says so), two fingers pinch, dragging pans when zoomed (when opts.pan() says so).
	function createZoom(targets, surface, opts) {
		opts = opts || {};
		var s = 1, tx = 0, ty = 0, MAX = opts.max || 6;
		var pointers = {}, pan = null, pinch = null, moved = false;
		function base() { var t = targets()[0]; return t ? { w: t.offsetWidth, h: t.offsetHeight } : { w: 1, h: 1 }; }
		function apply() {
			var b = base();
			if (s <= 1.001) { s = 1; tx = 0; ty = 0; }
			tx = Math.min(0, Math.max(b.w - s * b.w, tx)); ty = Math.min(0, Math.max(b.h - s * b.h, ty));
			targets().forEach(function (t) {
				t.style.transformOrigin = '0 0';
				t.style.transform = s === 1 ? '' : 'translate(' + tx + 'px, ' + ty + 'px) scale(' + s + ')';
			});
			surface().classList.toggle('is-zoomed', s > 1);
			if (opts.onChange) opts.onChange(s);
		}
		function zoomAt(f, cx, cy) {
			var t = targets()[0]; if (!t) return;
			var r = t.getBoundingClientRect(), ox = r.left - tx, oy = r.top - ty;   // untransformed origin
			var lx = (cx - ox - tx) / s, ly = (cy - oy - ty) / s;
			var s2 = Math.min(MAX, Math.max(1, s * f));
			tx = cx - ox - s2 * lx; ty = cy - oy - s2 * ly; s = s2; apply();
		}
		function zoomCenter(f) {
			var r = surface().getBoundingClientRect(), t = targets()[0];
			var tr = t ? t.getBoundingClientRect() : r;
			var cx = Math.max(r.left, tr.left) / 2 + Math.min(r.right, tr.right) / 2, cy = Math.max(r.top, tr.top) / 2 + Math.min(r.bottom, tr.bottom) / 2;
			zoomAt(f, cx, cy);
		}
		function reset() { s = 1; apply(); }
		function bind() {
			var el = surface();
			el.addEventListener('wheel', function (ev) {
				if (opts.wheel && !opts.wheel(ev)) return;
				ev.preventDefault(); zoomAt(Math.exp(-ev.deltaY * 0.0018), ev.clientX, ev.clientY);
			}, { passive: false });
			el.addEventListener('pointerdown', function (ev) {
				if (ev.target.closest('button, .face-pick, .vjs-control-bar, .vjs-big-play-button, .tagger')) return;
				pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
				var ids = Object.keys(pointers);
				if (ids.length === 2) {
					var a = pointers[ids[0]], b = pointers[ids[1]];
					pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: s }; pan = null; moved = true;
				} else if (s > 1 && (!opts.pan || opts.pan(ev))) {
					pan = { x: ev.clientX, y: ev.clientY }; moved = false; el.classList.add('is-panning');
					try { el.setPointerCapture(ev.pointerId); } catch (e) {}
				}
			});
			el.addEventListener('pointermove', function (ev) {
				if (!pointers[ev.pointerId]) return;
				pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
				var ids = Object.keys(pointers);
				if (pinch && ids.length === 2) {
					var a = pointers[ids[0]], b = pointers[ids[1]];
					var d = Math.hypot(a.x - b.x, a.y - b.y);
					zoomAt((pinch.s * d / pinch.d) / s, (a.x + b.x) / 2, (a.y + b.y) / 2);
				} else if (pan) {
					var dx = ev.clientX - pan.x, dy = ev.clientY - pan.y;
					if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
					tx += dx; ty += dy; pan = { x: ev.clientX, y: ev.clientY }; apply();
				}
			});
			var end = function (ev) {
				delete pointers[ev.pointerId];
				if (Object.keys(pointers).length < 2) pinch = null;
				if (pan) { pan = null; el.classList.remove('is-panning'); }
			};
			el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
			// a pan or pinch shouldn't also count as a click (e.g. Video.js play/pause)
			el.addEventListener('click', function (ev) { if (moved) { ev.stopPropagation(); ev.preventDefault(); moved = false; } }, true);
		}
		return { bind: bind, zoomIn: function () { zoomCenter(1.5); }, zoomOut: function () { zoomCenter(1 / 1.5); }, reset: reset,
			scale: function () { return s; }, refresh: apply };
	}
	function wireZoombar(bar, zoom) {
		bar.querySelector('[data-zoom=in]').addEventListener('click', zoom.zoomIn);
		bar.querySelector('[data-zoom=out]').addEventListener('click', zoom.zoomOut);
		bar.querySelector('[data-zoom=fit]').addEventListener('click', zoom.reset);
	}
	function showLevel(bar, s) { bar.querySelector('.zoombar__level').textContent = Math.round(s * 100) + '%'; }

	// ── 1994 portraits: paint a square crop around a marked face (box = fractions of the photo).
	function portraitInto(node, portrait) {
		if (!portrait) return false;
		var ph = photos.filter(function (x) { return x.id === portrait.photo; })[0];
		if (!ph) return false;
		var b = portrait.box, W = ph.w, H = ph.h;
		var side = Math.max(b.w * W, b.h * H) * 1.25;          // a little room around the face
		var sx = Math.min(side / W, 1), sy = Math.min(side / H, 1);
		var left = Math.max(0, Math.min(1 - sx, b.x + b.w / 2 - sx / 2));
		var top = Math.max(0, Math.min(1 - sy, b.y + b.h / 2 - sy / 2));
		node.classList.add('portrait');
		node.style.backgroundImage = 'url("' + HLS + 'photos/' + ph.thumb + '")';
		node.style.backgroundSize = (100 / sx) + '% ' + (100 / sy) + '%';
		node.style.backgroundPosition = (sx >= 1 ? 0 : left / (1 - sx) * 100) + '% ' + (sy >= 1 ? 0 : top / (1 - sy) * 100) + '%';
		return true;
	}

	// ── Photo viewer
	// The viewer steps through `viewerPhotos`: all photos, or one person's photos from a profile.
	var photoIndex = 0, lastFocus = null, viewerPhotos = [], photoTags = {};
	// Enhanced (Real-ESRGAN 2×, enhance-photos.sh) or the original; remembered per device.
	var QUALITY_KEY = 'yajur-kodai-photo-quality';
	var photoQuality = storeGet('localStorage', QUALITY_KEY) === 'original' ? 'original' : 'enhanced';
	// Enhanced copies exist only for the folder's photos (01-99): uploads never have one, so
	// don't ask. (A folder photo without one, e.g. replaced by a scan, falls back quietly.)
	function mayHaveEnhanced(ph) { return Number(ph.id) < 101; }
	function photoSrc(ph, q) { return (q || photoQuality) === 'enhanced' && mayHaveEnhanced(ph) ? HLS + 'photos-enhanced/' + ph.id + '.jpg' : HLS + 'photos/' + ph.src; }
	// Load a photo off-screen, then show it: while it loads the frame shows a spinner over
	// the dimmed previous photo (never the browser's broken-image icon). If the enhanced copy
	// is missing it falls back to the original; a load that finishes after the member has
	// moved on is ignored.
	var photoLoadSeq = 0;
	function loadViewerPhoto(ph, version) {
		var seq = ++photoLoadSeq, img = $('viewer-img'), frame = $('viewer-frame');
		var want = version === 'enhanced' && mayHaveEnhanced(ph) ? 'enhanced' : 'original';
		showQuality(mayHaveEnhanced(ph) ? true : false);
		frame.classList.add('is-loading'); frame.classList.remove('is-failed');
		function attempt(v) {
			var probe = new Image();
			probe.onload = function () {
				if (seq !== photoLoadSeq) return;
				img.dataset.version = v; img.src = probe.src;
				frame.classList.remove('is-loading');
			};
			probe.onerror = function () {
				if (seq !== photoLoadSeq) return;
				if (v === 'enhanced') { showQuality(false); attempt('original'); return; }
				frame.classList.remove('is-loading'); frame.classList.add('is-failed');
				img.removeAttribute('src');
			};
			probe.src = photoSrc(ph, v);
		}
		attempt(want);
	}
	function showQuality(hasEnhanced) {
		$('viewer-quality').querySelectorAll('button').forEach(function (b) {
			var q = b.dataset.quality, effective = hasEnhanced === false ? 'original' : photoQuality;
			b.setAttribute('aria-pressed', String(q === effective));
			if (q === 'enhanced') { b.disabled = hasEnhanced === false; b.title = b.disabled ? 'No enhanced version of this photo yet' : 'AI-upscaled 2× (Real-ESRGAN). Sharper; no facial detail is invented.'; }
		});
	}
	function loadPhotoTags() {
		return capi('/photo-tags').then(function (t) { photoTags = t || {}; return photoTags; }).catch(function () { return photoTags; });
	}
	function photoPeopleSection(photoId) {
		var box = el('section', 'photo-people');
		box.appendChild(el('h3', '', 'People in this photo'));
		var tags = (photoTags[photoId] || []).slice();
		var byPerson = {};
		tags.forEach(function (t) { byPerson[t.personId] = t; });
		var pk = peoplePicker(tags.map(function (t) { return { id: t.personId, name: t.name }; }), null, {
			label: null,
			empty: 'Nobody is tagged yet. Press + to tag the people you recognise.',
			canRemove: function (pp) { return !byPerson[pp.id] || byPerson[pp.id].canRemove; },
			onAdd: function (pp) {
				return capi('/photo-tags', { method: 'POST', body: { photo: photoId, person: pp.id } }).then(function (r) {
					var t = { tagId: r.tagId, personId: pp.id, name: pp.name, canRemove: true };
					byPerson[pp.id] = t; (photoTags[photoId] = photoTags[photoId] || []).push(t);
				});
			},
			onRemove: function (pp) {
				var t = byPerson[pp.id];
				return capi('/photo-tags/' + t.tagId, { method: 'DELETE' }).then(function () {
					delete byPerson[pp.id];
					photoTags[photoId] = (photoTags[photoId] || []).filter(function (x) { return x.personId !== pp.id; });
				});
			}
		});
		box.appendChild(pk.el);
		return box;
	}
	function showPhoto(i) {
		var list = viewerPhotos, n = list.length;
		photoIndex = (i + n) % n;
		layer.textContent = ''; facesHere = [];
		document.querySelectorAll('#viewer-frame .face-pick, #viewer-frame .faces-hint').forEach(function (n) { n.remove(); });
		photoZoom.reset();
		var img = $('viewer-img'), ph = list[photoIndex];
		loadViewerPhoto(ph, photoQuality);
		$('viewer-count').textContent = 'Photo ' + (photoIndex + 1) + ' of ' + n + (isHires(ph) ? ' · High res, ' + origSize(ph) + ' original' : '');
		var side = el('div'), up = uploadsByPhoto[list[photoIndex].id];
		if (up) {
			var added = el('p', 'photo-added muted', 'Added by ' + up.uploadedBy + ' · ' + fmtWhen(up.createdAt));
			if (up.canRemove) {
				var rm = el('button', 'btn btn--quiet', 'Remove photo'); rm.type = 'button';
				rm.addEventListener('click', function () {
					if (rm.dataset.sure !== '1') { rm.dataset.sure = '1'; rm.textContent = 'Remove it for everyone?'; return; }
					rm.disabled = true;
					capi('/photo-uploads/' + up.id, { method: 'DELETE' }).then(function () {
						photos = photos.filter(function (x) { return x.id !== up.photoId; });
						closePhoto(); reloadPhotos().then(render);
					}).catch(function (e) { rm.disabled = false; rm.textContent = e.message; });
				});
				added.appendChild(rm);
			}
			side.appendChild(added);
		}
		side.appendChild(photoPeopleSection(list[photoIndex].id));
		side.appendChild(memoriesSection('photo:' + list[photoIndex].id));
		side.appendChild(commentsPanel('photo:' + list[photoIndex].id));
		mountComments($('viewer-comments'), side);
		var mark = $('viewer-mark');
		mark.style.top = (8 + Math.random() * 76) + '%'; mark.style.left = (6 + Math.random() * 58) + '%';
		[photoIndex + 1, photoIndex - 1].forEach(function (k) { new Image().src = photoSrc(list[(k + n) % n]); });
	}
	// Marking faces: toggle "Mark faces", drag a box around a face, pick who it is.
	var marking = false, facesHere = [], foundHere = [];
	var SHOW_KEY = 'kodai-faces-show', faceShow = /^(hand|found|both)$/.test(storeGet('localStorage', SHOW_KEY) || '') ? storeGet('localStorage', SHOW_KEY) : 'both';
	var layer = $('viewer-faces-layer');
	function currentPhotoId() { return viewerPhotos[photoIndex] && viewerPhotos[photoIndex].id; }
	function placeLayer() {
		var img = $('viewer-img');
		if (!img.naturalWidth) return;
		// offsetLeft/Width ignore the zoom transform, so the layer matches the unzoomed photo
		layer.style.left = img.offsetLeft + 'px'; layer.style.top = img.offsetTop + 'px';
		layer.style.width = img.offsetWidth + 'px'; layer.style.height = img.offsetHeight + 'px';
		photoZoom.refresh();
	}
	function drawFaces() {
		layer.textContent = '';
		$('viewer-show').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.show === faceShow)); });
		if (faceShow !== 'hand') foundHere.forEach(function (s) {
			// what identification found: dashed, with its guess or answer; review it on the Identify page
			var box = el('div', 'face face--found' + (s.status === 'pending' ? '' : ' is-done'));
			box.style.left = s.box.x * 100 + '%'; box.style.top = s.box.y * 100 + '%';
			box.style.width = s.box.w * 100 + '%'; box.style.height = s.box.h * 100 + '%';
			var gid = s.status === 'confirmed' ? s.finalPersonId : s.personId, guess = (people || []).filter(function (pp) { return pp.id === gid; })[0];
			var text = s.status === 'confirmed' ? (guess ? guess.name : 'Confirmed') : s.status === 'rejected' ? 'Skipped' : guess ? guess.name + '?' : 'Unknown';
			var label = el('a', 'face__label', text);
			label.href = 'identify.html#photo/' + currentPhotoId(); label.title = 'Review on the Identify page';
			label.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
			box.appendChild(label); layer.appendChild(box);
		});
		if (faceShow !== 'found') facesHere.forEach(function (fc) {
			var box = el('div', 'face');
			box.style.left = fc.box.x * 100 + '%'; box.style.top = fc.box.y * 100 + '%';
			box.style.width = fc.box.w * 100 + '%'; box.style.height = fc.box.h * 100 + '%';
			var label = el('span', 'face__label'); label.appendChild(document.createTextNode(fc.name));
			if (fc.canRemove) {
				var x = el('button', '', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Unmark ' + fc.name);
				x.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
				x.addEventListener('click', function (ev) {
					ev.stopPropagation();
					capi('/photo-faces/' + fc.id, { method: 'DELETE' }).then(loadFaces).catch(function (e) { hint(e.message); });
				});
				label.appendChild(x);
			}
			box.appendChild(label); layer.appendChild(box);
		});
		if (marking && !facesHere.length) hint('Drag a box around a face, then choose who it is.');
	}
	var hintTimer = null;
	function hint(text) {
		var frame = $('viewer-frame');
		var h = frame.querySelector('.faces-hint') || frame.appendChild(el('div', 'faces-hint'));
		h.textContent = text; clearTimeout(hintTimer);
		hintTimer = setTimeout(function () { if (h.parentNode) h.remove(); }, 4000);
	}
	function loadFaces() {
		var id = currentPhotoId();
		if (!marking || !id) return Promise.resolve();
		return Promise.all([capi('/photo-faces?photo=' + id),
			capi('/identify/suggestions?target=photo:' + id).catch(function () { return { suggestions: [] }; })]).then(function (res) {
			if (id !== currentPhotoId()) return;
			facesHere = res[0];
			foundHere = res[1].suggestions.filter(function (s) { return s.kind !== 'check' && !s.byHand; });  // those boxes are hand marks
			drawFaces();
		}).catch(function (e) { hint(e.message); });
	}
	function setMarking(on) {
		marking = on;
		$('viewer-faces').setAttribute('aria-pressed', String(on));
		layer.hidden = !on; layer.classList.toggle('is-marking', on && tool === 'draw'); layer.classList.toggle('is-moving', on && tool === 'move');
		$('viewer-tool').hidden = !on; $('viewer-show').hidden = !on;
		if (on) { placeLayer(); ensurePeople().catch(function () {}); loadFaces(); }
		else { layer.textContent = ''; document.querySelectorAll('#viewer-frame .face-pick, #viewer-frame .faces-hint').forEach(function (n) { n.remove(); }); }
	}
	$('viewer-faces').addEventListener('click', function () { setMarking(!marking); });
	$('viewer-show').querySelectorAll('button').forEach(function (b) {
		b.addEventListener('click', function () { faceShow = b.dataset.show; storeSet('localStorage', SHOW_KEY, faceShow); drawFaces(); });
	});
	$('viewer-quality').querySelectorAll('button').forEach(function (b) {
		b.addEventListener('click', function () {
			if (b.disabled || b.dataset.quality === photoQuality) return;
			photoQuality = b.dataset.quality; storeSet('localStorage', QUALITY_KEY, photoQuality);
			var ph = viewerPhotos[photoIndex];
			if (!ph) return;
			loadViewerPhoto(ph, photoQuality);
		});
	});
	$('viewer-img').addEventListener('load', function () { if (marking) { placeLayer(); loadFaces(); } });
	window.addEventListener('resize', function () { if (marking) placeLayer(); });

	var drag = null;
	layer.addEventListener('pointerdown', function (ev) {
		if (!marking || tool === 'move' || ev.target.closest('.face-pick')) return;
		var r = layer.getBoundingClientRect();
		document.querySelectorAll('#viewer-frame .face.is-draft, #viewer-frame .face-pick').forEach(function (n) { n.remove(); });
		drag = { x0: (ev.clientX - r.left) / r.width, y0: (ev.clientY - r.top) / r.height, el: el('div', 'face is-draft') };
		layer.appendChild(drag.el); layer.setPointerCapture(ev.pointerId); ev.preventDefault();
	});
	layer.addEventListener('pointermove', function (ev) {
		if (!drag) return;
		var r = layer.getBoundingClientRect();
		var x1 = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), y1 = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height));
		drag.box = { x: Math.min(drag.x0, x1), y: Math.min(drag.y0, y1), w: Math.abs(x1 - drag.x0), h: Math.abs(y1 - drag.y0) };
		drag.el.style.left = drag.box.x * 100 + '%'; drag.el.style.top = drag.box.y * 100 + '%';
		drag.el.style.width = drag.box.w * 100 + '%'; drag.el.style.height = drag.box.h * 100 + '%';
	});
	layer.addEventListener('pointerup', function () {
		if (!drag) return;
		var d = drag; drag = null;
		if (!d.box || d.box.w < 0.012 || d.box.h < 0.012) { d.el.remove(); return; }
		var photoId = currentPhotoId();
		var pick = el('div', 'face-pick');
		pick.appendChild(el('p', '', 'Whose face is this?'));
		var cancel = el('button', 'linkish', 'Cancel'); cancel.type = 'button';
		var pk = peoplePicker([], null, { label: null, empty: ' ', onAdd: function (pp) {
			return capi('/photo-faces', { method: 'POST', body: { photo: photoId, person: pp.id, box: d.box } }).then(function () {
				pick.remove(); d.el.remove();
				return Promise.all([loadFaces(), loadPhotoTags()]).then(function () {
					// refresh "People in this photo" with the new tag
					var side = el('div');
					side.appendChild(photoPeopleSection(photoId));
					side.appendChild(commentsPanel('photo:' + photoId));
					mountComments($('viewer-comments'), side);
					hint(pp.name + '’s face is marked.');
				});
			});
		} });
		pick.appendChild(pk.el); pick.appendChild(cancel);
		cancel.addEventListener('click', function () { pick.remove(); d.el.remove(); });
		pick.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
		// on the frame (so it isn't zoomed), just below the box, kept inside the frame
		var frame = $('viewer-frame'), fr = frame.getBoundingClientRect(), br = d.el.getBoundingClientRect();
		pick.style.left = Math.max(8, Math.min(fr.width - 288, br.left - fr.left)) + 'px';
		pick.style.top = Math.max(8, Math.min(fr.height - 120, br.bottom - fr.top + 8)) + 'px';
		frame.appendChild(pick);
		pk.focus();
	});

	// Photo zoom: the image and the faces layer scale together, so boxes stay on the faces and
	// a box drawn while zoomed is saved at the right place on the full photo.
	var tool = 'draw';
	var photoZoom = createZoom(function () { return [$('viewer-img'), layer]; }, function () { return $('viewer-frame'); }, {
		wheel: function () { return true; },
		pan: function () { return !marking || tool === 'move'; },
		onChange: function (sc) { showLevel($('viewer-zoom'), sc); layer.style.setProperty('--zs', String(1 / sc)); }
	});
	photoZoom.bind(); wireZoombar($('viewer-zoom'), photoZoom);
	$('viewer-tool').querySelectorAll('button').forEach(function (b) {
		b.addEventListener('click', function () {
			tool = b.dataset.tool;
			$('viewer-tool').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
			layer.classList.toggle('is-marking', tool === 'draw'); layer.classList.toggle('is-moving', tool === 'move');
		});
	});

	function openPhoto(i, list) {
		viewerPhotos = list || photos;
		lastFocus = document.activeElement;
		ensurePeople().catch(function () {});
		$('viewer-mark').textContent = session.name + ' · ' + new Date().toLocaleDateString('en-GB');
		showPhoto(i);
		$('viewer').hidden = false;
		document.body.style.overflow = 'hidden';
		$('viewer-close').focus();
	}
	function closePhoto() {
		setMarking(false);
		$('viewer').hidden = true; $('viewer-img').removeAttribute('src');
		mountComments($('viewer-comments'), null);
		if (view === 'photos' || view === 'person') render(); // refresh counts and tags
		document.body.style.overflow = '';
		if (lastFocus) lastFocus.focus();
	}
	$('viewer-prev').addEventListener('click', function () { showPhoto(photoIndex - 1); });
	$('viewer-next').addEventListener('click', function () { showPhoto(photoIndex + 1); });
	$('viewer-close').addEventListener('click', closePhoto);
	$('viewer-frame').addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
	$('viewer-img').addEventListener('dragstart', function (ev) { ev.preventDefault(); });
	var touchX = null;
	$('viewer-frame').addEventListener('touchstart', function (ev) { touchX = (marking || photoZoom.scale() > 1 || ev.touches.length > 1) ? null : ev.touches[0].clientX; }, { passive: true });
	$('viewer-frame').addEventListener('touchend', function (ev) {
		if (touchX === null) return;
		var dx = ev.changedTouches[0].clientX - touchX; touchX = null;
		if (Math.abs(dx) > 40) showPhoto(photoIndex + (dx < 0 ? 1 : -1));
	});
	// ── Notifications: the bell
	var notifItems = [];
	function notifText(n) {
		var t = targetInfo(n.target), where = t ? (t.kind === 'video' ? t.label + (n.position != null ? ' at ' + at(n.position) : '') : t.kind === 'photo' ? t.label : '') : '';
		var clip = n.clipTitle ? 'the clip “' + n.clipTitle + '”' : 'a clip';
		switch (n.kind) {
		case 'comment_on_memory': return n.actor + ' commented on your ' + (t && t.kind === 'clip' ? clip.replace(/^the /, '') : 'memory “' + (n.memoryTitle || '') + '”');
		case 'comment_thread': return n.actor + ' also commented on ' + (n.memoryTitle ? 'the memory “' + n.memoryTitle + '”' : t && t.kind === 'clip' ? clip : where || 'something you commented on');
		case 'tagged_clip': return n.actor + ' tagged you in ' + clip;
		case 'reaction':
			var d = (n.detail || '').split(':');
			return n.actor + ' reacted ' + (d[1] || '') + ' to your ' + (d[0] === 'memory' ? 'memory' + (n.memoryTitle ? ' “' + n.memoryTitle + '”' : '')
				: d[0] === 'clip' ? clip.replace(/^the /, '') : 'comment' + (where ? ' on ' + where : ''));
		case 'tagged_memory': return n.actor + ' tagged you in the memory “' + (n.detail || n.memoryTitle || '') + '”';
		case 'tagged_event': return n.actor + ' tagged you in ' + (where || 'a recording');
		case 'tagged_photo': return n.actor + ' tagged you in ' + (where || 'a photo');
		}
		return n.actor + ' did something';
	}
	function openNotif(n) {
		closeNotifs();
		if (n.target && n.target.indexOf('memory:') === 0) return openMemory(Number(n.target.slice(7)));
		openTarget(targetInfo(n.target), n.position);
	}
	function loadNotifs() {
		return capi('/notifications').then(function (r) {
			notifItems = r.items;
			$('bell-count').hidden = !r.unread; $('bell-count').textContent = r.unread > 99 ? '99+' : String(r.unread);
			$('bell').setAttribute('aria-label', 'Notifications' + (r.unread ? ', ' + r.unread + ' new' : ''));
			drawNotifs();
		}).catch(function () {});
	}
	function drawNotifs() {
		var ul = $('notif-list'); ul.textContent = '';
		if (!notifItems.length) { ul.appendChild(el('li', 'notif__empty', 'Nothing yet. When someone comments on your memories, reacts to them, or tags you, it shows up here. Link yourself to your 1994 self on the People page to hear when you’re tagged.')); return; }
		notifItems.forEach(function (n) {
			var li = el('li', n.read ? '' : 'is-unread'), b = el('button'); b.type = 'button';
			b.append(avatar(n.actor), el('p', '', notifText(n)), el('small', '', fmtWhen(n.at)));
			b.addEventListener('click', function () { openNotif(n); });
			li.appendChild(b); ul.appendChild(li);
		});
	}
	function closeNotifs() { $('notif-panel').hidden = true; $('bell').setAttribute('aria-expanded', 'false'); }
	$('bell').addEventListener('click', function (ev) {
		ev.stopPropagation();
		var open = $('notif-panel').hidden;
		$('notif-panel').hidden = !open; $('bell').setAttribute('aria-expanded', String(open));
		if (open) {
			loadNotifs().then(function () {
				// they've been seen: clear the count after a moment (the dots stay until the next open)
				if (notifItems.some(function (n) { return !n.read; }))
					setTimeout(function () { capi('/notifications/read', { method: 'POST', body: {} }).then(function () { $('bell-count').hidden = true; notifItems.forEach(function (n) { n.read = true; }); }); }, 1500);
			});
		}
	});
	$('notif-readall').addEventListener('click', function () { capi('/notifications/read', { method: 'POST', body: {} }).then(loadNotifs); });
	document.addEventListener('click', function (ev) { if (!$('notif-panel').hidden && !$('notif-panel').contains(ev.target) && ev.target !== $('bell')) closeNotifs(); });
	setInterval(function () { if (session && !$('library-view').hidden) loadNotifs(); }, 60000);

	// ── Search: people, memories, chapters & events, comments (server) and recordings (here)
	var searchSeq = 0, searchTimer = null;
	function openSearch() { $('search').hidden = false; document.body.style.overflow = 'hidden'; $('search-q').focus(); $('search-q').select(); }
	function closeSearch() { $('search').hidden = true; document.body.style.overflow = ''; }
	$('search-open').addEventListener('click', openSearch);
	$('search-close').addEventListener('click', closeSearch);
	$('search').addEventListener('click', function (ev) { if (ev.target === $('search')) closeSearch(); });
	document.addEventListener('keydown', function (ev) {
		if (ev.key === '/' && !$('library-view').hidden && $('search').hidden && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { ev.preventDefault(); openSearch(); }
		else if (ev.key === 'Escape' && !$('search').hidden) closeSearch();
	});
	// Mark where the search's words begin words of text (search matches word beginnings, any order)
	var searchWords = [];
	function hl(text, q) {
		var span = el('span'), words = searchWords.length ? searchWords : [q];
		var esc = words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).filter(Boolean);
		if (!esc.length) { span.textContent = text; return span; }
		var re = new RegExp('(^|[^\\p{L}\\p{N}])(' + esc.join('|') + ')', 'giu'), last = 0, m;
		var folded = text.normalize('NFD').replace(/\p{M}/gu, '');   // café matches "cafe"
		if (folded.length !== text.length) folded = text;
		while ((m = re.exec(folded))) {
			var s = m.index + m[1].length, e = s + m[2].length;
			span.append(document.createTextNode(text.slice(last, s)), el('mark', '', text.slice(s, e)));
			last = e;
			if (m[0].length === 0) re.lastIndex++;
		}
		span.appendChild(document.createTextNode(text.slice(last)));
		return span;
	}
	$('search-q').addEventListener('input', function () {
		clearTimeout(searchTimer);
		var q = $('search-q').value.trim(), box = $('search-results');
		if (q.length < 2) { box.textContent = ''; box.appendChild(el('p', 'muted', 'Type at least two letters.')); return; }
		searchTimer = setTimeout(function () {
			var seq = ++searchSeq;
			capi('/search?q=' + encodeURIComponent(q)).then(function (r) {
				if (seq !== searchSeq) return;
				box.textContent = '';
				searchWords = r.terms || [];
				function section(title, list, row) {
					if (!list.length) return;
					box.appendChild(el('h3', '', title));
					var ul = el('ul');
					list.forEach(function (x) { var li = el('li'), b = el('button'); b.type = 'button'; row(x, b); li.appendChild(b); ul.appendChild(li); });
					box.appendChild(ul);
				}
				var words = (r.terms || []).length ? r.terms : [nameKey(q)];
				var recs = entries.filter(function (e) {
					var text = ' ' + nameKey(e.title + ' ' + e.longDate + ' ' + e.phrase).replace(/[^\p{L}\p{N}]+/gu, ' ');
					return ready[e.slug] && words.every(function (w) { return text.indexOf(' ' + w) >= 0; });
				}).slice(0, 8);
				section('Recordings', recs, function (e, b) {
					var pic = el('span', 'pic'); pic.style.backgroundImage = 'url("' + HLS + e.slug + '/thumb.jpg")';
					var t = el('span'); t.append(el('b', '', ''), el('small', '', e.longDate)); t.firstChild.appendChild(hl(e.title, q));
					b.append(pic, t); b.addEventListener('click', function () { closeSearch(); play(e); });
				});
				section('People', r.people, function (x, b) {
					b.append(avatar(x.name), el('b', '', '')); b.lastChild.appendChild(hl(x.name, q));
					b.addEventListener('click', function () { closeSearch(); openPerson(x.id); });
				});
				section('Memories', r.memories, function (x, b) {
					var t = el('span'); t.append(el('b', ''), el('small', '', '')); t.firstChild.appendChild(hl(x.title, q)); t.lastChild.appendChild(hl((x.kind === 'notes' ? 'Notes' : x.kind === 'recording' ? 'Recording' : 'Memory') + ' by ' + x.author + ' · ' + x.excerpt, q));
					b.append(icon(x.kind === 'recording' ? 'mic' : x.kind === 'notes' ? 'file-text' : 'pen-line'), t); b.addEventListener('click', function () { closeSearch(); openMemory(x.id); });
				});
				section('Clips', r.clips || [], function (c, b) {
					var pic = el('span', 'pic'); frameInto(pic, c.target.slice(6), c.start);
					var e = entryBySlug(c.target.slice(6));
					var t = el('span'); t.append(el('b', ''), el('small', '', 'Clip · ' + clipLen(c) + (e ? ' · ' + e.title + ' at ' + at(c.start) : '') + ' · by ' + c.author));
					t.firstChild.appendChild(hl(c.title, q));
					b.append(pic, t); b.addEventListener('click', function () { closeSearch(); playClip(c); });
				});
				section('What was said', r.said || [], function (x, b) {
					var info = targetInfo(x.target), pic = el('span', 'pic');
					if (info && info.pic) frameInto(pic, x.target.slice(6), x.start);
					var t = el('span'); t.append(el('b', ''), el('small', '', (info ? info.label + ' at ' + at(x.start) : at(x.start)) + (x.textEn && x.textEn !== x.text ? ' · ' + x.textEn : '')));
					t.firstChild.appendChild(hl('“' + x.text + '”', q));
					b.append(pic, t); b.addEventListener('click', function () { closeSearch(); openTarget(info, Math.max(0, Math.floor(x.start) - 2)); });
				});
				section('Photos', (r.photos || []).filter(function (x) { return photoById(x.photo); }), function (x, b) {
					var ph = photoById(x.photo), pic = el('span', 'pic'); pic.style.backgroundImage = 'url("' + HLS + 'photos/' + ph.thumb + '")';
					var t = el('span'); t.append(el('b', '', 'Photo ' + (photos.indexOf(ph) + 1)), el('small', '')); t.lastChild.appendChild(hl(x.people, q));
					b.append(pic, t); b.addEventListener('click', function () { closeSearch(); openPhoto(photos.indexOf(ph)); });
				});
				section('Chapters & events', r.moments, function (x, b) {
					var info = targetInfo(x.target), pic = el('span', 'pic');
					if (info && info.pic) pic.style.backgroundImage = 'url("' + info.pic + '")';
					var t = el('span'); t.append(el('b', ''), el('small', '', (x.kind === 'chapter' ? 'Chapter' : 'Event') + (info ? ' · ' + info.label + ' at ' + at(x.position) : ''))); t.firstChild.appendChild(hl(x.title, q));
					b.append(pic, t); b.addEventListener('click', function () { closeSearch(); openTarget(info, x.position); });
				});
				section('Comments', r.comments, function (x, b) {
					var info = targetInfo(x.target), pic = el('span', 'pic');
					if (info && info.pic) pic.style.backgroundImage = 'url("' + info.pic + '")';
					var t = el('span'); t.append(el('b', '', x.author), el('small', '')); t.lastChild.appendChild(hl(x.excerpt, q));
					b.append(pic, t); b.addEventListener('click', function () { closeSearch(); if (info && info.kind === 'memory') openMemory(info.id); else openTarget(info, x.position); });
				});
				if (!box.childNodes.length) box.appendChild(el('p', 'muted', 'Nothing matches “' + q + '”.'));
			}).catch(function (ex) { box.textContent = ex.message; });
		}, 220);
	});

	function goTo(v) {
		view = v; personId = null; memoryId = null; storeSet('localStorage', VIEW_KEY, view);
		if (/^#(person|memory)\//.test(location.hash)) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
		closeMenu(); render();
		if (v === 'home') window.scrollTo({ top: 0 });
		else $('content').scrollIntoView({ block: 'start' });
	}
	document.querySelectorAll('.nav button[data-view]').forEach(function (b) {
		b.addEventListener('click', function () { goTo(b.dataset.view); });
	});
	$('go-home').addEventListener('click', function () { goTo('home'); });
	// Tablets and phones: the pages fold into a menu behind the hamburger button.
	function closeMenu() { $('bar').classList.remove('is-open'); $('menu-btn').setAttribute('aria-expanded', 'false'); }
	$('menu-btn').addEventListener('click', function () {
		var open = !$('bar').classList.contains('is-open');
		$('bar').classList.toggle('is-open', open); $('menu-btn').setAttribute('aria-expanded', String(open));
	});
	document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && $('bar').classList.contains('is-open')) closeMenu(); });
	document.addEventListener('click', function (ev) { if ($('bar').classList.contains('is-open') && !$('bar').contains(ev.target)) closeMenu(); });
	document.querySelector('.nav__extra [data-action=account]').addEventListener('click', function () { closeMenu(); $('account-open').click(); });
	document.querySelector('.nav__extra [data-action=logout]').addEventListener('click', function () { closeMenu(); $('logout').click(); });

	// ── Chapters & tagged events on a video, beside the player. Any member can add them;
	// people edit or delete their own (the admin, any). Clicking one jumps there.
	function parseTime(text) {
		var parts = String(text || '').trim().split(':').map(Number);
		if (!parts.length || parts.length > 3 || parts.some(function (n) { return !isFinite(n) || n < 0; })) return null;
		return parts.reduce(function (acc, n) { return acc * 60 + n; }, 0);
	}
	var markerState = null; // { slug, items, filter, root }

	// People list shared by the People tab and the event picker.
	var peopleLoad = null;
	function ensurePeople(force) {
		if (force || !peopleLoad) peopleLoad = capi('/people').then(function (list) { people = list; return list; });
		return peopleLoad;
	}
	function nameKey(n) { return String(n || '').toLowerCase().split(/\s+/).filter(Boolean).join(' '); }

	// Pick people from the People list: chips with ×, a + button, and a type-ahead menu.
	// Returns { el, ids(), focus() }. onChange(peopleArray) fires on every change.
	var pickerSeq = 0;
	// hooks (optional): { onAdd(person) → Promise, onRemove(person) → Promise, canRemove(person) → bool,
	//   empty: text when nobody is tagged, label: prefix for the names line (or null for none) }
	function peoplePicker(initial, onChange, hooks) {
		hooks = hooks || {};
		var chosen = (initial || []).slice();
		var uid = 'pp' + (++pickerSeq);
		var root = el('div', 'tagger');
		var row = el('div', 'tagger__row');
		var chips = el('ul', 'tagger__chips');
		var plus = el('button', 'tagger__plus', '+'); plus.type = 'button'; plus.setAttribute('aria-label', 'Tag a person');
		row.appendChild(chips); row.appendChild(plus); root.appendChild(row);
		var box = el('div', 'tagger__search'); box.hidden = true;
		var input = el('input', 'field'); input.placeholder = 'Type a name'; input.autocomplete = 'off';
		input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
		input.setAttribute('aria-controls', uid + '-menu'); input.setAttribute('aria-label', 'Search the People list');
		var menu = el('ul', 'tagger__menu'); menu.id = uid + '-menu'; menu.setAttribute('role', 'listbox'); menu.hidden = true;
		box.appendChild(input); box.appendChild(menu); root.appendChild(box);
		var preview = el('p', 'tagger__preview'); root.appendChild(preview);
		var options = [], active = 0;

		function changed() {
			chips.textContent = '';
			chosen.forEach(function (pp) {
				var chip = el('li', 'chip-person'); chip.appendChild(document.createTextNode(pp.name));
				if (!hooks.canRemove || hooks.canRemove(pp)) {
					var x = el('button', '', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + pp.name);
					x.addEventListener('click', function () { removePerson(pp); plus.focus(); });
					chip.appendChild(x);
				} else {
					chip.style.paddingRight = '11px';
				}
				chips.appendChild(chip);
			});
			preview.textContent = '';
			if (chosen.length && hooks.label !== null) {
				preview.appendChild(document.createTextNode((hooks.label || 'Event name') + ': '));
				preview.appendChild(el('b', '', chosen.map(function (c) { return c.name; }).join(', ')));
			} else if (!chosen.length) {
				preview.textContent = hooks.empty || 'Press + to tag the people who appear at this moment.';
			}
			if (onChange) onChange(chosen);
			if (!box.hidden) refresh();
		}
		function refresh() {
			var q = nameKey(input.value), taken = {};
			chosen.forEach(function (c) { taken[c.id] = true; });
			var matches = people.filter(function (pp) { return !taken[pp.id] && (!q || nameKey(pp.name).indexOf(q) >= 0); });
			// names starting with what was typed come first
			matches.sort(function (a, b) { return (nameKey(a.name).indexOf(q) === 0 ? 0 : 1) - (nameKey(b.name).indexOf(q) === 0 ? 0 : 1) || nameKey(a.name).localeCompare(nameKey(b.name)); });
			options = matches.slice(0, 50).map(function (pp) { return { person: pp }; });
			// Offer to add a new name only when nothing on the list matches, so partial
			// names ("Raj") don't become duplicates of people already listed.
			var anyMatch = people.some(function (pp) { return nameKey(pp.name).indexOf(q) >= 0; });
			if (q.length >= 2 && !anyMatch) options.push({ create: input.value.trim() });
			menu.textContent = '';
			if (!options.length) {
				var none = el('li', 'is-empty', people.length ? 'Everyone matching is already tagged.' : 'Loading the People list…');
				menu.appendChild(none);
			}
			active = Math.min(active, Math.max(options.length - 1, 0));
			options.forEach(function (o, i) {
				var li = el('li', o.create ? 'is-new' : '', o.create ? 'Add “' + o.create + '” to People' : o.person.name);
				li.id = uid + '-opt' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === active));
				li.addEventListener('mousedown', function (ev) { ev.preventDefault(); pick(i); });
				li.addEventListener('mousemove', function () { if (active !== i) { active = i; paint(); } });
				menu.appendChild(li);
			});
			menu.hidden = false; input.setAttribute('aria-expanded', 'true');
			paint();
		}
		function paint() {
			menu.querySelectorAll('[role=option]').forEach(function (li, i) { li.setAttribute('aria-selected', String(i === active)); });
			var cur = menu.querySelector('[aria-selected=true]');
			if (cur) { input.setAttribute('aria-activedescendant', cur.id); cur.scrollIntoView({ block: 'nearest' }); }
			else input.removeAttribute('aria-activedescendant');
		}
		// With hooks, every add/remove is saved straight away (photos); without, the form saves (events).
		function addPerson(pp) {
			if (chosen.some(function (c) { return c.id === pp.id; })) return Promise.resolve();
			return (hooks.onAdd ? hooks.onAdd(pp) : Promise.resolve()).then(function () {
				chosen.push(pp); input.value = ''; active = 0; changed(); input.focus();
			}, function (ex) { preview.textContent = ex.message; });
		}
		function removePerson(pp) {
			return (hooks.onRemove ? hooks.onRemove(pp) : Promise.resolve()).then(function () {
				chosen = chosen.filter(function (c) { return c.id !== pp.id; }); changed();
			}, function (ex) { preview.textContent = ex.message; });
		}
		function pick(i) {
			var o = options[i]; if (!o) return;
			if (o.person) { addPerson(o.person); return; }
			// Not on the list yet: add them to People, then tag them.
			capi('/people', { method: 'POST', body: { name: o.create } }).then(function (pp) {
				people.push(pp); people.sort(function (a, b) { return nameKey(a.name).localeCompare(nameKey(b.name)); });
				return addPerson(pp);
			}).catch(function (ex) {
				if (ex.status === 409) {
					return ensurePeople(true).then(function () {
						var hit = people.filter(function (pp) { return nameKey(pp.name) === nameKey(o.create); })[0];
						if (hit) return addPerson(hit);
					});
				}
				preview.textContent = ex.message;
			});
		}
		function openSearch() {
			box.hidden = false; input.value = ''; active = 0;
			ensurePeople().then(refresh, function (ex) { preview.textContent = ex.message; });
			refresh(); input.focus();
		}
		function closeSearch() { box.hidden = true; menu.hidden = true; input.setAttribute('aria-expanded', 'false'); }
		plus.addEventListener('click', function () { if (box.hidden) openSearch(); else { closeSearch(); } });
		input.addEventListener('input', function () { active = 0; refresh(); });
		input.addEventListener('keydown', function (ev) {
			if (ev.key === 'ArrowDown') { ev.preventDefault(); active = Math.min(active + 1, options.length - 1); paint(); }
			else if (ev.key === 'ArrowUp') { ev.preventDefault(); active = Math.max(active - 1, 0); paint(); }
			else if (ev.key === 'Enter') { ev.preventDefault(); if (options.length) pick(active); }
			else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeSearch(); plus.focus(); }
			else if (ev.key === 'Backspace' && !input.value && chosen.length) {
				var last = chosen[chosen.length - 1];
				if (!hooks.canRemove || hooks.canRemove(last)) removePerson(last);
			}
		});
		input.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== input) closeSearch(); }, 120); });
		changed();
		return { el: root, ids: function () { return chosen.map(function (c) { return c.id; }); }, focus: openSearch,
			count: function () { return chosen.length; } };
	}

	// Moderators mark where a recording is outdoors: there Enhanced sound uses the voice treatment
	// (kodai1994/audio.sh), elsewhere the indoor one. Play to the start, "Outdoor from here",
	// play to the end, "Save".
	function outdoorParts(slug) {
		var target = 'video:' + slug, box = el('details', 'outdoor'), sum = el('summary', '', 'Outdoor parts');
		var list = el('ul', 'outdoor__list'), row = el('div', 'outdoor__row'), msg = el('p', 'outdoor__msg muted');
		box.append(sum, el('p', 'outdoor__note muted', 'Where the recording is outdoors, Enhanced sound brings the voice forward over crowd and wind. Changes reach the sound within the hour.'), list, row, msg);
		var from = null;
		function now() { return Math.floor(player.currentTime() || 0); }
		function load() {
			return capi('/sound-sections?target=' + encodeURIComponent(target)).then(function (d) {
				list.textContent = '';
				sum.textContent = 'Outdoor parts' + (d.sections.length ? ' (' + d.sections.length + ')' : '');
				d.sections.forEach(function (s) {
					var li = el('li'), jump = el('button', 'linkish', at(s.start) + ' – ' + at(s.end)); jump.type = 'button';
					jump.title = 'Play from here';
					jump.addEventListener('click', function () { player.currentTime(s.start); player.play().catch(function () {}); });
					var x = el('button', 'outdoor__x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Remove the outdoor part ' + at(s.start) + ' to ' + at(s.end));
					x.addEventListener('click', function () {
						x.disabled = true;
						capi('/sound-sections/' + s.id, { method: 'DELETE' }).then(load).catch(function (e) { msg.textContent = e.message; x.disabled = false; });
					});
					li.append(jump, x); list.appendChild(li);
				});
				if (!d.sections.length) list.appendChild(el('li', 'muted', 'None marked: the whole recording is treated as indoors.'));
			}).catch(function (e) { msg.textContent = e.message; });
		}
		function draw() {
			row.textContent = ''; msg.textContent = '';
			if (from == null) {
				var start = el('button', 'btn btn--quiet btn--small', 'Outdoor from here'); start.type = 'button';
				start.addEventListener('click', function () { from = now(); draw(); });
				row.appendChild(start);
				return;
			}
			row.appendChild(el('span', '', 'From ' + at(from) + ' to the playing time'));
			var save = el('button', 'btn btn--small', 'Save'), cancel = el('button', 'linkish', 'Cancel');
			save.type = cancel.type = 'button';
			save.addEventListener('click', function () {
				save.disabled = true;
				capi('/sound-sections', { method: 'POST', body: { target: target, start: Math.min(from, now()), end: Math.max(from, now()) } })
					.then(function () { from = null; draw(); return load(); })
					.catch(function (e) { save.disabled = false; msg.textContent = e.message; });
			});
			cancel.addEventListener('click', function () { from = null; draw(); });
			row.append(save, cancel);
		}
		draw(); load();
		return box;
	}

	function markersPanel(slug) {
		var st = markerState = { slug: slug, items: [], filter: 'all' };
		var root = st.root = el('section', 'markers');
		var head = el('div', 'markers__head');
		head.appendChild(el('h3', '', 'Chapters, events, clips & memories'));
		var filter = el('div', 'markers__filter'); filter.setAttribute('role', 'group'); filter.setAttribute('aria-label', 'Show');
		[['all', 'All'], ['chapter', 'Chapters'], ['event', 'Events'], ['clip', 'Clips'], ['memory', 'Memories']].forEach(function (f) {
			var b = el('button', '', f[1]); b.type = 'button'; b.dataset.filter = f[0]; b.setAttribute('aria-pressed', String(f[0] === 'all'));
			b.addEventListener('click', function () {
				st.filter = f[0];
				filter.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
				renderList();
			});
			filter.appendChild(b);
		});
		head.appendChild(filter); root.appendChild(head);
		var list = el('ol', 'markers__list'); root.appendChild(list);
		var empty = el('p', 'markers__empty', 'Loading…'); root.appendChild(empty);

		if (me && me.isAdmin) root.appendChild(outdoorParts(slug));

		// Add form, collapsed behind one button so the list gets the space
		var addWrap = el('div', 'markers__add');
		var open = el('button', 'btn btn--quiet', 'Add a chapter, event, clip or memory'); open.type = 'button';
		var form = el('form'); form.hidden = true; form.style.display = 'grid'; form.style.gap = '8px';
		var seg = el('div', 'seg'); seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', 'Type');
		['chapter', 'event', 'clip', 'memory'].forEach(function (k, i) {
			var l = el('label'), r = el('input'); r.type = 'radio'; r.name = 'kind-' + slug; r.value = k; r.checked = i === 0;
			l.appendChild(r); l.appendChild(document.createTextNode({ chapter: 'Chapter', event: 'Event', clip: 'Clip', memory: 'Memory' }[k])); seg.appendChild(l);
		});
		var hint = el('p', 'hint', '');
		var HINTS = { chapter: 'A chapter starts a section of the tape.', event: 'An event tags the people who appear at one moment.',
			clip: 'A clip is a highlight to share: it plays from the start to the end you set, with its own link. Keep watching, then press “Use current time” at the end.',
			memory: 'A memory is your own account of this moment, as long as you like. It opens the memory editor with this recording tagged at the time below.' };
		var titleLabel = el('label', '', 'Title'); titleLabel.htmlFor = 'mk-title-' + slug;
		var title = el('input', 'field'); title.id = 'mk-title-' + slug; title.maxLength = 120; title.required = true;
		var peopleLabel = el('label', '', 'People at this moment');
		var picker = peoplePicker([]);
		function kindNow() { return form.querySelector('input[type=radio]:checked').value; }
		function showKind() {
			var k = kindNow(), ev = k === 'event', mem = k === 'memory', clip = k === 'clip';
			titleLabel.hidden = title.hidden = ev || mem; title.required = k === 'chapter' || clip;
			title.placeholder = clip ? 'For example, The song by the lake' : 'For example, Morning darshan';
			peopleLabel.hidden = picker.el.hidden = !(ev || clip);
			peopleLabel.textContent = clip ? 'Who’s in it (optional)' : 'People at this moment';
			endLabel.hidden = endRow.hidden = !clip; endTime.required = clip;
			timeLabel.textContent = clip ? 'Starts' : 'Time';
			hint.textContent = HINTS[k];
			add.textContent = mem ? 'Write the memory' : clip ? 'Make the clip' : 'Add';
			if (nameLabel) nameLabel.hidden = nameInput.hidden = mem;   // the editor asks for it
		}
		var timeLabel = el('label', '', 'Time'); timeLabel.htmlFor = 'mk-time-' + slug;
		var row = el('div', 'markers__row');
		var time = el('input', 'field'); time.id = 'mk-time-' + slug; time.inputMode = 'numeric'; time.placeholder = '1:02:10'; time.required = true;
		var now = el('button', 'linkish', 'Use current time'); now.type = 'button';
		row.appendChild(time); row.appendChild(now);
		var endLabel = el('label', '', 'Ends'); endLabel.htmlFor = 'mk-end-' + slug;
		var endRow = el('div', 'markers__row');
		var endTime = el('input', 'field'); endTime.id = 'mk-end-' + slug; endTime.inputMode = 'numeric'; endTime.placeholder = '1:03:05';
		var endNow = el('button', 'linkish', 'Use current time'); endNow.type = 'button';
		endNow.addEventListener('click', function () { endTime.value = fmtDuration(Math.floor(player.currentTime() || 0) * 1e7) || '0:00'; });
		endRow.append(endTime, endNow);
		var nameLabel, nameInput;
		if (!me || !me.displayName) {
			nameLabel = el('label', '', 'Your name, as others will see it'); nameLabel.htmlFor = 'mk-name-' + slug;
			nameInput = el('input', 'field'); nameInput.id = 'mk-name-' + slug; nameInput.maxLength = 60; nameInput.required = true; nameInput.autocomplete = 'name';
		}
		var actions = el('div', 'form-actions');
		var add = el('button', 'btn', 'Add'); add.type = 'submit';
		var cancel = el('button', 'linkish', 'Cancel'); cancel.type = 'button';
		actions.appendChild(add); actions.appendChild(cancel);
		var err = el('p', 'error'); err.setAttribute('role', 'alert');
		[seg, hint, titleLabel, title, timeLabel, row, endLabel, endRow, peopleLabel, picker.el].forEach(function (x) { form.appendChild(x); });
		seg.addEventListener('change', function () { err.textContent = ''; showKind(); if (kindNow() === 'event' && !picker.count()) picker.focus(); else if (kindNow() === 'chapter') title.focus(); else time.focus(); });
		if (nameInput) { form.appendChild(nameLabel); form.appendChild(nameInput); }
		form.appendChild(actions); form.appendChild(err);
		addWrap.appendChild(open); addWrap.appendChild(form); root.appendChild(addWrap);

		function useNow() { time.value = fmtDuration(Math.floor(player.currentTime() || 0) * 1e7); }
		now.addEventListener('click', useNow);
		open.addEventListener('click', function () { form.hidden = false; open.hidden = true; useNow(); showKind(); if (kindNow() === 'event') picker.focus(); else title.focus(); });
		cancel.addEventListener('click', function () { form.hidden = true; open.hidden = false; err.textContent = ''; });
		form.addEventListener('submit', function (ev) {
			ev.preventDefault(); err.textContent = '';
			var pos = parseTime(time.value);
			if (pos === null) { err.textContent = 'Enter the time as hours:minutes:seconds, like 1:02:10.'; return; }
			var kind = kindNow();
			if (kind === 'memory') {
				closePlayer();
				editMemory({ kind: 'article', title: '', body: '', links: [{ target: 'video:' + slug, position: pos }], people: [] });
				return;
			}
			if (kind === 'event' && !picker.count()) { err.textContent = 'Tag at least one person: press + and choose a name.'; return; }
			var end = kind === 'clip' ? parseTime(endTime.value) : null;
			if (kind === 'clip' && (end === null || end <= pos)) { err.textContent = 'Set where the clip ends, after it starts: press “Use current time” when it’s over.'; return; }
			add.disabled = true;
			var setName = nameInput ? capi('/me', { method: 'PUT', body: { displayName: nameInput.value } }).then(function (r) { if (me) me.displayName = r.displayName; }) : Promise.resolve();
			setName.then(function () {
				if (kind === 'clip') return capi('/clips', { method: 'POST', body: { target: 'video:' + slug, title: title.value, start: pos, end: end, people: picker.ids() } });
				var body = { target: 'video:' + slug, kind: kind, position: pos };
				if (kind === 'event') body.people = picker.ids(); else body.title = title.value;
				return capi('/markers', { method: 'POST', body: body });
			}).then(function () {
				title.value = ''; endTime.value = ''; form.hidden = true; open.hidden = false;
				var fresh = peoplePicker([]); picker.el.replaceWith(fresh.el); picker = fresh; showKind();
				if (nameInput) { nameLabel.remove(); nameInput.remove(); nameInput = null; }
				return load();
			}).catch(function (ex) { err.textContent = ex.message; })
			  .then(function () { add.disabled = false; });
		});

		function renderList() {
			list.textContent = '';
			var shown = st.items.filter(function (m) { return st.filter === 'all' || m.kind === st.filter; });
			empty.hidden = shown.length > 0;
			empty.textContent = st.items.length ? 'Nothing of this type yet.' : 'No chapters, events, clips or memories yet. Add the first one while you watch.';
			shown.forEach(function (m) { list.appendChild(markerRow(m)); });
			highlightCurrent();
		}
		function markerRow(m) {
			if (m.kind === 'memory') return memoryRow(m);
			if (m.kind === 'clip') return clipRow(m.clip);
			var li = el('li', 'marker marker--' + m.kind); li.dataset.id = m.id; li.dataset.pos = m.position;
			var jump = function () { player.currentTime(m.position); player.play().catch(function () {}); };
			var at = fmtDuration(m.position * 1e7) || '0:00';   // fmtDuration gives '' for the very start
			var t = el('button', 'marker__time', at); t.type = 'button';
			t.setAttribute('aria-label', 'Play from ' + at + ': ' + m.title);
			t.addEventListener('click', jump);
			var name = el('button', 'marker__title', m.title); name.type = 'button'; name.addEventListener('click', jump);
			var meta = el('div', 'marker__meta');
			meta.appendChild(el('span', 'kind kind--' + m.kind, m.kind === 'chapter' ? 'Chapter' : 'Event'));
			meta.appendChild(el('span', '', 'added by ' + m.author));
			if (m.canEdit) {
				var edit = el('button', 'linkish', 'Edit'); edit.type = 'button';
				edit.addEventListener('click', function () { editRow(li, m); });
				var del = el('button', 'linkish', 'Delete'); del.type = 'button';
				del.addEventListener('click', function () {
					if (del.dataset.armed !== '1') { del.dataset.armed = '1'; del.textContent = 'Delete it?'; setTimeout(function () { del.dataset.armed = ''; del.textContent = 'Delete'; }, 4000); return; }
					capi('/markers/' + m.id, { method: 'DELETE' }).then(load).catch(function (ex) { err.textContent = ex.message; });
				});
				meta.appendChild(edit); meta.appendChild(del);
			}
			li.appendChild(t); li.appendChild(name); li.appendChild(meta);
			return li;
		}
		// A memory tagged to this recording: the time jumps there (if it has one), the title opens it.
		function memoryRow(m) {
			var li = el('li', 'marker marker--memory'); li.dataset.pos = m.position == null ? '' : m.position;
			var t = el('button', 'marker__time', m.position == null ? '—' : (fmtDuration(m.position * 1e7) || '0:00')); t.type = 'button';
			if (m.position == null) { t.disabled = true; t.title = 'About the whole recording'; }
			else t.addEventListener('click', function () { player.currentTime(m.position); player.play().catch(function () {}); });
			var name = el('button', 'marker__title', m.title); name.type = 'button';
			name.setAttribute('aria-label', 'Open the memory: ' + m.title);
			name.addEventListener('click', function () { closePlayer(); openMemory(m.memoryId); });
			var meta = el('div', 'marker__meta');
			meta.appendChild(el('span', 'kind kind--memory', 'Memory'));
			meta.appendChild(el('span', '', 'by ' + m.author));
			li.appendChild(t); li.appendChild(name); li.appendChild(meta);
			return li;
		}
		// A clip: plays from its start to its end, here in the player
		function clipRow(c) {
			var li = el('li', 'marker marker--clip' + (clipNow && clipNow.id === c.id ? ' is-playing' : '')); li.dataset.pos = c.start;
			var t = el('button', 'marker__time', at(c.start)); t.type = 'button';
			t.setAttribute('aria-label', 'Play the clip: ' + c.title);
			t.addEventListener('click', function () { startClip(c); });
			var name = el('button', 'marker__title', c.title); name.type = 'button'; name.addEventListener('click', function () { startClip(c); });
			var meta = el('div', 'marker__meta');
			meta.appendChild(el('span', 'kind kind--clip', 'Clip · ' + clipLen(c)));
			meta.appendChild(el('span', '', 'by ' + c.author));
			if (c.people.length) meta.appendChild(el('span', '', 'with ' + c.people.map(function (p) { return p.name; }).join(', ')));
			var copy = el('button', 'linkish', 'Copy link'); copy.type = 'button';
			copy.addEventListener('click', function () { copyClipLink(c, copy); });
			meta.appendChild(copy);
			if (c.canEdit) {
				var edit = el('button', 'linkish', 'Edit'); edit.type = 'button';
				edit.addEventListener('click', function () { editClipRow(li, c); });
				var del = el('button', 'linkish', 'Delete'); del.type = 'button';
				del.addEventListener('click', function () {
					if (del.dataset.armed !== '1') { del.dataset.armed = '1'; del.textContent = 'Delete it?'; setTimeout(function () { del.dataset.armed = ''; del.textContent = 'Delete'; }, 4000); return; }
					capi('/clips/' + c.id, { method: 'DELETE' }).then(function () { if (clipNow && clipNow.id === c.id) { clipNow = null; drawClipBar(); } return load(); })
						.catch(function (ex) { err.textContent = ex.message; });
				});
				meta.appendChild(edit); meta.appendChild(del);
			}
			li.append(t, name, meta);
			return li;
		}
		function editClipRow(li, c) {
			li.textContent = '';
			var f = el('form'); f.style.display = 'grid'; f.style.gap = '6px'; f.style.gridColumn = '1 / -1';
			var ti = el('input', 'field'); ti.value = c.title; ti.maxLength = 120; ti.setAttribute('aria-label', 'Title');
			var r = el('div', 'markers__row');
			var s0 = el('input', 'field'); s0.value = at(c.start); s0.setAttribute('aria-label', 'Starts');
			var s1 = el('input', 'field'); s1.value = at(c.end); s1.setAttribute('aria-label', 'Ends');
			r.append(s0, el('span', 'muted', 'to'), s1);
			var pk = peoplePicker(c.people.slice());
			var a = el('div', 'form-actions'), save = el('button', 'btn', 'Save'), back = el('button', 'linkish', 'Cancel');
			save.type = 'submit'; back.type = 'button'; a.append(save, back);
			var e2 = el('p', 'error'); e2.setAttribute('role', 'alert');
			f.append(ti, r, pk.el, a, e2); li.appendChild(f); ti.focus();
			back.addEventListener('click', renderList);
			f.addEventListener('submit', function (ev) {
				ev.preventDefault();
				var a0 = parseTime(s0.value), a1 = parseTime(s1.value);
				if (a0 === null || a1 === null) { e2.textContent = 'Enter the times as hours:minutes:seconds, like 1:02:10.'; return; }
				capi('/clips/' + c.id, { method: 'PUT', body: { title: ti.value, start: a0, end: a1, people: pk.ids() } }).then(load)
					.catch(function (ex) { e2.textContent = ex.message; });
			});
		}
		function editRow(li, m) {
			li.textContent = '';
			var f = el('form'); f.style.display = 'grid'; f.style.gap = '6px'; f.style.gridColumn = '1 / -1';
			var ti = el('input', 'field'); ti.value = m.kind === 'chapter' ? m.title : ''; ti.maxLength = 100; ti.setAttribute('aria-label', 'Title');
			var startPeople = (m.people || []).slice();
			var legacy = null;
			if (m.kind === 'event' && !startPeople.length) {
				// Typed before tagging existed: pre-select any names in the title that are on the People list.
				legacy = el('p', 'hint', 'Was typed as: ' + m.title);
				m.title.split(',').forEach(function (part) {
					var hit = people.filter(function (pp) { return nameKey(pp.name) === nameKey(part); })[0];
					if (hit && startPeople.indexOf(hit) < 0) startPeople.push(hit);
				});
			}
			var pk = peoplePicker(startPeople);
			var r = el('div', 'markers__row');
			var tm = el('input', 'field'); tm.value = fmtDuration(m.position * 1e7) || '0:00'; tm.setAttribute('aria-label', 'Time');
			// Chapter | Event toggle, like the add form (the browser's <select> list ignores the dark theme)
			var kind = el('div', 'seg'); kind.setAttribute('role', 'radiogroup'); kind.setAttribute('aria-label', 'Type');
			[['chapter', 'Chapter'], ['event', 'Event']].forEach(function (o) {
				var l = el('label'), rb = el('input'); rb.type = 'radio'; rb.name = 'edit-kind-' + m.id; rb.value = o[0]; rb.checked = o[0] === m.kind;
				l.appendChild(rb); l.appendChild(document.createTextNode(o[1])); kind.appendChild(l);
			});
			Object.defineProperty(kind, 'value', { get: function () { return kind.querySelector('input:checked').value; } });
			r.appendChild(tm); r.appendChild(kind);
			var a = el('div', 'form-actions'), save = el('button', 'btn', 'Save'), back = el('button', 'linkish', 'Cancel');
			save.type = 'submit'; back.type = 'button'; a.appendChild(save); a.appendChild(back);
			var e2 = el('p', 'error'); e2.setAttribute('role', 'alert');
			function showKind() { var ev = kind.value === 'event'; ti.hidden = ev; pk.el.hidden = !ev; if (legacy) legacy.hidden = !ev; }
			[ti, pk.el].concat(legacy ? [legacy] : []).concat([r, a, e2]).forEach(function (x) { f.appendChild(x); });
			kind.addEventListener('change', showKind); showKind();
			li.appendChild(f);
			if (kind.value === 'event') { if (!startPeople.length) pk.focus(); } else ti.focus();
			back.addEventListener('click', renderList);
			f.addEventListener('submit', function (ev) {
				ev.preventDefault();
				var pos = parseTime(tm.value);
				if (pos === null) { e2.textContent = 'Enter the time as hours:minutes:seconds, like 1:02:10.'; return; }
				var body = { position: pos, kind: kind.value };
				if (kind.value === 'event') {
					if (!pk.count()) { e2.textContent = 'Tag at least one person: press + and choose a name.'; return; }
					body.people = pk.ids();
				} else {
					body.title = ti.value;
				}
				capi('/markers/' + m.id, { method: 'PUT', body: body }).then(load)
					.catch(function (ex) { e2.textContent = ex.message; });
			});
		}
		function load() {
			var target = 'video:' + slug;
			return Promise.all([
				capi('/markers?target=' + encodeURIComponent(target)),
				capi('/memories?target=' + encodeURIComponent(target)).catch(function () { return []; }),
				capi('/clips?target=' + encodeURIComponent(target)).catch(function () { return []; })
			]).then(function (res) {
				if (markerState !== st) return;
				var mems = res[1].map(function (mm) {
					var l = mm.links.filter(function (x) { return x.target === target; })[0] || {};
					return { kind: 'memory', memoryId: mm.id, title: mm.title, author: mm.author, position: l.position == null ? null : l.position };
				});
				var clips = res[2].map(function (c) { return { kind: 'clip', clip: c, title: c.title, position: c.start, end: c.end }; });
				// by time; memories about the whole recording (no time) at the end
				st.items = res[0].concat(mems, clips).sort(function (a, b) {
					return (a.position == null) - (b.position == null) || (a.position || 0) - (b.position || 0);
				});
				renderList(); renderTicks();
			}).catch(function (ex) { empty.hidden = false; empty.textContent = ex.message; });
		}
		st.load = load;
		load();
		ensurePeople().catch(function () {});
		return root;
	}
	function highlightCurrent() {
		if (!markerState || !markerState.root) return;
		var t = player.currentTime() || 0, current = null;
		markerState.items.forEach(function (m) { if (m.kind === 'chapter' && m.position <= t + 0.5) current = m.id; });
		markerState.root.querySelectorAll('.marker').forEach(function (li) {
			var on = Number(li.dataset.id) === current;
			li.classList.toggle('is-current', on);
			if (on) li.setAttribute('aria-current', 'true'); else li.removeAttribute('aria-current');
		});
	}
	function renderTicks() {
		var bar = player.controlBar.progressControl.seekBar.el();
		bar.querySelectorAll('.mk-tick, .mk-range').forEach(function (x) { x.remove(); });
		var d = player.duration() || sbRuntime;
		if (!markerState || !d) return;
		markerState.items.forEach(function (m) {
			if (m.position == null) return;
			if (m.kind === 'clip') {   // a clip is a stretch: a band along the bar
				var band = el('div', 'mk-range' + (clipNow && clipNow.id === m.clip.id ? ' is-on' : ''));
				band.style.left = Math.min(100, m.position / d * 100) + '%';
				band.style.width = Math.max(0.4, Math.min(100, (m.end - m.position) / d * 100)) + '%';
				band.title = 'Clip ' + at(m.position) + '–' + at(m.end) + ': ' + m.title;
				bar.appendChild(band);
				return;
			}
			var tick = el('div', 'mk-tick mk-tick--' + m.kind);
			tick.style.left = Math.min(100, m.position / d * 100) + '%';
			tick.title = (fmtDuration(m.position * 1e7) || '0:00') + ' ' + m.title;
			bar.appendChild(tick);
		});
	}
	function mountMarkers(slug) {
		var slot = $('player-markers');
		slot.textContent = '';
		if (!slug) { markerState = null; renderTicks(); return; }
		slot.appendChild(markersPanel(slug));
	}

	// ── Clips: a stretch of a recording with a title. Playing one starts at its beginning and
	// pauses at its end; a bar under the video says so (Replay, Keep watching, Copy link,
	// reactions, comments). Seeking out of it, or Keep watching, leaves the clip.
	var clipNow = null;   // the clip playing (as GET /clips gives it), plus ended
	var clipBar = el('div', 'clipbar'); clipBar.hidden = true; clipBar.setAttribute('role', 'region'); clipBar.setAttribute('aria-label', 'Clip');
	$('stage').after(clipBar);
	function clipLen(c) { return fmtDuration(Math.round(c.end - c.start) * 1e7) || '0:00'; }
	function clipLink(c) { return location.origin + '/kodai1994/#clip/' + c.id; }
	function copyClipLink(c, btn) {
		var was = btn.textContent;
		(navigator.clipboard ? navigator.clipboard.writeText(clipLink(c)) : Promise.reject()).then(function () {
			btn.textContent = 'Link copied'; setTimeout(function () { btn.textContent = was; }, 2500);
		}, function () { btn.textContent = clipLink(c); });   // no clipboard: show it to copy by hand
	}
	function drawClipBar() {
		clipBar.textContent = '';
		clipBar.hidden = !clipNow;
		if (!clipNow) return;
		var c = clipNow;
		var head = el('div', 'clipbar__head');
		head.append(el('span', 'kind kind--clip', 'Clip'), el('b', 'clipbar__title', c.title),
			el('span', 'muted', at(c.start) + '–' + at(c.end) + ' · ' + clipLen(c) + (c.author ? ' · by ' + c.author : '')));
		if (c.ended) head.appendChild(el('span', 'clipbar__ended', 'Clip ended'));
		clipBar.appendChild(head);
		if (c.people && c.people.length) clipBar.appendChild(el('p', 'clipbar__people', 'With ' + c.people.map(function (p) { return p.name; }).join(', ')));
		if (c.note) clipBar.appendChild(el('p', 'clipbar__note', c.note));
		var foot = el('div', 'clipbar__foot'), acts = el('div', 'clipbar__actions');
		var replay = el('button', 'btn btn--small', c.ended ? 'Replay' : 'From the start'); replay.type = 'button';
		replay.addEventListener('click', function () { c.ended = false; player.currentTime(c.start); player.play().catch(function () {}); drawClipBar(); });
		var whole = el('button', 'btn btn--quiet btn--small', 'Keep watching'); whole.type = 'button'; whole.title = 'Leave the clip and watch on from here';
		whole.addEventListener('click', function () { clipNow = null; drawClipBar(); renderTicks(); player.play().catch(function () {}); });
		var copy = el('button', 'btn btn--quiet btn--small', 'Copy link'); copy.type = 'button';
		copy.addEventListener('click', function () { copyClipLink(c, copy); });
		acts.append(replay, whole, copy);
		foot.append(acts, reactionBar('clip', c.id, c.reactions));
		clipBar.appendChild(foot);
		var talk = el('details', 'clipbar__talk');
		talk.appendChild(el('summary', '', 'Comments on this clip' + (c.comments ? ' (' + c.comments + ')' : '')));
		talk.addEventListener('toggle', function () {
			if (talk.open && !talk.dataset.loaded) { talk.dataset.loaded = '1'; talk.appendChild(commentsPanel('clip:' + c.id)); }
		});
		clipBar.appendChild(talk);
	}
	function startClip(c) {   // its recording is open in the player
		clipNow = Object.assign({}, c, { ended: false });
		player.currentTime(c.start); player.play().catch(function () {});
		drawClipBar(); renderTicks();
		if (markerState && markerState.root) markerState.root.querySelectorAll('.marker--clip').forEach(function (li) { li.classList.toggle('is-playing', Number(li.dataset.pos) === c.start); });
	}
	function playClip(c) {
		var e = entryBySlug(c.target.slice(6));
		if (!e || !ready[e.slug]) { $('status').textContent = 'That clip’s recording isn’t ready to play yet.'; return; }
		play(e, c.start);
		clipNow = Object.assign({}, c, { ended: false });
		drawClipBar();
	}
	function openClip(id) {
		capi('/clips/' + id).then(playClip).catch(function (ex) { $('status').textContent = ex.message; });
	}
	// A shared clip's link, ...#clip/<id>: opening it plays the clip (also when pasted into an open tab)
	function clipFromHash() {
		var m = /^#clip\/(\d+)$/.exec(location.hash);
		if (!m || !entries.length) return;
		try { history.replaceState(null, '', location.pathname); } catch (e) {}
		openClip(Number(m[1]));
	}
	window.addEventListener('hashchange', clipFromHash);

	// ── Player: Video.js playing HLS only (no single file to save), watermarked "kodai1994"
	// and the date. Its full screen covers the whole player, so the watermark stays on top
	// (full-window on iPhone, where native full screen would drop it).
	var player = videojs('video', {
		controls: true, fluid: true, aspectRatio: '4:3', preload: 'none',
		playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
		preferFullWindow: true,
		controlBar: { pictureInPictureToggle: false, remainingTimeDisplay: false, skipButtons: { backward: 10, forward: 10 } },
		userActions: { hotkeys: true, doubleClick: true },
		html5: {
			// Safari plays HLS itself: its own audio tracks then fill the Sound menu
			nativeAudioTracks: videojs.browser.IS_ANY_SAFARI, nativeVideoTracks: false,
			// Start from a low bandwidth guess so playback begins on the light rendition:
			// many people share this server's upload. Safari uses its own HLS player.
			vhs: { overrideNative: !videojs.browser.IS_ANY_SAFARI, bandwidth: 450000, useBandwidthFromLocalStorage: false, limitRenditionByPlayerDimensions: false }
		}
	});
	var playing = null, progressTimer = null, markTimer = null;
	// Video zoom: scale the picture inside the player (controls stay put). Ctrl + wheel or
	// pinch zooms; drag pans when zoomed; −/+/Fit in the header.
	var videoZoom = createZoom(function () { var t = player.tech(true); return t ? [t.el()] : []; }, function () { return player.el(); }, {
		wheel: function (ev) { return ev.ctrlKey || videoZoom.scale() > 1; },
		onChange: function (sc) { showLevel($('player-zoom'), sc); player.toggleClass('is-zoomed', sc > 1); }
	});
	player.ready(function () { videoZoom.bind(); });
	wireZoombar($('player-zoom'), videoZoom);
	player.on('loadstart', function () { videoZoom.reset(); });
	var watermark = document.createElement('div');
	watermark.className = 'watermark'; watermark.id = 'watermark'; watermark.setAttribute('aria-hidden', 'true');
	player.el().appendChild(watermark);
	player.el().addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
	function lockDownTech() {
		var v = player.tech(true) && player.tech(true).el();
		if (v) { v.disablePictureInPicture = true; v.setAttribute('controlslist', 'nodownload noremoteplayback'); }
	}
	player.ready(lockDownTech);
	player.on('loadstart', lockDownTech);

	function progressBody() {
		return { ItemId: playing.itemId, MediaSourceId: playing.mediaSourceId, PlaySessionId: playing.playSessionId,
			PositionTicks: Math.floor((player.currentTime() || 0) * 1e7), IsPaused: player.paused(), CanSeek: true, PlayMethod: 'DirectStream' };
	}
	function reportProgress() {
		if (playing && session) api('/Sessions/Playing/Progress', { method: 'POST', body: progressBody() }).catch(function () {});
	}
	player.on('pause', reportProgress);

	// ── Playback speed: the control bar's speed button (0.5×–2×), plus < and > on the
	// keyboard. The chosen speed carries over to the next video and the next visit.
	var RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2], SPEED_KEY = 'yajur-kodai-speed';
	var savedRate = Number(storeGet('localStorage', SPEED_KEY));
	if (RATES.indexOf(savedRate) < 0) savedRate = 1;
	var rateReady = false; // ignore the browser's reset to 1× while a new video loads
	var speedToast = document.createElement('div'); speedToast.className = 'speed-toast'; speedToast.setAttribute('aria-live', 'polite');
	player.el().appendChild(speedToast);
	var toastTimer = null;
	function showSpeed(r) {
		speedToast.textContent = 'Speed ' + r + '×';
		speedToast.classList.add('is-on');
		clearTimeout(toastTimer); toastTimer = setTimeout(function () { speedToast.classList.remove('is-on'); }, 1100);
	}
	function markRate() { player.toggleClass('is-fast', player.playbackRate() !== 1); }
	player.ready(function () {
		var btn = player.controlBar.getChild('PlaybackRateMenuButton');
		if (btn) { btn.controlText('Playback speed'); btn.el().title = 'Playback speed'; }
	});
	// Sound: recordings carry Enhanced (the default), Voice focus and Original (kodai1994/audio.sh).
	// Video.js lists them in its audio menu; the choice is remembered and applied to every recording.
	var SOUND_KEY = 'kodai-sound', soundReady = false;
	function applySound() {
		var want = storeGet('localStorage', SOUND_KEY), tracks = player.audioTracks(), i, has = false;
		for (i = 0; i < tracks.length; i++) if (tracks[i].label === want) has = true;
		if (!has) return;   // not chosen yet, or this recording doesn't have that sound yet
		// one track at a time, set explicitly: enabling one doesn't always turn the others off
		for (i = 0; i < tracks.length; i++) if (tracks[i].enabled !== (tracks[i].label === want)) tracks[i].enabled = tracks[i].label === want;
	}
	player.audioTracks().addEventListener('change', function () {
		if (!soundReady) return;   // the stream choosing its default isn't the member's choice
		var tracks = player.audioTracks();
		for (var i = 0; i < tracks.length; i++) if (tracks[i].enabled) storeSet('localStorage', SOUND_KEY, tracks[i].label);
	});
	player.ready(function () {
		var btn = player.controlBar.getChild('AudioTrackButton');
		if (btn) { btn.controlText('Sound'); btn.el().title = 'Sound: Enhanced, Voice focus or Original'; }
	});
	player.on('loadstart', function () {
		rateReady = false; soundReady = false;
		// once it plays: switching sound while the stream is still loading stalls it
		player.one('playing', function () { applySound(); setTimeout(function () { soundReady = true; }, 0); });
	});
	player.on('loadedmetadata', function () {
		player.defaultPlaybackRate(savedRate); player.playbackRate(savedRate);
		rateReady = true; markRate();
	});
	player.on('ratechange', function () {
		var r = player.playbackRate();
		markRate();
		if (!rateReady || RATES.indexOf(r) < 0 || r === savedRate) return;
		savedRate = r; storeSet('localStorage', SPEED_KEY, String(r)); showSpeed(r);
	});
	document.addEventListener('keydown', function (ev) {
		if ($('player').hidden || ev.ctrlKey || ev.metaKey || ev.altKey) return;
		if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
		if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
			// ← / → skip 10 s, as the buttons do (the focused seek bar handles its own arrows)
			if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.vjs-control-bar')) return;
			var to = (player.currentTime() || 0) + (ev.key === 'ArrowRight' ? 10 : -10);
			player.currentTime(Math.max(0, Math.min(player.duration() || to, to)));
			ev.preventDefault();
			return;
		}
		if (ev.key !== '>' && ev.key !== '<') return;
		var i = RATES.indexOf(player.playbackRate()); if (i < 0) i = RATES.indexOf(1);
		var next = RATES[Math.max(0, Math.min(RATES.length - 1, i + (ev.key === '>' ? 1 : -1)))];
		player.playbackRate(next);
		if (next === savedRate) showSpeed(next); // at the end of the range: still confirm
		ev.preventDefault();
	});
	player.on('timeupdate', highlightCurrent);
	// A clip pauses at its end; seeking out of it leaves the clip (see Clips above)
	player.on('timeupdate', function () {
		if (!clipNow || clipNow.ended) return;
		if ((player.currentTime() || 0) >= clipNow.end) { player.pause(); clipNow.ended = true; drawClipBar(); }
	});
	player.on('seeked', function () {
		if (!clipNow || clipNow.ended) return;
		var t = player.currentTime() || 0;
		if (t < clipNow.start - 1.5 || t > clipNow.end + 0.5) { clipNow = null; drawClipBar(); renderTicks(); }
	});

	// ── Captions and the transcript: what was said, made on this machine from the sound
	// (captions/worker.py, Whisper) and corrected by moderators. The CC menu gets "Original
	// (as spoken)" and, for recordings in another language with English lines, "English";
	// the choice is remembered. The transcript sits under the video: the line being said is
	// marked, a line jumps there, moderators correct lines and ask for transcripts.
	var CC_KEY = 'kodai-cc', capState = null, capTracksReady = false;
	var LANGS = { en: 'English', te: 'Telugu', hi: 'Hindi', ta: 'Tamil', kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi', sa: 'Sanskrit' };
	var transcriptBox = el('details', 'transcript'); transcriptBox.hidden = true;
	clipBar.after(transcriptBox);
	function clearCaptionTracks() {
		capTracksReady = false;
		var tracks = player.remoteTextTracks();
		for (var i = tracks.length - 1; i >= 0; i--) player.removeRemoteTextTrack(tracks[i]);
	}
	function addCaptionTracks(slug, d) {
		clearCaptionTracks();
		if (!d.lines.length) return;
		var lang = d.lines[0].language || 'en', want = storeGet('localStorage', CC_KEY);
		var base = '/kodai1994/api/captions.vtt?target=' + encodeURIComponent('video:' + slug);
		var defs = [{ kind: 'captions', label: 'Original (as spoken)', srclang: lang, src: base + '&lang=orig' }];
		if (lang !== 'en' && d.lines.some(function (l) { return l.textEn; })) defs.push({ kind: 'subtitles', label: 'English', srclang: 'en', src: base + '&lang=en' });
		defs.forEach(function (t) { player.addRemoteTextTrack(Object.assign({ mode: t.label === want ? 'showing' : 'disabled' }, t), false); });
		setTimeout(function () { capTracksReady = true; }, 0);
	}
	player.textTracks().addEventListener('change', function () {
		if (!capTracksReady) return;   // tracks coming and going isn't the member's choice
		var tr = player.textTracks(), on = '';
		for (var i = 0; i < tr.length; i++) if (tr[i].mode === 'showing' && (tr[i].kind === 'captions' || tr[i].kind === 'subtitles')) on = tr[i].label;
		storeSet('localStorage', CC_KEY, on);
	});
	function loadCaptions(slug) {
		if (!capState || capState.slug !== slug) {   // another recording: start afresh (a refresh keeps the panel as it is)
			capState = { slug: slug, lines: [], current: -1 };
			transcriptBox.hidden = true; transcriptBox.textContent = ''; transcriptBox.open = false;
			$('player-desc').hidden = true; $('player-desc').textContent = '';
		}
		return capi('/captions?target=' + encodeURIComponent('video:' + slug)).then(function (d) {
			if (!capState || capState.slug !== slug) return;
			var first = !capState.loaded;
			Object.assign(capState, d, { loaded: true });
			if (first || capState.lines.length !== (capState.trackLines || 0)) { addCaptionTracks(slug, d); capState.trackLines = d.lines.length; }
			drawDescription(slug, d);
			drawTranscript();
			if (d.run && /queued|running/.test(d.run.status)) setTimeout(function () { if (capState && capState.slug === slug) loadCaptions(slug); }, 15000);
		}).catch(function () {});
	}
	function drawDescription(slug, d) {
		var box = $('player-desc'); box.textContent = '';
		var desc = d.description;
		if (desc) {
			box.appendChild(el('p', '', desc.text));
			if (desc.source === 'claude') box.appendChild(el('small', 'muted', 'Written by the computer from what is said in the recording.'));
		}
		if (d.canEdit) {
			var ed = el('button', 'linkish', desc ? 'Edit description' : 'Add a description'); ed.type = 'button';
			ed.addEventListener('click', function () {
				box.textContent = '';
				var ta = el('textarea', 'field'); ta.maxLength = 1200; ta.value = desc ? desc.text : ''; ta.rows = 3; ta.setAttribute('aria-label', 'Description of this recording');
				var save = el('button', 'btn btn--small', 'Save'), cancel = el('button', 'linkish', 'Cancel'), msg = el('p', 'error');
				save.type = cancel.type = 'button';
				save.addEventListener('click', function () {
					capi('/descriptions', { method: 'PUT', body: { target: 'video:' + slug, text: ta.value } }).then(function (r) {
						d.description = r.text ? { text: r.text, source: 'moderator' } : null;
						var cs = captionStatus['video:' + slug] = captionStatus['video:' + slug] || { lines: 0 };
						cs.description = r.text || ''; drawDescription(slug, d);
					}).catch(function (ex) { msg.textContent = ex.message; });
				});
				cancel.addEventListener('click', function () { drawDescription(slug, d); });
				var row = el('div', 'form-actions'); row.append(save, cancel);
				box.append(ta, row, msg); ta.focus();
			});
			box.appendChild(ed);
		}
		box.hidden = !box.childNodes.length;
	}
	function drawTranscript() {
		var d = capState, box = transcriptBox, wasOpen = box.open;
		box.textContent = '';
		var running = d.run && /queued|running/.test(d.run.status);
		box.hidden = !d.lines.length && !running && !d.canEdit;
		if (box.hidden) return;
		var lang = d.lines.length ? d.lines[0].language || 'en' : null;
		var sum = el('summary');
		sum.append(el('b', '', 'Transcript'), el('span', 'muted', d.lines.length
			? ' · ' + (LANGS[lang] || lang) + ' · ' + d.lines.length.toLocaleString('en-IN') + ' lines, computer-made'
			: running ? ' · being made' : ' · none yet'));
		box.appendChild(sum);
		if (running) {
			var r = d.run, pct = Math.round((r.progress || 0) * 100);
			box.appendChild(el('p', 'transcript__status', r.status === 'queued'
				? 'Waiting to be transcribed' + (r.place ? ' (' + r.place + ' ahead)' : '') + '. It takes about a quarter of the recording’s length.'
				: (r.message || 'Listening') + '… ' + pct + '%'));
		} else if (d.run && d.run.status === 'failed') {
			box.appendChild(el('p', 'error', d.run.message || 'The transcript couldn’t be made.'));
		}
		if (d.canEdit && !running) {
			var acts = el('div', 'transcript__admin');
			var mk = el('button', 'btn btn--quiet btn--small', d.lines.length ? 'Make it again' : 'Make a transcript'); mk.type = 'button';
			mk.title = d.lines.length ? 'Listen to the recording again (lines you corrected are kept)' : 'The computer listens to the recording and writes down what is said';
			mk.addEventListener('click', function () {
				mk.disabled = true;
				capi('/captions/runs', { method: 'POST', body: { target: 'video:' + d.slug } }).then(function () { loadCaptions(d.slug); }).catch(function (ex) { mk.textContent = ex.message; });
			});
			var all = el('button', 'linkish', 'Transcribe every recording without one'); all.type = 'button';
			all.addEventListener('click', function () {
				if (all.dataset.armed !== '1') { all.dataset.armed = '1'; all.textContent = 'Queue them all? Click again'; setTimeout(function () { all.dataset.armed = ''; all.textContent = 'Transcribe every recording without one'; }, 4000); return; }
				var targets = entries.filter(function (e) { return ready[e.slug]; }).map(function (e) { return 'video:' + e.slug; });
				capi('/captions/runs', { method: 'POST', body: { all: true, targets: targets } }).then(function (r) { all.textContent = plural(r.queued.length, 'recording') + ' queued'; loadCaptions(d.slug); })
					.catch(function (ex) { all.textContent = ex.message; });
			});
			acts.append(mk, all);
			box.appendChild(acts);
		}
		if (!d.lines.length) { if (wasOpen || running) box.open = true; return; }
		var tools = el('div', 'transcript__tools');
		var q = el('input', 'field'); q.type = 'search'; q.placeholder = 'Find in the transcript'; q.setAttribute('aria-label', 'Find in the transcript');
		var follow = el('label', 'check'), fb = el('input'); fb.type = 'checkbox'; fb.checked = true; follow.append(fb, el('span', '', 'Follow along'));
		tools.append(q, follow);
		var english = null;
		if (lang !== 'en' && d.lines.some(function (l) { return l.textEn; })) {
			var el2 = el('label', 'check'); english = el('input'); english.type = 'checkbox'; el2.append(english, el('span', '', 'In English')); tools.appendChild(el2);
		}
		box.appendChild(tools);
		var list = el('ol', 'transcript__list'); box.appendChild(list);
		box.appendChild(el('p', 'transcript__note muted', 'Written by the computer from the sound of the tape (Whisper, on this server: the recordings never leave it). It mishears names, overlapping voices and singing' +
			(d.canEdit ? '; correct a line with ✎.' : '; moderators correct lines.')));
		function lineText(l) { return english && english.checked && l.textEn ? l.textEn : l.text; }
		function row(l, i) {
			var li = el('li'); li.dataset.i = i;
			var b = el('button', 'transcript__line'); b.type = 'button';
			b.append(el('span', 'transcript__time', at(Math.floor(l.start))), el('span', 'transcript__text', lineText(l)));
			b.addEventListener('click', function () { fb.checked = true; player.currentTime(l.start); player.play().catch(function () {}); });
			li.appendChild(b);
			if (d.canEdit) {
				var ed = el('button', 'transcript__edit', '✎'); ed.type = 'button'; ed.setAttribute('aria-label', 'Correct this line'); ed.title = 'Correct this line';
				ed.addEventListener('click', function () { editLine(li, l, i); });
				li.appendChild(ed);
			}
			return li;
		}
		function editLine(li, l, i) {
			li.textContent = '';
			var f = el('form', 'transcript__form');
			var t1 = el('input', 'field'); t1.value = l.text; t1.maxLength = 600; t1.setAttribute('aria-label', 'What was said');
			var t2 = null;
			if (lang !== 'en') { t2 = el('input', 'field'); t2.value = l.textEn || ''; t2.maxLength = 600; t2.placeholder = 'In English'; t2.setAttribute('aria-label', 'In English'); }
			var save = el('button', 'btn btn--small', 'Save'), out = el('button', 'linkish', 'Take this line out'), cancel = el('button', 'linkish', 'Cancel'), msg = el('span', 'error');
			save.type = 'submit'; out.type = cancel.type = 'button';
			function send(body) {
				capi('/captions/lines/' + l.id, { method: 'PUT', body: body }).then(function (r) {
					if (r.hidden) { d.lines.splice(i, 1); } else { l.text = r.text; l.textEn = r.textEn; l.edited = true; }
					capState.trackLines = -1; loadCaptions(d.slug);   // the CC track follows
				}).catch(function (ex) { msg.textContent = ex.message; });
			}
			f.addEventListener('submit', function (ev) { ev.preventDefault(); var body = { text: t1.value }; if (t2) body.textEn = t2.value; send(body); });
			out.addEventListener('click', function () { send({ hidden: true }); });
			cancel.addEventListener('click', function () { li.replaceWith(row(l, i)); });
			f.append(el('span', 'transcript__time', at(Math.floor(l.start))), t1);
			if (t2) f.appendChild(t2);
			var a = el('div', 'form-actions'); a.append(save, out, cancel, msg); f.appendChild(a);
			li.appendChild(f); t1.focus();
		}
		function drawLines() {
			list.textContent = '';
			var needle = q.value.trim().toLowerCase();
			d.lines.forEach(function (l, i) {
				if (needle && (l.text + ' ' + (l.textEn || '')).toLowerCase().indexOf(needle) < 0) return;
				list.appendChild(row(l, i));
			});
			if (!list.childNodes.length) list.appendChild(el('li', 'muted', 'Not found in this transcript.'));
			capState.current = -1; markLine();
		}
		q.addEventListener('input', drawLines);
		if (english) english.addEventListener('change', drawLines);
		list.addEventListener('wheel', function () { fb.checked = false; }, { passive: true });
		list.addEventListener('touchmove', function () { fb.checked = false; }, { passive: true });
		capState.list = list; capState.follow = fb;
		drawLines();
		if (wasOpen) box.open = true;
	}
	// The line being said: marked, and kept in view when following along
	function markLine() {
		var d = capState;
		if (!d || !d.list || !d.lines.length) return;
		var t = player.currentTime() || 0, lo = 0, hi = d.lines.length - 1, i = -1;
		while (lo <= hi) { var mid = (lo + hi) >> 1; if (d.lines[mid].start <= t) { i = mid; lo = mid + 1; } else hi = mid - 1; }
		if (i >= 0 && t > d.lines[i].end + 2) i = -1;
		if (i === d.current) return;
		var old = d.list.querySelector('li.is-now'); if (old) old.classList.remove('is-now');
		d.current = i;
		var li = i >= 0 && d.list.querySelector('li[data-i="' + i + '"]');
		if (!li) return;
		li.classList.add('is-now');
		if (transcriptBox.open && d.follow.checked) d.list.scrollTop = li.offsetTop - d.list.offsetTop - d.list.clientHeight / 3;
	}
	player.on('timeupdate', markLine);
	player.on('durationchange', function () { renderTicks(); });
	player.on('error', function () {
		// A 401/404 on the streams means the sign-in ended or access was removed.
		capi('/me').then(function () {
			$('player-error').textContent = 'Playback stopped. Close and press play to try again.';
		}).catch(function (ex) { if (ex.status === 401) signOut(true); });
	});

	function moveWatermark() {
		watermark.style.top = (6 + Math.random() * 74) + '%';
		watermark.style.left = (4 + Math.random() * 62) + '%';
	}

	function play(e, startAt) {
		closePlayer();
		var item = e.item;
		$('player-title').textContent = e.title;
		$('player-date').textContent = e.longDate;
		$('player-error').textContent = '';
		watermark.textContent = 'kodai1994 · ' + new Date().toLocaleDateString('en-GB');
		moveWatermark(); markTimer = setInterval(moveWatermark, 20000);
		$('player').hidden = false;
		$('player').scrollTop = 0;
		document.body.style.overflow = 'hidden';
		$('close').focus();
		loadStoryboard(e.slug, (item.RunTimeTicks || 0) / 1e7);
		mountMarkers(e.slug);
		loadCaptions(e.slug);
		var below = el('div');
		below.appendChild(commentsPanel('video:' + e.slug, {
			timeOf: function () { return player.currentTime(); },
			seek: function (t) { player.currentTime(t); player.play().catch(function () {}); $('player').scrollTo({ top: 0, behavior: 'smooth' }); }
		}));
		mountComments($('player-comments'), below);

		var resumeAt = startAt != null ? startAt : (item.UserData && item.UserData.PlaybackPositionTicks || 0) / 1e7;
		player.playbackRates(RATES); // player.reset() on close empties the list, hiding the speed button
		player.src({ src: HLS + e.slug + '/master.m3u8', type: 'application/x-mpegURL' });
		if (resumeAt > 0) player.one('loadedmetadata', function () { player.currentTime(resumeAt); });
		var started = player.play();
		if (started && started.catch) started.catch(function () {}); // autoplay may be blocked; the big play button stays

		// Jellyfin keeps the viewing position so "Continue watching" works on every device.
		api('/Items/' + item.Id + '/PlaybackInfo?userId=' + session.userId, { method: 'POST', body: { UserId: session.userId, IsPlayback: false } })
			.then(function (info) {
				playing = { itemId: item.Id, mediaSourceId: (info.MediaSources && info.MediaSources[0] || {}).Id || item.Id, playSessionId: info.PlaySessionId };
				api('/Sessions/Playing', { method: 'POST', body: progressBody() }).catch(function () {});
				progressTimer = setInterval(reportProgress, 15000);
			}).catch(function () {});
	}

	function closePlayer() {
		clearInterval(progressTimer); progressTimer = null;
		clearInterval(markTimer); markTimer = null;
		if (player.isFullscreen()) player.exitFullscreen();
		if (playing && session) {
			api('/Sessions/Playing/Stopped', { method: 'POST', keepalive: true, body: progressBody() })
				.then(function () { if (!$('library-view').hidden) openLibrary(); })
				.catch(function () {});
		}
		rateReady = false; // resetting puts the speed back to 1×; that isn't the viewer's choice
		player.pause();
		if (player.currentSrc()) player.reset();
		playing = null;
		clipNow = null; drawClipBar();
		clearCaptionTracks(); capState = null; transcriptBox.hidden = true; $('player-desc').hidden = true;
		sb = null; hidePreview();
		mountMarkers(null);
		mountComments($('player-comments'), null);
		$('player').hidden = true;
		document.body.style.overflow = '';
	}

	// ── Frame previews on the seek bar: hovering (or dragging on a phone) shows the frame
	// at that point. Storyboard = sprite sheets, one frame every `interval` seconds.
	var sb = null, sbFor = null, sbRuntime = 0;
	var progressControl = player.controlBar.progressControl;
	var preview = document.createElement('div');
	preview.className = 'sprite-preview'; preview.hidden = true;
	preview.innerHTML = '<div class="sprite-preview__frame"></div><span class="sprite-preview__time"></span>';
	progressControl.el().appendChild(preview);
	function loadStoryboard(slug, runtime) {
		sb = null; sbFor = slug; sbRuntime = runtime || 0;
		fetch(HLS + slug + '/storyboard/storyboard.json', { credentials: 'same-origin', cache: 'no-store' })
			.then(function (r) { return r.ok ? r.json() : null; })
			.then(function (j) {
				if (!j || sbFor !== slug) return;
				j.base = HLS + slug + '/storyboard/';
				sb = j; new Image().src = j.base + 'sb-001.jpg';
			}).catch(function () {});
	}
	function showPreview(ev) {
		var point = ev.touches && ev.touches.length ? ev.touches[0] : ev;
		var bar = progressControl.seekBar.el().getBoundingClientRect(), box = progressControl.el().getBoundingClientRect();
		var frac = Math.max(0, Math.min(1, (point.clientX - bar.left) / bar.width));
		var d = player.duration() || sbRuntime, t = frac * d;
		preview.style.left = Math.max(84, Math.min(box.width - 84, point.clientX - box.left)) + 'px';
		preview.querySelector('.sprite-preview__time').textContent = fmtDuration(t * 1e7);
		var frame = preview.querySelector('.sprite-preview__frame');
		if (sb) {
			var per = sb.cols * sb.rows, i = Math.min(Math.floor(t / sb.interval), sb.sheets * per - 1);
			var sheet = Math.floor(i / per), k = i % per;
			frame.hidden = false;
			frame.style.backgroundImage = 'url(' + sb.base + 'sb-' + String(sheet + 1).padStart(3, '0') + '.jpg)';
			frame.style.backgroundPosition = -(k % sb.cols) * sb.width + 'px ' + -Math.floor(k / sb.cols) * sb.height + 'px';
		} else {
			frame.hidden = true; // no storyboard yet: just the time
		}
		preview.hidden = false;
	}
	function hidePreview() { preview.hidden = true; }
	progressControl.on(['mousemove', 'touchstart', 'touchmove'], showPreview);
	progressControl.on(['mouseleave', 'touchend', 'touchcancel'], hidePreview);

	$('close').addEventListener('click', closePlayer);
	document.addEventListener('keydown', function (ev) {
		var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
		if (!$('account').hidden) { if (ev.key === 'Escape') closeAccount(); return; }
		if (typing && ev.key !== 'Escape') return;
		if (!$('viewer').hidden) {
			if (ev.key === 'Escape') closePhoto();
			else if (ev.key === 'ArrowRight') showPhoto(photoIndex + 1);
			else if (ev.key === 'ArrowLeft') showPhoto(photoIndex - 1);
			return;
		}
		if (ev.key === 'Escape' && !$('player').hidden && !player.isFullscreen()) closePlayer();
	});
	window.addEventListener('pagehide', function () {
		if (playing && session) api('/Sessions/Playing/Stopped', { method: 'POST', keepalive: true, body: progressBody() }).catch(function () {});
	});

	// ── Boot
	loadSpiral();
	// Signed in already? The cookie says (the page can't read it). A session from before the
	// cookie was HttpOnly still has its token in storage: the server sets the same token again
	// as an HttpOnly cookie, and the copy here is dropped.
	(function boot() {
		var legacy = session && session.token;
		(legacy ? capi('/session/upgrade', { method: 'POST', body: { remember: !!session.remember } }) : capi('/session'))
			.then(function (r) {
				if (r.signedIn === false) { if (session) signOut(true); else show('login'); return; }
				session = { userId: r.userId, name: r.name, remember: !!(session && session.remember) };
				saveSession();
				openLibrary();
			})
			.catch(function (ex) {
				if (ex.status === 401) { if (session) signOut(true); else show('login'); }
				else if (session) openLibrary();   // the community service is down: the recordings may still play
				else show('login');
			});
	})();
})();
