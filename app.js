const SUPABASE_URL = 'https://ytgziytuldsqhymqjyig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0Z3ppeXR1bGRzcWh5bXFqeWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjA4ODAsImV4cCI6MjA5Nzc5Njg4MH0.z4KapPX5bGEXRmS-Ntky0XmYZz45s5j1DpBuPgE_PIU';

let TOKEN = localStorage.getItem('brk_token') || null;
let ROL = localStorage.getItem('brk_rol') || null;
let KAM_ASIGNADOS = JSON.parse(localStorage.getItem('brk_kam_asignados') || '[]');

async function rpc(fn, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(params)
  });
  const data = await res.json();
  if (data && data.ok === false && data.error === 'Sesión inválida') {
    localStorage.removeItem('brk_token');
    TOKEN = null;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login').classList.remove('hidden');
    const errEl = document.getElementById('loginErr');
    if (errEl) errEl.textContent = 'Tu sesión expiró. Vuelve a iniciar sesión.';
  }
  return data;
}

const money = n => '$' + Math.round(n||0).toLocaleString('es-CO');
const moneyShort = n => {
  n = n||0;
  if (Math.abs(n) >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n/1e3).toFixed(0) + 'K';
  return '$' + Math.round(n);
};

// ---- LOGIN ----
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('loginErr');
  errEl.textContent = '';
  const r = await rpc('dash_login', { p_email: email, p_password: password });
  if (r.ok) {
    TOKEN = r.token;
    ROL = r.rol || 'admin';
    KAM_ASIGNADOS = r.kam_asignados || [];
    localStorage.setItem('brk_token', TOKEN);
    localStorage.setItem('brk_rol', ROL);
    localStorage.setItem('brk_kam_asignados', JSON.stringify(KAM_ASIGNADOS));
    showApp();
  } else {
    errEl.textContent = r.error || 'Error al iniciar sesión';
  }
});

document.getElementById('usuariosBtn').addEventListener('click', () => {
  document.querySelectorAll('#app > main > .tabs > .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('main > div[id^="view-"]').forEach(v => v.classList.add('hidden'));
  document.getElementById('sub-oportunidades').classList.add('hidden');
  document.getElementById('oportunidades-filtro').classList.add('hidden');
  document.getElementById('view-usuarios').classList.remove('hidden');
  loadUsuarios();
});

document.getElementById('cargarVentasBtn').addEventListener('click', () => {
  document.querySelectorAll('#app > main > .tabs > .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('main > div[id^="view-"]').forEach(v => v.classList.add('hidden'));
  document.getElementById('sub-oportunidades').classList.add('hidden');
  document.getElementById('oportunidades-filtro').classList.add('hidden');
  document.getElementById('view-cargar').classList.remove('hidden');
  loadTab('cargar');
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('brk_token');
  localStorage.removeItem('brk_rol');
  localStorage.removeItem('brk_kam_asignados');
  TOKEN = null; ROL = null; KAM_ASIGNADOS = [];
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login').classList.remove('hidden');
});

// ---- TABS ----
document.querySelectorAll('#app > main > .tabs > .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#app > main > .tabs > .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('main > div[id^="view-"]').forEach(v => v.classList.add('hidden'));
    const view = document.getElementById('view-' + tab.dataset.tab);
    view.classList.remove('hidden');
    document.getElementById('sub-oportunidades').classList.toggle('hidden', tab.dataset.tab !== 'oportunidades');
    document.getElementById('oportunidades-filtro').classList.toggle('hidden', tab.dataset.tab !== 'oportunidades' || ROL === 'colaborador');
    loadTab(tab.dataset.tab);
  });
});

document.querySelectorAll('#sub-oportunidades .tab').forEach(sub => {
  sub.addEventListener('click', () => {
    document.querySelectorAll('#sub-oportunidades .tab').forEach(t => t.classList.remove('active'));
    sub.classList.add('active');
    ['gapdiscos','gapliquidos','gapcilindros'].forEach(s => {
      document.getElementById('view-' + s).classList.toggle('hidden', s !== sub.dataset.subtab);
    });
    loadTab(sub.dataset.subtab);
  });
});

async function showApp() {
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  if (!ROL) ROL = 'admin'; // sesiones antiguas antes de roles
  aplicarRestriccionesRol();
  loadTab('ejecutivo');
  setTimeout(ajustarStickyResponsive, 50);
}

const TABS_SIN_ACCESO_GERENCIA = ['oportunidades','segmentacion','perdidos','planes'];

function aplicarRestriccionesRol() {
  const btnUsuarios = document.getElementById('usuariosBtn');
  const btnData = document.getElementById('cargarVentasBtn');
  if (btnUsuarios) btnUsuarios.classList.toggle('hidden', ROL !== 'admin');
  if (btnData) btnData.classList.toggle('hidden', ROL !== 'admin');

  document.querySelectorAll('#app > main > .tabs > .tab').forEach(tab => {
    const oculto = ROL === 'gerencia' && TABS_SIN_ACCESO_GERENCIA.includes(tab.dataset.tab);
    tab.classList.toggle('hidden', oculto);
  });
}

