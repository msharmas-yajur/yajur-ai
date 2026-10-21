	// Desktop only: the animated pattern behind the sign-in screen. It pauses on its own
	// whenever the sign-in screen is hidden or the tab is in the background.
	import { createPatternWaves } from '/kodai1994/pattern-waves.js';
	const box = document.getElementById('login-waves');
	const desktop = matchMedia('(min-width: 1025px)');
	let waves = null;
	const sync = () => {
		if (desktop.matches && !waves) {
			waves = createPatternWaves(box, {
				preset: 'silk', color: getComputedStyle(document.documentElement).getPropertyValue('--mist').trim() || '#a9bdb0',
				backgroundColor: 'transparent', opacity: 0.55,
				fade: 'edges', fadeSize: 0.6, interactive: true, cursorSize: 60, cursorStrength: 0.6
			});
		} else if (!desktop.matches && waves) {
			waves.destroy(); waves = null;
		}
	};
	desktop.addEventListener('change', sync);
	// redraw the waves in the new theme's colour
	document.addEventListener('themechange', function () { if (waves) { waves.destroy(); waves = null; } sync(); });
	sync();
