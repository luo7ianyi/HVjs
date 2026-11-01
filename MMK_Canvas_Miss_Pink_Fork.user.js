// ==UserScript==
// @name         MMK Canvas Miss Pink Fork
// @namespace    mmk
// @description  Canvas-rendered attack effects and damage numbers for hentaiverse
// @match        *://*.hentaiverse.org/*
// @include      *://*hentaiverse.org/?s=Battle
// @include      *://*hentaiverse.org/isekai/?s=Battle
// @grant        GM_addStyle
// @grant        unsafeWindow
// @version      26.11.01.03
// @author       쿠루링빵 (canvas port) & 粉色甜心小姐
// ==/UserScript==

// ── Precomputed constants — avoids repeated property/Math lookups in hot paths ──
const PI2 = Math.PI * 2;

// =============================================================================
// Canvas Manager — dual-canvas: battle canvas over #battle_right (1:1),
// preview canvas over full viewport for settings panel (created on demand).
// =============================================================================
const CanvasManager = (() => {
    // ── Battle canvas — covers only #battle_right, 1:1 pixel rendering ──
    let canvas, ctx, animFrameId = null;
    const effects = [];
    const MAX_EFFECTS = 200;
    let _lastFrameTime = 0;

    // ── Preview canvas — full-viewport, created when settings panel opens ──
    let previewCanvas, previewCtx, previewAnimFrameId = null;
    const previewEffects = [];
    const MAX_PREVIEW_EFFECTS = 50;
    let _previewLastFrameTime = 0;

    // ── Performance probe (check __mmkPerf in console) ──
    const perf = { frames: 0, totalMs: 0, avgMs: 0, lastMs: 0, maxMs: 0 };
    unsafeWindow.__mmkPerf = perf;

    function getBattleArea() {
        return document.getElementById('battle_right');
    }

    // ── Battle canvas lifecycle ──

    function init() {
        if (canvas) return;
        canvas = document.createElement('canvas');
        canvas.id = 'mmk-canvas';
        canvas.style.cssText =
        'position:fixed;pointer-events:none;z-index:9998;';
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('scroll', resize, { passive: true });
    }

    function resize() {
        const csp = document.getElementById('csp');
        if (!csp) return;
        const rect = csp.getBoundingClientRect();
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        canvas.style.left = rect.left + 'px';
        canvas.style.top = rect.top + 'px';
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
    }

    function ensureCanvasInDOM() {
        if (canvas && canvas.parentNode !== document.body) {
            document.body.appendChild(canvas);
        }
    }

    /**
     * Returns the viewport offset of the battle canvas top-left corner.
     * Used to convert viewport-relative coordinates into canvas-local coords.
     */
    function getViewportOffset() {
        const csp = document.getElementById('csp');
        if (!csp) return { x: 0, y: 0 };
        const rect = csp.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
    }

    function addEffect(effect) {
        while (effects.length >= MAX_EFFECTS) {
            effects.shift();
        }
        effect.startTime = performance.now();
        effects.push(effect);
        if (!animFrameId) {
            _lastFrameTime = 0;
            animFrameId = requestAnimationFrame(renderLoop);
        }
    }

    function renderLoop() {
        const now = performance.now();
        if (now - _lastFrameTime < 1000 / $config.targetFPS) {
            animFrameId = requestAnimationFrame(renderLoop);
            return;
        }
        _lastFrameTime = now;

        ensureCanvasInDOM();

        const t0 = now;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const inv = 0.001;
        let w = 0;
        for (let i = 0; i < effects.length; i++) {
            const e = effects[i];
            const elapsed = (now - e.startTime) * inv;
            if (elapsed >= e.duration) continue;
            e.draw(ctx, elapsed);
            if (w !== i) effects[w] = effects[i];
            w++;
        }
        effects.length = w;

        const dt = performance.now() - t0;
        perf.lastMs = dt;
        perf.maxMs = Math.max(perf.maxMs, dt);
        perf.totalMs += dt;
        perf.frames++;
        perf.avgMs = perf.totalMs / perf.frames;

        if (effects.length > 0) {
            animFrameId = requestAnimationFrame(renderLoop);
        } else {
            animFrameId = null;
        }
    }

    // ── Preview canvas lifecycle (settings panel only) ──

    function initPreview() {
        if (previewCanvas) return;
        previewCanvas = document.createElement('canvas');
        previewCanvas.id = 'mmk-preview-canvas';
        previewCanvas.style.cssText =
        'position:fixed;top:0;left:0;pointer-events:none;z-index:9999;';
        previewCanvas.width = window.innerWidth;
        previewCanvas.height = window.innerHeight;
        previewCanvas.style.width = window.innerWidth + 'px';
        previewCanvas.style.height = window.innerHeight + 'px';
        document.body.appendChild(previewCanvas);
        previewCtx = previewCanvas.getContext('2d');
        window.addEventListener('resize', resizePreview);
    }

    function resizePreview() {
        if (!previewCanvas) return;
        previewCanvas.width = window.innerWidth;
        previewCanvas.height = window.innerHeight;
        previewCanvas.style.width = window.innerWidth + 'px';
        previewCanvas.style.height = window.innerHeight + 'px';
    }

    function destroyPreview() {
        if (previewCanvas) {
            window.removeEventListener('resize', resizePreview);
            if (previewAnimFrameId) cancelAnimationFrame(previewAnimFrameId);
            previewAnimFrameId = null;
            previewEffects.length = 0;
            previewCanvas.remove();
            previewCanvas = null;
            previewCtx = null;
        }
    }

    function addPreviewEffect(effect) {
        if (!previewCanvas) initPreview();
        while (previewEffects.length >= MAX_PREVIEW_EFFECTS) {
            previewEffects.shift();
        }
        effect.startTime = performance.now();
        previewEffects.push(effect);
        if (!previewAnimFrameId) {
            _previewLastFrameTime = 0;
            previewAnimFrameId = requestAnimationFrame(previewRenderLoop);
        }
    }

    function previewRenderLoop() {
        const now = performance.now();
        // ── Frame throttle: target 30 fps ──
        if (now - _previewLastFrameTime < 1000 / $config.targetFPS) {
            previewAnimFrameId = requestAnimationFrame(previewRenderLoop);
            return;
        }
        _previewLastFrameTime = now;

        if (!previewCanvas || !previewCtx) return;
        if (previewCanvas.parentNode !== document.body) {
            document.body.appendChild(previewCanvas);
        }
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

        const inv = 0.001;
        let w = 0;
        for (let i = 0; i < previewEffects.length; i++) {
            const e = previewEffects[i];
            const elapsed = (now - e.startTime) * inv;
            if (elapsed >= e.duration) continue;
            e.draw(previewCtx, elapsed);
            if (w !== i) previewEffects[w] = previewEffects[i];
            w++;
        }
        previewEffects.length = w;

        if (previewEffects.length > 0) {
            previewAnimFrameId = requestAnimationFrame(previewRenderLoop);
        } else {
            previewAnimFrameId = null;
        }
    }

    return {
        init, ensureCanvasInDOM, addEffect,
        getViewportOffset,
        initPreview, destroyPreview, addPreviewEffect,
        resetPerf() { perf.frames = 0; perf.totalMs = 0; perf.avgMs = 0; perf.lastMs = 0; perf.maxMs = 0; },
    };
})();

// =============================================================================
// Canvas effect factories — damage text + explosion
// =============================================================================

/** Convert "#RRGGBB" or "#RRGGBBAA" hex to "rgba(r,g,b,a)" for Canvas API. */
function hexToCanvasRgba(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = hex.length >= 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
    return `rgba(${r},${g},${b},${a})`;
}

/**
 * Evaluate a CSS cubic-bezier easing curve at progress p ∈ [0, 1].
 * Uses Newton-Raphson to invert x(t) and return y(t).
 */
function cubicBezierEase(p, x1, y1, x2, y2) {
    if (p <= 0) return 0;
    if (p >= 1) return 1;

    // Newton-Raphson: find parametric t such that x(t) = p
    let t = p;
    for (let i = 0; i < 8; i++) {
        const omt = 1 - t;
        const omt2 = omt * omt;
        const t2 = t * t;
        // x(t) = 3(1-t)²·t·x₁ + 3(1-t)·t²·x₂ + t³
        const x = 3 * omt2 * t * x1 + 3 * omt * t2 * x2 + t * t2;
        // dx/dt = 3(1-t)²·x₁ + 6(1-t)·t·(x₂-x₁) + 3t²·(1-x₂)
        const dx = 3 * omt2 * x1 + 6 * omt * t * (x2 - x1) + 3 * t2 * (1 - x2);
        if (Math.abs(dx) < 1e-7) break;
        t -= (x - p) / dx;
        t = Math.max(0, Math.min(1, t));
    }

    const omt = 1 - t;
    const omt2 = omt * omt;
    const t2 = t * t;
    // y(t) = 3(1-t)²·t·y₁ + 3(1-t)·t²·y₂ + t³
    return 3 * omt2 * t * y1 + 3 * omt * t2 * y2 + t * t2;
}

// ── Precomputed easing LUTs — ~50× faster than Newton-Raphson per lookup ──
// Float64Array guarantees unboxed doubles — no GC, cache-friendly sequential access.
const EASE_BOUNCE_LUT = new Float64Array(256); // cubic-bezier(0.175,0.885,0.32,1.42)
const EASE_OUT_LUT   = new Float64Array(256); // cubic-bezier(0,0,0.25,1)
(function() {
    for (let i = 0; i < 256; i++) {
        const p = i / 255;
        EASE_BOUNCE_LUT[i] = cubicBezierEase(p, 0.175, 0.885, 0.32, 1.42);
        EASE_OUT_LUT[i]   = cubicBezierEase(p, 0, 0, 0.25, 1);
    }
})();

/** bounceEase(p) — LUT-backed, ~0.1 ns vs ~50 ns for Newton-Raphson */
function bounceEase(p) {
    return EASE_BOUNCE_LUT[p <= 0 ? 0 : p >= 1 ? 255 : (p * 255) | 0];
}
/** easeOutEase(p) */
function easeOutEase(p) {
    return EASE_OUT_LUT[p <= 0 ? 0 : p >= 1 ? 255 : (p * 255) | 0];
}

// ── Glyph sprite cache — pre-rendered digit images ──
// Each glyph is rendered at GLYPH_OVERSAMPLE × fontSize to preserve quality when
// animation scales up (max popScale ~2.1).  One drawImage call replaces the
// save+translate+scale+strokeText+fillText+restore chain — roughly 6× fewer
// GPU operations per digit per frame.
const GLYPH_OVERSAMPLE = 3;
const GLYPH_CACHE = new Map();
const GLYPH_MAX_CACHE = 500;
const RAINBOW_GLYPH_CACHE = new Map();
const RAINBOW_GLYPH_MAX_CACHE = 500;

function clearGlyphCache() {
    GLYPH_CACHE.clear();
    RAINBOW_GLYPH_CACHE.clear();
}

/**
 * 生成用于 Flow Rainbow 的重复渐变底图。
 * 颜色按顺序从顶部到底部排列，首尾无缝相连。
 */
function getOrCreateFlowCanvas(colors) {
}