function ocultarFiltroKamSiColaborador(idsSelectYBoton) {
  if (ROL !== 'colaborador') return;
  idsSelectYBoton.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

async function loadTab(tab) {
  if (tab === 'ejecutivo') return loadEjecutivo();
  if (tab === 'oportunidades' || tab === 'gapdiscos') return loadGapDiscos();
  if (tab === 'gapliquidos') return loadGapLiquidos();
  if (tab === 'gapcilindros') return loadGapCilindros();
  if (tab === 'tipoa') return loadTipoA();
  if (tab === 'clientes') return loadClientes();
  if (tab === 'segmentacion') return loadSegmentacion();
  if (tab === 'ticket') return loadTicket();
  if (tab === 'portafolio') return loadPortafolio();
  if (tab === 'perdidos') return loadPerdidos();
  if (tab === 'planes') return loadPlanes();
  if (tab === 'remisiones') return loadRemisiones();
  if (tab === 'tablerocontrol') return loadTableroControl();
  if (tab === 'cartera') return loadCartera();
  if (tab === 'facilitadores') return loadFacilitadores();
  if (tab === 'cargar') return loadCargarVentas();
}

function poblarSelectMeses() {
  const mesActual = new Date().getMonth() + 1; // se actualiza solo cada mes
  const dSel = document.getElementById('mesDesde');
  const hSel = document.getElementById('mesHasta');
  if (dSel.options.length) return; // ya poblado
  MESES.slice(0, mesActual).forEach((m, i) => {
    dSel.innerHTML += `<option value="${i+1}" ${i===0?'selected':''}>${m}</option>`;
    hSel.innerHTML += `<option value="${i+1}" ${i+1===mesActual?'selected':''}>${m}</option>`;
  });
}

const ICONOS_TIPO = {
  kam_riesgo: { color: '#ff6b6b', label: 'KAM en riesgo' },
  gap_discos: { color: '#ff9f43', label: 'Oportunidad discos' },
  gap_liquidos: { color: '#ff9f43', label: 'Oportunidad líquidos' },
  riesgo_caida: { color: '#f1fe34', label: 'Cliente enfriándose' }
};

function itemAccion(i, nombre, tagLabel, tagColor, motivo, extra) {
  return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #333630;">
    <div style="width:22px;height:22px;border-radius:50%;background:${tagColor};color:#111;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">${i+1}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:13px;font-weight:700;">${titleCase(nombre)} <span style="font-size:10px;color:${tagColor};font-weight:400;text-transform:uppercase;margin-left:6px;">${tagLabel}</span></div>
      <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">${motivo}${extra ? ' · ' + extra : ''}</div>
    </div>
  </div>`;
}

async function loadTopKam() {
  const el = document.getElementById('top-kam');
  el.innerHTML = '<div class="loading">Calculando...</div>';
  const r = await rpc('dash_top5_kam', { p_token: TOKEN });
  if (!r.ok || !r.data || !r.data.length) { el.innerHTML = ''; return; }

  // Para cada KAM, traer sus sucursales más afectadas (cayendo o sin compra)
  const detalles = await Promise.all(r.data.map(k => rpc('dash_recuperacion', { p_token: TOKEN, p_kam: k.nombre })));

  let html = '<div class="card" style="border:1px solid var(--neon);height:100%;"><h2 style="color:var(--neon);">Top 5 · KAM con más oportunidad por cumplimiento</h2>';
  r.data.forEach((k, i) => {
    let color = '#ff6b6b';
    if (k.pct >= 100) color = '#4ade80'; else if (k.pct >= 80) color = '#ff9f43';
    html += itemAccion(i, k.nombre, k.pct + '% cumpl.', color, `Facturado ${money(k.venta_real)} de ${money(k.presupuesto_periodo)}`);

    const det = detalles[i];
    let afectados = [];
    if (det.ok) {
      const cayendo = (det.cayendo || []).slice().sort((a,b) => b.caida_total - a.caida_total).slice(0,5);
      afectados = cayendo.length ? cayendo.map(c => c.sucursal_despacho || c.cliente)
        : (det.sin_compra_60d || []).slice(0,5).map(c => c.sucursal_despacho || c.cliente);
    }
    if (afectados.length) {
      html += `<div style="padding:6px 0 12px 34px;font-size:11px;color:var(--text-dim);">Clientes a trabajar: ${afectados.join(' / ')}</div>`;
    }
  });
  html += '</div>';
  el.innerHTML = html;
  habilitarOrdenTablas(el);
}

async function loadTopAliados() {
  const el = document.getElementById('top-aliados');
  el.innerHTML = '<div class="loading">Calculando...</div>';
  const r = await rpc('dash_top5_aliados', { p_token: TOKEN });
  if (!r.ok || !r.data || !r.data.length) { el.innerHTML = ''; return; }
  let html = '<div class="card" style="border:1px solid var(--neon);height:100%;"><h2 style="color:var(--neon);">Top 5 · Aliados con oportunidad</h2>';
  r.data.forEach((a, i) => {
    const tag = ICONOS_TIPO[a.tipo] || { color: '#9A979F', label: a.tipo };
    html += itemAccion(i, a.cliente + ' — ' + titleCase(a.sucursal_despacho), tag.label, tag.color, a.motivo, a.ciudad);
  });
  html += '</div>';
  el.innerHTML = html;
  habilitarOrdenTablas(el);
}

async function loadEjecutivo() {
  poblarSelectMeses();
  loadTopKam();
  loadTopAliados();
  const el = document.getElementById('ejecutivo-contenido');
  el.innerHTML = '<div class="loading">Cargando KPI...</div>';

  const mesDesde = parseInt(document.getElementById('mesDesde').value) || 1;
  const mesHasta = parseInt(document.getElementById('mesHasta').value) || 7;

  const [kpi, resumen, cumplPeriodo] = await Promise.all([
    rpc('dash_kpi_ejecutivo', { p_token: TOKEN }),
    rpc('dash_resumen_cartera', { p_token: TOKEN }),
    rpc('dash_cumplimiento_periodo', { p_token: TOKEN, p_mes_desde: mesDesde, p_mes_hasta: mesHasta })
  ]);
  if (!kpi.ok) { el.innerHTML = '<div class="loading">Sesión expirada, vuelve a entrar.</div>'; return; }

  const totalReal = kpi.total_real_ytd || 0;
  const totalPpto = kpi.total_anual_presupuesto || 0;
  const cumplPct = totalPpto ? Math.round((totalReal/totalPpto)*100) : 0;

  let html = `<div class="kpis">
    <div class="kpi"><div class="label">Venta acumulada 2026</div><div class="value">${money(totalReal)}</div></div>
    <div class="kpi"><div class="label">Presupuesto anual AFL</div><div class="value">${money(totalPpto)}</div></div>
    <div class="kpi"><div class="label">Cumplimiento</div><div class="value">${cumplPct}%</div></div>
    <div class="kpi"><div class="label">Ratio discos/pastas (juegos)</div><div class="value">${Math.round((resumen.ratio_discos_pastas_global||0)*100)}%</div></div>

    <div class="kpi"><div class="label">Concentración top 10</div><div class="value">${resumen.concentracion_top10_pct||0}%</div></div>
    <div class="kpi"><div class="label">Clientes activos 90d</div><div class="value">${resumen.clientes_activos_90d||0} / ${resumen.clientes_totales_2026||0}</div></div>
  </div>`;

  // Cuadro de cumplimiento por KAM en el periodo seleccionado, semaforizado
  html += `<div class="card"><h2>Cumplimiento por KAM · ${MESES[mesDesde-1]} a ${MESES[mesHasta-1]} 2026</h2>
    <table><tr><th>KAM</th><th class="num">Facturado</th><th class="num">Debería llevar</th><th class="num">% Cumplimiento</th></tr>`;
  (cumplPeriodo.data || []).forEach(k => {
    const pct = k.presupuesto_periodo ? Math.round((k.venta_real / k.presupuesto_periodo) * 100) : 0;
    let color = '#ff6b6b'; // rojo <80%
    if (pct >= 100) color = '#4ade80'; // verde
    else if (pct >= 80) color = '#ff9f43'; // naranja
    html += `<tr><td>${esc(titleCase(k.vendedor))}</td><td class="num money">${money(k.venta_real)}</td><td class="num money">${money(k.presupuesto_periodo)}</td><td class="num" style="color:${color};font-weight:700;">${pct}%</td></tr>`;
  });
  {
    const totReal = (cumplPeriodo.data||[]).reduce((s,k)=>s+(k.venta_real||0),0);
    const totPpto = (cumplPeriodo.data||[]).reduce((s,k)=>s+(k.presupuesto_periodo||0),0);
    const totPct = totPpto ? Math.round((totReal/totPpto)*100) : 0;
    let color = totPct>=100?'#4ade80':(totPct>=80?'#ff9f43':'#ff6b6b');
    html += `<tr style="font-weight:700;border-top:2px solid var(--neon);"><td>EQUIPO BRK</td><td class="num money">${money(totReal)}</td><td class="num money">${money(totPpto)}</td><td class="num" style="color:${color};">${totPct}%</td></tr>`;
  }
  html += '</table></div>';

  html += '<div class="card"><h2>Venta real vs presupuesto por mes</h2><table><tr><th>Mes</th><th class="num">Real</th><th class="num">Presupuesto</th><th class="num">%</th></tr>';
  (kpi.por_mes || []).forEach(m => {
    const pct = m.presupuesto ? Math.round((m.venta_real/m.presupuesto)*100) : 0;
    html += `<tr><td>${MESES[m.mes-1]}</td><td class="num money">${money(m.venta_real)}</td><td class="num money">${money(m.presupuesto)}</td><td class="num">${pct}%</td></tr>`;
  });
  {
    const totReal = (kpi.por_mes||[]).reduce((s,m)=>s+(m.venta_real||0),0);
    const totPpto = (kpi.por_mes||[]).reduce((s,m)=>s+(m.presupuesto||0),0);
    const totPct = totPpto ? Math.round((totReal/totPpto)*100) : 0;
    html += `<tr style="font-weight:700;border-top:2px solid var(--neon);"><td>EQUIPO BRK</td><td class="num money">${money(totReal)}</td><td class="num money">${money(totPpto)}</td><td class="num">${totPct}%</td></tr>`;
  }
  html += '</table></div>';

  // Crecimiento año contra año
  const crec = await rpc('dash_crecimiento_anual', { p_token: TOKEN });
  if (crec.ok) {
    const anios = crec.por_anio || [];
    const anio2026 = anios.find(a => a.anio === 2026);
    html += `<div class="card"><h2>Venta acumulada Ene-${MESES[crec.mes_corte-1]} por año</h2><table><tr><th>Año</th><th class="num">Venta</th><th class="num">% vs. año anterior</th><th class="num">% vs. 2026</th></tr>`;
    anios.forEach((a, i) => {
      const prev = anios[i-1];
      const vsAnterior = prev ? Math.round(((a.venta - prev.venta) / prev.venta) * 100) : null;
      const vs2026 = (anio2026 && a.anio !== 2026) ? Math.round(((anio2026.venta - a.venta) / a.venta) * 100) : null;
      const colorAnterior = vsAnterior === null ? 'var(--text-dim)' : (vsAnterior >= 0 ? '#4ade80' : '#ff6b6b');
      const colorVs2026 = vs2026 === null ? 'var(--text-dim)' : (vs2026 >= 0 ? '#4ade80' : '#ff6b6b');
      html += `<tr><td>${a.anio}</td><td class="num money">${money(a.venta)}</td>
        <td class="num" style="color:${colorAnterior};font-weight:700;">${vsAnterior===null?'—':(vsAnterior>=0?'+':'')+vsAnterior+'%'}</td>
        <td class="num" style="color:${colorVs2026};font-weight:700;">${vs2026===null?'—':(vs2026>=0?'+':'')+vs2026+'%'}</td></tr>`;
    });
    html += '</table></div>';

    html += '<div class="card"><h2>Crecimiento por KAM (Ene-' + MESES[crec.mes_corte-1] + ' 2025 vs 2026)</h2><table><tr><th>KAM</th><th class="num">2025</th><th class="num">2026</th><th class="num">Δ $</th><th class="num">Δ %</th></tr>';
    (crec.por_kam || []).sort((a,b) => b.crecimiento_pesos - a.crecimiento_pesos).forEach(k => {
      const color = k.crecimiento_pct >= 0 ? '#4ade80' : '#ff6b6b';
      html += `<tr><td>${titleCase(k.kam_norm)}</td><td class="num money">${money(k.v2025)}</td><td class="num money">${money(k.v2026)}</td><td class="num money" style="color:${color};">${k.crecimiento_pesos>=0?'+':''}${money(k.crecimiento_pesos)}</td><td class="num" style="color:${color};font-weight:700;">${k.crecimiento_pct>=0?'+':''}${k.crecimiento_pct}%</td></tr>`;
    });
    {
      const totV25 = (crec.por_kam||[]).reduce((s,k)=>s+(k.v2025||0),0);
      const totV26 = (crec.por_kam||[]).reduce((s,k)=>s+(k.v2026||0),0);
      const totPesos = totV26 - totV25;
      const totPct = totV25 ? Math.round((totPesos/totV25)*1000)/10 : 0;
      const color = totPct>=0?'#4ade80':'#ff6b6b';
      html += `<tr style="font-weight:700;border-top:2px solid var(--neon);"><td>EQUIPO BRK</td><td class="num money">${money(totV25)}</td><td class="num money">${money(totV26)}</td><td class="num money" style="color:${color};">${totPesos>=0?'+':''}${money(totPesos)}</td><td class="num" style="color:${color};">${totPct>=0?'+':''}${totPct}%</td></tr>`;
    }
    html += '</table></div>';
  }

  el.innerHTML = html;
  habilitarOrdenTablas(el);
  autoFitKpis();
}

document.getElementById('btnFiltrar').addEventListener('click', loadEjecutivo);

let OP_KAM = '';
let OP_FILTRO_INICIALIZADO = false;

async function poblarFiltroOportunidades() {
  if (OP_FILTRO_INICIALIZADO) return;
  const r = await rpc('dash_ticket_promedio', { p_token: TOKEN }); // reutiliza lista de KAM
  const kams = (r.filtros && r.filtros.kams || []).sort();
  const sel = document.getElementById('opKam');
  sel.innerHTML = '<option value="">Todos los KAM</option>' + kams.map(k => `<option value="${k}">${titleCase(k)}</option>`).join('');
  document.getElementById('opFiltrar').addEventListener('click', () => {
    OP_KAM = document.getElementById('opKam').value;
    loadTab(document.querySelector('#sub-oportunidades .tab.active').dataset.subtab);
  });
  OP_FILTRO_INICIALIZADO = true;
}

async function loadGapDiscos() {
  await poblarFiltroOportunidades();
  const el = document.getElementById('view-gapdiscos');
  el.innerHTML = '<div class="loading">Cargando gap de discos...</div>';
  const r = await rpc('dash_gap_discos', { p_token: TOKEN, p_kam: OP_KAM || null });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  let html = '<div class="card"><h2>Clientes con gap de discos (últimos 90 días, por sucursal) — meta: 2 juegos pastas : 1 juego discos</h2><table><tr><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th>Ciudad</th><th class="num">Pastas (unid.)</th><th class="num">Discos (unid.)</th><th class="num">Ratio</th><th class="num">Potencial/mes</th></tr>';
  (r.data || []).forEach(c => {
    html += `<tr><td>${esc(c.cliente)}</td><td>${esc(c.sucursal_despacho||'')}</td><td>${esc(titleCase(c.vendedor))}</td><td>${esc(c.ciudad||'')}</td><td class="num">${Math.round(c.pastas_unidades)}</td><td class="num">${Math.round(c.discos_unidades)}</td><td class="num">${Math.round((c.ratio_discos_pastas||0)*100)}%</td><td class="num money">${money(c.potencial_mes)}</td></tr>`;
  });
  html += '</table></div>';
  el.innerHTML = html;
  habilitarOrdenTablas(el);
}

async function loadGapLiquidos() {
  await poblarFiltroOportunidades();
  const el = document.getElementById('view-gapliquidos');
  el.innerHTML = '<div class="loading">Cargando gap de líquidos...</div>';
  const r = await rpc('dash_gap_liquidos', { p_token: TOKEN, p_kam: OP_KAM || null });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  let html = '<div class="card"><h2>Clientes con gap de líquido de frenos (últimos 90 días, por sucursal) — meta: 1 juego pastas : 0.5 unid. líquido</h2><table><tr><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th>Ciudad</th><th class="num">Pastas (unid.)</th><th class="num">Líquidos (unid.)</th><th class="num">Ratio</th><th class="num">Potencial/mes</th></tr>';
  (r.data || []).forEach(c => {
    html += `<tr><td>${esc(c.cliente)}</td><td>${esc(c.sucursal_despacho||'')}</td><td>${esc(titleCase(c.vendedor))}</td><td>${esc(c.ciudad||'')}</td><td class="num">${Math.round(c.pastas_unidades)}</td><td class="num">${Math.round(c.unidades_liquido)}</td><td class="num">${Math.round((c.ratio||0)*100)}%</td><td class="num money">${money(c.potencial_mes)}</td></tr>`;
  });
  html += '</table></div>';
  el.innerHTML = html;
  habilitarOrdenTablas(el);
}

async function loadGapCilindros() {
  await poblarFiltroOportunidades();
  const el = document.getElementById('view-gapcilindros');
  el.innerHTML = '<div class="loading">Cargando gap de cilindros...</div>';
  const r = await rpc('dash_gap_cilindros', { p_token: TOKEN, p_kam: OP_KAM || null });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  let html = '<div class="card"><h2>Clientes con gap de cilindros (últimos 180 días, por sucursal) — meta: 1 juego zapatas : 0.3 unid. cilindros</h2><table><tr><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th>Ciudad</th><th class="num">Zapatas (unid.)</th><th class="num">Cilindros (unid.)</th><th class="num">Ratio</th><th class="num">Potencial/mes</th></tr>';
  (r.data || []).forEach(c => {
    html += `<tr><td>${esc(c.cliente)}</td><td>${esc(c.sucursal_despacho||'')}</td><td>${esc(titleCase(c.vendedor))}</td><td>${esc(c.ciudad||'')}</td><td class="num">${Math.round(c.zapatas_unidades)}</td><td class="num">${Math.round(c.unidades_cilindros)}</td><td class="num">${Math.round((c.ratio||0)*100)}%</td><td class="num money">${money(c.potencial_mes)}</td></tr>`;
  });
  html += '</table></div>';
  el.innerHTML = html;
  habilitarOrdenTablas(el);
}

let TIPOA_FILTROS_HTML = '';
function barrasHorizontales(items, labelKey, valueKey, colorHex, claseClick, seleccionActual) {
  const maxV = Math.max(...items.map(i => i[valueKey]), 1);
  const totalGrupo = items.reduce((s,i) => s + (i[valueKey]||0), 0);
  const filaAltura = 26;
  let filas = '';
  items.forEach((it, i) => {
    const anchoBarra = Math.max(2, (it[valueKey] / maxV) * 62);
    const pct = totalGrupo ? Math.round((it[valueKey]/totalGrupo)*1000)/10 : 0;
    const activo = seleccionActual && seleccionActual === it[labelKey];
    filas += `<div class="${claseClick}" data-key="${esc(it[labelKey]||'')}" style="display:flex;align-items:center;gap:6px;height:${filaAltura}px;cursor:pointer;padding:0 4px;border-radius:4px;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}">
      <div style="width:130px;font-size:11px;color:${activo?'var(--neon)':'var(--text)'};font-weight:${activo?'700':'400'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;" title="${esc(it[labelKey]||'')}">${esc(it[labelKey]||'')}</div>
      <div style="flex:1;background:#333630;border-radius:3px;height:14px;position:relative;">
        <div style="width:${anchoBarra}%;height:100%;background:${colorHex};border-radius:3px;"></div>
      </div>
      <div style="width:130px;font-size:11px;color:var(--text-dim);text-align:right;flex-shrink:0;">${money(it[valueKey])} <span style="color:var(--neon);">(${pct}%)</span></div>
    </div>`;
  });
  return `<div>${filas}</div>`;
}

let TIPOA_CLIENTE_SEL = null;

async function cargarTipoAExtra(data, kam, cliente, sucursal) {
  const el = document.getElementById('tipoa-graficas');
  el.innerHTML = '<div class="loading">Cargando gráficas...</div>';
  TIPOA_CLIENTE_SEL = null;

  renderTipoAGraficas(data);

  const [r, rCliente] = await Promise.all([
    rpc('dash_top_tipo_a_comparativo', { p_token: TOKEN, p_kam: kam||null, p_cliente: cliente||null, p_sucursal: sucursal||null }),
    rpc('dash_top_tipo_a_comparativo_cliente', { p_token: TOKEN, p_kam: kam||null, p_cliente: cliente||null, p_sucursal: sucursal||null })
  ]);

  const tablaCard = document.getElementById('tipoa-tabla-comparativa');
  if (r.ok && tablaCard) {
    const rows = r.data || [];
    const totalGrupo2026 = rows.reduce((s,c) => s + (c.venta2026||0), 0);
    let html = `<h2>Comparativo Ene-${MESES[r.mes_corte-1]} 2025 vs 2026 por sucursal</h2><table><tr><th>Sucursal</th><th class="num">Venta 2025</th><th class="num">Venta 2026</th><th class="num">% del total 2026</th><th class="num">Diferencia $</th><th class="num">Crecimiento %</th></tr>`;
    rows.forEach(c => {
      const color = (c.crecimiento_pct===null) ? 'var(--text-dim)' : (c.crecimiento_pct>=0 ? '#4ade80' : '#ff6b6b');
      const pctTxt = c.crecimiento_pct===null ? 'Nuevo' : (c.crecimiento_pct>=0?'+':'') + c.crecimiento_pct + '%';
      const pctGrupo = totalGrupo2026 ? Math.round(((c.venta2026||0)/totalGrupo2026)*1000)/10 : 0;
      html += `<tr><td>${esc(c.sucursal_despacho)}</td><td class="num money">${money(c.venta2025)}</td><td class="num money">${money(c.venta2026)}</td><td class="num">${pctGrupo}%</td><td class="num money" style="color:${color};">${c.diferencia>=0?'+':''}${money(c.diferencia)}</td><td class="num" style="color:${color};font-weight:700;">${pctTxt}</td></tr>`;
    });
    html += '</table>';
    tablaCard.innerHTML = html;
    habilitarOrdenTablas(tablaCard);
  } else if (tablaCard) {
    tablaCard.innerHTML = '<h2>Comparativo 2025 vs 2026 por sucursal</h2><p style="color:var(--text-dim);font-size:12px;">No se pudo cargar la comparación.</p>';
  }

  const tablaClienteCard = document.getElementById('tipoa-tabla-comparativa-cliente');
  if (rCliente.ok && tablaClienteCard) {
    const rows = rCliente.data || [];
    const totalGrupo2026 = rows.reduce((s,c) => s + (c.venta2026||0), 0);
    let html = `<h2>Comparativo Ene-${MESES[rCliente.mes_corte-1]} 2025 vs 2026 por razón social</h2><table><tr><th>Cliente</th><th class="num">Venta 2025</th><th class="num">Venta 2026</th><th class="num">% del total 2026</th><th class="num">Diferencia $</th><th class="num">Crecimiento %</th></tr>`;
    rows.forEach(c => {
      const color = (c.crecimiento_pct===null) ? 'var(--text-dim)' : (c.crecimiento_pct>=0 ? '#4ade80' : '#ff6b6b');
      const pctTxt = c.crecimiento_pct===null ? 'Nuevo' : (c.crecimiento_pct>=0?'+':'') + c.crecimiento_pct + '%';
      const pctGrupo = totalGrupo2026 ? Math.round(((c.venta2026||0)/totalGrupo2026)*1000)/10 : 0;
      html += `<tr><td>${esc(c.cliente)}</td><td class="num money">${money(c.venta2025)}</td><td class="num money">${money(c.venta2026)}</td><td class="num">${pctGrupo}%</td><td class="num money" style="color:${color};">${c.diferencia>=0?'+':''}${money(c.diferencia)}</td><td class="num" style="color:${color};font-weight:700;">${pctTxt}</td></tr>`;
    });
    html += '</table>';
    tablaClienteCard.innerHTML = html;
    habilitarOrdenTablas(tablaClienteCard);
  } else if (tablaClienteCard) {
    tablaClienteCard.innerHTML = '<h2>Comparativo 2025 vs 2026 por razón social</h2><p style="color:var(--text-dim);font-size:12px;">No se pudo cargar la comparación.</p>';
  }
}

function renderTipoAGraficas(data) {
  const el = document.getElementById('tipoa-graficas');

  const porCliente = {};
  data.forEach(c => { porCliente[c.cliente] = (porCliente[c.cliente]||0) + (c.total||0); });
  const clientesOrdenados = Object.keys(porCliente).map(k => ({ cliente: k, total: porCliente[k] })).sort((a,b) => b.total - a.total);

  const dataSucursales = TIPOA_CLIENTE_SEL ? data.filter(c => c.cliente === TIPOA_CLIENTE_SEL) : data;
  const sucursalesOrdenadas = dataSucursales.slice().sort((a,b) => (b.total||0) - (a.total||0));

  const html = renderBarraFiltros([{ id: 'cliente', label: 'Cliente', valor: TIPOA_CLIENTE_SEL }]) +
  `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;margin-bottom:16px;">
    <div class="card"><h2>Razón Social vs Total 2026 (clic para filtrar)</h2>${barrasHorizontales(clientesOrdenados, 'cliente', 'total', '#F1FE34', 'ta-bar-cliente', TIPOA_CLIENTE_SEL)}</div>
    <div class="card"><h2>Sucursal vs Total 2026 ${TIPOA_CLIENTE_SEL ? '— ' + esc(TIPOA_CLIENTE_SEL) : ''}</h2>${barrasHorizontales(sucursalesOrdenadas, 'sucursal_despacho', 'total', '#ff9f43', '')}</div>
  </div>
  <div class="card" id="tipoa-tabla-comparativa"><div class="loading">Cargando comparativo...</div></div>
  <div class="card" id="tipoa-tabla-comparativa-cliente"><div class="loading">Cargando comparativo...</div></div>`;

  el.innerHTML = html;

  el.querySelectorAll('.ta-bar-cliente').forEach(row => {
    row.addEventListener('click', () => {
      TIPOA_CLIENTE_SEL = (TIPOA_CLIENTE_SEL === row.dataset.key) ? null : row.dataset.key;
      renderTipoAGraficas(data);
    });
  });
  activarBarraFiltros(el, { cliente: () => { TIPOA_CLIENTE_SEL = null; renderTipoAGraficas(data); } });
}

async function loadTipoA(kam, cliente, sucursal, mes) {
  const el = document.getElementById('view-tipoa');
  if (!TIPOA_FILTROS_HTML) el.innerHTML = '<div class="loading">Cargando aliados tipo A...</div>';
  const r = await rpc('dash_top_tipo_a', { p_token: TOKEN, p_kam: kam || null, p_cliente: cliente || null, p_sucursal: sucursal || null, p_mes: mes ? parseInt(mes) : null });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }

  if (!TIPOA_FILTROS_HTML) {
    const f = r.filtros || {};
    const opt = (arr) => (arr||[]).sort().map(v => `<option value="${esc(v)}">${esc(titleCase(v))}</option>`).join('');
    TIPOA_FILTROS_HTML = `<div class="card" style="padding:12px 20px;margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;">
      <select id="taMes" class="estado">${optMeses(mes)}</select>
      <select id="taKam" class="estado"><option value="">Todos los KAM</option>${opt(f.kams)}</select>
      <select id="taCliente" class="estado"><option value="">Todos los clientes</option>${opt(f.clientes)}</select>
      <select id="taSucursal" class="estado"><option value="">Todas las sucursales</option>${opt(f.sucursales)}</select>
      <button id="taFiltrar" style="width:auto;padding:6px 14px;font-size:12px;">Filtrar</button>
    </div>`;
  }

  const data = r.data || [];
  const total = data.reduce((s,c) => s + (c.total||0), 0);
  let html = TIPOA_FILTROS_HTML + '<div class="card"><h2>Aliados Tipo A (lista fija de 9 clientes) — ' + data.length + ' sucursales</h2><table><tr><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th class="num">Total 2026</th><th class="num">% del total</th></tr>';
  data.forEach(c => {
    const pctFila = total ? Math.round(((c.total||0)/total)*1000)/10 : 0;
    html += `<tr><td>${esc(c.cliente)}</td><td>${esc(c.sucursal_despacho||'')}</td><td>${esc(titleCase(c.vendedor))}</td><td class="num money">${money(c.total)}</td><td class="num">${pctFila}%</td></tr>`;
  });
  html += `<tr style="font-weight:700;border-top:2px solid var(--neon);"><td colspan="3">TOTAL</td><td class="num money">${money(total)}</td><td class="num">100%</td></tr>`;
  html += '</table></div>';
  html += '<div id="tipoa-graficas"></div>';
  el.innerHTML = html;
  habilitarOrdenTablas(el);
  cargarTipoAExtra(data, kam, cliente, sucursal);

  document.getElementById('taMes').value = mes || '';
  document.getElementById('taKam').value = kam || '';
  ocultarFiltroKamSiColaborador(['taKam']);
  document.getElementById('taCliente').value = cliente || '';
  document.getElementById('taSucursal').value = sucursal || '';
  document.getElementById('taFiltrar').addEventListener('click', () => {
    loadTipoA(document.getElementById('taKam').value, document.getElementById('taCliente').value, document.getElementById('taSucursal').value, document.getElementById('taMes').value);
  });
}

let SEGMENTACION_DATA = [];
let SEGMENTACION_FILTRO = null;
let SEGMENTACION_KAM = '';

function renderSegmentacionTabla() {
  const el = document.getElementById('view-segmentacion');
  const baseData = SEGMENTACION_KAM ? SEGMENTACION_DATA.filter(c => c.vendedor === SEGMENTACION_KAM) : SEGMENTACION_DATA;
  const resumen = {};
  baseData.forEach(c => {
    resumen[c.segmento] = resumen[c.segmento] || { n: 0, total: 0 };
    resumen[c.segmento].n++;
    resumen[c.segmento].total += c.total;
  });

  const kams = [...new Set(SEGMENTACION_DATA.map(c => c.vendedor))].sort();
  let html = `<div class="card" style="padding:12px 20px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
    <span style="font-size:12px;color:var(--text-dim);">KAM:</span>
    <select id="segKam" class="estado"><option value="">Todos</option>${kams.map(k => `<option value="${k}" ${k===SEGMENTACION_KAM?'selected':''}>${titleCase(k)}</option>`).join('')}</select>
  </div>`;

  html += renderBarraFiltros([
    { id: 'kam', label: 'KAM', valor: SEGMENTACION_KAM, valorMostrar: SEGMENTACION_KAM ? titleCase(SEGMENTACION_KAM) : null },
    { id: 'segmento', label: 'Segmento', valor: SEGMENTACION_FILTRO }
  ]);

  const totalGeneral = baseData.reduce((s,c) => s + (c.total||0), 0);

  html += '<div class="kpis">';
  Object.keys(resumen).sort().forEach(seg => {
    const activo = SEGMENTACION_FILTRO === seg;
    const pctSeg = totalGeneral ? Math.round((resumen[seg].total/totalGeneral)*1000)/10 : 0;
    html += `<div class="kpi seg-card" data-seg="${seg}" style="cursor:pointer;${activo ? 'border-color:var(--neon);border-width:2px;' : ''}">
      <div class="label">${seg}</div><div class="value">${resumen[seg].n}</div><div class="value-sub">${money(resumen[seg].total)}</div><div class="value-sub" style="color:var(--neon);">${pctSeg}% del total</div>
    </div>`;
  });
  html += '</div>';

  const filtrados = SEGMENTACION_FILTRO ? baseData.filter(c => c.segmento === SEGMENTACION_FILTRO) : baseData;
  html += `<div class="card"><h2>Detalle por sucursal</h2>
    <table><tr><th>Cliente</th><th>Sucursal</th><th>Segmento</th><th>Vendedor</th><th>Ciudad</th><th class="num">Total 2026</th><th class="num">% del total</th><th class="num">Días sin comprar</th></tr>`;
  filtrados.forEach(c => {
    const pctFila = totalGeneral ? Math.round(((c.total||0)/totalGeneral)*1000)/10 : 0;
    html += `<tr><td>${esc(c.cliente)}</td><td>${esc(c.sucursal_despacho||'')}</td><td>${c.segmento}</td><td>${esc(titleCase(c.vendedor))}</td><td>${esc(c.ciudad||'')}</td><td class="num money">${money(c.total)}</td><td class="num">${pctFila}%</td><td class="num">${c.dias_sin_compra}</td></tr>`;
  });
  html += '</table></div>';
  el.innerHTML = html;
  habilitarOrdenTablas(el);
  autoFitKpis();
  ocultarFiltroKamSiColaborador(['segKam']);

  document.getElementById('segKam').addEventListener('change', (e) => {
    SEGMENTACION_KAM = e.target.value;
    renderSegmentacionTabla();
  });
  el.querySelectorAll('.seg-card').forEach(card => {
    card.addEventListener('click', () => {
      SEGMENTACION_FILTRO = (SEGMENTACION_FILTRO === card.dataset.seg) ? null : card.dataset.seg;
      renderSegmentacionTabla();
    });
  });
  activarBarraFiltros(el, {
    kam: () => { SEGMENTACION_KAM = null; renderSegmentacionTabla(); },
    segmento: () => { SEGMENTACION_FILTRO = null; renderSegmentacionTabla(); }
  }, () => { SEGMENTACION_KAM = null; SEGMENTACION_FILTRO = null; renderSegmentacionTabla(); });
}

async function loadSegmentacion() {
  const el = document.getElementById('view-segmentacion');
  el.innerHTML = '<div class="loading">Cargando segmentación...</div>';
  const r = await rpc('dash_segmentacion', { p_token: TOKEN });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  SEGMENTACION_DATA = r.data || [];
  renderSegmentacionTabla();
}

let TICKET_FILTROS_HTML = '';
const MESES_DISPONIBLES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function optMeses(mesSel) {
  const mesActualReal = new Date().getMonth() + 1;
  let out = `<option value="">Todos los meses</option>`;
  for (let m = 1; m <= mesActualReal; m++) out += `<option value="${m}" ${String(m)===String(mesSel)?'selected':''}>${MESES_DISPONIBLES[m-1]}</option>`;
  return out;
}

let TICKET_FAMILIA_SEL = null;

async function loadTicket(kam, cliente, sucursal, mes) {
  const el = document.getElementById('view-ticket');
  if (!TICKET_FILTROS_HTML) el.innerHTML = '<div class="loading">Cargando ticket promedio...</div>';
  const mesInt = mes ? parseInt(mes) : null;
  const r = await rpc('dash_ticket_promedio', { p_token: TOKEN, p_kam: kam||null, p_cliente: cliente||null, p_sucursal: sucursal||null, p_mes: mesInt });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }

  let prod = null;
  if (TICKET_FAMILIA_SEL) {
    prod = await rpc('dash_ticket_productos', { p_token: TOKEN, p_familia: TICKET_FAMILIA_SEL, p_kam: kam||null, p_cliente: cliente||null, p_sucursal: sucursal||null, p_mes: mesInt });
  }

  if (!TICKET_FILTROS_HTML) {
    const f = r.filtros || {};
    const opt = (arr) => (arr||[]).sort().map(v => `<option value="${esc(v)}">${esc(titleCase(v))}</option>`).join('');
    TICKET_FILTROS_HTML = `<div class="card" style="padding:12px 20px;margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;">
      <select id="tkMes" class="estado">${optMeses(mes)}</select>
      <select id="tkKam" class="estado"><option value="">Todos los KAM</option>${opt(f.kams)}</select>
      <select id="tkCliente" class="estado"><option value="">Todos los clientes</option>${opt(f.clientes)}</select>
      <select id="tkSucursal" class="estado"><option value="">Todas las sucursales</option>${opt(f.sucursales)}</select>
      <button id="tkFiltrar" style="width:auto;padding:6px 14px;font-size:12px;">Filtrar</button>
    </div>`;
  }

  const g = r.general || {};
  let html = TICKET_FILTROS_HTML + renderBarraFiltros([{ id: 'familia', label: 'Familia', valor: TICKET_FAMILIA_SEL }]) + `<div class="kpis">
    <div class="kpi"><div class="label">Venta Total</div><div class="value">${money(g.venta_total)}</div></div>
    <div class="kpi"><div class="label">Ticket Promedio</div><div class="value">${money(g.ticket_promedio)}</div></div>
    <div class="kpi"><div class="label">Unidades Vendidas</div><div class="value">${Math.round(g.unidades||0).toLocaleString('es-CO')}</div></div>
  </div>`;

  html += '<div class="card"><h2>Top 12 por familia (clic para ver descripciones)</h2><table><tr><th>Familia</th><th class="num">Venta</th><th class="num">Unidades</th><th class="num">Ticket Promedio</th></tr>';
  (r.por_familia || []).forEach(f => {
    const activo = TICKET_FAMILIA_SEL === f.familia;
    html += `<tr class="fam-row-ticket" data-familia="${esc(f.familia)}" style="cursor:pointer;${activo?'background:#2a2e24;':''}"><td>${esc(f.familia)}</td><td class="num money">${money(f.venta)}</td><td class="num">${Math.round(f.unidades).toLocaleString('es-CO')}</td><td class="num money">${money(f.ticket_promedio)}</td></tr>`;
  });
  html += '</table></div>';

  if (TICKET_FAMILIA_SEL && prod && prod.ok) {
    html += `<div class="card"><h2>Descripciones — ${esc(TICKET_FAMILIA_SEL)}</h2>
      <table><tr><th>Descripción</th><th class="num">Venta</th><th class="num">Unidades</th><th class="num">Ticket Promedio</th></tr>`;
    (prod.data || []).forEach(p => {
      html += `<tr><td>${esc(p.descripcion||'')}</td><td class="num money">${money(p.venta)}</td><td class="num">${Math.round(p.unidades).toLocaleString('es-CO')}</td><td class="num money">${money(p.ticket_promedio)}</td></tr>`;
    });
    html += '</table></div>';
  }

  el.innerHTML = html;
  habilitarOrdenTablas(el);
  autoFitKpis();

  document.getElementById('tkMes').value = mes||'';
  document.getElementById('tkKam').value = kam||'';
  ocultarFiltroKamSiColaborador(['tkKam']);
  document.getElementById('tkCliente').value = cliente||'';
  document.getElementById('tkSucursal').value = sucursal||'';
  document.getElementById('tkFiltrar').addEventListener('click', () => {
    loadTicket(document.getElementById('tkKam').value, document.getElementById('tkCliente').value, document.getElementById('tkSucursal').value, document.getElementById('tkMes').value);
  });
  el.querySelectorAll('.fam-row-ticket').forEach(row => {
    row.addEventListener('click', () => {
      TICKET_FAMILIA_SEL = (TICKET_FAMILIA_SEL === row.dataset.familia) ? null : row.dataset.familia;
      loadTicket(kam, cliente, sucursal, mes);
    });
  });
  activarBarraFiltros(el, { familia: () => { TICKET_FAMILIA_SEL = null; loadTicket(kam, cliente, sucursal, mes); } });
}

const COLORES_FAMILIA = ['#F1FE34','#596B63','#9A979F','#414930','#ff9f43','#4ade80','#ff6b6b','#8b5cf6','#06b6d4'];
let PORTAFOLIO_FILTROS_HTML = '';
let PORTAFOLIO_FAMILIA_SEL = null;

async function loadPortafolio(kam, cliente, sucursal, mes) {
  const el = document.getElementById('view-portafolio');
  if (!PORTAFOLIO_FILTROS_HTML) el.innerHTML = '<div class="loading">Cargando portafolio...</div>';
  const mesInt = mes ? parseInt(mes) : null;
  const r = await rpc('dash_portafolio', { p_token: TOKEN, p_kam: kam||null, p_cliente: cliente||null, p_sucursal: sucursal||null, p_mes: mesInt });
  const prod = PORTAFOLIO_FAMILIA_SEL
    ? await rpc('dash_portafolio_productos', { p_token: TOKEN, p_familia: PORTAFOLIO_FAMILIA_SEL, p_kam: kam||null, p_cliente: cliente||null, p_sucursal: sucursal||null, p_mes: mesInt })
    : null;
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }

  if (!PORTAFOLIO_FILTROS_HTML) {
    const f = r.filtros || {};
    const opt = (arr) => (arr||[]).sort().map(v => `<option value="${esc(v)}">${esc(titleCase(v))}</option>`).join('');
    PORTAFOLIO_FILTROS_HTML = `<div class="card" style="padding:12px 20px;margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;">
      <select id="pfMes" class="estado">${optMeses(mes)}</select>
      <select id="pfKam" class="estado"><option value="">Todos los KAM</option>${opt(f.kams)}</select>
      <select id="pfCliente" class="estado"><option value="">Todos los clientes</option>${opt(f.clientes)}</select>
      <select id="pfSucursal" class="estado"><option value="">Todas las sucursales</option>${opt(f.sucursales)}</select>
      <button id="pfFiltrar" style="width:auto;padding:6px 14px;font-size:12px;">Filtrar</button>
    </div>`;
  }

  const data = r.data || [];
  const total = data.reduce((s,d) => s + d.venta, 0);
  let acumulado = 0;
  const radio = 80, cx = 100, cy = 100, grosor = 34;
  let paths = '';
  data.forEach((d, i) => {
    const frac = d.venta / total;
    const startAngle = acumulado * 2 * Math.PI - Math.PI/2;
    acumulado += frac;
    const endAngle = acumulado * 2 * Math.PI - Math.PI/2;
    const x1 = cx + radio * Math.cos(startAngle), y1 = cy + radio * Math.sin(startAngle);
    const x2 = cx + radio * Math.cos(endAngle), y2 = cy + radio * Math.sin(endAngle);
    const largeArc = frac > 0.5 ? 1 : 0;
    const color = COLORES_FAMILIA[i % COLORES_FAMILIA.length];
    paths += `<path d="M ${x1} ${y1} A ${radio} ${radio} 0 ${largeArc} 1 ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${grosor}" class="fam-slice" data-familia="${esc(d.familia)}" style="cursor:pointer;"/>`;
  });

  let html = PORTAFOLIO_FILTROS_HTML + renderBarraFiltros([{ id: 'familia', label: 'Familia', valor: PORTAFOLIO_FAMILIA_SEL }]) + '<div class="card"><h2>Participación de portafolio por familia (top 12, clic para ver sus referencias)</h2><div style="display:flex;gap:32px;align-items:center;flex-wrap:wrap;">';
  html += `<svg width="200" height="200" viewBox="0 0 200 200">${paths}</svg>`;
  html += '<div style="flex:1;min-width:220px;">';
  data.forEach((d, i) => {
    const color = COLORES_FAMILIA[i % COLORES_FAMILIA.length];
    const activo = PORTAFOLIO_FAMILIA_SEL === d.familia;
    html += `<div class="fam-leyenda" data-familia="${esc(d.familia)}" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:13px;cursor:pointer;padding:3px 6px;border-radius:4px;${activo?'font-weight:700;background:#2a2e24;border-left:3px solid var(--neon);':''}">
      <span style="width:12px;height:12px;background:${color};border-radius:2px;flex-shrink:0;"></span>
      <span style="flex:1;">${esc(d.familia)}</span>
      <span style="color:var(--text-dim);">${d.pct}%</span>
    </div>`;
  });
  html += '</div></div></div>';

  if (!PORTAFOLIO_FAMILIA_SEL) {
    const porVentaFam = data.slice().sort((a,b) => b.venta - a.venta);
    const porUnidFam = data.slice().sort((a,b) => b.unidades - a.unidades);
    html += `<div class="card"><h2>Top 12 por familia</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div><h3 style="font-size:12px;color:var(--text-dim);margin:0 0 8px;">Por $ (mayor a menor)</h3><table><tr><th>Familia</th><th class="num">Venta</th></tr>
          ${porVentaFam.map(d => `<tr><td>${esc(d.familia)}</td><td class="num money">${money(d.venta)}</td></tr>`).join('')}
        </table></div>
        <div><h3 style="font-size:12px;color:var(--text-dim);margin:0 0 8px;">Por # unidades (mayor a menor)</h3><table><tr><th>Familia</th><th class="num">Unidades</th></tr>
          ${porUnidFam.map(d => `<tr><td>${esc(d.familia)}</td><td class="num">${Math.round(d.unidades).toLocaleString('es-CO')}</td></tr>`).join('')}
        </table></div>
      </div></div>`;
  }

  if (PORTAFOLIO_FAMILIA_SEL && prod && prod.ok) {
    const productos = prod.data || [];
    const porUnidades = productos.slice().sort((a,b) => b.unidades - a.unidades);
    const porVenta = productos.slice().sort((a,b) => b.venta - a.venta);
    html += `<div class="card"><h2>Top 25 referencias — ${esc(PORTAFOLIO_FAMILIA_SEL)}</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div><h3 style="font-size:12px;color:var(--text-dim);margin:0 0 8px;">Por $ (mayor a menor)</h3><table><tr><th>Ref</th><th>Descripción</th><th class="num">Venta</th></tr>
          ${porVenta.map(p => `<tr><td>${esc(p.referencia)}</td><td>${esc(p.descripcion||'')}</td><td class="num money">${money(p.venta)}</td></tr>`).join('')}
        </table></div>
        <div><h3 style="font-size:12px;color:var(--text-dim);margin:0 0 8px;">Por # unidades (mayor a menor)</h3><table><tr><th>Ref</th><th>Descripción</th><th class="num">Unidades</th></tr>
          ${porUnidades.map(p => `<tr><td>${esc(p.referencia)}</td><td>${esc(p.descripcion||'')}</td><td class="num">${Math.round(p.unidades).toLocaleString('es-CO')}</td></tr>`).join('')}
        </table></div>
      </div></div>`;
  }

  el.innerHTML = html;
  habilitarOrdenTablas(el);

  document.getElementById('pfMes').value = mes||'';
  document.getElementById('pfKam').value = kam||'';
  ocultarFiltroKamSiColaborador(['pfKam']);
  document.getElementById('pfCliente').value = cliente||'';
  document.getElementById('pfSucursal').value = sucursal||'';
  document.getElementById('pfFiltrar').addEventListener('click', () => {
    loadPortafolio(document.getElementById('pfKam').value, document.getElementById('pfCliente').value, document.getElementById('pfSucursal').value, document.getElementById('pfMes').value);
  });

  const seleccionarFamilia = (fam) => {
    PORTAFOLIO_FAMILIA_SEL = (PORTAFOLIO_FAMILIA_SEL === fam) ? null : fam;
    loadPortafolio(kam, cliente, sucursal, mes);
  };
  el.querySelectorAll('.fam-slice, .fam-leyenda').forEach(node => {
    node.addEventListener('click', () => seleccionarFamilia(node.dataset.familia));
  });
  activarBarraFiltros(el, { familia: () => { PORTAFOLIO_FAMILIA_SEL = null; loadPortafolio(kam, cliente, sucursal, mes); } });
}

let RECUP_KAM_HTML = '';
function mesRelativo(offset) {
  const idx = (new Date().getMonth() - offset + 12) % 12;
  return MESES[idx];
}

async function loadPerdidos(kam) {
  const el = document.getElementById('view-perdidos');
  if (!RECUP_KAM_HTML) el.innerHTML = '<div class="loading">Analizando caídas y clientes inactivos...</div>';
  const r = await rpc('dash_recuperacion', { p_token: TOKEN, p_kam: kam || null });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }

  if (!RECUP_KAM_HTML) {
    const kams = [...new Set([...(r.cayendo||[]), ...(r.sin_compra_60d||[])].map(c => c.vendedor))].filter(Boolean).sort();
    RECUP_KAM_HTML = `<div class="card" style="padding:10px 20px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:12px;color:var(--text-dim);">KAM:</span>
      <select id="recKam" class="estado"><option value="">Todos</option>${kams.map(k=>`<option value="${k}">${titleCase(k)}</option>`).join('')}</select>
    </div>`;
  }

  const cayendo = (r.cayendo || []).slice().sort((a,b) => b.caida_total - a.caida_total);
  const sinCompra = r.sin_compra_60d || [];

  let html = RECUP_KAM_HTML + renderBarraFiltros([{ id: 'kam', label: 'KAM', valor: kam, valorMostrar: kam ? titleCase(kam) : null }]);
  html += `<div class="card"><h2>Cayendo vs. promedio de los 2 meses anteriores (mismo tramo de días) — ${cayendo.length} sucursales</h2>
    <table><tr><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th class="num">${mesRelativo(2)}</th><th class="num">${mesRelativo(1)}</th><th class="num">Promedio 2m</th><th class="num">Mes actual</th><th class="num">Caída</th><th>Detalle por categoría</th></tr>`;
  cayendo.forEach(c => {
    const detalles = [];
    if (c.delta_pastas < 0) detalles.push(`Pastas ${money(c.delta_pastas)}`);
    if (c.delta_discos < 0) detalles.push(`Discos ${money(c.delta_discos)}`);
    if (c.delta_liquidos < 0) detalles.push(`Líquidos ${money(c.delta_liquidos)}`);
    html += `<tr><td>${esc(c.cliente)}</td><td>${esc(c.sucursal_despacho||'')}</td><td>${esc(titleCase(c.vendedor||''))}</td>
      <td class="num money">${money(c.total_ant2)}</td><td class="num money">${money(c.total_ant1)}</td><td class="num money">${money(c.promedio_2m)}</td><td class="num money">${money(c.total_act)}</td>
      <td class="num" style="color:#ff6b6b;font-weight:700;">${money(c.caida_total)} (${c.caida_pct}%)</td>
      <td style="font-size:11px;color:var(--text-dim);">${detalles.join(' · ') || '—'}</td></tr>`;
  });
  html += '</table></div>';

  html += `<div class="card"><h2>Sin compras hace 60+ días — ${sinCompra.length} sucursales</h2>
    <table><tr><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th>Ciudad</th><th class="num">Venta 2026</th><th class="num">Días sin comprar</th></tr>`;
  sinCompra.forEach(c => {
    html += `<tr><td>${esc(c.cliente)}</td><td>${esc(c.sucursal_despacho||'')}</td><td>${esc(titleCase(c.vendedor||''))}</td><td>${esc(c.ciudad||'')}</td><td class="num money">${money(c.total_2026)}</td><td class="num">${c.dias_sin_compra}</td></tr>`;
  });
  html += '</table></div>';

  el.innerHTML = html;
  habilitarOrdenTablas(el);
  document.getElementById('recKam').value = kam || '';
  ocultarFiltroKamSiColaborador(['recKam']);
  document.getElementById('recKam').addEventListener('change', (e) => loadPerdidos(e.target.value));
  activarBarraFiltros(el, { kam: () => loadPerdidos('') });
}

async function loadPlanes() {
  const el = document.getElementById('view-planes');
  el.innerHTML = '<div class="loading">Cargando planes de acción...</div>';
  const r = await rpc('dash_planes_listar', { p_token: TOKEN, p_tipo_plan: null });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  let html = '<div class="card"><h2>Planes de acción</h2><p style="font-size:12px;color:var(--text-dim);margin:-8px 0 16px;">"Potencial/mes" = venta mensual estimada que se ganaría si el cliente llega al comportamiento esperado (ratio de cross-sell o recompra de su categoría). Es una proyección, no una venta garantizada.</p>';
  if (!r.data || r.data.length === 0) {
    html += '<p style="color:var(--text-dim);font-size:13px;">Aún no hay planes cargados. Se poblarán con las listas de Gap Discos y Recuperación priorizadas.</p>';
  } else {
    html += '<table><tr><th>Cliente</th><th>Sucursal</th><th>Tipo</th><th>Vendedor</th><th class="num">Potencial/mes</th><th>Estado</th></tr>';
    r.data.forEach(p => {
      html += `<tr><td>${esc(p.cliente)}</td><td>${esc(p.sucursal||'')}</td><td>${p.tipo_plan}</td><td>${esc(titleCase(p.vendedor||''))}</td><td class="num money">${money(p.potencial_mes)}</td><td>
        <select class="estado" data-id="${p.id}">
          <option value="pendiente" ${p.estado==='pendiente'?'selected':''}>Pendiente</option>
          <option value="gestionado" ${p.estado==='gestionado'?'selected':''}>Gestionado</option>
          <option value="ganado" ${p.estado==='ganado'?'selected':''}>Ganado</option>
          <option value="descartado" ${p.estado==='descartado'?'selected':''}>Descartado</option>
        </select>
      </td></tr>`;
    });
    html += '</table>';
  }
  html += '</div>';
  el.innerHTML = html;
  habilitarOrdenTablas(el);

  el.querySelectorAll('.estado').forEach(sel => {
    sel.addEventListener('change', async () => {
      await rpc('dash_planes_actualizar_estado', { p_token: TOKEN, p_id: parseInt(sel.dataset.id), p_estado: sel.value });
    });
  });
}

function autoFitKpis() {
  document.querySelectorAll('.kpi .value').forEach(el => {
    let size = 22;
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > el.parentElement.clientWidth - 32 && size > 12) {
      size -= 1;
      el.style.fontSize = size + 'px';
    }
  });
  document.querySelectorAll('.kpi .value-sub').forEach(el => {
    let size = 11;
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > el.parentElement.clientWidth - 32 && size > 8) {
      size -= 1;
      el.style.fontSize = size + 'px';
    }
  });
}

// ---- Tablas ordenables con persistencia (localStorage) ----
function parseCeldaValor(txt) {
  txt = (txt || '').trim();
  if (txt === '' || txt === '—') return -Infinity;
  const limpio = txt.replace(/\$/g, '').replace(/%/g, '').trim();
  const numTest = limpio.replace(/\./g, '').replace(/,/g, '.');
  if (/^-?\d+(\.\d+)?$/.test(numTest)) return parseFloat(numTest);
  return txt.toLowerCase();
}

function ordenarTabla(table, colIdx, dir) {
  const filas = Array.from(table.querySelectorAll('tbody tr, tr')).filter(r => r.parentElement.tagName !== 'THEAD');
  const headerRow = filas[0];
  const dataRows = filas.slice(1);
  const totales = dataRows.filter(r => /TOTAL|EQUIPO BRK/i.test(r.textContent));
  const normales = dataRows.filter(r => !totales.includes(r));
  normales.sort((a, b) => {
    const va = parseCeldaValor(a.children[colIdx]?.textContent);
    const vb = parseCeldaValor(b.children[colIdx]?.textContent);
    if (typeof va === 'string' || typeof vb === 'string') {
      return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    }
    return dir === 'asc' ? va - vb : vb - va;
  });
  const tbody = headerRow.parentElement;
  normales.forEach(r => tbody.appendChild(r));
  totales.forEach(r => tbody.appendChild(r));
}

function idTabla(table, indice) {
  const view = table.closest('[id^="view-"]');
  const heading = table.closest('.card')?.querySelector('h2')?.textContent?.trim().slice(0, 40) || '';
  return (view ? view.id : 'root') + '::' + heading + '::' + indice;
}

function habilitarOrdenTablas(root) {
  const tablas = (root || document).querySelectorAll('table');
  tablas.forEach((table, indice) => {
    const headerRow = table.querySelector('tr');
    if (!headerRow) return;
    const ths = headerRow.querySelectorAll('th');
    const tid = idTabla(table, indice);
    ths.forEach((th, colIdx) => {
      th.style.cursor = 'pointer';
      th.title = 'Clic para ordenar';
      th.addEventListener('click', () => {
        const guardado = JSON.parse(localStorage.getItem('brk_sort_' + tid) || 'null');
        const dir = (guardado && guardado.col === colIdx && guardado.dir === 'desc') ? 'asc' : 'desc';
        ordenarTabla(table, colIdx, dir);
        localStorage.setItem('brk_sort_' + tid, JSON.stringify({ col: colIdx, dir }));
      });
    });
    const guardado = JSON.parse(localStorage.getItem('brk_sort_' + tid) || 'null');
    if (guardado) ordenarTabla(table, guardado.col, guardado.dir);
  });
}

// ---- Acceso a carpeta local (File System Access API) ----
// Guardamos el "handle" de la carpeta en IndexedDB para no pedir permiso cada vez.
function abrirDBHandles() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('brk_handles', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function guardarHandleCarpeta(handle) {
  const db = await abrirDBHandles();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, 'carpeta_data_brk');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function obtenerHandleCarpeta() {
  const db = await abrirDBHandles();
  return new Promise((resolve) => {
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get('carpeta_data_brk');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

async function obtenerCarpetaData(forzarSeleccion) {
  if (!window.showDirectoryPicker) {
    throw new Error('Tu navegador no soporta esta función. Usa Chrome o Edge.');
  }
  let handle = forzarSeleccion ? null : await obtenerHandleCarpeta();
  if (handle) {
    const permiso = await handle.queryPermission({ mode: 'read' });
    if (permiso !== 'granted') {
      const pedido = await handle.requestPermission({ mode: 'read' });
      if (pedido !== 'granted') handle = null;
    }
  }
  if (!handle) {
    handle = await window.showDirectoryPicker({ id: 'brk-data-tableros', mode: 'read' });
    await guardarHandleCarpeta(handle);
  }
  return handle;
}

async function buscarArchivoEnCarpeta(handleCarpeta, prefijo) {
  for await (const [nombre, entrada] of handleCarpeta.entries()) {
    if (entrada.kind === 'file' && nombre.toLowerCase().startsWith(prefijo.toLowerCase()) &&
        (nombre.toLowerCase().endsWith('.xls') || nombre.toLowerCase().endsWith('.xlsx'))) {
      return entrada.getFile();
    }
  }
  return null;
}

// ---- Mapeos de columnas por tipo de archivo ----
const MAPEO_COLUMNAS_SIESA = {
  'Fecha': 'fecha', 'Nombre vendedor': 'vendedor', 'Razon social cliente factura': 'cliente',
  'Desc. sucursal despacho': 'sucursal_despacho', 'Desc. ciudad': 'ciudad', 'Referencia': 'referencia',
  'FAMILIA': 'familia', 'Desc. item': 'descripcion_item', 'Valor subtotal local': 'valor_subtotal',
  'Valor descuentos local': 'valor_descuento', 'Cantidad inv.': 'cantidad', 'Precio unit.': 'precio_unit',
  'CATEGORIA CLIENTE POR UEN': 'categoria_uen', 'Nro documento': 'nro_documento', 'Orden de compra': 'orden_compra',
  'C.O.': 'co', 'Cliente factura': 'cliente_nit', 'Costo MP': 'costo_mp', 'Margen MP': 'margen_mp'
};

const MAPEO_REMISIONES = {
  'Nro documento': 'nro_documento', 'C.O.': 'co', 'Fecha': 'fecha', 'Estado': 'estado',
  'Nombre vendedor': 'vendedor', 'Razón social cliente factura': 'cliente',
  'Desc. sucursal factura': 'sucursal_factura', 'Desc. ciudad': 'ciudad',
  'Valor subtotal local': 'valor_subtotal', 'Usuario anulación': 'usuario_anulacion'
};

const MAPEO_CARTERA = {
  'C.O.': 'co', 'Cliente': 'cliente_nit', 'Razón social vend. cliente': 'vendedor',
  'Razón social sucursal': 'sucursal', 'Número O.C. comercial': 'orden_compra',
  'Nro. docto. cruce': 'nro_documento_cruce', 'Cond. pago cliente': 'cond_pago_cliente',
  'Fecha docto cruce': 'fecha_docto_cruce', 'Fecha vcto.': 'fecha_vcto_siesa',
  'Dias vencidos': 'dias_vencidos_siesa', 'Notas': 'notas', 'Total COP': 'total_cop'
};

function formatearFechaExcel(valor) {
  if (valor instanceof Date) {
    const y = valor.getFullYear(), m = String(valor.getMonth()+1).padStart(2,'0'), d = String(valor.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  if (typeof valor === 'string' && valor.includes('-')) return valor.slice(0,10);
  return null;
}

function formatearFechaHoraExcel(valor) {
  if (valor instanceof Date) {
    const y = valor.getFullYear(), m = String(valor.getMonth()+1).padStart(2,'0'), d = String(valor.getDate()).padStart(2,'0');
    const hh = String(valor.getHours()).padStart(2,'0'), mm = String(valor.getMinutes()).padStart(2,'0'), ss = String(valor.getSeconds()).padStart(2,'0');
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }
  if (typeof valor === 'string' && valor.trim()) return valor;
  return null;
}

function mapearFilas(filas, mapeo, camposFecha, camposFechaHora) {
  camposFechaHora = camposFechaHora || [];
  return filas.map(f => {
    const out = {};
    for (const [colExcel, colDB] of Object.entries(mapeo)) {
      let val = f[colExcel];
      if (camposFechaHora.includes(colDB)) val = formatearFechaHoraExcel(val);
      else if (camposFecha.includes(colDB)) val = formatearFechaExcel(val);
      out[colDB] = (val === undefined) ? null : val;
    }
    return out;
  });
}

// ---- Configuración de las 3 fuentes ----
const MAPEO_FACILITADORES_V1 = { // formato ene-jun
  'Consecutivo': 'consecutivo', 'CLIENTE ': 'cliente', 'TIPO ': 'tipo_servicio',
  'UEN': 'uen', 'FACILITADOR': 'facilitador', 'FECHA': 'fecha_creacion'
};
const MAPEO_FACILITADORES_V2 = { // formato julio en adelante
  'Consecutivo': 'consecutivo', 'Estado': 'estado', 'Nombre del cliente': 'cliente',
  'Tipo de servicio': 'tipo_servicio', 'colaborador': 'facilitador', 'Creación': 'fecha_creacion',
  'Destino 1 - dirección': 'destino_direccion', 'Destino 1 - fecha finalización': 'fecha_finalizacion'
};

const FUENTES_DATA = {
  facturacion: {
    titulo: 'Facturación', prefijoArchivo: '1 facturacion', mapeo: MAPEO_COLUMNAS_SIESA,
    camposFecha: ['fecha'], rpc: 'dash_ventas_cargar_lote', filtro: f => f.fecha && f.valor_subtotal !== null
  },
  remisiones: {
    titulo: 'Remisiones', prefijoArchivo: '2 remisiones', mapeo: MAPEO_REMISIONES,
    camposFecha: ['fecha'], rpc: 'dash_remisiones_cargar_lote', filtro: f => f.nro_documento
  },
  cartera: {
    titulo: 'Cartera', prefijoArchivo: '3 cartera', mapeo: MAPEO_CARTERA,
    camposFecha: ['fecha_docto_cruce', 'fecha_vcto_siesa'], rpc: 'dash_cartera_cargar_lote',
    filtro: f => f.total_cop !== null
  },
  facilitadores: {
    titulo: 'Facilitadores', prefijoArchivo: 'entregas', mapeos: [MAPEO_FACILITADORES_V1, MAPEO_FACILITADORES_V2],
    camposFecha: [], camposFechaHora: ['fecha_creacion', 'fecha_finalizacion'], rpc: 'dash_facilitadores_cargar_lote',
    filtro: f => f.consecutivo && f.fecha_creacion, sinPrimerLote: true
  }
};

let REMISIONES_DATA = null;
let REMISIONES_KAM_SEL = null;

async function loadRemisiones() {
  const el = document.getElementById('view-remisiones');
  el.innerHTML = '<div class="loading">Cargando remisiones...</div>';
  const r = await rpc('dash_remisiones_resumen', { p_token: TOKEN });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  REMISIONES_DATA = r;
  REMISIONES_KAM_SEL = null;
  renderRemisiones();
}

function renderRemisiones() {
  const el = document.getElementById('view-remisiones');
  const r = REMISIONES_DATA;
  const filas = r.filas || [];
  const meses = [...new Set(filas.map(f => f.mes))].sort((a,b) => a-b);

  const filasFiltradas = REMISIONES_KAM_SEL ? filas.filter(f => f.vendedor === REMISIONES_KAM_SEL) : filas;

  const grupos = {};
  filasFiltradas.forEach(f => {
    grupos[f.vendedor] = grupos[f.vendedor] || {};
    grupos[f.vendedor][f.sucursal_factura] = grupos[f.vendedor][f.sucursal_factura] || {};
    grupos[f.vendedor][f.sucursal_factura][f.mes] = (grupos[f.vendedor][f.sucursal_factura][f.mes]||0) + f.valor;
  });

  let html = renderBarraFiltros([{ id: 'kam', label: 'KAM', valor: REMISIONES_KAM_SEL, valorMostrar: REMISIONES_KAM_SEL ? titleCase(REMISIONES_KAM_SEL) : null }]) +
  `<div class="kpis">
    <div class="kpi"><div class="label">Valor Remisiones</div><div class="value">${money(r.valor_total)}</div></div>
    <div class="kpi"><div class="label"># Remisiones</div><div class="value">${r.num_remisiones||0}</div></div>
  </div>`;

  const totalesPorKam = {};
  filas.forEach(f => { totalesPorKam[f.vendedor] = (totalesPorKam[f.vendedor]||0) + f.valor; });
  const kamOrdenados = Object.keys(totalesPorKam).sort((a,b) => totalesPorKam[b]-totalesPorKam[a]);
  html += `<div class="card"><h2>Totales por KAM (clic para filtrar)</h2><table><tr><th>KAM</th><th class="num">Valor en remisiones</th></tr>`;
  kamOrdenados.forEach(k => {
    const activo = REMISIONES_KAM_SEL === k;
    html += `<tr class="fila-kam-rem" data-kam="${k.replace(/"/g,'&quot;')}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${titleCase(k)}</td><td class="num money">${money(totalesPorKam[k])}</td></tr>`;
  });
  html += `<tr style="font-weight:700;border-top:2px solid var(--neon);"><td>TOTAL</td><td class="num money">${money(r.valor_total)}</td></tr>`;
  html += '</table></div>';

  html += `<div class="card"><h2>Remisiones por vendedor y sucursal</h2><table><tr><th>Vendedor</th><th>Sucursal</th>${meses.map(m=>`<th class="num">${MESES[m-1]}</th>`).join('')}<th class="num">Total</th></tr>`;
  Object.keys(grupos).sort().forEach(vend => {
    const sucursales = grupos[vend];
    Object.keys(sucursales).sort().forEach(suc => {
      let totalFila = 0;
      const celdas = meses.map(m => { const v = sucursales[suc][m]||0; totalFila += v; return `<td class="num money">${v?money(v):''}</td>`; }).join('');
      html += `<tr><td>${titleCase(vend)}</td><td>${suc}</td>${celdas}<td class="num money">${money(totalFila)}</td></tr>`;
    });
  });
  html += '</table></div>';
  el.innerHTML = html;
  habilitarOrdenTablas(el);

  el.querySelectorAll('.fila-kam-rem').forEach(fila => {
    fila.addEventListener('click', () => {
      REMISIONES_KAM_SEL = (REMISIONES_KAM_SEL === fila.dataset.kam) ? null : fila.dataset.kam;
      renderRemisiones();
    });
  });
  activarBarraFiltros(el, { kam: () => { REMISIONES_KAM_SEL = null; renderRemisiones(); } });
}

function colorKpiCartera(pct) {
  if (pct === null || pct === undefined) return 'var(--text-dim)';
  if (pct <= 2.5) return '#4ade80';
  if (pct <= 3.0) return '#ff9f43';
  return '#ff6b6b';
}
function colorDiasVencido(dias) {
  if (dias === null || dias === undefined) return 'var(--text)';
  if (dias > 60) return '#ff6b6b';
  if (dias >= 30) return '#ff9f43';
  return 'var(--text)';
}

let CARTERA_DATA = null;
let CARTERA_KAM_SEL = null;

async function loadCartera() {
  const el = document.getElementById('view-cartera');
  el.innerHTML = '<div class="loading">Cargando cartera...</div>';
  const r = await rpc('dash_cartera_resumen', { p_token: TOKEN });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  CARTERA_DATA = r;
  CARTERA_KAM_SEL = null;
  renderCartera();
}

function renderCartera() {
  const el = document.getElementById('view-cartera');
  const r = CARTERA_DATA;
  const g = r.general || {};
  const colorGeneral = colorKpiCartera(g.kpi_pct);

  let html = renderBarraFiltros([{ id: 'kam', label: 'KAM', valor: CARTERA_KAM_SEL, valorMostrar: CARTERA_KAM_SEL ? titleCase(CARTERA_KAM_SEL) : null }]) +
  `<div class="kpis">
    <div class="kpi"><div class="label">Cartera Total</div><div class="value">${money(g.total)}</div></div>
    <div class="kpi"><div class="label">Cartera &gt; 60 días</div><div class="value">${money(g.vencido_60)}</div></div>
    <div class="kpi"><div class="label">KPI (meta &lt; 2.5%)</div><div class="value" style="color:${colorGeneral};">${g.kpi_pct}%</div></div>
  </div>`;

  html += `<div class="card"><h2>KPI por KAM (meta &lt; 2.5%) (clic para filtrar)</h2><table><tr><th>KAM</th><th class="num">Cartera Total</th><th class="num">Cartera &gt;60 días</th><th class="num">KPI %</th></tr>`;
  (r.por_kam || []).forEach(k => {
    const color = colorKpiCartera(k.kpi_pct);
    const activo = CARTERA_KAM_SEL === k.vendedor;
    html += `<tr class="fila-kam-cartera" data-kam="${(k.vendedor||'').replace(/"/g,'&quot;')}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${esc(titleCase(k.vendedor))}</td><td class="num money">${money(k.total)}</td><td class="num money">${money(k.vencido_60)}</td><td class="num" style="color:${color};font-weight:700;">${k.kpi_pct}%</td></tr>`;
  });
  html += '</table></div>';

  const detalleFiltrado = CARTERA_KAM_SEL ? (r.detalle||[]).filter(d => d.vendedor === CARTERA_KAM_SEL) : (r.detalle||[]);
  html += '<div class="card"><h2>Detalle por sucursal (clic en una fila para ver sus facturas)</h2><table><tr><th>KAM</th><th>Sucursal</th><th class="num">Total</th><th class="num">Vencido &gt;60 días</th><th class="num">Máx. días vencido</th><th class="num">KPI %</th></tr>';
  detalleFiltrado.sort((a,b) => (b.total||0)-(a.total||0)).forEach(d => {
    const colorKpi = colorKpiCartera(d.kpi_pct);
    const colorDias = colorDiasVencido(d.dias_max);
    html += `<tr class="fila-cartera" data-vendedor="${(d.vendedor||'').replace(/"/g,'&quot;')}" data-sucursal="${(d.sucursal||'').replace(/"/g,'&quot;')}" style="cursor:pointer;"><td>${esc(titleCase(d.vendedor||''))}</td><td>${esc(d.sucursal||'')}</td><td class="num money">${money(d.total)}</td><td class="num money">${money(d.vencido_60)}</td><td class="num" style="color:${colorDias};font-weight:700;">${d.dias_max}</td><td class="num" style="color:${colorKpi};font-weight:700;">${d.kpi_pct}%</td></tr>`;
  });
  html += '</table></div>';
  html += '<div id="cartera-facturas"></div>';
  el.innerHTML = html;
  autoFitKpis();
  habilitarOrdenTablas(el);

  el.querySelectorAll('.fila-kam-cartera').forEach(fila => {
    fila.addEventListener('click', () => {
      CARTERA_KAM_SEL = (CARTERA_KAM_SEL === fila.dataset.kam) ? null : fila.dataset.kam;
      renderCartera();
    });
  });
  activarBarraFiltros(el, { kam: () => { CARTERA_KAM_SEL = null; renderCartera(); } });

  el.querySelectorAll('.fila-cartera').forEach(fila => {
    fila.addEventListener('click', () => mostrarFacturasCartera(fila.dataset.vendedor, fila.dataset.sucursal));
  });
}

async function mostrarFacturasCartera(vendedor, sucursal) {
  const el = document.getElementById('cartera-facturas');
  el.innerHTML = '<div class="loading">Cargando facturas...</div>';
  const r = await rpc('dash_cartera_facturas', { p_token: TOKEN, p_vendedor: vendedor, p_sucursal: sucursal });
  if (!r.ok) { el.innerHTML = ''; return; }
  const facturas = r.data || [];
  let html = `<div class="card"><h2>Facturas — ${sucursal} (${titleCase(vendedor)})</h2><table><tr><th>Nro. documento</th><th>Fecha factura</th><th>Fecha real vencimiento</th><th class="num">Valor</th><th class="num">Días vencido</th></tr>`;
  facturas.forEach(f => {
    const color = colorDiasVencido(f.dias_real_vencido);
    html += `<tr><td>${esc(f.nro_documento_cruce||'')}</td><td>${f.fecha_docto_cruce||''}</td><td>${f.fecha_real_vencimiento||''}</td><td class="num money">${money(f.total_cop)}</td><td class="num" style="color:${color};font-weight:700;">${f.dias_real_vencido}</td></tr>`;
  });
  html += '</table></div>';
  el.innerHTML = html;
  habilitarOrdenTablas(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function barraSigno(items, labelKey, valueKey) {
  const maxAbs = Math.max(...items.map(i => Math.abs(i[valueKey]||0)), 1);
  const filaAltura = 26;
  let filas = '';
  items.forEach(it => {
    const v = it[valueKey] || 0;
    const color = v >= 0 ? '#4ade80' : '#ff6b6b';
    const ancho = Math.max(2, (Math.abs(v)/maxAbs) * 55);
    filas += `<div style="display:flex;align-items:center;gap:6px;height:${filaAltura}px;">
      <div style="width:150px;font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;" title="${esc(it[labelKey]||'')}">${esc(it[labelKey]||'')}</div>
      <div style="flex:1;background:#333630;border-radius:3px;height:14px;">
        <div style="width:${ancho}%;height:100%;background:${color};border-radius:3px;"></div>
      </div>
      <div style="width:130px;font-size:11px;color:${color};font-weight:700;text-align:right;flex-shrink:0;">${v>=0?'+':''}${money(v)}</div>
    </div>`;
  });
  return `<div>${filas}</div>`;
}

let TABLERO_MES = null;
let TABLERO_EXCLUIDAS_CACHE = {};

function cargarExcluidasStorage(mes) {
  try { return JSON.parse(localStorage.getItem('brk_remisiones_excluidas_mes_' + mes) || '[]'); }
  catch(e) { return []; }
}
function guardarExcluidasStorage(mes, arr) {
  localStorage.setItem('brk_remisiones_excluidas_mes_' + mes, JSON.stringify(arr));
}

async function loadTableroControl(mesParam) {
  const el = document.getElementById('view-tablerocontrol');
  const mes = mesParam || TABLERO_MES || (new Date().getMonth() + 1);
  TABLERO_MES = mes;
  el.innerHTML = '<div class="loading">Cargando tablero de control...</div>';

  const excluidas = cargarExcluidasStorage(mes);
  const r = await rpc('dash_tablero_control', { p_token: TOKEN, p_mes: parseInt(mes), p_anio: 2026, p_remisiones_excluidas: excluidas });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }

  const factTotal = (r.general.facturado||0) + (r.general.remisiones||0);
  const deberiaHoy = r.dias_habiles_totales ? (r.presupuesto_mes / r.dias_habiles_totales) * r.dias_habiles_corridos : 0;
  const faltanteHoy = factTotal - deberiaHoy;
  const faltante100 = factTotal - r.presupuesto_mes;
  const pctCumpl = r.presupuesto_mes ? Math.round((factTotal / r.presupuesto_mes) * 1000)/10 : 0;

  const porKam = (r.por_kam || []).map(k => {
    const deberiaHoyKam = r.dias_habiles_totales ? (k.presupuesto / r.dias_habiles_totales) * r.dias_habiles_corridos : 0;
    return {
      vendedor: k.vendedor,
      fact_remas: k.fact_remas,
      faltante_hoy: k.fact_remas - deberiaHoyKam,
      faltante_100: k.fact_remas - k.presupuesto,
      pct_cumpl: k.presupuesto ? Math.round((k.fact_remas / k.presupuesto) * 1000)/10 : 0
    };
  });

  const colorFaltante = (v) => v >= 0 ? '#4ade80' : '#ff6b6b';

  let html = `<div class="card" style="padding:12px 20px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
    <span style="font-size:12px;color:var(--text-dim);">Mes:</span>
    <select id="tcMes" class="estado">${optMeses(mes)}</select>
    <button id="tcFiltrar" style="width:auto;padding:6px 14px;font-size:12px;">Ver</button>
    <span style="margin-left:auto;font-size:11px;color:var(--text-dim);">${excluidas.length} remisión(es) excluida(s) del cierre — ver abajo</span>
  </div>`;

  html += `<div class="kpis">
    <div class="kpi"><div class="label">Presupuesto</div><div class="value">${money(r.presupuesto_mes)}</div></div>
    <div class="kpi"><div class="label">Fact + Remas - NC</div><div class="value">${money(factTotal)}</div></div>
    <div class="kpi"><div class="label">Faltante a hoy</div><div class="value" style="color:${colorFaltante(faltanteHoy)};">${faltanteHoy>=0?'+':''}${money(faltanteHoy)}</div></div>
    <div class="kpi"><div class="label">Faltante 100%</div><div class="value" style="color:${colorFaltante(faltante100)};">${faltante100>=0?'+':''}${money(faltante100)}</div></div>
    <div class="kpi"><div class="label">% Cumplimiento</div><div class="value" style="color:${colorFaltante(pctCumpl-100)};">${pctCumpl}%</div></div>
  </div>`;

  const porKamOrdenFijo = porKam.slice().sort((a,b) => b.fact_remas - a.fact_remas);

  html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px;">
    <div class="card"><h2>Fact + Remas - NC por KAM</h2>${barraSigno(porKamOrdenFijo, 'vendedor', 'fact_remas')}</div>
    <div class="card"><h2>Faltante a hoy por KAM</h2>${barraSigno(porKamOrdenFijo, 'vendedor', 'faltante_hoy')}</div>
  </div>`;

  html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px;margin-top:16px;">
    <div class="card"><h2>% Cumplimiento por KAM</h2><table><tr><th>KAM</th><th class="num">% Cumpl.</th></tr>
      ${porKamOrdenFijo.map(k => `<tr><td>${esc(titleCase(k.vendedor))}</td><td class="num" style="color:${colorFaltante(k.pct_cumpl-100)};font-weight:700;">${k.pct_cumpl}%</td></tr>`).join('')}
    </table></div>
    <div class="card"><h2>Faltante para 100% por KAM</h2>${barraSigno(porKamOrdenFijo, 'vendedor', 'faltante_100')}</div>
  </div>`;

  // Selector de remisiones a incluir/excluir del cierre
  const remisiones = r.remisiones_mes || [];
  const gruposRem = {};
  remisiones.forEach(rm => {
    const clave = (rm.cliente||'') + '||' + (rm.sucursal_factura||'');
    if (!gruposRem[clave]) gruposRem[clave] = { cliente: rm.cliente, sucursal_factura: rm.sucursal_factura, vendedor: rm.vendedor, total: 0, docs: [] };
    gruposRem[clave].total += rm.valor_subtotal;
    gruposRem[clave].docs.push(rm.nro_documento);
  });
  const gruposRemArr = Object.values(gruposRem).sort((a,b) => b.total - a.total);

  html += `<div class="card" style="margin-top:16px;"><h2>Remisiones del mes por sucursal — desmarca las que NO se van a facturar (se recalcula al instante)</h2>
    <div style="max-height:340px;overflow-y:auto;">
    <table><tr><th style="width:40px;"></th><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th class="num"># Remisiones</th><th class="num">Valor total</th></tr>
    ${gruposRemArr.map((g, i) => {
      const marcado = g.docs.every(d => !excluidas.includes(d));
      return `<tr><td><input type="checkbox" class="chk-remision-grupo" data-idx="${i}" ${marcado?'checked':''} ${ROL!=='admin'?'disabled':''}></td><td>${esc(g.cliente)}</td><td>${esc(g.sucursal_factura||'')}</td><td>${esc(titleCase(g.vendedor||''))}</td><td class="num">${g.docs.length}</td><td class="num money">${money(g.total)}</td></tr>`;
    }).join('')}
    </table></div>
    ${ROL==='admin' ? `<div style="margin-top:10px;display:flex;gap:10px;">
      <button id="tcMarcarTodas" style="width:auto;padding:6px 14px;font-size:12px;background:transparent;border:1px solid var(--dust);color:var(--text-dim);">Marcar todas</button>
      <button id="tcDesmarcarTodas" style="width:auto;padding:6px 14px;font-size:12px;background:transparent;border:1px solid var(--dust);color:var(--text-dim);">Desmarcar todas</button>
    </div>` : '<p style="font-size:11px;color:var(--text-dim);margin-top:8px;">Solo el Administrador puede modificar esta selección.</p>'}
  </div>`;

  el.innerHTML = html;
  autoFitKpis();

  document.getElementById('tcFiltrar').addEventListener('click', () => {
    loadTableroControl(document.getElementById('tcMes').value);
  });

  el.querySelectorAll('.chk-remision-grupo').forEach(chk => {
    chk.addEventListener('change', () => {
      const grupo = gruposRemArr[parseInt(chk.dataset.idx)];
      const excluidasActuales = cargarExcluidasStorage(mes);
      grupo.docs.forEach(doc => {
        const idx = excluidasActuales.indexOf(doc);
        if (chk.checked && idx >= 0) excluidasActuales.splice(idx, 1);
        if (!chk.checked && idx < 0) excluidasActuales.push(doc);
      });
      guardarExcluidasStorage(mes, excluidasActuales);
      loadTableroControl(mes);
    });
  });
  const btnMarcar = document.getElementById('tcMarcarTodas');
  if (btnMarcar) btnMarcar.addEventListener('click', () => { guardarExcluidasStorage(mes, []); loadTableroControl(mes); });
  const btnDesmarcar = document.getElementById('tcDesmarcarTodas');
  if (btnDesmarcar) btnDesmarcar.addEventListener('click', () => { guardarExcluidasStorage(mes, remisiones.map(rm=>rm.nro_documento)); loadTableroControl(mes); });
}

const NOMBRES_ROL = { admin: 'Administrador', colaborador: 'Colaborador', gerencia: 'Gerencia General' };

const KAMS_CONOCIDOS = ['PEREZ RAMIREZ JHONATAN ALEXANDER','FRANCO ARBOLEDA MARIA ISABEL','LONDOÑO MEJIA JOSE GLEISON','ARISMENDY CRUZ CRISTIAN YONARD','BEDOYA VELASQUEZ JORGE ESTEBAN','GOMEZ RODRIGUEZ CARLOS ANDRES'];

function checksKam(idPrefijo, seleccionados) {
  seleccionados = seleccionados || [];
  return KAMS_CONOCIDOS.map(k => `
    <label style="display:flex;align-items:center;gap:6px;font-size:12px;padding:3px 0;">
      <input type="checkbox" class="${idPrefijo}-chk" value="${k}" ${seleccionados.includes(k)?'checked':''}>
      ${titleCase(k)}
    </label>`).join('');
}

async function loadUsuarios() {
  const el = document.getElementById('view-usuarios');
  el.innerHTML = '<div class="loading">Cargando usuarios...</div>';
  const r = await rpc('dash_usuarios_listar', { p_token: TOKEN });
  if (!r.ok) { el.innerHTML = `<div class="loading">${r.error || 'Sin acceso.'}</div>`; return; }

  let html = `<div class="card"><h2>Crear nuevo usuario</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
      <input type="email" id="nuEmail" placeholder="correo@brkbrakes.com">
      <input type="password" id="nuPassword" placeholder="contraseña temporal">
      <input type="text" id="nuNombre" placeholder="Nombre a mostrar">
      <select id="nuRol" class="estado">
        <option value="colaborador">Colaborador</option>
        <option value="gerencia">Gerencia General</option>
        <option value="admin">Administrador</option>
      </select>
    </div>
    <div style="margin-top:10px;">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">KAM asignado(s) — solo aplica para Colaborador, puedes elegir varios</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:2px;background:#2c3126;padding:8px;border-radius:6px;">${checksKam('nu', [])}</div>
    </div>
    <button id="nuCrear" style="width:auto;margin-top:10px;">Crear usuario</button>
    <div id="nuEstado" style="margin-top:10px;font-size:12px;color:var(--text-dim);"></div>
  </div>`;

  html += '<div class="card"><h2>Usuarios existentes</h2><table><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>KAM asignado</th><th>Bloqueado</th><th>Acciones</th></tr>';
  (r.data || []).forEach(u => {
    const kams = (u.kam_asignados||[]).map(k=>titleCase(k)).join(', ') || '—';
    html += `<tr>
      <td>${esc(u.nombre)}</td><td>${esc(u.email)}</td><td>${NOMBRES_ROL[u.rol]||u.rol}</td><td>${kams}</td>
      <td>${u.locked ? '🔒 Sí' : 'No'}</td>
      <td><button class="btn-editar-user" data-id="${u.id}" style="width:auto;padding:4px 10px;font-size:11px;">Editar</button></td>
    </tr>`;
  });
  html += '</table></div>';
  html += '<div id="editar-usuario-panel"></div>';

  el.innerHTML = html;

  document.getElementById('nuCrear').addEventListener('click', async () => {
    const email = document.getElementById('nuEmail').value.trim();
    const password = document.getElementById('nuPassword').value;
    const nombre = document.getElementById('nuNombre').value.trim();
    const rol = document.getElementById('nuRol').value;
    const kams = Array.from(el.querySelectorAll('.nu-chk:checked')).map(c => c.value);
    const estado = document.getElementById('nuEstado');
    if (!email || !password || !nombre) { estado.innerHTML = '<span style="color:#ff6b6b;">Completa correo, contraseña y nombre.</span>'; return; }
    const res = await rpc('dash_usuarios_crear', { p_token: TOKEN, p_email: email, p_password: password, p_nombre: nombre, p_rol: rol, p_kam_asignados: kams });
    if (res.ok) { estado.innerHTML = '<span style="color:#4ade80;">✓ Usuario creado.</span>'; loadUsuarios(); }
    else { estado.innerHTML = `<span style="color:#ff6b6b;">${res.error}</span>`; }
  });

  el.querySelectorAll('.btn-editar-user').forEach(btn => {
    btn.addEventListener('click', () => abrirEditorUsuario(btn.dataset.id, r.data));
  });
}

function abrirEditorUsuario(userId, usuarios) {
  const u = usuarios.find(x => x.id === userId);
  const panel = document.getElementById('editar-usuario-panel');
  const esSuperAdmin = u.email === 'carlos.gomez@brkbrakes.com';
  panel.innerHTML = `<div class="card" style="border:1px solid var(--neon);">
    <h2>Editar — ${esc(u.nombre)}</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
      <div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">Rol</div>
        <select id="edRol" class="estado" ${esSuperAdmin?'disabled':''}>
          <option value="colaborador" ${u.rol==='colaborador'?'selected':''}>Colaborador</option>
          <option value="gerencia" ${u.rol==='gerencia'?'selected':''}>Gerencia General</option>
          <option value="admin" ${u.rol==='admin'?'selected':''}>Administrador</option>
        </select>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">Nueva contraseña (dejar vacío para no cambiar)</div>
        <input type="password" id="edPassword" placeholder="Nueva contraseña">
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">Estado</div>
        <select id="edLocked" class="estado" ${esSuperAdmin?'disabled':''}>
          <option value="false" ${!u.locked?'selected':''}>Activo</option>
          <option value="true" ${u.locked?'selected':''}>Bloqueado</option>
        </select>
      </div>
    </div>
    <div style="margin-top:10px;">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">KAM asignado(s)</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:2px;background:#2c3126;padding:8px;border-radius:6px;">${checksKam('ed', u.kam_asignados||[])}</div>
    </div>
    <div style="margin-top:12px;display:flex;gap:10px;">
      <button id="edGuardar" style="width:auto;">Guardar cambios</button>
      <button id="edCancelar" style="width:auto;background:transparent;border:1px solid var(--dust);color:var(--text-dim);">Cancelar</button>
      ${!esSuperAdmin ? `<button id="edEliminar" style="width:auto;background:transparent;border:1px solid #ff6b6b;color:#ff6b6b;margin-left:auto;">Eliminar usuario</button>` : ''}
    </div>
    <div id="edEstado" style="margin-top:10px;font-size:12px;color:var(--text-dim);"></div>
  </div>`;
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  document.getElementById('edGuardar').addEventListener('click', async () => {
    const rol = document.getElementById('edRol').value;
    const password = document.getElementById('edPassword').value;
    const locked = document.getElementById('edLocked').value === 'true';
    const kams = Array.from(panel.querySelectorAll('.ed-chk:checked')).map(c => c.value);
    const estado = document.getElementById('edEstado');

    const res = await rpc('dash_usuarios_editar', { p_token: TOKEN, p_user_id: userId, p_rol: esSuperAdmin?null:rol, p_kam_asignados: kams, p_locked: esSuperAdmin?null:locked });
    if (!res.ok) { estado.innerHTML = `<span style="color:#ff6b6b;">${res.error}</span>`; return; }

    if (password) {
      const res2 = await rpc('dash_usuarios_cambiar_password_admin', { p_token: TOKEN, p_user_id: userId, p_password_nueva: password });
      if (!res2.ok) { estado.innerHTML = `<span style="color:#ff6b6b;">${res2.error}</span>`; return; }
    }
    estado.innerHTML = '<span style="color:#4ade80;">✓ Cambios guardados.</span>';
    loadUsuarios();
  });
  document.getElementById('edCancelar').addEventListener('click', () => { panel.innerHTML = ''; });
  const btnEliminar = document.getElementById('edEliminar');
  if (btnEliminar) btnEliminar.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar al usuario ${u.nombre}? Esta acción no se puede deshacer.`)) return;
    const res = await rpc('dash_usuarios_eliminar', { p_token: TOKEN, p_user_id: userId });
    if (res.ok) loadUsuarios(); else alert(res.error || 'Error');
  });
}

