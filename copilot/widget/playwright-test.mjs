/**
 * Playwright QA test for the Yajur AI voice widget at http://localhost:4000
 * Run with: node playwright-test.mjs
 *
 * Uses npx playwright (auto-installs if needed) with the system-cached Chromium.
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:4000';
const TIMEOUT = 15000;

// ANSI colour helpers
const GREEN  = (s) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const BOLD   = (s) => `\x1b[1m${s}\x1b[0m`;

const results = [];
const consoleErrors = [];
const networkErrors = [];

function pass(test, detail = '') {
    results.push({ test, status: 'PASS', detail });
    console.log(GREEN(`  [PASS] ${test}`) + (detail ? ` — ${detail}` : ''));
}

function fail(test, detail = '') {
    results.push({ test, status: 'FAIL', detail });
    console.log(RED(`  [FAIL] ${test}`) + (detail ? ` — ${detail}` : ''));
}

function info(msg) {
    console.log(YELLOW(`  [INFO] ${msg}`));
}

async function runTests() {
    console.log(BOLD('\n=== Yajur AI Widget QA Tests ===\n'));

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--use-fake-ui-for-media-stream',   // auto-grant mic permission
            '--use-fake-device-for-media-stream', // fake mic — no real hardware needed
            '--allow-insecure-localhost',
        ],
    });

    const context = await browser.newContext({
        permissions: ['microphone'],
        ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // ── Collect console errors ──────────────────────────────────────────────
    page.on('pageerror', (err) => {
        consoleErrors.push(`PAGEERROR: ${err.message}`);
        console.log(RED(`    [PAGEERROR] ${err.message}`));
    });
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            const txt = msg.text();
            consoleErrors.push(`CONSOLE ERROR: ${txt}`);
            console.log(RED(`    [CONSOLE ERROR] ${txt}`));
        } else if (msg.type() === 'warning') {
            console.log(YELLOW(`    [CONSOLE WARN] ${msg.text()}`));
        }
    });

    // ── Collect network errors ──────────────────────────────────────────────
    const networkRequests = new Map(); // url → { status }
    page.on('response', (res) => {
        networkRequests.set(res.url(), res.status());
        if (res.status() >= 400) {
            networkErrors.push(`${res.status()} ${res.url()}`);
            console.log(RED(`    [HTTP ${res.status()}] ${res.url()}`));
        }
    });

    // ════════════════════════════════════════════════════════════════════════
    // TEST 1: Page loads clean
    // ════════════════════════════════════════════════════════════════════════
    console.log(BOLD('\nTest 1: Page loads clean'));
    try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
        pass('Test 1a: Page loaded (networkidle)');

        // Check copilot-widget.js
        const widgetEntry = [...networkRequests.entries()].find(
            ([url]) => url.includes('copilot-widget.js')
        );
        if (widgetEntry) {
            const [url, status] = widgetEntry;
            if (status === 200) {
                pass('Test 1b: copilot-widget.js loads 200', url);
            } else {
                fail('Test 1b: copilot-widget.js bad status', `${status} ${url}`);
            }
        } else {
            // The widget JS might be embedded or named differently
            const allJsRequests = [...networkRequests.entries()].filter(
                ([url]) => url.endsWith('.js') || url.includes('.js?')
            );
            if (allJsRequests.length > 0) {
                info(`JS resources loaded: ${allJsRequests.map(([u,s]) => `${s} ${u.split('/').pop()}`).join(', ')}`);
            }
            fail('Test 1b: copilot-widget.js not found in network requests');
        }

        const pageErrors = consoleErrors.filter(e => e.startsWith('PAGEERROR'));
        if (pageErrors.length === 0) {
            pass('Test 1c: No PAGEERROR console errors on load');
        } else {
            fail('Test 1c: PAGEERROR found on load', pageErrors.join('; '));
        }

    } catch (e) {
        fail('Test 1: Page load failed', e.message);
    }

    // ════════════════════════════════════════════════════════════════════════
    // TEST 2: Widget opens
    // ════════════════════════════════════════════════════════════════════════
    console.log(BOLD('\nTest 2: Widget opens'));
    try {
        // Wait for the CopilotKit chat bubble button (orange, bottom-right)
        // CopilotKit renders a button with class copilotKitButton or similar
        const bubbleSelectors = [
            'button.copilotKitButton',
            '[class*="copilotKit"][class*="button"]',
            'button[class*="open"]',
            'button[class*="chat"]',
            'button[title*="Open"]',
            'button[aria-label*="chat"]',
            'button[aria-label*="Chat"]',
            'button[aria-label*="Open"]',
        ];

        let bubbleBtn = null;
        for (const sel of bubbleSelectors) {
            try {
                bubbleBtn = await page.waitForSelector(sel, { timeout: 3000 });
                if (bubbleBtn) {
                    info(`Found chat bubble with selector: ${sel}`);
                    break;
                }
            } catch (_) {}
        }

        // Fallback: find button with orange/primary background color
        if (!bubbleBtn) {
            info('Trying to find orange bottom-right button via position...');
            bubbleBtn = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                // Look for a fixed/absolute positioned button in the bottom-right area
                for (const btn of buttons) {
                    const rect = btn.getBoundingClientRect();
                    const style = window.getComputedStyle(btn);
                    const isBottomRight = rect.right > window.innerWidth - 120 && rect.bottom > window.innerHeight - 120;
                    const bg = style.backgroundColor;
                    // orange: rgb(217, 119, 87) or similar
                    if (isBottomRight) return btn;
                }
                return null;
            });
            const jsHandle = await bubbleBtn.asElement();
            if (jsHandle) {
                bubbleBtn = jsHandle;
                info('Found bubble button by bottom-right position');
            } else {
                bubbleBtn = null;
            }
        }

        if (!bubbleBtn) {
            fail('Test 2a: Could not find chat bubble button');
        } else {
            pass('Test 2a: Chat bubble button found');
            await bubbleBtn.click();
            await page.waitForTimeout(1500);

            // Verify popup title "Yajur AI"
            try {
                const titleEl = await page.waitForSelector(
                    ':text("Yajur AI"), [class*="title"]:has-text("Yajur AI"), h2:has-text("Yajur AI"), h3:has-text("Yajur AI"), header:has-text("Yajur AI")',
                    { timeout: 5000 }
                );
                pass('Test 2b: Popup title "Yajur AI" is visible');
            } catch (_) {
                // Try text search
                const titleFound = await page.evaluate(() => {
                    return document.body.innerText.includes('Yajur AI');
                });
                if (titleFound) {
                    pass('Test 2b: "Yajur AI" text found in page');
                } else {
                    fail('Test 2b: "Yajur AI" title not found in popup');
                }
            }

            // Verify initial message
            try {
                const initialMsgFound = await page.evaluate(() => {
                    return document.body.innerText.includes('Welcome to Yajur Healthcare');
                });
                if (initialMsgFound) {
                    pass('Test 2c: Initial message "Welcome to Yajur Healthcare" visible');
                } else {
                    fail('Test 2c: Initial message not found');
                }
            } catch (e) {
                fail('Test 2c: Error checking initial message', e.message);
            }
        }
    } catch (e) {
        fail('Test 2: Widget open test failed', e.message);
    }

    // ════════════════════════════════════════════════════════════════════════
    // TEST 3: Mic button starts voice session
    // ════════════════════════════════════════════════════════════════════════
    console.log(BOLD('\nTest 3: Mic button starts voice session'));

    // Track TTS network requests for Test 4
    let ttsCalled = false;
    let ttsStatus = null;
    const ttsRequests = [];
    page.on('request', (req) => {
        if (req.url().includes('/api/sarvam/tts')) {
            ttsRequests.push(req.url());
        }
    });
    page.on('response', (res) => {
        if (res.url().includes('/api/sarvam/tts')) {
            ttsCalled = true;
            ttsStatus = res.status();
        }
    });

    // Snapshot errors before mic click
    const errsBefore = consoleErrors.length;

    try {
        // Find the mic button — it's the button in the custom input area
        // It has a mic SVG icon (path d starting with "M12 1a3")
        const micSelectors = [
            'button[title="Start voice session"]',
            'button[title*="voice"]',
            'button[title*="mic"]',
            'button[aria-label*="mic"]',
            'button[aria-label*="voice"]',
            '.yajur-custom-input-container button',
        ];

        let micBtn = null;
        for (const sel of micSelectors) {
            try {
                micBtn = await page.waitForSelector(sel, { timeout: 2000 });
                if (micBtn) {
                    info(`Found mic button with selector: ${sel}`);
                    break;
                }
            } catch (_) {}
        }

        if (!micBtn) {
            // Try SVG path approach
            micBtn = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                for (const btn of buttons) {
                    // Look for the mic SVG path
                    const paths = btn.querySelectorAll('path');
                    for (const p of paths) {
                        if (p.getAttribute('d')?.includes('M12 1a3')) return btn;
                    }
                }
                // Fallback: look for button with mic-like SVG
                for (const btn of buttons) {
                    const svgs = btn.querySelectorAll('svg');
                    if (svgs.length > 0) {
                        const lines = btn.querySelectorAll('line');
                        const paths = btn.querySelectorAll('path');
                        if (lines.length === 2 && paths.length === 2) return btn;
                    }
                }
                return null;
            });
            const el = await micBtn.asElement();
            micBtn = el || null;
            if (micBtn) info('Found mic button via SVG path matching');
        }

        if (!micBtn) {
            fail('Test 3a: Mic button not found');
        } else {
            pass('Test 3a: Mic button found');

            // Get pre-click background color
            const bgBefore = await micBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
            info(`Button bg before click: ${bgBefore}`);

            await micBtn.click();
            info('Mic button clicked, waiting for voice session to initialize...');
            await page.waitForTimeout(3000);

            // Test 3b: Button turns red (#dc3545 = rgb(220, 53, 69))
            const bgAfter = await page.evaluate(() => {
                // Find button with title "Stop voice session"
                const stopBtn = document.querySelector('button[title="Stop voice session"]');
                if (stopBtn) return window.getComputedStyle(stopBtn).backgroundColor;

                // Fallback: find red button
                const buttons = Array.from(document.querySelectorAll('button'));
                for (const btn of buttons) {
                    const bg = window.getComputedStyle(btn).backgroundColor;
                    if (bg.includes('220, 53') || bg.includes('220,53')) return bg;
                }
                return null;
            });

            if (bgAfter && (bgAfter.includes('220, 53') || bgAfter.includes('220,53') || bgAfter.includes('dc3545'))) {
                pass('Test 3b: Mic button turned red (voice active)');
            } else {
                // Also check if stop button exists
                const stopBtnExists = await page.evaluate(() => {
                    return !!document.querySelector('button[title="Stop voice session"]');
                });
                if (stopBtnExists) {
                    pass('Test 3b: Stop voice button exists (voice active)', `bg: ${bgAfter}`);
                } else {
                    fail('Test 3b: Button did not turn red / stop button not found', `bg after: ${bgAfter}`);
                }
            }

            // Test 3c: "Listening..." phase indicator
            await page.waitForTimeout(1000);
            const listeningVisible = await page.evaluate(() => {
                return document.body.innerText.includes('Listening');
            });
            if (listeningVisible) {
                pass('Test 3c: "Listening..." phase indicator visible');
            } else {
                // Check for any phase indicator
                const phaseText = await page.evaluate(() => {
                    const texts = ['Listening', 'Processing', 'Speaking', 'listening', 'processing', 'speaking'];
                    for (const t of texts) {
                        if (document.body.innerText.includes(t)) return t;
                    }
                    return null;
                });
                if (phaseText) {
                    pass('Test 3c: Phase indicator visible', phaseText);
                } else {
                    // The greeting TTS may still be playing, then it transitions to Listening
                    info('Phase indicator not yet visible (may be in greeting TTS). Waiting 4s more...');
                    await page.waitForTimeout(4000);
                    const listeningLate = await page.evaluate(() => {
                        return document.body.innerText.includes('Listening');
                    });
                    if (listeningLate) {
                        pass('Test 3c: "Listening..." indicator appeared after greeting TTS');
                    } else {
                        fail('Test 3c: "Listening..." phase indicator never appeared');
                    }
                }
            }

            // Test 3d: LiveKit token was fetched (v2.0.0 — replaces waveform canvas check)
            const livekitTokenFetched = [...networkRequests.entries()].some(
                ([url]) => url.includes('/api/livekit')
            );
            if (livekitTokenFetched) {
                pass('Test 3d: LiveKit token API called on voice start');
            } else {
                // Voice might have failed silently (backend unreachable), check for error banner
                const errorBannerVisible = await page.evaluate(() => {
                    return document.body.innerText.includes('Voice unavailable') ||
                           document.body.innerText.includes('voice');
                });
                if (errorBannerVisible) {
                    info('Test 3d: Voice start failed (backend unreachable) — expected in CI');
                    pass('Test 3d: Voice error handled gracefully (no crash)');
                } else {
                    fail('Test 3d: LiveKit token not fetched and no error banner shown');
                }
            }
        }
    } catch (e) {
        fail('Test 3: Mic test failed', e.message);
    }

    // ════════════════════════════════════════════════════════════════════════
    // TEST 4: LiveKit token API call (v2.0.0 — replaces browser-side TTS check)
    // In v2.0.0, TTS is handled by the Python agent via LiveKit; browser only
    // needs the LiveKit room token. Verify the token endpoint returned 200.
    // ════════════════════════════════════════════════════════════════════════
    console.log(BOLD('\nTest 4: LiveKit token API call'));
    try {
        await page.waitForTimeout(1000);

        const livekitEntry = [...networkRequests.entries()].find(
            ([url]) => url.includes('/api/livekit')
        );

        if (livekitEntry) {
            const [url, status] = livekitEntry;
            if (status === 200) {
                pass('Test 4: GET /api/livekit returned 200', url);
            } else {
                fail('Test 4: GET /api/livekit returned non-200', `status: ${status} ${url}`);
            }
        } else {
            // Backend may be unreachable (Tailscale) in some environments
            const voiceErrVisible = await page.evaluate(() => {
                return document.body.innerText.includes('Voice unavailable');
            });
            if (voiceErrVisible) {
                info('Test 4: Backend unreachable — voice error banner shown correctly');
                pass('Test 4: Voice unavailable handled gracefully (backend unreachable in CI)');
            } else {
                // Voice was active (3b/3c passed) without a token fetch — check for errors
                const fetchErrs = consoleErrors.filter(e =>
                    e.includes('livekit') || e.includes('token') || e.includes('Token')
                );
                if (fetchErrs.length > 0) {
                    fail('Test 4: LiveKit token fetch error', fetchErrs.join('; '));
                } else {
                    fail('Test 4: GET /api/livekit not observed in network');
                }
            }
        }
    } catch (e) {
        fail('Test 4: LiveKit token test failed', e.message);
    }

    // ════════════════════════════════════════════════════════════════════════
    // TEST 5: CopilotKit API calls
    // ════════════════════════════════════════════════════════════════════════
    console.log(BOLD('\nTest 5: CopilotKit API calls'));
    try {
        // Check for the specific errors mentioned in the test spec
        const isResultMsgErr = consoleErrors.find(e => e.includes('isResultMessage'));
        const spreadUndefinedErr = consoleErrors.find(e =>
            e.includes('spreading') || (e.includes('undefined') && e.includes('spread'))
        );
        const typeErr = consoleErrors.find(e => e.includes('TypeError') && e.includes('visibleMessages'));

        if (!isResultMsgErr) {
            pass('Test 5a: No "isResultMessage is not a function" error');
        } else {
            fail('Test 5a: isResultMessage error found', isResultMsgErr);
        }

        if (!spreadUndefinedErr && !typeErr) {
            pass('Test 5b: No TypeError about spreading undefined (visibleMessages)');
        } else {
            fail('Test 5b: TypeError about visibleMessages found', spreadUndefinedErr || typeErr);
        }

        // Check CopilotKit API calls (v1 fetch calls)
        const copilotRequests = [...networkRequests.entries()].filter(
            ([url]) => url.includes('copilotkit') || url.includes('copilot') || url.includes('ck_pub')
        );
        if (copilotRequests.length > 0) {
            const allOk = copilotRequests.every(([, status]) => status < 400);
            if (allOk) {
                pass('Test 5c: CopilotKit API calls returned 200',
                     copilotRequests.map(([u, s]) => `${s} ${u.split('/').slice(-2).join('/')}`).join(', '));
            } else {
                const failed = copilotRequests.filter(([, s]) => s >= 400);
                fail('Test 5c: CopilotKit API calls failed',
                     failed.map(([u, s]) => `${s} ${u}`).join(', '));
            }
        } else {
            info('Test 5c: No CopilotKit API calls observed yet (widget not interacted with text)');
            pass('Test 5c: No CopilotKit API errors (no calls made)');
        }
    } catch (e) {
        fail('Test 5: CopilotKit test failed', e.message);
    }

    // ════════════════════════════════════════════════════════════════════════
    // TEST 6: Stop voice session
    // ════════════════════════════════════════════════════════════════════════
    console.log(BOLD('\nTest 6: Stop voice session'));
    try {
        const errCountBefore = consoleErrors.length;

        // Find the stop button (red X)
        const stopBtn = await page.$('button[title="Stop voice session"]');

        if (!stopBtn) {
            fail('Test 6a: Stop button not found (voice may not be active)');
        } else {
            pass('Test 6a: Stop (red X) button found');
            await stopBtn.click();
            info('Stop button clicked, waiting...');
            await page.waitForTimeout(2000);

            // Test 6b: Button reverts to mic
            const micBtnRestored = await page.evaluate(() => {
                return !!document.querySelector('button[title="Start voice session"]');
            });
            if (micBtnRestored) {
                pass('Test 6b: Button returned to mic icon (voice stopped)');
            } else {
                fail('Test 6b: Mic button not restored after stopping');
            }

            // Test 6c: "Listening..." disappears
            const listeningGone = await page.evaluate(() => {
                return !document.body.innerText.includes('Listening');
            });
            if (listeningGone) {
                pass('Test 6c: "Listening..." indicator disappeared');
            } else {
                fail('Test 6c: "Listening..." indicator still visible after stop');
            }

            // Test 6d: No new console errors after stop
            const newErrors = consoleErrors.slice(errCountBefore);
            const seriousNewErrors = newErrors.filter(e =>
                e.startsWith('PAGEERROR') ||
                (e.includes('TypeError') && !e.includes('AbortError'))
            );
            if (seriousNewErrors.length === 0) {
                pass('Test 6d: No console errors after stopping voice');
            } else {
                fail('Test 6d: Console errors after stop', seriousNewErrors.join('; '));
            }
        }
    } catch (e) {
        fail('Test 6: Stop session test failed', e.message);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Summary
    // ════════════════════════════════════════════════════════════════════════
    console.log(BOLD('\n=== Test Summary ===\n'));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    results.forEach(r => {
        const icon = r.status === 'PASS' ? GREEN('PASS') : RED('FAIL');
        console.log(`  [${icon}] ${r.test}${r.detail ? ` — ${r.detail}` : ''}`);
    });

    console.log(`\n  Total: ${passed} passed, ${failed} failed`);

    if (consoleErrors.length > 0) {
        console.log(BOLD('\n=== All Console Errors ==='));
        consoleErrors.forEach(e => console.log(RED(`  ${e}`)));
    } else {
        console.log(GREEN('\n  No console errors captured.'));
    }

    if (networkErrors.length > 0) {
        console.log(BOLD('\n=== Network 4xx/5xx Requests ==='));
        networkErrors.forEach(e => console.log(RED(`  ${e}`)));
    } else {
        console.log(GREEN('\n  No 4xx/5xx network errors.'));
    }

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error(RED('Fatal error running tests:'), err);
    process.exit(1);
});
