
/* =====================================================================
   CURSOR-RESPONSIVE TILT (network canvas card only)
   ===================================================================== */
function initTiltCards() {
    const tiltTargets = document.querySelectorAll('.network-canvas-card');

    tiltTargets.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = (e.clientX - cx) / (rect.width / 2);
            const dy = (e.clientY - cy) / (rect.height / 2);

            const rotX = (-dy * 8).toFixed(2);
            const rotY = (dx * 8).toFixed(2);

            card.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.03)`;
            card.style.transition = 'transform 0.08s ease-out';

            const xPct = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
            const yPct = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
            card.style.setProperty('--glow-x', `${xPct}%`);
            card.style.setProperty('--glow-y', `${yPct}%`);
            card.classList.add('cursor-glow');
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)';
            card.style.transition = 'transform 0.4s ease';
            card.classList.remove('cursor-glow');
        });
    });
}

/* =====================================================================
   ANIMATED NETWORK DOTS
   ===================================================================== */
function initNetworkAnimation() {
    const svg = document.querySelector('.network-svg');
    if (!svg) return;

    // Node data: { id, base x/y, outer radius, inner radius }
    const nodes = [
        { id: 'n1', bx: 90, by: 95, or: 12, ir: 4 },
        { id: 'n2', bx: 125, by: 230, or: 11, ir: 3.5 },
        { id: 'n3', bx: 365, by: 95, or: 13, ir: 4 },
        { id: 'n4', bx: 375, by: 230, or: 11, ir: 3.5 },
        { id: 'n5', bx: 200, by: 45, or: 10, ir: 3 },
    ];

    // Randomise orbit parameters per node
    const animated = nodes.map(n => ({
        ...n,
        ampX: 6 + Math.random() * 8,
        ampY: 5 + Math.random() * 7,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.4,
    }));

    // Cache DOM circle elements matched by position + radius
    const outerEls = {};
    const innerEls = {};
    svg.querySelectorAll('circle').forEach(c => {
        const cx = parseFloat(c.getAttribute('cx'));
        const cy = parseFloat(c.getAttribute('cy'));
        const r = parseFloat(c.getAttribute('r'));
        animated.forEach(n => {
            if (Math.abs(cx - n.bx) < 1 && Math.abs(cy - n.by) < 1) {
                if (Math.abs(r - n.or) < 1) outerEls[n.id] = c;
                if (Math.abs(r - n.ir) < 1) innerEls[n.id] = c;
            }
        });
    });

    // Map each line endpoint to its corresponding node
    const lineNodeMap = [];
    svg.querySelectorAll('line').forEach(line => {
        const x1 = parseFloat(line.getAttribute('x1'));
        const y1 = parseFloat(line.getAttribute('y1'));
        const x2 = parseFloat(line.getAttribute('x2'));
        const y2 = parseFloat(line.getAttribute('y2'));
        animated.forEach(n => {
            if (Math.abs(x1 - n.bx) < 2 && Math.abs(y1 - n.by) < 2) {
                lineNodeMap.push({ line, node: n, end: false });
            } else if (Math.abs(x2 - n.bx) < 2 && Math.abs(y2 - n.by) < 2) {
                lineNodeMap.push({ line, node: n, end: true });
            }
        });
    });

    // Track cursor in SVG coordinate space
    let mouseX = 230, mouseY = 150;
    const svgCard = document.querySelector('.network-canvas-card');
    if (svgCard) {
        svgCard.addEventListener('mousemove', e => {
            const rect = svg.getBoundingClientRect();
            const vb = svg.viewBox.baseVal;
            mouseX = ((e.clientX - rect.left) / rect.width) * vb.width;
            mouseY = ((e.clientY - rect.top) / rect.height) * vb.height;
        });
        svgCard.addEventListener('mouseleave', () => {
            mouseX = 230;
            mouseY = 150;
        });
    }

    // Animation loop
    let t = 0;
    function tick() {
        t += 0.016;

        animated.forEach(n => {
            if (!outerEls[n.id]) return;

            // Floating orbit around base position
            const ox = n.bx + Math.sin(t * n.speed + n.phaseX) * n.ampX;
            const oy = n.by + Math.cos(t * n.speed + n.phaseY) * n.ampY;

            // Gentle cursor attraction (max 12 SVG units)
            const dx = mouseX - ox;
            const dy = mouseY - oy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const pull = Math.min(12, 1200 / (dist + 1));
            const fx = ox + (dx / (dist + 1)) * pull;
            const fy = oy + (dy / (dist + 1)) * pull;

            outerEls[n.id].setAttribute('cx', fx.toFixed(2));
            outerEls[n.id].setAttribute('cy', fy.toFixed(2));
            if (innerEls[n.id]) {
                innerEls[n.id].setAttribute('cx', fx.toFixed(2));
                innerEls[n.id].setAttribute('cy', fy.toFixed(2));
            }
        });

        // Stretch connecting lines to follow nodes
        lineNodeMap.forEach(({ line, node, end }) => {
            if (!outerEls[node.id]) return;
            const cx = outerEls[node.id].getAttribute('cx');
            const cy = outerEls[node.id].getAttribute('cy');
            line.setAttribute(end ? 'x2' : 'x1', cx);
            line.setAttribute(end ? 'y2' : 'y1', cy);
        });

        requestAnimationFrame(tick);
    }
    tick();
}

/* =====================================================================
   PALETTE TOGGLE
   ===================================================================== */
function initPalette() {
    const paletteBtn = document.getElementById('palette-toggle');
    const paletteLabel = document.getElementById('palette-label');
    const htmlRoot = document.documentElement;

    const palettes = {
        buttercup: { name: 'Buttercup Sky', next: 'dawn' },
        dawn: { name: 'Dawn & Rosewood', next: 'buttercup' },
    };

    function setPalette(themeKey) {
        htmlRoot.setAttribute('data-theme', themeKey);
        localStorage.setItem('site-palette', themeKey);
        if (paletteLabel) paletteLabel.textContent = palettes[themeKey].name;
    }

    setPalette(localStorage.getItem('site-palette') || 'buttercup');

    if (paletteBtn) {
        paletteBtn.addEventListener('click', () => {
            const current = htmlRoot.getAttribute('data-theme') || 'buttercup';
            setPalette(palettes[current] ? palettes[current].next : 'buttercup');
        });
    }
}

/* =====================================================================
   MOBILE NAV TOGGLE
   ===================================================================== */
function initMobileNav() {
    const toggleBtn = document.getElementById('mobile-toggle');
    const drawer = document.getElementById('mobile-drawer');

    if (!toggleBtn || !drawer) return;

    toggleBtn.addEventListener('click', () => {
        const isOpen = drawer.classList.toggle('is-open');
        toggleBtn.setAttribute('aria-expanded', isOpen);
        toggleBtn.classList.toggle('is-active', isOpen);
    });

    drawer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            drawer.classList.remove('is-open');
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.classList.remove('is-active');
        });
    });
}

/* =====================================================================
   FROSTED HEADER ON SCROLL
   ===================================================================== */
function initScrollHeader() {
    const header = document.getElementById('site-header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('is-scrolled', window.scrollY > 20);
    });
}

/* =====================================================================
   SCROLL REVEAL (APPEAR ON SCROLL)
   ===================================================================== */
function initScrollReveal() {
    const targets = document.querySelectorAll(
        '.hero-content, .hero-visual, .about-grid, .engineering-intro, .skills-grid-dark, .projects-header-dark, .project-minimal-card, .research-grid, .experience-card-dark, .creative-intro-grid, .minimal-card, .contact-content-center'
    );

    targets.forEach(el => el.classList.add('scroll-reveal'));

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                } else {
                    entry.target.classList.remove('is-visible');
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach(el => observer.observe(el));
}

/* =====================================================================
   EMAIL CLICK HELPER
   ===================================================================== */
function initEmailFallback() {
    const emailLink = document.querySelector('a[href^="mailto:"]');
    if (!emailLink) return;

    emailLink.addEventListener('click', (e) => {
        const email = emailLink.getAttribute('href').replace('mailto:', '');
        // Copy to clipboard as a reliable backup
        navigator.clipboard?.writeText(email).then(() => {
            const originalText = emailLink.querySelector('span')?.textContent;
            const textSpan = emailLink.querySelector('span');
            if (textSpan) {
                textSpan.textContent = 'Copied to clipboard!';
                setTimeout(() => {
                    textSpan.textContent = originalText;
                }, 2000);
            }
        }).catch(() => {});
    });
}

/* =====================================================================
   BOOT
   ===================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initTiltCards();
    initNetworkAnimation();
    initPalette();
    initMobileNav();
    initScrollHeader();
    initScrollReveal();
    initEmailFallback();
});