let FACILITADORES_MES = null;
let FACILITADORES_CLIENTE = null;
let FACILITADORES_TIPO = null;
let FACILITADORES_KAM = null;
let FACILITADORES_FACILITADOR = null;
let FACILITADORES_DIA_SEMANA = null;
let FACILITADORES_HORA = null;
let FACILITADORES_FECHA = null;
let FACILITADORES_FILTROS_HTML = '';

async function loadFacilitadores(mes, cliente, tipo, kam, facilitador, diaSemana, hora, fecha) {
  const el = document.getElementById('view-facilitadores');
  el.innerHTML = '<div class="loading">Cargando facilitadores...</div>';
  FACILITADORES_MES = mes !== undefined ? mes : FACILITADORES_MES;
  FACILITADORES_CLIENTE = cliente !== undefined ? cliente : FACILITADORES_CLIENTE;
  FACILITADORES_TIPO = tipo !== undefined ? tipo : FACILITADORES_TIPO;
  FACILITADORES_KAM = kam !== undefined ? kam : FACILITADORES_KAM;
  FACILITADORES_FACILITADOR = facilitador !== undefined ? facilitador : FACILITADORES_FACILITADOR;
  FACILITADORES_DIA_SEMANA = diaSemana !== undefined ? diaSemana : FACILITADORES_DIA_SEMANA;
  FACILITADORES_HORA = hora !== undefined ? hora : FACILITADORES_HORA;
  FACILITADORES_FECHA = fecha !== undefined ? fecha : FACILITADORES_FECHA;

  const r = await rpc('dash_facilitadores_resumen', {
    p_token: TOKEN,
    p_mes: FACILITADORES_MES ? parseInt(FACILITADORES_MES) : null,
    p_cliente: FACILITADORES_CLIENTE || null,
    p_tipo: FACILITADORES_TIPO || null,
    p_kam: FACILITADORES_KAM || null,
    p_facilitador: FACILITADORES_FACILITADOR || null,
    p_dia_semana: FACILITADORES_DIA_SEMANA ? parseInt(FACILITADORES_DIA_SEMANA) : null,
    p_hora: (FACILITADORES_HORA !== null && FACILITADORES_HORA !== undefined && FACILITADORES_HORA !== '') ? parseInt(FACILITADORES_HORA) : null,
    p_fecha: FACILITADORES_FECHA || null
  });
  if (!r.ok) { el.innerHTML = `<div class="loading">${r.error || 'Sesión expirada.'}</div>`; return; }

  if (!FACILITADORES_FILTROS_HTML) {
    const f = r.filtros || {};
    const optSimple = (arr) => (arr||[]).sort().map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    FACILITADORES_FILTROS_HTML = `<div class="card" style="padding:12px 20px;margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;">
      <select id="fzMes" class="estado"><option value="">Todos los meses</option>
        <option value="1">Ene</option><option value="2">Feb</option><option value="3">Mar</option>
        <option value="4">Abr</option><option value="5">May</option><option value="6">Jun</option><option value="7">Jul</option>
      </select>
      <select id="fzCliente" class="estado"><option value="">Todos los clientes</option>${optSimple(f.clientes)}</select>
      <select id="fzTipo" class="estado"><option value="">Todos los tipos</option>${optSimple(f.tipos)}</select>
      <button id="fzFiltrar" style="width:auto;padding:6px 14px;font-size:12px;">Filtrar</button>
      <button id="fzLimpiar" style="width:auto;padding:6px 14px;font-size:12px;background:transparent;border:1px solid var(--dust);color:var(--text-dim);">Quitar todos los filtros</button>
    </div>`;
  }

  let html = FACILITADORES_FILTROS_HTML;

  // Barra de filtros activos (chips con "x")
  const NOMBRES_DIA_SEMANA = {1:'Lunes',2:'Martes',3:'Miércoles',4:'Jueves',5:'Viernes',6:'Sábado',7:'Domingo'};
  html += renderBarraFiltros([
    { id: 'mes', label: 'Mes', valor: FACILITADORES_MES, valorMostrar: FACILITADORES_MES ? MESES[parseInt(FACILITADORES_MES)-1] : null },
    { id: 'cliente', label: 'Cliente', valor: FACILITADORES_CLIENTE },
    { id: 'tipo', label: 'Tipo', valor: FACILITADORES_TIPO },
    { id: 'kam', label: 'KAM', valor: FACILITADORES_KAM, valorMostrar: FACILITADORES_KAM ? titleCase(FACILITADORES_KAM) : null },
    { id: 'facilitador', label: 'Facilitador', valor: FACILITADORES_FACILITADOR, valorMostrar: FACILITADORES_FACILITADOR ? titleCase(FACILITADORES_FACILITADOR) : null },
    { id: 'diasemana', label: 'Día', valor: FACILITADORES_DIA_SEMANA, valorMostrar: NOMBRES_DIA_SEMANA[FACILITADORES_DIA_SEMANA] },
    { id: 'hora', label: 'Hora', valor: (FACILITADORES_HORA !== null && FACILITADORES_HORA !== undefined) ? FACILITADORES_HORA : null, valorMostrar: (FACILITADORES_HORA !== null && FACILITADORES_HORA !== undefined) ? String(FACILITADORES_HORA).padStart(2,'0') + ':00' : null },
    { id: 'fecha', label: 'Fecha', valor: FACILITADORES_FECHA }
  ]);

  html += `<div class="kpis">
    <div class="kpi"><div class="label">Total Servicios</div><div class="value">${(r.total_servicios||0).toLocaleString('es-CO')}</div></div>
    <div class="kpi"><div class="label">Días Hábiles del Periodo</div><div class="value" style="font-size:20px;">${r.dias_habiles_periodo||0}</div></div>
    <div class="kpi"><div class="label">Promedio por Día</div><div class="value">${r.promedio_por_dia||0}</div></div>
    <div class="kpi"><div class="label">Servicios por KAM (teórico, total/3)</div><div class="value">${r.servicios_por_kam_teorico||0}</div></div>
    <div class="kpi"><div class="label">Servicios x KAM x Día</div><div class="value">${r.servicios_por_kam_por_dia_habil||0}</div></div>
  </div>`;

  // Por KAM (3 comerciales de Medellín) — clicable
  html += `<div class="card"><h2>Servicios por Comercial (Medellín) (clic para filtrar)</h2><table><tr><th>KAM</th><th class="num">Servicios</th><th class="num">Servicios/Día</th></tr>`;
  (r.por_kam || []).forEach(k => {
    const esKam = !k.kam.includes('Sin identificar');
    const activo = FACILITADORES_KAM === k.kam;
    html += `<tr class="fila-fz-kam" data-kam="${esc(k.kam)}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${esKam ? titleCase(k.kam) : esc(k.kam)}</td><td class="num">${k.total}</td><td class="num">${k.promedio_dia}</td></tr>`;
  });
  html += '</table></div>';

  // Por facilitador (capacidad real) — clicable
  html += `<div class="card"><h2>Servicios por Facilitador — ¿nos sobra o nos falta gente? (clic para filtrar)</h2><table><tr><th>Facilitador</th><th class="num">Total</th><th class="num">Días activos</th><th class="num">Promedio/día</th><th class="num">Máximo en 1 día</th></tr>`;
  (r.por_facilitador || []).forEach(fac => {
    const activo = FACILITADORES_FACILITADOR === fac.facilitador;
    html += `<tr class="fila-fz-facilitador" data-facilitador="${esc(fac.facilitador)}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${esc(titleCase(fac.facilitador))}</td><td class="num">${fac.total}</td><td class="num">${fac.dias_activos}</td><td class="num">${fac.promedio_dia_habil}</td><td class="num">${fac.maximo_en_un_dia}</td></tr>`;
  });
  html += '</table></div>';

  // Por tipo de servicio — clicable
  html += `<div class="card"><h2>Servicios por Tipo (clic para filtrar)</h2><table><tr><th>Tipo</th><th class="num">Servicios</th></tr>`;
  (r.por_tipo || []).forEach(t => {
    const activo = FACILITADORES_TIPO === t.tipo_servicio;
    html += `<tr class="fila-fz-tipo" data-tipo="${esc(t.tipo_servicio)}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${esc(t.tipo_servicio)}</td><td class="num">${t.n}</td></tr>`;
  });
  html += '</table></div>';

  // Clientes que más piden en un solo día — clicable
  html += `<div class="card"><h2>Clientes con más servicios en un mismo día (top 15) (clic para filtrar)</h2><table><tr><th>Cliente</th><th class="num">Máximo en 1 día</th><th class="num">Total en el periodo</th></tr>`;
  (r.top_clientes_dia || []).forEach(c => {
    const activo = FACILITADORES_CLIENTE === c.cliente;
    html += `<tr class="fila-fz-cliente" data-cliente="${esc(c.cliente)}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${esc(c.cliente)}</td><td class="num">${c.max_dia}</td><td class="num">${c.total_periodo}</td></tr>`;
  });
  html += '</table></div>';

  // Tiempo de respuesta (solo disponible desde julio, cuando Logística empezó a registrar hora de finalización)
  const tr = r.tiempo_respuesta || {};
  if (tr.con_dato) {
    html += `<div class="kpis">
      <div class="kpi"><div class="label">Tiempo de Respuesta (mediana)</div><div class="value">${tr.mediana_minutos} min</div></div>
      <div class="kpi"><div class="label">Tiempo de Respuesta (promedio)</div><div class="value">${tr.promedio_minutos} min</div></div>
      <div class="kpi"><div class="label">Con dato de finalización</div><div class="value" style="font-size:20px;">${tr.con_dato} servicios</div></div>
    </div>`;

    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;margin-bottom:16px;">';
    html += `<div class="card"><h2>Tiempo de respuesta por Tipo (clic para filtrar)</h2><table><tr><th>Tipo</th><th class="num">Servicios</th><th class="num">Promedio (min)</th></tr>`;
    (r.tiempo_respuesta_por_tipo || []).forEach(t => {
      const activo = FACILITADORES_TIPO === t.tipo_servicio;
      html += `<tr class="fila-fz-tipo" data-tipo="${esc(t.tipo_servicio)}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${esc(t.tipo_servicio)}</td><td class="num">${t.n}</td><td class="num">${t.promedio_minutos}</td></tr>`;
    });
    html += '</table></div>';
    html += `<div class="card"><h2>Tiempo de respuesta por Facilitador (clic para filtrar)</h2><table><tr><th>Facilitador</th><th class="num">Servicios</th><th class="num">Promedio (min)</th></tr>`;
    (r.tiempo_respuesta_por_facilitador || []).forEach(t => {
      const activo = FACILITADORES_FACILITADOR === t.facilitador;
      html += `<tr class="fila-fz-facilitador" data-facilitador="${esc(t.facilitador)}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${esc(titleCase(t.facilitador))}</td><td class="num">${t.n}</td><td class="num">${t.promedio_minutos}</td></tr>`;
    });
    html += '</table></div></div>';
  } else {
    html += '<div class="card"><p style="color:var(--text-dim);font-size:12px;">Tiempo de respuesta: aún no hay datos con fecha de finalización en el periodo seleccionado (disponible desde julio 2026 en adelante).</p></div>';
  }

  // Patrón por día de la semana y hora del día — para programar turnos (clicables)
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;margin-bottom:16px;">';
  html += `<div class="card"><h2>Servicios por Día de la Semana (clic para filtrar)</h2><table><tr><th>Día</th><th class="num">Servicios</th></tr>`;
  (r.por_dia_semana || []).forEach(d => {
    const activo = FACILITADORES_DIA_SEMANA === String(d.isodow);
    html += `<tr class="fila-fz-diasemana" data-diasemana="${d.isodow}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${d.dia_semana}</td><td class="num">${d.total}</td></tr>`;
  });
  html += '</table></div>';
  html += `<div class="card"><h2>Servicios por Hora del Día (clic para filtrar)</h2><table><tr><th>Hora</th><th class="num">Servicios</th></tr>`;
  (r.por_hora || []).forEach(h => {
    const activo = FACILITADORES_HORA === String(h.hora);
    html += `<tr class="fila-fz-hora" data-hora="${h.hora}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${String(h.hora).padStart(2,'0')}:00</td><td class="num">${h.total}</td></tr>`;
  });
  html += '</table></div></div>';

  // Servicios por día (tendencia) — clicable por fecha específica
  html += `<div class="card"><h2>Servicios por día (clic para filtrar)</h2><table><tr><th>Día</th><th class="num">Servicios</th><th class="num">Servicios/KAM</th><th class="num">Facilitadores activos</th></tr>`;
  (r.por_dia || []).forEach(d => {
    const activo = FACILITADORES_FECHA === d.dia;
    html += `<tr class="fila-fz-fecha" data-fecha="${d.dia}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${d.dia}</td><td class="num">${d.total}</td><td class="num">${Math.round((d.total/3)*10)/10}</td><td class="num">${d.facilitadores_activos}</td></tr>`;
  });
  html += '</table></div>';

  el.innerHTML = html;
  autoFitKpis();
  habilitarOrdenTablas(el);

  document.getElementById('fzMes').value = FACILITADORES_MES || '';
  document.getElementById('fzCliente').value = FACILITADORES_CLIENTE || '';
  document.getElementById('fzTipo').value = FACILITADORES_TIPO || '';
  document.getElementById('fzFiltrar').addEventListener('click', () => {
    loadFacilitadores(
      document.getElementById('fzMes').value,
      document.getElementById('fzCliente').value,
      document.getElementById('fzTipo').value,
      FACILITADORES_KAM,
      FACILITADORES_FACILITADOR,
      FACILITADORES_DIA_SEMANA,
      FACILITADORES_HORA,
      FACILITADORES_FECHA
    );
  });
  document.getElementById('fzLimpiar').addEventListener('click', () => {
    loadFacilitadores(null, null, null, null, null, null, null, null);
  });

  el.querySelectorAll('.fila-fz-kam').forEach(fila => {
    fila.addEventListener('click', () => {
      loadFacilitadores(undefined, undefined, undefined, FACILITADORES_KAM === fila.dataset.kam ? null : fila.dataset.kam, undefined);
    });
  });
  el.querySelectorAll('.fila-fz-facilitador').forEach(fila => {
    fila.addEventListener('click', () => {
      loadFacilitadores(undefined, undefined, undefined, undefined, FACILITADORES_FACILITADOR === fila.dataset.facilitador ? null : fila.dataset.facilitador);
    });
  });
  el.querySelectorAll('.fila-fz-tipo').forEach(fila => {
    fila.addEventListener('click', () => {
      loadFacilitadores(undefined, undefined, FACILITADORES_TIPO === fila.dataset.tipo ? null : fila.dataset.tipo, undefined, undefined);
    });
  });
  el.querySelectorAll('.fila-fz-cliente').forEach(fila => {
    fila.addEventListener('click', () => {
      loadFacilitadores(undefined, FACILITADORES_CLIENTE === fila.dataset.cliente ? null : fila.dataset.cliente, undefined, undefined, undefined);
    });
  });
  el.querySelectorAll('.fila-fz-diasemana').forEach(fila => {
    fila.addEventListener('click', () => {
      const nuevo = FACILITADORES_DIA_SEMANA === fila.dataset.diasemana ? null : fila.dataset.diasemana;
      loadFacilitadores(undefined, undefined, undefined, undefined, undefined, nuevo, undefined, undefined);
    });
  });
  el.querySelectorAll('.fila-fz-hora').forEach(fila => {
    fila.addEventListener('click', () => {
      const nuevo = FACILITADORES_HORA === fila.dataset.hora ? null : fila.dataset.hora;
      loadFacilitadores(undefined, undefined, undefined, undefined, undefined, undefined, nuevo, undefined);
    });
  });
  el.querySelectorAll('.fila-fz-fecha').forEach(fila => {
    fila.addEventListener('click', () => {
      const nuevo = FACILITADORES_FECHA === fila.dataset.fecha ? null : fila.dataset.fecha;
      loadFacilitadores(undefined, undefined, undefined, undefined, undefined, undefined, undefined, nuevo);
    });
  });

  activarBarraFiltros(el, {
    mes: () => loadFacilitadores(null, undefined, undefined, undefined, undefined),
    cliente: () => loadFacilitadores(undefined, null, undefined, undefined, undefined),
    tipo: () => loadFacilitadores(undefined, undefined, null, undefined, undefined),
    kam: () => loadFacilitadores(undefined, undefined, undefined, null, undefined),
    facilitador: () => loadFacilitadores(undefined, undefined, undefined, undefined, null),
    diasemana: () => loadFacilitadores(undefined, undefined, undefined, undefined, undefined, null, undefined, undefined),
    hora: () => loadFacilitadores(undefined, undefined, undefined, undefined, undefined, undefined, null, undefined),
    fecha: () => loadFacilitadores(undefined, undefined, undefined, undefined, undefined, undefined, undefined, null)
  }, () => loadFacilitadores(null, null, null, null, null, null, null, null));
}