const graphemeSegmenter = (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
: null;

function splitTextToGlyphs(text) {
    if (graphemeSegmenter) {
        const out = [];
        for (const seg of graphemeSegmenter.segment(text)) out.push(seg.segment);
        return out;
    }
    // Fallback：把变体选择符 / 组合符拼到前一个字符上
    const out = [];
    for (const ch of text) {
        if (out.length > 0 && /^[\uFE00-\uFE0F\u200D\u0300-\u036F]$/.test(ch)) {
            out[out.length - 1] += ch;
        } else {
            out.push(ch);
        }
    }
    return out;
}

function getGlyph(char, fontSize, fontFamily, fillColor, strokeColor, italic = false) {
    const key = `${italic ? 'i' : 'n'}|${char}|${fontSize}|${fontFamily}|${fillColor}|${strokeColor}`;
    let entry = GLYPH_CACHE.get(key);
    if (entry) return entry;

    const renderSize = fontSize * GLYPH_OVERSAMPLE;
    const font = `${italic ? 'italic ' : ''}bold ${renderSize}px ${fontFamily}`;
    const lw = 2.9 * GLYPH_OVERSAMPLE;

    // Measure glyph width on a scratch canvas
    const tmp = document.createElement('canvas');
    const tctx = tmp.getContext('2d');
    tctx.font = font;
    const metrics = tctx.measureText(char);

    const pad = Math.ceil(lw * 2) + 8;
    // Italic glyphs lean to the right; add symmetric padding so the slanted
    // ink never gets clipped by the sprite bounds.  Centre stays at cx, so
    // layout (baseWidth / spacing) is unaffected.
    const slantPad = italic ? Math.ceil(renderSize * 0.25) : 0;
    const cx = Math.ceil(metrics.width / 2) + Math.ceil(lw) + 4 + slantPad;
    const w = cx * 2;
    const h = Math.ceil(renderSize * 1.4) + pad;
    const cy = h / 2;

    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d');
    octx.font = font;
    octx.strokeStyle = strokeColor;
    octx.fillStyle   = fillColor;
    octx.lineWidth   = lw;
    octx.lineJoin    = 'round';
    octx.miterLimit  = 2;
    octx.textAlign   = 'center';
    octx.textBaseline = 'middle';
    octx.strokeText(char, cx, cy);
    octx.fillText(char, cx, cy);

    // Evict oldest if cache too large
    if (GLYPH_CACHE.size >= GLYPH_MAX_CACHE) {
        const firstKey = GLYPH_CACHE.keys().next().value;
        GLYPH_CACHE.delete(firstKey);
    }

    entry = {
        canvas: off,
        baseWidth: metrics.width / GLYPH_OVERSAMPLE,
        originX: cx,
        originY: cy,
    };
    GLYPH_CACHE.set(key, entry);
    return entry;
}

/**
 * Rainbow variant of getGlyph — fills the glyph with a horizontal gradient
 * that spans the *whole* string, so colours flow left→right across glyphs.
 * charLeftOffset / totalWidth are in global (un-oversampled) pixels.
 */
function getRainbowGlyph(char, fontSize, fontFamily, strokeColor, italic, rainbowColors, charLeftOffset, totalWidth) {
    const key = `${italic ? 'i' : 'n'}|${char}|${fontSize}|${fontFamily}|${strokeColor}|${rainbowColors.join(',')}|${charLeftOffset}|${totalWidth}`;
    let entry = RAINBOW_GLYPH_CACHE.get(key);
    if (entry) return entry;

    const renderSize = fontSize * GLYPH_OVERSAMPLE;
    const font = `${italic ? 'italic ' : ''}bold ${renderSize}px ${fontFamily}`;
    const lw = 2.9 * GLYPH_OVERSAMPLE;

    const tmp = document.createElement('canvas');
    const tctx = tmp.getContext('2d');
    tctx.font = font;
    const metrics = tctx.measureText(char);

    const pad = Math.ceil(lw * 2) + 8;
    const slantPad = italic ? Math.ceil(renderSize * 0.25) : 0;
    const cx = Math.ceil(metrics.width / 2) + Math.ceil(lw) + 4 + slantPad;
    const w = cx * 2;
    const h = Math.ceil(renderSize * 1.4) + pad;
    const cy = h / 2;

    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d');
    octx.font = font;
    octx.strokeStyle = strokeColor;
    octx.lineWidth = lw;
    octx.lineJoin = 'round';
    octx.miterLimit = 2;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';

    octx.strokeText(char, cx, cy);

    // Glyph centre (cx) maps to global x + charLeftOffset + baseWidth/2,
    // so global string start (x) maps to this sprite-local coordinate:
    const gradStartX = cx - charLeftOffset * GLYPH_OVERSAMPLE - metrics.width / 2;
    const gradEndX = gradStartX + totalWidth * GLYPH_OVERSAMPLE;
    const grad = octx.createLinearGradient(gradStartX, cy, gradEndX, cy);
    const n = rainbowColors.length;
    for (let i = 0; i < n; i++) {
        grad.addColorStop(n === 1 ? 0 : i / (n - 1), rainbowColors[i]);
    }
    octx.fillStyle = grad;
    octx.fillText(char, cx, cy);

    if (RAINBOW_GLYPH_CACHE.size >= RAINBOW_GLYPH_MAX_CACHE) {
        const firstKey = RAINBOW_GLYPH_CACHE.keys().next().value;
        RAINBOW_GLYPH_CACHE.delete(firstKey);
    }

    entry = {
        canvas: off,
        baseWidth: metrics.width / GLYPH_OVERSAMPLE,
        originX: cx,
        originY: cy,
    };
    RAINBOW_GLYPH_CACHE.set(key, entry);
    return entry;
}

function createDamageTextEffect(x, y, damage, element, isCrit, isResist, options) {
    const {
        popScale = 1.0, popDuration = 1, centerX = false,
    } = options;

    // ── Colors (HvDamageNumber6 resist-over-element color priority) ──
    let textColor, outlineColor;
    if (isCrit && isResist) {
        textColor = $config.critResistTextColor;
        outlineColor = $config.critResistOutlineColor;
    } else if (isCrit) {
        const styles = $config.elementStyles[element] || $config.elementStyles.physical;
        [textColor, outlineColor] = styles.crit;
    } else if (isResist) {
        textColor = $config.resistTextColor;
        outlineColor = $config.resistOutlineColor;
    } else {
        const styles = $config.elementStyles[element] || $config.elementStyles.physical;
        [textColor, outlineColor] = styles.base;
    }

    // ── Effective scale: crit adds 0.1 (matches original --pop-scale logic) ──
    const effectivePopScale = popScale + (isCrit ? 0.1 : 0);

    const fontSize = isCrit ? 24 : (isResist && !isCrit ? 18 : 20);
    const damageStr = String(damage);
    const digits = splitTextToGlyphs(damageStr);

    // ── Eager pre-computation: glyph sprites + static layout ──
    const fontFamily = getDamageFontFamilyCssValue();
    const italic = Boolean($config.italicDamageText);
    const useFlow = element === 'void' && $config.voidStyle === 'flow';
    const useRainbow = element === 'void' && $config.voidStyle === 'rainbow';

    let glyphs = [];
    const spacingPx = Math.round(fontSize * 0.06);
    let totalWidth = 0;

    if (useFlow) {
        // Flow 模式：生成内部纯白、外部描边的字形，以便后续离屏填充流动图案
        glyphs = digits.map(d => getGlyph(d, fontSize, fontFamily, '#FFFFFF', outlineColor, italic));
        totalWidth = glyphs.reduce((sum, g, i) =>
        sum + g.baseWidth + (i < digits.length - 1 ? spacingPx : 0), 0);
    } else {
        const normalGlyphs = digits.map(d => getGlyph(d, fontSize, fontFamily, textColor, outlineColor, italic));
        totalWidth = normalGlyphs.reduce((sum, g, i) =>
        sum + g.baseWidth + (i < digits.length - 1 ? spacingPx : 0), 0);

        if (useRainbow) {
            const rainbowColors = $config.voidRainbowColors;
            let curX = x;
            glyphs = normalGlyphs.map((g, i) => {
                const leftOffset = curX - x;
                const rg = getRainbowGlyph(
                    digits[i], fontSize, fontFamily, outlineColor, italic,
                    rainbowColors, leftOffset, totalWidth
                );
                curX += g.baseWidth + spacingPx;
                return rg;
            });
        } else {
            glyphs = normalGlyphs;
        }
    }

    // ── Pre-compute per-digit centres in element-local space ──
    // x                = CSS "left" of the element → first digit starts here
    // blockCenterX     = CSS transform-origin X  (element horizontal centre)
    // blockCenterY     = CSS transform-origin Y  (element vertical centre)
    const blockCenterY = y + fontSize * 0.55;
    const blockCenterX = x + totalWidth / 2;

    const invOversample = 1 / GLYPH_OVERSAMPLE;

    // ── Pre-compute per-digit X centres (Y is always blockCenterY) ──
    const glyphCx = [];
    let curX = x;
    for (let i = 0; i < glyphs.length; i++) {
        glyphCx.push(curX + glyphs[i].baseWidth / 2);
        curX += glyphs[i].baseWidth + spacingPx;
    }

    // ── CSS keyframe parameters ──
    //   popDigit:       0% scale(3)  → 30% scale(ps)
    //   popDigitCrit:   0% scale(4)  → 30% scale(ps)
    const initialScale = isCrit ? 4 : 3;
    const scaleDelta = effectivePopScale - initialScale; // constant per effect

    return {
        type: 'damage_text',
        duration: popDuration,
        startTime: 0,

        draw(ctx, elapsed) {
            const raw = elapsed / popDuration; // 0..1 real time
            if (raw >= 1) return;

            // ── Per-segment cubic-bezier easing ──
            // CSS animation-timing-function applies between each pair of
            // keyframes independently.  Each segment gets its own cubic-bezier
            // warp, and the overshoot creates the signature bounce.
            //
            // Keyframe timeline (linear real time):
            //   0.00 s ─── 0%  keyframe
            //   0.30 s ─── 30% keyframe (popDuration=1)
            //   0.65 s ─── 65% keyframe
            //   1.00 s ─── 100% keyframe
            let scale, opacity, transY;

            if (raw < 0.3) {
                // 0% → 30% : scale 3(4)→ps, opacity 0→1, transY 0
                const segRaw = raw / 0.3;
                const segT   = bounceEase(segRaw);
                scale   = initialScale + scaleDelta * segT;
                opacity = segT;
                transY  = 0;
            } else if (raw < 0.65) {
                // 30% → 65% : scale ps, opacity 1, transY 0→-5
                const segRaw = (raw - 0.3) / 0.35;
                const segT   = bounceEase(segRaw);
                scale   = effectivePopScale;
                opacity = 1;
                transY  = -5 * segT;
            } else {
                // 65% → 100% : scale ps, opacity 1→0, transY -5→-10
                const segRaw = (raw - 0.65) / 0.35;
                const segT   = bounceEase(segRaw);
                scale   = effectivePopScale;
                opacity = 1 - segT;
                transY  = -5 - 5 * segT;
            }

            if (opacity <= 0.001) return;

            // ── CSS-transform-equivalent per-digit draw ──
            // CSS transform: translateY(ty) scale(s) with
            // transform-origin: 50% 50% (element centre).
            //
            // For a glyph at element-local (gx, gy=blockCenterY):
            //   screen.x = centerX + (gx - centerX)·s  =  gx·s + centerX·(1-s)
            //   screen.y = centerY + ty                    (gy==centerY, term zeroes)
            const drawScale  = scale * invOversample;
            const xScaleBase = blockCenterX * (1 - scale);
            const tyAll      = blockCenterY + transY;
            ctx.globalAlpha  = Math.min(1, Math.max(0, opacity));

            if (useFlow) {
                // 初始化离屏 Canvas，用于 1:1 实时绘制流光字形
                if (!this._flowTempCanvas) {
                    this._flowTempCanvas = document.createElement('canvas');
                    let mw = 0, mh = 0;
                    for (const g of glyphs) {
                        mw = Math.max(mw, g.canvas.width);
                        mh = Math.max(mh, g.canvas.height);
                    }
                    this._flowTempCanvas.width = mw;
                    this._flowTempCanvas.height = mh;
                    this._flowTempCtx = this._flowTempCanvas.getContext('2d');
                }

                const tc = this._flowTempCanvas;
                const tctx = this._flowTempCtx;
                const renderSize = fontSize * GLYPH_OVERSAMPLE;

                // 周期从 128 减半至 64，使同样的高度内包含两次渐变循环
                const FLOW_PERIOD = 64;
                const flowSpeed = Number($config.voidFlowSpeed) || 0;
                const flowOffset = -((elapsed * flowSpeed) % FLOW_PERIOD);

                const colors = $config.voidFlowColors;
                const n = colors.length;

                for (let i = 0; i < digits.length; i++) {
                    const g = glyphs[i];
                    const tx = glyphCx[i] * scale + xScaleBase;

                    if (tc.width !== g.canvas.width || tc.height !== g.canvas.height) {
                        tc.width = g.canvas.width;
                        tc.height = g.canvas.height;
                    }

                    tctx.setTransform(1, 0, 0, 1, 0, 0);
                    tctx.clearRect(0, 0, tc.width, tc.height);

                    // 必须要在调整尺寸后重新设置字体
                    tctx.font = `${italic ? 'italic ' : ''}bold ${renderSize}px ${fontFamily}`;
                    tctx.lineWidth = 2.9 * GLYPH_OVERSAMPLE;
                    tctx.lineJoin = 'round';
                    tctx.miterLimit = 2;
                    tctx.textAlign = 'center';
                    tctx.textBaseline = 'middle';
                    tctx.strokeStyle = outlineColor;

                    // 1. 描边
                    tctx.strokeText(digits[i], g.originX, g.originY);

                    // 2. 动态生成垂直渐变，实现向上流动
                    // 渐变范围覆盖整个字高 + 一个完整周期，确保颜色不会断层
                    const grad = tctx.createLinearGradient(0, flowOffset, 0, flowOffset + tc.height + FLOW_PERIOD);
                    // 循环填充颜色，j 从 0 到 n*2 保证有足够的色标覆盖整个渐变范围
                    for (let j = 0; j <= n * 2; j++) {
                        grad.addColorStop(j / (n * 2), colors[j % n]);
                    }

                    tctx.fillStyle = grad;
                    tctx.fillText(digits[i], g.originX, g.originY);

                    // 3. 将绘制好的完整清晰字形贴到主 Canvas
                    ctx.setTransform(drawScale, 0, 0, drawScale, tx, tyAll);
                    ctx.drawImage(tc, 0, 0, tc.width, tc.height, -g.originX, -g.originY, tc.width, tc.height);
                }
            } else {
                for (let i = 0; i < glyphs.length; i++) {
                    const tx = glyphCx[i] * scale + xScaleBase;
                    ctx.setTransform(drawScale, 0, 0, drawScale, tx, tyAll);
                    ctx.drawImage(glyphs[i].canvas, -glyphs[i].originX, -glyphs[i].originY);
                }
            }

            // Reset for next effect
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = 1;
        }
    };
}

// ── Global gradient cache — keyed by color signature ──
// CanvasGradient objects are GPU resources that may not be freed promptly
// by GC even after JS references are dropped.  Reusing them globally bounds
// the total at ~28 (7 elements × 4 crit/resist combos max) instead of
// creating hundreds per second.
const explosionGradientCache = new Map();

function getOrCreateExplosionGrads(ctx, colors) {
    // Build a cache key from the actual gradient colour-stops
    const key = [
        colors.c1, colors.c2, colors.c3, colors.c5,
        colors.c6, colors.c7, colors.c8
    ].join('|');
    let grads = explosionGradientCache.get(key);
    if (grads) return grads;

    const c1 = hexToCanvasRgba(colors.c1);
    const c2 = hexToCanvasRgba(colors.c2);
    const c3 = hexToCanvasRgba(colors.c3);
    const c5 = hexToCanvasRgba(colors.c5);
    const c6 = hexToCanvasRgba(colors.c6);
    const c7 = hexToCanvasRgba(colors.c7);
    const c8 = hexToCanvasRgba(colors.c8);

    const glow = ctx.createRadialGradient(0, 0, 0.7, 0, 0, 1.2);
    glow.addColorStop(0, 'transparent');
    glow.addColorStop(0.5, c5);
    glow.addColorStop(1, 'transparent');

    const main = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1.0);
    main.addColorStop(0, c1);
    main.addColorStop(0.5, c2);
    main.addColorStop(1, c3);

    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.0);
    core.addColorStop(0, c6);
    core.addColorStop(1, c7);

    const coreGlow = ctx.createRadialGradient(0, 0, 0.3, 0, 0, 0.55);
    coreGlow.addColorStop(0, 'transparent');
    coreGlow.addColorStop(0.5, c8);
    coreGlow.addColorStop(1, 'transparent');

    grads = { glow, main, core, coreGlow };
    explosionGradientCache.set(key, grads);
    return grads;
}

// ── Explosion sprite cache — pre-rendered offscreen canvases ──
// Each sprite bakes the 4-layer radial gradient into one image, so the hot
// draw path does a single drawImage call instead of 4× beginPath+arc+fill.
const EXPLOSION_SPRITE_SIZE = 128;
const EXPLOSION_SPRITE_CACHE = new Map();

function getOrCreateExplosionSprite(colors) {
    const key = [colors.c1, colors.c2, colors.c3, colors.c5,
    colors.c6, colors.c7, colors.c8].join('|');
    let sprite = EXPLOSION_SPRITE_CACHE.get(key);
    if (sprite) return sprite;

    const off = document.createElement('canvas');
    off.width = off.height = EXPLOSION_SPRITE_SIZE;
    const octx = off.getContext('2d');
    // Map normalized radius 1.2 → half sprite width
    const s = EXPLOSION_SPRITE_SIZE / 2.4;
    octx.setTransform(s, 0, 0, s, EXPLOSION_SPRITE_SIZE / 2, EXPLOSION_SPRITE_SIZE / 2);

    const grads = getOrCreateExplosionGrads(octx, colors);

    octx.fillStyle = grads.glow;
    octx.beginPath(); octx.arc(0, 0, 1.2, 0, PI2); octx.fill();

    octx.fillStyle = grads.main;
    octx.beginPath(); octx.arc(0, 0, 1.0, 0, PI2); octx.fill();

    octx.fillStyle = grads.core;
    octx.beginPath(); octx.arc(0, 0, 0.4, 0, PI2); octx.fill();

    octx.fillStyle = grads.coreGlow;
    octx.beginPath(); octx.arc(0, 0, 0.55, 0, PI2); octx.fill();

    EXPLOSION_SPRITE_CACHE.set(key, off);
    return off;
}

