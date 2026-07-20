/* Student Analytics Dashboard charts (Features 3 & 8).
 * Reads the server-rendered dataset from #analytics-data and renders a Radar,
 * Doughnut, Line and Bar chart with Chart.js. Colours are read from the live CSS
 * variables so the charts match light/dark theme automatically. */
(function () {
  'use strict';
  var el = document.getElementById('analytics-data');
  if (!el || typeof Chart === 'undefined') return;
  var D = JSON.parse(el.textContent);

  var css = getComputedStyle(document.documentElement);
  var textColor = (css.getPropertyValue('--text-muted') || '#94a3b8').trim();
  var gridColor = 'rgba(148,163,184,0.15)';
  var BLUE = '#37b7ff', GREEN = '#10b981', AMBER = '#f7c948', ROSE = '#ef4444', VIOLET = '#8b5cf6';

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.animation.duration = 900;
  Chart.defaults.animation.easing = 'easeOutQuart';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;

  function hexToRgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function mount(id) { var c = document.getElementById(id); return c ? c.getContext('2d') : null; }

  // --- Radar: topic mastery ---
  var radar = mount('radarChart');
  if (radar && D.radar.labels.length) {
    new Chart(radar, {
      type: 'radar',
      data: {
        labels: D.radar.labels,
        datasets: [{
          label: "O'zlashtirish %", data: D.radar.values,
          backgroundColor: hexToRgba(BLUE, 0.18), borderColor: BLUE, borderWidth: 2,
          pointBackgroundColor: BLUE, pointRadius: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { r: {
          min: 0, max: 100, ticks: { stepSize: 25, backdropColor: 'transparent', color: textColor },
          grid: { color: gridColor }, angleLines: { color: gridColor },
          pointLabels: { color: textColor, font: { size: 11 } },
        } },
        plugins: { legend: { display: false } },
      },
    });
  }

  // --- Doughnut: accuracy breakdown ---
  var acc = mount('accuracyChart');
  if (acc) {
    var ab = D.accuracy_breakdown;
    new Chart(acc, {
      type: 'doughnut',
      data: {
        labels: ["To'g'ri", 'Xato', "O'tkazib yuborilgan"],
        datasets: [{ data: [ab.correct, ab.wrong, ab.skipped],
          backgroundColor: [GREEN, ROSE, '#64748b'], borderWidth: 0, hoverOffset: 6 }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend: { position: 'bottom' } } },
    });
  }

  // --- Line: weekly progress (avg score + cumulative XP on 2nd axis) ---
  var wk = mount('weeklyChart');
  if (wk && D.weekly.length) {
    new Chart(wk, {
      type: 'line',
      data: {
        labels: D.weekly.map(function (w) { return w.label; }),
        datasets: [
          { label: "O'rtacha ball %", data: D.weekly.map(function (w) { return w.avg; }),
            borderColor: BLUE, backgroundColor: hexToRgba(BLUE, 0.15), fill: true, tension: 0.4,
            yAxisID: 'y', pointRadius: 3 },
          { label: 'Jami XP', data: D.weekly.map(function (w) { return w.cum_xp; }),
            borderColor: AMBER, backgroundColor: 'transparent', tension: 0.4, yAxisID: 'y1', pointRadius: 2 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
        scales: {
          y: { min: 0, max: 100, grid: { color: gridColor }, title: { display: true, text: 'Ball %' } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'XP' } },
          x: { grid: { color: gridColor } },
        },
        plugins: { legend: { position: 'bottom' } } },
    });
  }

  // --- Bar: daily activity ---
  var dl = mount('dailyChart');
  if (dl) {
    new Chart(dl, {
      type: 'bar',
      data: {
        labels: D.daily.map(function (d) { return d.date; }),
        datasets: [{ label: 'Testlar', data: D.daily.map(function (d) { return d.count; }),
          backgroundColor: hexToRgba(BLUE, 0.7), borderRadius: 6, maxBarThickness: 22 }],
      },
      options: { responsive: true, maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: gridColor } },
                  x: { grid: { display: false } } },
        plugins: { legend: { display: false } } },
    });
  }

  // --- Doughnut: subject distribution ---
  var sj = mount('subjectChart');
  if (sj && D.subject_dist.length) {
    new Chart(sj, {
      type: 'doughnut',
      data: {
        labels: D.subject_dist.map(function (s) { return s.name; }),
        datasets: [{ data: D.subject_dist.map(function (s) { return s.value; }),
          backgroundColor: D.subject_dist.map(function (s) { return s.color; }),
          borderWidth: 0, hoverOffset: 6 }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: { legend: { position: 'bottom' } } },
    });
  }
})();