// ---- Helper genérico: agrupa filas {mes, valorField} en pivote por mes ----
function pivotarPorMes(filas, obtenerClave, valorField) {
  const grupos = {};
  (filas || []).forEach(f => {
    const clave = obtenerClave(f);
    if (!grupos[clave.id]) grupos[clave.id] = Object.assign({}, clave, { meses: {}, total: 0 });
    grupos[clave.id].meses[f.mes] = (grupos[clave.id].meses[f.mes] || 0) + (f[valorField] || 0);
    grupos[clave.id].total += (f[valorField] || 0);
  });
  return Object.values(grupos).sort((a, b) => b.total - a.total);
}

let CLIENTES_MES = null;
let CLIENTES_KAM = null;
let CLIENTES_CLIENTE = null;
let CLIENTES_SUCURSAL = null;
let CLIENTES_REFERENCIA = null;
let CLIENTES_NRO_DOCUMENTO = null;
let CLIENTES_FILTROS_HTML = '';

async function loadClientes(mes, kam, cliente, sucursal, referencia, nroDocumento) {
  const el = document.getElementById('view-clientes');
  el.innerHTML = '<div class="loading">Cargando clientes...</div>';
  CLIENTES_MES = mes !== undefined ? mes : CLIENTES_MES;
  CLIENTES_KAM = kam !== undefined ? kam : CLIENTES_KAM;
  CLIENTES_CLIENTE = cliente !== undefined ? cliente : CLIENTES_CLIENTE;
  CLIENTES_SUCURSAL = sucursal !== undefined ? sucursal : CLIENTES_SUCURSAL;
  CLIENTES_REFERENCIA = referencia !== undefined ? referencia : CLIENTES_REFERENCIA;
  CLIENTES_NRO_DOCUMENTO = nroDocumento !== undefined ? nroDocumento : CLIENTES_NRO_DOCUMENTO;

  const r = await rpc('dash_clientes_resumen', {
    p_token: TOKEN,
    p_mes: CLIENTES_MES ? parseInt(CLIENTES_MES) : null,
    p_kam: CLIENTES_KAM || null,
    p_cliente: CLIENTES_CLIENTE || null,
    p_sucursal: CLIENTES_SUCURSAL || null,
    p_referencia: CLIENTES_REFERENCIA || null,
    p_nro_documento: CLIENTES_NRO_DOCUMENTO || null
  });
  if (!r.ok) { el.innerHTML = `<div class="loading">${r.error || 'Sesión expirada.'}</div>`; return; }

  if (!CLIENTES_FILTROS_HTML) {
    const f = r.filtros || {};
    const opt = (arr) => (arr||[]).sort().map(v => `<option value="${esc(v)}">${esc(titleCase(v))}</option>`).join('');
    CLIENTES_FILTROS_HTML = `<div class="card" style="padding:12px 20px;margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;">
      <select id="clMes" class="estado">${optMeses(mes)}</select>
      <select id="clKam" class="estado"><option value="">Todos los KAM</option>${opt(f.kams)}</select>
      <select id="clCliente" class="estado"><option value="">Todos los aliados</option>${opt(f.clientes)}</select>
      <select id="clSucursal" class="estado"><option value="">Todas las sucursales</option>${opt(f.sucursales)}</select>
      <button id="clFiltrar" style="width:auto;padding:6px 14px;font-size:12px;">Filtrar</button>
    </div>`;
  }

  const meses = [...new Set([
    ...(r.top_clientes||[]).map(x=>x.mes), ...(r.productos_valor||[]).map(x=>x.mes),
    ...(r.facturas||[]).map(x=>x.mes)
  ])].sort((a,b)=>a-b);

  let html = CLIENTES_FILTROS_HTML;
  html += renderBarraFiltros([
    { id: 'mes', label: 'Mes', valor: CLIENTES_MES, valorMostrar: CLIENTES_MES ? MESES[parseInt(CLIENTES_MES)-1] : null },
    { id: 'kam', label: 'KAM', valor: CLIENTES_KAM, valorMostrar: CLIENTES_KAM ? titleCase(CLIENTES_KAM) : null },
    { id: 'cliente', label: 'Aliado', valor: CLIENTES_CLIENTE, valorMostrar: CLIENTES_CLIENTE ? titleCase(CLIENTES_CLIENTE) : null },
    { id: 'sucursal', label: 'Sucursal', valor: CLIENTES_SUCURSAL },
    { id: 'referencia', label: 'Referencia', valor: CLIENTES_REFERENCIA },
    { id: 'nrodoc', label: 'Factura', valor: CLIENTES_NRO_DOCUMENTO }
  ]);

  // Top Clientes — pivote por sucursal
  const topClientes = pivotarPorMes(r.top_clientes, f => ({ id: f.sucursal_despacho, sucursal_despacho: f.sucursal_despacho, cliente: f.cliente, vendedor: f.vendedor }), 'valor');
  html += `<div class="card"><h2>Top Clientes (clic para filtrar)</h2><div style="max-height:420px;overflow-y:auto;"><table><tr><th>Desc. sucursal despacho</th>${meses.map(m=>`<th class="num">${MESES[m-1]}</th>`).join('')}<th class="num">Total</th></tr>`;
  topClientes.forEach(c => {
    const activo = CLIENTES_SUCURSAL === c.sucursal_despacho;
    html += `<tr class="fila-cl-sucursal" data-sucursal="${esc(c.sucursal_despacho)}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${esc(c.sucursal_despacho)}</td>${meses.map(m => `<td class="num money">${c.meses[m]?money(c.meses[m]):''}</td>`).join('')}<td class="num money">${money(c.total)}</td></tr>`;
  });
  html += '</table></div></div>';

  // Productos más vendidos [$] y [#] — lado a lado
  const prodValor = pivotarPorMes(r.productos_valor, f => ({ id: f.referencia, referencia: f.referencia, descripcion: f.descripcion }), 'valor');
  const prodUnidades = pivotarPorMes(r.productos_unidades, f => ({ id: f.referencia, referencia: f.referencia, descripcion: f.descripcion }), 'unidades');

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px;margin-bottom:16px;">';
  html += `<div class="card"><h2>Productos más vendidos [$] (clic para filtrar)</h2><div style="max-height:380px;overflow-y:auto;"><table><tr><th>Referencia</th>${meses.map(m=>`<th class="num">${MESES[m-1]}</th>`).join('')}<th class="num">Total</th></tr>`;
  prodValor.forEach(p => {
    const activo = CLIENTES_REFERENCIA === p.referencia;
    html += `<tr class="fila-cl-referencia" data-referencia="${esc(p.referencia)}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td title="${esc(p.descripcion||'')}">${esc(p.referencia)}</td>${meses.map(m => `<td class="num money">${p.meses[m]?money(p.meses[m]):''}</td>`).join('')}<td class="num money">${money(p.total)}</td></tr>`;
  });
  html += '</table></div></div>';

  html += `<div class="card"><h2>Productos más vendidos [#] (clic para filtrar)</h2><div style="max-height:380px;overflow-y:auto;"><table><tr><th>Referencia</th>${meses.map(m=>`<th class="num">${MESES[m-1]}</th>`).join('')}<th class="num">Total</th></tr>`;
  prodUnidades.forEach(p => {
    const activo = CLIENTES_REFERENCIA === p.referencia;
    html += `<tr class="fila-cl-referencia" data-referencia="${esc(p.referencia)}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td title="${esc(p.descripcion||'')}">${esc(p.referencia)}</td>${meses.map(m => `<td class="num">${p.meses[m]?Math.round(p.meses[m]).toLocaleString('es-CO'):''}</td>`).join('')}<td class="num">${Math.round(p.total).toLocaleString('es-CO')}</td></tr>`;
  });
  html += '</table></div></div></div>';

  // Facturas — pivote por nro_documento
  const facturas = pivotarPorMes(r.facturas, f => ({ id: f.nro_documento, nro_documento: f.nro_documento }), 'valor');
  html += `<div class="card"><h2>Facturas (clic para filtrar) — ${facturas.length} documentos</h2><div style="max-height:420px;overflow-y:auto;"><table><tr><th>Nro. documento</th>${meses.map(m=>`<th class="num">${MESES[m-1]}</th>`).join('')}<th class="num">Total</th></tr>`;
  facturas.forEach(f => {
    const activo = CLIENTES_NRO_DOCUMENTO === f.nro_documento;
    html += `<tr class="fila-cl-factura" data-nrodoc="${esc(f.nro_documento)}" style="cursor:pointer;${activo?'background:#2a2e24;border-left:3px solid var(--neon);':''}"><td>${esc(f.nro_documento)}</td>${meses.map(m => `<td class="num money">${f.meses[m]?money(f.meses[m]):''}</td>`).join('')}<td class="num money">${money(f.total)}</td></tr>`;
  });
  html += '</table></div></div>';

  el.innerHTML = html;
  habilitarOrdenTablas(el);

  document.getElementById('clMes').value = CLIENTES_MES || '';
  document.getElementById('clKam').value = CLIENTES_KAM || '';
  ocultarFiltroKamSiColaborador(['clKam']);
  document.getElementById('clCliente').value = CLIENTES_CLIENTE || '';
  document.getElementById('clSucursal').value = CLIENTES_SUCURSAL || '';
  document.getElementById('clFiltrar').addEventListener('click', () => {
    loadClientes(
      document.getElementById('clMes').value,
      document.getElementById('clKam').value,
      document.getElementById('clCliente').value,
      document.getElementById('clSucursal').value,
      CLIENTES_REFERENCIA,
      CLIENTES_NRO_DOCUMENTO
    );
  });

  el.querySelectorAll('.fila-cl-sucursal').forEach(fila => {
    fila.addEventListener('click', () => {
      loadClientes(undefined, undefined, undefined, CLIENTES_SUCURSAL === fila.dataset.sucursal ? null : fila.dataset.sucursal, undefined, undefined);
    });
  });
  el.querySelectorAll('.fila-cl-referencia').forEach(fila => {
    fila.addEventListener('click', () => {
      loadClientes(undefined, undefined, undefined, undefined, CLIENTES_REFERENCIA === fila.dataset.referencia ? null : fila.dataset.referencia, undefined);
    });
  });
  el.querySelectorAll('.fila-cl-factura').forEach(fila => {
    fila.addEventListener('click', () => {
      loadClientes(undefined, undefined, undefined, undefined, undefined, CLIENTES_NRO_DOCUMENTO === fila.dataset.nrodoc ? null : fila.dataset.nrodoc);
    });
  });

  activarBarraFiltros(el, {
    mes: () => loadClientes(null, undefined, undefined, undefined, undefined, undefined),
    kam: () => loadClientes(undefined, null, undefined, undefined, undefined, undefined),
    cliente: () => loadClientes(undefined, undefined, null, undefined, undefined, undefined),
    sucursal: () => loadClientes(undefined, undefined, undefined, null, undefined, undefined),
    referencia: () => loadClientes(undefined, undefined, undefined, undefined, null, undefined),
    nrodoc: () => loadClientes(undefined, undefined, undefined, undefined, undefined, null)
  }, () => loadClientes(null, null, null, null, null, null));
}