function createExplosionEffect(x, y, element, baseSize, isCrit, isResist) {
    const colorMap = getExplosionColorMap();
    const colors = colorMap[element] || colorMap.physical;

    let scale = 1;
    if (isCrit) scale *= $config.critHitScale;
    if (isResist) scale *= $config.glancedHitScale;
    const size = Math.max(1, baseSize * scale);

    return {
        type: 'explosion',
        duration: 0.4,
        startTime: 0,
        x, y, size, colors,

        draw(ctx, elapsed) {
            const raw = elapsed * 2.5; // 1/0.4 precomputed

            // ── Inline ease-out keyframe interpolation ──
            let eased;
            if (raw <= 0) {
                eased = 0;
            } else if (raw >= 1) {
                eased = 1;
            } else if (raw < 0.3) {
                eased = 0.3 * easeOutEase(raw / 0.3);
            } else {
                eased = 0.3 + 0.7 * easeOutEase((raw - 0.3) / 0.7);
            }

            // Interpolate expScale / opacity from eased progress
            let expScale, opacity;
            if (eased < 0.3) {
                expScale = (eased / 0.3) * 1.2;
                opacity = 1;
            } else {
                const t = (eased - 0.3) / 0.7;
                expScale = 1.2 + t * 0.8;
                opacity = 1 - t;
            }

            if (opacity <= 0.001) return;

            const r = Math.max(0.1, this.size * expScale);

            // Pre-rendered sprite — single drawImage replaces 4 arc+fill calls
            const sprite = getOrCreateExplosionSprite(this.colors);
            ctx.save();
            ctx.globalAlpha = opacity;
            const d = r * 2.4; // sprite covers normalized radius 1.2 → ±1.2
            ctx.drawImage(sprite,
                          this.x - r * 1.2, this.y - r * 1.2,
                          d, d);
            ctx.restore();
        }
    };
}

// =============================================================================
// Color utilities (unchanged from original)
// =============================================================================

function hexToRgb(hex) {
    const normalized = hex.replace('#', '').trim();
    const full = normalized.length === 3
    ? normalized.split('').map((ch) => ch + ch).join('')
    : normalized;

    if (!/^[0-9a-fA-F]{6}$/.test(full)) {
        return { r: 255, g: 255, b: 255 };
    }

    return {
        r: parseInt(full.slice(0, 2), 16),
        g: parseInt(full.slice(2, 4), 16),
        b: parseInt(full.slice(4, 6), 16)
    };
}

function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case rn:
                h = ((gn - bn) / d) % 6;
                break;
            case gn:
                h = (bn - rn) / d + 2;
                break;
            default:
                h = (rn - gn) / d + 4;
                break;
        }
        h *= 60;
        if (h < 0) h += 360;
    }

    return { h, s, l };
}

function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    if (hp >= 0 && hp < 1) {
        r1 = c; g1 = x;
    } else if (hp < 2) {
        r1 = x; g1 = c;
    } else if (hp < 3) {
        g1 = c; b1 = x;
    } else if (hp < 4) {
        g1 = x; b1 = c;
    } else if (hp < 5) {
        r1 = x; b1 = c;
    } else {
        r1 = c; b1 = x;
    }

    const m = l - c / 2;
    return {
        r: (r1 + m) * 255,
        g: (g1 + m) * 255,
        b: (b1 + m) * 255
    };
}

