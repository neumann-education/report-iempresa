/* ====================================================================
   SISTEMA IEMPRESA DASHBOARD - CORE ENGINE & ANALYTICS SCRIPT
   ==================================================================== */

// ================= SUPABASE CONFIGURATION =================
// Credenciales únicas del proyecto Supabase y tabla oficial
const SUPABASE_URL = 'https://xoatjtqkqpfwoapqiwkl.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYXRqdHFrcXBmd29hcHFpd2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NDk2OTMsImV4cCI6MjA5OTUyNTY5M30.bJAyNk8Uf8mCGSBMbaDMLNJ_mlZ9UiL8x0_eUk0XC1E'
const SUPABASE_TABLE = 'iempresa_leads'

let supabaseClient = null

// Official Advisors (Exact 11 Advisors Required)
const ASESORES_OFICIALES = [
  'Alejandro Núñez Vizcarra',
  'Alex Yoshimitsu Ramos Escobal',
  'Dayana Milagros Bohorquez Polo',
  'Faviola Vilca',
  'Fiorella Oliva Carrasco',
  'Irene Perez Tapia',
  'Kerenn Esther Cardoza Arpa',
  'Leydi Yoselin Alave Cutipa',
  'Melannie Cori Cruz',
  'Melany Mercedes Vidal Navarro',
  'Oscar Eduardo Alegre Rivera',
]

const asesoresOficialesSet = new Set(ASESORES_OFICIALES)

// Stage Specifications & Groupings (Pipeline C33)
// Progreso (Lead - Documentos)
// Perdido (Próxima Admisión - Cliente OLD)
// Exito (Cliente)
// No Contactable (Lead y RMKT), Contactable (Open - Cliente)
const ETAPAS_CONFIG = [
  {
    id: 'C33:NEW',
    nombre: 'Lead',
    grupo: 'Progreso',
    contacto: 'No Contactable',
    color: '#38bdf8',
  },
  {
    id: 'C33:UC_3O5OKK',
    nombre: 'RMKT',
    grupo: 'Progreso',
    contacto: 'No Contactable',
    color: '#0ea5e9',
  },
  {
    id: 'C33:UC_9I83SP',
    nombre: 'Open',
    grupo: 'Progreso',
    contacto: 'Contactable',
    color: '#60a5fa',
  },
  {
    id: 'C33:6',
    nombre: 'Whatsapp',
    grupo: 'Progreso',
    contacto: 'Contactable',
    color: '#10b981',
  },
  {
    id: 'C33:UC_YPI2KJ',
    nombre: 'Buscando Respuesta',
    grupo: 'Progreso',
    contacto: 'Contactable',
    color: '#3b82f6',
  },
  {
    id: 'C33:3',
    nombre: 'Buscando Decisión',
    grupo: 'Progreso',
    contacto: 'Contactable',
    color: '#2563eb',
  },
  {
    id: 'C33:PREPAYMENT_INVOICE',
    nombre: 'Buscando Pago',
    grupo: 'Progreso',
    contacto: 'Contactable',
    color: '#1d4ed8',
  },
  {
    id: 'C33:UC_6JMY7A',
    nombre: 'Pagó Matricula',
    grupo: 'Progreso',
    contacto: 'Contactable',
    color: '#818cf8',
  },
  {
    id: 'C33:UC_HZMM9T',
    nombre: 'Pagó Matricula + DE',
    grupo: 'Progreso',
    contacto: 'Contactable',
    color: '#6366f1',
  },
  {
    id: 'C33:UC_1ST1FO',
    nombre: 'Documentos',
    grupo: 'Progreso',
    contacto: 'Contactable',
    color: '#4f46e5',
  },
  {
    id: 'C33:UC_HUV9OR',
    nombre: 'Próxima Admisión',
    grupo: 'Perdido',
    contacto: 'Contactable',
    color: '#f59e0b',
  },
  {
    id: 'C33:APOLOGY',
    nombre: 'No Contacto',
    grupo: 'Perdido',
    contacto: 'Contactable',
    color: '#f87171',
  },
  {
    id: 'C33:UC_7EEN5V',
    nombre: 'Venta Cruzada',
    grupo: 'Perdido',
    contacto: 'Contactable',
    color: '#a855f7',
  },
  {
    id: 'C33:UC_T4K2AH',
    nombre: 'Calificado Descartado',
    grupo: 'Perdido',
    contacto: 'Contactable',
    color: '#fb7185',
  },
  {
    id: 'C33:LOSE',
    nombre: 'No calificado',
    grupo: 'Perdido',
    contacto: 'Contactable',
    color: '#e11d48',
  },
  {
    id: 'C33:1',
    nombre: 'Cliente OLD',
    grupo: 'Perdido',
    contacto: 'Contactable',
    color: '#94a3b8',
  },
  {
    id: 'C33:WON',
    nombre: 'Cliente',
    grupo: 'Exito',
    contacto: 'Contactable',
    color: '#059669',
  },
]

// Stage lookup mapping by name and ID
const ETAPAS_MAP = {}
ETAPAS_CONFIG.forEach((stage) => {
  ETAPAS_MAP[stage.nombre.toLowerCase()] = stage
  ETAPAS_MAP[stage.id.toLowerCase()] = stage
})

// Color palettes for UI & Avatars
const avatarColors = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#e0e7ff', text: '#3730a3' },
  { bg: '#f3e8ff', text: '#6b21a8' },
  { bg: '#ffe4e6', text: '#9f1239' },
  { bg: '#ffedd5', text: '#9a3412' },
  { bg: '#fef9c3', text: '#854d0e' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#cffafe', text: '#065f46' },
  { bg: '#f1f5f9', text: '#334155' },
  { bg: '#fdf2f8', text: '#9d174d' },
]

// App State
let fullData = []
let filteredData = []

// Filter Sets
let fSearch = ''
let fCreaStart = ''
let fCreaEnd = ''
let fCambioStart = ''
let fCambioEnd = ''

let fAdvs = new Set()
let fPipelines = new Set()
let fStages = new Set()
let fPrograms = new Set()
let fOrigins = new Set()
let fCiudades = new Set()
let fNiveles = new Set()
let fMedios = new Set()
let fIAs = new Set()

// Grouped UTM Parameters
let fUtmSource = new Set()
let fUtmMedium = new Set()
let fUtmCampaign = new Set()
let fUtmContent = new Set()
let fUtmTerm = new Set()

// Grouped Chatfuel Parameters
let fOrigenChatfuel = new Set()
let fUtmCampaignCh = new Set()
let fUtmContentCh = new Set()
let fUtmTermCh = new Set()

// Grouped Remarketing Parameters
let fRmktOrigen = new Set()
let fRmktRespuesta = new Set()
let fRmktNombre = new Set()
let fRmktDetalles = new Set()
let fRmktInteres = new Set()

let quickGroup = 'all' // 'all', 'contactable', 'nocontactable'

// Chart Instances
let chartBarInstance = null
let chartPiePipelineInstance = null
let chartPieLossInstance = null
let chartBarProgramsInstance = null
let chartDonutOriginsInstance = null

// Pagination and Scoped Filter for Explorer
let currentPage = 1
const rowsPerPage = 20
let explorerAdvisorFilter = null

// Realtime Timer
let debounceTimer = null

// ================= INDEXEDDB CACHE LAYER =================
const DB_NAME = 'iempresa_cache_db'
const DB_VERSION = 1
const STORE_NAME = 'leads_store'

function openCacheDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) return resolve(null)
    const req = window.indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = () => resolve(null)
  })
}

async function saveLeadsCache(data) {
  try {
    const db = await openCacheDB()
    if (!db) return
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(data, 'leads_data')
  } catch (e) {
    console.warn('Aviso: no se pudo guardar en IndexedDB:', e)
  }
}

async function loadLeadsCache() {
  try {
    const db = await openCacheDB()
    if (!db) return null
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get('leads_data')
      req.onsuccess = (e) => resolve(e.target.result || null)
      req.onerror = () => resolve(null)
    })
  } catch (e) {
    return null
  }
}

async function clearLeadsCache() {
  try {
    const db = await openCacheDB()
    if (!db) return
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete('leads_data')
  } catch (e) {}
}

// ================= INITIALIZATION =================
window.onload = async () => {
  initTheme()
  initAdminFilterConfig()

  if (window.Chart && window.ChartDataLabels) {
    Chart.register(ChartDataLabels)
  }

  // Limpiar localStorage obsoleto que causaba QuotaExceededError (límite de 5MB)
  try {
    localStorage.removeItem('iempresa_data_cache')
  } catch (e) {}

  // Cargar caché local desde IndexedDB (sin límite de 5MB)
  const cachedData = await loadLeadsCache()
  if (Array.isArray(cachedData) && cachedData.length > 0) {
    fullData = cachedData
  } else {
    fullData = []
  }

  // Poblar filtros con la caché inicial
  populateFilterOptions()
  updateAll()

  // Conectar a Supabase y descargar datos frescos en segundo plano
  await initSupabaseConnection()

  // Ocultar pantalla de carga suavemente
  setTimeout(() => {
    const loader = document.getElementById('loader')
    if (loader) loader.classList.add('hidden')
  }, 450)
}

// ================= SUPABASE DATA LAYER =================
async function initSupabaseConnection() {
  const badge = document.getElementById('connection-badge')
  const badgeText = document.getElementById('connection-status-text')

  try {
    if (!window.supabase) {
      throw new Error('Librería de Supabase no disponible')
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

    // Sincronizar configuración de filtros remota en segundo plano
    syncAdminFilterConfigWithSupabase()

    // Test connection and fetch rows from table
    const { data, error } = await supabaseClient
      .from(SUPABASE_TABLE)
      .select('*')
      .limit(10)

    if (error) {
      console.warn('Aviso Supabase:', error.message)
      badge.className = 'status-badge local'
      badgeText.innerText = 'Datos Locales (Modo Offline)'
      return false
    }

    badge.className = 'status-badge connected'
    badgeText.innerText = `Conectado`

    // Fetch full dataset in background
    fetchSupabaseData()

    // Subscribe to realtime postgres_changes
    subscribeRealtime()
    return true
  } catch (err) {
    console.warn('No se pudo conectar a Supabase:', err.message)
    badge.className = 'status-badge local'
    badgeText.innerText = 'Datos Locales (Modo Demo / Offline)'
    return false
  }
}

async function fetchSupabaseData(isSilent = false) {
  if (!supabaseClient) return

  const refreshIcon = document.getElementById('refresh-spin')
  if (refreshIcon) refreshIcon.style.animation = 'spin 1s linear infinite'

  try {
    let allRows = []
    let from = 0
    const step = 1000
    let finished = false

    while (!finished) {
      const { data, error } = await supabaseClient
        .from(SUPABASE_TABLE)
        .select('*')
        .range(from, from + step - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      allRows = allRows.concat(data)
      if (data.length < step) finished = true
      else from += step
    }

    // Normalizar datos recibidos de Supabase
    fullData = allRows.map((row) => normalizeRow(row))

    // Si la tabla de Supabase está vacía (fue limpiada), limpiamos caché y mostramos 0 registros
    if (fullData.length === 0) {
      await clearLeadsCache()
    } else {
      // Guardar en IndexedDB de forma asíncrona y segura (sin límite estricto de 5MB)
      await saveLeadsCache(fullData)
    }

    // Actualizar filtros y re-renderizar todas las secciones y tablas con los datos reales
    populateFilterOptions()
    updateAll()
  } catch (e) {
    console.error('Error al obtener datos de Supabase:', e)
  } finally {
    if (refreshIcon) refreshIcon.style.animation = ''
  }
}

function subscribeRealtime() {
  if (!supabaseClient) return

  try {
    supabaseClient
      .channel('iempresa-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SUPABASE_TABLE },
        (payload) => {
          console.log('Cambio detectado en Supabase:', payload.eventType)
          clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            fetchSupabaseData(true)
          }, 1800)
        },
      )
      .subscribe()
  } catch (e) {
    console.warn('Fallo al suscribir a Realtime:', e)
  }
}

function manualRefresh() {
  fetchSupabaseData(false)
}