function loadCargarVentas() {
  const el = document.getElementById('view-cargar');
  el.innerHTML = `
    <div class="card">
      <h2>DATA · Cargar información desde Siesa</h2>
      <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px;">
        La primera vez, cada botón te pedirá seleccionar la carpeta <b>Data Tableros BRK</b> (una sola vez, el navegador la recuerda).
        <b>Importante:</b> ese cuadro de Windows solo muestra carpetas, no archivos — es normal que se vea "vacío" aunque tus .xls estén ahí.
        Solo entra a la carpeta correcta y presiona "Seleccionar carpeta".
        Después, con un clic busca el archivo correspondiente en esa carpeta y lo sube — sin que tengas que buscarlo tú.
      </p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <button class="btn-fuente" data-fuente="facturacion" style="width:auto;padding:14px 24px;">📄 Facturación</button>
        <button class="btn-fuente" data-fuente="remisiones" style="width:auto;padding:14px 24px;">🚚 Remisiones</button>
        <button class="btn-fuente" data-fuente="cartera" style="width:auto;padding:14px 24px;">💰 Cartera</button>
        <button class="btn-fuente" data-fuente="facilitadores" style="width:auto;padding:14px 24px;">🏍️ Facilitadores</button>
        <button id="btnCambiarCarpeta" style="width:auto;padding:14px 24px;background:transparent;border:1px solid var(--dust);color:var(--text-dim);">📁 Cambiar carpeta</button>
      </div>
      <div id="cargaEstado" style="margin-top:16px;font-size:13px;color:var(--text-dim);"></div>
      <div id="cargaProgreso" style="margin-top:8px;height:8px;background:#333630;border-radius:4px;overflow:hidden;display:none;">
        <div id="cargaBarra" style="height:100%;width:0%;background:var(--neon);transition:width 0.2s;"></div>
      </div>
    </div>
    <div class="card">
      <h2>Estado actual</h2>
      <div id="ultimaCargaInfo" style="font-size:13px;color:var(--text-dim);">Cargando información...</div>
    </div>`;

  document.querySelectorAll('.btn-fuente').forEach(btn => {
    btn.addEventListener('click', () => cargarDesdeCarpeta(btn.dataset.fuente, false));
  });
  document.getElementById('btnCambiarCarpeta').addEventListener('click', async () => {
    try { await obtenerCarpetaData(true); document.getElementById('cargaEstado').textContent = 'Carpeta actualizada. Ya puedes usar los botones.'; }
    catch (e) { document.getElementById('cargaEstado').innerHTML = `<span style="color:#ff6b6b;">${e.message}</span>`; }
  });

  mostrarUltimaCarga();
}