function shiftColor(hex, lightnessDelta = 0, saturationDelta = 0) {
    const { r, g, b } = hexToRgb(hex);
    const { h, s, l } = rgbToHsl(r, g, b);
    const nextS = clamp(s + saturationDelta, 0, 1);
    const nextL = clamp(l + lightnessDelta, 0, 1);
    const rgb = hslToRgb(h, nextS, nextL);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function withAlpha(hex, alpha) {
    const a = clamp(Math.round(alpha * 255), 0, 255).toString(16).padStart(2, '0').toUpperCase();
    return `${hex}${a}`;
}

function deriveExplosionColors(baseHex) {
    const c1Hex = shiftColor(baseHex, 0.00, 0.00);
    const c2Hex = shiftColor(baseHex, 0.12, 0.02);
    const c3Hex = shiftColor(baseHex, 0.24, -0.04);
    const c4Hex = shiftColor(baseHex, -0.06, 0.00);
    const c5Hex = shiftColor(baseHex, -0.18, 0.03);
    const c6Hex = shiftColor(baseHex, 0.18, 0.02);
    const c7Hex = shiftColor(baseHex, -0.24, -0.05);
    const c8Hex = shiftColor(baseHex, 0.06, 0.00);

    return {
        c1: withAlpha(c1Hex, 0.80),
        c2: withAlpha(c2Hex, 0.60),
        c3: withAlpha(c3Hex, 0.30),
        c4: withAlpha(c4Hex, 0.50),
        c5: withAlpha(c5Hex, 0.80),
        c6: withAlpha(c6Hex, 0.90),
        c7: withAlpha(c7Hex, 0.50),
        c8: withAlpha(c8Hex, 0.90)
    };
}

const DEFAULT_EXPLOSION_BASE_COLORS = {
    fire: '#FF5000',
    ice: '#1E90FF',
    shock: '#00C9A7',
    wind: '#00C878',
    holy: '#FFF596',
    dark: '#8B008B',
    physical: '#A9A9A9'
};

function getExplosionColorMap() {
    const baseColorMap = $config.explosionBaseColors || {};

    const result = {};
    for (const [element, fallbackHex] of Object.entries(DEFAULT_EXPLOSION_BASE_COLORS)) {
        result[element] = deriveExplosionColors(baseColorMap[element] || fallbackHex);
    }
    return result;
}

// =============================================================================
// Config (unchanged from original)
// =============================================================================

const damageTypes = {
    'Smite': 'holy', 'Banishment': 'holy', 'Paradise Lost': 'holy',
    'Fiery Blast': 'fire', 'Inferno': 'fire', 'Flames of Loki': 'fire',
    'Freeze': 'ice', 'Blizzard': 'ice', 'Fimbulvetr': 'ice',
    'Shockblast': 'shock', 'Chained Lightning': 'shock', 'Wrath of Thor': 'shock',
    'Gale': 'wind', 'Downburst': 'wind', 'Storms of Njord': 'wind',
    'Corruption': 'dark', 'Disintegrate': 'dark', 'Ragnarok': 'dark',
    'Burning Soul': 'holy', 'Ripened Soul': 'dark'
};

// ── Debuff effect display table (monster gains the effect XXX) ──
const debuffEffects = {
    'Asleep': '💤️睡眠!!',
    'Bleeding Wound': '🩸流血!!',
    'Blinded': '😎致盲!!',
    'Coalesced Mana': '🌊省蓝!!',
    'Confused': '🤬混乱!!',
    'Deep Burns': '⚡感电!!',
    'Freezing Limbs': '❄️霜寒!!',
    'Imperiled': '😨陷危!!',
    'Immobilized': '😲定身!!',
    //    'Penetrated Armor': '🤯强击!!',
    'Searing Skin': '🔥灼烧!!',
    'Silenced': '🤭沉默!!',
    'Slowed': '🦿减速!!',
    'Stunned': '💫眩晕!!',
    'Turbulent Air': '🌪️风化!!',
    'Weakened': '😰虚弱!!',
    'Breached Defense': '💨耀变!!',
    'Blunted Attack': '💩侵蚀!!',
};

const debuffElementMap = {
    'Turbulent Air':    'wind',
    'Freezing Limbs':   'ice',
    'Searing Skin':     'fire',
    'Deep Burns':       'shock',
    'Breached Defense': 'holy',
    'Blunted Attack':   'dark',
    'Penetrated Armor': 'physical',
};

/** Collapse whitespace so "Penetrated   Armor" matches "Penetrated Armor". */
function normalizeDebuffName(effectName) {
    if (!effectName) return '';
    return String(effectName).trim().replace(/\s+/g, ' ');
}

function lookupDebuffEffect(effectName) {
    const key = normalizeDebuffName(effectName);
    if (!key) return null;
    return Object.prototype.hasOwnProperty.call(debuffEffects, key)
    ? debuffEffects[key]
    : null;
}

function getDebuffElement(effectName) {
    const key = normalizeDebuffName(effectName);
    if (key && Object.prototype.hasOwnProperty.call(debuffElementMap, key)) {
        return debuffElementMap[key];
    }
    return 'physical';
}
// ── Player Action Display Table (You cast/use X) ──
const playerActionEffects = {
    'Health Potion': '🥤生命药水',
    'Health Draught': '🧪生命长效药',
    'Health Elixir': '㊙️生命秘药',
    'Mana Potion': '🥤法力药水',
    'Mana Draught': '🧪法力长效药',
    'Mana Elixir': '㊙️法力秘药',
    'Spirit Potion': '🥤灵力药水',
    'Spirit Draught': '🧪灵力长效药',
    'Spirit Elixir': '㊙️灵力秘药',
    'Last Elixir': '㊙️终极秘药',
    'Energy Drink': '🐮红牛',
    'Caffeinated Candy': '☕咖啡因糖果',
    'Infusion of Flames': '🔥火药',
    'Infusion of Frost': '❄️冰药',
    'Infusion of Lightning': '⚡雷药',
    'Infusion of Storms': '🌪️风药',
    'Infusion of Divinity': '💨圣药',
    'Infusion of Darkness': '💩暗药',
    'Scroll of Swiftness': '📜速卷',
    'Scroll of Protection': '📜护卷',
    'Scroll of the Avatar': '🧻化卷',
    'Scroll of Absorption': '📜吸卷',
    'Scroll of Shadows': '📜影卷',
    'Scroll of Life': '📜命卷',
    'Scroll of the Gods': '🧻神卷',
    'Health Gem': '💎生命宝石',
    'Mana Gem': '💎法力宝石',
    'Spirit Gem': '💎灵力宝石',
    'Mystic Gem': '💎神秘宝石',
    'Flower Vase': '🌷花瓶',
    'Bubble-Gum': '😤泡泡糖',
    'Absorb': '😮吸收',
    'Arcane Blow': '😠奥术冲击',
    'Arcane Focus': '🤓奥术专注',
    'Backstab': '⚔️背刺',
    'Banishment': '💨放逐',
    'Blind': '😎致盲',
    'Blizzard': '❄️暴雪',
    'Chained Lightning': '⚡闪电五连鞭',
    'Concussive Strike': '🧹震荡冲击',
    'Confuse': '🤬混乱',
    'Corruption': '💩放荡',
    'Cure': '♥️治疗',
    'Disintegrate': '💩崩坏',
    'Downburst': '🌪️下流暴击',
    'Drain': '🤮枯竭',
    'Fiery Blast': '🔥火爆',
    'Fimbulvetr': '❄️核冬天',
    'Flames of Loki': '🔥红温小洛包',
    'Flee': '🏃逃跑',
    'Freeze': '❄️冰冻',
    'Frenzied Blows': '⚔️狂乱百裂斩',
    'Full-Cure': '💖完全治疗',
    'Gale': '🌪️刮风',
    'Great Cleave': '🔨大锤八十',
    'Haste': '🚀加速',
    'Heartseeker': '🏹穿心',
    'Immobilize': '😲定身',
    'Imperil': '😨陷危',
    'Inferno': '🔥点燃大海',
    'Iris Strike': '⚔️虹膜冲击',
    'Merciful Blow': '🗡最后的慈悲',
    'Paradise Lost': '💨往逝乐土',
    'Protection': '🙅‍♀️保护',
    'Ragnarok': '💩第三次崩坏',
    'Regen': '💚细胞活化',
    'Rending Blow': '🔨撕裂心海肩膀',
    'Scan': '📷扫描',
    'Shadow Veil': '🎞️影纱',
    'Shatter Strike': '🔨碎甲冲击',
    'Shield Bash': '🗡盾击',
    'Skyward Sword': '🤺天空之剑',
    'Shockblast': '⚡雷霆',
    'Silence': '🤭沉默',
    'Sleep': '💤睡眠',
    'Slow': '🦿迟缓',
    'Smite': '💨惩戒',
    'Spark of Life': '🎇遐蝶',
    'Spirit Shield': '🛡灵力盾',
    'Storms of Njord': '🌪️异样的风暴中心',
    'Vital Strike': '🗡要害冲击',
    'Weaken': '😰虚弱',
    'Wrath of Thor': '⚡雷神之怒',
    'FUS RO DAH': '🐲龙吼',
    'Orbital Friendship Cannon': '🐴马炮',
};

const damageFonts = {
    'JimmysBold': 'https://fonts.cdnfonts.com/css/jimmysbold',
    'Dotine': 'https://fonts.cdnfonts.com/css/dotine',
    'SURVIVOR': 'https://fonts.cdnfonts.com/css/survivor',
    'DNFBitBitv2': 'https://cdn.df.nexon.com/img/common/font/DNFBitBitv2.otf',
    '方正剪纸_GBK': 'data:font/woff2;base64,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',
    'MapleStory': 'data:font/woff2;base64,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',
};

const $config = {
    targetFPS: 30,
    explosionBaseSize: 6,
    critHitScale: 1.4,
    glancedHitScale: 0.8,
    multipleDamageInterval: 0.1,
    filterDamageBelow1000: true,
    critSuffixExclamation: true,
    italicDamageText: true,
    debuffTextOffsetEnabled: true,
    debuffTextOffsetX: -150,
    voidStyle: 'flow', // 'physical' | 'rainbow' | 'flow'
    voidRainbowColors: ['red', 'orange', 'yellow', 'lime', 'cyan', 'skyblue', '#ff9afc'],
    voidFlowColors: ['#FFF9C4', '#9CF89C', '#8DD8FF', '#FFA2F8', '#FF66FF'],
    voidFlowSpeed: 80,
    playerActionElement: 'holy',
    playerActionOffsetX: 0,
    playerActionOffsetY: -156,
    playerTextOffsetX: 0,
    playerTextOffsetY: 79,
    damageDisplayFormat: 'full',   // 'full' | 'k' (12K) | 'wan' (1.2万)
    damageFontPreset: 'Custom',
    damageFontCustom: '汉仪文黑',
    animationOptions: {
        normal: { popScale: 1.6, popDuration: 1 },
        crit: { popScale: 2.1, popDuration: 1.2 }
    },

    // Resist color overrides (HvDamageNumber6 style — fixed across all elements)
    resistTextColor: '#808080',
    resistOutlineColor: '#000000',
    critResistTextColor: '#C0C0C0',
    critResistOutlineColor: '#000000',

    // Damage text color scheme
    elementStyles: {
        fire: { base: ['#FF6A2A', '#7A1D00'], crit: ['#F64328', '#801100'] },
        ice: { base: ['#4FA8FF', '#003C78'], crit: ['#48C0F8', '#00438A'] },
        shock: { base: ['#B742D1', '#6F018E'], crit: ['#D850F8', '#932FA7'] },
        wind: { base: ['#2E9E97', '#226863'], crit: ['#39C5BB', '#1A5652'] },
        holy: { base: ['#F0A8ED', '#BB72B9'], crit: ['#FF9AFC', '#BA73B8'] },
        dark: { base: ['#5850B8', '#150E2A'], crit: ['#9B96D4', '#120730'] },
        physical: { base: ['#F7DF45', '#6F641B'], crit: ['#F5E170', '#776708'] }
    },

    // Damage text position: [x offset from rect.left, y offset from rect.top]
    damageTextPos: [0, 0],

    // Explosion coordinate random range (relative to enemy rect)
    expPosMinX: 0,
    expPosMaxX: 360,
    expPosMinY: 0,
    expPosMaxY: 50,

    // Explosion base colors (one per element)
    explosionBaseColors: {
        fire: '#F64328',
        ice: '#66CCFF',
        shock: '#D850F8',
        wind: '#39C5BB',
        holy: '#FF9AFC',
        dark: '#9B96D4',
        physical: '#F0D12A'
    }
};

const defaultConfig = JSON.parse(JSON.stringify($config));
let configOpenSnapshot = null;

const savedConfig = localStorage.getItem('mmk-config');
if (savedConfig) {
    try {
        const parsedConfig = JSON.parse(savedConfig);
        const merged = normalizeConfigData(deepMerge(defaultConfig, parsedConfig));
        for (const key of Object.keys($config)) delete $config[key];
        Object.assign($config, merged);
        localStorage.setItem('mmk-config', JSON.stringify($config));
    } catch (e) {
        localStorage.setItem('mmk-config', JSON.stringify($config));
    }
} else {
    localStorage.setItem('mmk-config', JSON.stringify($config));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(target, source) {
    const result = JSON.parse(JSON.stringify(target));

    if (!isPlainObject(source)) {
        return result;
    }

    for (const [key, value] of Object.entries(source)) {
        if (isPlainObject(value) && isPlainObject(result[key])) {
            result[key] = deepMerge(result[key], value);
        } else {
            result[key] = JSON.parse(JSON.stringify(value));
        }
    }

    return result;
}

function normalizeConfigData(data) {
    if (Array.isArray(data.damageTextPos)) {
        data.damageTextPos[0] = clamp(Number(data.damageTextPos[0] ?? 0), -150, 150);
        data.damageTextPos[1] = clamp(Number(data.damageTextPos[1] ?? 0), -20, 20);
    }
    data.multipleDamageInterval = Number.isFinite(Number(data.multipleDamageInterval))
    ? Math.max(0, Number(data.multipleDamageInterval))
    : 0;
    data.critSuffixExclamation = Boolean(data.critSuffixExclamation);
    data.italicDamageText = Boolean(data.italicDamageText);
    data.debuffTextOffsetEnabled = Boolean(data.debuffTextOffsetEnabled);
    data.debuffTextOffsetX = Number.isFinite(Number(data.debuffTextOffsetX))
    ? Number(data.debuffTextOffsetX)
    : -150;
    if (data.voidRainbowEnabled !== undefined && !data.voidStyle) {
        data.voidStyle = data.voidRainbowEnabled ? 'rainbow' : 'physical';
    }
    if (!['physical', 'rainbow', 'flow'].includes(data.voidStyle)) {
        data.voidStyle = 'physical';
    }
    delete data.voidRainbowEnabled;

    if (!Array.isArray(data.voidRainbowColors)) {
        data.voidRainbowColors = defaultConfig.voidRainbowColors.slice();
    } else {
        data.voidRainbowColors = data.voidRainbowColors
        .map((c) => String(c).trim())
        .filter(Boolean);
        if (data.voidRainbowColors.length < 2) {
            data.voidRainbowColors = defaultConfig.voidRainbowColors.slice();
        }
    }
    if (!Array.isArray(data.voidFlowColors)) {
        data.voidFlowColors = defaultConfig.voidFlowColors.slice();
    } else {
        data.voidFlowColors = data.voidFlowColors
        .map((c) => String(c).trim())
        .filter(Boolean);
        if (data.voidFlowColors.length < 2) {
            data.voidFlowColors = defaultConfig.voidFlowColors.slice();
        }
    }
    data.voidFlowSpeed = Number.isFinite(Number(data.voidFlowSpeed))
    ? Math.max(0, Number(data.voidFlowSpeed))
    : 80;
    data.playerActionElement = data.playerActionElement || 'holy';
    data.playerActionOffsetX = Number.isFinite(Number(data.playerActionOffsetX)) ? Number(data.playerActionOffsetX) : 0;
    data.playerActionOffsetY = Number.isFinite(Number(data.playerActionOffsetY)) ? Number(data.playerActionOffsetY) : 0;
    data.playerTextOffsetX = Number.isFinite(Number(data.playerTextOffsetX)) ? Number(data.playerTextOffsetX) : 0;
    data.playerTextOffsetY = Number.isFinite(Number(data.playerTextOffsetY)) ? Number(data.playerTextOffsetY) : 0;
    if (data.damageFontPreset && data.damageFontPreset !== 'Custom' && !damageFonts[data.damageFontPreset]) {
        if (!data.damageFontCustom) data.damageFontCustom = data.damageFontPreset;
        data.damageFontPreset = 'Custom';
    }
    // ── Migrate old canvas config: strip removed keys, reset durations ──
    if (data.animationOptions) {
        const ao = data.animationOptions;
        // Remove top-level keys that were removed from the new config
        for (const k of Object.keys(ao)) {
            if (k !== 'normal' && k !== 'crit') delete ao[k];
        }
        // Per-type: keep only popScale & popDuration; reset duration if < 1 (old default was 0.6)
        for (const type of ['normal', 'crit']) {
            if (ao[type] && typeof ao[type] === 'object') {
                const def = defaultConfig.animationOptions[type];
                for (const k of Object.keys(ao[type])) {
                    if (k !== 'popScale' && k !== 'popDuration') delete ao[type][k];
                }
                if (typeof ao[type].popDuration !== 'number' || ao[type].popDuration < 1) {
                    ao[type].popDuration = def.popDuration;
                }
                if (typeof ao[type].popScale !== 'number') {
                    ao[type].popScale = def.popScale;
                }
            }
        }
    }
    return data;
}

function applyConfig(sourceConfig) {
    const merged = normalizeConfigData(deepMerge(defaultConfig, sourceConfig));

    for (const key of Object.keys($config)) {
        delete $config[key];
    }
    Object.assign($config, merged);

    applyDamageFontFromConfig();

    return merged;
}

function saveConfig(showNotice = false) {
    localStorage.setItem('mmk-config', JSON.stringify($config));
    if (showNotice) {
        alert('mmk settings saved.');
    }
}

// =============================================================================
// Settings UI builders (mostly unchanged; preview functions adapted for canvas)
// =============================================================================

function closeDamageDisplaySettings() {
    const existing = document.getElementById('mmk-cfg-div');
    if (existing) {
        existing.remove();
    }
    CanvasManager.destroyPreview();
}

function createConfigButton(label, parent, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    parent.appendChild(button);
    return button;
}

function createConfigItem(parent, title, description, input) {
    const wrapper = document.createElement('div');

    const heading = document.createElement('h2');
    heading.textContent = title;
    wrapper.appendChild(heading);

    const label = document.createElement('label');
    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${description}`));
    wrapper.appendChild(label);

    parent.appendChild(wrapper);
    return wrapper;
}

function createNumberInput(value, { min, max, step } = {}, onCommit) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = String(value);
    if (typeof min === 'number') input.min = String(min);
    if (typeof max === 'number') input.max = String(max);
    if (typeof step === 'number') input.step = String(step);

    input.addEventListener('change', () => {
        const nextValue = Number(input.value);
        if (!Number.isFinite(nextValue)) {
            input.value = String(value);
            return;
        }
        onCommit(nextValue);
    });

    return input;
}

function createColorInput(value, onCommit) {
    const input = document.createElement('input');
    input.type = 'color';
    input.value = value;
    input.addEventListener('change', () => {
        onCommit(input.value.toUpperCase());
    });
    return input;
}

function createTextInput(value, onCommit) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.addEventListener('change', () => {
        onCommit(input.value);
    });
    return input;
}

function createRangeSlider(value, { min, max, step } = {}, onInput) {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step ?? 1);
    input.value = String(clamp(Number(value), min, max));

    input.addEventListener('input', () => {
        const nextValue = Number(input.value);
        if (!Number.isFinite(nextValue)) {
            return;
        }
        onInput(clamp(nextValue, min, max));
    });

    return input;
}

function getUiElementName(element) {
    return element === 'shock' ? 'elec' : element;
}

function getTextShadow(color) {
    // Build a circular-ish outline with multiple offsets to avoid jagged corner breaks.
    const radius = 1.6;
    const step = 0.5;
    const shadows = [];

    for (let y = -radius; y <= radius; y += step) {
        for (let x = -radius; x <= radius; x += step) {
            if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) {
                continue;
            }
            if (Math.hypot(x, y) <= radius + 0.01) {
                shadows.push(`${x.toFixed(2)}px ${y.toFixed(2)}px 0 ${color}`);
            }
        }
    }

    return shadows.join(', ');
}

// =============================================================================
// Font management (unchanged)
// =============================================================================

const fontStyleSheetStates = new Map();

function importFontStyleSheet(fontName, url) {
    if (!url) {
        return;
    }

    const stateKey = `${fontName}@@${url}`;
    const state = fontStyleSheetStates.get(stateKey);
    if (state === 'loading' || state === 'loaded') {
        return;
    }

    const normalizedUrl = String(url).split('?')[0].toLowerCase();
    const isCssUrl = normalizedUrl.endsWith('.css');

    fontStyleSheetStates.set(stateKey, 'loading');

    if (isCssUrl) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.onload = () => {
            fontStyleSheetStates.set(stateKey, 'loaded');
            refreshDamageTextStyleSheet();
            refreshStyleSampleFonts();
        };
        link.onerror = () => {
            fontStyleSheetStates.delete(stateKey);
        };
        document.head.appendChild(link);
        return;
    }

    // Direct font file URL (.otf/.ttf/.woff/.woff2): register via @font-face.
    const escapedFamily = String(fontName).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    let format = 'opentype';
    if (normalizedUrl.endsWith('.ttf')) format = 'truetype';
    if (normalizedUrl.endsWith('.woff')) format = 'woff';
    if (normalizedUrl.endsWith('.woff2')) format = 'woff2';

    const faceStyle = document.createElement('style');
    faceStyle.textContent = `@font-face { font-family: '${escapedFamily}'; src: url('${url}') format('${format}'); font-display: swap; }`;
    document.head.appendChild(faceStyle);

    if (document.fonts && typeof document.fonts.load === 'function') {
        document.fonts.load(`12px '${escapedFamily}'`).finally(() => {
            fontStyleSheetStates.set(stateKey, 'loaded');
            refreshDamageTextStyleSheet();
            refreshStyleSampleFonts();
        });
    } else {
        fontStyleSheetStates.set(stateKey, 'loaded');
        refreshDamageTextStyleSheet();
        refreshStyleSampleFonts();
    }
}

function getDamageFontName() {
    if ($config.damageFontPreset && $config.damageFontPreset !== 'Custom') {
        return $config.damageFontPreset;
    }
    const customName = String($config.damageFontCustom || '').trim();
    return customName || 'Arial';
}

// ── Font-family cache — avoid string building + escaping every draw call ──
let _cachedFontFamily = '';
function _refreshFontFamilyCache() {
    const fontName = getDamageFontName().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    _cachedFontFamily = `'${fontName}', 'HYWenHei 85W', sans-serif`;
    clearGlyphCache();
}
_refreshFontFamilyCache();

function getDamageFontFamilyCssValue() {
    return _cachedFontFamily;
}

function refreshStyleSampleFonts() {
    const fontFamily = getDamageFontFamilyCssValue();
    const fontStyle = $config.italicDamageText ? 'italic' : 'normal';
    document.querySelectorAll('#mmk-cfg-div .mmk-style-sample, #mmk-cfg-div .mmk-text-position-preview-text').forEach((sample) => {
        sample.style.fontFamily = fontFamily;
        sample.style.fontStyle = fontStyle;
    });
}

function applyDamageFontFromConfig() {
    if ($config.damageFontPreset && $config.damageFontPreset !== 'Custom') {
        importFontStyleSheet($config.damageFontPreset, damageFonts[$config.damageFontPreset]);
    }
    _refreshFontFamilyCache();
    refreshDamageTextStyleSheet();
    refreshStyleSampleFonts();
}

// =============================================================================
// Settings UI — preview + style sections
// =============================================================================

function createTextStylePreview(parent, idSuffix = 'preview') {
    const preview = document.createElement('div');
    preview.id = `mmk-testmon-${idSuffix}`;
    preview.className = 'mmk-testmon';
    preview.innerHTML = `
    <div class="btm1">
    <div class="btm2"><div><img src="/y/battle/mon_a.png" alt="a"></div><div><div class="fc4 fac fcb"><div>500</div></div></div></div>
    <div class="btm3"><div class="fc2 fal fcb"><div>mmk Test Monster</div></div></div>
    <div class="btm4">
    <div class="btm5"><div class="chbd"><img src="/y/s/nbargreen.png" style="width:120px" alt="health"><img src="/y/s/nbarfg.png"></div></div>
    <div class="btm5"><div class="chbd"><img src="/y/s/nbarblue.png" style="width:58px" alt="magic"><img src="/y/s/nbarfg.png"></div></div>
    <div class="btm5"><div class="chbd"><img src="/y/s/nbarred.png" style="width:35px" alt="spirit"><img src="/y/s/nbarfg.png"></div></div>
    </div>
    <div class="btm6"></div>
    </div>
    `;
    parent.appendChild(preview);
    return preview;
}

function createTextStylePreviewControls(parent) {
    const container = document.createElement('div');

    const preview = createTextStylePreview(container, 'shared');

    const controls = document.createElement('div');
    controls.className = 'mmk-text-preview-controls';

    const elementSelect = document.createElement('select');
    const previewElements = Object.keys($config.elementStyles);
    if (!previewElements.includes('void')) {
        previewElements.push('void');
    }
    for (const element of previewElements) {
        const option = document.createElement('option');
        option.value = element;
        option.textContent = getUiElementName(element);
        elementSelect.appendChild(option);
    }
    controls.appendChild(elementSelect);

    const hitTypeSelect = document.createElement('select');
    [
        { value: 'normal', label: 'Normal' },
        { value: 'crit', label: 'Crit' },
        { value: 'resist', label: 'Glanced' },
        { value: 'crit_resist', label: 'Crit+Glanced' }
    ].forEach(({ value, label }) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        hitTypeSelect.appendChild(option);
    });
    controls.appendChild(hitTypeSelect);

    // ── Debuff preview dropdown ──
    const debuffSelect = document.createElement('select');
    {
        const noneOption = document.createElement('option');
        noneOption.value = '';
        noneOption.textContent = '-- Debuff --';
        debuffSelect.appendChild(noneOption);
        for (const [name, text] of Object.entries(debuffEffects)) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${text} (${name})`;
            debuffSelect.appendChild(option);
        }
    }
    controls.appendChild(debuffSelect);

    // ── Crit multiplier dropdown (affects crit suffix) ──
    const critMulSelect = document.createElement('select');
    critMulSelect.title = 'Crit multiplier — controls the "!" / "?" suffix';
    for (let m = 1; m <= 9; m++) {
        const option = document.createElement('option');
        option.value = String(m);
        option.textContent = m === 1 ? '1x (!!)' : `${m}x (${getCritSuffix(m)})`;
        critMulSelect.appendChild(option);
    }
    critMulSelect.value = '1';
    controls.appendChild(critMulSelect);

    // ── Custom damage value input ──
    const damageInput = document.createElement('input');
    damageInput.type = 'number';
    damageInput.min = '0';
    damageInput.step = '1';
    damageInput.placeholder = 'Damage (random)';
    damageInput.title = 'Leave empty to use a random damage value';
    damageInput.style.width = '120px';
    controls.appendChild(damageInput);

    const readCustomDamage = () => {
        if (damageInput.value === '') return null;
        const v = Number(damageInput.value);
        return Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
    };

    const testButton = document.createElement('button');
    testButton.type = 'button';
    testButton.textContent = 'Test';
    testButton.addEventListener('click', () => {
        if (debuffSelect.value) {
            runDebuffPreview(preview, debuffSelect.value);
            return;
        }
        const selectedElement = elementSelect.value;
        const hitType = hitTypeSelect.value;
        const isCrit = hitType === 'crit' || hitType === 'crit_resist';
        const isResist = hitType === 'resist' || hitType === 'crit_resist';
        runMonsterTextPreview(
            preview,
            selectedElement,
            isCrit,
            isResist,
            readCustomDamage(),
                              Number(critMulSelect.value) || 1
        );
    });
    controls.appendChild(testButton);

    // ── Combined test: Debuff → Damage (sequential) ──
    const testComboButton = document.createElement('button');
    testComboButton.type = 'button';
    testComboButton.textContent = 'Test Debuff + Damage';
    testComboButton.title = 'Play selected debuff first, then the damage number';
    testComboButton.addEventListener('click', () => {
        const selectedElement = elementSelect.value;
        const hitType = hitTypeSelect.value;
        const isCrit = hitType === 'crit' || hitType === 'crit_resist';
        const isResist = hitType === 'resist' || hitType === 'crit_resist';
        runCombinedPreview(
            preview,
            selectedElement,
            isCrit,
            isResist,
            debuffSelect.value,
            readCustomDamage(),
                           Number(critMulSelect.value) || 1
        );
    });
    controls.appendChild(testComboButton);

    container.appendChild(controls);
    parent.appendChild(container);
}

