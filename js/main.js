(function () {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const languageSelect = document.getElementById("languageSelect");
  const contactEmailTrigger = document.getElementById("contactEmailTrigger");
  const emailModal = document.getElementById("emailModal");
  const emailModalPanel = emailModal?.querySelector(".email-modal__panel");
  const emailCloseButtons = document.querySelectorAll("[data-email-close]");
  const copyEmailButton = document.getElementById("copyEmailButton");
  const copyEmailStatus = document.getElementById("copyEmailStatus");
  const contactEmailAddress = document.getElementById("contactEmailAddress");

  /* Theme toggle */
  const applyTheme = (theme, animate) => {
    root.setAttribute("data-theme", theme);
    localStorage.setItem("cc-theme", theme);

    if (themeToggle) {
      const isLight = theme === "light";
      themeToggle.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
      themeToggle.setAttribute("aria-pressed", String(isLight));

      if (animate) {
        themeToggle.classList.add("is-animating");
        window.setTimeout(() => themeToggle.classList.remove("is-animating"), 650);
      }
    }
  };

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next, true);
    });
  }

  applyTheme(root.getAttribute("data-theme") || "dark", false);

  /* Mobile navigation menu */
  const navToggle = document.getElementById("navToggle");
  const primaryNav = document.getElementById("primaryNav");
  const siteHeader = document.querySelector(".site-header");

  if (navToggle && primaryNav && siteHeader) {
    const setMenu = (open) => {
      siteHeader.classList.toggle("is-menu-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    navToggle.addEventListener("click", () => {
      setMenu(!siteHeader.classList.contains("is-menu-open"));
    });

    primaryNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && siteHeader.classList.contains("is-menu-open")) {
        setMenu(false);
      }
    });

    document.addEventListener("click", (event) => {
      if (
        siteHeader.classList.contains("is-menu-open") &&
        !primaryNav.contains(event.target) &&
        !navToggle.contains(event.target)
      ) {
        setMenu(false);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 980 && siteHeader.classList.contains("is-menu-open")) {
        setMenu(false);
      }
      if (window.ScrollTrigger) {
        window.ScrollTrigger.refresh();
      }
    });
  }

  /* Contact email popup */
  let lastModalFocus = null;
  let contactAudioCtx = null;

  const playNinjaGrunt = () => {
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;

      contactAudioCtx = contactAudioCtx || new AudioCtor();
      const ctx = contactAudioCtx;
      const t = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, t);
      master.gain.exponentialRampToValueAtTime(0.13, t + 0.018);
      master.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      master.connect(ctx.destination);

      const syllable = (start, from, to, duration, gainValue) => {
        const osc = ctx.createOscillator();
        const formant = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(from, start);
        osc.frequency.exponentialRampToValueAtTime(to, start + duration);
        formant.type = "bandpass";
        formant.frequency.setValueAtTime(from * 3.2, start);
        formant.Q.setValueAtTime(5.5, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(formant).connect(gain).connect(master);
        osc.start(start);
        osc.stop(start + duration + 0.03);
      };

      syllable(t, 520, 880, 0.11, 0.045);
      syllable(t + 0.1, 740, 260, 0.22, 0.07);

      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.22), ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }

      const noise = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(950, t + 0.06);
      filter.frequency.exponentialRampToValueAtTime(420, t + 0.25);
      filter.Q.setValueAtTime(2.2, t);
      noise.buffer = noiseBuffer;
      noise.connect(filter).connect(master);
      noise.start(t + 0.05);
      noise.stop(t + 0.3);
    } catch (error) {
      console.warn("Copy grunt unavailable", error);
    }
  };

  const openEmailModal = () => {
    if (!emailModal) return;
    lastModalFocus = document.activeElement;
    emailModal.classList.add("is-open");
    emailModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-email-modal-open");
    window.setTimeout(() => copyEmailButton?.focus(), 80);
  };

  const closeEmailModal = () => {
    if (!emailModal) return;
    emailModal.classList.remove("is-open");
    emailModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-email-modal-open");
    if (copyEmailStatus) copyEmailStatus.textContent = getEmailTranslation("idle");
    if (lastModalFocus instanceof HTMLElement) lastModalFocus.focus();
  };

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  contactEmailTrigger?.addEventListener("click", openEmailModal);

  emailCloseButtons.forEach((button) => {
    button.addEventListener("click", closeEmailModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && emailModal?.classList.contains("is-open")) {
      closeEmailModal();
    }
  });

  emailModalPanel?.addEventListener("click", (event) => event.stopPropagation());

  copyEmailButton?.addEventListener("click", async () => {
    const email = contactEmailAddress?.textContent?.trim() || "khaiacr27@gmail.com";
    try {
      await copyText(email);
      playNinjaGrunt();
      copyEmailButton.classList.remove("is-copied");
      void copyEmailButton.offsetWidth;
      copyEmailButton.classList.add("is-copied");
      if (copyEmailStatus) copyEmailStatus.textContent = getEmailTranslation("copied");
      window.setTimeout(() => copyEmailButton.classList.remove("is-copied"), 650);
    } catch (error) {
      if (copyEmailStatus) copyEmailStatus.textContent = getEmailTranslation("failed");
      console.warn("Email copy failed", error);
    }
  });

  /* Language selector */
  const languages = {
    en: {
      dir: "ltr",
      navWork: "Work",
      navProcess: "Process",
      navServices: "Services",
      navContact: "Get in touch",
      eyebrow: "Shopify · Online Store 2.0",
      heroTitle: "Storefront design that feels <em>precision-built</em>",
      heroLead: "Cross Creative delivers landing pages and multi-page Shopify builds — clear layouts, easy navigation, and careful desktop and mobile checks.",
      projectBtn: "View featured project",
      fiverrBtn: "Fiverr profile",
      glanceLabel: "At a glance",
      stat1Title: "Shopify pages",
      stat1Text: "Landing pages, sections, and storefront layouts",
      stat2Title: "Checked on desktop and phone",
      stat2Text: "Layouts reviewed before handoff",
      stat3Title: "No guesswork",
      stat3Text: "Scope, timeline, and price agreed before build",
      workKicker: "Featured work",
      workTitle: "Broken Hearts LDN",
      workCopy: "Clothing storefront — structure, responsive layout, and UI polish using Online Store 2.0 themes. Built for clear navigation and straightforward updates in the theme editor.",
      workCard1Title: "Shopify storefront",
      workCard1Text: "Top page section, product story blocks, navigation, and mobile layout refinements.",
      workCard2Title: "Theme editor ready",
      workCard2Text: "Structured sections, consistent typography, and layouts you can update without code for routine edits.",
      workCard3Title: "Client review",
      workCard3Text: "“Working with Khai has been phenomenal. His focus and attention to detail makes it so easy to work with.”",
      processKicker: "How I work",
      heroLine1: "I listen <em>first</em>",
      heroLine2: "I design with <em>purpose</em>",
      heroLine3: "I build for <em>Shopify</em>",
      heroLine4: "I deliver <em>first time</em>",
      processIntro: "Every project follows a deliberate process — from brief to launch — so the final storefront feels considered, premium, and easy to maintain.",
      stepDiscover: "Discover",
      stepResearch: "Research",
      stepStructure: "Structure",
      stepDesign: "Design",
      stepBuild: "Build",
      stepRefine: "Refine",
      stepLaunch: "Launch",
      servicesKicker: "Here's What I Build",
      servicesTitle: "Landing Pages, Storefronts & Multi-Page Shopify Builds",
      servicesCopy: "Predictable timelines, premium polish, and scope you can understand before we start.",
      service1Title: "Landing pages",
      service1Text: "A focused Shopify page with a clear top section, proof, FAQs, and call-to-action blocks tuned to your offer.",
      service2Title: "Storefront builds",
      service2Text: "Multi-page storefront experiences with shared header/footer and a consistent design system.",
      service3Title: "Launch-ready polish",
      service3Text: "Cross-device pass, spacing and type rhythm, and handoff you can maintain in Shopify.",
      contactKicker: "Contact",
      contactTitle: "Bring your vision to life",
      contactCopy: "Scope. Create. Launch. Tell me about your project and let's build something that feels top-tier.",
      outroTitle: "Precision execution, <em>first time… every time</em>",
      outroCopy: "Intentional process. Premium result. Built to last in Shopify.",
    },
    es: {
      dir: "ltr",
      navWork: "Trabajos",
      navProcess: "Proceso",
      navServices: "Servicios",
      navContact: "Contacto",
      eyebrow: "Shopify · Online Store 2.0",
      heroTitle: "Diseño de tiendas con sensación de <em>precisión</em>",
      heroLead: "Cross Creative crea landing pages y tiendas Shopify multipágina: estructura, UX y ajuste responsive con detalle en cada paso.",
      projectBtn: "Ver proyecto destacado",
      fiverrBtn: "Perfil de Fiverr",
      glanceLabel: "Resumen",
      stat1Title: "Páginas Shopify",
      stat1Text: "Landing pages, secciones y layouts de tienda",
      stat2Title: "Probado en varios dispositivos",
      stat2Text: "Layouts revisados en escritorio y móvil",
      stat3Title: "Sin suposiciones",
      stat3Text: "Alcance, plazo y precio acordados antes de construir",
      workKicker: "Trabajo destacado",
      workTitle: "Broken Hearts LDN",
      workCopy: "Tienda de ropa: estructura, layout responsive y pulido visual con temas Online Store 2.0. Creada para navegación clara y actualizaciones sencillas.",
      workCard1Title: "Tienda Shopify",
      workCard1Text: "Sección superior, bloques de producto, navegación y mejoras móviles.",
      workCard2Title: "Lista para el editor",
      workCard2Text: "Secciones claras, tipografía consistente y layouts que puedes mantener sin depender de un desarrollador.",
      workCard3Title: "Opinión del cliente",
      workCard3Text: "“Trabajar con Khai ha sido fenomenal. Su enfoque y atención al detalle hacen que sea muy fácil trabajar con él.”",
      processKicker: "Cómo trabajo",
      heroLine1: "Escucho <em>primero</em>",
      heroLine2: "Diseño con <em>propósito</em>",
      heroLine3: "Construyo para <em>Shopify</em>",
      heroLine4: "Entrego <em>bien desde la primera vez</em>",
      processIntro: "Cada proyecto sigue un proceso claro, desde el brief hasta el lanzamiento, para que la tienda final se sienta cuidada, premium y fácil de mantener.",
      stepDiscover: "Descubrir",
      stepResearch: "Investigar",
      stepStructure: "Estructura",
      stepDesign: "Diseño",
      stepBuild: "Construcción",
      stepRefine: "Pulido",
      stepLaunch: "Lanzamiento",
      servicesKicker: "Lo que construyo",
      servicesTitle: "Landing pages, tiendas y builds Shopify multipágina",
      servicesCopy: "Plazos claros, acabado premium y un alcance que entiendes antes de empezar.",
      service1Title: "Landing pages",
      service1Text: "Una página OS 2.0 de alto impacto: hero, prueba, FAQs y llamadas a la acción adaptadas a tu oferta.",
      service2Title: "Tiendas multipágina",
      service2Text: "Experiencias multipágina con cabecera, pie y sistema visual consistentes.",
      service3Title: "Pulido listo para lanzar",
      service3Text: "Revisión en dispositivos, ritmo visual y entrega que puedes mantener en Shopify.",
      contactKicker: "Contacto",
      contactTitle: "Da vida a tu visión",
      contactCopy: "Definir. Crear. Lanzar. Cuéntame tu proyecto y construyamos algo de nivel.",
      outroTitle: "Ejecución precisa, <em>bien a la primera… siempre</em>",
      outroCopy: "Proceso intencional. Resultado premium. Hecho para durar en Shopify.",
    },
    "zh-Hans": {
      dir: "ltr",
      navWork: "作品",
      navProcess: "流程",
      navServices: "服务",
      navContact: "联系",
      eyebrow: "Shopify · Online Store 2.0",
      heroTitle: "精准打造的 <em>Shopify 店面设计</em>",
      heroLead: "Cross Creative 提供落地页和多页面 Shopify 搭建：布局、用户体验和响应式细节都经过认真打磨。",
      projectBtn: "查看精选项目",
      fiverrBtn: "Fiverr 主页",
      glanceLabel: "概览",
      stat1Title: "Shopify 页面",
      stat1Text: "落地页、区块和店面布局",
      stat2Title: "多设备检查",
      stat2Text: "桌面端和手机端布局都会检查",
      stat3Title: "清晰无猜测",
      stat3Text: "开工前确认范围、时间和价格",
      workKicker: "精选作品",
      workTitle: "Broken Hearts LDN",
      workCopy: "服装店面：使用 Online Store 2.0 主题完成结构、响应式布局和界面打磨，便于导航和后续编辑。",
      workCard1Title: "Shopify 店面",
      workCard1Text: "首屏、产品叙事区块、导航和移动端优化，动效保持克制。",
      workCard2Title: "可在主题编辑器维护",
      workCard2Text: "结构化区块、统一排版和无需依赖开发者也能维护的布局。",
      workCard3Title: "客户评价",
      workCard3Text: "“与 Khai 合作非常出色。他专注且注重细节，让合作变得非常轻松。”",
      processKicker: "工作方式",
      heroLine1: "我先<em>倾听</em>",
      heroLine2: "我带着<em>目的</em>设计",
      heroLine3: "我为 <em>Shopify</em> 构建",
      heroLine4: "我力求<em>一次到位</em>",
      processIntro: "每个项目都有清晰流程，从需求到上线，让最终店面更精致、更专业，也更容易维护。",
      stepDiscover: "了解",
      stepResearch: "研究",
      stepStructure: "结构",
      stepDesign: "设计",
      stepBuild: "构建",
      stepRefine: "优化",
      stepLaunch: "上线",
      servicesKicker: "我能构建",
      servicesTitle: "落地页、店面和多页面 Shopify 项目",
      servicesCopy: "明确时间、精致完成度，以及开工前就能理解的项目范围。",
      service1Title: "落地页",
      service1Text: "高影响力 OS 2.0 单页：首屏、信任内容、FAQ 和行动按钮。",
      service2Title: "多页面店面",
      service2Text: "带统一页眉页脚和设计系统的多页面店面体验。",
      service3Title: "上线前打磨",
      service3Text: "跨设备检查、间距和排版优化，以及可在 Shopify 中维护的交付。",
      contactKicker: "联系",
      contactTitle: "让你的想法落地",
      contactCopy: "确定范围。创建。上线。告诉我你的项目，一起做出高质量成果。",
      outroTitle: "精准执行，<em>一次到位……每一次</em>",
      outroCopy: "用心的流程。高质量的结果。为 Shopify 长期使用而打造。",
    },
    hi: {
      dir: "ltr",
      navWork: "काम",
      navProcess: "प्रक्रिया",
      navServices: "सेवाएँ",
      navContact: "संपर्क करें",
      eyebrow: "Shopify · Online Store 2.0",
      heroTitle: "ऐसा स्टोरफ्रंट डिज़ाइन जो <em>सटीक बना हुआ</em> लगे",
      heroLead: "Cross Creative लैंडिंग पेज और मल्टी-पेज Shopify बिल्ड बनाता है — साफ़ layout, आसान navigation, और desktop/mobile checks के साथ।",
      projectBtn: "प्रमुख प्रोजेक्ट देखें",
      fiverrBtn: "Fiverr प्रोफ़ाइल",
      glanceLabel: "एक नज़र में",
      stat1Title: "Shopify पेज",
      stat1Text: "लैंडिंग पेज, सेक्शन और स्टोरफ्रंट लेआउट",
      stat2Title: "कई डिवाइस पर जाँचा गया",
      stat2Text: "डेस्कटॉप और फ़ोन लेआउट की समीक्षा",
      stat3Title: "कोई अनुमान नहीं",
      stat3Text: "स्कोप, समय और कीमत निर्माण से पहले तय",
      workKicker: "चुनिंदा काम",
      workTitle: "Broken Hearts LDN",
      workCopy: "कपड़ों का स्टोरफ्रंट — Online Store 2.0 थीम के साथ संरचना, responsive layout और UI polish।",
      workCard1Title: "Shopify स्टोरफ्रंट",
      workCard1Text: "Top page section, product story blocks, navigation और mobile layout refinements।",
      workCard2Title: "Theme editor ready",
      workCard2Text: "साफ़ सेक्शन, consistent typography और ऐसे layouts जिन्हें merchant maintain कर सके।",
      workCard3Title: "Client review",
      workCard3Text: "“Khai के साथ काम करना शानदार रहा। उनका focus और attention to detail काम को बहुत आसान बनाता है।”",
      processKicker: "मैं कैसे काम करता हूँ",
      heroLine1: "मैं पहले <em>सुनता हूँ</em>",
      heroLine2: "मैं <em>उद्देश्य</em> के साथ डिज़ाइन करता हूँ",
      heroLine3: "मैं <em>Shopify</em> के लिए बनाता हूँ",
      heroLine4: "मैं <em>पहली बार में सही</em> देने की कोशिश करता हूँ",
      processIntro: "हर प्रोजेक्ट brief से launch तक एक साफ़ प्रक्रिया से चलता है, ताकि final storefront premium और maintain करने में आसान हो।",
      stepDiscover: "समझना",
      stepResearch: "रिसर्च",
      stepStructure: "संरचना",
      stepDesign: "डिज़ाइन",
      stepBuild: "बिल्ड",
      stepRefine: "सुधार",
      stepLaunch: "लॉन्च",
      servicesKicker: "मैं क्या बनाता हूँ",
      servicesTitle: "Landing Pages, Storefronts और Multi-Page Shopify Builds",
      servicesCopy: "स्पष्ट timeline, premium polish और शुरू करने से पहले समझ आने वाला scope।",
      service1Title: "Landing pages",
      service1Text: "एक focused Shopify page — clear top section, proof, FAQs और call-to-action blocks।",
      service2Title: "स्टोरफ्रंट निर्माण",
      service2Text: "Shared header/footer और consistent design system के साथ multi-page storefronts।",
      service3Title: "Launch-ready polish",
      service3Text: "Cross-device pass, spacing, typography rhythm और Shopify में maintainable handoff।",
      contactKicker: "संपर्क",
      contactTitle: "अपनी vision को जीवंत करें",
      contactCopy: "Scope. Create. Launch. अपने project के बारे में बताइए।",
      outroTitle: "सटीक execution, <em>पहली बार में सही… हर बार</em>",
      outroCopy: "सोच-समझकर बनाई गई प्रक्रिया। Premium नतीजा। Shopify में लंबे समय तक चलने के लिए बना।",
    },
    ar: {
      dir: "rtl",
      navWork: "الأعمال",
      navProcess: "العملية",
      navServices: "الخدمات",
      navContact: "تواصل",
      eyebrow: "Shopify · Online Store 2.0",
      heroTitle: "تصميم واجهات متاجر يشعر بأنه <em>مصمم بدقة</em>",
      heroLead: "تقدّم Cross Creative صفحات هبوط ومتاجر Shopify متعددة الصفحات، مع اهتمام بالتخطيط وتجربة المستخدم والتوافق مع الشاشات.",
      projectBtn: "عرض المشروع المميز",
      fiverrBtn: "ملف Fiverr",
      glanceLabel: "نظرة سريعة",
      stat1Title: "صفحات Shopify",
      stat1Text: "صفحات هبوط، أقسام، وتخطيطات للمتجر",
      stat2Title: "اختبار على عدة أجهزة",
      stat2Text: "مراجعة التخطيط على سطح المكتب والهاتف",
      stat3Title: "بدون غموض",
      stat3Text: "يتم الاتفاق على النطاق والمدة والسعر قبل التنفيذ",
      workKicker: "عمل مميز",
      workTitle: "Broken Hearts LDN",
      workCopy: "واجهة متجر ملابس: بنية واضحة، تخطيط متجاوب، وصقل بصري باستخدام Online Store 2.0.",
      workCard1Title: "واجهة Shopify",
      workCard1Text: "قسم رئيسي، أقسام لعرض المنتجات، تنقل، وتحسينات للهاتف بحركة هادئة.",
      workCard2Title: "جاهز لمحرر القالب",
      workCard2Text: "أقسام منظمة وتناسق في الخطوط وتخطيطات يمكن للمالك تعديلها بسهولة.",
      workCard3Title: "رأي العميل",
      workCard3Text: "“كان العمل مع Khai ممتازًا. تركيزه واهتمامه بالتفاصيل يجعلان التعاون سهلاً.”",
      processKicker: "طريقة العمل",
      heroLine1: "أستمع <em>أولاً</em>",
      heroLine2: "أصمم <em>بهدف</em>",
      heroLine3: "أبني من أجل <em>Shopify</em>",
      heroLine4: "أسلّم <em>بجودة من المرة الأولى</em>",
      processIntro: "يتبع كل مشروع عملية واضحة من الملخص إلى الإطلاق حتى تكون الواجهة مدروسة واحترافية وسهلة الصيانة.",
      stepDiscover: "اكتشاف",
      stepResearch: "بحث",
      stepStructure: "هيكلة",
      stepDesign: "تصميم",
      stepBuild: "بناء",
      stepRefine: "تحسين",
      stepLaunch: "إطلاق",
      servicesKicker: "ما أقوم ببنائه",
      servicesTitle: "صفحات هبوط ومتاجر Shopify متعددة الصفحات",
      servicesCopy: "مواعيد واضحة، صقل احترافي، ونطاق مفهوم قبل البدء.",
      service1Title: "صفحات هبوط",
      service1Text: "صفحة OS 2.0 مؤثرة تشمل القسم الرئيسي، الإثبات، الأسئلة الشائعة، وأزرار الدعوة للإجراء.",
      service2Title: "واجهات متاجر",
      service2Text: "تجارب متعددة الصفحات مع رأس وتذييل ونظام تصميم موحد.",
      service3Title: "صقل جاهز للإطلاق",
      service3Text: "فحص عبر الأجهزة، ضبط المسافات والخطوط، وتسليم قابل للصيانة في Shopify.",
      contactKicker: "تواصل",
      contactTitle: "حوّل رؤيتك إلى واقع",
      contactCopy: "نحدد النطاق. ننشئ. نطلق. أخبرني عن مشروعك.",
      outroTitle: "تنفيذ دقيق، <em>بإتقان من المرة الأولى… وكل مرة</em>",
      outroCopy: "عملية مدروسة. نتيجة احترافية. مصمم ليدوم في Shopify.",
    },
    fr: {
      dir: "ltr",
      navWork: "Projets",
      navProcess: "Processus",
      navServices: "Services",
      navContact: "Contact",
      eyebrow: "Shopify · Online Store 2.0",
      heroTitle: "Un design de boutique qui semble <em>construit avec précision</em>",
      heroLead: "Cross Creative crée des landing pages et des boutiques Shopify multipages : structure, UX et finition responsive à chaque étape.",
      projectBtn: "Voir le projet phare",
      fiverrBtn: "Profil Fiverr",
      glanceLabel: "En bref",
      stat1Title: "Pages Shopify",
      stat1Text: "Landing pages, sections et mises en page de boutique",
      stat2Title: "Testé sur plusieurs appareils",
      stat2Text: "Mises en page desktop et mobile vérifiées",
      stat3Title: "Sans approximation",
      stat3Text: "Périmètre, délai et prix validés avant le build",
      workKicker: "Projet phare",
      workTitle: "Broken Hearts LDN",
      workCopy: "Boutique mode : structure, mise en page responsive et finition UI avec les thèmes Online Store 2.0.",
      workCard1Title: "Boutique Shopify",
      workCard1Text: "Section d’ouverture, blocs produit, navigation et ajustements mobile.",
      workCard2Title: "Prêt pour l’éditeur",
      workCard2Text: "Sections structurées, typographie cohérente et mises en page faciles à maintenir.",
      workCard3Title: "Avis client",
      workCard3Text: "« Travailler avec Khai a été exceptionnel. Son attention au détail rend la collaboration très simple. »",
      processKicker: "Ma méthode",
      heroLine1: "J’écoute <em>d’abord</em>",
      heroLine2: "Je conçois avec <em>intention</em>",
      heroLine3: "Je construis pour <em>Shopify</em>",
      heroLine4: "Je livre <em>juste dès la première fois</em>",
      processIntro: "Chaque projet suit un processus clair, du brief au lancement, pour un résultat premium et facile à maintenir.",
      stepDiscover: "Découverte",
      stepResearch: "Recherche",
      stepStructure: "Structure",
      stepDesign: "Design",
      stepBuild: "Build",
      stepRefine: "Finition",
      stepLaunch: "Lancement",
      servicesKicker: "Ce que je construis",
      servicesTitle: "Landing pages, boutiques et builds Shopify multipages",
      servicesCopy: "Délais prévisibles, finition premium et périmètre clair avant le départ.",
      service1Title: "Landing pages",
      service1Text: "Une page OS 2.0 à fort impact : hero, preuves, FAQ et blocs CTA adaptés à votre offre.",
      service2Title: "Vitrines complètes",
      service2Text: "Expériences multipages avec header/footer communs et système visuel cohérent.",
      service3Title: "Finition prête au lancement",
      service3Text: "Vérification multi-appareils, rythme typographique et livraison maintenable dans Shopify.",
      contactKicker: "Contact",
      contactTitle: "Donnez vie à votre vision",
      contactCopy: "Cadrer. Créer. Lancer. Parlez-moi de votre projet.",
      outroTitle: "Exécution précise, <em>juste du premier coup… à chaque fois</em>",
      outroCopy: "Processus intentionnel. Résultat premium. Conçu pour durer dans Shopify.",
    },
  };

  Object.assign(languages, {
    cy: {
      dir: "ltr",
      navWork: "Gwaith",
      navProcess: "Proses",
      navServices: "Gwasanaethau",
      navContact: "Cysylltu",
      eyebrow: "Shopify · Online Store 2.0",
      heroTitle: "Dylunio siop Shopify sy’n teimlo wedi’i <em>adeiladu’n fanwl</em>",
      heroLead: "Mae Cross Creative yn creu tudalennau glanio a siopau Shopify aml-dudalen: cynlluniau clir, llywio hawdd, a gwiriadau gofalus ar gyfrifiadur a ffôn.",
      projectBtn: "Gweld y prosiect dan sylw",
      fiverrBtn: "Proffil Fiverr",
      glanceLabel: "Cipolwg",
      stat1Title: "Tudalennau Shopify",
      stat1Text: "Tudalennau glanio, adrannau, a chynlluniau siop",
      stat2Title: "Wedi’i wirio ar gyfrifiadur a ffôn",
      stat2Text: "Cynlluniau wedi’u hadolygu cyn trosglwyddo",
      stat3Title: "Dim dyfalu",
      stat3Text: "Cwmpas, amserlen, a phris wedi’u cytuno cyn adeiladu",
      workKicker: "Gwaith dan sylw",
      workTitle: "Broken Hearts LDN",
      workCopy: "Siop ddillad: strwythur, cynllun ymatebol, a sglein UI gan ddefnyddio themâu Online Store 2.0. Wedi’i hadeiladu ar gyfer llywio clir a diweddariadau hawdd yn y golygydd thema.",
      workCard1Title: "Siop Shopify",
      workCard1Text: "Adran uchaf y dudalen, blociau stori cynnyrch, llywio, a mireinio cynllun symudol.",
      workCard2Title: "Yn barod i’r golygydd thema",
      workCard2Text: "Adrannau strwythuredig, teipograffeg gyson, a chynlluniau y gallwch eu diweddaru heb god ar gyfer golygiadau arferol.",
      workCard3Title: "Adolygiad cleient",
      workCard3Text: "“Mae gweithio gyda Khai wedi bod yn wych. Mae ei ffocws a’i sylw i fanylion yn gwneud y gwaith yn hawdd.”",
      processKicker: "Sut rwy’n gweithio",
      heroLine1: "Rwy’n gwrando <em>yn gyntaf</em>",
      heroLine2: "Rwy’n dylunio gyda <em>phwrpas</em>",
      heroLine3: "Rwy’n adeiladu ar gyfer <em>Shopify</em>",
      heroLine4: "Rwy’n cyflwyno <em>yn iawn y tro cyntaf</em>",
      processIntro: "Mae pob prosiect yn dilyn proses glir o’r briff i’r lansiad, fel bod y siop derfynol yn teimlo’n ystyriol, yn broffesiynol, ac yn hawdd i’w chynnal.",
      stepDiscover: "Darganfod",
      stepResearch: "Ymchwilio",
      stepStructure: "Strwythuro",
      stepDesign: "Dylunio",
      stepBuild: "Adeiladu",
      stepRefine: "Mireinio",
      stepLaunch: "Lansio",
      servicesKicker: "Beth rwy’n ei adeiladu",
      servicesTitle: "Tudalennau glanio, siopau, ac adeiladau Shopify aml-dudalen",
      servicesCopy: "Amserlenni clir, gorffeniad premiwm, a chwmpas y gallwch ei ddeall cyn i ni ddechrau.",
      service1Title: "Tudalennau glanio",
      service1Text: "Tudalen Shopify ffocysedig gydag adran uchaf glir, prawf, Cwestiynau Cyffredin, a blociau galw-i-weithredu wedi’u teilwra i’ch cynnig.",
      service2Title: "Adeiladau siopa",
      service2Text: "Profiadau siop aml-dudalen gyda phenyn/troedyn cyson a system ddylunio gyson.",
      service3Title: "Sglein barod i lansio",
      service3Text: "Gwiriad ar draws dyfeisiau, rhythm bylchau a theip, a throsglwyddiad y gallwch ei gynnal yn Shopify.",
      contactKicker: "Cysylltu",
      contactTitle: "Dewch â’ch gweledigaeth yn fyw",
      contactCopy: "Cwmpasu. Creu. Lansio. Dywedwch wrthyf am eich prosiect.",
      outroTitle: "Gweithredu manwl gywir, <em>yn iawn y tro cyntaf… bob tro</em>",
      outroCopy: "Proses fwriadol. Canlyniad premiwm. Wedi’i adeiladu i bara yn Shopify.",
    },
    ga: {
      dir: "ltr",
      navWork: "Obair",
      navProcess: "Próiseas",
      navServices: "Seirbhísí",
      navContact: "Déan teagmháil",
      eyebrow: "Shopify · Online Store 2.0",
      heroTitle: "Dearadh siopa Shopify a bhraitheann <em>tógtha go cruinn</em>",
      heroLead: "Cruthaíonn Cross Creative leathanaigh tuirlingthe agus tógálacha Shopify il-leathanach: leagan amach soiléir, nascleanúint éasca, agus seiceálacha cúramacha ar dheasc agus ar fhón.",
      projectBtn: "Féach ar an tionscadal roghnaithe",
      fiverrBtn: "Próifíl Fiverr",
      glanceLabel: "Sracfhéachaint",
      stat1Title: "Leathanaigh Shopify",
      stat1Text: "Leathanaigh tuirlingthe, rannóga, agus leagan amach siopa",
      stat2Title: "Seiceáilte ar dheasc agus ar fhón",
      stat2Text: "Leagan amach athbhreithnithe roimh aistriú",
      stat3Title: "Gan buille faoi thuairim",
      stat3Text: "Scóip, amlíne, agus praghas aontaithe roimh an tógáil",
      workKicker: "Obair roghnaithe",
      workTitle: "Broken Hearts LDN",
      workCopy: "Siopa éadaí: struchtúr, leagan amach freagrúil, agus snas UI le téamaí Online Store 2.0. Tógtha le haghaidh nascleanúint shoiléir agus nuashonruithe simplí san eagarthóir téama.",
      workCard1Title: "Siopa Shopify",
      workCard1Text: "Barr-rannóg an leathanaigh, bloic scéalaíochta táirge, nascleanúint, agus mionchoigeartuithe soghluaiste.",
      workCard2Title: "Réidh don eagarthóir téama",
      workCard2Text: "Rannóga struchtúrtha, clóghrafaíocht chomhsheasmhach, agus leagan amach is féidir leat a nuashonrú gan chód do ghnáth-athruithe.",
      workCard3Title: "Léirmheas cliaint",
      workCard3Text: "“Bhí obair le Khai thar cionn. Déanann a fhócas agus a aird ar mhionsonraí an comhoibriú éasca.”",
      processKicker: "Conas a oibrím",
      heroLine1: "Éistim <em>ar dtús</em>",
      heroLine2: "Dearaim le <em>cuspóir</em>",
      heroLine3: "Tógaim do <em>Shopify</em>",
      heroLine4: "Seachadaim <em>i gceart an chéad uair</em>",
      processIntro: "Leanann gach tionscadal próiseas soiléir ón mbríf go dtí an seoladh, ionas go mbraitheann an siopa deiridh machnamhach, gairmiúil, agus éasca le cothabháil.",
      stepDiscover: "Fiosrú",
      stepResearch: "Taighde",
      stepStructure: "Struchtúr",
      stepDesign: "Dearadh",
      stepBuild: "Tógáil",
      stepRefine: "Mionchoigeartú",
      stepLaunch: "Seoladh",
      servicesKicker: "Cad a thógaim",
      servicesTitle: "Leathanaigh tuirlingthe, siopaí, agus tógálacha Shopify il-leathanach",
      servicesCopy: "Amlínte soiléire, snas préimhe, agus scóip atá intuigthe sula dtosaímid.",
      service1Title: "Leathanaigh tuirlingthe",
      service1Text: "Leathanach Shopify dírithe le barr-rannóg shoiléir, cruthúnas, CCanna, agus bloic glao-chun-gnímh atá oiriúnaithe do do thairiscint.",
      service2Title: "Tógáil siopaí",
      service2Text: "Eispéiris siopa il-leathanach le ceanntásc/buntásc roinnte agus córas dearaidh comhsheasmhach.",
      service3Title: "Snas réidh don seoladh",
      service3Text: "Seiceáil tras-ghléas, rithim spáis agus cló, agus aistriú is féidir leat a chothabháil i Shopify.",
      contactKicker: "Teagmháil",
      contactTitle: "Tabhair do fhís chun beatha",
      contactCopy: "Scóip. Cruthaigh. Seol. Inis dom faoi do thionscadal.",
      outroTitle: "Forghníomhú beacht, <em>i gceart an chéad uair… gach uair</em>",
      outroCopy: "Próiseas d’aon ghnó. Toradh den scoth. Tógtha le maireachtáil i Shopify.",
    },
    is: {
      dir: "ltr",
      navWork: "Verk",
      navProcess: "Ferli",
      navServices: "Þjónusta",
      navContact: "Hafa samband",
      eyebrow: "Shopify · Online Store 2.0",
      heroTitle: "Shopify verslunarhönnun sem virkar <em>nákvæmlega smíðuð</em>",
      heroLead: "Cross Creative býr til lendingarsíður og fjöl-síðna Shopify verkefni: skýrt skipulag, auðvelt flæði og vandlegar athuganir á tölvu og síma.",
      projectBtn: "Skoða valið verkefni",
      fiverrBtn: "Fiverr prófíll",
      glanceLabel: "Í stuttu máli",
      stat1Title: "Shopify síður",
      stat1Text: "Lendingarsíður, hlutar og verslunarskipulag",
      stat2Title: "Yfirfarið á tölvu og síma",
      stat2Text: "Skipulag skoðað fyrir afhendingu",
      stat3Title: "Engar getgátur",
      stat3Text: "Umfang, tímalína og verð samþykkt áður en smíði hefst",
      workKicker: "Valið verk",
      workTitle: "Broken Hearts LDN",
      workCopy: "Fataverslun: uppbygging, aðlögunarhæft skipulag og UI frágangur með Online Store 2.0 þemum. Smíðað fyrir skýra leiðsögn og einfaldar uppfærslur í þemaritli.",
      workCard1Title: "Shopify verslun",
      workCard1Text: "Efsti hluti síðu, vörusögublokkir, leiðsögn og betrumbætur fyrir farsíma.",
      workCard2Title: "Tilbúið fyrir þemaritil",
      workCard2Text: "Skipulagðir hlutar, samræmd leturfræði og uppsetningar sem þú getur uppfært án kóða fyrir venjulegar breytingar.",
      workCard3Title: "Umsögn viðskiptavinar",
      workCard3Text: "“Að vinna með Khai hefur verið frábært. Einbeiting hans og athygli á smáatriðum gerir samstarfið auðvelt.”",
      processKicker: "Hvernig ég vinn",
      heroLine1: "Ég hlusta <em>fyrst</em>",
      heroLine2: "Ég hanna með <em>tilgangi</em>",
      heroLine3: "Ég smíða fyrir <em>Shopify</em>",
      heroLine4: "Ég afhendi <em>rétt í fyrstu tilraun</em>",
      processIntro: "Hvert verkefni fylgir skýru ferli frá verkefnalýsingu til opnunar, svo endanleg verslun sé yfirveguð, fagleg og auðveld í viðhaldi.",
      stepDiscover: "Greina",
      stepResearch: "Rannsaka",
      stepStructure: "Skipuleggja",
      stepDesign: "Hanna",
      stepBuild: "Smíða",
      stepRefine: "Fínstilla",
      stepLaunch: "Opna",
      servicesKicker: "Það sem ég smíða",
      servicesTitle: "Lendingarsíður, verslanir og fjöl-síðna Shopify verkefni",
      servicesCopy: "Skýrar tímalínur, vandaður frágangur og umfang sem þú skilur áður en við byrjum.",
      service1Title: "Lendingarsíður",
      service1Text: "Markviss Shopify síða með skýrum efsta hluta, sönnun, algengum spurningum og aðgerðarköllum sniðnum að tilboðinu þínu.",
      service2Title: "Verslunarmyndbygging",
      service2Text: "Fjöl-síðna verslunarupplifun með sameiginlegum haus/fæti og samræmdu hönnunarkerfi.",
      service3Title: "Tilbúið til opnunar",
      service3Text: "Yfirferð á mismunandi tækjum, bil og leturflæði, og afhending sem þú getur viðhaldið í Shopify.",
      contactKicker: "Hafa samband",
      contactTitle: "Gerum sýnina þína að veruleika",
      contactCopy: "Skilgreina. Búa til. Opna. Segðu mér frá verkefninu þínu.",
      outroTitle: "Nákvæm framkvæmd, <em>rétt í fyrstu tilraun… í hvert sinn</em>",
      outroCopy: "Markviss ferli. Vönduð útkoma. Smíðað til að endast í Shopify.",
    },
    mt: {
      dir: "ltr",
      navWork: "Xogħol",
      navProcess: "Proċess",
      navServices: "Servizzi",
      navContact: "Ikkuntattja",
      eyebrow: "Shopify · Online Store 2.0",
      heroTitle: "Disinn ta’ storefront Shopify li jidher <em>mibni bi preċiżjoni</em>",
      heroLead: "Cross Creative joħloq landing pages u Shopify builds b’ħafna paġni: layouts ċari, navigazzjoni faċli, u kontrolli bir-reqqa fuq desktop u mobile.",
      projectBtn: "Ara l-proġett magħżul",
      fiverrBtn: "Profil Fiverr",
      glanceLabel: "F’daqqa t’għajn",
      stat1Title: "Paġni Shopify",
      stat1Text: "Landing pages, sezzjonijiet, u layouts tal-ħanut",
      stat2Title: "Iċċekkjat fuq desktop u mobile",
      stat2Text: "Layouts riveduti qabel il-kunsinna",
      stat3Title: "Ebda suppożizzjonijiet",
      stat3Text: "Ambitu, żmien, u prezz miftiehma qabel il-bini",
      workKicker: "Xogħol magħżul",
      workTitle: "Broken Hearts LDN",
      workCopy: "Storefront tal-ħwejjeġ: struttura, layout responsiv, u polish tal-UI b’temi Online Store 2.0. Mibni għal navigazzjoni ċara u aġġornamenti sempliċi fl-editur tat-tema.",
      workCard1Title: "Storefront Shopify",
      workCard1Text: "Sezzjoni ta’ fuq, blokki tal-prodott, navigazzjoni, u titjib tal-layout fuq mobile.",
      workCard2Title: "Lest għall-editur tat-tema",
      workCard2Text: "Sezzjonijiet strutturati, tipografija konsistenti, u layouts li tista’ taġġorna mingħajr kodiċi għal bidliet ta’ rutina.",
      workCard3Title: "Reviżjoni tal-klijent",
      workCard3Text: "“Ix-xogħol ma’ Khai kien eċċellenti. Il-fokus u l-attenzjoni tiegħu għad-dettall jagħmlu l-kollaborazzjoni faċli.”",
      processKicker: "Kif naħdem",
      heroLine1: "Nisma’ <em>l-ewwel</em>",
      heroLine2: "Niddisinja b’<em>għan</em>",
      heroLine3: "Nibni għal <em>Shopify</em>",
      heroLine4: "Inwassal <em>sew mill-ewwel darba</em>",
      processIntro: "Kull proġett isegwi proċess ċar mill-brief sal-launch, biex il-storefront finali jkun maħsub, professjonali, u faċli biex jinżamm.",
      stepDiscover: "Skopri",
      stepResearch: "Riċerka",
      stepStructure: "Struttura",
      stepDesign: "Disinn",
      stepBuild: "Bini",
      stepRefine: "Irfina",
      stepLaunch: "Launch",
      servicesKicker: "Dak li nibni",
      servicesTitle: "Landing pages, storefronts, u Shopify builds b’ħafna paġni",
      servicesCopy: "Żminijiet ċari, polish premium, u ambitu li tifhem qabel nibdew.",
      service1Title: "Landing pages",
      service1Text: "Paġna Shopify iffukata b’sezzjoni ta’ fuq ċara, prova, FAQs, u blokki ta’ call-to-action adattati għall-offerta tiegħek.",
      service2Title: "Bini ta' storefronts",
      service2Text: "Esperjenzi ta’ storefront b’ħafna paġni b’header/footer komuni u sistema ta’ disinn konsistenti.",
      service3Title: "Polish lest għal launch",
      service3Text: "Kontroll fuq apparati differenti, spazjar u tipografija, u handoff li tista’ żżomm f’Shopify.",
      contactKicker: "Kuntatt",
      contactTitle: "Agħti l-ħajja lill-viżjoni tiegħek",
      contactCopy: "Niddefinixxu. Noħolqu. Inniedu. Għidli dwar il-proġett tiegħek.",
      outroTitle: "Eżekuzzjoni preċiża, <em>sew mill-ewwel darba… kull darba</em>",
      outroCopy: "Proċess intenzjonat. Riżultat premium. Mibni biex idum f’Shopify.",
    },
    eu: {
      dir: "ltr",
      navWork: "Lanak",
      navProcess: "Prozesua",
      navServices: "Zerbitzuak",
      navContact: "Jarri harremanetan",
      eyebrow: "Shopify · Online Store 2.0",
      heroTitle: "Zehaztasunez <em>eraikia dirudien</em> Shopify denda-diseinua",
      heroLead: "Cross Creativek landing pageak eta orri anitzeko Shopify proiektuak sortzen ditu: diseinu argiak, nabigazio erraza, eta mahaigaineko zein mugikorreko egiaztapen zainduak.",
      projectBtn: "Ikusi proiektu nabarmena",
      fiverrBtn: "Fiverr profila",
      glanceLabel: "Begirada batean",
      stat1Title: "Shopify orriak",
      stat1Text: "Landing pageak, atalak eta dendaren diseinuak",
      stat2Title: "Mahaigainean eta telefonoan egiaztatua",
      stat2Text: "Diseinuak entrega baino lehen berrikusita",
      stat3Title: "Asmakizunik gabe",
      stat3Text: "Irismena, epea eta prezioa eraiki aurretik adostuta",
      workKicker: "Lan nabarmena",
      workTitle: "Broken Hearts LDN",
      workCopy: "Arropa-denda: egitura, diseinu moldagarria eta UI akabera Online Store 2.0 gaiekin. Nabigazio argirako eta gai-editorean eguneratze errazetarako egina.",
      workCard1Title: "Shopify denda",
      workCard1Text: "Orriaren goiko atala, produktuaren istorio-blokeak, nabigazioa, eta mugikorreko diseinu-doikuntzak.",
      workCard2Title: "Gai-editorearentzat prest",
      workCard2Text: "Atal egituratuak, tipografia koherentea, eta ohiko aldaketetarako koderik gabe egunera ditzakezun diseinuak.",
      workCard3Title: "Bezeroaren iritzia",
      workCard3Text: "“Khairekin lan egitea bikaina izan da. Bere arreta eta xehetasunekiko zaintzak lankidetza errazten dute.”",
      processKicker: "Nola lan egiten dudan",
      heroLine1: "<em>Lehenik</em> entzuten dut",
      heroLine2: "<em>Helburuarekin</em> diseinatzen dut",
      heroLine3: "<em>Shopify</em>rentzat eraikitzen dut",
      heroLine4: "<em>Lehen aldian ondo</em> entregatzen dut",
      processIntro: "Proiektu bakoitzak prozesu argi bat jarraitzen du briefetik abiaraztera, azken denda pentsatua, profesionala eta mantentzeko erraza izan dadin.",
      stepDiscover: "Ezagutu",
      stepResearch: "Ikertu",
      stepStructure: "Egituratu",
      stepDesign: "Diseinatu",
      stepBuild: "Eraiki",
      stepRefine: "Findu",
      stepLaunch: "Abiarazi",
      servicesKicker: "Zer eraikitzen dudan",
      servicesTitle: "Landing pageak, dendak eta orri anitzeko Shopify proiektuak",
      servicesCopy: "Epe argiak, akabera premiuma, eta hasi aurretik ulertzen den irismena.",
      service1Title: "Landing pageak",
      service1Text: "Shopify orri fokalizatua, goiko atal argiarekin, frogekin, FAQekin eta zure eskaintzara egokitutako ekintza-dei blokeekin.",
      service2Title: "Denda-ospeak",
      service2Text: "Orri anitzeko denda-esperientziak goiburu/oina partekatuekin eta diseinu-sistema koherentearekin.",
      service3Title: "Abiarazteko prest dagoen akabera",
      service3Text: "Gailu arteko egiaztapena, tarte eta tipografia erritmoa, eta Shopify-n mantendu dezakezun entrega.",
      contactKicker: "Kontaktua",
      contactTitle: "Ekarri zure ikuspegia bizitzara",
      contactCopy: "Irismena zehaztu. Sortu. Abiarazi. Konta iezadazu zure proiektuaz.",
      outroTitle: "Exekuzio zehatza, <em>lehen aldian ondo… beti</em>",
      outroCopy: "Asmoz egindako prozesua. Emaitza premiuma. Shopify-n irauteko egina.",
    },
  });

  const emailTranslations = {
    en: {
      kicker: "Contact email",
      title: "Ready when you are",
      copy: "Copy the email address, then send over your project details when you're ready.",
      idle: "Tap the ninja to copy.",
      copied: "Copied. Paste it into your email app.",
      failed: "Copy failed. The email is shown above.",
      close: "Close email popup",
      copyLabel: "Copy email address",
    },
    es: {
      kicker: "Correo de contacto",
      title: "Listo cuando tú lo estés",
      copy: "Copia el correo y envía los detalles de tu proyecto cuando estés listo.",
      idle: "Toca el ninja para copiar.",
      copied: "Copiado. Pégalo en tu app de correo.",
      failed: "No se pudo copiar. El correo aparece arriba.",
      close: "Cerrar ventana de correo",
      copyLabel: "Copiar correo electrónico",
    },
    "zh-Hans": {
      kicker: "联系邮箱",
      title: "随时可以开始",
      copy: "复制邮箱地址，准备好后发送你的项目详情。",
      idle: "点击忍者复制。",
      copied: "已复制。请粘贴到你的邮件应用中。",
      failed: "复制失败。邮箱地址显示在上方。",
      close: "关闭邮箱弹窗",
      copyLabel: "复制邮箱地址",
    },
    hi: {
      kicker: "संपर्क ईमेल",
      title: "जब आप तैयार हों",
      copy: "ईमेल पता कॉपी करें, फिर तैयार होने पर अपने प्रोजेक्ट की जानकारी भेजें।",
      idle: "कॉपी करने के लिए निंजा पर टैप करें।",
      copied: "कॉपी हो गया। इसे अपने ईमेल ऐप में पेस्ट करें।",
      failed: "कॉपी नहीं हुआ। ईमेल ऊपर दिख रहा है।",
      close: "ईमेल पॉपअप बंद करें",
      copyLabel: "ईमेल पता कॉपी करें",
    },
    ar: {
      kicker: "البريد الإلكتروني للتواصل",
      title: "جاهز عندما تكون جاهزًا",
      copy: "انسخ عنوان البريد، ثم أرسل تفاصيل مشروعك عندما تكون مستعدًا.",
      idle: "اضغط على النينجا للنسخ.",
      copied: "تم النسخ. الصقه في تطبيق البريد.",
      failed: "فشل النسخ. البريد ظاهر بالأعلى.",
      close: "إغلاق نافذة البريد",
      copyLabel: "نسخ عنوان البريد",
    },
    fr: {
      kicker: "Email de contact",
      title: "Prêt quand vous l’êtes",
      copy: "Copiez l’adresse email, puis envoyez les détails de votre projet quand vous êtes prêt.",
      idle: "Touchez le ninja pour copier.",
      copied: "Copié. Collez-le dans votre application email.",
      failed: "La copie a échoué. L’adresse email est affichée ci-dessus.",
      close: "Fermer la fenêtre email",
      copyLabel: "Copier l’adresse email",
    },
    cy: {
      kicker: "E-bost cyswllt",
      title: "Yn barod pan fyddwch chi",
      copy: "Copïwch y cyfeiriad e-bost, yna anfonwch fanylion eich prosiect pan fyddwch yn barod.",
      idle: "Tapiwch y ninja i gopïo.",
      copied: "Wedi’i gopïo. Gludwch ef yn eich ap e-bost.",
      failed: "Methodd y copi. Mae’r e-bost i’w weld uchod.",
      close: "Cau’r ffenestr e-bost",
      copyLabel: "Copïo cyfeiriad e-bost",
    },
    ga: {
      kicker: "Ríomhphost teagmhála",
      title: "Réidh nuair atá tusa",
      copy: "Cóipeáil an seoladh ríomhphoist, ansin seol sonraí do thionscadail nuair atá tú réidh.",
      idle: "Tapáil an ninja chun cóipeáil.",
      copied: "Cóipeáilte. Greamaigh é i d’aip ríomhphoist.",
      failed: "Theip ar chóipeáil. Tá an ríomhphost le feiceáil thuas.",
      close: "Dún an fhuinneog ríomhphoist",
      copyLabel: "Cóipeáil seoladh ríomhphoist",
    },
    is: {
      kicker: "Netfang",
      title: "Tilbúið þegar þú ert tilbúin(n)",
      copy: "Afritaðu netfangið og sendu síðan upplýsingar um verkefnið þegar þú ert tilbúin(n).",
      idle: "Smelltu á ninja til að afrita.",
      copied: "Afritað. Límdu það í tölvupóstforritið þitt.",
      failed: "Afritun mistókst. Netfangið sést hér fyrir ofan.",
      close: "Loka netfangsglugga",
      copyLabel: "Afrita netfang",
    },
    mt: {
      kicker: "Email ta’ kuntatt",
      title: "Lest meta tkun lest",
      copy: "Ikkopja l-email, imbagħad ibgħat id-dettalji tal-proġett tiegħek meta tkun lest.",
      idle: "Agħfas in-ninja biex tikkopja.",
      copied: "Ikkopjat. Waħħlu fl-app tal-email tiegħek.",
      failed: "Il-kopja falliet. L-email tidher hawn fuq.",
      close: "Agħlaq il-popup tal-email",
      copyLabel: "Ikkopja l-email",
    },
    eu: {
      kicker: "Harremanetarako emaila",
      title: "Prest zaudenean",
      copy: "Kopiatu email helbidea, eta bidali zure proiektuaren xehetasunak prest zaudenean.",
      idle: "Sakatu ninja kopiatzeko.",
      copied: "Kopiatuta. Itsatsi zure email aplikazioan.",
      failed: "Ezin izan da kopiatu. Emaila goian ageri da.",
      close: "Itxi email leihoa",
      copyLabel: "Kopiatu email helbidea",
    },
  };

  const getEmailTranslation = (key) => {
    const code = languageSelect?.value || root.getAttribute("lang") || "en";
    return emailTranslations[code]?.[key] || emailTranslations.en[key];
  };

  const selectors = {
    navWork: '.nav a[data-section="work"]',
    navProcess: '.nav a[data-section="process"]',
    navServices: '.nav a[data-section="services"]',
    navContact: '.nav a[data-section="contact"]',
    eyebrow: ".hero .eyebrow",
    heroTitle: ".hero h1",
    heroLead: ".hero-lead",
    projectBtn: ".hero-actions .btn-primary",
    fiverrBtn: ".hero-actions .btn-ghost",
    glanceLabel: ".hero-card-label",
    stat1Title: ".hero-stats .stat:nth-child(1) strong",
    stat1Text: ".hero-stats .stat:nth-child(1) span",
    stat2Title: ".hero-stats .stat:nth-child(2) strong",
    stat2Text: ".hero-stats .stat:nth-child(2) span",
    stat3Title: ".hero-stats .stat:nth-child(3) strong",
    stat3Text: ".hero-stats .stat:nth-child(3) span",
    workKicker: "#work .section-kicker",
    workTitle: "#work .section-title",
    workCopy: "#work .section-copy",
    workCard1Title: "#work .card:nth-child(1) h3",
    workCard1Text: "#work .card:nth-child(1) p",
    workCard2Title: "#work .card:nth-child(2) h3",
    workCard2Text: "#work .card:nth-child(2) p",
    workCard3Title: "#work .card:nth-child(3) h3",
    workCard3Text: "#work .card:nth-child(3) p",
    processKicker: ".how-work-intro .section-kicker",
    heroLine1: ".how-hero-line:nth-child(1)",
    heroLine2: ".how-hero-line:nth-child(2)",
    heroLine3: ".how-hero-line:nth-child(3)",
    heroLine4: ".how-hero-line:nth-child(4)",
    processIntro: "#process-title",
    stepDiscover: '.how-progress-item[data-step="0"]',
    stepResearch: '.how-progress-item[data-step="1"]',
    stepStructure: '.how-progress-item[data-step="2"]',
    stepDesign: '.how-progress-item[data-step="3"]',
    stepBuild: '.how-progress-item[data-step="4"]',
    stepRefine: '.how-progress-item[data-step="5"]',
    stepLaunch: '.how-progress-item[data-step="6"]',
    servicesKicker: "#services .section-kicker",
    servicesTitle: "#services .section-title",
    servicesCopy: "#services .section-copy",
    service1Title: "#services .card:nth-child(1) h3",
    service1Text: "#services .card:nth-child(1) p",
    service2Title: "#services .card:nth-child(2) h3",
    service2Text: "#services .card:nth-child(2) p",
    service3Title: "#services .card:nth-child(3) h3",
    service3Text: "#services .card:nth-child(3) p",
    contactKicker: "#contact .section-kicker",
    contactTitle: "#contact .section-title",
    contactCopy: "#contact .section-copy",
    outroTitle: ".how-work-outro h3",
    outroCopy: ".how-work-outro p",
  };

  const htmlKeys = new Set([
    "heroTitle",
    "heroLine1",
    "heroLine2",
    "heroLine3",
    "heroLine4",
    "outroTitle",
  ]);

  const applyLanguage = (code) => {
    const dictionary = languages[code] || languages.en;
    root.setAttribute("lang", code);
    root.setAttribute("dir", dictionary.dir || "ltr");
    localStorage.setItem("cc-language", code);

    Object.entries(selectors).forEach(([key, selector]) => {
      const element = document.querySelector(selector);
      const value = dictionary[key] || languages.en[key];
      if (!element || !value) return;
      if (htmlKeys.has(key)) {
        element.innerHTML = value;
      } else {
        element.textContent = value;
      }
    });

    const stepKeys = [
      "stepDiscover",
      "stepResearch",
      "stepStructure",
      "stepDesign",
      "stepBuild",
      "stepRefine",
      "stepLaunch",
    ];

    stepKeys.forEach((key, index) => {
      const label = dictionary[key] || languages.en[key];
      const stepTitle = document.querySelector(`.how-step[data-step="${index}"] .step-title`);
      const progressItem = document.querySelector(`.how-progress-item[data-step="${index}"]`);
      if (stepTitle) stepTitle.textContent = label;
      if (progressItem) progressItem.setAttribute("aria-label", `Go to step ${index + 1}: ${label}`);
    });

    const emailCopy = emailTranslations[code] || emailTranslations.en;
    const emailKicker = emailModal?.querySelector(".section-kicker");
    const emailTitle = document.getElementById("emailModalTitle");
    const emailCopyText = document.getElementById("emailModalCopy");
    const emailClose = emailModal?.querySelector(".email-modal__close");
    if (emailKicker) emailKicker.textContent = emailCopy.kicker;
    if (emailTitle) emailTitle.textContent = emailCopy.title;
    if (emailCopyText) emailCopyText.textContent = emailCopy.copy;
    if (copyEmailStatus) copyEmailStatus.textContent = emailCopy.idle;
    if (emailClose) emailClose.setAttribute("aria-label", emailCopy.close);
    if (copyEmailButton) copyEmailButton.setAttribute("aria-label", emailCopy.copyLabel);
  };

  if (languageSelect) {
    const savedLanguage = localStorage.getItem("cc-language") || "en";
    languageSelect.value = languages[savedLanguage] ? savedLanguage : "en";
    applyLanguage(languageSelect.value);
    languageSelect.addEventListener("change", () => applyLanguage(languageSelect.value));
  }

  const header = document.querySelector(".site-header");
  const heroLines = Array.from(document.querySelectorAll(".how-hero-line"));
  const progressItems = Array.from(document.querySelectorAll(".how-progress-item"));
  const steps = Array.from(document.querySelectorAll(".how-step"));
  const progressFill = document.querySelector(".how-progress-fill");
  const scrollSection = document.querySelector(".how-work-scroll");
  const reveals = document.querySelectorAll(".reveal");
  const floatPetals = document.querySelectorAll("[data-blossom-float]");
  let sceneTime = 0;
  let lenis;
  let processST = null;
  let activeProcessIndex = -1;
  let activeHeroIndex = -1;

  const updateHeroLine = (index) => {
    if (index === activeHeroIndex) return;
    activeHeroIndex = index;
    heroLines.forEach((line, i) => line.classList.toggle("is-active", i === index));
  };

  const updateProcessStep = (index, local = 0.08) => {
    const total = steps.length;
    if (!total) return;

    if (progressFill && total > 1) {
      const fillPct = ((index + Math.max(local, 0.08)) / (total - 1)) * 100;
      progressFill.style.height = `${Math.min(100, fillPct)}%`;
    }

    if (index === activeProcessIndex) return;
    activeProcessIndex = index;

    steps.forEach((step, i) => {
      step.classList.toggle("is-active", i === index);
    });

    progressItems.forEach((item, i) => {
      item.classList.toggle("is-active", i === index);
      item.classList.toggle("is-complete", i < index);
      item.setAttribute("aria-current", i === index ? "step" : "false");
    });
  };

  const goToProcessStep = (index) => {
    if (!scrollSection || !steps.length) return;

    const total = steps.length;
    const target = Math.max(0, Math.min(total - 1, index));

    if (processST) {
      const targetProgress = total > 1 ? target / (total - 1) : 0;
      const scrollTarget = processST.start + (processST.end - processST.start) * targetProgress;

      if (lenis) {
        lenis.scrollTo(scrollTarget, { duration: prefersReduced ? 0 : 0.9 });
      } else {
        window.scrollTo({ top: scrollTarget, behavior: prefersReduced ? "auto" : "smooth" });
      }
    } else {
      const sectionTop = scrollSection.getBoundingClientRect().top + window.scrollY;
      const scrollable = scrollSection.offsetHeight - window.innerHeight;
      const targetProgress = total > 1 ? target / (total - 1) : 0;
      window.scrollTo({
        top: sectionTop + scrollable * targetProgress,
        behavior: prefersReduced ? "auto" : "smooth",
      });
    }

    activeProcessIndex = -1;
    updateProcessStep(target, target / Math.max(steps.length - 1, 1));
  };

  /* Scene animation on scroll */
  const getScrollY = () => {
    if (lenis) {
      if (typeof lenis.scroll === "number") return lenis.scroll;
      if (typeof lenis.animatedScroll === "number") return lenis.animatedScroll;
      if (typeof lenis.actualScroll === "number") return lenis.actualScroll;
    }
    return window.scrollY || document.documentElement.scrollTop || 0;
  };

  const updatePetals = (time) => {
    if (prefersReduced) return;

    const fallSpan = 1150;

    floatPetals.forEach((petal, i) => {
      const ox = parseFloat(petal.dataset.ox || 0);
      const startY = parseFloat(petal.dataset.oy || 0);
      const rot0 = parseFloat(petal.dataset.rot || 0);
      const speed = parseFloat(petal.dataset.speed || 1);
      const depth = parseFloat(petal.dataset.depth || 1);
      const phase = i * 1.37;
      const fallRate = 22 + speed * 20;
      const fall = (time * fallRate + i * 55) % fallSpan;
      const driftX =
        ox +
        Math.sin(time * 0.55 * speed + phase) * (18 + depth * 8) +
        Math.cos(time * 0.32 * speed + phase * 0.7) * 12;
      const driftY = startY + fall;
      const tumble = Math.cos(time * 1.6 * speed + phase);
      const scaleX = depth * (0.78 + tumble * 0.22);
      const scaleY = depth * (0.92 + Math.sin(time * 1.1 * speed + phase) * 0.08);
      const spin = rot0 + time * (18 + speed * 8) + Math.sin(time * 0.85 + phase) * 22;
      const opacity = Math.min(0.92, 0.28 + depth * 0.32 + Math.sin(time * 0.7 + phase) * 0.06);

      petal.setAttribute(
        "transform",
        `translate(${driftX.toFixed(1)} ${driftY.toFixed(1)}) rotate(${spin.toFixed(1)}) scale(${scaleX.toFixed(3)} ${scaleY.toFixed(3)})`
      );
      petal.setAttribute("opacity", opacity.toFixed(2));
    });
  };

  const onHeaderScroll = () => {
    const scrollY = getScrollY();
    header?.classList.toggle("is-scrolled", scrollY > 24);
  };

  window.addEventListener("scroll", onHeaderScroll, { passive: true });
  onHeaderScroll();

  const tickScene = (now) => {
    sceneTime = now * 0.001;
    updatePetals(sceneTime);
    requestAnimationFrame(tickScene);
  };
  requestAnimationFrame(tickScene);

  /* Smooth scroll + motion */
  const hasMotion = !prefersReduced && window.Lenis && window.gsap && window.ScrollTrigger;

  if (!prefersReduced && window.Lenis) {
    const isTouch =
      window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0;

    lenis = new Lenis({
      duration: isTouch ? 0.85 : 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: true,
      touchMultiplier: 1.35,
    });

    lenis.on("scroll", () => {
      onHeaderScroll();
      if (window.ScrollTrigger) ScrollTrigger.update();
    });

    if (hasMotion) {
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }

  if (hasMotion) {
    gsap.registerPlugin(ScrollTrigger);

    reveals.forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 86%",
          toggleActions: "play none none reverse",
        },
      });
    });

    if (scrollSection && steps.length) {
      const total = steps.length;

      processST = ScrollTrigger.create({
        trigger: scrollSection,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const index = Math.min(total - 1, Math.floor(progress * total));
          const local = (progress * total) - index;

          updateProcessStep(index, local);

          if (heroLines.length) {
            const heroIndex = Math.min(heroLines.length - 1, Math.floor(progress * heroLines.length * 1.2));
            updateHeroLine(heroIndex);
          }
        },
      });
    }

    if (lenis) {
      ScrollTrigger.scrollerProxy(document.documentElement, {
        scrollTop(value) {
          if (arguments.length) {
            lenis.scrollTo(value, { immediate: true });
          }
          return lenis.scroll;
        },
        getBoundingClientRect() {
          return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
        },
      });

      ScrollTrigger.addEventListener("refresh", () => lenis.resize());
      ScrollTrigger.refresh();
      window.addEventListener("orientationchange", () => {
        window.setTimeout(() => ScrollTrigger.refresh(), 250);
      });
    }
  } else {
    reveals.forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    if (steps.length) steps[0]?.classList.add("is-active");
    if (progressItems.length) progressItems[0]?.classList.add("is-active");
    if (heroLines.length) heroLines[0]?.classList.add("is-active");
    if (progressFill) progressFill.style.height = "0%";
  }

  /* Progress rail — click or keyboard to jump steps */
  progressItems.forEach((item, index) => {
    item.addEventListener("click", () => goToProcessStep(index));

    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        goToProcessStep(index);
      }
    });
  });

  /* Active nav link */
  const navLinks = document.querySelectorAll(".nav a[data-section]");
  const sections = Array.from(navLinks)
    .map((link) => document.getElementById(link.dataset.section))
    .filter(Boolean);

  const setActiveNav = () => {
    const y = window.scrollY + 120;
    let current = sections[0]?.id;
    sections.forEach((section) => {
      if (section.offsetTop <= y) current = section.id;
    });
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.section === current);
    });
  };

  window.addEventListener("scroll", setActiveNav, { passive: true });
  setActiveNav();
})();
