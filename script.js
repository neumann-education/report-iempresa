/**
 * INSTITUTO DE LA EMPRESA (IEmpresa) - Página de Preguntas Frecuentes
 * Dynamic Google Sheets & Apps Script Integration
 */

// Clave para caché persistente de respaldo
const CACHE_KEY = 'iempresa_live_faqs_v1'

// ============================================================================
// 1. CONFIGURACIÓN DE CONEXIÓN CON GOOGLE APPS SCRIPT
// ============================================================================
const URL_PARAMS = new URLSearchParams(window.location.search)
const APPS_SCRIPT_URL =
  URL_PARAMS.get('api') ||
  window.FAQS_API_URL ||
  'https://script.google.com/macros/s/AKfycbxrW6Lso4_j5CXaLjEgNb4EJXqJAERkvCz9Z_FQv-k9RxvdtocmPBgJczqBNXCJQEZT/exec'

// ============================================================================
// 2. ESTADO GLOBAL DE LA APLICACIÓN
// ============================================================================
let allFaqs = []
let availableOffices = []
let availableCategories = []
let currentCategory = 'all'
let currentOffice = 'all'
let currentSearchQuery = ''
let allExpanded = false

// Mapa para restaurar textos originales en búsquedas con resaltado
const originalQuestionTexts = new Map()

// ============================================================================
// 3. FUNCIONES DE UTILIDAD Y NORMALIZACIÓN
// ============================================================================
function normalizeText(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function slugify(text) {
  return normalizeText(text)
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Convierte texto plano con enlaces, listas y saltos de línea a HTML seguro y legible.
 */
function formatAnswerHtml(rawText) {
  if (!rawText) return ''

  // Si ya contiene etiquetas HTML estructuradas, respetarlas
  if (/<(p|div|ul|ol|table|blockquote)[^>]*>/i.test(rawText)) {
    return rawText
  }

  // Escapar HTML básico de usuario antes de procesar enlaces y saltos
  let text = escapeHtml(rawText)

  // Convertir URLs planas (http/https) en enlaces clicables
  const urlRegex = /(https?:\/\/[^\s<)]+)/gi
  text = text.replace(
    urlRegex,
    '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); word-break: break-all;">$1</a>',
  )

  // Convertir líneas con guión a viñetas
  const lines = text.split('\n')
  let inList = false
  let formatted = ''

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (!inList) {
        formatted += '<ul class="faq-list-styled">'
        inList = true
      }
      formatted += `<li>${trimmed.substring(2)}</li>`
    } else {
      if (inList) {
        formatted += '</ul>'
        inList = false
      }
      if (trimmed === '') {
        formatted += '<br>'
      } else {
        formatted += `<p>${line}</p>`
      }
    }
  })

  if (inList) {
    formatted += '</ul>'
  }

  return formatted
}

/**
 * Retorna icono representativo según categoría
 */
function getCategoryIcon(catName) {
  const norm = normalizeText(catName)
  if (norm.includes('plataforma') || norm.includes('acceso'))
    return 'fa-solid fa-laptop-code'
  if (norm.includes('academ') || norm.includes('evalua'))
    return 'fa-solid fa-book-open'
  if (norm.includes('tramite') || norm.includes('pago'))
    return 'fa-solid fa-file-invoice-dollar'
  if (norm.includes('contacto') || norm.includes('atencion'))
    return 'fa-solid fa-headset'
  return 'fa-solid fa-folder-open'
}

/**
 * Retorna clase CSS de color según categoría
 */
function getCategoryPillClass(catName) {
  const norm = normalizeText(catName)
  if (norm.includes('plataforma')) return 'pill-plat'
  if (norm.includes('academ')) return 'pill-acad'
  if (norm.includes('tramite') || norm.includes('pago')) return 'pill-tram'
  if (norm.includes('contacto') || norm.includes('atencion')) return 'pill-cont'
  return 'pill-plat'
}

/**
 * Retorna clase CSS de color según oficina
 */