function createFontControlSection(parent) {
    const container = document.createElement('div');

    const heading = document.createElement('h2');
    heading.textContent = 'Font (custom font should be installed in your system)';
    container.appendChild(heading);

    const fontControls = document.createElement('div');
    fontControls.className = 'mmk-text-preview-controls';

    const fontSelect = document.createElement('select');
    const customOption = document.createElement('option');
    customOption.value = 'Custom';
    customOption.textContent = 'Custom';
    fontSelect.appendChild(customOption);

    for (const fontName of Object.keys(damageFonts)) {
        const option = document.createElement('option');
        option.value = fontName;
        option.textContent = fontName;
        fontSelect.appendChild(option);
    }

    const isKnownFontPreset = Boolean($config.damageFontPreset && damageFonts[$config.damageFontPreset]);
    fontSelect.value = isKnownFontPreset ? $config.damageFontPreset : 'Custom';
    fontControls.appendChild(fontSelect);

    const customFontInput = createTextInput($config.damageFontCustom || 'Arial', (value) => {
        $config.damageFontCustom = value.trim() || 'Arial';
        if (fontSelect.value === 'Custom') {
            applyDamageFontFromConfig();
        }
    });
    customFontInput.className = 'mmk-font-custom-input';
    customFontInput.addEventListener('input', () => {
        $config.damageFontCustom = customFontInput.value.trim() || 'Arial';
        if (fontSelect.value === 'Custom') {
            applyDamageFontFromConfig();
        }
    });

    const syncCustomInputState = () => {
        const isCustom = fontSelect.value === 'Custom';
        customFontInput.disabled = !isCustom;
        customFontInput.style.display = isCustom ? 'inline-block' : 'none';
    };

    fontSelect.addEventListener('change', () => {
        $config.damageFontPreset = fontSelect.value;
        if ($config.damageFontPreset !== 'Custom') {
            importFontStyleSheet($config.damageFontPreset, damageFonts[$config.damageFontPreset]);
        }
        syncCustomInputState();
        applyDamageFontFromConfig();
    });

    syncCustomInputState();
    fontControls.appendChild(customFontInput);
    container.appendChild(fontControls);

    applyDamageFontFromConfig();
    parent.appendChild(container);
}

function createTextPositionSection(parent) {
    const container = document.createElement('div');

    const heading = document.createElement('h2');
    heading.textContent = 'Text Position';
    container.appendChild(heading);

    const [initialX = 0, initialY = 0] = Array.isArray($config.damageTextPos) ? $config.damageTextPos : [0, 0];
    const clampedX = clamp(Number(initialX), -150, 150);
    const clampedY = clamp(Number(initialY), -20, 20);

    const preview = createTextStylePreview(container, 'textpos');
    const previewText = document.createElement('div');
    previewText.className = 'mmk-text-position-preview-text';
    previewText.textContent = '123456';
    preview.appendChild(previewText);

    const updateTextPositionPreview = () => {
        const enemyElement = preview.querySelector('.btm1') || preview;
        const enemyRect = enemyElement.getBoundingClientRect();
        const previewRect = preview.getBoundingClientRect();
        const [offsetX, offsetY] = $config.damageTextPos;
        const physicalStyle = $config.elementStyles?.physical?.base || ['#8C8C8C', '#3A3A3A'];

        // Match showDamage coordinate model (rect.top + 60 baseline), in preview
        // container local coordinates.
        const localX = enemyRect.left - previewRect.left + enemyRect.width / 2 + offsetX;
        const localY = enemyRect.top - previewRect.top + enemyRect.height / 2 + offsetY - 13;

        previewText.style.left = `${localX}px`;
        previewText.style.top = `${localY}px`;
        previewText.style.color = physicalStyle[0];
        previewText.style.textShadow = getTextShadow(physicalStyle[1]);
        previewText.style.fontFamily = getDamageFontFamilyCssValue();
        previewText.style.fontStyle = $config.italicDamageText ? 'italic' : 'normal';
    };

    const xRow = document.createElement('div');
    xRow.className = 'mmk-text-position-row';
    const xLabel = document.createElement('label');
    xLabel.textContent = 'X';
    const xValue = document.createElement('span');
    xValue.className = 'mmk-range-value';
    xValue.textContent = String(clampedX);
    const xSlider = createRangeSlider(clampedX, { min: -150, max: 150, step: 1 }, (value) => {
        $config.damageTextPos[0] = value;
        xValue.textContent = String(value);
        updateTextPositionPreview();
    });
    xRow.appendChild(xLabel);
    xRow.appendChild(xSlider);
    xRow.appendChild(xValue);
    container.appendChild(xRow);

    const yRow = document.createElement('div');
    yRow.className = 'mmk-text-position-row';
    const yLabel = document.createElement('label');
    yLabel.textContent = 'Y';
    const yValue = document.createElement('span');
    yValue.className = 'mmk-range-value';
    yValue.textContent = String(clampedY);
    const ySlider = createRangeSlider(clampedY, { min: -20, max: 20, step: 1 }, (value) => {
        $config.damageTextPos[1] = value;
        yValue.textContent = String(value);
        updateTextPositionPreview();
    });
    yRow.appendChild(yLabel);
    yRow.appendChild(ySlider);
    yRow.appendChild(yValue);
    container.appendChild(yRow);

    parent.appendChild(container);

    updateTextPositionPreview();
    requestAnimationFrame(updateTextPositionPreview);
}

function createMultipleDamageIntervalSection(parent) {
    const safeValue = Number.isFinite(Number($config.multipleDamageInterval))
    ? Math.max(0, Number($config.multipleDamageInterval))
    : 0;

    const input = createNumberInput(
        safeValue,
        { min: 0, max: 10, step: 0.05 },
        (value) => {
            $config.multipleDamageInterval = Math.max(0, value);
        }
    );

    createConfigItem(
        parent,
        'Multiple Damage Display Interval',
        'Delay between multiple damage texts (seconds)',
                     input
    );
}

function createTextStyleSection(parent, element, styles) {
    const uiElementName = getUiElementName(element);
    const section = document.createElement('div');

    const heading = document.createElement('h2');
    heading.textContent = uiElementName;
    section.appendChild(heading);

    function createStyleRow(colorPair, labelPrefix) {
        const row = document.createElement('div');
        row.className = 'mmk-style-row';

        const controls = document.createElement('div');
        controls.className = 'mmk-style-controls';

        const sample = document.createElement('span');
        sample.className = `mmk-style-sample${labelPrefix === 'Crit' ? ' crit' : ''}`;
        sample.textContent = '123456';

        const updateSample = () => {
            sample.style.color = colorPair[0];
            sample.style.textShadow = getTextShadow(colorPair[1]);
            sample.style.fontFamily = getDamageFontFamilyCssValue();
            sample.style.fontStyle = $config.italicDamageText ? 'italic' : 'normal';
            if (labelPrefix === 'Crit') {
                sample.style.scale = String($config.animationOptions.crit.popScale);
            }
        };
        updateSample();

        const textLabel = document.createElement('label');
        const textInput = createColorInput(colorPair[0], (value) => {
            colorPair[0] = value;
            refreshDamageTextStyleSheet();
            updateSample();
        });
        textLabel.appendChild(textInput);
        textLabel.appendChild(document.createTextNode(` ${labelPrefix} text`));
        controls.appendChild(textLabel);

        const outlineLabel = document.createElement('label');
        const outlineInput = createColorInput(colorPair[1], (value) => {
            colorPair[1] = value;
            refreshDamageTextStyleSheet();
            updateSample();
        });
        outlineLabel.appendChild(outlineInput);
        outlineLabel.appendChild(document.createTextNode(` ${labelPrefix} outline`));
        controls.appendChild(outlineLabel);

        row.appendChild(controls);
        row.appendChild(sample);
        section.appendChild(row);
    }

    createStyleRow(styles.base, 'Normal');
    createStyleRow(styles.crit, 'Crit');

    parent.appendChild(section);
    return section;
}

// =============================================================================
// Preview functions — adapted for canvas rendering
// =============================================================================

function runMonsterTextPreview(preview, element, isCrit, isResist = false, customDamage = null, critMultiplier = 1) {
    const options = isCrit ? $config.animationOptions.crit : $config.animationOptions.normal;
    const enemyElement = preview.querySelector('.btm1') || preview;
    const rect = enemyElement.getBoundingClientRect();
    const dmg = Number.isFinite(customDamage) && customDamage >= 0
    ? customDamage
    : Math.floor(Math.random() * 150000);
    showDamagePreview(rect, dmg, isCrit, isResist, element, options, critMultiplier);
}

function runDebuffPreview(preview, debuffName) {
    const text = lookupDebuffEffect(debuffName);
    if (!text) return;
    const enemyElement = preview.querySelector('.btm1') || preview;
    const rect = enemyElement.getBoundingClientRect();
    showDamagePreview(rect, text, true, false, getDebuffElement(debuffName), $config.animationOptions.crit);
}

/**
 * Combined preview: debuff notice first, then a damage number after a short delay.
 * - debuffDelay = max(multipleDamageInterval, 250ms) when a debuff is selected
 * - customDamage: numeric override; null/undefined → random
 */
function runCombinedPreview(preview, element, isCrit, isResist, debuffName, customDamage, critMultiplier = 1) {
    const enemyElement = preview.querySelector('.btm1') || preview;
    const rect = enemyElement.getBoundingClientRect();
    const options = isCrit ? $config.animationOptions.crit : $config.animationOptions.normal;
    const dmg = Number.isFinite(customDamage) && customDamage >= 0
    ? customDamage
    : Math.floor(Math.random() * 150000);

    if (debuffName) {
        const text = lookupDebuffEffect(debuffName);
        if (text) {
            showDamagePreview(rect, text, true, false, getDebuffElement(debuffName), $config.animationOptions.crit);
        }
    }

    const interval = Math.max(0, Number($config.multipleDamageInterval) || 0) * 1000;
    const delay = debuffName ? Math.max(interval, 250) : 0;
    if (delay > 0) {
        setTimeout(() => {
            showDamagePreview(rect, dmg, isCrit, isResist, element, options, critMultiplier);
        }, delay);
    } else {
        showDamagePreview(rect, dmg, isCrit, isResist, element, options, critMultiplier);
    }
}

/**
 * Plays an explosion preview on the preview canvas at the preview container's
 * viewport position.
 */
function playExplosionPreview(previewContainer, element) {
    const rect = previewContainer.getBoundingClientRect();
    const x = rect.left + 40;
    const y = rect.top + 40;
    const size = Math.max(18, $config.explosionBaseSize);

    CanvasManager.addPreviewEffect(
        createExplosionEffect(x, y, element, size, false, false)
    );
}

function refreshDamageTextStyleSheet() {
    // Canvas renders text directly — no dynamic CSS needed for damage text.
    // Keep the style element for any residual CSS uses (settings preview samples
    // use inline styles set via JS, so this is a no-op for canvas mode).
    let styleElement = document.getElementById('mmk-text-style-sheet');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'mmk-text-style-sheet';
        document.head.appendChild(styleElement);
    }
    // Style sheet exists for compatibility but is empty — canvas handles rendering.
    styleElement.textContent = '';
    document.head.appendChild(styleElement);
}

