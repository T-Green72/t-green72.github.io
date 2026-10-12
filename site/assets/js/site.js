// T-Green: photo viewer, video behaviour, copy buttons and small reveal motions.
// Everything on the page works without this file; it only adds comfort.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canObserve = 'IntersectionObserver' in window;

  if (!reduceMotion.matches && canObserve) document.documentElement.classList.add('js-motion');

  /* ---------- Reveal: prints settle onto the page, Sunday gets circled ---------- */
  if (canObserve) {
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        revealObserver.unobserve(el);
        if (el.classList.contains('week')) { el.classList.add('is-drawn'); continue; }
        if (reduceMotion.matches || !el.animate) continue;
        const finalRotate = getComputedStyle(el).rotate;
        const siblings = el.closest('.board') ? [...el.closest('.board').querySelectorAll('[data-settle]')] : [];
        const delay = Math.max(0, siblings.indexOf(el)) * 70;
        el.animate(
          [
            { opacity: 0, translate: '0 18px', rotate: '0deg' },
            { opacity: 1, translate: '0 0', rotate: finalRotate === 'none' ? '0deg' : finalRotate },
          ],
          { duration: 560, delay, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' }
        );
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

    document.querySelectorAll('[data-settle], .week').forEach((el) => {
      // Elements already on screen at load stay as they are.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.85 && !el.classList.contains('week')) return;
      revealObserver.observe(el);
    });
  }

  /* ---------- Videos ---------- */
  const videos = [...document.querySelectorAll('video')];
  // Only one video plays at a time.
  videos.forEach((v) => v.addEventListener('play', () => {
    videos.forEach((other) => { if (other !== v && !other.paused) other.pause(); });
  }));

  // The short silent clip loops while it is on screen, unless the visitor prefers less motion
  // or has paused it themselves.
  document.querySelectorAll('video.autoplay-when-visible').forEach((video) => {
    if (!canObserve) return;
    let pausedByVisitor = false;
    let systemAction = false;
    video.addEventListener('pause', () => { if (!systemAction) pausedByVisitor = true; });
    video.addEventListener('play', () => { if (!systemAction) pausedByVisitor = false; });
    const run = (fn) => { systemAction = true; const r = fn(); systemAction = false; return r; };

    new IntersectionObserver(([entry]) => {
      if (reduceMotion.matches || pausedByVisitor) return;
      const anotherPlaying = videos.some((v) => v !== video && !v.paused);
      if (entry.isIntersecting && !anotherPlaying) {
        const p = run(() => video.play());
        if (p && p.catch) p.catch(() => {});
      } else if (!entry.isIntersecting && !video.paused) {
        run(() => video.pause());
      }
    }, { threshold: 0.6 }).observe(video);
  });

  /* ---------- Copy e-mail address ---------- */
  document.querySelectorAll('.copy-btn[data-copy]').forEach((btn) => {
    if (!navigator.clipboard) return;
    btn.hidden = false;
    const status = btn.parentElement.querySelector('.copy-status');
    let timer;
    btn.addEventListener('click', async () => {
      clearTimeout(timer);
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        status.textContent = 'Адрес скопирован';
      } catch {
        status.textContent = 'Не получилось скопировать. Выделите адрес и скопируйте вручную.';
      }
      timer = setTimeout(() => { status.textContent = ''; }, 4000);
    });
  });

  /* ---------- Photo viewer ---------- */
  const dialog = document.querySelector('.lightbox');
  const links = [...document.querySelectorAll('.photo-open')];
  if (!dialog || !links.length || typeof dialog.showModal !== 'function') return;

  const figure = dialog.querySelector('.lb-figure');
  const caption = dialog.querySelector('.lb-caption');
  const status = dialog.querySelector('.lb-status');
  const error = dialog.querySelector('.lb-error');
  const img = document.createElement('img');
  img.className = 'lb-img';
  img.decoding = 'async';
  figure.prepend(img);

  const photos = links.map((a) => {
    const thumb = a.querySelector('img');
    const cap = a.closest('figure').querySelector('figcaption');
    return { src: a.dataset.full || a.href, alt: thumb ? thumb.alt : '', caption: cap ? cap.textContent.trim() : '' };
  });
  let current = 0;
  let opener = null;

  const show = (index) => {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    error.hidden = true;
    img.hidden = false;
    img.src = photo.src;
    img.alt = photo.alt;
    caption.textContent = photo.caption;
    status.textContent = `Фото ${current + 1} из ${photos.length}`;
  };
  img.addEventListener('error', () => { img.hidden = true; error.hidden = false; });

  links.forEach((a, i) => a.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    opener = a;
    show(i);
    dialog.showModal();
  }));

  dialog.querySelector('.lb-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.lb-prev').addEventListener('click', () => show(current - 1));
  dialog.querySelector('.lb-next').addEventListener('click', () => show(current + 1));
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
  });
  // Click on the dark backdrop closes the viewer.
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { if (opener) opener.focus(); });

  // Swipe left or right on touch screens.
  let startX = null;
  figure.addEventListener('pointerdown', (event) => { startX = event.clientX; });
  figure.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
  });
})();
