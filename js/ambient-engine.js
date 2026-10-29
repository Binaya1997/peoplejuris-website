/**
 * PeopleJuris LLP — Ambient 3D Experience & Global Motion Control Engine
 * 
 * Capabilities:
 * 1. Global Motion Manager: Persists user preference ('on' | 'off') in localStorage,
 *    respects OS prefers-reduced-motion, and provides a small, perfectly circular,
 *    icon-only toggle button at the bottom-left of the interface.
 * 2. Full-Background Homepage 3D Scene: A full-viewport WebGL 3D scene (Three.js) featuring
 *    a floating metallic-glass sphere with independent golden orbital rings, luminous
 *    interconnected nodes, ambient studio lighting, and smooth pointer-responsive parallax.
 *    The 3D assembly floats subtly across the entire page background while keeping all
 *    text and buttons completely readable and clickable.
 * 3. Subtle Space Starfield: A lightweight 3D-depth canvas starfield across all other
 *    public pages providing gentle atmospheric travel through deep space.
 * 4. True Power-Saving Lifecycle: Cancels animation loops completely when motion is OFF
 *    or when the browser tab is hidden, saving 100% CPU/GPU resources.
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. GLOBAL MOTION MANAGER (STATE & CIRCULAR ICON-ONLY CONTROL)
     ========================================================================== */
  const STORAGE_KEY = 'pj_ambient_motion';
  const listeners = [];

  // Determine initial state: checks localStorage, then OS prefers-reduced-motion
  function getInitialMotionState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'on' || saved === 'off') {
        return saved === 'on';
      }
    } catch (e) {
      // localStorage may be restricted in private browsing
    }
    // Default to OFF if user prefers reduced motion; otherwise ON
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return !prefersReduced;
  }

  let isMotionEnabled = getInitialMotionState();

  function setMotionEnabled(state, persist = true) {
    isMotionEnabled = Boolean(state);
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, isMotionEnabled ? 'on' : 'off');
      } catch (e) {}
    }

    // Toggle document class for CSS hooks
    if (isMotionEnabled) {
      document.documentElement.classList.remove('ambient-motion-disabled');
      document.documentElement.classList.add('ambient-motion-enabled');
    } else {
      document.documentElement.classList.remove('ambient-motion-enabled');
      document.documentElement.classList.add('ambient-motion-disabled');
    }

    updateControlUI();

    // Notify active 3D / starfield scenes
    listeners.forEach(fn => {
      try {
        fn(isMotionEnabled);
      } catch (err) {
        console.error('Error in motion state listener:', err);
      }
    });
  }

  function onMotionChange(fn) {
    if (typeof fn === 'function') {
      listeners.push(fn);
    }
  }

  // Create & mount the accessible, perfectly circular, icon-only bottom motion toggle button
  function injectMotionControl() {
    if (document.getElementById('pjMotionControl')) return;

    // Do not inject inside administrative dashboard
    if (window.location.pathname.includes('admin-dashboard')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'pjMotionControl';
    wrapper.className = 'pj-motion-pill-wrap';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Motion settings');

    const titleText = isMotionEnabled 
      ? 'Ambient Motion: On (Click to turn off)' 
      : 'Ambient Motion: Off (Click to turn on)';

    wrapper.innerHTML = `
      <button id="pjMotionToggle" class="pj-motion-btn pj-motion-circle ${isMotionEnabled ? 'is-active' : ''}" type="button" 
              aria-pressed="${isMotionEnabled}" 
              aria-label="Toggle ambient 3D motion"
              title="${titleText}">
        <i class="fas fa-atom pj-motion-glyph" aria-hidden="true"></i>
      </button>
    `;

    document.body.appendChild(wrapper);

    const btn = document.getElementById('pjMotionToggle');
    btn.addEventListener('click', function () {
      setMotionEnabled(!isMotionEnabled, true);
    });
  }

  function updateControlUI() {
    const btn = document.getElementById('pjMotionToggle');
    if (!btn) return;

    btn.setAttribute('aria-pressed', isMotionEnabled ? 'true' : 'false');
    btn.classList.toggle('is-active', isMotionEnabled);
    btn.setAttribute('title', isMotionEnabled 
      ? 'Ambient Motion: On (Click to turn off)' 
      : 'Ambient Motion: Off (Click to turn on)');
  }

  /* ==========================================================================
     2. FULL-BACKGROUND HOMEPAGE 3D SCENE (FLOATING METALLIC-GLASS SPHERE & RINGS)
     ========================================================================== */
  class Homepage3DScene {
    constructor() {
      this.canvas = null;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.animId = null;
      this.isRunning = false;
      this.isDestroyed = false;

      // 3D Scene Components
      this.group = null;
      this.coreSphere = null;
      this.innerCore = null;
      this.latticeMesh = null;
      this.nodesPoints = null;
      this.rings = [];
      this.orbitBeacon = null;
      this.dustParticles = null;

      // Base spatial coordinates: exact center of the full-page background
      this.baseX = 0;
      this.baseY = 0;
      this.baseZ = 0;

      // Pointer Parallax interaction state
      this.targetRotationX = 0;
      this.targetRotationY = 0;
      this.currentRotationX = 0;
      this.currentRotationY = 0;

      // Scroll-driven dynamic state (rotation, velocity, parallax, depth)
      this.scrollY = 0;
      this.lastScrollY = 0;
      this.targetScrollY = 0;
      this.currentScrollY = 0;
      this.targetScrollZ = 0;
      this.currentScrollZ = 0;

      this.targetScrollRotX = 0;
      this.targetScrollRotY = 0;
      this.targetScrollRotZ = 0;
      this.currentScrollRotX = 0;
      this.currentScrollRotY = 0;
      this.currentScrollRotZ = 0;

      this.scrollVelocity = 0;
      this.targetScrollVelocity = 0;

      this.init();
    }

    init() {
      if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded. Full-background 3D fallback active.');
        return;
      }

      // Check WebGL availability
      try {
        const testCanvas = document.createElement('canvas');
        const hasGL = !!(window.WebGLRenderingContext && 
          (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')));
        if (!hasGL) {
          console.warn('WebGL unsupported on this hardware. Displaying static background.');
          return;
        }
      } catch (e) {
        return;
      }

      this.width = window.innerWidth;
      this.height = window.innerHeight;

      // Scene & Camera
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
      this.camera.position.z = 16;

      // WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setClearColor(0x000000, 0);

      // Mount as full-viewport fixed background canvas
      this.canvas = this.renderer.domElement;
      this.canvas.id = 'hero3DFullCanvas';
      this.canvas.className = 'pj-full-3d-canvas';
      this.canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(this.canvas);

      // Group containing all rotating & floating elements
      this.group = new THREE.Group();
      this.group.position.set(this.baseX, this.baseY, 0);
      this.scene.add(this.group);

      this.buildLighting();
      this.buildCore();
      this.buildLatticeNodes();
      this.buildOrbitalRings();
      this.buildDustField();
      this.bindEvents();

      // Start if motion is currently enabled
      if (isMotionEnabled) {
        this.start();
      } else {
        this.renderStatic();
      }
    }

    buildLighting() {
      // 1. Soft Ambient Obsidian/Navy Fill
      const ambientLight = new THREE.AmbientLight(0x0a1120, 1.2);
      this.scene.add(ambientLight);

      // 2. Warm Metallic Gold Key Light (Top-Right)
      const keyLight = new THREE.DirectionalLight(0xf5d77f, 1.8);
      keyLight.position.set(8, 12, 10);
      this.scene.add(keyLight);

      // 3. Ethereal Sapphire Rim Light (Back-Left)
      const rimLight = new THREE.DirectionalLight(0x0084ff, 1.5);
      rimLight.position.set(-10, -6, -8);
      this.scene.add(rimLight);

      // 4. Central Champagne Point Light (Glows from within sphere)
      const centerPointLight = new THREE.PointLight(0xd4af37, 1.6, 20);
      centerPointLight.position.set(0, 0, 0);
      this.scene.add(centerPointLight);
    }

    buildCore() {
      // Outer Metallic-Glass Obsidian Sphere
      const sphereGeo = new THREE.SphereGeometry(2.35, 64, 64);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x070c16,
        metalness: 0.88,
        roughness: 0.16,
        wireframe: false
      });
      this.coreSphere = new THREE.Mesh(sphereGeo, sphereMat);
      this.group.add(this.coreSphere);

      // Inner Luminous Core
      const innerGeo = new THREE.IcosahedronGeometry(1.6, 2);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        wireframe: true,
        transparent: true,
        opacity: 0.35
      });
      this.innerCore = new THREE.Mesh(innerGeo, innerMat);
      this.group.add(this.innerCore);
    }

    buildLatticeNodes() {
      // Geodesic Constellation Sphere (Pillars of Justice Lattice)
      const latticeGeo = new THREE.IcosahedronGeometry(3.1, 1);

      // Wireframe Filaments
      const wireframeMat = new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        wireframe: true,
        transparent: true,
        opacity: 0.22
      });
      this.latticeMesh = new THREE.Mesh(latticeGeo, wireframeMat);
      this.group.add(this.latticeMesh);

      // Golden Node Points at Vertices
      const vertices = latticeGeo.attributes.position;
      const nodeGeo = new THREE.BufferGeometry();
      nodeGeo.setAttribute('position', vertices.clone());

      const nodeMat = new THREE.PointsMaterial({
        color: 0xf1d57e,
        size: 0.18,
        transparent: true,
        opacity: 0.9
      });
      this.nodesPoints = new THREE.Points(nodeGeo, nodeMat);
      this.group.add(this.nodesPoints);
    }

    buildOrbitalRings() {
      this.rings = [];

      // Ring 1: Primary Equatorial Gold Torus
      const ring1Geo = new THREE.TorusGeometry(3.75, 0.024, 16, 120);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xe2c056,
        metalness: 0.95,
        roughness: 0.12
      });
      const ring1 = new THREE.Mesh(ring1Geo, ringMat);
      ring1.rotation.x = Math.PI / 3.2;
      ring1.rotation.y = Math.PI / 6;
      this.group.add(ring1);
      this.rings.push({ mesh: ring1, speedX: 0.0025, speedY: 0.0012, speedZ: 0.0008 });

      // Ring 2: Polar Precession Gold Torus
      const ring2Geo = new THREE.TorusGeometry(4.15, 0.018, 16, 120);
      const ring2 = new THREE.Mesh(ring2Geo, ringMat.clone());
      ring2.rotation.x = -Math.PI / 2.6;
      ring2.rotation.z = Math.PI / 4;
      this.group.add(ring2);
      this.rings.push({ mesh: ring2, speedX: -0.0018, speedY: 0.0028, speedZ: -0.0014 });

      // Ring 3: Deep Orbital Outer Ring with Orbiting Satellite Jewel
      const ring3Geo = new THREE.TorusGeometry(4.65, 0.014, 16, 120);
      const ring3 = new THREE.Mesh(ring3Geo, ringMat.clone());
      ring3.rotation.x = Math.PI / 5;
      ring3.rotation.y = -Math.PI / 3;
      this.group.add(ring3);
      this.rings.push({ mesh: ring3, speedX: 0.0012, speedY: -0.0022, speedZ: 0.002 });

      // Orbiting Luminous Orb on Ring 1
      const orbGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const orbMat = new THREE.MeshBasicMaterial({ color: 0xfff0b3 });
      this.orbitBeacon = new THREE.Mesh(orbGeo, orbMat);
      this.group.add(this.orbitBeacon);
      this.orbitAngle = 0;
    }

    buildDustField() {
      // Golden Cosmic Dust Particles drifting across the space
      const particleCount = 110;
      const positions = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const radius = 3.5 + Math.random() * 4.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
      }

      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const dustMat = new THREE.PointsMaterial({
        color: 0xd4af37,
        size: 0.08,
        transparent: true,
        opacity: 0.55
      });
      this.dustParticles = new THREE.Points(dustGeo, dustMat);
      this.group.add(this.dustParticles);
    }

    bindEvents() {
      // Responsive Window Resize
      this.onResize = () => {
        if (!this.renderer || !this.camera) return;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        if (this.width === 0 || this.height === 0) return;

        this.baseX = 0;
        this.baseY = 0;
        this.baseZ = 0;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        if (!this.isRunning) this.renderStatic();
      };
      window.addEventListener('resize', this.onResize, { passive: true });

      // Pointer Parallax across the entire viewport (subtle & restrained)
      this.onMouseMove = (e) => {
        if (!isMotionEnabled) return;
        const x = (e.clientX - this.width / 2) / (this.width / 2);
        const y = (e.clientY - this.height / 2) / (this.height / 2);
        this.targetRotationY = x * 0.22;
        this.targetRotationX = y * 0.16;
      };
      window.addEventListener('mousemove', this.onMouseMove, { passive: true });

      // Dynamic Page Scroll Reaction (Scroll-coupled 3D rotation, vertical parallax, depth shift, & kinetic momentum)
      const initialScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      this.scrollY = initialScrollY;
      this.lastScrollY = initialScrollY;
      if (initialScrollY > 0) {
        const initMax = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        const initFrac = initialScrollY / initMax;
        this.targetScrollRotX = this.currentScrollRotX = initialScrollY * 0.0024;
        this.targetScrollRotY = this.currentScrollRotY = initialScrollY * 0.0016;
        this.targetScrollRotZ = this.currentScrollRotZ = Math.sin(initialScrollY * 0.0012) * 0.22;
        this.targetScrollY = this.currentScrollY = initFrac * 4.6;
        this.targetScrollZ = this.currentScrollZ = -(initFrac * 3.8);
      }

      this.onScroll = () => {
        if (!isMotionEnabled) return;
        const currentY = window.pageYOffset || document.documentElement.scrollTop || 0;
        const delta = currentY - this.lastScrollY;
        this.lastScrollY = currentY;
        this.scrollY = currentY;

        const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        const scrollFraction = currentY / maxScroll;

        // 1. Dynamic 3D Rotation driven by scroll position
        this.targetScrollRotX = currentY * 0.0024;
        this.targetScrollRotY = currentY * 0.0016;
        this.targetScrollRotZ = Math.sin(currentY * 0.0012) * 0.22;

        // 2. Kinetic Velocity Impulse (reacts instantly to mouse wheel / touchpad / touch gestures)
        const impulse = Math.max(-0.28, Math.min(0.28, delta * 0.0022));
        this.targetScrollVelocity += impulse;

        // 3. Vertical Parallax (lifts object gracefully across sections with inertial drag)
        this.targetScrollY = (scrollFraction * 4.6) - (this.targetScrollVelocity * 0.8);

        // 4. Depth Parallax (Z-axis recession into deep space to preserve reading clarity)
        this.targetScrollZ = -(scrollFraction * 3.8);
      };
      window.addEventListener('scroll', this.onScroll, { passive: true });

      // Visibility change (pause on inactive browser tab)
      this.onVisibilityChange = () => {
        if (document.hidden) {
          if (this.isRunning) this.pause();
        } else {
          if (isMotionEnabled && !this.isRunning) this.start();
        }
      };
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    start() {
      if (this.isRunning || this.isDestroyed) return;
      this.isRunning = true;
      if (this.canvas) this.canvas.style.opacity = '1';

      const animate = (timestamp) => {
        if (!this.isRunning) return;

        // 1. Smooth Pointer Parallax Lerp
        this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.05;
        this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.05;

        // 2. Smooth Scroll Rotation Lerp (Dynamic & responsive)
        this.currentScrollRotX += (this.targetScrollRotX - this.currentScrollRotX) * 0.09;
        this.currentScrollRotY += (this.targetScrollRotY - this.currentScrollRotY) * 0.09;
        this.currentScrollRotZ += (this.targetScrollRotZ - this.currentScrollRotZ) * 0.09;

        // 3. Smooth Scroll Position Parallax Lerp (Vertical & Depth)
        this.currentScrollY += (this.targetScrollY - this.currentScrollY) * 0.09;
        this.currentScrollZ += (this.targetScrollZ - this.currentScrollZ) * 0.09;

        // 4. Kinetic Velocity Decay (Snappy impulse + fluid friction decay)
        this.scrollVelocity += (this.targetScrollVelocity - this.scrollVelocity) * 0.25;
        this.targetScrollVelocity *= 0.80;

        // 5. Subtle Ambient Group Floating Movement across exact background center
        const floatX = Math.cos(timestamp * 0.0006) * 0.22;
        const floatY = Math.sin(timestamp * 0.0008) * 0.18;
        this.group.position.x = this.baseX + floatX;
        this.group.position.y = this.baseY + floatY + this.currentScrollY;
        this.group.position.z = this.baseZ + this.currentScrollZ;

        // 6. Dynamic Group 3D Rotation (Scroll rotation + Kinetic momentum + Ambient orbit)
        const velRotX = this.scrollVelocity * 0.75;
        const velRotY = this.scrollVelocity * 0.45;
        const velRotZ = this.scrollVelocity * 0.35;

        this.group.rotation.x = this.currentRotationX + this.currentScrollRotX + velRotX + Math.sin(timestamp * 0.0005) * 0.06;
        this.group.rotation.y = this.currentRotationY + this.currentScrollRotY + velRotY + (timestamp * 0.00028);
        this.group.rotation.z = this.currentScrollRotZ + velRotZ;

        // 7. Core Inner Pulsing & Independent Lattice Turn
        if (this.innerCore) {
          this.innerCore.rotation.y -= (0.001 + this.scrollVelocity * 0.02);
          this.innerCore.rotation.x += 0.0008;
          const baseScale = 1 + Math.sin(timestamp * 0.0015) * 0.04;
          const scrollPulse = Math.min(Math.abs(this.scrollVelocity) * 0.4, 0.12);
          const totalScale = baseScale + scrollPulse;
          this.innerCore.scale.set(totalScale, totalScale, totalScale);
        }

        if (this.latticeMesh) {
          this.latticeMesh.rotation.y += (0.0009 + Math.abs(this.scrollVelocity) * 0.015);
          this.latticeMesh.rotation.z -= (0.0005 + this.scrollVelocity * 0.01);
        }

        // 8. Orbital Rings Rotation with Scroll Acceleration
        const ringVel = this.scrollVelocity * 1.8;
        this.rings.forEach(r => {
          r.mesh.rotation.x += r.speedX + ringVel * 0.015;
          r.mesh.rotation.y += r.speedY + ringVel * 0.022;
          r.mesh.rotation.z += r.speedZ + ringVel * 0.012;
        });

        // 9. Orbiting Beacon Position
        if (this.orbitBeacon) {
          this.orbitAngle = timestamp * 0.0012 + (this.scrollY * 0.001);
          const r = 3.75;
          const x = Math.cos(this.orbitAngle) * r;
          const y = Math.sin(this.orbitAngle) * r * Math.sin(Math.PI / 3.2);
          const z = Math.sin(this.orbitAngle) * r * Math.cos(Math.PI / 3.2);
          this.orbitBeacon.position.set(x, y, z);
        }

        // 10. Slow Dust Drift with subtle velocity influence
        if (this.dustParticles) {
          this.dustParticles.rotation.y += 0.0003 + (this.scrollVelocity * 0.005);
          this.dustParticles.rotation.x -= 0.0002;
        }

        this.renderer.render(this.scene, this.camera);
        this.animId = requestAnimationFrame(animate);
      };

      this.animId = requestAnimationFrame(animate);
    }

    pause() {
      if (!this.isRunning) return;
      this.isRunning = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    renderStatic() {
      this.pause();
      if (this.canvas) {
        this.canvas.style.opacity = '0';
      }
    }

    destroy() {
      this.isDestroyed = true;
      this.pause();

      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('scroll', this.onScroll);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);

      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }
  }

  /* ==========================================================================
     3. SUBTLE SPACE STARFIELD ENGINE (PURE 2D CANVAS FOR ALL OTHER PUBLIC PAGES)
     ========================================================================== */
  class StarfieldBackground {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.stars = [];
      this.animId = null;
      this.isRunning = false;
      this.numStars = 175;
      this.maxDepth = 1000;
      this.baseSpeed = 0.45;

      // Parallax target
      this.targetOffsetX = 0;
      this.targetOffsetY = 0;
      this.currentOffsetX = 0;
      this.currentOffsetY = 0;
      this.mouseY = 0;

      this.init();
    }

    init() {
      // Create full-window background canvas
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'pjStarfieldCanvas';
      this.canvas.className = 'pj-starfield-canvas';
      this.canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(this.canvas);

      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) return;

      this.resize();
      this.generateStars();
      this.bindEvents();

      if (isMotionEnabled) {
        this.start();
      } else {
        this.canvas.style.opacity = '0';
      }
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';

      this.ctx.scale(this.dpr, this.dpr);

      // Adjust star count for mobile vs desktop
      if (this.width < 768) {
        this.numStars = 95;
      } else {
        this.numStars = 175;
      }
    }

    generateStars() {
      this.stars = [];
      for (let i = 0; i < this.numStars; i++) {
        const roll = Math.random();
        let starType = 'white';
        if (roll < 0.4) starType = 'gold';
        else if (roll < 0.55) starType = 'blue';

        this.stars.push({
          x: (Math.random() - 0.5) * this.width * 2.2,
          y: (Math.random() - 0.5) * this.height * 2.2,
          z: Math.random() * this.maxDepth,
          size: Math.random() * 1.4 + 0.65,
          type: starType,
          twinkleSpeed: 0.02 + Math.random() * 0.04,
          twinklePhase: Math.random() * Math.PI * 2
        });
      }
    }

    bindEvents() {
      this.onResize = () => {
        this.resize();
        this.generateStars();
      };
      window.addEventListener('resize', this.onResize, { passive: true });

      // Subtle mouse parallax
      this.onMouseMove = (e) => {
        if (!isMotionEnabled) return;
        this.targetOffsetX = (e.clientX - this.width / 2) * 0.035;
        this.mouseY = (e.clientY - this.height / 2) * 0.035;
        this.targetOffsetY = this.mouseY;
      };
      window.addEventListener('mousemove', this.onMouseMove, { passive: true });

      // Scroll-reactive depth parallax
      this.onScroll = () => {
        if (!isMotionEnabled) return;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        this.targetOffsetY = (this.mouseY || 0) - (scrollY * 0.035) % (this.height);
      };
      window.addEventListener('scroll', this.onScroll, { passive: true });

      // Visibility change
      this.onVisibilityChange = () => {
        if (document.hidden) {
          if (this.isRunning) this.pause();
        } else {
          if (isMotionEnabled && !this.isRunning) this.start();
        }
      };
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.canvas.style.opacity = '1';

      let lastTime = performance.now();

      const loop = (currentTime) => {
        if (!this.isRunning) return;

        const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Smooth parallax
        this.currentOffsetX += (this.targetOffsetX - this.currentOffsetX) * 0.05;
        this.currentOffsetY += (this.targetOffsetY - this.currentOffsetY) * 0.05;

        const cx = this.width / 2 + this.currentOffsetX;
        const cy = this.height / 2 + this.currentOffsetY;

        for (let i = 0; i < this.stars.length; i++) {
          const star = this.stars[i];

          // Move star forward slowly
          star.z -= this.baseSpeed * (delta * 60);

          // Recycle star when passing viewer
          if (star.z <= 0) {
            star.z = this.maxDepth;
            star.x = (Math.random() - 0.5) * this.width * 2.2;
            star.y = (Math.random() - 0.5) * this.height * 2.2;
          }

          // 3D Perspective Projection
          const k = 260 / star.z;
          const px = star.x * k + cx;
          const py = star.y * k + cy;

          // Out-of-bounds check
          if (px < -15 || px > this.width + 15 || py < -15 || py > this.height + 15) {
            continue;
          }

          // Depth-based size and opacity
          const depthRatio = 1 - (star.z / this.maxDepth);
          const radius = Math.max(0.55, star.size * depthRatio * 1.85);

          // Natural twinkle against deep night sky
          star.twinklePhase += star.twinkleSpeed;
          const twinkle = 0.7 + 0.3 * Math.sin(star.twinklePhase);
          const alpha = Math.min(0.85, (depthRatio * 0.55 + 0.25) * twinkle);

          this.ctx.beginPath();
          this.ctx.arc(px, py, radius, 0, Math.PI * 2);

          if (star.type === 'gold') {
            this.ctx.fillStyle = `rgba(246, 218, 126, ${alpha})`;
            this.ctx.shadowBlur = radius > 1.3 ? 4 : 0;
            this.ctx.shadowColor = 'rgba(212, 175, 55, 0.45)';
          } else if (star.type === 'blue') {
            this.ctx.fillStyle = `rgba(165, 210, 255, ${alpha})`;
            this.ctx.shadowBlur = radius > 1.3 ? 4 : 0;
            this.ctx.shadowColor = 'rgba(0, 132, 255, 0.4)';
          } else {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.shadowBlur = radius > 1.3 ? 3 : 0;
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
          }

          this.ctx.fill();
        }

        this.animId = requestAnimationFrame(loop);
      };

      this.animId = requestAnimationFrame(loop);
    }

    pause() {
      if (!this.isRunning) return;
      this.isRunning = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
      if (this.canvas) {
        this.canvas.style.opacity = '0';
      }
    }

    destroy() {
      this.pause();
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('scroll', this.onScroll);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }
  }

  /* ==========================================================================
     4. ORCHESTRATION & DOM READY BOOTSTRAP
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    // 1. Mount Circular Icon-Only Motion Toggle Control
    injectMotionControl();

    // 2. Identify Page Context: Homepage vs Other Public Pages
    const isHomepage = document.getElementById('home') !== null || 
                       document.querySelector('.hero-stage-3d') !== null || 
                       window.location.pathname.endsWith('index.html') || 
                       window.location.pathname === '/' || 
                       window.location.pathname.endsWith('/');

    const isAdminView = window.location.pathname.includes('admin-dashboard');

    if (isHomepage) {
      // Homepage: Mount full-background 3D scene floating across the page background
      const scene3D = new Homepage3DScene();
      onMotionChange((enabled) => {
        if (enabled) {
          scene3D.start();
        } else {
          scene3D.renderStatic();
        }
      });
    } else if (!isAdminView) {
      // Non-homepage public page: mount subtle space starfield
      const starfield = new StarfieldBackground();
      onMotionChange((enabled) => {
        if (enabled) {
          starfield.start();
        } else {
          starfield.pause();
        }
      });
    }
  });

})();
