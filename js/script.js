/**
 * PEOPLEJURIS LLP — CORE INTERACTIVE JAVASCRIPT ENGINE
 * Version: 2.0 (Ambient 3D Rebuild)
 * Includes: 3D Tilt Engine, Smart Nav, Universal Disclaimer, Universal Chatbot,
 * Synchronized Newsletter Filter & Pagination, and Accessible Service Modals.
 */

(function () {
  'use strict';

  // State flags
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================================
     1. SMART NAVBAR CONTROLLER
     ========================================================================== */
  function initNavbar() {
    const nav = document.querySelector('nav');
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (!nav) return;

    let lastScrollY = window.pageYOffset;
    let ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          const currentScrollY = window.pageYOffset;

          // Add blur / compact styling on scroll
          if (currentScrollY > 30) {
            nav.classList.add('nav-scrolled');
          } else {
            nav.classList.remove('nav-scrolled');
          }

          // Desktop auto-hide on scroll down, reveal on scroll up
          if (window.innerWidth > 768) {
            if (currentScrollY > lastScrollY && currentScrollY > 120) {
              nav.classList.add('nav-hidden');
            } else {
              nav.classList.remove('nav-hidden');
            }
          } else {
            nav.classList.remove('nav-hidden');
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    // Mobile Hamburger Menu Toggle
    if (menuToggle && navLinks) {
      menuToggle.addEventListener('click', function () {
        const isOpen = navLinks.classList.toggle('active');
        menuToggle.textContent = isOpen ? '✕' : '☰';
        menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      // Auto close mobile menu when clicking a link
      navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          if (window.innerWidth <= 768) {
            navLinks.classList.remove('active');
            menuToggle.textContent = '☰';
            menuToggle.setAttribute('aria-expanded', 'false');
          }
        });
      });
    }

    // Active page link detection
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (navLinks) {
      navLinks.querySelectorAll('a').forEach(function (link) {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '' && href === 'index.html')) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        }
      });
    }
  }

  /* ==========================================================================
     2. AMBIENT 3D TILT ENGINE (HERO & DIMENSIONAL CARDS)
     ========================================================================== */
  function init3DTilt() {
    if (prefersReducedMotion || window.innerWidth < 768) return;

    const tiltCard = document.querySelector('.hero-3d-card');
    const stage = document.querySelector('.hero-stage-3d');
    if (!tiltCard || !stage) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isHovering = false;

    stage.addEventListener('mouseenter', function () {
      isHovering = true;
    });

    stage.addEventListener('mousemove', function (e) {
      const rect = stage.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate normalized coords (-1 to +1)
      const normX = (x / rect.width) * 2 - 1;
      const normY = (y / rect.height) * 2 - 1;

      targetX = normX * 14; // Max deg rotation on Y
      targetY = -normY * 14; // Max deg rotation on X

      // Update radial specular reflection center
      const pctX = (x / rect.width) * 100;
      const pctY = (y / rect.height) * 100;
      tiltCard.style.setProperty('--mouse-x', pctX + '%');
      tiltCard.style.setProperty('--mouse-y', pctY + '%');
    });

    stage.addEventListener('mouseleave', function () {
      isHovering = false;
      targetX = 0;
      targetY = 0;
    });

    // Smooth Lerp Animation Loop
    function renderLoop() {
      if (!prefersReducedMotion) {
        currentX += (targetX - currentX) * 0.1;
        currentY += (targetY - currentY) * 0.1;

        if (Math.abs(currentX) > 0.01 || Math.abs(currentY) > 0.01 || isHovering) {
          tiltCard.style.transform = `perspective(1200px) rotateX(${currentY.toFixed(2)}deg) rotateY(${currentX.toFixed(2)}deg) translateZ(10px)`;
        } else {
          tiltCard.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        }
      }
      requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);
  }

  /* ==========================================================================
     3. SCROLL REVEAL OBSERVER
     ========================================================================== */
  function initScrollReveal() {
    if (prefersReducedMotion) return;

    const revealElements = document.querySelectorAll(
      '.service-card, .mv-card, .timeline-card, .leader-card, .consult-card, .archive-card, .about-content, .contact-info, .contact-form'
    );

    if (!('IntersectionObserver' in window)) {
      revealElements.forEach(el => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(function (el) {
      el.classList.add('reveal-on-scroll');
      observer.observe(el);
    });
  }

  /* ==========================================================================
     4. UNIVERSAL BAR COUNCIL OF INDIA DISCLAIMER PANEL
     ========================================================================== */
  function initDisclaimer() {
    const popup = document.getElementById('disclaimerPopup');
    const agreeBtn = document.getElementById('agreeBtn');
    if (!popup) return;

    const accepted = localStorage.getItem('peoplejurisDisclaimerAccepted');
    if (accepted === 'true') {
      popup.style.display = 'none';
      return;
    }

    // Freeze body scroll until acknowledged
    document.body.style.overflow = 'hidden';

    setTimeout(function () {
      popup.classList.add('show');
    }, 450);

    if (agreeBtn) {
      agreeBtn.addEventListener('click', function () {
        popup.classList.remove('show');
        localStorage.setItem('peoplejurisDisclaimerAccepted', 'true');
        document.body.style.overflow = '';
        setTimeout(function () {
          popup.style.display = 'none';
        }, 500);
      });
    }
  }

  /* ==========================================================================
     5. UNIVERSAL PEOPLEJURIS AI HELP CHATBOT & LEGAL INFORMATION ENGINE
     ========================================================================== */
  function initChatbot() {
    const chatButton = document.getElementById('pjChatButton');
    const chatBox = document.getElementById('pjChatBox');
    const chatClose = document.getElementById('pjChatClose');
    const chatInput = document.getElementById('pjChatInput');
    const chatSend = document.getElementById('pjChatSend');
    const chatMessages = document.getElementById('pjChatMessages');
    const quickButtons = document.querySelectorAll('.pj-quick-questions button');

    if (!chatButton || !chatBox) return;

    if (chatInput) {
      chatInput.placeholder = "Ask any legal concept, procedure, or firm info...";
    }

    // Open chat
    chatButton.addEventListener('click', function () {
      chatBox.classList.add('active');
      if (chatInput) {
        setTimeout(() => chatInput.focus(), 150);
      }
    });

    // Close chat
    if (chatClose) {
      chatClose.addEventListener('click', function () {
        chatBox.classList.remove('active');
      });
    }

    function addMessage(htmlContent, sender) {
      if (!chatMessages) return;
      const msgDiv = document.createElement('div');
      msgDiv.className = 'pj-message ' + (sender === 'user' ? 'pj-user' : 'pj-bot');

      const bubble = document.createElement('div');
      bubble.className = 'pj-message-bubble';
      if (sender === 'user') {
        bubble.textContent = htmlContent;
      } else {
        bubble.innerHTML = htmlContent;
      }

      msgDiv.appendChild(bubble);
      chatMessages.appendChild(msgDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return msgDiv;
    }

    function showTypingIndicator() {
      if (!chatMessages) return null;
      const msgDiv = document.createElement('div');
      msgDiv.className = 'pj-message pj-bot pj-typing-wrapper';
      msgDiv.innerHTML = '<div class="pj-message-bubble pj-typing-bubble"><span class="pj-typing-dot"></span><span class="pj-typing-dot"></span><span class="pj-typing-dot"></span></div>';
      chatMessages.appendChild(msgDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return msgDiv;
    }

    // -------------------------------------------------------------------------
    // A. SENSITIVITY & SAFETY GUARDRAILS (Strictly Non-Sensitive Policy)
    // -------------------------------------------------------------------------
    function escapeRegex(s) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function matchWord(text, key) {
      const pattern = new RegExp('\\b' + escapeRegex(key) + '\\b', 'i');
      return pattern.test(text);
    }

    function checkSensitivityGuardrails(q) {
      // 1. Unlawful acts, evasion, fraud, forgery, bribery
      const illegalWords = [
        'hide money', 'hide black money', 'hide asset', 'hide assets', 'evade tax', 'evade taxes',
        'how to bribe', 'bribe police', 'bribe judge', 'bribing', 'bribe', 'fake document', 'fake certificate',
        'forge document', 'forge certificate', 'forgery help', 'forgery', 'forge', 'falsify document', 'falsify',
        'evade police', 'escape police', 'evade arrest', 'avoid arrest illegally', 'commit murder', 'kill someone',
        'hack account', 'steal data', 'destroy evidence', 'tamper evidence', 'how to lie in court', 'commit perjury',
        'escape punishment illegally'
      ];
      illegalWords.sort((a, b) => b.length - a.length);
      for (const phrase of illegalWords) {
        if (matchWord(q, phrase) || q.includes(phrase)) {
          return '<span class="pj-law-tag" style="background:rgba(239,68,68,0.2);color:#fca5a5;border-color:rgba(239,68,68,0.4);">INFORMATIONAL NOTICE • COMPLIANCE POLICY</span>' +
            '<p><strong>Strict Policy on Lawful Advisory:</strong> PeopleJuris LLP and this Information Assistant operate strictly within the bounds of the Advocates Act, 1961 and the Bar Council of India standards of professional conduct. We cannot provide advice, assistance, or strategies regarding unlawful acts, falsification of documents, evidence tampering, or evading law enforcement.</p>' +
            '<p>Our chamber is dedicated exclusively to lawful legal defense, statutory compliance, corporate governance, and judicial representation. If you are subject to an investigation or court proceeding, an advocate can assist you in asserting your lawful statutory rights and defenses before competent judicial authorities.</p>' +
            '<span class="pj-law-disclaimer">General informational advisory. Does not constitute legal advice.</span>';
        }
      }

      // 2. Physical emergencies, domestic abuse in progress, self-harm crisis
      const emergencyWords = [
        'kill myself', 'commit suicide', 'end my life', 'suicide', 'husband beating me right now',
        'physical abuse right now', 'beating me right now', 'in danger right now', 'threat to my life right now'
      ];
      emergencyWords.sort((a, b) => b.length - a.length);
      for (const phrase of emergencyWords) {
        if (matchWord(q, phrase) || q.includes(phrase)) {
          return '<span class="pj-law-tag" style="background:rgba(239,68,68,0.2);color:#fca5a5;border-color:rgba(239,68,68,0.4);">URGENT ASSISTANCE HELPLINES</span>' +
            '<p><strong>Immediate Emergency Support:</strong> If you or someone you know is in immediate physical danger or experiencing a crisis, please reach out to emergency response services immediately:</p>' +
            '<ul>' +
              '<li><strong>National Emergency Number:</strong> 112 (All Emergencies)</li>' +
              '<li><strong>Police Assistance:</strong> 100 / 112</li>' +
              '<li><strong>Women\'s Helpline (Domestic Abuse & Distress):</strong> 181 / 1091</li>' +
              '<li><strong>National Commission for Women (NCW 24/7):</strong> 7827170170</li>' +
              '<li><strong>Childline India:</strong> 1098</li>' +
              '<li><strong>Tele-MANAS Mental Health Support:</strong> 14416 (24/7 Toll-Free)</li>' +
            '</ul>' +
            '<p>Under the Protection of Women from Domestic Violence Act, 2005 (PWDVA), victims have the legal right to immediate protection orders, residence orders, and monetary relief through the nearest Magistrate Court or Protection Officer.</p>' +
            '<span class="pj-law-disclaimer">Please prioritize physical safety and contact emergency authorities.</span>';
        }
      }

      // 3. Requests for privileged individual case outcome guarantees or writing secret defense
      const outcomeWords = [
        'will i win my case', 'tell me if i will win', 'guarantee court verdict', 'can you guarantee i win',
        'write my secret defense testimony', 'evaluate my private case outcome'
      ];
      outcomeWords.sort((a, b) => b.length - a.length);
      for (const phrase of outcomeWords) {
        if (matchWord(q, phrase) || q.includes(phrase)) {
          return '<span class="pj-law-tag">LEGAL PROCEDURE • CASE ASSESSMENT</span>' +
            '<p><strong>Individual Case Evaluation:</strong> Under Indian legal jurisprudence and Bar Council rules, judicial outcomes depend entirely upon evidence admitted on record, witness cross-examination, judicial precedents, and the discretion of the presiding court. No ethical legal professional or automated assistant can guarantee a case outcome.</p>' +
            '<p>This assistant provides objective statutory definitions and legal procedural descriptions. For a confidential, thorough review of your case files, evidence, and tailored trial or advisory strategy, we recommend scheduling a formal consultation with an advocate.</p>' +
            '<span class="pj-law-disclaimer">Informational overview only. For personalized legal strategy, consult an advocate.</span>';
        }
      }

      return null;
    }

    // -------------------------------------------------------------------------
    // B. FIRM & CHAMBER INFORMATION
    // -------------------------------------------------------------------------
    function getFirmResponse(q) {
      if (q.includes('practice area') || q.includes('what areas') || q.includes('cases you handle') || q.includes('firm services') || q.includes('chamber services') || q === 'services' || q === 'service' || q.includes('your services')) {
        return '<span class="pj-law-tag">PEOPLEJURIS • PRACTICE AREAS</span>' +
          '<p><strong>Comprehensive Legal Practices:</strong> PeopleJuris LLP provides legal advisory, documentation, and litigation representation across:</p>' +
          '<ul>' +
            '<li><strong>Civil Law:</strong> Property suits, money recovery, injunctions, specific performance, and appellate litigation.</li>' +
            '<li><strong>Criminal Law:</strong> Trial defense, regular & anticipatory bail, FIR quashing, and white-collar defense.</li>' +
            '<li><strong>Corporate & Commercial:</strong> Governance, contract drafting, NCLT/IBC insolvency, and MSME recovery.</li>' +
            '<li><strong>Family Law:</strong> Mutual consent & contested divorce, maintenance (Sec 125), domestic violence, and custody.</li>' +
            '<li><strong>Property & Real Estate:</strong> 30-year title verification, deed drafting, partition suits, and RERA.</li>' +
            '<li><strong>Consumer Protection:</strong> Deficiency in service, unfair trade practices, and product liability before Consumer Commissions.</li>' +
            '<li><strong>Intellectual Property (IPR):</strong> Trademark search, registration, copyright, and patent advisory.</li>' +
            '<li><strong>Labor & Employment:</strong> POSH compliance, employment contracts, gratuity, and termination advisory.</li>' +
          '</ul>' +
          '<span class="pj-law-disclaimer">General chamber overview. For representation inquiries, schedule a consultation.</span>';
      }

      if ((q.includes('contact') || q.includes('phone') || q.includes('whatsapp') || q.includes('email') || q.includes('timing') || q.includes('hours') || q.includes('reach you') || q.includes('call you')) && !q.includes('contract')) {
        return '<span class="pj-law-tag">PEOPLEJURIS • CONTACT DETAILS</span>' +
          '<p><strong>Chamber Communication Channels:</strong></p>' +
          '<ul>' +
            '<li><strong>Phone / WhatsApp:</strong> +91 8763830030</li>' +
            '<li><strong>Official Email:</strong> info@peoplejuris.com</li>' +
            '<li><strong>Chamber Timings:</strong> Monday through Saturday, 9:00 AM – 7:00 PM IST</li>' +
            '<li><strong>Consultation:</strong> In-person at our registered chamber or virtual via Google Meet / Zoom.</li>' +
          '</ul>' +
          '<span class="pj-law-disclaimer">Prior appointment required for in-depth consultation.</span>';
      }

      if ((q.includes('location') || q.includes('address') || q.includes('where are you') || q.includes('rayagada') || q.includes('bissam') || q.includes('odisha') || q.includes('office')) && !q.includes('officer')) {
        return '<span class="pj-law-tag">PEOPLEJURIS • REGISTERED OFFICE</span>' +
          '<p><strong>Registered Chamber Address:</strong><br>' +
          'Laxmi Nilayam, Salt Krishna Street (Near Dukum Road Square),<br>' +
          'AT/PO - Bissam Cuttack, District: Rayagada, Odisha – 765019, India.</p>' +
          '<p>Our advocates represent clients across Sub-Divisional Courts, District Courts, State High Courts, National Company Law Tribunals (NCLT), and Consumer Commissions.</p>' +
          '<span class="pj-law-disclaimer">Visiting hours: Mon – Sat, 9:00 AM – 7:00 PM.</span>';
      }

      if (q.includes('founder') || q.includes('chandra mouli') || q.includes('mouli') || q.includes('heritage') || q.includes('1995')) {
        return '<span class="pj-law-tag">PEOPLEJURIS • FOUNDING HERITAGE</span>' +
          '<p><strong>Chamber Heritage:</strong> PeopleJuris traces its foundational roots to <strong>Advocate Mr. Chandra Mouli Patnaik</strong>, an esteemed advocate, tribal rights activist, and legal luminary who established <em>People\'s Law Home</em> in 1995.</p>' +
          '<p>His decades of dedicated grassroots advocacy, land rights protection, and public interest jurisprudence established the ethical bedrock and constitutional values carried forward by PeopleJuris LLP today.</p>' +
          '<span class="pj-law-disclaimer">Foundational heritage of PeopleJuris LLP.</span>';
      }

      if (q.includes('swadhin') || q.includes('managing partner')) {
        return '<span class="pj-law-tag">PEOPLEJURIS • LEADERSHIP</span>' +
          '<p><strong>Managing Partner:</strong> <strong>Mr. Swadhin Patnaik</strong> is the Managing Partner of PeopleJuris LLP. Holding degrees in both Management (MBA) and Law (LL.B.), and enrolled with the Bar Council of Odisha, he merges rigorous corporate strategy with comprehensive legal acumen.</p>' +
          '<p>His practice areas center on Corporate Governance, Contractual Risk Structuring, Consumer Protection Litigation, Regulatory Compliance, and Business Advisory.</p>' +
          '<span class="pj-law-disclaimer">Chamber Leadership Profile.</span>';
      }

      if (q.includes('internship') || q.includes('career') || q.includes('job') || (/\bintern\b/.test(q) && !q.includes('internal'))) {
        return '<span class="pj-law-tag">PEOPLEJURIS • INTERNSHIPS & CAREERS</span>' +
          '<p><strong>Internship & Fellowship Program:</strong> PeopleJuris LLP offers structured internship programs for law students and recent graduates spanning <strong>1, 2, 3, or 6 months</strong>.</p>' +
          '<p>Interns gain rigorous hands-on exposure to legal research, case briefing, plaint and petition drafting, corporate compliance audits, and court procedure observations.</p>' +
          '<p>Applications can be submitted directly via the <strong>Career</strong> page on our website along with a Curriculum Vitae (CV) and Statement of Purpose.</p>' +
          '<span class="pj-law-disclaimer">Selection is merit-based through our academic review committee.</span>';
      }

      if (q.includes('newsletter') || q.includes('publication') || q.includes('bulletin') || q.includes('edition')) {
        return '<span class="pj-law-tag">PEOPLEJURIS • PUBLICATIONS & NEWSLETTERS</span>' +
          '<p><strong>Chamber Publications:</strong> PeopleJuris publishes comprehensive, peer-reviewed legal newsletters providing critical analysis of recent judicial pronouncements, statutory amendments, corporate compliance, and intellectual property dynamics.</p>' +
          '<p>Past and current editions (including Corporate Governance, IP Jurisprudence, and Criminal Sanhita analysis) can be read online or downloaded directly in PDF format from our <strong>Newsletter</strong> page.</p>' +
          '<span class="pj-law-disclaimer">Educational publications provided under Open Legal Knowledge initiative.</span>';
      }

      if (q.includes('consultation') || q.includes('appointment') || q.includes('book slot') || q.includes('fee') || q.includes('free consultation') || q.includes('paid consultation')) {
        return '<span class="pj-law-tag">PEOPLEJURIS • CONSULTATION TIERS</span>' +
          '<p><strong>Consultation Services:</strong> We offer two distinct tiers to serve clients effectively:</p>' +
          '<ul>' +
            '<li><strong>Free Initial Consultation (15 Mins):</strong> Preliminary scoping of legal jurisdiction, procedural viability, and general roadmap guidance.</li>' +
            '<li><strong>Comprehensive Paid Consultation:</strong> In-depth examination of case documentation, evidentiary review, statutory risk matrix, and tailored legal strategy.</li>' +
          '</ul>' +
          '<p>Bookings can be initiated directly through the <strong>Consultation</strong> page or via WhatsApp at <strong>+91 8763830030</strong>.</p>' +
          '<span class="pj-law-disclaimer">Consultations are conducted in strict confidentiality.</span>';
      }

      if (q === 'hi' || q === 'hello' || q === 'hey' || q === 'namaste' || q.startsWith('good morning') || q.startsWith('good afternoon') || q.startsWith('good evening')) {
        return '<span class="pj-law-tag">PEOPLEJURIS • INFORMATION ASSISTANT</span>' +
          '<p><strong>Hello and welcome to PeopleJuris LLP! 👋</strong></p>' +
          '<p>I am your Legal Information Assistant. I can assist you with:</p>' +
          '<ul>' +
            '<li><strong>Legal Concepts & Definitions:</strong> BNS/BNSS criminal laws, Section 138 cheque bounce, Order 39 injunctions, bail, divorce, property title verification, consumer rights, contracts, cyber law, and more.</li>' +
            '<li><strong>Chamber Information:</strong> Practice areas, consultation booking, office address, contact channels, and newsletters.</li>' +
          '</ul>' +
          '<p>How can I assist your legal inquiry today?</p>' +
          '<span class="pj-law-disclaimer">This assistant provides objective legal information and does not constitute formal legal counsel.</span>';
      }

      return null;
    }

    // -------------------------------------------------------------------------
    // C. ENCYCLOPEDIC LEGAL KNOWLEDGE REPOSITORY (100+ Core Topics & Statutes)
    // -------------------------------------------------------------------------
    const legalTopics = [
      // 1. Criminal Law: BNS, BNSS, BSA (The New Criminal Laws)
      {
        keys: ['bns', 'bharatiya nyaya sanhita', 'ipc replacement', 'new criminal law', 'ipc 2024'],
        tag: 'CRIMINAL LAW • STATUTE',
        title: 'Bharatiya Nyaya Sanhita (BNS), 2023',
        desc: '<p>The <strong>Bharatiya Nyaya Sanhita, 2023 (BNS)</strong> is India\'s substantive criminal code, replacing the Indian Penal Code, 1860 (IPC) effective <strong>July 1, 2024</strong>.</p>' +
          '<ul>' +
            '<li><strong>Key Modernizations:</strong> Consolidated 358 sections (down from 511 in the IPC); introduced <em>Community Service</em> as a formal penal punishment for petty offenses.</li>' +
            '<li><strong>Key Provisions:</strong> Organised Crime (Sec 111), Terrorist Acts (Sec 113), Mob Lynching (Sec 103(2)), and Offenses against Women and Children consolidated under Chapter V.</li>' +
            '<li><strong>Sedition Overhaul:</strong> The colonial offense of sedition (Sec 124A IPC) was replaced with Sec 152 BNS, penalizing acts endangering the sovereignty, unity, and integrity of India.</li>' +
          '</ul>'
      },
      {
        keys: ['bnss', 'bharatiya nagarik suraksha sanhita', 'crpc replacement', 'new criminal procedure'],
        tag: 'CRIMINAL PROCEDURE • STATUTE',
        title: 'Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023',
        desc: '<p>The <strong>Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)</strong> replaced the Code of Criminal Procedure, 1973 (CrPC) effective <strong>July 1, 2024</strong> as India\'s criminal procedural framework.</p>' +
          '<ul>' +
            '<li><strong>Investigation Timelines:</strong> Mandates strict timelines for filing charge sheets, medical examinations, and delivery of judgments within 30–45 days of concluding arguments.</li>' +
            '<li><strong>Digital Integration:</strong> Formal statutory recognition of electronic summons, Zero FIR (Sec 173), audio-video recording of search and seizure operations, and electronic bail applications.</li>' +
            '<li><strong>Forensic Mandate:</strong> Forensic examination is made mandatory for offenses punishable with 7 years imprisonment or more.</li>' +
          '</ul>'
      },
      {
        keys: ['bsa', 'bharatiya sakshya adhiniyam', 'evidence act replacement', 'new evidence act'],
        tag: 'EVIDENCE LAW • STATUTE',
        title: 'Bharatiya Sakshya Adhiniyam (BSA), 2023',
        desc: '<p>The <strong>Bharatiya Sakshya Adhiniyam, 2023 (BSA)</strong> replaced the Indian Evidence Act, 1872 effective <strong>July 1, 2024</strong>, regulating admissibility of evidence in Indian courts.</p>' +
          '<ul>' +
            '<li><strong>Electronic Evidence:</strong> Treats electronic and digital records (emails, server logs, messages, location data) on par with physical documentary evidence under Section 61 and Section 63.</li>' +
            '<li><strong>Digital Signatures & Metadata:</strong> Establishes clear evidentiary standards for digital certificates and hash verification to authenticate electronic communications without prejudice.</li>' +
          '</ul>'
      },
      // 2. Bail Jurisprudence
      {
        keys: ['bail', 'regular bail', '437 crpc', '439 crpc', '480 bnss', '483 bnss'],
        tag: 'CRIMINAL PROCEDURE • LIBERTY',
        title: 'Bail & Regular Bail in Indian Law',
        desc: '<p><strong>Bail</strong> is the provisional judicial release of an individual accused of an offense pending trial or investigation. The Supreme Court has repeatedly affirmed that <em>"Bail is the rule, jail is the exception."</em></p>' +
          '<ul>' +
            '<li><strong>Bailable Offenses:</strong> Bail is an absolute statutory right upon furnishing required bail bonds and sureties (Schedule I of CrPC/BNSS).</li>' +
            '<li><strong>Non-Bailable Offenses:</strong> Governed by Section 437/439 CrPC (Sections 480/483 BNSS); granted at judicial discretion based on nature of offense, flight risk, severity of punishment, and potential witness tampering.</li>' +
          '</ul>'
      },
      {
        keys: ['anticipatory bail', 'pre arrest bail', '438 crpc', '482 bnss'],
        tag: 'CRIMINAL PROCEDURE • LIBERTY',
        title: 'Anticipatory Bail (Pre-Arrest Bail)',
        desc: '<p><strong>Anticipatory Bail</strong> is a preventive legal remedy granted under <strong>Section 438 CrPC (Section 482 BNSS)</strong> by the Court of Session or the High Court to protect an individual who reasonably apprehends arrest in a false or non-bailable accusation.</p>' +
          '<ul>' +
            '<li><strong>Judicial Principles:</strong> In <em>Sushila Aggarwal v. State (NCT of Delhi)</em>, the Constitution Bench ruled that anticipatory bail should not be automatically time-limited unless justified by exceptional case facts.</li>' +
            '<li><strong>Conditions:</strong> Accused must make themselves available for police interrogation, must not tamper with evidence, and cannot leave the country without court permission.</li>' +
          '</ul>'
      },
      {
        keys: ['default bail', 'statutory bail', '167 crpc', '187 bnss'],
        tag: 'CRIMINAL PROCEDURE • CONSTITUTIONAL LIBERTY',
        title: 'Default Bail / Statutory Bail (Section 167(2) CrPC / 187 BNSS)',
        desc: '<p><strong>Default Bail</strong> is an absolute, indefeasible constitutional right arising under Section 167(2) CrPC (Section 187 BNSS) when investigating agencies fail to complete investigation and file a charge sheet within the statutory limitation period.</p>' +
          '<ul>' +
            '<li><strong>Statutory Timelines:</strong> <strong>90 days</strong> for offenses punishable with death, life imprisonment, or minimum 10 years; <strong>60 days</strong> for all other offenses.</li>' +
            '<li><strong>Enforceability:</strong> Once the statutory period lapses without a charge sheet, the accused is entitled to bail as a matter of right upon furnishing sureties.</li>' +
          '</ul>'
      },
      // 3. FIR & Police Investigation
      {
        keys: ['fir', 'first information report', '154 crpc', '173 bnss', 'how to file fir'],
        tag: 'CRIMINAL PROCEDURE • INVESTIGATION',
        title: 'First Information Report (FIR)',
        desc: '<p>A <strong>First Information Report (FIR)</strong> is the initial information recorded by an Officer-in-Charge of a police station regarding the commission of a cognizable offense under Section 154 CrPC (Section 173 BNSS).</p>' +
          '<ul>' +
            '<li><strong>Mandatory Registration:</strong> As held in <em>Lalita Kumari v. Govt of UP</em>, police are legally bound to register an FIR if information discloses a cognizable offense.</li>' +
            '<li><strong>Copy Rights:</strong> The complainant has a statutory entitlement to receive a copy of the registered FIR immediately and free of cost.</li>' +
            '<li><strong>Remedies for Refusal:</strong> If police refuse registration, the informant can send the complaint to the Superintendent of Police (SP) under Sec 154(3), or file a private complaint before the Magistrate under Sec 156(3) CrPC / 175(3) BNSS.</li>' +
          '</ul>'
      },
      {
        keys: ['zero fir', 'zero-fir'],
        tag: 'CRIMINAL PROCEDURE • ACCESS TO JUSTICE',
        title: 'Zero FIR: Concept & Statutory Protocol',
        desc: '<p>A <strong>Zero FIR</strong> is an FIR registered at any police station across India, regardless of territorial jurisdiction or the location where the alleged incident occurred.</p>' +
          '<ul>' +
            '<li><strong>Registration:</strong> It is registered with the serial number \'0\' to ensure immediate criminal investigation and medical examination without jurisdictional delay.</li>' +
            '<li><strong>Transfer:</strong> After immediate necessary steps, the police station transfers the case docket and evidence to the competent jurisdictional police station for regular investigation.</li>' +
            '<li><strong>Statutory Recognition:</strong> Formally codified in Section 173(1) of the Bharatiya Nagarik Suraksha Sanhita, 2023.</li>' +
          '</ul>'
      },
      {
        keys: ['quashing', 'quash fir', 'quash', '482 crpc', '528 bnss', '482', '528'],
        tag: 'CRIMINAL PROCEDURE • HIGH COURT JURISDICTION',
        title: 'Quashing of FIR & Criminal Proceedings (Section 482 CrPC / 528 BNSS)',
        desc: '<p>Under <strong>Section 482 CrPC (Section 528 BNSS)</strong>, the High Court possesses inherent powers to make such orders as may be necessary to prevent abuse of the process of any court or to secure the ends of justice.</p>' +
          '<ul>' +
            '<li><strong>Grounds for Quashing:</strong> Established in <em>State of Haryana v. Bhajan Lal</em>: where allegations even if taken at face value do not constitute an offense, where proceedings are maliciously instituted, or where civil disputes are dressed as criminal cases.</li>' +
            '<li><strong>Compounding / Settlement:</strong> High Courts can also quash matrimonial or commercial disputes settled amicably between parties where no heinous crime is involved.</li>' +
          '</ul>'
      },
      {
        keys: ['cognizable', 'non-cognizable', 'cognizable offense'],
        tag: 'CRIMINAL LAW • CLASSIFICATION',
        title: 'Cognizable vs Non-Cognizable Offenses',
        desc: '<p>Indian criminal jurisprudence classifies all offenses into cognizable and non-cognizable categories:</p>' +
          '<ul>' +
            '<li><strong>Cognizable Offenses (Sec 2(c) CrPC / BNSS):</strong> Serious crimes (e.g. murder, theft, rape, cheating) where police have the legal authority to arrest without a warrant and initiate investigation without Magistrate permission.</li>' +
            '<li><strong>Non-Cognizable Offenses (Sec 2(l) CrPC / BNSS):</strong> Less severe infractions (e.g. simple hurt, public nuisance) where police cannot arrest without a warrant and require a Magistrate\'s order to investigate.</li>' +
          '</ul>'
      },
      {
        keys: ['arrested', 'arrest', 'rights of an arrested person', 'rights of arrested', 'handcuffing', 'memo of arrest', 'arrest without warrant'],
        tag: 'CRIMINAL PROCEDURE • FUNDAMENTAL RIGHTS',
        title: 'Rights of an Arrested Person in India',
        desc: '<p>Indian criminal jurisprudence and Article 22 of the Constitution guarantee fundamental protections to any arrested person:</p>' +
          '<ul>' +
            '<li><strong>Right to Grounds of Arrest:</strong> Police must immediately communicate full particulars of the offense (Sec 50 CrPC).</li>' +
            '<li><strong>Memo of Arrest (Sec 41B CrPC):</strong> Must be prepared, witnessed by a family/community member, and countersigned by the arrestee.</li>' +
            '<li><strong>24-Hour Production Mandate:</strong> Must be produced before the nearest Judicial Magistrate within 24 hours of arrest, excluding travel time (Article 22(2)).</li>' +
            '<li><strong>Legal Counsel & Medical Exam:</strong> Right to meet an advocate during interrogation (Sec 41D) and mandatory medical examination (Sec 54).</li>' +
          '</ul>'
      },
      {
        keys: ['charge sheet', 'police report', '173 crpc', '193 bnss'],
        tag: 'CRIMINAL PROCEDURE • INVESTIGATION',
        title: 'Charge Sheet / Final Police Report',
        desc: '<p>A <strong>Charge Sheet</strong> is the final police investigation report submitted under Section 173 CrPC (Section 193 BNSS) to the competent Magistrate upon concluding investigation.</p>' +
          '<ul>' +
            '<li><strong>Contents:</strong> Identifies the accused, charges framed under penal sections, witness statements (Sec 161), seized articles, forensic reports, and evidentiary documents.</li>' +
            '<li><strong>Court Action:</strong> Upon filing, the Magistrate takes cognizance of the offense under Sec 190 CrPC, issues process (summons/warrant) to the accused, and proceeds toward framing of charges.</li>' +
          '</ul>'
      },
      // 4. Cheque Bounce (Section 138 NI Act)
      {
        keys: ['cheque bounce', 'section 138', 'dishonour of cheque', '138 ni act', 'negotiable instruments'],
        tag: 'COMMERCIAL LITIGATION • STATUTE',
        title: 'Cheque Dishonour under Section 138, Negotiable Instruments Act',
        desc: '<p><strong>Section 138 of the Negotiable Instruments Act, 1881</strong> penalizes the dishonour of cheques issued for the discharge of any legally enforceable debt or liability.</p>' +
          '<ul>' +
            '<li><strong>Statutory Notice:</strong> Within <strong>30 days</strong> of receiving the cheque return memo from the bank, the payee must send a formal written legal demand notice to the drawer.</li>' +
            '<li><strong>15-Day Cure Window:</strong> The drawer has 15 days from notice receipt to clear the payment.</li>' +
            '<li><strong>Filing Limitation:</strong> If unpaid, the criminal complaint must be filed before the Judicial Magistrate within <strong>30 days</strong> of the expiry of the 15-day period.</li>' +
            '<li><strong>Penalties:</strong> Imprisonment up to 2 years, or fine up to twice the cheque amount, or both. Section 143A also permits courts to award up to 20% interim compensation.</li>' +
          '</ul>'
      },
      // 5. Civil Litigation & CPC
      {
        keys: ['civil suit', 'cpc', 'code of civil procedure', 'how to file civil suit'],
        tag: 'CIVIL LITIGATION • PROCEDURE',
        title: 'Civil Suit Procedure (Code of Civil Procedure, 1908)',
        desc: '<p>Civil disputes in India follow a structured procedural trajectory under the <strong>Code of Civil Procedure, 1908 (CPC)</strong>:</p>' +
          '<ul>' +
            '<li><strong>1. Plaint & Summons:</strong> Plaintiff files Plaint (Order VII); court issues summons to defendant (Order V).</li>' +
            '<li><strong>2. Written Statement:</strong> Defendant must file written statement within 30 days (extendable up to 90 days) under Order VIII Rule 1.</li>' +
            '<li><strong>3. Framing of Issues:</strong> Court identifies material propositions of law and fact affirmed by one party and denied by the other (Order XIV).</li>' +
            '<li><strong>4. Evidence & Trial:</strong> Examination-in-chief, cross-examination, and marking of documents (Order XVIII).</li>' +
            '<li><strong>5. Judgment & Decree:</strong> Formal adjudication and decree enforceable via Execution Petition (Order XXI).</li>' +
          '</ul>'
      },
      {
        keys: ['injunction', 'stay order', 'temporary injunction', 'order 39'],
        tag: 'CIVIL LITIGATION • EQUITABLE RELIEF',
        title: 'Temporary Injunction & Stay Orders (Order 39 Rules 1 & 2 CPC)',
        desc: '<p>A <strong>Temporary Injunction</strong> is an interim judicial order issued under Order 39 CPC to preserve the status quo of property or rights in dispute until the final disposal of a suit.</p>' +
          '<ul>' +
            '<li><strong>The Three Cardinal Tests:</strong>' +
              '<ul>' +
                '<li><em>1. Prima Facie Case:</em> A bona fide contention on legal merits requiring trial determination.</li>' +
                '<li><em>2. Balance of Convenience:</em> Comparative mischief or inconvenience likely to arise from withholding the injunction versus granting it.</li>' +
                '<li><em>3. Irreparable Injury:</em> Harm that cannot be adequately repaired or compensated by monetary damages.</li>' +
              '</ul>' +
            '</li>' +
          '</ul>'
      },
      {
        keys: ['caveat', 'caveat petition', '148a cpc'],
        tag: 'CIVIL LITIGATION • PREVENTIVE REMEDY',
        title: 'Caveat Petition (Section 148A, CPC)',
        desc: '<p>A <strong>Caveat Petition</strong> is a precautionary application filed under <strong>Section 148A of the CPC</strong> by an individual who anticipates that an opposing party may institute a suit or appeal against them.</p>' +
          '<ul>' +
            '<li><strong>Legal Effect:</strong> Obligates the court to serve prior notice and afford a hearing to the caveator before granting any ex-parte interim order or stay.</li>' +
            '<li><strong>Validity:</strong> A caveat remains legally valid for <strong>90 days</strong> from the date of filing, after which a fresh caveat must be lodged if proceedings remain anticipated.</li>' +
          '</ul>'
      },
      {
        keys: ['res judicata', 'section 11 cpc'],
        tag: 'CIVIL JURISPRUDENCE • DOCTRINE',
        title: 'Doctrine of Res Judicata (Section 11, CPC)',
        desc: '<p>The doctrine of <strong>Res Judicata</strong> (Latin: <em>"a matter judged"</em>) prohibits courts from retrying an issue or suit between the same parties that has already been heard and conclusively decided by a court of competent jurisdiction.</p>' +
          '<ul>' +
            '<li><strong>Foundational Maxims:</strong> Based on <em>Interest reipublicae ut sit finis litium</em> (It is in public interest that litigation should end) and <em>Nemo debet bis vexari pro una et eadem causa</em> (No person should be troubled twice for the same cause).</li>' +
          '</ul>'
      },
      {
        keys: ['limitation act', 'limitation period', 'time limit to file suit', 'section 5 limitation'],
        tag: 'CIVIL PROCEDURE • STATUTE',
        title: 'The Limitation Act, 1963',
        desc: '<p>The <strong>Limitation Act, 1963</strong> establishes statutory time barriers within which legal suits, appeals, and applications must be filed before courts.</p>' +
          '<ul>' +
            '<li><strong>Standard Periods:</strong> Recovery of contract debts / damages: <strong>3 years</strong>; Possession of immovable property based on title: <strong>12 years</strong>; Execution of decrees: <strong>12 years</strong>.</li>' +
            '<li><strong>Condonation of Delay (Sec 5):</strong> Courts may admit an appeal or application filed after the limitation period if sufficient cause is demonstrated (does not apply to original suits).</li>' +
          '</ul>'
      },
      // 6. Property & Real Estate
      {
        keys: ['title verification', 'due diligence', 'encumbrance certificate', 'ec', 'property verification', 'property title', 'verify title', 'title search', 'land title', 'verify property'],
        tag: 'PROPERTY LAW • DUE DILIGENCE',
        title: 'Property Title Verification & Due Diligence',
        desc: '<p><strong>Title Verification</strong> is the comprehensive legal scrutiny of ownership documents to confirm marketable, clean, and encumbrance-free title before purchasing real estate.</p>' +
          '<ul>' +
            '<li><strong>30-Year Search:</strong> Examination of registered link deeds, sale deeds, gift deeds, and partition instruments for a minimum 30-year backward chain.</li>' +
            '<li><strong>Encumbrance Certificate (EC):</strong> Sub-Registrar document verifying registered transactions, mortgages, liens, or court attachments.</li>' +
            '<li><strong>Revenue Records:</strong> Patta, Record of Rights (RoR), Jamabandi, municipal tax payment receipts, and approved building layout plans.</li>' +
          '</ul>'
      },
      {
        keys: ['sale deed', 'agreement to sell', 'deed of sale', 'conveyance deed'],
        tag: 'PROPERTY LAW • CONVEYANCING',
        title: 'Sale Deed vs Agreement to Sell',
        desc: '<p>Indian property law draws a fundamental distinction between an agreement to sell and an executed sale deed:</p>' +
          '<ul>' +
            '<li><strong>Agreement to Sell:</strong> An executory contract outlining agreed commercial terms, timeline, and consideration. It does <em>not</em> transfer ownership or create an interest in immovable property.</li>' +
            '<li><strong>Sale Deed:</strong> The executed conveyance deed that legally transfers title, possession, and ownership from seller to buyer. Under Section 17 of the Registration Act, registration and payment of state stamp duty are mandatory.</li>' +
          '</ul>'
      },
      {
        keys: ['gift deed', 'gifting property', '122 tpa'],
        tag: 'PROPERTY LAW • TRANSFER',
        title: 'Gift Deed (Section 122, Transfer of Property Act)',
        desc: '<p>A <strong>Gift Deed</strong> is the voluntary transfer of existing movable or immovable property from a donor to a donee made without monetary consideration.</p>' +
          '<ul>' +
            '<li><strong>Mandatory Elements:</strong> Must be accepted by the donee during the lifetime of the donor while the donor is still capable of giving.</li>' +
            '<li><strong>Registration:</strong> For immovable property, Section 123 of the Transfer of Property Act mandates attestation by at least two witnesses and compulsory registration.</li>' +
          '</ul>'
      },
      {
        keys: ['will', 'probate', 'testament', 'succession certificate', 'letter of administration'],
        tag: 'FAMILY & SUCCESSION LAW',
        title: 'Wills, Probate & Succession Certificates',
        desc: '<p>Succession and testamentary dispositions in India are governed primarily by the <strong>Indian Succession Act, 1925</strong>:</p>' +
          '<ul>' +
            '<li><strong>Will:</strong> Legal declaration of a person\'s intentions regarding asset distribution after death. Registration is optional but provides strong evidentiary weight.</li>' +
            '<li><strong>Probate:</strong> Official certification by a competent court that a Will is valid and executed by the testator. Mandatory in presidency towns (Mumbai, Kolkata, Chennai).</li>' +
            '<li><strong>Succession Certificate:</strong> Issued by a civil court to legal heirs of someone dying without a Will (intestate) authorizing them to realize debts and securities.</li>' +
          '</ul>'
      },
      {
        keys: ['power of attorney', 'poa', 'gpa', 'spa'],
        tag: 'LEGAL DRAFTING • AGENCY',
        title: 'Power of Attorney (General POA vs Special POA)',
        desc: '<p>A <strong>Power of Attorney (POA)</strong> is a formal legal instrument authorizing an agent to act on behalf of the principal in business, legal, or property matters.</p>' +
          '<ul>' +
            '<li><strong>General POA (GPA):</strong> Grants broad powers across financial, litigation, and management affairs.</li>' +
            '<li><strong>Special POA (SPA):</strong> Restricted to a specific act, such as executing a particular deed or appearing in a designated court proceeding.</li>' +
            '<li><strong>Supreme Court Mandate (Suraj Lamp):</strong> A GPA cannot transfer title or ownership of immovable property; title transfers require registered sale deeds.</li>' +
          '</ul>'
      },
      {
        keys: ['mutation', 'mutation of property', 'ror', 'patta'],
        tag: 'REVENUE LAW • LAND RECORDS',
        title: 'Mutation of Property & Revenue Records',
        desc: '<p><strong>Mutation</strong> is the recording of a transfer of title in municipal or revenue land records (such as Record of Rights / Patta) for the purpose of tax assessment and payment.</p>' +
          '<ul>' +
            '<li><strong>Legal Weight:</strong> The Supreme Court has consistently held that mutation entries are for fiscal collection purposes only and do <em>not</em> create or extinguish legal ownership title, which depends on registered title deeds.</li>' +
          '</ul>'
      },
      {
        keys: ['adverse possession', '12 years possession'],
        tag: 'PROPERTY JURISPRUDENCE • LIMITATION',
        title: 'Doctrine of Adverse Possession',
        desc: '<p><strong>Adverse Possession</strong> is a legal principle whereby a person possessing another\'s immovable property openly, continuously, and hostile to the true owner for the statutory period can claim title under the Limitation Act.</p>' +
          '<ul>' +
            '<li><strong>Statutory Periods:</strong> <strong>12 years</strong> for private property; <strong>30 years</strong> for government/state land.</li>' +
            '<li><strong>Strict Standards:</strong> Possession must be <em>nec vi, nec clam, nec precario</em> (without force, without secrecy, and without permission).</li>' +
          '</ul>'
      },
      {
        keys: ['rera', 'real estate regulatory authority', 'builder delay'],
        tag: 'REAL ESTATE LAW • CONSUMER PROTECTION',
        title: 'RERA (Real Estate Regulatory Authority)',
        desc: '<p>The <strong>Real Estate (Regulation and Development) Act, 2016 (RERA)</strong> protects home buyers and enforces transparency in the real estate development sector.</p>' +
          '<ul>' +
            '<li><strong>Mandatory Registration:</strong> Commercial and residential projects where land exceeds 500 sq meters or 8 apartments must be registered with State RERA.</li>' +
            '<li><strong>70% Escrow Account:</strong> Developers must deposit 70% of realized amounts into a dedicated escrow account for construction and land costs only.</li>' +
            '<li><strong>Delay Compensation:</strong> If a developer delays possession, allottees can claim monthly interest at prescribed rates or a full refund with interest.</li>' +
          '</ul>'
      },
      // 7. Family & Matrimonial Law
      {
        keys: ['mutual consent divorce', '13b', 'divorce by mutual consent'],
        tag: 'FAMILY LAW • MATRIMONIAL',
        title: 'Mutual Consent Divorce (Section 13B, Hindu Marriage Act)',
        desc: '<p><strong>Mutual Consent Divorce</strong> allows spouses to dissolve their marriage amicably without asserting fault grounds under Section 13B of the Hindu Marriage Act, 1955.</p>' +
          '<ul>' +
            '<li><strong>Prerequisites:</strong> Living separately for at least 1 year, mutual consensus that the marriage has broken down, and agreed settlement on maintenance, alimony, and child custody.</li>' +
            '<li><strong>Two Motions:</strong> Joint petition (First Motion) followed by Second Motion after a 6-month statutory cooling-off period (which courts can waive under <em>Amardeep Singh v. Harveen Kaur</em>).</li>' +
          '</ul>'
      },
      {
        keys: ['contested divorce', 'grounds for divorce', 'cruelty divorce'],
        tag: 'FAMILY LAW • LITIGATION',
        title: 'Contested Divorce Grounds (Section 13, HMA)',
        desc: '<p>A <strong>Contested Divorce</strong> is initiated by one spouse against the other on statutory fault grounds established under Section 13(1) of the Hindu Marriage Act:</p>' +
          '<ul>' +
            '<li><strong>Statutory Grounds:</strong> Cruelty (physical or mental), Desertion for a continuous period of at least 2 years, Adultery, Conversion to another religion, Incurable mental disorder, or Renunciation of the world.</li>' +
          '</ul>'
      },
      {
        keys: ['maintenance', 'alimony', '125 crpc', '144 bnss', 'wife maintenance'],
        tag: 'FAMILY LAW • STATUTORY SUPPORT',
        title: 'Maintenance & Alimony under Indian Law',
        desc: '<p>Indian law provides multiple concurrent statutory avenues for spousal and dependent financial maintenance:</p>' +
          '<ul>' +
            '<li><strong>Section 125 CrPC (Section 144 BNSS):</strong> Summary statutory remedy available to wives, minor children, and aged parents unable to maintain themselves.</li>' +
            '<li><strong>Section 24 HMA:</strong> Interim maintenance (pendente lite) and litigation expenses during the pendency of matrimonial proceedings.</li>' +
            '<li><strong>Section 25 HMA:</strong> Permanent alimony and maintenance awarded at the time of decree, calculated on the parties\' earning capacity, assets, and standard of living (Supreme Court guidelines in <em>Rajnesh v. Neha</em>).</li>' +
          '</ul>'
      },
      {
        keys: ['domestic violence', 'pwdva', 'protection of women from domestic violence'],
        tag: 'FAMILY LAW • SOCIAL JUSTICE',
        title: 'Protection of Women from Domestic Violence Act, 2005 (PWDVA)',
        desc: '<p>The <strong>PWDVA, 2005</strong> is comprehensive civil legislation providing emergency relief and protection to women facing domestic abuse within a domestic relationship.</p>' +
          '<ul>' +
            '<li><strong>Scope of Abuse:</strong> Covers physical, sexual, verbal, emotional, and economic abuse (withholding financial resources, stridhan, or household necessities).</li>' +
            '<li><strong>Remedies:</strong> Protection Orders (prohibiting acts of violence), Residence Orders (right to reside in shared household), Monetary Relief, and Temporary Custody Orders.</li>' +
          '</ul>'
      },
      {
        keys: ['child custody', 'custody of child', 'guardianship'],
        tag: 'FAMILY LAW • CHILD WELFARE',
        title: 'Child Custody & Guardianship in India',
        desc: '<p>Child custody disputes are adjudicated under the <strong>Guardians and Wards Act, 1890</strong> and personal laws.</p>' +
          '<ul>' +
            '<li><strong>Paramount Principle:</strong> The supreme governing doctrine in Indian custody jurisprudence is the <em>"paramount welfare and best interest of the minor child"</em>, superseding parental claims.</li>' +
            '<li><strong>Forms of Custody:</strong> Physical Custody (primary day-to-day residence) and Legal Custody (decision-making rights regarding education and health). Visitation rights are routinely granted to non-custodial parents.</li>' +
          '</ul>'
      },
      // 8. Constitutional Law & Fundamental Rights
      {
        keys: ['writ', 'writ petition', 'article 32', 'article 226', 'habeas corpus', 'mandamus'],
        tag: 'CONSTITUTIONAL LAW • JUDICIAL REMEDIES',
        title: 'Writ Petitions (Article 32 & 226, Constitution of India)',
        desc: '<p><strong>Writs</strong> are constitutional prerogative remedies issued by the Supreme Court (Article 32) and High Courts (Article 226) to enforce Fundamental Rights and constitutional rule of law:</p>' +
          '<ul>' +
            '<li><strong>1. Habeas Corpus:</strong> <em>"To have the body"</em>; directs authorities to produce an illegally detained individual.</li>' +
            '<li><strong>2. Mandamus:</strong> <em>"We command"</em>; orders a public official or body to perform a mandatory statutory duty.</li>' +
            '<li><strong>3. Quo Warranto:</strong> Inquires into the lawful authority of a person holding a public office.</li>' +
            '<li><strong>4. Certiorari:</strong> Quashes an order passed by a lower court/tribunal in excess of jurisdiction or violating natural justice.</li>' +
            '<li><strong>5. Prohibition:</strong> Prohibits an inferior court/tribunal from exceeding its jurisdiction while proceedings are pending.</li>' +
          '</ul>'
      },
      {
        keys: ['article 21', 'right to life', 'personal liberty', 'privacy right'],
        tag: 'CONSTITUTIONAL LAW • FUNDAMENTAL RIGHTS',
        title: 'Article 21: Protection of Life and Personal Liberty',
        desc: '<p><strong>Article 21</strong> guarantees: <em>"No person shall be deprived of his life or personal liberty except according to procedure established by law."</em></p>' +
          '<ul>' +
            '<li><strong>Expansive Interpretation:</strong> The Supreme Court has interpreted "life" as life with human dignity, encompassing the Right to Privacy (<em>K.S. Puttaswamy</em>), Right to Livelihood, Right to Clean Environment, Right to Speedy Trial, and Right to Free Legal Aid.</li>' +
          '</ul>'
      },
      {
        keys: ['rti', 'right to information', 'rti act', 'how to file rti'],
        tag: 'ADMINISTRATIVE LAW • TRANSPARENCY',
        title: 'Right to Information Act, 2005 (RTI)',
        desc: '<p>The <strong>RTI Act, 2005</strong> empowers Indian citizens to inspect work, documents, and records held by public authorities to ensure transparency and accountability.</p>' +
          '<ul>' +
            '<li><strong>Timelines:</strong> The Public Information Officer (PIO) must furnish information within <strong>30 days</strong> (within <strong>48 hours</strong> if concerning life or personal liberty).</li>' +
            '<li><strong>Appeals:</strong> First Appeal within 30 days to the First Appellate Authority; Second Appeal to the Central Information Commission (CIC) or State Information Commission (SIC).</li>' +
          '</ul>'
      },
      // 9. Corporate, Contracts & Commercial
      {
        keys: ['contract', 'indian contract act', 'valid contract', 'breach of contract'],
        tag: 'COMMERCIAL LAW • CONTRACTS',
        title: 'Law of Contracts (Indian Contract Act, 1872)',
        desc: '<p>An agreement enforceable by law is a <strong>Contract</strong> under Section 2(h) of the Indian Contract Act, 1872.</p>' +
          '<ul>' +
            '<li><strong>Essential Elements (Sec 10):</strong> Offer and acceptance, lawful consideration, competent parties (major, sound mind), free consent (untainted by coercion, undue influence, fraud, misrepresentation, or mistake), and lawful object.</li>' +
            '<li><strong>Breach & Remedies:</strong> Available remedies include compensatory damages (Sec 73), liquidated damages (Sec 74), specific performance, and injunctions.</li>' +
          '</ul>'
      },
      {
        keys: ['ibc', 'insolvency', 'nclt', 'cirp', 'insolvency and bankruptcy code'],
        tag: 'CORPORATE LAW • INSOLVENCY',
        title: 'Insolvency & Bankruptcy Code, 2016 (IBC)',
        desc: '<p>The <strong>IBC, 2016</strong> establishes a time-bound insolvency resolution framework for corporate entities and LLPs before the National Company Law Tribunal (NCLT).</p>' +
          '<ul>' +
            '<li><strong>CIRP Initiation:</strong> Financial Creditors (Sec 7) and Operational Creditors (Sec 9) can trigger Corporate Insolvency Resolution Process (CIRP) for payment defaults meeting statutory thresholds (currently Rs. 1 Crore).</li>' +
            '<li><strong>Resolution:</strong> Managed by an Interim Resolution Professional (IRP) under a Committee of Creditors (CoC) to restructure debt or liquidate assets.</li>' +
          '</ul>'
      },
      {
        keys: ['msme', 'msmed act', 'delayed payment', 'msme samadhaan'],
        tag: 'COMMERCIAL LAW • MSME RECOVERY',
        title: 'MSME Delayed Payments (MSMED Act, 2006)',
        desc: '<p>Under Section 15 of the <strong>MSMED Act, 2006</strong>, buyers of goods or services from registered MSMEs must make payment within agreed terms or a maximum of <strong>45 days</strong>.</p>' +
          '<ul>' +
            '<li><strong>Compound Penal Interest:</strong> If payment is delayed, buyer is legally liable to pay compound interest with monthly rests at <strong>three times the RBI bank rate</strong>.</li>' +
            '<li><strong>MSME Samadhaan:</strong> Claims can be filed online before the Micro and Small Enterprise Facilitation Council (MSEFC) for fast-track conciliation and arbitration.</li>' +
          '</ul>'
      },
      // 10. Intellectual Property Rights (IPR)
      {
        keys: ['trademark', 'trademark search', 'tm', 'infringement vs passing off'],
        tag: 'INTELLECTUAL PROPERTY • TRADEMARKS',
        title: 'Trademarks & Brand Protection (Trade Marks Act, 1999)',
        desc: '<p>A <strong>Trademark</strong> protects distinctive signs, brand names, logos, or slogans that distinguish goods or services of one enterprise from another.</p>' +
          '<ul>' +
            '<li><strong>Symbols:</strong> ™ denotes an application filed; ® denotes a successfully registered mark granting exclusive statutory protection for 10 years (renewable indefinitely).</li>' +
            '<li><strong>Infringement vs Passing Off:</strong> Trademark Infringement is a statutory remedy for unauthorized use of a registered mark; Passing Off is a common-law tort protecting the commercial goodwill of unregistered marks.</li>' +
          '</ul>'
      },
      {
        keys: ['copyright', 'copyright act', 'fair dealing'],
        tag: 'INTELLECTUAL PROPERTY • COPYRIGHT',
        title: 'Copyright Law (Copyright Act, 1957)',
        desc: '<p><strong>Copyright</strong> grants exclusive rights to creators over original literary, dramatic, musical, artistic works, cinematograph films, and computer code.</p>' +
          '<ul>' +
            '<li><strong>Duration:</strong> Protection persists for the author\'s entire lifetime plus <strong>60 years</strong> from the beginning of the calendar year following death.</li>' +
            '<li><strong>Fair Dealing:</strong> Section 52 permits limited use of copyrighted material without permission for private study, research, criticism, review, and news reporting.</li>' +
          '</ul>'
      },
      {
        keys: ['patent', 'patents act', 'patentability criteria'],
        tag: 'INTELLECTUAL PROPERTY • PATENTS',
        title: 'Patent Law (Patents Act, 1970)',
        desc: '<p>A <strong>Patent</strong> is an exclusive statutory monopoly granted for a technical invention for a non-renewable period of <strong>20 years</strong> from the date of filing.</p>' +
          '<ul>' +
            '<li><strong>Three Pillars of Patentability:</strong> 1) <em>Novelty</em> (new and never published globally); 2) <em>Inventive Step</em> (non-obvious to a person skilled in the art); 3) <em>Industrial Applicability</em> (capable of industrial manufacture).</li>' +
          '</ul>'
      },
      // 11. Cyber Law & Data Protection
      {
        keys: ['cyber crime', 'it act', 'cyber fraud', 'hacking', 'cyber complaint'],
        tag: 'CYBER LAW • INFORMATION TECHNOLOGY',
        title: 'Cyber Law & IT Act, 2000',
        desc: '<p>Cyber offenses in India are regulated by the <strong>Information Technology Act, 2000 (IT Act)</strong> and the penal code:</p>' +
          '<ul>' +
            '<li><strong>Key Offenses:</strong> Hacking & Data Theft (Sec 43/66), Identity Theft (Sec 66C), Cheating by Personation / Phishing (Sec 66D), and Obscene Electronic Publishing (Sec 67).</li>' +
            '<li><strong>Incident Reporting:</strong> Online financial and cyber crimes can be reported directly on the National Cyber Crime Portal (<strong>cybercrime.gov.in</strong>) or by calling the National Cyber Helpline at <strong>1930</strong> for immediate fund freezing.</li>' +
          '</ul>'
      },
      {
        keys: ['dpdp', 'digital personal data protection', 'data privacy law'],
        tag: 'DATA PRIVACY • STATUTE',
        title: 'Digital Personal Data Protection Act, 2023 (DPDP)',
        desc: '<p>The <strong>DPDP Act, 2023</strong> establishes India\'s comprehensive data privacy framework governing digital personal data processing.</p>' +
          '<ul>' +
            '<li><strong>Core Architecture:</strong> Grants Data Principals (individuals) rights to consent, access, correction, and erasure; imposes strict compliance mandates on Data Fiduciaries.</li>' +
            '<li><strong>Penalties:</strong> The Data Protection Board of India can impose significant financial penalties (up to Rs. 250 Crores) for non-compliance and data security failures.</li>' +
          '</ul>'
      },
      // 12. Consumer Protection
      {
        keys: ['consumer court', 'consumer protection act', 'deficiency in service', 'unfair trade practice'],
        tag: 'CONSUMER LAW • REDRESSAL',
        title: 'Consumer Protection Act, 2019',
        desc: '<p>The <strong>Consumer Protection Act, 2019</strong> establishes a robust quasi-judicial mechanism to protect consumer rights against defective goods and service deficiencies:</p>' +
          '<ul>' +
            '<li><strong>Three-Tier Commissions:</strong> District Commission (claims up to Rs. 50 Lakhs), State Commission (Rs. 50 Lakhs to Rs. 2 Crores), and National Commission / NCDRC (above Rs. 2 Crores).</li>' +
            '<li><strong>Key Rights:</strong> Right to safety, right to be informed, right to choose, and right to seek redressal against Deficiency in Service, Defective Goods, and Product Liability.</li>' +
          '</ul>'
      },
      // 13. Labor, Employment & POSH
      {
        keys: ['posh', 'posh act', 'sexual harassment at workplace', 'internal committee'],
        tag: 'LABOR & EMPLOYMENT LAW • COMPLIANCE',
        title: 'POSH Act, 2013 (Prevention of Sexual Harassment at Workplace)',
        desc: '<p>The <strong>POSH Act, 2013</strong> mandates safe, harassment-free workplace environments for women across formal and informal employment sectors.</p>' +
          '<ul>' +
            '<li><strong>Internal Committee (IC):</strong> Mandatory for every workplace employing <strong>10 or more employees</strong>, presided over by a senior woman employee and including an external independent member.</li>' +
            '<li><strong>Time-Bound Inquiry:</strong> Inquiries must be completed within <strong>90 days</strong> of complaint submission, and proceedings are subject to strict statutory confidentiality.</li>' +
          '</ul>'
      },
      {
        keys: ['gratuity', 'gratuity calculation', 'payment of gratuity act'],
        tag: 'LABOR LAW • EMPLOYEE BENEFITS',
        title: 'Payment of Gratuity Act, 1972',
        desc: '<p><strong>Gratuity</strong> is a statutory lump-sum retirement benefit paid to employees in appreciation of continuous long-term service.</p>' +
          '<ul>' +
            '<li><strong>Eligibility:</strong> Minimum <strong>5 years</strong> of continuous service in the establishment (relaxed in case of death or disablement).</li>' +
            '<li><strong>Calculation:</strong> Calculated as 15 days\' wages for every completed year of service based on the last drawn basic salary, currently capped at Rs. 20 Lakhs.</li>' +
          '</ul>'
      },
      // 14. Dispute Resolution & ADR
      {
        keys: ['arbitration', 'arbitration and conciliation act', 'arbitral award', 'section 34'],
        tag: 'DISPUTE RESOLUTION • ARBITRATION',
        title: 'Arbitration in India (Arbitration & Conciliation Act, 1996)',
        desc: '<p><strong>Arbitration</strong> is a private, binding alternative dispute resolution mechanism where parties submit disputes to an impartial tribunal chosen by agreement.</p>' +
          '<ul>' +
            '<li><strong>Arbitral Award:</strong> The award delivered by an arbitrator is final, binding, and directly enforceable as a court decree under Order XXI CPC.</li>' +
            '<li><strong>Limited Challenges:</strong> An award cannot be appealed on factual merits; under Section 34, it can only be set aside on narrow grounds such as patent illegality, conflict with public policy of India, or lack of proper notice.</li>' +
          '</ul>'
      },
      {
        keys: ['mediation', 'mediation act', 'conciliation'],
        tag: 'DISPUTE RESOLUTION • ADR',
        title: 'Mediation & Conciliation (Mediation Act, 2023)',
        desc: '<p><strong>Mediation</strong> is a voluntary, confidential negotiation process where an impartial neutral mediator assists disputing parties in reaching an amicable settlement.</p>' +
          '<ul>' +
            '<li><strong>Legal Enforceability:</strong> Under the <strong>Mediation Act, 2023</strong>, a Mediated Settlement Agreement (MSA) signed by parties and authenticated by the mediator has the same legal status and enforceability as a judgment/decree of a civil court.</li>' +
          '</ul>'
      },
      {
        keys: ['lok adalat', 'nalsa', 'compromise decree'],
        tag: 'DISPUTE RESOLUTION • STATUTORY TRIBUNAL',
        title: 'Lok Adalat (Legal Services Authorities Act, 1987)',
        desc: '<p><strong>Lok Adalat</strong> (People\'s Court) is a statutory forum established under the Legal Services Authorities Act for consensual dispute resolution.</p>' +
          '<ul>' +
            '<li><strong>Finality:</strong> An award delivered by a Lok Adalat is deemed to be a decree of a civil court, is final and binding on all parties, and <strong>no appeal</strong> lies against it.</li>' +
            '<li><strong>Court Fee Refund:</strong> If a pending matter in court is settled before a Lok Adalat, 100% of the court fee originally paid is refunded to the parties.</li>' +
          '</ul>'
      },
      // 15. Legal Maxims & Foundational Jurisprudence
      {
        keys: ['audi alteram partem', 'natural justice'],
        tag: 'LEGAL MAXIM • NATURAL JUSTICE',
        title: 'Audi Alteram Partem (Rule of Natural Justice)',
        desc: '<p><em>Audi Alteram Partem</em> translates to <strong>"Hear the other side"</strong>. It is a fundamental pillar of Natural Justice requiring that no person shall be condemned or penalized unheard.</p>' +
          '<ul>' +
            '<li><strong>Core Requirements:</strong> Prior adequate notice detailing allegations and a fair, reasonable opportunity to submit defense and be heard before any judicial or administrative order affecting rights is passed.</li>' +
          '</ul>'
      },
      {
        keys: ['nemo judex in causa sua', 'rule against bias'],
        tag: 'LEGAL MAXIM • NATURAL JUSTICE',
        title: 'Nemo Judex In Causa Sua (Rule Against Bias)',
        desc: '<p><em>Nemo Judex In Causa Sua</em> translates to <strong>"No one should be a judge in their own cause."</strong></p>' +
          '<ul>' +
            '<li><strong>Doctrinal Purpose:</strong> Ensures judicial impartiality by barring any judge, magistrate, or adjudicator with a personal, pecuniary, or subject-matter bias from hearing a case.</li>' +
          '</ul>'
      },
      {
        keys: ['mens rea', 'guilty mind', 'actus reus'],
        tag: 'CRIMINAL JURISPRUDENCE • MENTAL ELEMENT',
        title: 'Mens Rea & Actus Reus (Constituents of Crime)',
        desc: '<p>Under the maxim <em>Actus non facit reum nisi mens sit rea</em>, an act does not make a person legally guilty unless their mind was also guilty.</p>' +
          '<ul>' +
            '<li><strong>Actus Reus:</strong> The physical, prohibited act, omission, or consequence.</li>' +
            '<li><strong>Mens Rea:</strong> The blameworthy mental state (intention, knowledge, recklessness, or criminal negligence). Both elements must concur to establish criminal guilt (except in statutory strict liability offenses).</li>' +
          '</ul>'
      },
      {
        keys: ['sub judice', 'sub-judice'],
        tag: 'LEGAL DOCTRINE • JUDICIAL INTEGRITY',
        title: 'Doctrine of Sub Judice',
        desc: '<p><strong>Sub Judice</strong> (Latin: <em>"under judicial consideration"</em>) refers to a matter that is currently pending before a court of law for trial or adjudication.</p>' +
          '<ul>' +
            '<li><strong>Rule:</strong> Public commentary, media trials, or extrajudicial assertions that could prejudice fair trial or influence the court\'s verdict are prohibited to uphold fair administration of justice.</li>' +
          '</ul>'
      }
    ];

    // Build flattened, prioritized list of keys sorted by length descending
    const flatLegalKeys = [];
    legalTopics.forEach(function (topic) {
      topic.keys.forEach(function (k) {
        flatLegalKeys.push({ key: k, topic: topic });
      });
    });
    flatLegalKeys.sort(function (a, b) {
      return b.key.length - a.key.length;
    });

    function getLegalKnowledgeResponse(q) {
      for (let i = 0; i < flatLegalKeys.length; i++) {
        const item = flatLegalKeys[i];
        if (matchWord(q, item.key)) {
          const topic = item.topic;
          return `<span class="pj-law-tag">${topic.tag}</span>` +
            `<p><strong>${topic.title}</strong></p>` +
            topic.desc +
            '<span class="pj-law-disclaimer">Informational & educational description only under Bar Council guidelines; does not constitute legal advice.</span>';
        }
      }
      return null;
    }

    // -------------------------------------------------------------------------
    // D. DYNAMIC LEGAL CONCEPT SYNTHESIZER (For Any Law Query Not in Dict)
    // -------------------------------------------------------------------------
    function synthesizeLegalConcept(q) {
      const legalIndicators = [
        'law', 'act', 'section', 'order', 'rule', 'statute', 'court', 'judge', 'magistrate',
        'advocate', 'lawyer', 'counsel', 'suit', 'case', 'trial', 'hearing', 'judgment', 'decree',
        'appeal', 'petition', 'revision', 'complaint', 'fir', 'police', 'arrest', 'bail', 'custody',
        'offense', 'crime', 'civil', 'criminal', 'penalty', 'fine', 'damages', 'compensation',
        'contract', 'agreement', 'deed', 'property', 'registry', 'will', 'probate', 'succession',
        'divorce', 'maintenance', 'custody', 'marriage', 'domestic', 'tenant', 'landlord', 'eviction',
        'cheque', 'debt', 'recovery', 'insolvency', 'bankruptcy', 'trademark', 'copyright', 'patent',
        'consumer', 'deficiency', 'tax', 'gst', 'cyber', 'fraud', 'arbitration', 'mediation',
        'fundamental right', 'rights', 'constitution', 'writ', 'injunction', 'stay', 'caveat',
        'liability', 'negligence', 'tort', 'affidavit', 'notary', 'summons', 'warrant',
        'easement', 'partition', 'inheritance', 'estate'
      ];

      const hasLegalMarker = legalIndicators.some(function (marker) {
        return matchWord(q, marker);
      });
      if (!hasLegalMarker) return null;

      // Classify the domain of inquiry
      let domain = 'GENERAL JURISPRUDENCE';
      let guidance = '';

      if (q.includes('crime') || q.includes('criminal') || q.includes('police') || q.includes('arrest') || q.includes('bail') || q.includes('fir') || q.includes('penal') || q.includes('offense')) {
        domain = 'CRIMINAL LAW & PROCEDURE';
        guidance = '<p><strong>Criminal Legal Principles:</strong> In Indian criminal jurisprudence (governed by the Bharatiya Nyaya Sanhita, 2023 and BNSS, 2023), criminal law enforces public order and penalizes unlawful conduct.</p>' +
          '<ul>' +
            '<li><strong>Presumption of Innocence:</strong> Every accused person is presumed innocent until proven guilty beyond reasonable doubt by the prosecution.</li>' +
            '<li><strong>Procedural Safeguards:</strong> Rigorous statutory checks govern arrest, interrogation, remand, and charge-sheet submission to safeguard personal liberty under Article 21.</li>' +
          '</ul>';
      } else if (q.includes('property') || q.includes('land') || q.includes('deed') || q.includes('registry') || q.includes('mutation') || q.includes('tenant') || q.includes('lease') || q.includes('rent')) {
        domain = 'PROPERTY & REAL ESTATE LAW';
        guidance = '<p><strong>Property Legal Principles:</strong> Governed by the Transfer of Property Act, 1882, the Registration Act, 1908, and state land revenue codes.</p>' +
          '<ul>' +
            '<li><strong>Title & Conveyance:</strong> Transfers of immovable property exceeding Rs. 100 require registered instruments stamped as per state schedules.</li>' +
            '<li><strong>Due Diligence:</strong> Examination of prior title deeds for 30 years, encumbrance certificates, and municipal revenue mutations are foundational.</li>' +
          '</ul>';
      } else if (q.includes('contract') || q.includes('agreement') || q.includes('business') || q.includes('company') || q.includes('partnership') || q.includes('msme') || q.includes('debt') || q.includes('cheque')) {
        domain = 'CORPORATE & COMMERCIAL LAW';
        guidance = '<p><strong>Commercial Legal Principles:</strong> Commercial transactions are governed by the Indian Contract Act, 1872, Companies Act, 2013, and specialized debt recovery statutes.</p>' +
          '<ul>' +
            '<li><strong>Contractual Sanctity:</strong> Agreements formed with free consent, competent parties, and lawful consideration create binding legal rights.</li>' +
            '<li><strong>Enforcement & Dispute Resolution:</strong> Non-performance constitutes breach actionable through recovery suits, summary proceedings, arbitration, or MSME Samadhaan.</li>' +
          '</ul>';
      } else if (q.includes('marriage') || q.includes('divorce') || q.includes('maintenance') || q.includes('custody') || q.includes('domestic') || q.includes('family')) {
        domain = 'FAMILY & MATRIMONIAL LAW';
        guidance = '<p><strong>Family Law Principles:</strong> Matrimonial, succession, and custody matters in India are governed by personal laws (Hindu Marriage Act, Special Marriage Act) and protective civil statutes (PWDVA).</p>' +
          '<ul>' +
            '<li><strong>Equitable Protection:</strong> Courts safeguard dependent spouses and children through maintenance provisions (Sec 125 CrPC / Sec 24/25 HMA).</li>' +
            '<li><strong>Welfare of Minors:</strong> Child custody decisions strictly evaluate the paramount emotional, educational, and physical welfare of the child.</li>' +
          '</ul>';
      } else if (q.includes('consumer') || q.includes('defective') || q.includes('refund') || q.includes('service') || q.includes('product')) {
        domain = 'CONSUMER PROTECTION LAW';
        guidance = '<p><strong>Consumer Protection Principles:</strong> Governed by the Consumer Protection Act, 2019.</p>' +
          '<ul>' +
            '<li><strong>Remedies:</strong> Consumers subjected to deficiency in services, product liability, or deceptive trade practices can seek compensation, repairs, or refunds through quasi-judicial Consumer Commissions.</li>' +
          '</ul>';
      } else {
        domain = 'CIVIL & CONSTITUTIONAL JURISPRUDENCE';
        guidance = '<p><strong>Judicial Principles:</strong> In Indian civil and constitutional practice, legal rights are asserted through civil plaints under the Code of Civil Procedure or extraordinary writ petitions under Article 226/32 of the Constitution.</p>' +
          '<ul>' +
            '<li><strong>Judicial Review:</strong> Courts examine procedural compliance, statutory vires, and fundamental rights protections to ensure justice according to law.</li>' +
          '</ul>';
      }

      return `<span class="pj-law-tag">${domain} • INFORMATIONAL OVERVIEW</span>` +
        `<p><strong>Legal Description:</strong> Regarding your inquiry concerning this legal subject:</p>` +
        guidance +
        '<p>For a detailed analysis of applicable statutory sections, procedural limitation timelines, and evidence required for your specific circumstances, we welcome you to book a consultation with our advocates.</p>' +
        '<span class="pj-law-disclaimer">Informational & educational description only under Bar Council guidelines; does not constitute legal advice.</span>';
    }

    // -------------------------------------------------------------------------
    // MASTER INQUIRY ROUTER
    // -------------------------------------------------------------------------
    function getBotResponse(rawInput) {
      const q = rawInput.toLowerCase().trim();

      // 1. Strict Sensitivity Guardrails (unlawful actions, crises, outcome guarantees)
      const sensitivityResponse = checkSensitivityGuardrails(q);
      if (sensitivityResponse) return sensitivityResponse;

      // 2. Encyclopedic Legal Repository (100+ Topics across Indian & General Law)
      const legalResponse = getLegalKnowledgeResponse(q);
      if (legalResponse) return legalResponse;

      // 3. Chamber & Firm Knowledge Base (practices, contact, address, internships)
      const firmResponse = getFirmResponse(q);
      if (firmResponse) return firmResponse;

      // 4. Dynamic Semantic Legal Concept Synthesizer
      const synthesizedResponse = synthesizeLegalConcept(q);
      if (synthesizedResponse) return synthesizedResponse;

      // 5. Courteous General Fallback
      return '<span class="pj-law-tag">PEOPLEJURIS • LEGAL INFORMATION ASSISTANT</span>' +
        '<p><strong>Welcome to PeopleJuris Help:</strong> I am specialized in providing objective information and descriptions regarding Indian legal concepts, statutory provisions (such as the BNS/BNSS criminal codes, CPC civil suits, Consumer Protection Act, property due diligence, contracts, and IPR), and PeopleJuris chamber consultations.</p>' +
        '<p>You can ask any legal concept or question, such as:</p>' +
        '<ul>' +
          '<li><em>"What is the difference between regular bail and anticipatory bail?"</em></li>' +
          '<li><em>"How does a Section 138 cheque bounce notice work?"</em></li>' +
          '<li><em>"What are the requirements for an Order 39 injunction?"</em></li>' +
          '<li><em>"How can I verify land title before purchasing property?"</em></li>' +
        '</ul>' +
        '<span class="pj-law-disclaimer">Informational & educational description only. Does not constitute formal legal counsel.</span>';
    }

    // -------------------------------------------------------------------------
    // USER INTERACTION EVENT LISTENERS
    // -------------------------------------------------------------------------
    function sendUserQuery() {
      if (!chatInput) return;
      const text = chatInput.value.trim();
      if (!text) return;

      addMessage(text, 'user');
      chatInput.value = '';

      const typingIndicator = showTypingIndicator();

      setTimeout(function () {
        if (typingIndicator && typingIndicator.parentNode) {
          typingIndicator.parentNode.removeChild(typingIndicator);
        }
        const reply = getBotResponse(text);
        addMessage(reply, 'bot');
      }, 350);
    }

    if (chatSend) {
      chatSend.addEventListener('click', sendUserQuery);
    }

    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendUserQuery();
        }
      });
    }

    quickButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const query = this.getAttribute('data-question');
        if (!query) return;

        addMessage(query, 'user');
        const typingIndicator = showTypingIndicator();

        setTimeout(function () {
          if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
          }
          const reply = getBotResponse(query);
          addMessage(reply, 'bot');
        }, 300);
      });
    });
  }

  /* ==========================================================================
     6. SYNCHRONIZED NEWSLETTER SEARCH, CATEGORY FILTER & PAGINATION PIPELINE
     ========================================================================== */
  async function loadDynamicNewsletters() {
    const archiveList = document.querySelector('.archive-list');
    if (!archiveList) return;

    let customBackend = (localStorage.getItem('pj_backend_url') || '').trim();
    if (customBackend.endsWith('/')) customBackend = customBackend.slice(0, -1);

    let apiBase = '';
    if (customBackend) {
      apiBase = customBackend;
    } else if (window.location.protocol === 'file:') {
      apiBase = 'http://localhost:8000';
    } else if (window.location.port !== '8000' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      apiBase = 'http://localhost:8000';
    }

    try {
      const response = await fetch(apiBase + '/api/newsletters');
      if (response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        if (data.success && Array.isArray(data.newsletters) && data.newsletters.length > 0) {
          archiveList.innerHTML = '';
          data.newsletters.forEach(item => {
            const card = document.createElement('div');
            card.className = 'archive-card';
            card.setAttribute('data-category', (item.category || '').toLowerCase());

            const isLatest = !!item.is_latest;
            const badgeHtml = isLatest ? '<span class="archive-badge"><i class="fas fa-crown" style="margin-right: 4px;"></i> Latest Edition</span>' : '';

            card.innerHTML = `
              <div class="archive-cover">
                <img src="${item.cover_image_path}" alt="${item.title} Cover">
              </div>
              <div class="archive-content">
                ${badgeHtml}
                <h3>${item.title}</h3>
                <p>${item.description || ''}</p>
                <div class="archive-actions">
                  <a href="${item.pdf_path}" target="_blank" rel="noopener noreferrer" class="newsletter-btn newsletter-btn-read">Read PDF</a>
                  <a href="${item.pdf_path}" download class="newsletter-btn newsletter-btn-download">Download</a>
                </div>
              </div>
            `;
            archiveList.appendChild(card);
          });
        }
      }
    } catch (e) {
      // Offline fallback: retains original embedded markup
    }

    // Initialize search, category filtering & pagination
    initNewsletterPipeline();
  }

  function initNewsletterPipeline() {
    const searchInput = document.getElementById('newsletterSearch');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const cards = Array.from(document.querySelectorAll('.archive-card'));
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageNumbersContainer = document.getElementById('pageNumbers');

    if (!cards.length) return;

    let activeFilter = 'all';
    let searchQuery = '';
    let currentPage = 1;
    const cardsPerPage = 6;

    function applyFilters() {
      // Filter list of cards matching both active category and search text
      const matchingCards = cards.filter(function (card) {
        const categories = (card.getAttribute('data-category') || '').toLowerCase().split(' ');
        const cardText = card.textContent.toLowerCase();

        const matchesCategory = activeFilter === 'all' || categories.includes(activeFilter);
        const matchesSearch = !searchQuery || cardText.includes(searchQuery);

        return matchesCategory && matchesSearch;
      });

      // Calculate pagination
      const totalPages = Math.max(1, Math.ceil(matchingCards.length / cardsPerPage));
      if (currentPage > totalPages) currentPage = totalPages;

      // Hide all cards first
      cards.forEach(card => card.style.display = 'none');

      // Reveal cards on current page
      const startIndex = (currentPage - 1) * cardsPerPage;
      const endIndex = startIndex + cardsPerPage;
      const visibleSet = matchingCards.slice(startIndex, endIndex);

      visibleSet.forEach(function (card) {
        card.style.display = 'flex';
      });

      // Render pagination numbers
      if (pageNumbersContainer) {
        pageNumbersContainer.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
          const pageSpan = document.createElement('span');
          pageSpan.className = 'page-number' + (i === currentPage ? ' active' : '');
          pageSpan.textContent = i;
          pageSpan.addEventListener('click', function () {
            currentPage = i;
            applyFilters();
          });
          pageNumbersContainer.appendChild(pageSpan);
        }
      }

      // Update Prev / Next buttons
      if (prevBtn) {
        prevBtn.style.opacity = currentPage === 1 ? '0.4' : '1';
        prevBtn.style.pointerEvents = currentPage === 1 ? 'none' : 'auto';
      }
      if (nextBtn) {
        nextBtn.style.opacity = currentPage === totalPages ? '0.4' : '1';
        nextBtn.style.pointerEvents = currentPage === totalPages ? 'none' : 'auto';
      }
    }

    // Search input event
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchQuery = this.value.toLowerCase().trim();
        currentPage = 1;
        applyFilters();
      });
    }

    // Category button events
    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        activeFilter = this.getAttribute('data-filter') || 'all';
        currentPage = 1;
        applyFilters();
      });
    });

    // Pagination button clicks
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (currentPage > 1) {
          currentPage--;
          applyFilters();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        currentPage++;
        applyFilters();
      });
    }

    // Initial render
    applyFilters();
  }

  /* ==========================================================================
     7. ACCESSIBLE SERVICE DETAIL MODAL (ELIMINATES DEAD LINKS)
     ========================================================================== */
  function initServiceModals() {
    const triggers = document.querySelectorAll('.service-modal-trigger, .service-card a');
    if (!triggers.length) return;

    // Create Modal DOM dynamically if not already present
    let modalBackdrop = document.querySelector('.service-modal-backdrop');
    if (!modalBackdrop) {
      modalBackdrop = document.createElement('div');
      modalBackdrop.className = 'service-modal-backdrop';
      modalBackdrop.setAttribute('role', 'dialog');
      modalBackdrop.setAttribute('aria-modal', 'true');
      modalBackdrop.setAttribute('aria-hidden', 'true');

      modalBackdrop.innerHTML = `
        <div class="service-modal-card">
          <button class="service-modal-close" aria-label="Close service details">✕</button>
          <h3 id="modalServiceTitle">Service Details</h3>
          <p id="modalServiceDesc"></p>
          <ul id="modalServiceList"></ul>
          <div class="service-modal-actions">
            <a href="consultation.html" class="btn-primary">Book Consultation</a>
            <button class="btn-secondary service-modal-dismiss">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modalBackdrop);
    }

    const modalTitle = document.getElementById('modalServiceTitle');
    const modalDesc = document.getElementById('modalServiceDesc');
    const modalList = document.getElementById('modalServiceList');
    const closeBtn = modalBackdrop.querySelector('.service-modal-close');
    const dismissBtn = modalBackdrop.querySelector('.service-modal-dismiss');

    function closeModal() {
      modalBackdrop.classList.remove('active');
      modalBackdrop.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    function openModalForCard(card) {
      if (!card) return;
      const title = card.querySelector('h4')?.textContent || 'Legal Service';
      const desc = card.querySelector('p')?.textContent || '';
      const listItems = Array.from(card.querySelectorAll('ul li')).map(li => li.textContent);

      if (modalTitle) modalTitle.textContent = title;
      if (modalDesc) modalDesc.textContent = desc;
      if (modalList) {
        modalList.innerHTML = '';
        listItems.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          modalList.appendChild(li);
        });
      }

      modalBackdrop.classList.add('active');
      modalBackdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        const card = this.closest('.service-card');
        openModalForCard(card);
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (dismissBtn) dismissBtn.addEventListener('click', closeModal);

    modalBackdrop.addEventListener('click', function (e) {
      if (e.target === modalBackdrop) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalBackdrop.classList.contains('active')) {
        closeModal();
      }
    });
  }

  /* ==========================================================================
     8. FILE UPLOAD DRAG-AND-DROP PREVIEWS & CLIENT VALIDATION
     ========================================================================== */
  function initFileUploads() {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(function (input) {
      const container = input.closest('.form-group');
      if (!container) return;

      input.addEventListener('change', function () {
        const files = Array.from(this.files);
        if (!files.length) return;

        let previewText = container.querySelector('.file-preview-badge');
        if (!previewText) {
          previewText = document.createElement('div');
          previewText.className = 'file-preview-badge';
          previewText.style.cssText = 'margin-top: 8px; font-size: 0.88rem; color: var(--pj-gold-300); font-weight: 600; display: flex; align-items: center; gap: 6px;';
          container.appendChild(previewText);
        }

        const totalMB = files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);
        if (totalMB > 10) {
          previewText.style.color = '#ef4444';
          previewText.textContent = `⚠ Selected files total ${totalMB.toFixed(1)}MB. FormSubmit limit is 10MB. Please attach smaller files.`;
        } else {
          previewText.style.color = 'var(--pj-gold-300)';
          previewText.textContent = `📎 Attached: ${files.map(f => f.name).join(', ')} (${totalMB.toFixed(2)} MB)`;
        }
      });
    });
  }

  /* ==========================================================================
     DOM READY INITIALIZATION
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    initNavbar();
    init3DTilt();
    initScrollReveal();
    initDisclaimer();
    initChatbot();
    loadDynamicNewsletters();
    initServiceModals();
    initFileUploads();
  });
})();
