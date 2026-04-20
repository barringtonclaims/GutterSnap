// SMS Companion — shared helper that builds a pre-written text message an
// owner can paste (or open directly in Messages) alongside the quote email.
//
// Usage:
//   SmsCompanion.open({
//       ownerName:       'Max McCaulley',
//       customerName:    'Jane Doe',
//       customerPhone:   '8475551234',   // optional; enables the "Open in Messages" button
//       portalLink:      'https://guttersnapchicago.com/my-quote.html?id=ABC123&t=...'
//   });

(function (global) {
    'use strict';

    function firstName(full) {
        if (!full) return '';
        return String(full).trim().split(/\s+/)[0];
    }

    // US-friendly normalization: digits only, optional +1.
    function normalizePhone(phone) {
        if (!phone) return '';
        const digits = String(phone).replace(/[^\d+]/g, '');
        if (digits.startsWith('+')) return digits;
        if (digits.length === 10) return '+1' + digits;
        if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
        return digits;
    }

    function buildMessage(opts) {
        const owner = firstName(opts.ownerName) || 'the GutterSnap team';
        const customer = firstName(opts.customerName);
        const link = opts.portalLink || '';
        const hi = customer ? `Hi ${customer},` : 'Hi,';
        return [
            `${hi} it's ${owner} with GutterSnap Chicago.`,
            `I just sent your quote over by email — you can also view it anytime here:`,
            link,
            ``,
            `Happy to hop on a quick call whenever works for you today to walk through your options. Just let me know a good time. Thanks!`
        ].join('\n');
    }

    // Build a tel-spec `sms:` URI that works on iOS + macOS Messages + Android.
    // On iOS/macOS the correct query separator is `&`, on Android `?` — using
    // `?&body=` works on both.
    function buildSmsUri(phone, body) {
        const tel = normalizePhone(phone);
        const enc = encodeURIComponent(body || '');
        return tel ? `sms:${tel}?&body=${enc}` : `sms:?&body=${enc}`;
    }

    function ensureStyles() {
        if (document.getElementById('smsCompanionStyles')) return;
        const css = `
        .sms-companion-backdrop {
            position: fixed; inset: 0;
            background: rgba(17, 22, 32, 0.55);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; padding: 20px;
            animation: smsFadeIn 0.18s ease-out;
        }
        @keyframes smsFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .sms-companion {
            background: #fff; border-radius: 14px;
            width: 100%; max-width: 520px;
            box-shadow: 0 24px 60px rgba(0,0,0,0.25);
            overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .sms-companion__head {
            padding: 20px 24px 12px;
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 12px;
        }
        .sms-companion__title { margin: 0; font-size: 17px; font-weight: 600; color: #111; }
        .sms-companion__sub   { margin: 4px 0 0; font-size: 13px; color: #6b7280; }
        .sms-companion__close {
            background: none; border: none; cursor: pointer;
            font-size: 22px; line-height: 1; color: #9ca3af; padding: 4px 8px;
        }
        .sms-companion__close:hover { color: #111; }
        .sms-companion__body { padding: 0 24px 8px; }
        .sms-companion__textarea {
            width: 100%; min-height: 170px;
            border: 1px solid #e5e7eb; border-radius: 10px;
            padding: 12px 14px; font-size: 14.5px; line-height: 1.5;
            color: #111; font-family: inherit;
            resize: vertical; box-sizing: border-box;
        }
        .sms-companion__textarea:focus {
            outline: none; border-color: #EE9844;
            box-shadow: 0 0 0 3px rgba(238,152,68,0.18);
        }
        .sms-companion__meta {
            display: flex; justify-content: space-between; align-items: center;
            font-size: 12px; color: #6b7280; margin-top: 6px;
        }
        .sms-companion__foot {
            padding: 14px 24px 20px; display: flex; gap: 10px; flex-wrap: wrap;
        }
        .sms-companion__btn {
            flex: 1 1 160px; min-width: 140px;
            border: none; border-radius: 10px;
            padding: 12px 16px; font-size: 14.5px; font-weight: 600;
            cursor: pointer; text-align: center; text-decoration: none;
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            transition: transform 0.05s ease, box-shadow 0.15s ease;
        }
        .sms-companion__btn--primary { background: #EE9844; color: #fff; }
        .sms-companion__btn--primary:hover { box-shadow: 0 6px 14px rgba(238,152,68,0.35); }
        .sms-companion__btn--secondary { background: #f3f4f6; color: #111; }
        .sms-companion__btn--secondary:hover { background: #e5e7eb; }
        .sms-companion__btn:active { transform: translateY(1px); }
        .sms-companion__btn[disabled] { opacity: 0.6; cursor: default; }
        .sms-companion__toast {
            position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
            background: #111; color: #fff; padding: 10px 16px; border-radius: 8px;
            font-size: 13.5px; z-index: 10001; opacity: 0;
            transition: opacity 0.2s ease;
        }
        .sms-companion__toast--show { opacity: 1; }
        `;
        const style = document.createElement('style');
        style.id = 'smsCompanionStyles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function toast(msg) {
        let el = document.getElementById('smsCompanionToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'smsCompanionToast';
            el.className = 'sms-companion__toast';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add('sms-companion__toast--show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => el.classList.remove('sms-companion__toast--show'), 2200);
    }

    async function copyText(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (_) { /* fall through */ }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (_) {}
        document.body.removeChild(ta);
        return ok;
    }

    function open(opts) {
        ensureStyles();

        const customer = firstName(opts.customerName) || 'your customer';
        const phone = opts.customerPhone || '';
        const initialBody = buildMessage(opts);

        // Backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'sms-companion-backdrop';
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');

        const normalizedPhone = normalizePhone(phone);
        const subLine = normalizedPhone
            ? `Send this text to ${customer} · ${normalizedPhone}`
            : `Copy this and paste into Messages for ${customer}`;

        backdrop.innerHTML = `
            <div class="sms-companion" onclick="event.stopPropagation()">
                <div class="sms-companion__head">
                    <div>
                        <h3 class="sms-companion__title">Companion text message</h3>
                        <p class="sms-companion__sub">${subLine}</p>
                    </div>
                    <button type="button" class="sms-companion__close" aria-label="Close">&times;</button>
                </div>
                <div class="sms-companion__body">
                    <textarea class="sms-companion__textarea" spellcheck="true"></textarea>
                    <div class="sms-companion__meta">
                        <span class="sms-companion__count">0 chars</span>
                        <span>Edit freely before sending</span>
                    </div>
                </div>
                <div class="sms-companion__foot">
                    <button type="button" class="sms-companion__btn sms-companion__btn--primary" data-action="copy">Copy text</button>
                    ${normalizedPhone
                        ? `<a class="sms-companion__btn sms-companion__btn--secondary" data-action="sms" href="#">Open in Messages</a>`
                        : `<button type="button" class="sms-companion__btn sms-companion__btn--secondary" data-action="sms-generic">Open Messages</button>`}
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);

        const ta = backdrop.querySelector('.sms-companion__textarea');
        const count = backdrop.querySelector('.sms-companion__count');
        const copyBtn = backdrop.querySelector('[data-action="copy"]');
        const smsEl = backdrop.querySelector('[data-action="sms"], [data-action="sms-generic"]');
        const closeBtn = backdrop.querySelector('.sms-companion__close');

        ta.value = initialBody;

        function refresh() {
            const text = ta.value;
            count.textContent = `${text.length} chars`;
            if (smsEl && smsEl.tagName === 'A') {
                smsEl.href = buildSmsUri(phone, text);
            } else if (smsEl) {
                smsEl.onclick = () => {
                    window.location.href = buildSmsUri('', ta.value);
                };
            }
        }
        ta.addEventListener('input', refresh);
        refresh();

        function close() {
            backdrop.remove();
            document.removeEventListener('keydown', onKey);
        }
        function onKey(e) {
            if (e.key === 'Escape') close();
        }
        document.addEventListener('keydown', onKey);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) close();
        });
        closeBtn.addEventListener('click', close);

        copyBtn.addEventListener('click', async () => {
            const ok = await copyText(ta.value);
            if (ok) {
                copyBtn.textContent = 'Copied!';
                toast('Text copied to clipboard');
                setTimeout(() => { copyBtn.textContent = 'Copy text'; }, 1800);
            } else {
                toast('Could not copy — select and copy manually');
            }
        });

        setTimeout(() => ta.focus(), 50);
    }

    global.SmsCompanion = { open, buildMessage, buildSmsUri, normalizePhone };
})(window);