function renderDesignOptions(parent) {

    createTextStylePreviewControls(parent);

    const textStyleTitle = document.createElement('h1');
    textStyleTitle.textContent = 'Text Style';
    parent.appendChild(textStyleTitle);

    createFontControlSection(parent);
    createTextPositionSection(parent);
    createMultipleDamageIntervalSection(parent);

    // ── Damage display format (full / K / 万) ──
    (() => {
        const select = document.createElement('select');
        [
            { value: 'full', label: 'Full  — 12345' },
     { value: 'k',    label: 'K     — 12K' },
     { value: 'wan',  label: '万    — 1.2万' },
        ].forEach(({ value, label }) => {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = label;
            if ($config.damageDisplayFormat === value) opt.selected = true;
            select.appendChild(opt);
        });
        select.addEventListener('change', () => {
            $config.damageDisplayFormat = select.value;
        });
        createConfigItem(
            parent,
            'Damage Display Format',
            'How to abbreviate large damage numbers',
            select
        );
    })();

    // ── Void Display Style ──
    (() => {
        const styleSelect = document.createElement('select');
        [
            { value: 'physical', label: 'Physical Colors' },
     { value: 'rainbow', label: 'Horizontal Rainbow' },
     { value: 'flow', label: 'Flow Rainbow (Vertical)' }
        ].forEach(({ value, label }) => {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = label;
            if ($config.voidStyle === value) opt.selected = true;
            styleSelect.appendChild(opt);
        });
        styleSelect.addEventListener('change', () => {
            $config.voidStyle = styleSelect.value;
        });
        createConfigItem(
            parent,
            'Void Damage Style',
            'How to render Void damage numbers',
            styleSelect
        );

        const colorInput = createTextInput(
            ($config.voidRainbowColors || []).join(', '),
                                           (value) => {
                                               const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
                                               if (parts.length >= 2) {
                                                   $config.voidRainbowColors = parts;
                                                   colorInput.value = parts.join(', ');
                                               } else {
                                                   colorInput.value = $config.voidRainbowColors.join(', ');
                                               }
                                           }
        );
        colorInput.style.minWidth = '320px';
        createConfigItem(
            parent,
            'Void Rainbow Colors (Horizontal)',
                         'Comma-separated color stops, left → right',
                         colorInput
        );

        const flowColorInput = createTextInput(
            ($config.voidFlowColors || []).join(', '),
                                               (value) => {
                                                   const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
                                                   if (parts.length >= 2) {
                                                       $config.voidFlowColors = parts;
                                                       flowColorInput.value = parts.join(', ');
                                                   } else {
                                                       flowColorInput.value = $config.voidFlowColors.join(', ');
                                                   }
                                               }
        );
        flowColorInput.style.minWidth = '320px';
        createConfigItem(
            parent,
            'Void Flow Colors (Vertical)',
                         'Comma-separated color stops, top → bottom (default extracted from image)',
                         flowColorInput
        );
        createConfigItem(
            parent,
            'Void Flow Speed',
            'Vertical scroll speed in pixels per second (0 = static)',
                         createNumberInput($config.voidFlowSpeed, { min: 0, max: 500, step: 10 }, (v) => {
                             $config.voidFlowSpeed = Math.max(0, v);
                         })
        );
    })();

    // ── Crit suffix "!!" toggle ──
    (() => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean($config.critSuffixExclamation);
        checkbox.addEventListener('change', () => {
            $config.critSuffixExclamation = checkbox.checked;
        });
        createConfigItem(
            parent,
            'Crit Suffix "!!"',
            'Append "!!" to critical hit damage numbers (e.g. 114514!!)',
                         checkbox
        );
    })();

    // ── Italic damage text toggle ──
    (() => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean($config.italicDamageText);
        checkbox.addEventListener('change', () => {
            $config.italicDamageText = checkbox.checked;
            // Rebuild glyph sprites and refresh panel samples
            applyDamageFontFromConfig();
        });
        createConfigItem(
            parent,
            'Italic Damage Text',
            'Render damage numbers and debuff notices in italic',
            checkbox
        );
    })();

    // ── Debuff text X offset ──
    (() => {
        const wrapper = document.createElement('div');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean($config.debuffTextOffsetEnabled);

        const offsetInput = createNumberInput(
            $config.debuffTextOffsetX,
            { min: -500, max: 500, step: 1 },
            (value) => { $config.debuffTextOffsetX = value; }
        );
        offsetInput.disabled = !$config.debuffTextOffsetEnabled;
        offsetInput.style.marginLeft = '6px';
        offsetInput.style.width = '70px';

        checkbox.addEventListener('change', () => {
            $config.debuffTextOffsetEnabled = checkbox.checked;
            offsetInput.disabled = !checkbox.checked;
        });

        wrapper.appendChild(checkbox);
        wrapper.appendChild(offsetInput);

        createConfigItem(
            parent,
            'Debuff Text X Offset',
            'Shift only debuff notices horizontally (px, negative = left)',
                         wrapper
        );
    })();

    for (const [element, styles] of Object.entries($config.elementStyles)) {
        createTextStyleSection(parent, element, styles);
    }

    // ── Resist colors (global, not per-element — matches HvDamageNumber6) ──
    const resistTitle = document.createElement('h1');
    resistTitle.textContent = 'Resist Colors';
    parent.appendChild(resistTitle);

    function createResistColorRow(label, textKey, outlineKey) {
        const row = document.createElement('div');
        row.className = 'mmk-style-row';

        const controls = document.createElement('div');
        controls.className = 'mmk-style-controls';

        const sample = document.createElement('span');
        sample.className = 'mmk-style-sample';
        sample.textContent = '123456';

        const updateSample = () => {
            sample.style.color = $config[textKey];
            sample.style.textShadow = getTextShadow($config[outlineKey]);
            sample.style.fontFamily = getDamageFontFamilyCssValue();
            sample.style.fontStyle = $config.italicDamageText ? 'italic' : 'normal';
        };
        updateSample();

        const textLabel = document.createElement('label');
        const textInput = createColorInput($config[textKey], (value) => {
            $config[textKey] = value;
            updateSample();
        });
        textLabel.appendChild(textInput);
        textLabel.appendChild(document.createTextNode(` ${label} text`));
        controls.appendChild(textLabel);

        const outlineLabel = document.createElement('label');
        const outlineInput = createColorInput($config[outlineKey], (value) => {
            $config[outlineKey] = value;
            updateSample();
        });
        outlineLabel.appendChild(outlineInput);
        outlineLabel.appendChild(document.createTextNode(` ${label} outline`));
        controls.appendChild(outlineLabel);

        row.appendChild(controls);
        row.appendChild(sample);
        resistTitle.parentNode.appendChild(row);
    }

    createResistColorRow('Resist', 'resistTextColor', 'resistOutlineColor');
    createResistColorRow('Crit+Resist', 'critResistTextColor', 'critResistOutlineColor');

    const explosionTitle = document.createElement('h1');
    explosionTitle.textContent = 'Explosion Color';
    parent.appendChild(explosionTitle);

    const colorMap = $config.explosionBaseColors || {};
    for (const [element, color] of Object.entries(colorMap)) {
        const uiElementName = getUiElementName(element);
        const input = createColorInput(color, (value) => {
            $config.explosionBaseColors[element] = value;
        });

        const item = createConfigItem(
            parent,
            `Explosion Base Color (${uiElementName})`,
                                      `Base color used to derive dynamic explosion palette for ${uiElementName}`,
                                      input
        );

        createExplosionPreview(item, element);
    }
}

function renderAnimationOptions(parent) {
    // ── Target FPS ──
    (() => {
        const select = document.createElement('select');
        [30, 60].forEach(fps => {
            const opt = document.createElement('option');
            opt.value = String(fps);
            opt.textContent = fps + ' FPS';
            if ($config.targetFPS === fps) opt.selected = true;
            select.appendChild(opt);
        });
        select.addEventListener('change', () => {
            $config.targetFPS = Number(select.value);
        });
        createConfigItem(
            parent,
            'Target FPS',
            'Canvas render frame rate (lower = less GPU usage)',
                         select
        );
    })();

    createConfigItem(
        parent,
        'Explosion Base Size',
        'Base particle size for explosion effect',
        createNumberInput($config.explosionBaseSize, { min: 1, max: 200, step: 1 }, (v) => { $config.explosionBaseSize = v; })
    );

    createConfigItem(
        parent,
        'Critical Hit Scale',
        'Multiplier applied to explosion size on critical hits',
        createNumberInput($config.critHitScale, { min: 0, max: 10, step: 0.1 }, (v) => { $config.critHitScale = v; })
    );

    createConfigItem(
        parent,
        'Glanced Hit Scale',
        'Multiplier applied to explosion size on glanced hits',
        createNumberInput($config.glancedHitScale, { min: 0, max: 10, step: 0.1 }, (v) => { $config.glancedHitScale = v; })
    );

    // ── Filter checkbox ──
    (() => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = $config.filterDamageBelow1000;
        checkbox.addEventListener('change', () => {
            $config.filterDamageBelow1000 = checkbox.checked;
        });
        createConfigItem(
            parent,
            'Filter Damage Below 1000',
            'Hide all damage numbers and explosions for hits under 1000 damage',
            checkbox
        );
    })();

    createConfigItem(
        parent,
        'Normal Pop Scale',
        'Damage text scale for normal hits',
        createNumberInput($config.animationOptions.normal.popScale, { min: 0, max: 10, step: 0.1 }, (v) => { $config.animationOptions.normal.popScale = v; })
    );

    createConfigItem(
        parent,
        'Normal Pop Duration',
        'Damage text duration for normal hits (seconds)',
                     createNumberInput($config.animationOptions.normal.popDuration, { min: 0, max: 10, step: 0.05 }, (v) => { $config.animationOptions.normal.popDuration = v; })
    );

    createConfigItem(
        parent,
        'Critical Pop Scale',
        'Damage text scale for critical hits',
        createNumberInput($config.animationOptions.crit.popScale, { min: 0, max: 10, step: 0.1 }, (v) => { $config.animationOptions.crit.popScale = v; })
    );

    createConfigItem(
        parent,
        'Critical Pop Duration',
        'Damage text duration for critical hits (seconds)',
                     createNumberInput($config.animationOptions.crit.popDuration, { min: 0, max: 10, step: 0.05 }, (v) => { $config.animationOptions.crit.popDuration = v; })
    );
}

// =============================================================================
// Settings panel open/close (unchanged)
// =============================================================================

function renderPlayerTab(parent) {
    const title = document.createElement('h1');
    title.textContent = 'Player Action Preview';
    parent.appendChild(title);

    // 预览框（用于定位的占位框）
    const previewBox = document.createElement('div');
    previewBox.style.cssText = 'width:100%; max-width:656px; aspect-ratio:656/610; background:#222; position:relative; margin:10px 0; overflow:hidden; border:2px solid var(--color-border-default); display:flex; align-items:center; justify-content:center;';

    const label = document.createElement('div');
    label.textContent = 'battle_left (656x610)';
    label.style.cssText = 'color:#888; pointer-events:none;';
    previewBox.appendChild(label);
    parent.appendChild(previewBox);

    // 按钮与下拉
    const controls = document.createElement('div');
    controls.className = 'mmk-text-preview-controls';

    const elementSelect = document.createElement('select');
    const previewElements = Object.keys($config.elementStyles);
    if (!previewElements.includes('void')) {
        previewElements.push('void');
    }
    for (const element of previewElements) {
        const opt = document.createElement('option');
        opt.value = element;
        opt.textContent = getUiElementName(element);
        if ($config.playerActionElement === element) opt.selected = true;
        elementSelect.appendChild(opt);
    }
    elementSelect.addEventListener('change', () => {
        $config.playerActionElement = elementSelect.value;
    });
    controls.appendChild(elementSelect);

    // 技能/药品选择下拉框
    const actionSelect = document.createElement('select');
    for (const [name, text] of Object.entries(playerActionEffects)) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = `${text} (${name})`;
        actionSelect.appendChild(opt);
    }
    controls.appendChild(actionSelect);

    const testBtn = createConfigButton('Test', controls, () => {
        // 直接在 Canvas 上实际渲染测试选中的技能
        const selectedText = playerActionEffects[actionSelect.value] || '🥤生命药水';
        showPlayerActionPreview(previewBox, selectedText);
    });
    parent.appendChild(controls);

    // 组偏移 X
    const xRow = document.createElement('div');
    xRow.className = 'mmk-text-position-row';
    xRow.innerHTML = '<label>Group X</label>';
    const xVal = document.createElement('span'); xVal.className = 'mmk-range-value'; xVal.textContent = $config.playerActionOffsetX;
    xRow.appendChild(createRangeSlider($config.playerActionOffsetX, {min:-1000, max:1000, step:1}, v => {
        $config.playerActionOffsetX = v; xVal.textContent = v;
    }));
    xRow.appendChild(xVal);
    parent.appendChild(xRow);

    // 组偏移 Y
    const yRow = document.createElement('div');
    yRow.className = 'mmk-text-position-row';
    yRow.innerHTML = '<label>Group Y</label>';
    const yVal = document.createElement('span'); yVal.className = 'mmk-range-value'; yVal.textContent = $config.playerActionOffsetY;
    yRow.appendChild(createRangeSlider($config.playerActionOffsetY, {min:-1000, max:1000, step:1}, v => {
        $config.playerActionOffsetY = v; yVal.textContent = v;
    }));
    yRow.appendChild(yVal);
    parent.appendChild(yRow);

    // 独立文字偏移 X
    const txRow = document.createElement('div');
    txRow.className = 'mmk-text-position-row';
    txRow.innerHTML = '<label>Text X</label>';
    const txVal = document.createElement('span'); txVal.className = 'mmk-range-value'; txVal.textContent = $config.playerTextOffsetX;
    txRow.appendChild(createRangeSlider($config.playerTextOffsetX, {min:-500, max:500, step:1}, v => {
        $config.playerTextOffsetX = v; txVal.textContent = v;
    }));
    txRow.appendChild(txVal);
    parent.appendChild(txRow);

    // 独立文字偏移 Y
    const tyRow = document.createElement('div');
    tyRow.className = 'mmk-text-position-row';
    tyRow.innerHTML = '<label>Text Y</label>';
    const tyVal = document.createElement('span'); tyVal.className = 'mmk-range-value'; tyVal.textContent = $config.playerTextOffsetY;
    tyRow.appendChild(createRangeSlider($config.playerTextOffsetY, {min:-500, max:500, step:1}, v => {
        $config.playerTextOffsetY = v; tyVal.textContent = v;
    }));
    tyRow.appendChild(tyVal);
    parent.appendChild(tyRow);
}

function createSettingsUI() {
    const targetElement = document.querySelector('.hvut-top-sub.hvut-top-config');
    if (targetElement) {
        if (targetElement.querySelector('.mmksettings')) {
            return;
        }

        const settingsDiv = document.createElement('div');
        settingsDiv.className = 'mmksettings';
        settingsDiv.textContent = 'MMK Settings';
        settingsDiv.addEventListener('click', openDamageDisplaySettings);
        targetElement.appendChild(settingsDiv);
    }
}

function openDamageDisplaySettings() {
    const csp = document.getElementById('csp');
    if (!csp) return;

    closeDamageDisplaySettings();
    CanvasManager.initPreview();

    const cfgDiv = document.createElement('div');
    cfgDiv.id = 'mmk-cfg-div';
    configOpenSnapshot = JSON.parse(JSON.stringify($config));

    const header = document.createElement('header');
    header.textContent = 'MMK Settings';
    cfgDiv.appendChild(header);

    // Tab Navigation
    const tabNav = document.createElement('div');
    tabNav.style.cssText = 'display:flex; gap:10px; margin-bottom:10px; padding:0 10px;';
    const btnEnemy = createConfigButton('对敌特效', tabNav, () => switchTab('enemy'));
    const btnPlayer = createConfigButton('玩家特效', tabNav, () => switchTab('player'));
    cfgDiv.appendChild(tabNav);

    const contentEnemy = document.createElement('div');
    contentEnemy.style.display = 'none';
    cfgDiv.appendChild(contentEnemy);

    const contentPlayer = document.createElement('div');
    contentPlayer.style.display = 'none';
    cfgDiv.appendChild(contentPlayer);

    function switchTab(tab) {
        contentEnemy.style.display = tab === 'enemy' ? 'block' : 'none';
        contentPlayer.style.display = tab === 'player' ? 'block' : 'none';
        btnEnemy.style.backgroundColor = tab === 'enemy' ? 'var(--color-bg-alpha)' : '';
        btnPlayer.style.backgroundColor = tab === 'player' ? 'var(--color-bg-alpha)' : '';
    }

    // Build Enemy Tab
    const designTitle = document.createElement('h1');
    designTitle.textContent = 'Preview';
    contentEnemy.appendChild(designTitle);
    renderDesignOptions(contentEnemy);

    const animationTitle = document.createElement('h1');
    animationTitle.textContent = 'Animation';
    contentEnemy.appendChild(animationTitle);
    renderAnimationOptions(contentEnemy);

    // Build Player Tab
    renderPlayerTab(contentPlayer);

    switchTab('enemy'); // 默认显示对敌

    const bottom = document.createElement('footer');
    cfgDiv.appendChild(bottom);
    createConfigButton('Save', bottom, () => { saveConfig(true); });
    createConfigButton('Close', bottom, () => { closeDamageDisplaySettings(); });
    createConfigButton('Revert', bottom, () => {
        const snapshot = configOpenSnapshot;
        applyConfig(snapshot);
        closeDamageDisplaySettings();
        openDamageDisplaySettings();
        configOpenSnapshot = snapshot;
    });
    createConfigButton('Default', bottom, () => {
        applyConfig(defaultConfig);
        closeDamageDisplaySettings();
        openDamageDisplaySettings();
    });

    csp.appendChild(cfgDiv);
}

