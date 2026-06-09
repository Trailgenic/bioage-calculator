/* =============================================================================
   TrailGenic — Trail-Derived Biological Age — methodology.js
   -----------------------------------------------------------------------------
   Pure scoring functions. No DOM, no side effects. Safe to load in the browser
   widget AND to import server-side for the MCP tool (calculate_trail_bioage)
   on the Trailgenic node — that reuse is the reason this is a separate file.

   CALIBRATION PROVENANCE
   Anchored to the 25-session World Model dataset (Nov 2025 – Jun 2026).
   - Mechanics VO2max estimator: median 45.4 across recent sessions vs Garmin 46,
     derived independently of the device number.
   - Pooled bio-age reproduces the published Trailgenic estimate of 32–40
     against a chronological age of 53, with no constant forced.
   - Weighting: VO2max 60% (dominant longevity signal) / resting HR 20% / HRV 20%.
     If HRV is absent, weight redistributes to 70% VO2max / 30% resting HR.
   - Autonomic terms (resting HR, HRV) are mapped to age INDEPENDENTLY of
     chronological age, so the result is derived from physiology, not re-injected.

   SCOPE: hiking modality only (v1). Walking and rucking sit at ~40–48% HRR
   (Zone 1) and do NOT load the aerobic system enough to reveal VO2max — they
   belong in the Conditioning Tracker, not here. The intensity check below
   flags efforts too easy to score and is the seam where running gets added.
   ============================================================================= */
(function (root) {
  'use strict';

  // Men's VO2max population MEDIAN by age (ml/kg/min) — FRIEND/ACSM reference.
  // TODO(v2): branch on biological sex; current curve is the male reference.
  var REF = [
    [25, 48.0], [30, 45.5], [35, 43.0], [40, 40.5], [45, 38.0],
    [50, 36.0], [55, 34.0], [60, 32.0], [65, 30.0]
  ];

  // VO2max -> the chronological age at which it equals the population median.
  function vo2ToAge(v) {
    for (var i = 0; i < REF.length - 1; i++) {
      var a1 = REF[i][0], x1 = REF[i][1], a2 = REF[i + 1][0], x2 = REF[i + 1][1];
      if (x1 >= v && v >= x2) return a1 + (x1 - v) / (x1 - x2) * (a2 - a1);
    }
    if (v > REF[0][1]) {                       // fitter than the 25y median: extrapolate young
      var s = (REF[1][0] - REF[0][0]) / (REF[1][1] - REF[0][1]);
      return REF[0][0] + (v - REF[0][1]) * s;
    }
    return REF[REF.length - 1][0] + (REF[REF.length - 1][1] - v) * 1.5; // older
  }

  // Trail VO2max from ONE hike. Models the ascent leg (where VO2 is driven),
  // extrapolated to max via %HR-reserve ≈ %VO2-reserve, ACSM walking equation.
  // KNOWN EDGE: the even time-split assumption underprices climb pace on very
  // long days (7+ h), reading ~5 VO2max points low. Refine with split times in v2.
  function trailVO2max(distMi, gainFt, movMin, avgHr, rhr, hrmax) {
    var distM = distMi * 1609.34, gainM = gainFt * 0.3048;
    var ascDist = distM / 2, ascTime = movMin / 2;
    var speed = ascDist / ascTime;             // m/min on the climb
    var grade = Math.min(gainM / ascDist, 0.45);
    var vo2eff = 0.1 * speed + 1.8 * speed * grade + 3.5;
    var pct = clamp((avgHr - rhr) / (hrmax - rhr), 0.30, 0.92);
    return clamp((vo2eff - 3.5) / pct + 3.5, 20, 72);
  }

  // Autonomic age proxies — chronological-age-independent.
  function rhrAge(r) { return Math.max(18, 48 - (62 - r) * 0.6); } // 62 bpm ≈ 48 y
  function hrvAge(h) { return Math.max(18, 45 - (h - 40) * 0.7); } // 40 ms ≈ 45 y

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function maxHR(age, known) { return known || (208 - 0.7 * age); } // Tanaka

  function pctHRR(avgHr, rhr, hrmax) {
    return clamp((avgHr - rhr) / (hrmax - rhr), 0.30, 0.92);
  }

  /* Returns the full reading. Input object:
     { age, rhr, dist, gain, time, ahr, maxhr?, hrv?, fasted? } */
  function compute(I) {
    var hrmax = maxHR(I.age, I.maxhr);
    var vo2 = trailVO2max(I.dist, I.gain, I.time, I.ahr, I.rhr, hrmax);
    var intensity = pctHRR(I.ahr, I.rhr, hrmax);
    var vA = vo2ToAge(vo2), rA = rhrAge(I.rhr);
    var hA = (I.hrv != null) ? hrvAge(I.hrv) : null;

    var pooled, ages;
    if (hA != null) { pooled = 0.6 * vA + 0.2 * rA + 0.2 * hA; ages = [vA, rA, hA]; }
    else            { pooled = 0.7 * vA + 0.3 * rA;            ages = [vA, rA]; }

    var spread = Math.max(2.5, (Math.max.apply(null, ages) - Math.min.apply(null, ages)) * 0.25);
    return {
      vo2: vo2, hrmax: hrmax, pctHRR: intensity,
      vo2age: vA, rhrage: rA, hrvage: hA,
      bio: pooled, lo: Math.max(18, pooled - spread), hi: pooled + spread,
      hasHrv: (hA != null)
    };
  }

  // Input validation + soft intensity gate. Returns { errors:[], warning:string|null }.
  // The Zone-1 warning is the seam: when running joins, it shares this gate.
  function validate(I) {
    var e = [];
    if (!I.age || I.age < 14 || I.age > 100) e.push('age');
    if (!I.rhr || I.rhr < 35 || I.rhr > 110) e.push('resting HR');
    if (!I.dist || I.dist <= 0) e.push('distance');
    if (I.gain == null || I.gain < 0) e.push('elevation gain');
    if (!I.time || I.time <= 0) e.push('moving time');
    if (!I.ahr || I.ahr < 70 || I.ahr > 210) e.push('average HR');
    if (I.ahr && I.rhr && I.ahr <= I.rhr) e.push('average HR above resting');

    var warning = null;
    if (!e.length) {
      var hrmax = maxHR(I.age, I.maxhr);
      if (pctHRR(I.ahr, I.rhr, hrmax) < 0.50) {
        warning = 'This reads like a Zone 1 effort (low heart-rate reserve). ' +
                  'Bio-age needs a sustained climbing effort to reveal aerobic capacity — ' +
                  'an easy walk will read far older than you are.';
      }
    }
    return { errors: e, warning: warning };
  }

  root.TGBioAge = {
    REF: REF, vo2ToAge: vo2ToAge, trailVO2max: trailVO2max,
    rhrAge: rhrAge, hrvAge: hrvAge, maxHR: maxHR, pctHRR: pctHRR,
    compute: compute, validate: validate
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.TGBioAge;
})(typeof window !== 'undefined' ? window : globalThis);