// ================= ROW & STAGE NORMALIZATION =================
function normalizeRow(row) {
  return {
    id: String(row.id_lead || row.id || row.ID || ''),
    url_bitrix:
      row.url_bitrix || row.url_negociacion || row['url bitrix'] || '',
    pipeline: String(
      row.pipeline || row.Pipeline || 'IEMPRESA 17 Agosto',
    ).trim(),
    etapa: String(row.etapa || row.etapa_funnel || row.Etapa || '').trim(),
    fecha_cambio_etapa:
      row.fecha_cambio_etapa || row['Fecha de cambio de la etapa'] || '',
    fecha_cambio_iso: normalizeDateToISO(
      row.fecha_cambio_etapa || row['Fecha de cambio de la etapa'] || '',
    ),
    responsable: String(
      row.responsable ||
        row.asesora_asignada ||
        row.Responsable ||
        'Sin Asignar',
    ).trim(),
    origen: String(row.origen || row.Origen || '').trim(),
    creado: row.creado || row.fecha_creacion || row.Creado || '',
    creado_iso: normalizeDateToISO(
      row.creado || row.fecha_creacion || row.Creado || '',
    ),
    utm_source: String(row.utm_source || row['UTM Source'] || '').trim(),
    utm_medium: String(row.utm_medium || row['UTM Medium'] || '').trim(),
    utm_campaign: String(row.utm_campaign || row['UTM Campaign'] || '').trim(),
    utm_content: String(row.utm_content || row['UTM Content'] || '').trim(),
    utm_term: String(row.utm_term || row['UTM Term'] || '').trim(),
    pais: String(row.pais || row.Pais || '').trim(),
    ciudad: String(
      row.ciudad ||
        row.ciudad_borrar ||
        row['Ciudad borrar'] ||
        row.Ciudad ||
        '',
    ).trim(),
    nivel_estudio: String(
      row.nivel_estudio || row['Nivel de Estudio'] || row.nivel || '',
    ).trim(),
    programa: String(
      row.programa || row.programa_interes || row['Programa de interés'] || '',
    ).trim(),
    medio_contacto: String(
      row.medio_contacto ||
        row['¿Cómo deseas que te contactemos?'] ||
        row.como_contactar ||
        '',
    ).trim(),
    ia_tipo_lead: String(
      row.ia_tipo_lead || row['IA Tipo de lead CH'] || '',
    ).trim(),
    url_chatfuel: row.url_chatfuel || row['URL Chatfuel'] || '',
    phone_ia: String(row.phone_ia || row.Phone_IA || '').trim(),
    calificacion_ia: String(
      row.calificacion_ia || row['Calificación IA'] || '',
    ).trim(),
    origen_chatfuel: String(
      row.origen_chatfuel || row['Origen Chatfuel'] || '',
    ).trim(),
    utm_campaign_ch: String(
      row.utm_campaign_ch ||
        row.UTM_Campaign_CH ||
        row['UTM_Campaign_CH'] ||
        '',
    ).trim(),
    utm_content_ch: String(
      row.utm_content_ch || row.UTM_Content_CH || row['UTM_Content_CH'] || '',
    ).trim(),
    utm_term_ch: String(
      row.utm_term_ch || row.UTM_Term_CH || row['UTM_Term_CH'] || '',
    ).trim(),
    rmkt_origen: String(row.rmkt_origen || row.RMKT_Origen || '').trim(),
    rmkt_respuesta: String(
      row.rmkt_respuesta || row.RMKT_Respuesta || '',
    ).trim(),
    rmkt_nombre: String(row.rmkt_nombre || row.RMKT_Nombre || '').trim(),
    rmkt_detalles: String(row.rmkt_detalles || row.RMKT_detalles || '').trim(),
    rmkt_interes: String(row.rmkt_interes || row.RMKT_Interes || '').trim(),
  }
}

// Stage Resolver
function getStageInfo(stageNameOrId) {
  if (!stageNameOrId) {
    return {
      id: 'UNKNOWN',
      nombre: 'Sin Etapa',
      grupo: 'Perdido',
      contacto: 'No Contactable',
      color: '#94a3b8',
    }
  }

  const clean = stageNameOrId.trim()
  const direct = ETAPAS_MAP[clean.toLowerCase()]
  if (direct) return direct

  // Partial match fallback
  for (let s of ETAPAS_CONFIG) {
    if (clean.toLowerCase().includes(s.nombre.toLowerCase())) return s
  }

  return {
    id: clean,
    nombre: clean,
    grupo: 'Progreso',
    contacto: 'No Contactable',
    color: '#64748b',
  }
}

// Date Normalizer to YYYY-MM-DD
function normalizeDateToISO(dateStr) {
  if (!dateStr) return ''
  const s = String(dateStr).trim()

  // Format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10)
  }

  // Format: DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    const parts = s.split(' ')[0].split('/')
    const d = parts[0].padStart(2, '0')
    const m = parts[1].padStart(2, '0')
    const y = parts[2]
    return `${y}-${m}-${d}`
  }

  return ''
}

// Avatar Generator
function getAvatar(name) {
  const clean = name || 'Sin Asignar'
  const words = clean.split(' ').filter(Boolean)
  const initials =
    words.length > 1
      ? (words[0][0] + words[1][0]).toUpperCase()
      : clean.substring(0, 2).toUpperCase()

  let hash = 0
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % avatarColors.length
  const col = avatarColors[idx]

  return `<div class="avatar" style="background:${col.bg}; color:${col.text};">${initials}</div>`
}

// ================= POPULATE DYNAMIC FILTER DROPDOWNS =================
function populateFilterOptions() {
  // 1. Asesores (Ensure official advisors are listed, plus any others found)
  const allFoundAdvs = new Set(
    fullData.map((d) => d.responsable).filter(Boolean),
  )
  ASESORES_OFICIALES.forEach((a) => allFoundAdvs.add(a))
  const sortedAdvs = Array.from(allFoundAdvs).sort((a, b) => {
    const aOf = asesoresOficialesSet.has(a)
    const bOf = asesoresOficialesSet.has(b)
    if (aOf && !bOf) return -1
    if (!aOf && bOf) return 1
    return a.localeCompare(b)
  })

  const advListEl = document.getElementById('adv-list')
  if (advListEl) {
    advListEl.innerHTML = sortedAdvs
      .map((adv) => {
        const isOfficial = asesoresOficialesSet.has(adv)
        const isChecked = fAdvs.size === 0 || fAdvs.has(adv)
        return `
        <label>
          <input type="checkbox" class="chk-filter" data-type="adv" value="${adv}" ${isChecked ? 'checked' : ''} onchange="handleFilterChange('adv', this)">
          <span>${adv} ${isOfficial ? '<span style="font-size:0.65rem; color:var(--brand-primary); font-weight:800;">★</span>' : ''}</span>
        </label>
      `
      })
      .join('')
  }

  // 2. Pipelines / Admisiones
  const pipelines = [
    ...new Set(fullData.map((d) => d.pipeline).filter(Boolean)),
  ].sort()
  const pipeListEl = document.getElementById('pipeline-list')
  if (pipeListEl) {
    pipeListEl.innerHTML = pipelines
      .map(
        (p) => `
      <label>
        <input type="checkbox" class="chk-filter" data-type="pipeline" value="${p}" ${fPipelines.size === 0 || fPipelines.has(p) ? 'checked' : ''} onchange="handleFilterChange('pipeline', this)">
        <span>${p}</span>
      </label>
    `,
      )
      .join('')
  }

  // 3. Etapas (Categorized: Progreso, Perdido, Exito)
  const stageListEl = document.getElementById('stage-list')
  if (stageListEl) {
    stageListEl.innerHTML = ETAPAS_CONFIG.map(
      (st) => `
      <label>
        <input type="checkbox" class="chk-filter" data-type="stage" value="${st.nombre}" ${fStages.size === 0 || fStages.has(st.nombre) ? 'checked' : ''} onchange="handleFilterChange('stage', this)">
        <span style="display:flex; align-items:center; gap:6px;">
          <span style="width:8px; height:8px; border-radius:50%; background:${st.color};"></span>
          <span>${st.nombre}</span>
          <span style="font-size:0.65rem; color:var(--text-light); margin-left:auto;">(${st.grupo})</span>
        </span>
      </label>
    `,
    ).join('')
  }

  // 4. Programas Académicos
  const programs = [
    ...new Set(fullData.map((d) => d.programa).filter(Boolean)),
  ].sort()
  const progListEl = document.getElementById('program-list')
  if (progListEl) {
    progListEl.innerHTML = programs
      .map(
        (pr) => `
      <label>
        <input type="checkbox" class="chk-filter" data-type="program" value="${pr}" ${fPrograms.size === 0 || fPrograms.has(pr) ? 'checked' : ''} onchange="handleFilterChange('program', this)">
        <span>${pr}</span>
      </label>
    `,
      )
      .join('')
  }

  // 5. Orígenes
  const origins = [
    ...new Set(fullData.map((d) => d.origen).filter(Boolean)),
  ].sort()
  const origListEl = document.getElementById('origin-list')
  if (origListEl) {
    origListEl.innerHTML = origins
      .map(
        (or) => `
      <label>
        <input type="checkbox" class="chk-filter" data-type="origin" value="${or}" ${fOrigins.size === 0 || fOrigins.has(or) ? 'checked' : ''} onchange="handleFilterChange('origin', this)">
        <span>${or}</span>
      </label>
    `,
      )
      .join('')
  }

  // 6. Calificación IA
  const ias = [
    ...new Set(fullData.map((d) => d.calificacion_ia).filter(Boolean)),
  ].sort()
  const iaListEl = document.getElementById('ia-list')
  if (iaListEl) {
    iaListEl.innerHTML = ias
      .map(
        (ia) => `
      <label>
        <input type="checkbox" class="chk-filter" data-type="ia" value="${ia}" ${fIAs.size === 0 || fIAs.has(ia) ? 'checked' : ''} onchange="handleFilterChange('ia', this)">
        <span>${ia}</span>
      </label>
    `,
      )
      .join('')
  }

  // Reusable populate helper for remaining filters
  function populateList(id, type, values, setMap) {
    const el = document.getElementById(id)
    if (!el) return
    const sorted = [...new Set(values.filter(Boolean))].sort()
    if (sorted.length === 0) {
      el.innerHTML =
        '<div style="padding:8px; font-size:0.75rem; color:var(--text-muted); text-align:center;">Sin registros</div>'
      return
    }
    el.innerHTML = sorted
      .map(
        (val) => `
      <label>
        <input type="checkbox" class="chk-filter" data-type="${type}" value="${val}" ${setMap.size === 0 || setMap.has(val) ? 'checked' : ''} onchange="handleFilterChange('${type}', this)">
        <span>${val}</span>
      </label>
    `,
      )
      .join('')
  }

  // 7. Ciudad
  populateList(
    'ciudad-list',
    'ciudad',
    fullData.map((d) => d.ciudad),
    fCiudades,
  )

  // 8. Nivel de Estudio
  populateList(
    'nivel-list',
    'nivel',
    fullData.map((d) => d.nivel_estudio),
    fNiveles,
  )

  // 9. Medio de Contacto
  populateList(
    'medio-list',
    'medio',
    fullData.map((d) => d.medio_contacto),
    fMedios,
  )

  // 10. UTM Group
  populateList(
    'utm_source-list',
    'utm_source',
    fullData.map((d) => d.utm_source),
    fUtmSource,
  )
  populateList(
    'utm_medium-list',
    'utm_medium',
    fullData.map((d) => d.utm_medium),
    fUtmMedium,
  )
  populateList(
    'utm_campaign-list',
    'utm_campaign',
    fullData.map((d) => d.utm_campaign),
    fUtmCampaign,
  )
  populateList(
    'utm_content-list',
    'utm_content',
    fullData.map((d) => d.utm_content),
    fUtmContent,
  )
  populateList(
    'utm_term-list',
    'utm_term',
    fullData.map((d) => d.utm_term),
    fUtmTerm,
  )

  // 11. Chatfuel Group
  populateList(
    'origen_chatfuel-list',
    'origen_chatfuel',
    fullData.map((d) => d.origen_chatfuel),
    fOrigenChatfuel,
  )
  populateList(
    'utm_campaign_ch-list',
    'utm_campaign_ch',
    fullData.map((d) => d.utm_campaign_ch),
    fUtmCampaignCh,
  )
  populateList(
    'utm_content_ch-list',
    'utm_content_ch',
    fullData.map((d) => d.utm_content_ch),
    fUtmContentCh,
  )
  populateList(
    'utm_term_ch-list',
    'utm_term_ch',
    fullData.map((d) => d.utm_term_ch),
    fUtmTermCh,
  )

  // 12. RMKT Group
  populateList(
    'rmkt_origen-list',
    'rmkt_origen',
    fullData.map((d) => d.rmkt_origen),
    fRmktOrigen,
  )
  populateList(
    'rmkt_respuesta-list',
    'rmkt_respuesta',
    fullData.map((d) => d.rmkt_respuesta),
    fRmktRespuesta,
  )
  populateList(
    'rmkt_nombre-list',
    'rmkt_nombre',
    fullData.map((d) => d.rmkt_nombre),
    fRmktNombre,
  )
  populateList(
    'rmkt_detalles-list',
    'rmkt_detalles',
    fullData.map((d) => d.rmkt_detalles),
    fRmktDetalles,
  )
  populateList(
    'rmkt_interes-list',
    'rmkt_interes',
    fullData.map((d) => d.rmkt_interes),
    fRmktInteres,
  )
}