function getOfficePillClass(officeName) {
  const slug = slugify(officeName)
  if (slug.includes('ose')) return 'pill-oficina-ose'
  if (slug.includes('cobranza')) return 'pill-oficina-cobranzas'
  if (slug.includes('soporte')) return 'pill-oficina-soporte'
  if (slug.includes('secretaria')) return 'pill-oficina-secretaria'
  if (slug.includes('direccion')) return 'pill-oficina-direccion'
  return 'pill-oficina'
}

// ============================================================================
// 4. RENDERIZADO DINÁMICO DE FILTROS Y TARJETAS
// ============================================================================

/**
 * Renderiza / Actualiza el combo-box de oficinas
 */
function renderOfficeBar(offices) {
  const select = document.getElementById('officeSelect')
  if (!select) return

  let html = `<option value="all" ${currentOffice === 'all' ? 'selected' : ''}>Todas las oficinas</option>`
  offices.forEach((office) => {
    const isSel = currentOffice === office ? 'selected' : ''
    html += `<option value="${escapeHtml(office)}" ${isSel}>${escapeHtml(office)}</option>`
  })

  select.innerHTML = html
}

/**
 * Renderiza / Actualiza el combo-box de categorías
 */
function renderCategoryBar(categories) {
  const select = document.getElementById('categorySelect')
  if (!select) return

  const standardCats = [
    { key: 'all', label: 'Todas las categorías' },
    { key: 'plataformas', label: 'Plataformas' },
    { key: 'academico', label: 'Académico' },
    { key: 'tramites', label: 'Trámites' },
    { key: 'contacto', label: 'Atención / Contacto' },
  ]

  const extraCats = []
  categories.forEach((cat) => {
    const norm = normalizeText(cat)
    const exists = standardCats.some(
      (sc) => sc.key === norm || norm.includes(sc.key) || sc.key.includes(norm),
    )
    if (!exists && norm !== 'todas') {
      extraCats.push({
        key: norm,
        label: cat,
      })
    }
  })

  const fullList = [...standardCats, ...extraCats]

  let html = ''
  fullList.forEach((c) => {
    const isSel = currentCategory === c.key ? 'selected' : ''
    html += `<option value="${c.key}" ${isSel}>${escapeHtml(c.label)}</option>`
  })

  select.innerHTML = html
}

/**
 * Renderiza el listado de tarjetas de preguntas en el acordeón
 */
