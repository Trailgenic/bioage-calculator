/* TrailGenic — Trail-Derived Biological Age — widget.js
   Builds the UI, reads inputs, calls window.TGBioAge (methodology.js), renders.
   Mounts into #tg-bioage. Load methodology.js BEFORE this file. */
(function () {
  'use strict';
  var M = window.TGBioAge;
  if (!M) { console.error('[tg-bioage] methodology.js must load before widget.js'); return; }

  function mount(root) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.innerHTML = TEMPLATE;
    var $ = function (id) { return root.querySelector('#' + id); };

    $('adv-btn').addEventListener('click', function () {
      this.classList.toggle('open'); $('adv-panel').classList.toggle('open');
    });
    var fasted = $('f-fasted');
    function tf() { fasted.classList.toggle('on'); fasted.setAttribute('aria-checked', fasted.classList.contains('on')); }
    fasted.addEventListener('click', tf);
    fasted.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tf(); } });

    function num(id) { var v = parseFloat($(id).value); return isNaN(v) ? null : v; }

    function ridgeSVG(chrono, lo, hi, mid) {
      var W = 100, x0 = 18, x1 = 68;
      function px(a) { return ((Math.max(x0, Math.min(x1, a)) - x0) / (x1 - x0)) * W; }
      var pts = [[0,72],[12,40],[22,58],[34,30],[46,52],[58,26],[70,60],[82,38],[100,70]];
      var d = 'M' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L ');
      var cx = px(chrono), bx = px(mid), bl = px(hi), br = px(lo);
      return '<svg class="ridge" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'
        + '<defs><linearGradient id="tgRidge" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0" stop-color="#26363D"/><stop offset="1" stop-color="#141E22"/></linearGradient>'
        + '<linearGradient id="tgBand" x1="0" y1="0" x2="1" y2="0">'
        + '<stop offset="0" stop-color="rgba(240,190,99,0)"/><stop offset=".5" stop-color="rgba(240,190,99,.22)"/>'
        + '<stop offset="1" stop-color="rgba(240,190,99,0)"/></linearGradient></defs>'
        + '<path d="' + d + ' L 100 100 L 0 100 Z" fill="url(#tgRidge)"/>'
        + '<path d="' + d + '" fill="none" stroke="#3C7E7C" stroke-width="1" vector-effect="non-scaling-stroke"/>'
        + '<rect x="' + bl + '" y="0" width="' + (br - bl) + '" height="100" fill="url(#tgBand)"/>'
        + '<line x1="' + bl + '" y1="0" x2="' + bl + '" y2="100" stroke="#8a6f3e" stroke-width="1" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"/>'
        + '<line x1="' + br + '" y1="0" x2="' + br + '" y2="100" stroke="#8a6f3e" stroke-width="1" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"/>'
        + '<line x1="' + cx + '" y1="0" x2="' + cx + '" y2="100" stroke="#5C7077" stroke-width="1" vector-effect="non-scaling-stroke"/>'
        + '<g class="marker" style="transform:translateX(' + (reduce ? 0 : (cx - bx)) + 'px)">'
        + '<line x1="' + bx + '" y1="0" x2="' + bx + '" y2="100" stroke="#F0BE63" stroke-width="1.5" vector-effect="non-scaling-stroke"/>'
        + '<circle cx="' + bx + '" cy="50" r="3.2" fill="#F0BE63"/></g></svg>';
    }

    function bar(name, unit, valTxt, pct, muted) {
      return '<div class="comp"><div class="top"><div class="name">' + name + (unit ? ' <em>' + unit + '</em>' : '')
        + '</div><div class="val">' + valTxt + '</div></div>'
        + '<div class="track' + (muted ? ' muted' : '') + '"><div class="fill" data-pct="' + pct + '"></div></div></div>';
    }

    function render(I, R) {
      var chrono = I.age;
      var bandTxt = Math.round(R.lo) + '–' + Math.round(R.hi);
      var delta = chrono - R.bio;
      var deltaTxt = (delta >= 0 ? '−' : '+') + Math.abs(delta).toFixed(0);
      var vo2Fill = Math.max(6, Math.min(100, ((R.vo2 - 28) / (58 - 28)) * 100));
      var rhrFill = Math.max(6, Math.min(100, ((72 - I.rhr) / (72 - 44)) * 100));
      var hrvFill = R.hasHrv ? Math.max(6, Math.min(100, ((I.hrv - 18) / (60 - 18)) * 100)) : 0;

      var ctx = 'Your aerobic engine reads <b>VO₂max ≈ ' + R.vo2.toFixed(0) + '</b>, the dominant longevity'
        + ' signal, placing fitness age near <b>' + R.vo2age.toFixed(0) + '</b>. '
        + (R.hasHrv
          ? 'Resting HR and HRV are excellent-for-age rather than elite-youthful, which moderates the pooled estimate upward — the honest result, not the flattering one.'
          : 'Add overnight HRV under “Refine” to tighten the autonomic side of the estimate.')
        + ' This hike sat at <b>' + (R.pctHRR * 100).toFixed(0) + '% heart-rate reserve</b> — '
        + (R.pctHRR < 0.62 ? 'a true aerobic, fat-oxidation effort.' : 'a moderate aerobic effort.');

      $('res').innerHTML =
          '<div class="ridge-wrap"><div class="ridge-cap"><span class="l">Fitness-age ridgeline</span>'
        + '<span class="l">chrono ' + chrono + ' →</span></div>' + ridgeSVG(chrono, R.lo, R.hi, R.bio) + '</div>'
        + '<div class="bigout"><div class="num">' + bandTxt + '</div>'
        + '<div class="meta"><div class="k">Trail-derived bio-age</div>'
        + '<div class="v">midpoint <b>' + R.bio.toFixed(0) + '</b> · years</div></div>'
        + '<div class="delta"><div class="d">' + deltaTxt + '</div><div class="dl">vs chronological</div></div></div>'
        + '<div class="comps">'
        + bar('Aerobic engine', 'VO₂max', R.vo2.toFixed(0) + ' <span class="u">ml/kg/min</span>', vo2Fill, false)
        + bar('Resting heart rate', 'autonomic', I.rhr + ' <span class="u">bpm</span>', rhrFill, false)
        + (R.hasHrv ? bar('Heart-rate variability', 'autonomic', I.hrv + ' <span class="u">ms</span>', hrvFill, false)
                    : bar('Heart-rate variability', 'not entered', '—', 0, true))
        + '</div><div class="ctx">' + ctx + '</div>'
        + '<div class="disc">Fitness-based estimate from one session — not a clinical or epigenetic measure. '
        + 'Pooled from VO₂max (60%) + resting HR and HRV (40%), age-graded against population reference curves. '
        + 'Single-day inputs carry single-day noise; a rolling read across sessions is the durable signal.</div>';

      var res = $('res');
      requestAnimationFrame(function () {
        res.querySelectorAll('.fill').forEach(function (f) { f.style.width = f.getAttribute('data-pct') + '%'; });
        var m = res.querySelector('.marker');
        if (m && !reduce) requestAnimationFrame(function () { m.style.transform = 'translateX(0px)'; });
      });
    }

    $('f-read').addEventListener('click', function () {
      $('f-err').textContent = '';
      var I = {
        age: num('f-age'), rhr: num('f-rhr'), dist: num('f-dist'), gain: num('f-gain'),
        time: num('f-time'), ahr: num('f-ahr'), maxhr: num('f-maxhr'), hrv: num('f-hrv'),
        fasted: fasted.classList.contains('on')
      };
      var v = M.validate(I);
      if (v.errors.length) { $('f-err').textContent = 'Check: ' + v.errors.join(', ') + '.'; return; }
      if (v.warning) { $('f-err').innerHTML = '<span class="warn">' + v.warning + '</span>'; }
      render(I, M.compute(I));
    });

    $('f-read').click(); // land populated on the prefilled session
  }

  var TEMPLATE = [
    '<div class="wrap">',
    '<div class="hd"><div><div class="eyebrow">TrailGenic · Personal World Model</div>',
    '<h1>Trail-Derived <b>Biological Age</b></h1></div>',
    '<div class="tag">v1.0 · calibrated on 25 sessions</div></div>',
    '<div class="console">',
    '<div class="grp"><p class="grp-lbl">You</p><div class="row">',
    '<div class="field"><label>Age</label><div class="ipt"><input id="f-age" type="number" value="53"><span class="unit">yrs</span></div></div>',
    '<div class="field"><label>Resting heart rate</label><div class="ipt"><input id="f-rhr" type="number" value="59"><span class="unit">bpm</span></div></div>',
    '</div></div>',
    '<div class="grp"><p class="grp-lbl">One representative hike</p>',
    '<div class="row" style="margin-bottom:10px;">',
    '<div class="field"><label>Distance</label><div class="ipt"><input id="f-dist" type="number" step="0.1" value="10.94"><span class="unit">mi</span></div></div>',
    '<div class="field"><label>Elevation gain</label><div class="ipt"><input id="f-gain" type="number" value="4140"><span class="unit">ft</span></div></div></div>',
    '<div class="row">',
    '<div class="field"><label>Moving time</label><div class="ipt"><input id="f-time" type="number" value="256"><span class="unit">min</span></div></div>',
    '<div class="field"><label>Average HR</label><div class="ipt"><input id="f-ahr" type="number" value="122"><span class="unit">bpm</span></div></div></div>',
    '<div class="fasted on" id="f-fasted" role="checkbox" aria-checked="true" tabindex="0">',
    '<span class="box"><svg width="11" height="11" viewBox="0 0 11 11"><path d="M2 5.5L4.3 8L9 2.5" stroke="#0E1417" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>',
    '<span>Fasted hike (TrailGenic protocol)</span></div></div>',
    '<button class="adv-toggle" id="adv-btn"><span>▸</span> Refine with known values</button>',
    '<div class="adv" id="adv-panel"><div class="row" style="margin-top:6px;">',
    '<div class="field"><label>Max HR (if known)</label><div class="ipt"><input id="f-maxhr" type="number" placeholder="est."><span class="unit">bpm</span></div></div>',
    '<div class="field"><label>Overnight HRV</label><div class="ipt"><input id="f-hrv" type="number" value="31"><span class="unit">ms</span></div></div></div></div>',
    '<div style="margin-top:18px;"><button class="read" id="f-read">Read biological age</button><div class="err" id="f-err"></div></div>',
    '</div>',
    '<div class="result" id="res"><div class="empty">ENTER A HIKE · PRESS READ</div></div>',
    '</div>'
  ].join('');

  function init() {
    var root = document.getElementById('tg-bioage');
    if (root) mount(root);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