// Toggle Grouped Filters Collapsible Container
function toggleGroupedFilters() {
  const box = document.getElementById('grouped-filters-box')
  const text = document.getElementById('grouped-toggle-text')
  if (!box) return
  const isOpen = box.classList.toggle('open')
  if (text) {
    text.innerText = isOpen
      ? 'Ocultar filtros agrupados'
      : 'Mostrar filtros agrupados'
  }
}

// Filter Dropdown Search box
function filterDropdownOptions(listId, query) {
  const container = document.getElementById(listId)
  if (!container) return
  const labels = container.querySelectorAll('label')
  const q = query.toLowerCase()
  labels.forEach((lbl) => {
    const text = lbl.innerText.toLowerCase()
    lbl.style.display = text.includes(q) ? 'flex' : 'none'
  })
}

// Toggle Dropdown Visibility
function toggleDropdown(dropId) {
  document.querySelectorAll('.dropdown-menu').forEach((d) => {
    if (d.id !== dropId) {
      d.classList.remove('show')
      d.parentElement.classList.remove('active')
    }
  })

  const target = document.getElementById(dropId)
  if (target) {
    const isShowing = target.classList.contains('show')
    target.classList.toggle('show')
    target.parentElement.classList.toggle('active', !isShowing)
  }
}

// Close Dropdowns on Click Outside
window.addEventListener('click', (e) => {
  if (
    !e.target.closest('.custom-select') &&
    !e.target.closest('.modal-overlay') &&
    !e.target.closest('.grouped-filters-header')
  ) {
    document.querySelectorAll('.dropdown-menu').forEach((d) => {
      d.classList.remove('show')
      d.parentElement.classList.remove('active')
    })
  }
})

// ================= FILTER CONTROLLERS =================
function handleFilterChange(type, checkbox) {
  const setMap = getSetByType(type)
  const val = checkbox.value

  if (checkbox.checked) {
    setMap.add(val)
  } else {
    setMap.delete(val)
  }

  updateFilterButtonLabel(type)
  updateAll()
}

function toggleAllFilters(type, selectAll) {
  const checkboxes = document.querySelectorAll(`input[data-type="${type}"]`)
  const setMap = getSetByType(type)

  if (selectAll) {
    checkboxes.forEach((cb) => {
      cb.checked = true
      setMap.add(cb.value)
    })
  } else {
    checkboxes.forEach((cb) => {
      cb.checked = false
    })
    setMap.clear()
  }

  updateFilterButtonLabel(type)
  updateAll()
}

function getSetByType(type) {
  switch (type) {
    case 'adv':
      return fAdvs
    case 'pipeline':
      return fPipelines
    case 'stage':
      return fStages
    case 'program':
      return fPrograms
    case 'origin':
      return fOrigins
    case 'ciudad':
      return fCiudades
    case 'nivel':
      return fNiveles
    case 'medio':
      return fMedios
    case 'ia':
      return fIAs
    case 'utm_source':
      return fUtmSource
    case 'utm_medium':
      return fUtmMedium
    case 'utm_campaign':
      return fUtmCampaign
    case 'utm_content':
      return fUtmContent
    case 'utm_term':
      return fUtmTerm
    case 'origen_chatfuel':
      return fOrigenChatfuel
    case 'utm_campaign_ch':
      return fUtmCampaignCh
    case 'utm_content_ch':
      return fUtmContentCh
    case 'utm_term_ch':
      return fUtmTermCh
    case 'rmkt_origen':
      return fRmktOrigen
    case 'rmkt_respuesta':
      return fRmktRespuesta
    case 'rmkt_nombre':
      return fRmktNombre
    case 'rmkt_detalles':
      return fRmktDetalles
    case 'rmkt_interes':
      return fRmktInteres
    default:
      return new Set()
  }
}

function updateFilterButtonLabel(type) {
  const setMap = getSetByType(type)
  const countEl = document.getElementById(`count-${type}`)
  const lblEl = document.getElementById(`lbl-${type}`)

  const titles = {
    adv: 'Asesores',
    pipeline: 'Admisiones',
    stage: 'Etapas',
    program: 'Programas',
    origin: 'Orígenes',
    ciudad: 'Ciudades',
    nivel: 'Niveles',
    medio: 'Medios',
    ia: 'Calif. IA',
    utm_source: 'Sources',
    utm_medium: 'Mediums',
    utm_campaign: 'Campaigns',
    utm_content: 'Contents',
    utm_term: 'Terms',
    origen_chatfuel: 'Orígenes CH',
    utm_campaign_ch: 'Campaigns CH',
    utm_content_ch: 'Contents CH',
    utm_term_ch: 'Terms CH',
    rmkt_origen: 'Orígenes RMKT',
    rmkt_respuesta: 'Respuestas RMKT',
    rmkt_nombre: 'Nombres RMKT',
    rmkt_detalles: 'Detalles RMKT',
    rmkt_interes: 'Intereses RMKT',
  }

  if (!lblEl) return

  if (setMap.size === 0) {
    lblEl.innerText = `Todos los ${titles[type] ? titles[type].toLowerCase() : type}`
    if (countEl) countEl.innerText = 'Todo'
  } else {
    lblEl.innerText = `${setMap.size} seleccionados`
    if (countEl) countEl.innerText = setMap.size
  }
}

// Global Text Search
function handleSearch(query) {
  fSearch = (query || '').trim().toLowerCase()
  updateAll()
}

// Date Range Presets
function setDatePreset(preset) {
  const now = new Date()
  const startInput = document.getElementById('crea-start')
  const endInput = document.getElementById('crea-end')

  const toIso = (d) => d.toISOString().split('T')[0]

  if (preset === 'today') {
    fCreaStart = toIso(now)
    fCreaEnd = toIso(now)
  } else if (preset === 'yesterday') {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    fCreaStart = toIso(y)
    fCreaEnd = toIso(y)
  } else if (preset === '7days') {
    const d7 = new Date(now)
    d7.setDate(d7.getDate() - 7)
    fCreaStart = toIso(d7)
    fCreaEnd = toIso(now)
  } else if (preset === '30days') {
    const d30 = new Date(now)
    d30.setDate(d30.getDate() - 30)
    fCreaStart = toIso(d30)
    fCreaEnd = toIso(now)
  } else if (preset === 'thisMonth') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    fCreaStart = toIso(firstDay)
    fCreaEnd = toIso(now)
  } else if (preset === 'all') {
    fCreaStart = ''
    fCreaEnd = ''
  }

  if (startInput) startInput.value = fCreaStart
  if (endInput) endInput.value = fCreaEnd

  applyDateRangeUpdate()
}

function applyCustomDateRange() {
  fCreaStart = document.getElementById('crea-start').value
  fCreaEnd = document.getElementById('crea-end').value
  applyDateRangeUpdate()
}

function clearDateFilter() {
  fCreaStart = ''
  fCreaEnd = ''
  document.getElementById('crea-start').value = ''
  document.getElementById('crea-end').value = ''
  applyDateRangeUpdate()
  toggleDropdown('drop-crea')
}

function applyDateRangeUpdate() {
  const lbl = document.getElementById('lbl-crea')
  const count = document.getElementById('count-crea')

  if (fCreaStart && fCreaEnd) {
    lbl.innerText = `${formatShortDate(fCreaStart)} al ${formatShortDate(fCreaEnd)}`
    count.innerText = 'Rango'
  } else if (fCreaStart) {
    lbl.innerText = `Desde ${formatShortDate(fCreaStart)}`
    count.innerText = 'Desde'
  } else if (fCreaEnd) {
    lbl.innerText = `Hasta ${formatShortDate(fCreaEnd)}`
    count.innerText = 'Hasta'
  } else {
    lbl.innerText = 'Todas las fechas'
    count.innerText = 'Todo'
  }

  updateAll()
}

// Date Range Presets for Fecha Cambio Etapa
function setDatePresetCambio(preset) {
  const now = new Date()
  const startInput = document.getElementById('cambio-start')
  const endInput = document.getElementById('cambio-end')

  const toIso = (d) => d.toISOString().split('T')[0]

  if (preset === 'today') {
    fCambioStart = toIso(now)
    fCambioEnd = toIso(now)
  } else if (preset === 'yesterday') {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    fCambioStart = toIso(y)
    fCambioEnd = toIso(y)
  } else if (preset === '7days') {
    const d7 = new Date(now)
    d7.setDate(d7.getDate() - 7)
    fCambioStart = toIso(d7)
    fCambioEnd = toIso(now)
  } else if (preset === '30days') {
    const d30 = new Date(now)
    d30.setDate(d30.getDate() - 30)
    fCambioStart = toIso(d30)
    fCambioEnd = toIso(now)
  } else if (preset === 'thisMonth') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    fCambioStart = toIso(firstDay)
    fCambioEnd = toIso(now)
  } else if (preset === 'all') {
    fCambioStart = ''
    fCambioEnd = ''
  }

  if (startInput) startInput.value = fCambioStart
  if (endInput) endInput.value = fCambioEnd

  applyDateRangeCambioUpdate()
}

function applyCustomDateRangeCambio() {
  fCambioStart = document.getElementById('cambio-start').value
  fCambioEnd = document.getElementById('cambio-end').value
  applyDateRangeCambioUpdate()
}

function clearDateFilterCambio() {
  fCambioStart = ''
  fCambioEnd = ''
  const s = document.getElementById('cambio-start')
  const e = document.getElementById('cambio-end')
  if (s) s.value = ''
  if (e) e.value = ''
  applyDateRangeCambioUpdate()
  toggleDropdown('drop-cambio')
}

function applyDateRangeCambioUpdate() {
  const lbl = document.getElementById('lbl-cambio')
  const count = document.getElementById('count-cambio')

  if (fCambioStart && fCambioEnd) {
    if (lbl)
      lbl.innerText = `${formatShortDate(fCambioStart)} al ${formatShortDate(fCambioEnd)}`
    if (count) count.innerText = 'Rango'
  } else if (fCambioStart) {
    if (lbl) lbl.innerText = `Desde ${formatShortDate(fCambioStart)}`
    if (count) count.innerText = 'Desde'
  } else if (fCambioEnd) {
    if (lbl) lbl.innerText = `Hasta ${formatShortDate(fCambioEnd)}`
    if (count) count.innerText = 'Hasta'
  } else {
    if (lbl) lbl.innerText = 'Todas las fechas'
    if (count) count.innerText = 'Todo'
  }

  updateAll()
}

function formatShortDate(iso) {
  if (!iso) return ''
  const parts = iso.split('-')
  return `${parts[2]}/${parts[1]}`
}

// Quick Group Shortcut Buttons (Contactables / No Contactables)
function setQuickGroupFilter(grp) {
  if (quickGroup === grp) {
    quickGroup = 'all'
  } else {
    quickGroup = grp
  }
  document.querySelectorAll('.filter-group-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.id === `btn-group-${quickGroup}`)
  })
  updateAll()
}