async function mostrarUltimaCarga() {
  const r = await rpc('dash_ticket_promedio', { p_token: TOKEN });
  const info = document.getElementById('ultimaCargaInfo');
  if (r.ok && r.general) {
    info.innerHTML = `Venta total acumulada (Facturación) en el dashboard: <b style="color:var(--neon);">${money(r.general.venta_total)}</b>. Compara contra tu Power BI para confirmar que la última carga quedó al día.`;
  } else {
    info.textContent = 'No se pudo consultar el estado actual.';
  }
}

async function cargarDesdeCarpeta(claveFuente, forzarSeleccion) {
  const fuente = FUENTES_DATA[claveFuente];
  const estado = document.getElementById('cargaEstado');
  const progreso = document.getElementById('cargaProgreso');
  const barra = document.getElementById('cargaBarra');
  progreso.style.display = 'block';
  barra.style.width = '5%';

  try {
    estado.textContent = `Buscando el archivo de ${fuente.titulo} en tu carpeta...`;
    const carpeta = await obtenerCarpetaData(forzarSeleccion);
    const archivo = await buscarArchivoEnCarpeta(carpeta, fuente.prefijoArchivo);
    if (!archivo) {
      estado.innerHTML = `<span style="color:#ff6b6b;">No encontré un archivo que empiece con "${fuente.prefijoArchivo}" en esa carpeta. Verifica el nombre o usa "Cambiar carpeta".</span>`;
      progreso.style.display = 'none';
      return;
    }

    estado.textContent = `Leyendo ${archivo.name}...`;
    const buffer = await archivo.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
    const hoja = wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: null });

    if (!filas.length) { estado.textContent = 'El archivo no tiene datos.'; progreso.style.display = 'none'; return; }

    const columnasArchivo = Object.keys(filas[0]);

    // Elegir el mapeo que mejor coincida (soporta fuentes con más de un formato posible, ej. Facilitadores)
    const candidatos = fuente.mapeos || [fuente.mapeo];
    let mejorMapeo = candidatos[0];
    let mejorFaltantes = Object.keys(candidatos[0]).filter(c => !columnasArchivo.includes(c));
    candidatos.slice(1).forEach(m => {
      const f = Object.keys(m).filter(c => !columnasArchivo.includes(c));
      if (f.length < mejorFaltantes.length) { mejorMapeo = m; mejorFaltantes = f; }
    });

    if (mejorFaltantes.length > 3) {
      estado.innerHTML = `<span style="color:#ff6b6b;">El archivo no tiene el formato esperado de ${fuente.titulo}. Faltan columnas: ${mejorFaltantes.join(', ')}</span>`;
      progreso.style.display = 'none';
      return;
    }

    const filasMapeadas = mapearFilas(filas, mejorMapeo, fuente.camposFecha, fuente.camposFechaHora).filter(fuente.filtro);
    estado.textContent = `${filasMapeadas.length} filas válidas de ${fuente.titulo}. Subiendo...`;

    const TAM_LOTE = 500;
    let subidos = 0;
    for (let i = 0; i < filasMapeadas.length; i += TAM_LOTE) {
      const lote = filasMapeadas.slice(i, i + TAM_LOTE);
      const parametros = { p_token: TOKEN, p_lote: lote };
      if (!fuente.sinPrimerLote) parametros.p_primer_lote = (i === 0);
      const r = await rpc(fuente.rpc, parametros);
      if (!r.ok) {
        estado.innerHTML = `<span style="color:#ff6b6b;">Error subiendo el lote: ${r.error || 'desconocido'}</span>`;
        progreso.style.display = 'none';
        return;
      }
      subidos += r.insertados || 0;
      const pct = Math.round(((i + lote.length) / filasMapeadas.length) * 100);
      barra.style.width = pct + '%';
      estado.textContent = `Subiendo ${fuente.titulo}... ${subidos} de ${filasMapeadas.length} filas.`;
    }

    // Si el archivo llegó vacío de filas válidas, igual truncamos para reflejar la realidad (remisiones/cartera fluctuantes)
    if (filasMapeadas.length === 0 && !fuente.sinPrimerLote) {
      await rpc(fuente.rpc, { p_token: TOKEN, p_lote: [], p_primer_lote: true });
    }

    barra.style.width = '100%';
    estado.innerHTML = `<span style="color:#4ade80;">✓ ${fuente.titulo} actualizado: ${subidos} filas.</span>`;
    mostrarUltimaCarga();
  } catch (err) {
    if (err.name === 'AbortError') {
      estado.textContent = 'Cancelado.';
    } else {
      estado.innerHTML = `<span style="color:#ff6b6b;">Error: ${err.message}</span>`;
    }
    progreso.style.display = 'none';
  }
}

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ---- Barra de filtros activos (chips con "x" removible) — reutilizable en toda la app ----
// chips: [{ id, label, valor }]
function renderBarraFiltros(chips) {
  const activos = (chips || []).filter(c => c.valor !== null && c.valor !== undefined && c.valor !== '');
  if (!activos.length) return '';
  return `<div class="card barra-filtros-activos" style="padding:10px 20px;margin-bottom:16px;border-color:var(--neon);display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
    <span style="font-size:11px;color:var(--text-dim);">Filtros activos:</span>
    ${activos.map(c => `<span class="chip-filtro" data-clear-id="${esc(c.id)}" style="background:#2a2e24;border:1px solid var(--neon);border-radius:14px;padding:3px 6px 3px 12px;font-size:12px;display:inline-flex;align-items:center;gap:8px;">
      ${esc(c.label)}: <b style="color:var(--neon);">${esc(c.valorMostrar || c.valor)}</b>
      <span class="btn-quitar-chip" data-clear-id="${esc(c.id)}" style="cursor:pointer;color:#ff6b6b;font-weight:700;padding:0 4px;">✕</span>
    </span>`).join('')}
    ${activos.length > 1 ? `<span class="chip-filtro-limpiar-todo" style="cursor:pointer;color:var(--text-dim);font-size:11px;text-decoration:underline;margin-left:6px;">Quitar todos</span>` : ''}
  </div>`;
}

