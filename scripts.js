(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Smooth scroll (native-ish)
  const enableSmoothScroll = () => {
    document.documentElement.style.scrollBehavior = 'smooth';

    // On multi-page site, highlight active nav link based on URL
    const path = window.location.pathname.split('/').pop();
    $$('nav a[data-nav]').forEach((a) => {
      const href = (a.getAttribute('href') || '').trim();
      if (!href) return;
      if (
        href === path ||
        (path === '' && href === 'index.html') ||
        (path.endsWith('index.html') && href === 'index.html')
      ) {
        a.classList.add('active');
      }
    });

    // Close mobile menu if present
    const nav = $('.navbar');
    nav?.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-scroll]');
      if (!link) return;
      nav.classList.remove('is-open');
    });
  };

  // Active nav link on scroll
  const setActiveLinkOnScroll = () => {
    const sections = $$('.section[id]');
    const links = $$('nav a[data-scroll]');
    if (!sections.length || !links.length) return;

    const getClosestSection = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      const offset = 120;
      let current = sections[0];
      for (const s of sections) {
        const top = s.offsetTop - offset;
        if (y >= top) current = s;
      }
      return current;
    };

    const update = () => {
      const current = getClosestSection();
      links.forEach((a) => {
        const href = a.getAttribute('href') || '';
        const id = href.replace('#', '');
        a.classList.toggle('active', id && current?.id === id);
      });
    };

    window.addEventListener('scroll', update, { passive: true });
    update();
  };

  // Project modal
  const initProjectModal = () => {
    const modal = $('#projectModal');
    if (!modal) return;

    const closeBtn = $('.modal-close', modal);
    const overlay = modal;

    const close = () => modal.classList.remove('open');
    const open = (data) => {
      // data = {title, desc, tags, image}
      $('.modal-title', modal).textContent = data.title || '';
      $('.modal-desc', modal).textContent = data.desc || '';
      $('.modal-tags', modal).innerHTML = (data.tags || [])
        .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
        .join('');

      const img = $('.modal-image', modal);
      if (data.image) {
        img.src = data.image;
        img.alt = data.title || 'Project image';
        img.classList.remove('is-fallback');
      } else {
        img.src = '';
        img.alt = '';
      }

      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    const onClick = (e) => {
      const card = e.target.closest('[data-project]');
      if (!card) return;

      const dataset = card.dataset.project ? JSON.parse(card.dataset.project) : {};
      open({
        title: dataset.title,
        desc: dataset.desc,
        tags: dataset.tags,
        image: dataset.image,
      });
    };

    document.addEventListener('click', onClick);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        close();
        document.body.style.overflow = '';
      }
    };

    closeBtn?.addEventListener('click', () => {
      close();
      document.body.style.overflow = '';
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
        document.body.style.overflow = '';
      }
    });

    window.addEventListener('keydown', onKey);
  };

  // Contact form validation + toast
  const initContact = () => {
    const form = $('#contactForm');
    const toast = $('#toast');
    if (!form) return;

    const showToast = (msg, type = 'success') => {
      if (!toast) return;
      toast.className = `toast ${type} show`;
      toast.textContent = msg;
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => {
        toast.classList.remove('show');
      }, 2600);
    };

    const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = $('#name', form)?.value?.trim();
      const email = $('#email', form)?.value?.trim();
      const subject = $('#subject', form)?.value?.trim();
      const message = $('#message', form)?.value?.trim();

      if (!name || name.length < 2) return showToast('Please enter your name.', 'error');
      if (!isEmail(email)) return showToast('Please enter a valid email address.', 'error');
      if (!subject || subject.length < 3) return showToast('Please enter a subject.', 'error');
      if (!message || message.length < 10) return showToast('Message should be at least 10 characters.', 'error');

      // WhatsApp delivery (no backend): open wa.me link with the message
      showToast('Message ready! Copying to clipboard…', 'success');

      const payload = `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`;
      navigator.clipboard?.writeText(payload).catch(() => {});

      form.reset();
    });
  };

  const escapeHtml = (s) =>
    String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');

  const fetchProjectsManifest = async () => {
    let res;
    try {
      res = await fetch('projects-manifest.json', { cache: 'no-store' });
    } catch {
      res = null;
    }

    if (!res || !res.ok) {
      const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
      res = await fetch(base + 'projects-manifest.json', { cache: 'no-store' });
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const projects = await res.json();
    if (!Array.isArray(projects)) throw new Error('projects-manifest.json did not return an array');
    return projects;
  };

  const buildCoreCompetencyCards = (projects) => {
    const grid = $('#coreCompetenciesGrid');
    if (!grid) return;
    if (grid.getAttribute('data-populated') === 'true') return;

    const frag = document.createDocumentFragment();

    projects.forEach((p, idx) => {
      const title = p.title || `Project ${idx + 1}`;
      const image = p.image || '';

      // Small info related to that project title
      const desc = (() => {
        const t = String(title).toLowerCase();
        if (t.includes('solar') && t.includes('hybrid')) {
          return 'Hybrid solar-battery implementation with system integration and practical energy management.';
        }
        if (t.includes('solar') && t.includes('back')) {
          return 'Backup solar power setup focused on reliability, switching logic, and safe operation.';
        }
        if (t.includes('solar')) {
          return 'Solar power system work spanning installation, protection, and performance validation.';
        }
        if (t.includes('pcb') || t.includes('control')) {
          return 'Practical electronics/circuit implementation with robust layout and signal integrity thinking.';
        }
        if (t.includes('electrical') && t.includes('home')) {
          return 'Electrical installation work for residential environments—safe layout, wiring discipline, and quality checks.';
        }
        if (t.includes('intern')) {
          return 'Hands-on engineering exposure: troubleshooting, documentation, and practical system understanding.';
        }
        if (t.includes('remodel') || t.includes('building')) {
          return 'Project delivery for large-scale facility electrical work—planning, execution, and on-site quality.';
        }
        return 'Engineering delivery with practical design decisions and reliable outcomes.';
      })();

      const tags = [];
      if (p.title?.toLowerCase().includes('solar')) tags.push('Renewable integration');
      if (p.title?.toLowerCase().includes('hybrid')) tags.push('Hybrid systems');
      if (p.title?.toLowerCase().includes('back')) tags.push('Backup power');

      const card = document.createElement('article');
      card.className = 'project-card';
      card.setAttribute(
        'data-project',
        JSON.stringify({
          title,
          desc,
          tags,
          image,
        })
      );

      const media = document.createElement('div');
      media.className = 'project-media';

      const img = document.createElement('img');
      img.src = image;
      img.alt = title;
      img.loading = 'lazy';
      img.onerror = function () {
        this.style.display = 'none';
      };
      media.appendChild(img);

      const body = document.createElement('div');
      body.className = 'project-body';

      const h3 = document.createElement('h3');
      h3.textContent = title;

      const pEl = document.createElement('p');
      pEl.textContent = desc;

      const tagsWrap = document.createElement('div');
      tagsWrap.className = 'tags';
      tagsWrap.innerHTML = tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');

      body.appendChild(h3);
      body.appendChild(pEl);
      body.appendChild(tagsWrap);

      card.appendChild(media);
      card.appendChild(body);

      frag.appendChild(card);
    });

    grid.innerHTML = '';
    grid.appendChild(frag);
    grid.setAttribute('data-populated', 'true');
  };

  const initFeaturedProjects = async () => {
    const grid = $('#featuredProjectsGrid');
    if (!grid) return;
    if (grid.getAttribute('data-populated') === 'true') return;

    // Render featured cards from manifest (used by index.html)
    try {
      const projects = await fetchProjectsManifest();
      if (!projects.length) {
        grid.innerHTML = '<!-- projects-manifest.json returned empty -->';
        return;
      }

      const frag = document.createDocumentFragment();
      projects.forEach((p, idx) => {
        const title = p.title || `Project ${idx + 1}`;
        const image = p.image || '';
        const card = document.createElement('article');
        card.className = 'project-card';
        card.setAttribute(
          'data-project',
          JSON.stringify({
            title,
            desc: '',
            tags: [],
            image,
          })
        );

        const media = document.createElement('div');
        media.className = 'project-media';

        const img = document.createElement('img');
        img.src = image;
        img.alt = title;
        img.loading = 'lazy';
        img.onerror = function () {
          this.style.display = 'none';
        };
        media.appendChild(img);

        const body = document.createElement('div');
        body.className = 'project-body';

        const h3 = document.createElement('h3');
        h3.textContent = title;

        const tagsWrap = document.createElement('div');
        tagsWrap.className = 'tags';

        body.appendChild(h3);
        body.appendChild(tagsWrap);

        card.appendChild(media);
        card.appendChild(body);
        frag.appendChild(card);
      });

      grid.innerHTML = '';
      grid.appendChild(frag);
      grid.setAttribute('data-populated', 'true');
    } catch (e) {
      console.error('Featured projects failed:', e);
    }
  };

  const initCoreCompetencies = async () => {
    const grid = $('#coreCompetenciesGrid');
    if (!grid) return;
    if (grid.getAttribute('data-populated') === 'true') return;

    try {
      const projects = await fetchProjectsManifest();
      buildCoreCompetencyCards(projects);
    } catch (e) {
      console.error('Core competencies failed:', e);
    }
  };

  // Skills galleries are static on projects.html now.
  // Keeping the rest of the site behavior unchanged.

  const initSkillsGalleries = () => {};

  initProjectModal();
  initContact();
  initSkillsGalleries();
  initCoreCompetencies();
  initFeaturedProjects();
})();