// Active Filter Chips & Clear All
function renderActiveChips() {
  const container = document.getElementById('active-chips')
  if (!container) return

  const chips = []

  if (fSearch) {
    chips.push({
      label: `Búsqueda: "${fSearch}"`,
      remove: () => {
        fSearch = ''
        document.getElementById('search-input').value = ''
      },
    })
  }
  if (fCreaStart || fCreaEnd) {
    chips.push({
      label: `F. Creación: ${document.getElementById('lbl-crea').innerText}`,
      remove: clearDateFilter,
    })
  }
  if (fCambioStart || fCambioEnd) {
    chips.push({
      label: `F. Cambio: ${document.getElementById('lbl-cambio').innerText}`,
      remove: clearDateFilterCambio,
    })
  }

  const setDefs = [
    { type: 'adv', label: 'Asesores', set: fAdvs },
    { type: 'pipeline', label: 'Admisión', set: fPipelines },
    { type: 'stage', label: 'Etapas', set: fStages },
    { type: 'program', label: 'Programas', set: fPrograms },
    { type: 'origin', label: 'Orígenes', set: fOrigins },
    { type: 'ciudad', label: 'Ciudades', set: fCiudades },
    { type: 'nivel', label: 'Nivel', set: fNiveles },
    { type: 'medio', label: 'Medio', set: fMedios },
    { type: 'ia', label: 'Calif. IA', set: fIAs },
    { type: 'utm_source', label: 'UTM Source', set: fUtmSource },
    { type: 'utm_medium', label: 'UTM Medium', set: fUtmMedium },
    { type: 'utm_campaign', label: 'UTM Campaign', set: fUtmCampaign },
    { type: 'utm_content', label: 'UTM Content', set: fUtmContent },
    { type: 'utm_term', label: 'UTM Term', set: fUtmTerm },
    { type: 'origen_chatfuel', label: 'Origen CH', set: fOrigenChatfuel },
    { type: 'utm_campaign_ch', label: 'Campaign CH', set: fUtmCampaignCh },
    { type: 'utm_content_ch', label: 'Content CH', set: fUtmContentCh },
    { type: 'utm_term_ch', label: 'Term CH', set: fUtmTermCh },
    { type: 'rmkt_origen', label: 'RMKT Origen', set: fRmktOrigen },
    { type: 'rmkt_respuesta', label: 'RMKT Resp.', set: fRmktRespuesta },
    { type: 'rmkt_nombre', label: 'RMKT Nombre', set: fRmktNombre },
    { type: 'rmkt_detalles', label: 'RMKT Det.', set: fRmktDetalles },
    { type: 'rmkt_interes', label: 'RMKT Int.', set: fRmktInteres },
  ]

  setDefs.forEach((item) => {
    if (item.set.size > 0) {
      chips.push({
        label: `${item.label}: ${item.set.size}`,
        remove: () => toggleAllFilters(item.type, false),
      })
    }
  })

  // Update grouped filters badge
  const groupedActiveCount =
    fUtmSource.size +
    fUtmMedium.size +
    fUtmCampaign.size +
    fUtmContent.size +
    fUtmTerm.size +
    fOrigenChatfuel.size +
    fUtmCampaignCh.size +
    fUtmContentCh.size +
    fUtmTermCh.size +
    fRmktOrigen.size +
    fRmktRespuesta.size +
    fRmktNombre.size +
    fRmktDetalles.size +
    fRmktInteres.size
  const groupedBadge = document.getElementById('badge-grouped-count')
  if (groupedBadge) {
    if (groupedActiveCount > 0) {
      groupedBadge.style.display = 'inline-block'
      groupedBadge.innerText = `${groupedActiveCount} activo${groupedActiveCount > 1 ? 's' : ''}`
    } else {
      groupedBadge.style.display = 'none'
    }
  }

  if (quickGroup !== 'all') {
    const groupName =
      quickGroup === 'contactable'
        ? 'Contactables'
        : quickGroup === 'nocontactable'
          ? 'No Contactables'
          : quickGroup
    chips.push({
      label: `Filtro: ${groupName}`,
      remove: () => setQuickGroupFilter('all'),
    })
  }

  if (chips.length === 0) {
    container.innerHTML = ''
    return
  }

  let html = chips
    .map(
      (c, i) => `
    <span class="chip">
      <span>${c.label}</span>
      <span class="chip-remove" onclick="removeChip(${i})">&times;</span>
    </span>
  `,
    )
    .join('')

  html += `<button class="clear-all-btn" onclick="clearAllFilters()">Limpiar todos los filtros</button>`
  container.innerHTML = html

  window._activeChipsActions = chips.map((c) => c.remove)
}

function removeChip(index) {
  if (window._activeChipsActions && window._activeChipsActions[index]) {
    window._activeChipsActions[index]()
    updateAll()
  }
}

function clearAllFilters() {
  fSearch = ''
  fCreaStart = ''
  fCreaEnd = ''
  fCambioStart = ''
  fCambioEnd = ''

  fAdvs.clear()
  fPipelines.clear()
  fStages.clear()
  fPrograms.clear()
  fOrigins.clear()
  fCiudades.clear()
  fNiveles.clear()
  fMedios.clear()
  fIAs.clear()

  fUtmSource.clear()
  fUtmMedium.clear()
  fUtmCampaign.clear()
  fUtmContent.clear()
  fUtmTerm.clear()

  fOrigenChatfuel.clear()
  fUtmCampaignCh.clear()
  fUtmContentCh.clear()
  fUtmTermCh.clear()

  fRmktOrigen.clear()
  fRmktRespuesta.clear()
  fRmktNombre.clear()
  fRmktDetalles.clear()
  fRmktInteres.clear()

  quickGroup = 'all'

  const sInput = document.getElementById('search-input')
  if (sInput) sInput.value = ''
  const dStart = document.getElementById('crea-start')
  if (dStart) dStart.value = ''
  const dEnd = document.getElementById('crea-end')
  if (dEnd) dEnd.value = ''
  const cStart = document.getElementById('cambio-start')
  if (cStart) cStart.value = ''
  const cEnd = document.getElementById('cambio-end')
  if (cEnd) cEnd.value = ''

  document.querySelectorAll('.chk-filter').forEach((cb) => (cb.checked = true))
  document
    .querySelectorAll('.filter-group-btn')
    .forEach((btn) =>
      btn.classList.toggle('active', btn.id === 'btn-group-all'),
    )

  const allTypes = [
    'adv',
    'pipeline',
    'stage',
    'program',
    'origin',
    'ciudad',
    'nivel',
    'medio',
    'ia',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'origen_chatfuel',
    'utm_campaign_ch',
    'utm_content_ch',
    'utm_term_ch',
    'rmkt_origen',
    'rmkt_respuesta',
    'rmkt_nombre',
    'rmkt_detalles',
    'rmkt_interes',
  ]
  allTypes.forEach((type) => updateFilterButtonLabel(type))

  const lblCrea = document.getElementById('lbl-crea')
  const countCrea = document.getElementById('count-crea')
  if (lblCrea) lblCrea.innerText = 'Todas las fechas'
  if (countCrea) countCrea.innerText = 'Todo'

  const lblCambio = document.getElementById('lbl-cambio')
  const countCambio = document.getElementById('count-cambio')
  if (lblCambio) lblCambio.innerText = 'Todas las fechas'
  if (countCambio) countCambio.innerText = 'Todo'

  updateAll()
}

// ================= MASTER UPDATE ENGINE =================
function updateAll() {
  const isAdmDetailMode =
    document.getElementById('chk-adm-detail')?.checked || false

  // 1. Filter Data
  filteredData = fullData.filter((row) => {
    // Search query match
    if (fSearch) {
      const matchSearch =
        row.id.toLowerCase().includes(fSearch) ||
        row.responsable.toLowerCase().includes(fSearch) ||
        row.etapa.toLowerCase().includes(fSearch) ||
        row.programa.toLowerCase().includes(fSearch) ||
        row.origen.toLowerCase().includes(fSearch) ||
        row.ciudad.toLowerCase().includes(fSearch) ||
        row.phone_ia.toLowerCase().includes(fSearch)
      if (!matchSearch) return false
    }

    // Date Range match (Creation date)
    if (fCreaStart || fCreaEnd) {
      if (!row.creado_iso) return false
      if (fCreaStart && row.creado_iso < fCreaStart) return false
      if (fCreaEnd && row.creado_iso > fCreaEnd) return false
    }

    // Date Range match (Stage Change date)
    if (fCambioStart || fCambioEnd) {
      if (!row.fecha_cambio_iso) return false
      if (fCambioStart && row.fecha_cambio_iso < fCambioStart) return false
      if (fCambioEnd && row.fecha_cambio_iso > fCambioEnd) return false
    }

    // Advisor match
    if (fAdvs.size > 0 && !fAdvs.has(row.responsable)) return false

    // Pipeline match
    if (fPipelines.size > 0 && !fPipelines.has(row.pipeline)) return false

    // Stage match
    const stageInfo = getStageInfo(row.etapa)
    if (fStages.size > 0 && !fStages.has(stageInfo.nombre)) return false

    // Academic Program match
    if (fPrograms.size > 0 && !fPrograms.has(row.programa)) return false

    // Origin match
    if (fOrigins.size > 0 && !fOrigins.has(row.origen)) return false

    // Ciudad match
    if (fCiudades.size > 0 && !fCiudades.has(row.ciudad)) return false

    // Nivel de Estudio match
    if (fNiveles.size > 0 && !fNiveles.has(row.nivel_estudio)) return false

    // Medio de Contacto match
    if (fMedios.size > 0 && !fMedios.has(row.medio_contacto)) return false

    // IA Qualification match
    if (fIAs.size > 0 && !fIAs.has(row.calificacion_ia)) return false

    // Grouped UTM Parameters match
    if (fUtmSource.size > 0 && !fUtmSource.has(row.utm_source)) return false
    if (fUtmMedium.size > 0 && !fUtmMedium.has(row.utm_medium)) return false
    if (fUtmCampaign.size > 0 && !fUtmCampaign.has(row.utm_campaign))
      return false
    if (fUtmContent.size > 0 && !fUtmContent.has(row.utm_content)) return false
    if (fUtmTerm.size > 0 && !fUtmTerm.has(row.utm_term)) return false

    // Grouped Chatfuel Parameters match
    if (fOrigenChatfuel.size > 0 && !fOrigenChatfuel.has(row.origen_chatfuel))
      return false
    if (fUtmCampaignCh.size > 0 && !fUtmCampaignCh.has(row.utm_campaign_ch))
      return false
    if (fUtmContentCh.size > 0 && !fUtmContentCh.has(row.utm_content_ch))
      return false
    if (fUtmTermCh.size > 0 && !fUtmTermCh.has(row.utm_term_ch)) return false

    // Grouped Remarketing Parameters match
    if (fRmktOrigen.size > 0 && !fRmktOrigen.has(row.rmkt_origen)) return false
    if (fRmktRespuesta.size > 0 && !fRmktRespuesta.has(row.rmkt_respuesta))
      return false
    if (fRmktNombre.size > 0 && !fRmktNombre.has(row.rmkt_nombre)) return false
    if (fRmktDetalles.size > 0 && !fRmktDetalles.has(row.rmkt_detalles))
      return false
    if (fRmktInteres.size > 0 && !fRmktInteres.has(row.rmkt_interes))
      return false

    // Quick Group shortcuts
    if (quickGroup === 'contactable' && stageInfo.contacto !== 'Contactable')
      return false
    if (
      quickGroup === 'nocontactable' &&
      stageInfo.contacto !== 'No Contactable'
    )
      return false

    return true
  })

  // 2. Compute Aggregates & KPIs
  const kpis = {
    nuevosContactables: 0,
    gestionComercial: 0,
    exitoCierres: 0,
    perdidaDescartes: 0,
    total: filteredData.length,
  }

  const nuevosBreakdown = { Lead: 0, RMKT: 0 }
  const gestionBreakdown = {}
  const perdidaBreakdown = {}
  const exitoBreakdown = { Cliente: 0 }

  // Advisor table statistics dictionary
  const advisorStats = {}
  ASESORES_OFICIALES.forEach((adv) => {
    advisorStats[adv] = {
      name: adv,
      gestion: 0,
      perdida: 0,
      exito: 0,
      total: 0,
      breakdownGestion: {},
      breakdownPerdida: {},
      breakdownExito: {},
      byAdmissionGestion: {},
      byAdmissionPerdida: {},
      byAdmissionExito: {},
    }
  })

  filteredData.forEach((row) => {
    const stageInfo = getStageInfo(row.etapa)
    const stageName = stageInfo.nombre
    const stageGrp = stageInfo.grupo // 'Progreso', 'Perdido', 'Exito'
    const contactGrp = stageInfo.contacto // 'Contactable', 'No Contactable'

    // KPI 1: Prospectos Nuevos (Lead & RMKT)
    if (stageName === 'Lead' || stageName === 'RMKT') {
      kpis.nuevosContactables++
      nuevosBreakdown[stageName] = (nuevosBreakdown[stageName] || 0) + 1
    }

    // KPI 2: Gestión Comercial (Progreso: Open to Documentos)
    if (stageGrp === 'Progreso') {
      kpis.gestionComercial++
      gestionBreakdown[stageName] = (gestionBreakdown[stageName] || 0) + 1
    }

    // KPI 3: Cierres Exitosos (Cliente)
    if (stageGrp === 'Exito') {
      kpis.exitoCierres++
      exitoBreakdown['Cliente'] = (exitoBreakdown['Cliente'] || 0) + 1
    }

    // KPI 4: Negociaciones Perdidas (Próx. Admisión to Cliente OLD)
    if (stageGrp === 'Perdido') {
      kpis.perdidaDescartes++
      perdidaBreakdown[stageName] = (perdidaBreakdown[stageName] || 0) + 1
    }

    // Advisor Statistics Calculation
    const adv = row.responsable
    if (advisorStats[adv]) {
      const s = advisorStats[adv]
      s.total++

      const adm = row.pipeline || 'Sin Admisión'

      if (stageGrp === 'Progreso') {
        s.gestion++
        s.breakdownGestion[stageName] = (s.breakdownGestion[stageName] || 0) + 1

        if (!s.byAdmissionGestion[adm])
          s.byAdmissionGestion[adm] = { total: 0, breakdown: {} }
        s.byAdmissionGestion[adm].total++
        s.byAdmissionGestion[adm].breakdown[stageName] =
          (s.byAdmissionGestion[adm].breakdown[stageName] || 0) + 1
      } else if (stageGrp === 'Perdido') {
        s.perdida++
        s.breakdownPerdida[stageName] = (s.breakdownPerdida[stageName] || 0) + 1

        if (!s.byAdmissionPerdida[adm])
          s.byAdmissionPerdida[adm] = { total: 0, breakdown: {} }
        s.byAdmissionPerdida[adm].total++
        s.byAdmissionPerdida[adm].breakdown[stageName] =
          (s.byAdmissionPerdida[adm].breakdown[stageName] || 0) + 1
      } else if (stageGrp === 'Exito') {
        s.exito++
        s.breakdownExito[stageName] = (s.breakdownExito[stageName] || 0) + 1

        if (!s.byAdmissionExito[adm])
          s.byAdmissionExito[adm] = { total: 0, breakdown: {} }
        s.byAdmissionExito[adm].total++
        s.byAdmissionExito[adm].breakdown[stageName] =
          (s.byAdmissionExito[adm].breakdown[stageName] || 0) + 1
      }
    }
  })

  // Render KPIs
  renderKPIs(
    kpis,
    nuevosBreakdown,
    gestionBreakdown,
    perdidaBreakdown,
    exitoBreakdown,
  )

  // Render Performance Table
  renderPerformanceTable(advisorStats, isAdmDetailMode)

  // Render Charts
  renderCharts(advisorStats)

  // Render Explorer Table
  renderExplorerTable()

  // Render Active Chips
  renderActiveChips()
}