// handlers: { [id]: fn } — se llama al hacer clic en la "x" de ese chip. limpiarTodoFn: función opcional para "Quitar todos".
function activarBarraFiltros(el, handlers, limpiarTodoFn) {
  el.querySelectorAll('.btn-quitar-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.clearId;
      if (handlers && handlers[id]) handlers[id]();
    });
  });
  const btnTodo = el.querySelector('.chip-filtro-limpiar-todo');
  if (btnTodo && limpiarTodoFn) btnTodo.addEventListener('click', (e) => { e.stopPropagation(); limpiarTodoFn(); });
}

function titleCase(s) {
  return (s||'').toLowerCase().split(' ').map(palabra =>
    palabra ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : palabra
  ).join(' ');
}

// Ajusta el "pegado" del header/tabs al alto REAL (evita desalineación en móvil)
function ajustarStickyResponsive() {
  const header = document.querySelector('header');
  const fila1 = document.querySelector('.tabs-fila1');
  if (!header) return;
  const alturaHeader = header.offsetHeight;
  document.documentElement.style.setProperty('--header-h', alturaHeader + 'px');
  if (fila1) {
    document.documentElement.style.setProperty('--header-fila1-bottom', (alturaHeader + fila1.offsetHeight) + 'px');
  }
}
window.addEventListener('load', ajustarStickyResponsive);
window.addEventListener('resize', ajustarStickyResponsive);
window.addEventListener('orientationchange', ajustarStickyResponsive);
// Vuelve a medir cada vez que cambia de pestaña (el contenido puede cambiar el alto del header en pantallas angostas)
const _observadorHeader = new MutationObserver(ajustarStickyResponsive);
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('header');
  if (header) _observadorHeader.observe(header, { childList: true, subtree: true, attributes: true });
});

// Auto-login si hay token guardado
if (TOKEN) { showApp(); }

// Registro de Service Worker para instalación como PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
