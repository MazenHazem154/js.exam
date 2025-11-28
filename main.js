const API_KEY = "eba8b9a7199efdcb0ca1f96879b83c44";
const TRENDING_ENDPOINT = `https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}`;
const DETAILS_BASE = `https://api.themoviedb.org/3/movie`;
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

const moviesEl = document.getElementById('movies');
const searchInput = document.getElementById('search');
const menuBtn = document.querySelector('.menu-icon') || document.getElementById('openMenu');
const bigMenu = document.getElementById('bigMenu') || document.querySelector('.big-menu');
let overlay = document.querySelector('.menu-overlay');
const detailsCache = new Map();

const safeText = s => s == null ? "" : String(s);
const truncate = (s, n) => (s = safeText(s)).length > n ? s.slice(0, n - 1) + '…' : s;

function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  for (const k in props) k === 'text' ? e.textContent = props[k] : k === 'html' ? e.innerHTML = props[k] : e.setAttribute(k, props[k]);
  children.forEach(c => e.appendChild(c));
  return e;
}

async function fetchJson(url) {
  try {
    const r = await fetch(url);
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

const fetchMovies = url => fetchJson(url).then(j => j?.results || []);

async function fetchMovieDetails(id) {
  if (detailsCache.has(id)) return detailsCache.get(id);
  const data = await fetchJson(`${DETAILS_BASE}/${id}?api_key=${API_KEY}&language=en-US`);
  if (data) detailsCache.set(id, data);
  return data;
}

function makeCard(item) {
  const id = item.id;
  const title = item.title || item.name || "Untitled";
  const overview = item.overview || "No description available.";
  const poster = item.poster_path ? IMG_BASE + item.poster_path : '/images/poster-placeholder.png';
  const vote = typeof item.vote_average === 'number' ? item.vote_average.toFixed(1) : 'N/A';
  const release = item.release_date || item.first_air_date || 'Unknown';

  const card = el('div', { class: 'movie' });
  const img = el('img', { src: poster, alt: title, loading: 'lazy' });
  img.onerror = () => { img.src = '/images/poster-placeholder.png'; img.style.opacity = '0.6'; };
  card.appendChild(img);

  const info = el('div', { class: 'movie-info' });
  info.appendChild(el('h3', { class: 'movie-title', text: title }));

  const body = el('div', { class: 'movie-body' }, [
    el('p', { class: 'movie-overview', text: truncate(overview, 200) })
  ]);
  const extra = el('div', { class: 'movie-extra' });
  body.appendChild(extra);
  info.appendChild(body);

  const meta = el('div', { class: 'movie-meta' });
  const stars = el('div', { class: 'stars' });
  const starsCount = vote === 'N/A' ? 0 : Math.round(Number(vote) / 2);
  for (let i = 0; i < 5; i++) stars.appendChild(el('span', { class: 'star', text: i < starsCount ? '★' : '☆' }));
  meta.appendChild(stars);
  meta.appendChild(el('div', { class: 'release', text: 'Release Date : ' + release }));
  meta.appendChild(el('div', { style: 'flex:1' }));
  meta.appendChild(el('div', { class: 'rate-badge', text: vote }));
  info.appendChild(meta);

  card.appendChild(info);

  let detailsLoaded = false;
  card.addEventListener('mouseenter', async () => {
    if (detailsLoaded) return;
    detailsLoaded = true;
    extra.textContent = 'Loading details...';

    const full = await fetchMovieDetails(id);
    if (!full) return extra.textContent = '';

    const runtime = full.runtime ? `${full.runtime} min` : null;
    const genres = full.genres?.length ? full.genres.map(g => g.name).join(', ') : null;
    const popularity = full.popularity ? `Popularity: ${Math.round(full.popularity)}` : null;

    const ov = card.querySelector('.movie-overview');
    if (full.overview?.length > 30 && ov) ov.textContent = truncate(full.overview, 350);

    extra.textContent = [runtime, genres, popularity].filter(Boolean).join(' • ');
  });

  card.addEventListener('mouseleave', () => {
    info.classList.add('exiting');
    setTimeout(() => info.classList.remove('exiting'), 380);
  });

  card.addEventListener('click', () => {
    alert(`${title}\n\nRate: ${vote}\nRelease: ${release}\n\n${overview}`);
  });

  return card;
}

function render(list) {
  if (!moviesEl) return;
  moviesEl.innerHTML = '';
  if (!list?.length) return moviesEl.innerHTML = `<p style="color:#aaa; grid-column:1/-1; text-align:center">No results found.</p>`;
  list.forEach(m => moviesEl.appendChild(makeCard(m)));
}

(async () => render(await fetchMovies(TRENDING_ENDPOINT)))();

let searchTimer;
if (searchInput) {
  searchInput.addEventListener('input', e => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    searchTimer = setTimeout(async () => {
      if (!q) return render(await fetchMovies(TRENDING_ENDPOINT));
      render(await fetchMovies(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(q)}&api_key=${API_KEY}`));
    }, 300);
  });
}

(function menuSetup() {
  const btn = menuBtn;
  const nav = bigMenu || document.querySelector('.navMenu') || document.querySelector('.big-menu');
  const sideAccent = document.querySelector('.side-accent');
  const sidebarEl = document.querySelector('.sidebar');
  if (!btn || !nav) return;
  if (!overlay) {
    overlay = el('div', { class: 'menu-overlay' });
    document.body.appendChild(overlay);
  }
  const STAGGER_MS = 500;
  const CONTAINER_MS = 2000;
  const EASE = 'cubic-bezier(.22,.9,.3,1)';
  const getMenuW = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--menu-w') || '280px';
    return v.trim();
  };
  const applyOpenAnimation = () => {
    nav.style.transition = `transform ${CONTAINER_MS}ms ${EASE}`;
    const listEl = nav.querySelector('.menu-links');
    const items = Array.from(nav.querySelectorAll('.menu-links li'));
    const fd = listEl ? getComputedStyle(listEl).flexDirection : '';
    const visual = fd.includes('reverse') ? items.slice().reverse() : items.slice();
    visual.forEach((li, i) => {
      li.style.transition = `transform ${STAGGER_MS}ms ${EASE}, opacity ${Math.min(STAGGER_MS, 400)}ms ease`;
      li.style.transitionDelay = `${i * STAGGER_MS}ms`;
      li.style.transform = 'translateY(30px)';
      li.style.opacity = '0';
      requestAnimationFrame(() => {
        li.style.transform = 'translateY(0)';
        li.style.opacity = '1';
      });
    });
  };
  const applyCloseAnimation = () => {
    nav.style.transition = `transform ${CONTAINER_MS}ms ${EASE}`;
    const listEl = nav.querySelector('.menu-links');
    const items = Array.from(nav.querySelectorAll('.menu-links li'));
    const fd = listEl ? getComputedStyle(listEl).flexDirection : '';
    const visual = fd.includes('reverse') ? items.slice().reverse() : items.slice();
    visual.forEach((li, i) => {
      li.style.transition = `transform ${STAGGER_MS}ms ${EASE}, opacity ${Math.min(STAGGER_MS, 400)}ms ease`;
      li.style.transitionDelay = `${(visual.length - 1 - i) * STAGGER_MS}ms`;
      li.style.transform = 'translateY(0)';
      li.style.opacity = '1';
      requestAnimationFrame(() => {
        li.style.transform = 'translateY(30px)';
        li.style.opacity = '0';
      });
      setTimeout(() => {
        li.style.transition = '';
        li.style.transitionDelay = '';
        li.style.transform = '';
        li.style.opacity = '';
      }, CONTAINER_MS + STAGGER_MS * visual.length);
    });
    setTimeout(() => {
      nav.style.transition = '';
    }, CONTAINER_MS + 40);
  };
  const toggle = open => {
    const menuW = getMenuW();
    nav.classList.toggle('show', open);
    overlay.classList.toggle('visible', open);
    document.documentElement.classList.toggle('menu-open', open);
    document.body.classList.toggle('menu-open', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    document.body.style.overflow = open ? 'hidden' : '';
    btn.innerHTML = open ? '×' : btn.dataset.prev;
    btn.setAttribute('aria-expanded', open);
    if (open) {
      nav.style.transition = `transform ${CONTAINER_MS}ms ${EASE}`;
      sideAccent && (sideAccent.style.transition = `transform ${CONTAINER_MS}ms ${EASE}`);
      sidebarEl && (sidebarEl.style.transition = `transform ${CONTAINER_MS}ms ${EASE}`);
      requestAnimationFrame(() => {
        nav.style.transform = 'translateX(0)';
        sideAccent && (sideAccent.style.transform = `translateX(${menuW})`);
        sidebarEl && (sidebarEl.style.transform = `translateX(${menuW})`);
      });
      applyOpenAnimation();
    } else {
      nav.style.transition = `transform ${CONTAINER_MS}ms ${EASE}`;
      sideAccent && (sideAccent.style.transition = `transform ${CONTAINER_MS}ms ${EASE}`);
      sidebarEl && (sidebarEl.style.transition = `transform ${CONTAINER_MS}ms ${EASE}`);
      requestAnimationFrame(() => {
        nav.style.transform = `translateX(calc(-1 * ${menuW}))`;
        sideAccent && (sideAccent.style.transform = '');
        sidebarEl && (sidebarEl.style.transform = '');
      });
      applyCloseAnimation();
      setTimeout(() => {
        nav.style.transition = '';
        sideAccent && (sideAccent.style.transition = '');
        sidebarEl && (sidebarEl.style.transition = '');
        nav.style.transform = '';
      }, CONTAINER_MS + 50);
    }
  };
  btn.dataset.prev ||= btn.innerHTML;
  btn.addEventListener('click', e => { e.stopPropagation(); toggle(!nav.classList.contains('show')); });
  overlay.addEventListener('click', () => toggle(false));
  window.addEventListener('keydown', e => e.key === 'Escape' && toggle(false));
  const MENU_ENDPOINTS = {
    "now playing": `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}`,
    "popular": `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}`,
    "top rated": `https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}`,
    "trending": TRENDING_ENDPOINT,
    "upcoming": `https://api.themoviedb.org/3/movie/upcoming?api_key=${API_KEY}`
  };
  const list = nav.querySelector('.menu-links');
  if (list) {
    list.addEventListener('click', async e => {
      const li = e.target.closest('li');
      if (!li) return;
      const label = li.textContent.trim().toLowerCase();
      if (label.includes('contact')) return toggle(false);
      const endpoint = MENU_ENDPOINTS[label];
      if (endpoint) {
        moviesEl.innerHTML = `<p style="color:#ccc; text-align:center; grid-column:1/-1">Loading ${li.textContent.trim()}...</p>`;
        render(await fetchMovies(endpoint));
      }
      toggle(false);
    });
  }
})();

(function contactValidation() {
  const find = t => [...document.querySelectorAll('input,textarea')].find(i =>
    [i.placeholder, i.getAttribute('aria-label'), i.name].some(v => v?.toLowerCase().includes(t))
  );
  const inputs = {
    name: find('name'),
    email: find('email'),
    phone: find('phone'),
    age: find('age'),
    pass: find('password'),
    confirm: find('confirm') || find('reenter')
  };
  const errors = {};
  const ensureErr = inp => {
    if (!inp) return null;
    let n = inp.nextElementSibling;
    if (!n || !n.classList.contains('contact-error')) {
      n = el('div', { class: 'contact-error' });
      n.style.display = 'none';
      inp.insertAdjacentElement('afterend', n);
    }
    return n;
  };
  for (const k in inputs) errors[k] = ensureErr(inputs[k]);
  const submitBtn =
    document.querySelector('button[type="submit"]') ||
    document.querySelector('input[type="submit"]') ||
    [...document.querySelectorAll('button')].find(b => /submit/i.test(b.textContent));
  const setErr = (inp, err, msg) => {
    inp.classList.add('input-invalid');
    err.textContent = msg;
    err.style.display = 'block';
    submitBtn?.classList.add('contact-submit-invalid');
  };
  const clearErr = (inp, err) => {
    inp.classList.remove('input-invalid');
    err.textContent = '';
    err.style.display = 'none';
    if (!document.querySelector('.input-invalid')) submitBtn?.classList.remove('contact-submit-invalid');
  };
  const validators = {
    name: v => /^[\p{L}\s]+$/u.test(v) && v,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v),
    phone: v => /^\+?\d{7,15}$/.test(v),
    age: v => Number(v) >= 1 && Number(v) <= 120,
    pass: v => v.length >= 8 && /[a-zA-Z]/.test(v) && /\d/.test(v),
    confirm: v => inputs.pass?.value === v
  };
  const messages = {
    name: 'Invalid Name, only characters allowed',
    email: 'Invalid Email, try example@domain.com',
    phone: 'Invalid Phone Number',
    age: 'Invalid Age',
    pass: 'password must contain numbers & letters at least 8 character',
    confirm: 'Password not match'
  };
  const validate = k => {
    const inp = inputs[k];
    const err = errors[k];
    if (!inp) return true;
    const v = inp.value.trim();
    if (!v || !validators[k](v)) return setErr(inp, err, messages[k]), false;
    return clearErr(inp, err), true;
  };
  Object.keys(inputs).forEach(k => {
    const inp = inputs[k];
    inp?.addEventListener('blur', () => validate(k));
    inp?.addEventListener('input', () => validate(k));
  });
  const allValid = () => Object.keys(inputs).every(k => validate(k));
  const form = inputs.name?.form || inputs.email?.form;
  const handler = ev => { if (!allValid()) ev.preventDefault(); };
  form ? form.addEventListener('submit', handler) : submitBtn?.addEventListener('click', handler);
})();