// ================= RENDER KPIS =================
function renderKPIs(kpis, nuevosB, gestionB, perdidaB, exitoB) {
  document.getElementById('kpi-nuevos-val').innerText =
    kpis.nuevosContactables.toLocaleString()
  document.getElementById('kpi-gestion-val').innerText =
    kpis.gestionComercial.toLocaleString()
  document.getElementById('kpi-exito-val').innerText =
    kpis.exitoCierres.toLocaleString()
  document.getElementById('kpi-perdida-val').innerText =
    kpis.perdidaDescartes.toLocaleString()
  document.getElementById('kpi-total-val').innerText =
    kpis.total.toLocaleString()

  // Global conversion rate (guarded)
  const rateEl = document.getElementById('kpi-global-rate')
  if (rateEl) {
    const globalRate =
      kpis.total > 0
        ? ((kpis.exitoCierres / kpis.total) * 100).toFixed(2)
        : '0.00'
    rateEl.innerText = `${globalRate}%`
  }

  // Tooltip 1: Prospectos Nuevos (Lead & RMKT)
  const ttNuevos = document.getElementById('tt-nuevos')
  if (ttNuevos) {
    ttNuevos.innerHTML = `
      <div class="tt-title">Prospectos Nuevos</div>
      <div class="tt-row"><span style="color:var(--status-nuevo)">● Lead (Nuevo):</span> <strong>${(nuevosB['Lead'] || 0).toLocaleString()}</strong></div>
      <div class="tt-row"><span style="color:var(--status-nuevo)">● RMKT (Remarketing):</span> <strong>${(nuevosB['RMKT'] || 0).toLocaleString()}</strong></div>
    `
  }

  // Tooltip 2: Gestión Comercial
  const ttGestion = document.getElementById('tt-gestion')
  if (ttGestion) {
    let gHtml = '<div class="tt-title">Desglose en Gestión</div>'
    const progOrder = [
      'Open',
      'Whatsapp',
      'Buscando Respuesta',
      'Buscando Decisión',
      'Buscando Pago',
      'Pagó Matricula',
      'Pagó Matricula + DE',
      'Documentos',
    ]
    progOrder.forEach((st) => {
      const val = gestionB[st] || 0
      gHtml += `<div class="tt-row"><span style="color:var(--status-gestion)">● ${st}:</span> <strong>${val.toLocaleString()}</strong></div>`
    })
    ttGestion.innerHTML = gHtml
  }

  // Tooltip 3: Negociaciones Perdidas (Descartes)
  const ttPerdida = document.getElementById('tt-perdida')
  if (ttPerdida) {
    let pHtml = '<div class="tt-title">Desglose de Descartes</div>'
    const lossOrder = [
      'Próxima Admisión',
      'No Contacto',
      'Venta Cruzada',
      'Calificado Descartado',
      'No calificado',
      'Cliente OLD',
    ]
    lossOrder.forEach((st) => {
      const val = perdidaB[st] || 0
      pHtml += `<div class="tt-row"><span style="color:var(--status-perdida)">● ${st}:</span> <strong>${val.toLocaleString()}</strong></div>`
    })
    ttPerdida.innerHTML = pHtml
  }

  // Tooltip 4: Cierres Exitosos
  const ttExito = document.getElementById('tt-exito')
  if (ttExito) {
    ttExito.innerHTML = `
      <div class="tt-title">Cierres Efectivos</div>
      <div class="tt-row"><span style="color:var(--status-exito)">● Cliente (WON):</span> <strong>${(exitoB['Cliente'] || 0).toLocaleString()}</strong></div>
    `
  }

  // Tooltip 5: Total Negociaciones
  const ttTotal = document.getElementById('tt-total')
  if (ttTotal) {
    const convRate =
      kpis.total > 0
        ? ((kpis.exitoCierres / kpis.total) * 100).toFixed(2)
        : '0.00'
    ttTotal.innerHTML = `
      <div class="tt-title">Resumen General de Etapas</div>
      <div class="tt-row"><span style="color:var(--status-nuevo)">🎯 Prospectos Nuevos:</span> <strong>${kpis.nuevosContactables.toLocaleString()}</strong></div>
      <div class="tt-row"><span style="color:var(--status-gestion)">⚡ En Gestión Comercial:</span> <strong>${kpis.gestionComercial.toLocaleString()}</strong></div>
      <div class="tt-row"><span style="color:var(--status-perdida)">🚫 Negociaciones Perdidas:</span> <strong>${kpis.perdidaDescartes.toLocaleString()}</strong></div>
      <div class="tt-row"><span style="color:var(--status-exito)">🏆 Cierres Exitosos:</span> <strong>${kpis.exitoCierres.toLocaleString()}</strong></div>
      <div class="tt-row" style="margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.1);"><span style="color:var(--primary)">📈 Conversión Global:</span> <strong style="color:var(--status-exito);">${convRate}%</strong></div>
    `
  }
}

