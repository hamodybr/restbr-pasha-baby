(() => {
  if (!document.getElementById('smSeamlessBackgroundVideoLoader')) {
    const script = document.createElement('script');
    script.id = 'smSeamlessBackgroundVideoLoader';
    script.src = 'js/seamless-background-video.js?v=1.0';
    script.defer = true;
    document.head.appendChild(script);
  }
})();

(() => {
  const STYLE_ID = 'smArabicNewsTickerStyle';

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .sm-news-ticker.sm-news-motion{overflow:hidden!important;direction:rtl!important}
      .sm-news-ticker.sm-news-motion .sm-news-label{position:relative!important;z-index:4!important;flex:0 0 auto!important;order:0!important;direction:rtl!important;opacity:1!important}
      .sm-news-ticker.sm-news-motion .sm-news-window{position:relative!important;overflow:hidden!important;flex:1 1 auto!important;order:1!important;min-width:0!important;direction:rtl!important;-webkit-mask-image:linear-gradient(to right,transparent 0,#000 3%,#000 97%,transparent 100%)!important;mask-image:linear-gradient(to right,transparent 0,#000 3%,#000 97%,transparent 100%)!important}
      .sm-news-ticker.sm-news-motion .sm-news-track{position:absolute!important;top:0!important;bottom:0!important;left:0!important;width:max-content!important;min-width:max-content!important;height:100%!important;display:flex!important;align-items:center!important;white-space:nowrap!important;direction:rtl!important;text-align:right!important;animation:smArabicTickerMotion var(--sm-news-motion-duration,14s) linear infinite!important;will-change:transform,opacity!important}
      .sm-news-ticker.sm-news-motion .sm-news-copy{direction:rtl!important;text-align:right!important;opacity:1!important;filter:none!important;text-shadow:none!important}
      .sm-news-ticker.sm-news-motion .sm-news-copy[aria-hidden="true"]{display:none!important}
      @keyframes smArabicTickerMotion{
        0%{transform:translateX(var(--sm-news-motion-start,0px));opacity:0}
        4%{opacity:1}
        96%{opacity:1}
        100%{transform:translateX(var(--sm-news-motion-end,0px));opacity:0}
      }
    `;
    document.head.appendChild(style);
  }

  function baseDurationSeconds(ticker) {
    const raw = getComputedStyle(ticker).getPropertyValue('--sm-news-duration').trim();
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
  }

  function restart(track) {
    if (!track) return;
    track.style.animation = 'none';
    void track.offsetWidth;
    track.style.removeProperty('animation');
  }

  function syncTicker({ restartAnimation = false } = {}) {
    installStyle();

    const ticker = document.getElementById('smAnnouncement');
    if (!ticker || ticker.style.display === 'none') return;

    const windowEl = ticker.querySelector('.sm-news-window');
    const track = ticker.querySelector('.sm-news-track');
    if (!windowEl || !track) return;

    ticker.classList.add('sm-news-motion');

    const windowWidth = Math.max(1, Math.ceil(windowEl.getBoundingClientRect().width));
    const trackWidth = Math.max(1, Math.ceil(track.scrollWidth));
    const edge = 12;

    // Arabic text stays RTL while the ticker physically travels LEFT -> RIGHT.
    ticker.style.setProperty('--sm-news-motion-start', `${-(trackWidth + edge)}px`);
    ticker.style.setProperty('--sm-news-motion-end', `${windowWidth + edge}px`);
    ticker.style.setProperty('--sm-news-motion-duration', `${Math.max(12, baseDurationSeconds(ticker) * 1.15).toFixed(1)}s`);

    if (restartAnimation) restart(track);
  }

  function syncSoon() {
    requestAnimationFrame(() => syncTicker({ restartAnimation: true }));
    setTimeout(() => syncTicker({ restartAnimation: true }), 80);
    setTimeout(() => syncTicker({ restartAnimation: true }), 220);
  }

  window.addEventListener('restbr:ready', syncSoon);
  window.addEventListener('resize', () => syncTicker({ restartAnimation: false }), { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(syncSoon, 250), { once: true });
  } else {
    setTimeout(syncSoon, 250);
  }
})();