function renderFaqCards(faqs) {
  const container = document.getElementById('faqAccordion')
  if (!container) return

  originalQuestionTexts.clear()

  if (!faqs || faqs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--color-text-muted);">
        <i class="fa-solid fa-clipboard-question" style="font-size: 2.5rem; color: var(--color-border); margin-bottom: 12px; display: block;"></i>
        <p>No hay preguntas frecuentes activas registradas en este momento.</p>
      </div>
    `
    const visibleCounter = document.getElementById('visibleFaqsCount')
    if (visibleCounter) visibleCounter.textContent = '0'
    return
  }

  let html = ''
  faqs.forEach((faq, index) => {
    const num = String(index + 1).padStart(2, '0')
    const catClass = getCategoryPillClass(faq.categoria)
    const catIcon = getCategoryIcon(faq.categoria)
    const officeClass = getOfficePillClass(faq.oficina)
    const cardId = `faq-${faq.id || index + 1}`

    const destacadoBadge = faq.destacado
      ? `<span class="faq-pill-tag pill-destacado"><i class="fa-solid fa-star"></i> Destacado</span>`
      : ''

    const actionButton =
      faq.botonTexto && faq.botonUrl
        ? `
      <div class="faq-action-wrap">
        <a href="${escapeHtml(faq.botonUrl)}" target="_blank" rel="noopener noreferrer" class="link-btn-portal">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
          <span>${escapeHtml(faq.botonTexto)}</span>
        </a>
      </div>
    `
        : ''

    const destacadoClass = faq.destacado ? 'is-destacado' : ''
    html += `
      <article class="faq-card ${destacadoClass}" data-category="${escapeHtml(faq.categoria)}" data-oficina="${escapeHtml(faq.oficina)}" id="${cardId}">
        <button class="faq-trigger" aria-expanded="false" type="button">
          <div class="faq-title-wrap">
            <div class="faq-meta-info">
              <span class="faq-num">${num}</span>
              ${destacadoBadge}
            </div>
            <h3 class="faq-question-text">${escapeHtml(faq.pregunta)}</h3>
          </div>
          <div class="faq-arrow">
            <i class="fa-solid fa-chevron-down"></i>
          </div>
        </button>
        <div class="faq-body-collapse">
          <div class="faq-body-content">
            ${formatAnswerHtml(faq.respuesta)}
            ${actionButton}
          </div>
        </div>
      </article>
    `
  })

  container.innerHTML = html

  // Registrar títulos originales y eventos de click
  const cards = container.querySelectorAll('.faq-card')
  cards.forEach((card) => {
    const titleEl = card.querySelector('.faq-question-text')
    if (titleEl) {
      originalQuestionTexts.set(card, titleEl.innerHTML)
    }

    const triggerBtn = card.querySelector('.faq-trigger')
    triggerBtn?.addEventListener('click', () => {
      toggleFaqItem(card)
    })
  })

  // Re-aplicar filtro actual y contadores
  filterFaqs()
}

/**
 * Abre o cierra un item individual del acordeón
 */
function toggleFaqItem(card, forceState) {
  const btn = card.querySelector('.faq-trigger')
  const collapse = card.querySelector('.faq-body-collapse')
  const isActive = card.classList.contains('active')
  const shouldOpen = forceState !== undefined ? forceState : !isActive

  if (shouldOpen) {
    card.classList.add('active')
    btn?.setAttribute('aria-expanded', 'true')
    if (collapse) {
      collapse.style.maxHeight = collapse.scrollHeight + 'px'
    }
  } else {
    card.classList.remove('active')
    btn?.setAttribute('aria-expanded', 'false')
    if (collapse) {
      collapse.style.maxHeight = '0px'
    }
  }
}

// ============================================================================
// 5. MOTOR DE FILTRADO COMBINADO (CATEGORÍA + OFICINA + BÚSQUEDA EN VIVO)
// ============================================================================
function filterFaqs() {
  const cards = document.querySelectorAll('.faq-accordion-list .faq-card')
  const normalizedQuery = normalizeText(currentSearchQuery)
  const normalizedCategory = normalizeText(currentCategory)
  const normalizedOffice = normalizeText(currentOffice)

  let visibleCount = 0

  // Contadores por categoría y por oficina
  const categoryCounts = {}
  const officeCounts = {}

  cards.forEach((card) => {
    const itemCategoryRaw = card.getAttribute('data-category') || ''
    const itemOfficeRaw = card.getAttribute('data-oficina') || ''

    const itemCategory = normalizeText(itemCategoryRaw)
    const itemOffice = normalizeText(itemOfficeRaw)

    const questionEl = card.querySelector('.faq-question-text')
    const answerEl = card.querySelector('.faq-body-content')

    const questionText = questionEl ? questionEl.textContent : ''
    const answerText = answerEl ? answerEl.textContent : ''

    // Buscar también en texto completo
    const fullText = normalizeText(questionText + ' ' + answerText)

    // Condición 1: Coincide con la búsqueda de texto
    const matchesSearch = !normalizedQuery || fullText.includes(normalizedQuery)

    // Condición 2: Coincide con la categoría
    let matchesCategory = false
    if (normalizedCategory === 'all' || normalizedCategory === 'todas') {
      matchesCategory = true
    } else if (normalizedCategory === 'atencion') {
      matchesCategory =
        itemCategory.includes('atencion') || itemCategory.includes('contacto')
    } else {
      matchesCategory =
        itemCategory.includes(normalizedCategory) ||
        normalizedCategory.includes(itemCategory)
    }

    // Condición 3: Coincide con la oficina
    let matchesOffice = false
    if (normalizedOffice === 'all' || normalizedOffice === 'todas') {
      matchesOffice = true
    } else {
      matchesOffice =
        itemOffice.includes(normalizedOffice) ||
        normalizedOffice.includes(itemOffice)
    }

    // Calcular conteos globales (filtrados por búsqueda)
    if (matchesSearch) {
      const catKey = slugify(itemCategoryRaw)
      categoryCounts[catKey] = (categoryCounts[catKey] || 0) + 1

      const ofKey = slugify(itemOfficeRaw)
      officeCounts[ofKey] = (officeCounts[ofKey] || 0) + 1
    }

    // Visibilidad final de la tarjeta
    const isVisible = matchesSearch && matchesCategory && matchesOffice

    if (isVisible) {
      card.style.display = 'block'
      visibleCount++

      // Si hay búsqueda activa de 2 o más letras, abrir automáticamente
      if (normalizedQuery.length >= 2) {
        toggleFaqItem(card, true)
      }

      // Resaltar coincidencia en el título
      if (questionEl && originalQuestionTexts.has(card)) {
        const original = originalQuestionTexts.get(card)
        if (normalizedQuery.length >= 2) {
          const regex = new RegExp(`(${currentSearchQuery.trim()})`, 'gi')
          questionEl.innerHTML = original.replace(
            regex,
            '<mark class="highlight-text">$1</mark>',
          )
        } else {
          questionEl.innerHTML = original
        }
      }
    } else {
      card.style.display = 'none'
      toggleFaqItem(card, false)
    }
  })

  // Actualizar contador visual principal
  const visibleFaqsCountEl = document.getElementById('visibleFaqsCount')
  if (visibleFaqsCountEl) visibleFaqsCountEl.textContent = visibleCount

  // Mostrar u ocultar mensaje de "No se encontraron resultados"
  const emptyBox = document.getElementById('faqEmptyState')
  const emptyQuerySpan = document.getElementById('emptyQueryText')

  if (visibleCount === 0) {
    if (emptyBox) emptyBox.style.display = 'block'
    if (emptyQuerySpan)
      emptyQuerySpan.textContent =
        currentSearchQuery || 'el filtro seleccionado'
  } else {
    if (emptyBox) emptyBox.style.display = 'none'
  }
}

// ============================================================================
// 6. SPLASH SCREEN (3 SEGUNDOS) + FETCH CON REINTENTO Y CACHÉ PERSISTENTE
// ============================================================================

/**
 * Controla el Splash Screen de 3 segundos con barra de progreso y mensajes suaves
 */
function startSplashScreen() {
  const splashEl = document.getElementById('splashScreen')
  const progressFill = document.getElementById('splashProgressFill')
  const splashText = document.getElementById('splashText')

  if (!splashEl) return Promise.resolve()

  return new Promise((resolve) => {
    const totalDuration = 1000 // Carga ágil y fluida sin esperas excesivas
    const startTime = performance.now()

    // Mensajes contextuales durante la carga
    const messages = [
      { at: 0, text: 'Cargando preguntas frecuentes...' },
      { at: 1100, text: 'Organizando respuestas y oficinas...' },
      { at: 2200, text: '¡Todo listo para ayudarte!' },
    ]

    function updateFrame(now) {
      const elapsed = now - startTime
      const progress = Math.min(100, (elapsed / totalDuration) * 100)

      if (progressFill) {
        progressFill.style.width = `${progress}%`
      }

      if (splashText) {
        for (let i = messages.length - 1; i >= 0; i--) {
          if (elapsed >= messages[i].at) {
            if (splashText.textContent !== messages[i].text) {
              splashText.textContent = messages[i].text
            }
            break
          }
        }
      }

      if (elapsed < totalDuration) {
        requestAnimationFrame(updateFrame)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(updateFrame)
  })
}

/**
 * Oculta el splash screen con transición suave
 */
function hideSplashScreen() {
  const splashEl = document.getElementById('splashScreen')
  if (!splashEl) return

  splashEl.classList.add('fade-out')
  setTimeout(() => {
    splashEl.style.display = 'none'
  }, 600)
}

/**
 * Consulta a Google Apps Script con reintentos automáticos en caso de HTTP 404 o fallo de red
 */
async function fetchFaqsWithRetry(url, maxRetries = 3, baseDelay = 700) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data && data.success && Array.isArray(data.faqs)) {
          return data
        }
        throw new Error(data?.error || 'Estructura de respuesta inválida')
      }

      console.warn(
        `⚠️ Intento ${attempt}/${maxRetries} falló con HTTP ${response.status}. Reintentando...`,
      )
    } catch (err) {
      console.warn(
        `⚠️ Intento ${attempt}/${maxRetries} falló (${err.message}). Reintentando...`,
      )
    }

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, baseDelay * attempt))
    }
  }

  throw new Error(`No se pudo obtener respuesta tras ${maxRetries} intentos.`)
}

/**
 * Inicializa la animación del footer al hacer scroll hacia esa sección
 * (Efecto idéntico al sitio oficial de Soporte IEmpresa)
 */
function initFooterAnimation() {
  const footerAnimatedEls = document.querySelectorAll('.footer-animate')
  if (!footerAnimatedEls.length) return

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animated')
            obs.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.08,
      },
    )

    footerAnimatedEls.forEach((el) => observer.observe(el))
  } else {
    footerAnimatedEls.forEach((el) => el.classList.add('animated'))
  }
}

/**
 * Inicializa el acordeón y filtros con las preguntas listadas en index.html
 */
function initFaqsFromDOM() {
  const container = document.getElementById('faqAccordion')
  if (!container) return

  const cards = container.querySelectorAll('.faq-card')
  if (cards.length > 0) {
    cards.forEach((card) => {
      const titleEl = card.querySelector('.faq-question-text')
      if (titleEl && !originalQuestionTexts.has(card)) {
        originalQuestionTexts.set(card, titleEl.innerHTML)
      }

      const triggerBtn = card.querySelector('.faq-trigger')
      if (triggerBtn && !triggerBtn.dataset.hasListener) {
        triggerBtn.dataset.hasListener = 'true'
        triggerBtn.addEventListener('click', () => {
          toggleFaqItem(card)
        })
      }
    })

    filterFaqs()
  }
}

/**
 * Orquesta la carga de datos y el Splash Screen
 */
async function initFaqsData() {
  console.info('🔄 Iniciando carga de preguntas frecuentes...')

  // Inicializar animaciones de scroll del footer y eventos de preguntas del DOM
  initFooterAnimation()
  initFaqsFromDOM()

  // 1. Cargar datos cacheados previamente si existen
  let hasLocalCache = false
  try {
    const rawCache = localStorage.getItem(CACHE_KEY)
    if (rawCache) {
      const cached = JSON.parse(rawCache)
      if (cached && Array.isArray(cached.faqs) && cached.faqs.length > 0) {
        allFaqs = cached.faqs
        availableOffices = cached.offices || []
        availableCategories = cached.categories || []
        renderOfficeBar(availableOffices)
        renderCategoryBar(availableCategories)
        renderFaqCards(allFaqs)
        hasLocalCache = true
      }
    }
  } catch (e) {
    console.warn('Error leyendo caché local:', e)
  }

  // 2. Iniciar el Splash Screen (garantiza mínimo ~2.8s)
  const splashPromise = startSplashScreen()

  // 3. Iniciar petición de datos a Google Sheets
  const fetchUrl =
    APPS_SCRIPT_URL + (APPS_SCRIPT_URL.includes('?') ? '&' : '?') + 'nocache=1'

  let fetchSuccess = false
  const fetchPromise = fetchFaqsWithRetry(fetchUrl, 3, 700)
    .then((data) => {
      fetchSuccess = true
      console.info(
        `✅ Sincronizado con Google Sheets (${data.count} preguntas activas):`,
        data,
      )

      allFaqs = data.faqs
      availableOffices = data.offices || []
      availableCategories = data.categories || []

      // Guardar en caché persistente para futuras visitas o ante errores temporales
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            faqs: allFaqs,
            offices: availableOffices,
            categories: availableCategories,
            savedAt: Date.now(),
          }),
        )
      } catch (e) {}

      // Actualizar interfaz
      renderOfficeBar(availableOffices)
      renderCategoryBar(availableCategories)
      renderFaqCards(allFaqs)
    })
    .catch((err) => {
      console.warn('ℹ️ Usando preguntas listadas en index.html:', err)
      const existingCards = document.querySelectorAll('#faqAccordion .faq-card')
      if (existingCards.length === 0 && !hasLocalCache) {
        const container = document.getElementById('faqAccordion')
        if (container) {
          container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--color-text-muted);">
              <i class="fa-solid fa-circle-exclamation" style="font-size: 2.2rem; color: #ef4444; margin-bottom: 12px; display: block;"></i>
              <p style="font-weight: 500; color: var(--color-text-dark); margin-bottom: 6px;">No se pudieron cargar las preguntas en este momento.</p>
              <p style="font-size: 0.88rem; margin-bottom: 16px;">Verifica tu conexión e intenta recargar la página.</p>
              <button type="button" class="search-btn-cta" onclick="location.reload()" style="margin: 0 auto;">
                <i class="fa-solid fa-rotate-right"></i> Recargar
              </button>
            </div>
          `
        }
      }
    })

  // 4. Esperar a que el Splash Screen termine su animación
  await splashPromise

  // Si por lentitud extrema de red la petición aún sigue corriendo después de 2.8s,
  // damos hasta 1.2s más antes de liberar la pantalla
  if (!fetchSuccess && !hasLocalCache) {
    try {
      await Promise.race([
        fetchPromise,
        new Promise((r) => setTimeout(r, 1500)),
      ])
    } catch (e) {}
  }

  // 5. Ocultar Splash Screen con fade out elegante
  hideSplashScreen()
}