// ================= RENDER PERFORMANCE TABLE =================
function renderPerformanceTable(stats, isAdmDetailMode) {
  const tbody = document.getElementById('table-body-asesores')
  const tfoot = document.getElementById('table-foot-asesores')
  if (!tbody) return

  const activeAdvisers =
    typeof fAdvs !== 'undefined' && fAdvs && fAdvs.size > 0
      ? ASESORES_OFICIALES.filter((name) => fAdvs.has(name))
      : ASESORES_OFICIALES

  const advisersList = activeAdvisers.map((name) => stats[name]).filter(Boolean)

  const badgeEl = document.getElementById('badge-asesor-count')
  if (badgeEl) {
    badgeEl.innerText = `${advisersList.length} Asesor${advisersList.length === 1 ? '' : 'es'} Oficial${advisersList.length === 1 ? '' : 'es'}`
  }

  // Find max conversion rate for relative bar scaling
  let maxRate = 0
  advisersList.forEach((item) => {
    const rate = item.total > 0 ? (item.exito / item.total) * 100 : 0
    if (rate > maxRate) maxRate = rate
  })

  let totalGestion = 0
  let totalPerdida = 0
  let totalExito = 0
  let totalGlobal = 0

  const rowsHtml = advisersList
    .map((item) => {
      totalGestion += item.gestion
      totalPerdida += item.perdida
      totalExito += item.exito
      totalGlobal += item.total

      const rate = item.total > 0 ? (item.exito / item.total) * 100 : 0
      const barWidth =
        maxRate > 0 ? Math.min(100, Math.max(0, (rate / maxRate) * 100)) : 0

      // Color dinámico según porcentaje relativo al máximo filtrado:
      // Verde: rendimiento alto (>= 70% del máximo)
      // Azul: rendimiento medio (25% - 69.9% del máximo)
      // Rojo: rendimiento bajo (< 25% del máximo o 0%)
      let barColor = '#dc2626'
      if (barWidth >= 60) {
        barColor = '#27ae60'
      } else if (barWidth >= 25) {
        barColor = '#f59e0b'
      } else {
        barColor = '#dc2626'
      }

      // Tooltips
      const ttGestion = isAdmDetailMode
        ? buildAdmissionTooltip(
            item.byAdmissionGestion,
            'var(--status-gestion)',
          )
        : buildStandardTooltip(item.breakdownGestion, 'var(--status-gestion)')

      const ttPerdida = isAdmDetailMode
        ? buildAdmissionTooltip(
            item.byAdmissionPerdida,
            'var(--status-perdida)',
          )
        : buildStandardTooltip(item.breakdownPerdida, 'var(--status-perdida)')

      const ttExito = isAdmDetailMode
        ? buildAdmissionTooltip(item.byAdmissionExito, 'var(--status-exito)')
        : buildStandardTooltip(item.breakdownExito, 'var(--status-exito)')

      return `
      <tr>
        <td>
          <div class="asesor-cell">
            ${getAvatar(item.name)}
            <div class="asesor-info">
              <span class="asesor-name">${item.name}</span>
              <span class="asesor-sub">Asesora Oficial</span>
            </div>
          </div>
        </td>

        <td style="text-align:center;">
          <div class="hover-cell">
            <span class="hover-value" style="color:var(--status-gestion)">${item.gestion}</span>
            ${ttGestion}
          </div>
        </td>

        <td style="text-align:center;">
          <div class="hover-cell">
            <span class="hover-value" style="color:var(--status-perdida)">${item.perdida}</span>
            ${ttPerdida}
          </div>
        </td>

        <td style="text-align:center;">
          <div class="hover-cell">
            <span class="hover-value" style="color:var(--status-exito)">${item.exito}</span>
            ${ttExito}
          </div>
        </td>

        <td>
          <div class="rate-container">
            <div class="rate-header">
              <span>Efectividad</span>
              <strong>${rate.toFixed(2)}%</strong>
            </div>
            <div class="rate-track">
              <div class="rate-bar" style="width:${barWidth.toFixed(1)}%; background-color:${barColor};"></div>
            </div>
          </div>
        </td>

        <td style="text-align:center;">
          <span style="font-weight:800; font-size:1.05rem;">${item.total}</span>
        </td>

        <td style="text-align:center;">
          <button class="btn" style="padding:4px 8px; font-size:0.7rem;" onclick="filterByAdvisor('${item.name}')" title="Ver leads de ${item.name}">
            🔍 Leads
          </button>
        </td>
      </tr>
    `
    })
    .join('')

  tbody.innerHTML = rowsHtml

  // Footer Row with Totals
  const avgRateVal = totalGlobal > 0 ? (totalExito / totalGlobal) * 100 : 0
  const avgRateStr = avgRateVal.toFixed(2)
  const avgBarWidth =
    maxRate > 0 ? Math.min(100, Math.max(0, (avgRateVal / maxRate) * 100)) : 0

  let avgBarColor = '#dc2626'
  if (avgBarWidth >= 60) {
    avgBarColor = '#27ae60'
  } else if (avgBarWidth >= 25) {
    avgBarColor = '#f59e0b'
  } else {
    avgBarColor = '#dc2626'
  }

  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td><strong>TOTAL GENERAL</strong></td>
        <td style="text-align:center; color:var(--status-gestion);">${totalGestion}</td>
        <td style="text-align:center; color:var(--status-perdida);">${totalPerdida}</td>
        <td style="text-align:center; color:var(--status-exito);">${totalExito}</td>
        <td>
          <div class="rate-container">
            <div class="rate-header">
              <span>Promedio</span>
              <strong>${avgRateStr}%</strong>
            </div>
            <div class="rate-track">
              <div class="rate-bar" style="width:${avgBarWidth.toFixed(1)}%; background-color:${avgBarColor};"></div>
            </div>
          </div>
        </td>
        <td style="text-align:center;"><strong>${totalGlobal}</strong></td>
        <td></td>
      </tr>
    `
  }
}

// Tooltip Builders
function buildStandardTooltip(breakdown, accentColor) {
  const entries = Object.entries(breakdown).filter(([_, val]) => val > 0)
  if (entries.length === 0) {
    return `<div class="table-tooltip"><div class="tt-row"><span>Sin registros</span></div></div>`
  }

  let html = `<div class="table-tooltip">`
  html += `<div class="tt-title">Detalle por Etapa</div>`
  entries.forEach(([st, count]) => {
    html += `<div class="tt-row"><span style="color:var(--text-main); font-weight:500;"><span style="color:${accentColor}; margin-right:4px;">●</span>${st}:</span> <strong style="color:${accentColor}; font-weight:600;">${count.toLocaleString()}</strong></div>`
  })
  html += `</div>`
  return html
}

function buildAdmissionTooltip(byAdmission, accentColor) {
  const admissions = Object.keys(byAdmission)
  if (admissions.length === 0) {
    return `<div class="table-tooltip"><div class="tt-row"><span>Sin registros</span></div></div>`
  }

  let html = `<div class="table-tooltip">`
  html += `<div class="tt-title">Detalle por Admisión</div>`

  admissions.forEach((adm) => {
    const data = byAdmission[adm]
    html += `
      <div class="nested-hover">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:600; color:var(--text-main);"><span style="color:${accentColor}; margin-right:4px;">●</span>${adm}:</span>
          <strong style="color:${accentColor}; margin-left:12px; font-weight:600;">${data.total.toLocaleString()}</strong>
        </div>
        <div class="nested-tooltip">
          <div style="font-size:0.72rem; color:var(--secondary); margin-bottom:6px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #edf2f7; padding-bottom:3px;">Etapas en ${adm}</div>
          ${Object.entries(data.breakdown)
            .map(
              ([etapa, cnt]) => `
            <div class="tt-row"><span style="color:var(--text-main); font-weight:500;">${etapa}:</span> <strong style="color:${accentColor}; font-weight:600;">${cnt.toLocaleString()}</strong></div>
          `,
            )
            .join('')}
        </div>
      </div>
    `
  })

  html += `</div>`
  return html
}

// Jump from advisor row to explorer tab without modifying global filters or advisor table
function filterByAdvisor(advName) {
  explorerAdvisorFilter = advName
  currentPage = 1
  switchVisualTab('tab-explorer')
  renderExplorerTable()
}

function clearAdvisorFilter() {
  explorerAdvisorFilter = null
  currentPage = 1
  renderExplorerTable()
}

// ================= RENDER CHARTS =================
function renderCharts(advisorStats) {
  if (!window.Chart) return

  const advisers =
    typeof fAdvs !== 'undefined' && fAdvs && fAdvs.size > 0
      ? ASESORES_OFICIALES.filter((adv) => fAdvs.has(adv))
      : ASESORES_OFICIALES

  const shortNames = advisers.map((a) => {
    const parts = a.split(' ')
    return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : a
  })

  // 1. STACKED BAR CHART: PROGRESO POR ASESOR
  const progStages = [
    'Lead',
    'RMKT',
    'Open',
    'Whatsapp',
    'Buscando Respuesta',
    'Buscando Decisión',
    'Buscando Pago',
    'Pagó Matricula',
    'Pagó Matricula + DE',
    'Documentos',
  ]
  const lossStages = [
    'Próxima Admisión',
    'No Contacto',
    'Venta Cruzada',
    'Calificado Descartado',
    'No calificado',
    'Cliente OLD',
  ]

  const barDatasets = []

  // Progression datasets
  progStages.forEach((st) => {
    const stageInfo = ETAPAS_MAP[st.toLowerCase()]
    barDatasets.push({
      label: st,
      data: advisers.map(
        (adv) =>
          (advisorStats[adv] && advisorStats[adv].breakdownGestion[st]) || 0,
      ),
      backgroundColor: stageInfo ? stageInfo.color : '#3b82f6',
      borderRadius: 2,
    })
  })

  // Losses datasets
  lossStages.forEach((st) => {
    const stageInfo = ETAPAS_MAP[st.toLowerCase()]
    barDatasets.push({
      label: st,
      data: advisers.map(
        (adv) =>
          (advisorStats[adv] && advisorStats[adv].breakdownPerdida[st]) || 0,
      ),
      backgroundColor: stageInfo ? stageInfo.color : '#f43f5e',
      borderRadius: 2,
    })
  })

  // Exito dataset
  barDatasets.push({
    label: 'Cierres (Cliente)',
    data: advisers.map(
      (adv) => (advisorStats[adv] && advisorStats[adv].exito) || 0,
    ),
    backgroundColor: '#059669',
    borderRadius: 2,
  })

  const barCtx = document.getElementById('barChart')
  if (barCtx) {
    if (chartBarInstance) chartBarInstance.destroy()
    chartBarInstance = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: shortNames,
        datasets: barDatasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } },
          },
          datalabels: { display: false },
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, grid: { color: 'rgba(100, 116, 139, 0.12)' } },
        },
      },
    })
  }

  // 2. DOUGHNUT: PIPELINE C33 ACTIVOS
  const pipelineCounts = progStages.map((st) => {
    return filteredData.filter((d) => getStageInfo(d.etapa).nombre === st)
      .length
  })

  const piePipeCtx = document.getElementById('pieChartPipeline')
  if (piePipeCtx) {
    if (chartPiePipelineInstance) chartPiePipelineInstance.destroy()
    chartPiePipelineInstance = new Chart(piePipeCtx, {
      type: 'doughnut',
      data: {
        labels: progStages,
        datasets: [
          {
            data: pipelineCounts,
            backgroundColor: progStages.map(
              (st) => ETAPAS_MAP[st.toLowerCase()].color,
            ),
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 10 } },
          },
          datalabels: {
            color: '#1e293b',
            formatter: (v) => (v > 0 ? v : ''),
            font: { weight: 'bold', size: 11 },
          },
        },
      },
    })
  }

  // 3. DOUGHNUT: LOSSES & DESCARTES
  const lossCounts = lossStages.map((st) => {
    return filteredData.filter((d) => getStageInfo(d.etapa).nombre === st)
      .length
  })

  const pieLossCtx = document.getElementById('pieChartLoss')
  if (pieLossCtx) {
    if (chartPieLossInstance) chartPieLossInstance.destroy()
    chartPieLossInstance = new Chart(pieLossCtx, {
      type: 'doughnut',
      data: {
        labels: lossStages,
        datasets: [
          {
            data: lossCounts,
            backgroundColor: lossStages.map(
              (st) => ETAPAS_MAP[st.toLowerCase()].color,
            ),
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 10 } },
          },
          datalabels: {
            color: '#1e293b',
            formatter: (v) => (v > 0 ? v : ''),
            font: { weight: 'bold', size: 11 },
          },
        },
      },
    })
  }

  // 4. BAR: ACADEMIC PROGRAMS
  const progCountMap = {}
  filteredData.forEach((d) => {
    const p = d.programa || 'Sin Programa'
    progCountMap[p] = (progCountMap[p] || 0) + 1
  })
  const progLabels = Object.keys(progCountMap)
    .sort((a, b) => progCountMap[b] - progCountMap[a])
    .slice(0, 7)

  const barProgCtx = document.getElementById('barChartPrograms')
  if (barProgCtx) {
    if (chartBarProgramsInstance) chartBarProgramsInstance.destroy()
    chartBarProgramsInstance = new Chart(barProgCtx, {
      type: 'bar',
      data: {
        labels: progLabels,
        datasets: [
          {
            label: 'Leads por Programa',
            data: progLabels.map((p) => progCountMap[p]),
            backgroundColor: '#3b82f6',
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            anchor: 'end',
            align: 'end',
            color: '#64748b',
            font: { weight: 'bold', size: 11 },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(100, 116, 139, 0.12)' } },
          y: { grid: { display: false } },
        },
      },
    })
  }

  // 5. DONUT: ORIGIN CHANNELS
  const originCountMap = {}
  filteredData.forEach((d) => {
    const o = d.origen || 'Sin Origen'
    originCountMap[o] = (originCountMap[o] || 0) + 1
  })
  const originLabels = Object.keys(originCountMap)
    .sort((a, b) => originCountMap[b] - originCountMap[a])
    .slice(0, 6)

  const donutOrigCtx = document.getElementById('donutChartOrigins')
  if (donutOrigCtx) {
    if (chartDonutOriginsInstance) chartDonutOriginsInstance.destroy()
    chartDonutOriginsInstance = new Chart(donutOrigCtx, {
      type: 'doughnut',
      data: {
        labels: originLabels,
        datasets: [
          {
            data: originLabels.map((o) => originCountMap[o]),
            backgroundColor: [
              '#0284c7',
              '#2563eb',
              '#7c3aed',
              '#d97706',
              '#059669',
              '#64748b',
            ],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 10 } },
          },
          datalabels: { display: false },
        },
      },
    })
  }
}

// ================= RENDER EXPLORER TABLE & PAGINATION =================
function renderExplorerTable() {
  const tbody = document.getElementById('table-body-explorer')
  const countEl = document.getElementById('explorer-count')
  const pageInfo = document.getElementById('pagination-info')
  const btnPrev = document.getElementById('btn-page-prev')
  const btnNext = document.getElementById('btn-page-next')
  const badgeEl = document.getElementById('explorer-advisor-badge')
  const nameEl = document.getElementById('explorer-advisor-name')

  if (!tbody) return

  // Apply advisor-specific filter if triggered from the performance table
  let displayData = filteredData
  if (explorerAdvisorFilter) {
    displayData = filteredData.filter(
      (r) => r.responsable === explorerAdvisorFilter,
    )
    if (badgeEl && nameEl) {
      badgeEl.style.display = 'inline-flex'
      nameEl.innerText = explorerAdvisorFilter
    }
  } else {
    if (badgeEl) {
      badgeEl.style.display = 'none'
    }
  }

  const total = displayData.length
  if (countEl) countEl.innerText = total.toLocaleString()

  const totalPages = Math.ceil(total / rowsPerPage) || 1
  if (currentPage > totalPages) currentPage = totalPages
  if (currentPage < 1) currentPage = 1

  if (pageInfo) pageInfo.innerText = `Página ${currentPage} de ${totalPages}`
  if (btnPrev) btnPrev.disabled = currentPage <= 1
  if (btnNext) btnNext.disabled = currentPage >= totalPages

  const start = (currentPage - 1) * rowsPerPage
  const pageRows = displayData.slice(start, start + rowsPerPage)

  if (pageRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">No se encontraron negociaciones para este criterio.</td></tr>`
    return
  }

  tbody.innerHTML = pageRows
    .map((row) => {
      const stInfo = getStageInfo(row.etapa)
      const bitrixUrl =
        row.url_bitrix ||
        `https://baltic.bitrix24.es/crm/deal/details/${row.id}/`

      return `
      <tr>
        <td><strong>#${row.id}</strong></td>
        <td>
          <div style="font-weight:700;">${row.responsable}</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">${row.pipeline}</div>
        </td>
        <td>
          <span class="stage-badge" style="background:${stInfo.color}22; color:${stInfo.color}; border:1px solid ${stInfo.color}55;">
            ● ${stInfo.nombre}
          </span>
        </td>
        <td>${row.programa || '<span style="color:var(--text-light);">-</span>'}</td>
        <td><span style="font-size:0.75rem; color:var(--text-muted);">${row.origen || '-'}</span></td>
        <td>
          <span style="font-size:0.75rem; font-weight:700; color:${row.calificacion_ia === 'Interesado' ? 'var(--status-exito)' : 'var(--text-muted)'};">
            ${row.calificacion_ia || '-'}
          </span>
        </td>
        <td style="font-size:0.75rem; color:var(--text-muted);">${row.creado || '-'}</td>
        <td>
          <a href="${bitrixUrl}" target="_blank" rel="noopener noreferrer" class="bitrix-link">
            <span>Bitrix24 ↗</span>
          </a>
        </td>
      </tr>
    `
    })
    .join('')
}

function changePage(delta) {
  currentPage += delta
  renderExplorerTable()
}

// ================= TAB SWITCHER =================
function switchVisualTab(tabId) {
  document
    .querySelectorAll('.tabs-nav .tab-btn')
    .forEach((btn) => btn.classList.remove('active'))
  document
    .querySelectorAll('.tab-content')
    .forEach((c) => c.classList.remove('active'))

  const target = document.getElementById(tabId)
  if (target) {
    target.classList.add('active')
  }

  // Highlight active tab button
  const index = ['tab-bar', 'tab-pie', 'tab-analytics', 'tab-explorer'].indexOf(
    tabId,
  )
  if (index >= 0) {
    const buttons = document.querySelectorAll('.tabs-nav .tab-btn')
    if (buttons[index]) buttons[index].classList.add('active')
  }

  // Trigger chart resize
  if (chartBarInstance) chartBarInstance.resize()
  if (chartPiePipelineInstance) chartPiePipelineInstance.resize()
  if (chartPieLossInstance) chartPieLossInstance.resize()
  if (chartBarProgramsInstance) chartBarProgramsInstance.resize()
  if (chartDonutOriginsInstance) chartDonutOriginsInstance.resize()
}

// ================= MODAL CONTROLLERS =================
function openModal(id) {
  const modal = document.getElementById(id)
  if (modal) modal.classList.add('show')
}

function closeModal(id) {
  const modal = document.getElementById(id)
  if (modal) modal.classList.remove('show')
}