// =============================================================================
// Combat log parsing (original English log only)
// =============================================================================

function normalizeElement(element) {
    const elementMap = {
        'elec': 'shock',
        'fire': 'fire',
        'ice': 'ice',
        'cold': 'ice',
        'shock': 'shock',
        'wind': 'wind',
        'holy': 'holy',
        'dark': 'dark',
        'void': 'void',
        'slashing': 'physical',
        'piercing': 'physical'
    };
    return elementMap[element.toLowerCase()] || 'physical';
}

function parseCombatLog(lines) {
    return lines.reduce((results, sourceLine) => {
        let damage = null;
        const line = sourceLine.trim();

        // You cast [skillName]. / You use [itemName].
        if (/^You (?:cast|use) (.+)\.$/.test(line)) {
            const match = line.match(/^You (?:cast|use) (.+)\.$/);
            if (match) {
                const actionName = match[1];
                if (playerActionEffects[actionName]) {
                    damage = {
                        monsterName: 'PLAYER',
                        damage: playerActionEffects[actionName],
                        isCrit: true,
                        element: $config.playerActionElement,
                        resisted: null,
                        isPlayerAction: true
                    };
                }
            }
        }
        // [monsterName] gains the effect [effectName].
        else if (line.includes(' gains the effect ') && line.endsWith('.')) {
            const match = line.match(/^(.+) gains the effect (.+)\.$/);
            if (match) {
                const debuffName = match[2].trim();
                const debuffText = lookupDebuffEffect(debuffName);
                if (debuffText) {
                    damage = {
                        monsterName: match[1],
                        damage: debuffText,
                        isCrit: true,
                        element: getDebuffElement(debuffName),
                        resisted: null,
                        isText: true
                    };
                }
            }
        }

        // You hit [monsterName], causing xxx points of [element] damage.
        else if (line.startsWith('You hit') || line.startsWith('You glance')) {
            const match = line.match(/You (?:hit|glance) (.+?), causing (\d+) points of (\w+) damage/);
            if (match) {
                damage = {
                    monsterName: match[1],
                    damage: parseInt(match[2], 10),
                        isCrit: false,
                        element: normalizeElement(match[3]),
                        resisted: null
                };
            }
        }

        // You counter [monsterName], causing xx points of [element] damage.
        else if (/^You (?:(?:\d+x-)?crit|counter)/.test(line)) {
            const match = line.match(/You (?:(\d+)x-)?(crit|counter) (.+?), causing (\d+) points of (\w+) damage/);
            if (match) {
                const isCounter = match[2] === 'counter';
                damage = {
                    monsterName: match[3],
                    damage: parseInt(match[4], 10),
                        isCrit: !isCounter,
                        critMultiplier: match[1] ? parseInt(match[1], 10) : 1,
                        element: normalizeElement(match[5]),
                        resisted: null
                };
            } else {
                const counterMatch = line.match(/You counter (.+?) for (\d+) points of (\w+) damage/);
                if (counterMatch) {
                    damage = {
                        monsterName: counterMatch[1],
                        damage: parseInt(counterMatch[2], 10),
                        isCrit: false,
                        element: normalizeElement(counterMatch[3]),
                        resisted: null
                    };
                }
            }
        }

        // [element] Strike hits [monsterName], causing xx additional points of [element] damage.
        else if (line.includes(' Strike hits')) {
            const match = line.match(/(\w+) Strike hits (.+?), causing (\d+) additional points of (\w+) damage/);
            if (match) {
                damage = {
                    monsterName: match[2],
                    damage: parseInt(match[3], 10),
                        isCrit: false,
                        element: normalizeElement(match[4]),
                        resisted: null
                };
            }
        }

        // [monsterName] was hit/crit for xxx [element] damage.
        else if (line.includes(' was hit') || line.includes(' was crit')) {
            const match = line.match(/(.+?) was (?:hit|crit) for (\d+) (\w+) damage/);
            if (match) {
                damage = {
                    monsterName: match[1],
                    damage: parseInt(match[2], 10),
                        isCrit: line.includes(' was crit'),
                        element: normalizeElement(match[3]),
                        resisted: null
                };
            }
        }

        // your [skillName] hits [monsterName] for xx points of [element] damage.
        else if (line.startsWith('your') && line.includes(' hits ')) {
            const match = line.match(/your (.+?) hits (.+?) for (\d+) (?:additional )?points of (\w+) damage/);
            if (match) {
                const skillName = match[1];
                const monsterName = match[2];
                const dmg = parseInt(match[3], 10);
                let element = normalizeElement(match[4]);

                if (damageTypes[skillName]) {
                    element = damageTypes[skillName];
                }

                damage = {
                    monsterName: monsterName,
                    damage: dmg,
                    isCrit: false,
                    element: element,
                    resisted: null
                };
            }
        }

        // [skillName] hits/crits/blasts [monsterName], causing/for xxx [element] damage.
        else {
            const causingMatch = line.match(/^(.+?) (hits|crits|blasts) (.+?), causing (\d+) (?:additional )?points of (\w+) damage\.?$/);
            const blastMatch = causingMatch || line.match(/^(.+?) (blasts|hits) (.+?) for (\d+)(?: (?:additional )?points of (\w+)| (\w+))? damage\.?$/);

            if (blastMatch) {
                const skillName = blastMatch[1];
                const monsterName = blastMatch[3];
                const dmg = parseInt(blastMatch[4], 10);
                let element = blastMatch[5] ? normalizeElement(blastMatch[5]) : blastMatch[6] ? normalizeElement(blastMatch[6]) : 'physical';

                if (damageTypes[skillName]) {
                    element = damageTypes[skillName];
                }

                damage = {
                    monsterName: monsterName,
                    damage: dmg,
                    isCrit: blastMatch[2] === 'crits' || blastMatch[2] === 'blasts',
                    element: element,
                    resisted: null
                };
            }
        }

        if (damage) {
            results.push(damage);
        }
        return results;
    }, []);
}

// =============================================================================
// Core rendering — Canvas-based (replaces DOM creation + CSS animation)
// =============================================================================

/**
 * Format a raw damage number according to the user's display preference.
 *   'full' → "12345"
 *   'k'    → "12K"    (Western, damage > 1000)
 *   'wan'  → "1.2万"  (Chinese, damage ≥ 10000)
 */
function formatDamageNumber(damage) {
    const fmt = $config.damageDisplayFormat || 'k';
    if (fmt === 'full') {
        return String(damage);
    }
    if (fmt === 'wan') {
        if (damage >= 10000) {
            const wan = damage / 10000;
            const s = wan % 1 === 0
            ? String(Math.round(wan))
            : wan.toFixed(1).replace(/\.0$/, '');
            return s + '万';
        }
        return String(damage);
    }
    // default 'k'
    if (damage > 1000) {
        return Math.round(damage / 1000) + 'K';
    }
    return String(damage);
}

function getCritSuffix(critMultiplier) {
    const m = Math.max(1, Math.min(9, Math.floor(Number(critMultiplier) || 1)));
    if (m <= 4) {
        return '!'.repeat(m === 1 ? 2 : m);
    }
    return '?' + '!'.repeat(m - 5);
}

/**
 * Adds a damage-text effect and an explosion effect to the battle canvas.
 * Coordinates are converted from viewport-relative to #battle_right-local.
 */
function showDamage(enemyRect, damage, isCrit = false, isResist = false, element = 'physical', options = {}, critMultiplier = 1) {
    const isTextEffect = typeof damage === 'string';

    // ── Filter: skip small damage entirely (no text, no explosion) ──
    if (!isTextEffect && $config.filterDamageBelow1000 && damage < 1000) {
        return;
    }
    if (!enemyRect || (enemyRect.width === 0 && enemyRect.height === 0)) return;

    const offset = CanvasManager.getViewportOffset();
    let [posOffsetX, posOffsetY] = $config.damageTextPos;
    if (isTextEffect && $config.debuffTextOffsetEnabled) {
        posOffsetX += Number($config.debuffTextOffsetX) || 0;
    }
    const enemyX = enemyRect.left - offset.x + enemyRect.width / 2 + posOffsetX;
    const enemyY = enemyRect.top - offset.y + enemyRect.height / 2 + posOffsetY - 13;

    let displayDamage = isTextEffect ? damage : formatDamageNumber(damage);
    if (!isTextEffect && isCrit && $config.critSuffixExclamation) {
        displayDamage += getCritSuffix(critMultiplier);
    }

    // Text effects (debuff notices) skip the explosion — they are not damage numbers.
    if (!isTextEffect) {
        createExplosion(enemyRect, isCrit, isResist, element);
    }

    // Add damage text effect
    CanvasManager.addEffect(
        createDamageTextEffect(enemyX, enemyY, displayDamage, element, isCrit, isResist, options)
    );
}

/**
 * Preview variant — viewport-relative coordinates, targets the preview canvas.
 */
function showDamagePreview(enemyRect, damage, isCrit = false, isResist = false, element = 'physical', options = {}, critMultiplier = 1) {
    const isTextEffect = typeof damage === 'string';

    if (!isTextEffect && $config.filterDamageBelow1000 && damage < 1000) {
        return;
    }
    if (!enemyRect || (enemyRect.width === 0 && enemyRect.height === 0)) return;

    let [posOffsetX, posOffsetY] = $config.damageTextPos;
    if (isTextEffect && $config.debuffTextOffsetEnabled) {
        posOffsetX += Number($config.debuffTextOffsetX) || 0;
    }
    const enemyX = enemyRect.left + enemyRect.width / 2 + posOffsetX;
    const enemyY = enemyRect.top + enemyRect.height / 2 + posOffsetY - 13;

    let displayDamage = isTextEffect ? damage : formatDamageNumber(damage);
    if (!isTextEffect && isCrit && $config.critSuffixExclamation) {
        displayDamage += getCritSuffix(critMultiplier);
    }

    if (!isTextEffect) {
        createExplosionPreview(enemyRect, isCrit, isResist, element);
    }

    CanvasManager.addPreviewEffect(
        createDamageTextEffect(enemyX, enemyY, displayDamage, element, isCrit, isResist, options)
    );
}

/**
 * Adds an explosion effect to the battle canvas.
 * Position is randomized within the enemy's bounding rect, then converted
 * to #battle_right-local coordinates.
 */
function createExplosion(enemyRect, isCrit = false, isResist = false, element = 'physical') {
    if (!enemyRect || (enemyRect.width === 0 && enemyRect.height === 0)) return;

    const offset = CanvasManager.getViewportOffset();
    const minX = Number.isFinite($config.expPosMinX) ? $config.expPosMinX : 0;
    const maxX = Number.isFinite($config.expPosMaxX) ? $config.expPosMaxX : 360;
    const minY = Number.isFinite($config.expPosMinY) ? $config.expPosMinY : 0;
    const maxY = Number.isFinite($config.expPosMaxY) ? $config.expPosMaxY : 50;

    const randX = Math.min(minX, maxX) + Math.random() * Math.abs(maxX - minX);
    const randY = Math.min(minY, maxY) + Math.random() * Math.abs(maxY - minY);

    const x = enemyRect.left - offset.x + randX;
    const y = enemyRect.top - offset.y + randY;
    const size = $config.explosionBaseSize;

    CanvasManager.addEffect(
        createExplosionEffect(x, y, element, size, isCrit, isResist)
    );
}

/**
 * Preview variant — viewport-relative coordinates, targets the preview canvas.
 */
function createExplosionPreview(enemyRect, isCrit = false, isResist = false, element = 'physical') {
    if (!enemyRect || (enemyRect.width === 0 && enemyRect.height === 0)) return;
    const minX = Number.isFinite($config.expPosMinX) ? $config.expPosMinX : 0;
    const maxX = Number.isFinite($config.expPosMaxX) ? $config.expPosMaxX : 360;
    const minY = Number.isFinite($config.expPosMinY) ? $config.expPosMinY : 0;
    const maxY = Number.isFinite($config.expPosMaxY) ? $config.expPosMaxY : 50;

    const randX = Math.min(minX, maxX) + Math.random() * Math.abs(maxX - minX);
    const randY = Math.min(minY, maxY) + Math.random() * Math.abs(maxY - minY);

    const x = enemyRect.left + randX;
    const y = enemyRect.top + randY;
    const size = $config.explosionBaseSize;

    CanvasManager.addPreviewEffect(
        createExplosionEffect(x, y, element, size, isCrit, isResist)
    );
}

/**
 * Hit shake — kept as DOM class toggle (lightweight, one class per monster).
 */
function playHitAnimation(enemy) {
    if (!enemy || !enemy.isConnected) return;
    // Web Animations API — compositor-only transform animation.
    // No class toggle, no forced reflow (no offsetWidth hack), each call
    // creates an independent animation that the compositor handles directly.
    // GPU cost ≈ zero: translateX is a compositor property, same tier as opacity.
    enemy.animate([
        { transform: 'translateX(0)' },
                  { transform: 'translateX(10px)' },
                  { transform: 'translateX(0)' }
    ], {
        duration: 200,
        easing: 'ease-out',
    });
}

// =============================================================================
// Battle log observer + main loop trigger
// =============================================================================

function getCurrentTurn(table) {
    const rows = [];
    for (const row of table.rows) {
        if (row.querySelector('td.tls')) break;
        rows.push(row);
    }
    return rows;
}

function getPreviousTurn(table) {
    const lines = [];
    let afterSeparator = false;
    for (const row of table.rows) {
        if (row.querySelector('td.tls')) {
            if (afterSeparator) break;
            afterSeparator = true;
        } else if (afterSeparator) {
            lines.push(row.textContent);
        }
    }
    return lines;
}

let logObserverInitialized = false;
let lastTurnLines = [];
let lastPreviousTurnLines = [];
const monsterPositionCache = new Map();