// ============================================================================
// 7. EVENTOS DE INTERACCIÓN UI (Header, Búsqueda, Expandir Todo, Hash)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  const siteHeader = document.getElementById('siteHeader')
  const mobileNavToggle = document.getElementById('mobileNavToggle')
  const mobileMenuDrawer = document.getElementById('mobileMenuDrawer')
  const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop')
  const scrollTopBtn = document.getElementById('scrollTopBtn')

  const faqSearchInput = document.getElementById('faqSearchInput')
  const searchClearBtn = document.getElementById('searchClearBtn')
  const quickTagBtns = document.querySelectorAll('.tag-chip, .quick-tag-btn')
  const toggleAllBtn = document.getElementById('toggleAllBtn')
  const toggleAllText = document.getElementById('toggleAllText')
  const resetSearchBtn = document.getElementById('resetSearchBtn')

  // 1. Header Sticky on Scroll
  const handleScroll = () => {
    const scrollY = window.scrollY
    if (scrollY > 30) {
      siteHeader?.classList.add('header-scrolled')
    } else {
      siteHeader?.classList.remove('header-scrolled')
    }

    if (scrollY > 350) {
      scrollTopBtn?.classList.add('visible')
    } else {
      scrollTopBtn?.classList.remove('visible')
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  // 2. Menú Móvil
  const toggleMobileMenu = (open) => {
    const isOpen =
      open !== undefined ? open : !mobileNavToggle.classList.contains('open')
    mobileNavToggle?.classList.toggle('open', isOpen)
    mobileNavToggle?.setAttribute('aria-expanded', isOpen)
    mobileMenuDrawer?.classList.toggle('open', isOpen)
    mobileMenuBackdrop?.classList.toggle('open', isOpen)
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }

  if (mobileNavToggle) {
    mobileNavToggle.addEventListener('click', () => toggleMobileMenu())
  }
  if (mobileMenuBackdrop) {
    mobileMenuBackdrop.addEventListener('click', () => toggleMobileMenu(false))
  }
  mobileMenuDrawer?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => toggleMobileMenu(false))
  })

  // 3. Buscador en Vivo
  if (faqSearchInput) {
    faqSearchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value
      if (searchClearBtn) {
        searchClearBtn.style.display =
          currentSearchQuery.trim().length > 0 ? 'flex' : 'none'
      }
      filterFaqs()
    })
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (faqSearchInput) faqSearchInput.value = ''
      currentSearchQuery = ''
      searchClearBtn.style.display = 'none'
      faqSearchInput?.focus()
      filterFaqs()
    })
  }

  // 4. Botón Restablecer Búsqueda
  if (resetSearchBtn) {
    resetSearchBtn.addEventListener('click', () => {
      if (faqSearchInput) faqSearchInput.value = ''
      currentSearchQuery = ''
      if (searchClearBtn) searchClearBtn.style.display = 'none'

      currentCategory = 'all'
      currentOffice = 'all'

      const catSelect = document.getElementById('categorySelect')
      if (catSelect) catSelect.value = 'all'

      const ofSelect = document.getElementById('officeSelect')
      if (ofSelect) ofSelect.value = 'all'

      filterFaqs()

      window.scrollTo({
        top: (document.getElementById('preguntas')?.offsetTop || 0) - 90,
        behavior: 'smooth',
      })
    })
  }

  // 5. Sugerencias Rápidas (Chips de búsqueda)
  quickTagBtns.forEach((tagBtn) => {
    tagBtn.addEventListener('click', () => {
      const term = tagBtn.getAttribute('data-search')
      if (term && faqSearchInput) {
        faqSearchInput.value = term
        currentSearchQuery = term
        if (searchClearBtn) searchClearBtn.style.display = 'flex'

        currentCategory = 'all'
        currentOffice = 'all'

        const catSelect = document.getElementById('categorySelect')
        if (catSelect) catSelect.value = 'all'

        const ofSelect = document.getElementById('officeSelect')
        if (ofSelect) ofSelect.value = 'all'

        filterFaqs()

        const targetTop =
          (document.getElementById('preguntas')?.offsetTop || 0) - 90
        window.scrollTo({ top: targetTop, behavior: 'smooth' })
      }
    })
  })

  // 5b. Combo-boxes de Filtro (Categoría y Oficina)
  const categorySelectEl = document.getElementById('categorySelect')
  if (categorySelectEl) {
    categorySelectEl.addEventListener('change', (e) => {
      currentCategory = e.target.value
      filterFaqs()
    })
  }

  const officeSelectEl = document.getElementById('officeSelect')
  if (officeSelectEl) {
    officeSelectEl.addEventListener('change', (e) => {
      currentOffice = e.target.value
      filterFaqs()
    })
  }

  // 6. Botón Expandir / Contraer Todo
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      allExpanded = !allExpanded

      const cards = document.querySelectorAll('.faq-accordion-list .faq-card')
      cards.forEach((card) => {
        if (card.style.display !== 'none') {
          toggleFaqItem(card, allExpanded)
        }
      })

      if (allExpanded) {
        if (toggleAllText) toggleAllText.textContent = 'Colapsar todas'
        toggleAllBtn.querySelector('i').className = 'fa-solid fa-compress'
      } else {
        if (toggleAllText) toggleAllText.textContent = 'Expandir todas'
        toggleAllBtn.querySelector('i').className = 'fa-solid fa-arrows-up-down'
      }
    })
  }

  // 7. Navegación directa por hash (#faq-X)
  const handleHashChange = () => {
    const hash = window.location.hash
    if (hash && hash.startsWith('#faq-')) {
      const targetCard = document.querySelector(hash)
      if (targetCard) {
        currentCategory = 'all'
        currentOffice = 'all'

        const catSelect = document.getElementById('categorySelect')
        if (catSelect) catSelect.value = 'all'

        const ofSelect = document.getElementById('officeSelect')
        if (ofSelect) ofSelect.value = 'all'

        filterFaqs()

        setTimeout(() => {
          toggleFaqItem(targetCard, true)
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 200)
      }
    }
  }

  window.addEventListener('hashchange', handleHashChange)

  // 8. Iniciar carga de datos dinámicos
  initFaqsData().then(() => {
    handleHashChange()
  })
})