// ================= EXPORT TO CSV =================
function exportToCSV() {
  if (filteredData.length === 0) {
    alert('No hay datos filtrados para exportar.')
    return
  }

  const headers = [
    'ID',
    'Pipeline',
    'Etapa',
    'Responsable',
    'Programa',
    'Origen',
    'Fecha Creacion',
    'Calificacion IA',
    'Telefono',
    'URL Bitrix',
  ]

  const targetExportData = explorerAdvisorFilter
    ? filteredData.filter((d) => d.responsable === explorerAdvisorFilter)
    : filteredData

  const rows = targetExportData.map((d) => [
    `"${d.id}"`,
    `"${d.pipeline}"`,
    `"${getStageInfo(d.etapa).nombre}"`,
    `"${d.responsable}"`,
    `"${d.programa}"`,
    `"${d.origen}"`,
    `"${d.creado}"`,
    `"${d.calificacion_ia}"`,
    `"${d.phone_ia}"`,
    `"${d.url_bitrix}"`,
  ])

  const csvContent =
    '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `IEmpresa_Reporte_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ================= THEME INITIALIZATION (LIGHT MODE ONLY) =================
function initTheme() {
  document.documentElement.setAttribute('data-theme', 'light')
  localStorage.removeItem('iempresa_theme')
}

// ====================================================================
// ============= ADMIN FILTER CONFIGURATION MODULE (5 CLICS) ==========
// ====================================================================

// Helper criptográfico: Hash seguro SHA-256 (Web Crypto API)
async function hashPasswordSHA256(plainText) {
  if (!plainText) return ''
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(plainText)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch (e) {
    console.warn('Error en crypto.subtle.digest:', e)
    return plainText
  }
}

// SHA-256 de 'admin123'
const DEFAULT_ADMIN_PASSWORD_HASH =
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'

const ALL_ADMIN_FILTER_KEYS = [
  'fitem-crea',
  'fitem-adv',
  'fitem-pipeline',
  'fitem-stage',
  'fitem-cambio',
  'fitem-atajos',
  'fitem-program',
  'fitem-origin',
  'fitem-ciudad',
  'fitem-nivel',
  'fitem-medio',
  'fitem-ia',
  'fgroup-utm',
  'fgroup-chatfuel',
  'fgroup-rmkt',
]

const DEFAULT_ADMIN_CONFIG = {
  filters: {
    'fitem-crea': true,
    'fitem-adv': true,
    'fitem-pipeline': true,
    'fitem-stage': true,
    'fitem-cambio': true,
    'fitem-atajos': true,
    'fitem-program': true,
    'fitem-origin': true,
    'fitem-ciudad': true,
    'fitem-nivel': true,
    'fitem-medio': true,
    'fitem-ia': true,
    'fgroup-utm': true,
    'fgroup-chatfuel': true,
    'fgroup-rmkt': true,
  },
  admin_password: DEFAULT_ADMIN_PASSWORD_HASH,
}

let currentAdminConfig = {
  filters: { ...DEFAULT_ADMIN_CONFIG.filters },
  admin_password: DEFAULT_ADMIN_CONFIG.admin_password,
}
let isSupabaseConfigTableAvailable = false
let adminClickCount = 0
let adminClickTimer = null

// Detector de 5 clics seguidos en el badge de Supabase
function handleAdminBadgeClick() {
  adminClickCount++
  clearTimeout(adminClickTimer)

  if (adminClickCount >= 5) {
    adminClickCount = 0
    openAdminAuthModal()
    return
  }

  // Ventana de 2.5 segundos para completar los 5 clics
  adminClickTimer = setTimeout(() => {
    adminClickCount = 0
  }, 2500)
}

// Carga inicial y aplicación inmediata de visibilidad de filtros
function initAdminFilterConfig() {
  try {
    const saved = localStorage.getItem('iempresa_admin_config')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === 'object') {
        currentAdminConfig = {
          filters: {
            ...DEFAULT_ADMIN_CONFIG.filters,
            ...(parsed.filters || {}),
          },
          admin_password:
            parsed.admin_password || DEFAULT_ADMIN_CONFIG.admin_password,
          updated_at: parsed.updated_at || null,
        }
      }
    }
  } catch (e) {
    console.warn('Error leyendo iempresa_admin_config de localStorage:', e)
  }

  // Aplicar inmediatamente a los elementos del DOM
  applyFilterVisibility(currentAdminConfig.filters)
}

// Sincronización en segundo plano con la tabla iempresa_config_filtros de Supabase
async function syncAdminFilterConfigWithSupabase() {
  if (!supabaseClient) return
  try {
    const { data, error } = await supabaseClient
      .from('iempresa_config_filtros')
      .select('*')
      .eq('id', 'active_filters')
      .single()

    if (!error && data) {
      isSupabaseConfigTableAvailable = true
      if (data.config) {
        currentAdminConfig.filters = {
          ...DEFAULT_ADMIN_CONFIG.filters,
          ...data.config,
        }
      }
      if (data.admin_password) {
        currentAdminConfig.admin_password = data.admin_password
      }
      currentAdminConfig.updated_at = data.updated_at || null

      try {
        localStorage.setItem(
          'iempresa_admin_config',
          JSON.stringify(currentAdminConfig),
        )
      } catch (e) {}

      // Re-aplicar visibilidad remota
      applyFilterVisibility(currentAdminConfig.filters)
    } else if (
      error &&
      (error.code === 'PGRST205' ||
        (error.message && error.message.includes('Could not find')))
    ) {
      isSupabaseConfigTableAvailable = false
    }
  } catch (e) {
    console.warn('syncAdminFilterConfigWithSupabase exception:', e)
  }
}

// Aplica la visibilidad a los 14 filtros y oculta automáticamente las categorías vacías
function applyFilterVisibility(filters) {
  if (!filters) return

  // Categoría 1: Filtros Principales (3 filtros)
  const cat1 = ['fitem-crea', 'fitem-adv', 'fitem-pipeline']
  let cat1Active = 0
  cat1.forEach((id) => {
    const el = document.getElementById(id)
    const isVisible = filters[id] !== false
    if (el) {
      el.style.display = isVisible ? '' : 'none'
      if (isVisible) cat1Active++
    }
  })
  const sec1 = document.getElementById('sec-filtros-1')
  if (sec1) {
    sec1.style.display = cat1Active > 0 ? '' : 'none'
  }

  // Categoría 2: Etapas & Fecha de Cambio (2 filtros + atajos opcionales)
  const cat2 = ['fitem-stage', 'fitem-cambio']
  let cat2Active = 0
  cat2.forEach((id) => {
    const el = document.getElementById(id)
    const isVisible = filters[id] !== false
    if (el) {
      el.style.display = isVisible ? '' : 'none'
      if (isVisible) cat2Active++
    }
  })
  const sec2 = document.getElementById('sec-filtros-2')
  if (sec2) {
    sec2.style.display = cat2Active > 0 ? '' : 'none'
  }

  // Atajos rápidos (Contactables / No Contactables)
  const elAtajos = document.getElementById('filter-pills-atajos')
  if (elAtajos) {
    elAtajos.style.display = filters['fitem-atajos'] !== false ? 'flex' : 'none'
  }

  // Categoría 3: Segmentación de Leads (Filtros Adicionales) (6 filtros)
  const cat3 = [
    'fitem-program',
    'fitem-origin',
    'fitem-ciudad',
    'fitem-nivel',
    'fitem-medio',
    'fitem-ia',
  ]
  let cat3Active = 0
  cat3.forEach((id) => {
    const el = document.getElementById(id)
    const isVisible = filters[id] !== false
    if (el) {
      el.style.display = isVisible ? '' : 'none'
      if (isVisible) cat3Active++
    }
  })
  const sec3 = document.getElementById('sec-filtros-3')
  if (sec3) {
    sec3.style.display = cat3Active > 0 ? '' : 'none'
  }

  // Categoría 4: Filtros de Campaña, Atribución y Remarketing (3 grupos)
  const cat4 = ['fgroup-utm', 'fgroup-chatfuel', 'fgroup-rmkt']
  let cat4Active = 0
  cat4.forEach((id) => {
    const el = document.getElementById(id)
    const isVisible = filters[id] !== false
    if (el) {
      el.style.display = isVisible ? '' : 'none'
      if (isVisible) cat4Active++
    }
  })
  const sec4 =
    document.getElementById('sec-filtros-4') ||
    document.getElementById('grouped-filters-box')
  if (sec4) {
    sec4.style.display = cat4Active > 0 ? '' : 'none'
  }
}

// Limpia cualquier filtro que haya quedado seleccionado si fue ocultado por el admin
function resetHiddenFiltersState(filters) {
  let needsUpdate = false

  if (filters['fitem-crea'] === false && (fCreaStart || fCreaEnd)) {
    fCreaStart = ''
    fCreaEnd = ''
    const startInput = document.getElementById('crea-start')
    const endInput = document.getElementById('crea-end')
    if (startInput) startInput.value = ''
    if (endInput) endInput.value = ''
    const lbl = document.getElementById('lbl-crea')
    if (lbl) lbl.innerText = 'Todas las fechas'
    const cnt = document.getElementById('count-crea')
    if (cnt) cnt.innerText = 'Todo'
    needsUpdate = true
  }

  if (filters['fitem-adv'] === false && fAdvs.size > 0) {
    fAdvs.clear()
    const lbl = document.getElementById('lbl-adv')
    if (lbl) lbl.innerText = 'Todos los asesores'
    const cnt = document.getElementById('count-adv')
    if (cnt) cnt.innerText = 'Todo'
    needsUpdate = true
  }

  if (filters['fitem-pipeline'] === false && fPipelines.size > 0) {
    fPipelines.clear()
    const lbl = document.getElementById('lbl-pipeline')
    if (lbl) lbl.innerText = 'Todas las admisiones'
    const cnt = document.getElementById('count-pipeline')
    if (cnt) cnt.innerText = 'Todo'
    needsUpdate = true
  }

  if (filters['fitem-stage'] === false && fStages.size > 0) {
    fStages.clear()
    const lbl = document.getElementById('lbl-stage')
    if (lbl) lbl.innerText = 'Todas las etapas'
    const cnt = document.getElementById('count-stage')
    if (cnt) cnt.innerText = 'Todo'
    needsUpdate = true
  }

  if (filters['fitem-cambio'] === false && (fCambioStart || fCambioEnd)) {
    fCambioStart = ''
    fCambioEnd = ''
    const startInput = document.getElementById('cambio-start')
    const endInput = document.getElementById('cambio-end')
    if (startInput) startInput.value = ''
    if (endInput) endInput.value = ''
    const lbl = document.getElementById('lbl-cambio')
    if (lbl) lbl.innerText = 'Todas las fechas'
    const cnt = document.getElementById('count-cambio')
    if (cnt) cnt.innerText = 'Todo'
    needsUpdate = true
  }

  if (filters['fitem-atajos'] === false && quickGroup !== 'all') {
    quickGroup = 'all'
    document.querySelectorAll('.filter-group-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.id === 'btn-group-all')
    })
    needsUpdate = true
  }

  if (filters['fitem-program'] === false && fPrograms.size > 0) {
    fPrograms.clear()
    needsUpdate = true
  }
  if (filters['fitem-origin'] === false && fOrigins.size > 0) {
    fOrigins.clear()
    needsUpdate = true
  }
  if (filters['fitem-ciudad'] === false && fCiudades.size > 0) {
    fCiudades.clear()
    needsUpdate = true
  }
  if (filters['fitem-nivel'] === false && fNiveles.size > 0) {
    fNiveles.clear()
    needsUpdate = true
  }
  if (filters['fitem-medio'] === false && fMedios.size > 0) {
    fMedios.clear()
    needsUpdate = true
  }
  if (filters['fitem-ia'] === false && fIAs.size > 0) {
    fIAs.clear()
    needsUpdate = true
  }

  if (filters['fgroup-utm'] === false) {
    if (
      fUtmSource.size > 0 ||
      fUtmMedium.size > 0 ||
      fUtmCampaign.size > 0 ||
      fUtmContent.size > 0 ||
      fUtmTerm.size > 0
    ) {
      fUtmSource.clear()
      fUtmMedium.clear()
      fUtmCampaign.clear()
      fUtmContent.clear()
      fUtmTerm.clear()
      needsUpdate = true
    }
  }

  if (filters['fgroup-chatfuel'] === false) {
    if (
      fOrigenChatfuel.size > 0 ||
      fUtmCampaignCh.size > 0 ||
      fUtmContentCh.size > 0 ||
      fUtmTermCh.size > 0
    ) {
      fOrigenChatfuel.clear()
      fUtmCampaignCh.clear()
      fUtmContentCh.clear()
      fUtmTermCh.clear()
      needsUpdate = true
    }
  }

  if (filters['fgroup-rmkt'] === false) {
    if (
      fRmktOrigen.size > 0 ||
      fRmktRespuesta.size > 0 ||
      fRmktNombre.size > 0 ||
      fRmktDetalles.size > 0 ||
      fRmktInteres.size > 0
    ) {
      fRmktOrigen.clear()
      fRmktRespuesta.clear()
      fRmktNombre.clear()
      fRmktDetalles.clear()
      fRmktInteres.clear()
      needsUpdate = true
    }
  }

  if (needsUpdate) {
    populateFilterOptions()
    updateAll()
  }
}