(function scrollTop() {
  const btn = document.getElementById("scrollTopBtn");
  if (!btn) return;
  window.addEventListener("scroll", () => btn.classList.toggle("show", window.scrollY > 20));
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
})();

(function anchorScroll() {
  const links = document.querySelectorAll(".menu-links a, .menu-links li");
  const findContact = () =>
    document.querySelector('#contactSection, #contact, .contact-section, section.contact, [data-section="contact"], form.contact');
  const smooth = (el, o = 20) => {
    const t = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: t - o, behavior: "smooth" });
    el.classList.add('flash-highlight');
    setTimeout(() => el.classList.remove('flash-highlight'), 1200);
  };
  links.forEach(l => {
    l.addEventListener('click', e => {
      const a = l.tagName === 'A' ? l : l.querySelector('a');
      const txt = (a?.textContent || l.textContent || '').trim().toLowerCase();
      if (a?.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        setTimeout(() => {
          if (txt.includes('contact')) smooth(findContact());
          else if (target) smooth(target);
        }, 120);
      } else if (txt.includes('contact')) {
        e.preventDefault();
        smooth(findContact());
      }
      const big = document.querySelector('.big-menu, #bigMenu');
      big?.classList.remove('show');
      document.querySelector('.menu-overlay')?.classList.remove('visible');
    });
  });
})();
document.addEventListener('DOMContentLoaded', () => {
  const movies = Array.from(document.querySelectorAll('.movie'));
  if (!movies.length) return;

  movies.forEach(movie => {
    let leaveTimer;
    movie.addEventListener('mouseenter', () => {
      clearTimeout(leaveTimer);
      movie.classList.remove('exiting');
      movie.classList.add('hovering');
    });
    movie.addEventListener('mouseleave', () => {
      movie.classList.remove('hovering');
      movie.classList.add('exiting');
      leaveTimer = setTimeout(() => movie.classList.remove('exiting'), 700);
    });
  });

  const first = movies[0];
  first && first.classList.add('hovering');

  document.addEventListener('click', (e) => {
    const isInsideMenu = !!e.target.closest('.big-menu, .navMenu, .sidebar, .menu-icon');
    if (!isInsideMenu) {
      document.documentElement.classList.remove('menu-open');
      document.querySelector('.big-menu')?.classList.remove('show');
      document.querySelector('.menu-overlay')?.classList.remove('visible');
    }
  });
});