function getPlayerBackgroundImage() {
    const el = document.getElementById('battle_left');
    if (el) {
        const bg = window.getComputedStyle(el, '::before').backgroundImage;
        if (bg && bg !== 'none') {
            const match = bg.match(/url\(["']?(.+?)["']?\)/);
            if (match && match[1]) {
                // 处理相对路径
                return new URL(match[1], window.location.href).href;
            }
        }
    }
    return 'https://static.wikia.nocookie.net/honkaiimpact3_gamepedia_en/images/3/3d/Hi%E2%99%AA_Love_Elf%E2%99%A5_%28Smile%29_%28Bust%29.png';
}

const imageCache = new Map();

function createPlayerActionEffect(x, y, text, element, imgUrl, imgSize, options) {
    const popScale = options.popScale || 1.6;
    const popDuration = options.popDuration || 1;

    const textOffsetX = $config.playerTextOffsetX || 0;
    const textOffsetY = $config.playerTextOffsetY || 0;
    const finalText = text + ($config.critSuffixExclamation ? '!!' : '');

    // 提前测量文字总宽度，确保精准居中
    const fontSize = 24;
    const fontFamily = getDamageFontFamilyCssValue();
    const italic = Boolean($config.italicDamageText);
    const digits = splitTextToGlyphs(finalText);

    const tctx = document.createElement('canvas').getContext('2d');
    tctx.font = `${italic ? 'italic ' : ''}bold ${fontSize}px ${fontFamily}`;
    const spacingPx = Math.round(fontSize * 0.06);
    let totalWidth = 0;
    for (let i = 0; i < digits.length; i++) {
        totalWidth += tctx.measureText(digits[i]).width + (i < digits.length - 1 ? spacingPx : 0);
    }

    // 文字复用 createDamageTextEffect，完美支持 Void 流动渐变等所有样式
    // 传入的 x 主动减去 totalWidth / 2，并在 Y 减去基线偏移
    const textEffect = createDamageTextEffect(
        x + textOffsetX - totalWidth / 2,
        y + imgSize / 2 + 15 + textOffsetY - fontSize * 0.55,
        finalText,
        element,
        true,
        false,
        options
    );

    // 图片加载
    let img = imageCache.get(imgUrl);
    if (!img) {
        img = new Image();
        img.src = imgUrl;
        imageCache.set(imgUrl, img);
    }

    const effectivePopScale = popScale + 0.1;
    const initialScale = 4;
    const scaleDelta = effectivePopScale - initialScale;

    return {
        type: 'player_action',
        duration: popDuration,
        startTime: 0,
        draw(ctx, elapsed) {
            const raw = elapsed / popDuration;
            if (raw >= 1) return;

            // 图片的缩放与上浮（与文字特效内部公式完全一致，保证同频）
            let scale, opacity, transY;
            if (raw < 0.3) {
                const segT = bounceEase(raw / 0.3);
                scale = initialScale + scaleDelta * segT;
                opacity = segT;
                transY = 0;
            } else if (raw < 0.65) {
                const segT = bounceEase((raw - 0.3) / 0.35);
                scale = effectivePopScale;
                opacity = 1;
                transY = -5 * segT;
            } else {
                const segT = bounceEase((raw - 0.65) / 0.35);
                scale = effectivePopScale;
                opacity = 1 - segT;
                transY = -5 - 5 * segT;
            }

            if (opacity <= 0.001) return;

            // 1. 绘制图片
            ctx.globalAlpha = Math.min(1, Math.max(0, opacity));
            if (img.complete && img.naturalWidth > 0) {
                ctx.save();
                ctx.translate(x, y + transY);
                ctx.scale(scale, scale);

                // 根据图片原始比例计算实际渲染的宽高（Contain模式，不拉伸）
                let drawW = imgSize, drawH = imgSize;
                const ratio = img.naturalWidth / img.naturalHeight;
                if (ratio > 1) {
                    drawH = imgSize / ratio;
                } else {
                    drawW = imgSize * ratio;
                }

                ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
                ctx.restore();
            }
            ctx.globalAlpha = 1;

            // 2. 绘制文字（直接调用子特效的 draw）
            textEffect.draw(ctx, elapsed);
        }
    };
}

function showPlayerAction(text) {
    const el = document.getElementById('battle_left');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!el.isConnected || (rect.width === 0 && rect.height === 0)) return;

    const offset = CanvasManager.getViewportOffset();

    // 整体偏移基座
    const baseX = rect.left - offset.x + rect.width / 2 + ($config.playerActionOffsetX || 0);
    const baseY = rect.top - offset.y + rect.height / 2 + ($config.playerActionOffsetY || 0);

    const options = $config.animationOptions.crit;
    const imgSize = 120;
    const url = getPlayerBackgroundImage();

    CanvasManager.addEffect(
        createPlayerActionEffect(baseX, baseY, text, $config.playerActionElement, url, imgSize, options)
    );
}

function showPlayerActionPreview(previewBox, text) {
    const rect = previewBox.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const baseX = rect.left + rect.width / 2 + ($config.playerActionOffsetX || 0);
    const baseY = rect.top + rect.height / 2 + ($config.playerActionOffsetY || 0);

    const options = $config.animationOptions.crit;
    const imgSize = 120;
    const url = getPlayerBackgroundImage();

    CanvasManager.addPreviewEffect(
        createPlayerActionEffect(baseX, baseY, text, $config.playerActionElement, url, imgSize, options)
    );
}

function showDamageNumber() {
    const table = document.getElementById('textlog');
    if (!table) return;
    const currentLines = getCurrentTurn(table).map(row => row.textContent);
    const previousLines = getPreviousTurn(table);
    const newTurn = previousLines.length === lastTurnLines.length &&
    previousLines.every((line, index) => line === lastTurnLines[index]) &&
    (previousLines.length !== lastPreviousTurnLines.length ||
    previousLines.some((line, index) => line !== lastPreviousTurnLines[index]));
    let prefix = 0;
    while (prefix < lastTurnLines.length && prefix < currentLines.length &&
        lastTurnLines[prefix] === currentLines[prefix]) {
        prefix++;
        }
        let suffix = 0;
    while (suffix < lastTurnLines.length && suffix < currentLines.length &&
        lastTurnLines[lastTurnLines.length - 1 - suffix] === currentLines[currentLines.length - 1 - suffix]) {
        suffix++;
        }
        const lines = newTurn ? currentLines :
        suffix > prefix ? currentLines.slice(0, currentLines.length - suffix) : currentLines.slice(prefix);
    lastTurnLines = currentLines;
    lastPreviousTurnLines = previousLines;
    if (lines.length === 0) return;
    const damages = parseCombatLog(lines);
    if (damages.length === 0) return;

    const playerActions = [];
    const monsterNameDamages = {};
    for (const damage of damages) {
        if (damage.isPlayerAction) {
            playerActions.push(damage);
            continue;
        }
        const name = damage.monsterName?.trim();
        if (!name || name === 'you') continue;
        if (!monsterNameDamages[name]) {
            monsterNameDamages[name] = [];
        }
        monsterNameDamages[name].push(damage);
    }

    if (playerActions.length > 0) {
        playerActions.forEach((entry, index) => {
            const delayMs = index * $config.multipleDamageInterval * 1000;
            setTimeout(() => {
                showPlayerAction(entry.damage);
            }, delayMs);
        });
    }

    const monsters = new Map();
    for (const div of document.querySelectorAll('#pane_monster > div')) {
        const name = div.querySelector('.btm3 div div')?.textContent.trim();
        if (name) {
            monsters.set(name, div);
            const rect = div.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                monsterPositionCache.set(name, rect);
            }
        }
    }

    for (const monsterName in monsterNameDamages) {
        const damageList = monsterNameDamages[monsterName];
        const foundDiv = monsters.get(monsterName);

        // 优先获取实时位置，如果怪物已死或隐藏，退回缓存位置
        let rect = foundDiv ? foundDiv.getBoundingClientRect() : null;
        if (!rect || (rect.width === 0 && rect.height === 0)) {
            rect = monsterPositionCache.get(monsterName);
        }
        if (!rect) continue;

        if (foundDiv && foundDiv.isConnected) {
            playHitAnimation(foundDiv);
        }

        damageList.forEach((entry, index) => {
            const options = entry.isCrit ? $config.animationOptions.crit : $config.animationOptions.normal;
            const delayMs = index * $config.multipleDamageInterval * 1000;

            setTimeout(() => {
                showDamage(
                    rect,
                    entry.damage,
                    entry.isCrit,
                    entry.resisted,
                    entry.element,
                    options,
                    entry.critMultiplier || 1
                );
            }, delayMs);
        });
    }
}

let currentBattleLogElement = null;
let battleLogObserver = null;
let battleRootObserver = null;

function attachBattleLogObserver() {
    const battleLog = document.getElementById('textlog');
    if (battleLog === currentBattleLogElement) return;

    if (battleLogObserver) {
        battleLogObserver.disconnect();
        battleLogObserver = null;
    }

    currentBattleLogElement = battleLog;
    if (!battleLog) return;

    battleLogObserver = new MutationObserver(showDamageNumber);
    battleLogObserver.observe(battleLog, { subtree: true, childList: true, characterData: true });
    if (!logObserverInitialized) {
        lastTurnLines = getCurrentTurn(battleLog).map(row => row.textContent);
        lastPreviousTurnLines = getPreviousTurn(battleLog);
        logObserverInitialized = true;
    } else {
        showDamageNumber();
    }
}

function Enhance() {
    waitForElement('.hvut-top-sub.hvut-top-config', createSettingsUI);

    attachBattleLogObserver();

    if (!battleRootObserver) {
        battleRootObserver = new MutationObserver(() => {
            CanvasManager.ensureCanvasInDOM();
            attachBattleLogObserver();
        });
        battleRootObserver.observe(document.body, { subtree: true, childList: true });
    }
}

function waitForElement(selector, callback) {
    const element = document.querySelector(selector);
    if (element) {
        callback();
        return;
    }

    const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
            observer.disconnect();
            callback();
        }
    });

    observer.observe(document.body, { subtree: true, childList: true });
}

// =============================================================================
// External stylesheet loading (unchanged)
// =============================================================================

function loadExternalStyleSheet(url) {
    const fetchStyle = () => {
        if (document.getElementById('ckey_attack')) {
            return;
        }

        fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to load stylesheet: ${response.status}`);
            }
            return response.text();
        })
        .then((cssText) => {
            GM_addStyle(cssText);
        })
        .catch((error) => {
            console.error(error);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fetchStyle, { once: true });
    } else {
        fetchStyle();
    }
}

// =============================================================================
// Base CSS — game effects removed (now canvas), settings UI styles kept
// =============================================================================

const baseCSS = `
/* ===== Settings panel styles (unchanged) ===== */
#mmk-cfg-div {
position: absolute;
top: 0;
left: 0;
width: 60%;
height: 100%;
padding: 0 20%;
overflow: auto;
font-size: 10pt;
text-align: left;
background-color: var(--color-bg-default);
z-index: 10;
}
#mmk-cfg-div header {
margin-bottom: 20px;
padding: 10px;
font-size: 15pt;
font-weight: bold;
border-bottom: 2px solid var(--color-border-default);
}
#mmk-cfg-div h1 {
margin: 20px 0 10px;
padding: 10px;
font-size: 11pt;
font-weight: bold;
background-color: var(--color-bg-alpha);
}
#mmk-cfg-div h2 {
margin: 0;
font-size: 10pt;
font-weight: bold;
}
#mmk-cfg-div label {
display: block;
cursor: default;
}
#mmk-cfg-div .mmk-style-row {
display: flex;
align-items: center;
gap: 16px;
margin-top: 6px;
}
#mmk-cfg-div .mmk-style-controls {
display: flex;
width: 200px;
flex-direction: column;
gap: 2px;
}
#mmk-cfg-div .mmk-style-sample {
font-size: 20px;
font-weight: bold;
white-space: nowrap;
flex-shrink: 0;
}
#mmk-cfg-div > div {
margin-left: 10px;
padding: 10px;
line-height: 24px;
}
#mmk-cfg-div .mmk-testmon {
position: relative;
display: inline-block;
line-height: 14px;
margin-top: 8px;
margin-left: 0;
padding: 0;
overflow: visible;
}
/* ── Test monster card layout (scoped to the preview widget) ── */
#mmk-cfg-div .mmk-testmon div.btm1 {
width: 360px;
height: 50px;
margin: 2px auto;
padding: 1px;
clear: both;
text-align: left;
position: relative;
border: 2px ridge #5C0D12;
box-sizing: content-box;
}
#mmk-cfg-div .mmk-testmon div.btm2 {
float: left;
height: 47px;
width: 35px;
padding: 2px;
text-align: center;
}
#mmk-cfg-div .mmk-testmon div.btm2 img {
margin: 2px 3px 2px 2px;
}
#mmk-cfg-div .mmk-testmon div.btm3 {
float: left;
height: 15px;
width: 280px;
padding: 1px 0 0 3px;
}
#mmk-cfg-div .mmk-testmon div.btm4 {
float: left;
height: 36px;
width: 122px;
position: relative;
margin: -1px 0 0 0;
}
#mmk-cfg-div .mmk-testmon div.btm5 {
float: left;
height: 12px;
width: 120px;
}
#mmk-cfg-div .mmk-testmon div.btm6 {
float: left;
height: 32px;
width: 190px;
position: absolute;
top: 16px;
left: 164px;
padding: 2px 0 0 1px;
}
#mmk-cfg-div .mmk-testmon .chbd {
width: 120px;
height: 12px;
position: relative;
background-color: black;
}
#mmk-cfg-div .mmk-testmon .chbd > img:first-child {
position: absolute;
z-index: 2;
height: 12px;
}
#mmk-cfg-div .mmk-testmon .chbd > img:last-child {
position: absolute;
z-index: 5;
height: 12px;
}
#mmk-cfg-div .mmk-text-preview-controls {
display: flex;
gap: 8px;
margin-left: 0;
padding: 0;
line-height: normal;
}
#mmk-cfg-div .mmk-text-position-row {
display: flex;
align-items: center;
gap: 8px;
margin-top: 6px;
}
#mmk-cfg-div .mmk-text-position-row label {
width: 16px;
}
#mmk-cfg-div .mmk-text-position-row input[type="range"] {
width: 220px;
}
#mmk-cfg-div .mmk-range-value {
min-width: 32px;
text-align: right;
font-variant-numeric: tabular-nums;
}
#mmk-cfg-div .mmk-text-position-preview-text {
position: absolute;
z-index: 2;
font-size: 20px;
font-weight: bold;
white-space: nowrap;
pointer-events: none;
animation: none !important;
opacity: 1;
margin: 0;
}
#mmk-cfg-div .mmk-font-custom-input {
min-width: 240px;
}
#mmk-cfg-div .mmk-explosion-preview {
position: relative;
margin-top: 0;
margin-left: 0;
width: 80px;
height: 80px;
padding: 0;
line-height: normal;
border: none;
background-color: transparent;
overflow: visible;
}
#mmk-cfg-div .mmk-preview-row {
display: flex;
align-items: center;
gap: 8px;
margin-top: 8px;
margin-left: 0;
padding: 0;
line-height: normal;
}
#mmk-cfg-div footer {
position: sticky;
bottom: 0;
margin-top: 20px;
padding: 10px;
border-top: 2px solid var(--color-border-default);
text-align: center;
background-color: inherit;
}
#mmk-cfg-div footer button { margin: 0 6px; }
`;

// =============================================================================
// Initialization
// =============================================================================

function initialize() {
    // Initialize canvas overlay before anything else
    CanvasManager.init();

    //loadExternalStyleSheet('https://hentaiverse.org/z/091b/hvb.css');
    applyDamageFontFromConfig();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', Enhance, { once: true });
    } else {
        Enhance();
    }
}

GM_addStyle(baseCSS);

initialize();