// Modal de Autenticación
function openAdminAuthModal() {
  const modal = document.getElementById('modal-admin-auth')
  const input = document.getElementById('admin-password-input')
  const error = document.getElementById('admin-auth-error')
  if (error) {
    error.style.display = 'none'
    error.innerText = ''
  }
  if (input) {
    input.value = ''
  }
  if (modal) modal.classList.add('active')
  setTimeout(() => {
    if (input) input.focus()
  }, 100)
}

function closeAdminAuthModal() {
  const modal = document.getElementById('modal-admin-auth')
  if (modal) modal.classList.remove('active')
}

async function submitAdminAuth() {
  const input = document.getElementById('admin-password-input')
  const error = document.getElementById('admin-auth-error')
  const entered = (input ? input.value : '').trim()

  const currentPass = currentAdminConfig.admin_password || DEFAULT_ADMIN_PASSWORD_HASH

  // Hashing de la contraseña ingresada
  const enteredHash = await hashPasswordSHA256(entered)

  // Comparación segura (soporta hash SHA-256 y retrocompatibilidad con contraseñas no migradas)
  const isMatch = enteredHash === currentPass || entered === currentPass

  if (isMatch) {
    // Si la contraseña actual estaba en texto plano, migrarla internamente al hash SHA-256
    if (currentAdminConfig.admin_password !== enteredHash) {
      currentAdminConfig.admin_password = enteredHash
      try {
        localStorage.setItem(
          'iempresa_admin_config',
          JSON.stringify(currentAdminConfig),
        )
      } catch (e) {}
    }

    closeAdminAuthModal()
    openAdminConfigModal()
  } else {
    if (error) {
      error.style.display = 'block'
      error.innerText =
        'Contraseña incorrecta. Por favor ingrese la contraseña correcta.'
    }
    if (input) {
      input.select()
      input.focus()
    }
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId)
  if (!input) return
  if (input.type === 'password') {
    input.type = 'text'
    if (btn) btn.innerText = '🙈'
  } else {
    input.type = 'password'
    if (btn) btn.innerText = '👁️'
  }
}

// Modal de Configuración
function openAdminConfigModal() {
  const modal = document.getElementById('modal-admin-config')
  if (!modal) return

  // Cargar estado de checkboxes
  const filters = currentAdminConfig.filters || {}
  ALL_ADMIN_FILTER_KEYS.forEach((key) => {
    const chk = document.getElementById(`chk-cfg-${key}`)
    if (chk) {
      chk.checked = filters[key] !== false
    }
  })

  // Reset inputs de contraseña nueva
  const newPass = document.getElementById('admin-new-pass')
  const confPass = document.getElementById('admin-confirm-pass')
  if (newPass) newPass.value = ''
  if (confPass) confPass.value = ''

  updateAdminCounters()
  updateAdminSyncStatusUI()

  modal.classList.add('active')
}

function closeAdminConfigModal() {
  const modal = document.getElementById('modal-admin-config')
  if (modal) modal.classList.remove('active')
}

function setAllAdminFilters(state) {
  ALL_ADMIN_FILTER_KEYS.forEach((key) => {
    const chk = document.getElementById(`chk-cfg-${key}`)
    if (chk) chk.checked = state
  })
  updateAdminCounters()
}

function updateAdminCounters() {
  let totalActive = 0

  // Cat 1
  const cat1 = ['fitem-crea', 'fitem-adv', 'fitem-pipeline']
  let c1 = 0
  cat1.forEach((k) => {
    const chk = document.getElementById(`chk-cfg-${k}`)
    if (chk && chk.checked) c1++
  })
  const cnt1 = document.getElementById('admin-cat-counter-1')
  const box1 = document.getElementById('admin-catbox-1')
  if (cnt1) {
    cnt1.innerText = `${c1}/3 activos`
    cnt1.className = c1 === 0 ? 'admin-cat-counter zero' : 'admin-cat-counter'
  }
  if (box1)
    box1.className = c1 === 0 ? 'admin-cat-box all-hidden' : 'admin-cat-box'
  totalActive += c1

  // Cat 2
  const cat2 = ['fitem-stage', 'fitem-cambio', 'fitem-atajos']
  let c2 = 0
  cat2.forEach((k) => {
    const chk = document.getElementById(`chk-cfg-${k}`)
    if (chk && chk.checked) c2++
  })
  const cnt2 = document.getElementById('admin-cat-counter-2')
  const box2 = document.getElementById('admin-catbox-2')
  if (cnt2) {
    cnt2.innerText = `${c2}/3 activos`
    cnt2.className = c2 === 0 ? 'admin-cat-counter zero' : 'admin-cat-counter'
  }
  if (box2)
    box2.className = c2 === 0 ? 'admin-cat-box all-hidden' : 'admin-cat-box'
  totalActive += c2

  // Cat 3
  const cat3 = [
    'fitem-program',
    'fitem-origin',
    'fitem-ciudad',
    'fitem-nivel',
    'fitem-medio',
    'fitem-ia',
  ]
  let c3 = 0
  cat3.forEach((k) => {
    const chk = document.getElementById(`chk-cfg-${k}`)
    if (chk && chk.checked) c3++
  })
  const cnt3 = document.getElementById('admin-cat-counter-3')
  const box3 = document.getElementById('admin-catbox-3')
  if (cnt3) {
    cnt3.innerText = `${c3}/6 activos`
    cnt3.className = c3 === 0 ? 'admin-cat-counter zero' : 'admin-cat-counter'
  }
  if (box3)
    box3.className = c3 === 0 ? 'admin-cat-box all-hidden' : 'admin-cat-box'
  totalActive += c3

  // Cat 4
  const cat4 = ['fgroup-utm', 'fgroup-chatfuel', 'fgroup-rmkt']
  let c4 = 0
  cat4.forEach((k) => {
    const chk = document.getElementById(`chk-cfg-${k}`)
    if (chk && chk.checked) c4++
  })
  const cnt4 = document.getElementById('admin-cat-counter-4')
  const box4 = document.getElementById('admin-catbox-4')
  if (cnt4) {
    cnt4.innerText = `${c4}/3 activos`
    cnt4.className = c4 === 0 ? 'admin-cat-counter zero' : 'admin-cat-counter'
  }
  if (box4)
    box4.className = c4 === 0 ? 'admin-cat-box all-hidden' : 'admin-cat-box'
  totalActive += c4

  const badge = document.getElementById('admin-active-count-badge')
  if (badge) {
    badge.innerText = `${totalActive} / 15 Filtros Activos`
  }
}

// Guardar configuración (Supabase + localStorage)
async function saveAdminConfig() {
  const saveBtn = document.getElementById('btn-save-admin-config')
  if (saveBtn) {
    saveBtn.disabled = true
    saveBtn.innerHTML = '<span>⏳ Guardando...</span>'
  }

  const newFilters = {}
  ALL_ADMIN_FILTER_KEYS.forEach((key) => {
    const chk = document.getElementById(`chk-cfg-${key}`)
    newFilters[key] = chk ? chk.checked : true
  })

  // Validación y cambio de contraseña opcional
  const newPassInput = document.getElementById('admin-new-pass')
  const confPassInput = document.getElementById('admin-confirm-pass')
  const newPass = (newPassInput ? newPassInput.value : '').trim()
  const confPass = (confPassInput ? confPassInput.value : '').trim()

  if (newPass) {
    if (newPass.length < 4) {
      alert('La nueva contraseña debe tener al menos 4 caracteres.')
      if (saveBtn) {
        saveBtn.disabled = false
        saveBtn.innerHTML = '<span>💾 Guardar y Aplicar Cambios</span>'
      }
      return
    }
    if (newPass !== confPass) {
      alert('Las contraseñas ingresadas no coinciden. Por favor verifique.')
      if (saveBtn) {
        saveBtn.disabled = false
        saveBtn.innerHTML = '<span>💾 Guardar y Aplicar Cambios</span>'
      }
      return
    }
    // Encriptar / hashear la contraseña en SHA-256
    currentAdminConfig.admin_password = await hashPasswordSHA256(newPass)
  } else {
    // Si la contraseña actual guardada aún estaba en texto plano, encriptarla
    if (
      currentAdminConfig.admin_password &&
      currentAdminConfig.admin_password.length !== 64
    ) {
      currentAdminConfig.admin_password = await hashPasswordSHA256(
        currentAdminConfig.admin_password,
      )
    }
  }

  currentAdminConfig.filters = newFilters
  currentAdminConfig.updated_at = new Date().toISOString()

  // 1. Guardar en localStorage de inmediato
  try {
    localStorage.setItem(
      'iempresa_admin_config',
      JSON.stringify(currentAdminConfig),
    )
  } catch (e) {
    console.warn('Error al guardar en localStorage:', e)
  }

  // 2. Aplicar visibilidad en pantalla
  applyFilterVisibility(currentAdminConfig.filters)
  resetHiddenFiltersState(currentAdminConfig.filters)

  // 3. Guardar en Supabase en tiempo real
  let supabaseSuccess = false
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('iempresa_config_filtros')
        .upsert({
          id: 'active_filters',
          config: currentAdminConfig.filters,
          admin_password: currentAdminConfig.admin_password,
          updated_at: currentAdminConfig.updated_at,
        })

      if (!error) {
        supabaseSuccess = true
        isSupabaseConfigTableAvailable = true
      } else {
        console.warn('Supabase upsert error:', error)
      }
    } catch (err) {
      console.warn('Excepción al conectar con Supabase:', err)
    }
  }

  if (saveBtn) {
    saveBtn.disabled = false
    saveBtn.innerHTML = '<span>💾 Guardar y Aplicar Cambios</span>'
  }

  closeAdminConfigModal()

  if (supabaseSuccess) {
    showAdminToast(
      '✅ Configuración guardada en Supabase y sincronizada con todos los usuarios.',
    )
  } else {
    showAdminToast(
      '⚠️ Guardado localmente. Cree la tabla iempresa_config_filtros en Supabase para sincronizar con todos los usuarios.',
    )
  }
}

// Helpers de Interfaz
function showAdminToast(msg) {
  let toast = document.getElementById('admin-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'admin-toast'
    toast.className = 'admin-toast'
    document.body.appendChild(toast)
  }
  toast.innerText = msg
  toast.classList.add('show')
  setTimeout(() => {
    toast.classList.remove('show')
  }, 4500)
}

function handleModalOverlayClick(event, modalId) {
  if (event.target.id === modalId) {
    const modal = document.getElementById(modalId)
    if (modal) modal.classList.remove('active')
  }
}

function toggleSqlHelperModal() {
  const modal = document.getElementById('modal-admin-sql')
  if (!modal) return
  modal.classList.toggle('active')
}

function copySqlScriptToClipboard() {
  const codeEl = document.getElementById('admin-sql-code-text')
  const text = codeEl ? codeEl.innerText : ''
  if (!text) return
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const btnText = document.getElementById('btn-copy-sql-text')
      if (btnText) {
        btnText.innerText = '✅ ¡Copiado al Portapapeles!'
        setTimeout(() => {
          btnText.innerText = '📋 Copiar Script SQL'
        }, 2500)
      }
    })
    .catch(() => {
      alert('Script copiado (seleccione manualmente si no se copió).')
    })
}

function updateAdminSyncStatusUI() {
  const box = document.getElementById('admin-sync-status-box')
  const icon = document.getElementById('admin-sync-icon')
  const title = document.getElementById('admin-sync-title')
  const desc = document.getElementById('admin-sync-desc')

  if (!box || !title || !desc) return

  if (isSupabaseConfigTableAvailable) {
    box.className = 'admin-sync-box synced'
    if (icon) icon.innerText = '🟢'
    title.innerText = 'Sincronización en la Nube con Supabase Activa'
    desc.innerText =
      'La tabla iempresa_config_filtros está conectada. Los cambios aplicarán a todos los usuarios.'
  } else {
    box.className = 'admin-sync-box local'
    if (icon) icon.innerText = '🟡'
    title.innerText = 'Modo Local (Tabla Supabase aún no creada)'
    desc.innerText =
      'Los cambios se guardan en este navegador. Para compartirlos con todos los usuarios, ejecute el Script SQL provisto en Supabase.'
  }
}
