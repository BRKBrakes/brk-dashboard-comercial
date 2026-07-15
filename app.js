const SUPABASE_URL = 'https://ytgziytuldsqhymqjyig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0Z3ppeXR1bGRzcWh5bXFqeWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjA4ODAsImV4cCI6MjA5Nzc5Njg4MH0.z4KapPX5bGEXRmS-Ntky0XmYZz45s5j1DpBuPgE_PIU';

let TOKEN = localStorage.getItem('brk_token') || null;

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
  return res.json();
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
    localStorage.setItem('brk_token', TOKEN);
    showApp();
  } else {
    errEl.textContent = r.error || 'Error al iniciar sesión';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('brk_token');
  TOKEN = null;
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
  loadTab('ejecutivo');
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

async function loadTab(tab) {
  if (tab === 'ejecutivo') return loadEjecutivo();
  if (tab === 'oportunidades' || tab === 'gapdiscos') return loadGapDiscos();
  if (tab === 'gapliquidos') return loadGapLiquidos();
  if (tab === 'gapcilindros') return loadGapCilindros();
  if (tab === 'tipoa') return loadTipoA();
  if (tab === 'segmentacion') return loadSegmentacion();
  if (tab === 'ticket') return loadTicket();
  if (tab === 'portafolio') return loadPortafolio();
  if (tab === 'perdidos') return loadPerdidos();
  if (tab === 'planes') return loadPlanes();
}

function poblarSelectMeses() {
  const mesActual = 7; // dato disponible hasta julio 2026
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
  let html = '<div class="card" style="border:1px solid var(--neon);height:100%;"><h2 style="color:var(--neon);">Top 5 · KAM que necesitan apoyo</h2>';
  r.data.forEach((k, i) => {
    let color = '#ff6b6b';
    if (k.pct >= 100) color = '#4ade80'; else if (k.pct >= 80) color = '#ff9f43';
    html += itemAccion(i, k.nombre, k.pct + '% cumpl.', color, `Facturado ${money(k.venta_real)} de ${money(k.presupuesto_periodo)}`);
  });
  html += '</div>';
  el.innerHTML = html;
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
    <div class="kpi"><div class="label">Ratio discos/pastas</div><div class="value">${Math.round((resumen.ratio_discos_pastas_global||0)*100)}%</div></div>
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
    html += `<tr><td>${titleCase(k.vendedor)}</td><td class="num money">${money(k.venta_real)}</td><td class="num money">${money(k.presupuesto_periodo)}</td><td class="num" style="color:${color};font-weight:700;">${pct}%</td></tr>`;
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
    const maxVenta = Math.max(...anios.map(a => a.venta || 0), 1);
    html += `<div class="card"><h2>Venta acumulada Ene-${MESES[crec.mes_corte-1]} por año</h2>`;
    anios.forEach((a, i) => {
      const w = Math.round((a.venta / maxVenta) * 100);
      const prev = anios[i-1];
      const creceVsAnterior = prev ? Math.round(((a.venta - prev.venta) / prev.venta) * 100) : null;
      const colorBar = creceVsAnterior === null ? 'var(--silver)' : (creceVsAnterior >= 0 ? '#4ade80' : '#ff6b6b');
      html += `<div class="bar-row"><div class="bar-label">${a.anio}${creceVsAnterior !== null ? ' (' + (creceVsAnterior>=0?'+':'') + creceVsAnterior + '%)' : ''}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${colorBar};"></div></div>
        <div class="bar-pct" style="width:110px;color:${colorBar};">${money(a.venta)}</div></div>`;
    });
    html += '</div>';

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
  autoFitKpis();
}

document.getElementById('btnFiltrar').addEventListener('click', loadEjecutivo);

async function loadGapDiscos() {
  const el = document.getElementById('view-gapdiscos');
  el.innerHTML = '<div class="loading">Cargando gap de discos...</div>';
  const r = await rpc('dash_gap_discos', { p_token: TOKEN });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  let html = '<div class="card"><h2>Clientes con gap de discos (últimos 90 días, por sucursal)</h2><table><tr><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th>Ciudad</th><th class="num">Pastas</th><th class="num">Discos</th><th class="num">Ratio</th></tr>';
  (r.data || []).forEach(c => {
    html += `<tr><td>${c.cliente}</td><td>${c.sucursal_despacho||''}</td><td>${titleCase(c.vendedor)}</td><td>${c.ciudad||''}</td><td class="num money">${money(c.pastas)}</td><td class="num money">${money(c.discos)}</td><td class="num">${Math.round((c.ratio_discos_pastas||0)*100)}%</td></tr>`;
  });
  html += '</table></div>';
  el.innerHTML = html;
}

async function loadGapLiquidos() {
  const el = document.getElementById('view-gapliquidos');
  el.innerHTML = '<div class="loading">Cargando gap de líquidos...</div>';
  const r = await rpc('dash_gap_liquidos', { p_token: TOKEN });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  let html = '<div class="card"><h2>Clientes con gap de líquido de frenos (últimos 90 días, por sucursal)</h2><table><tr><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th>Ciudad</th><th class="num">Pastas</th><th class="num">Líquidos</th><th class="num">Potencial/mes</th></tr>';
  (r.data || []).forEach(c => {
    html += `<tr><td>${c.cliente}</td><td>${c.sucursal_despacho||''}</td><td>${titleCase(c.vendedor)}</td><td>${c.ciudad||''}</td><td class="num money">${money(c.pastas)}</td><td class="num money">${money(c.liquidos)}</td><td class="num money">${money(c.potencial_mes)}</td></tr>`;
  });
  html += '</table></div>';
  el.innerHTML = html;
}

async function loadGapCilindros() {
  const el = document.getElementById('view-gapcilindros');
  el.innerHTML = '<div class="loading">Cargando gap de cilindros...</div>';
  const r = await rpc('dash_gap_cilindros', { p_token: TOKEN });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  let html = '<div class="card"><h2>Clientes sin compra de cilindros (últimos 180 días, por sucursal)</h2><table><tr><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th>Ciudad</th><th class="num">Pastas</th><th class="num">Cilindros</th><th class="num">Potencial/mes</th></tr>';
  (r.data || []).forEach(c => {
    html += `<tr><td>${c.cliente}</td><td>${c.sucursal_despacho||''}</td><td>${titleCase(c.vendedor)}</td><td>${c.ciudad||''}</td><td class="num money">${money(c.pastas)}</td><td class="num money">${money(c.cilindros)}</td><td class="num money">${money(c.potencial_mes)}</td></tr>`;
  });
  html += '</table></div>';
  el.innerHTML = html;
}

let TIPOA_FILTROS_HTML = '';
async function loadTipoA(kams, clientes, sucursales) {
  const el = document.getElementById('view-tipoa');
  if (!TIPOA_FILTROS_HTML) el.innerHTML = '<div class="loading">Cargando aliados tipo A...</div>';
  const r = await rpc('dash_top_tipo_a', { p_token: TOKEN, p_kams: kams && kams.length ? kams : null, p_clientes: clientes && clientes.length ? clientes : null, p_sucursales: sucursales && sucursales.length ? sucursales : null });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }

  if (!TIPOA_FILTROS_HTML) {
    const f = r.filtros || {};
    const opt = (arr) => (arr||[]).sort().map(v => `<option value="${v}">${titleCase(v)}</option>`).join('');
    TIPOA_FILTROS_HTML = `<div class="card" style="padding:12px 20px;margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;">
      <div><div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">KAM (Ctrl/Cmd+clic para varios)</div><select id="taKam" class="estado" multiple size="4" style="min-width:180px;">${opt(f.kams)}</select></div>
      <div><div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">Cliente</div><select id="taCliente" class="estado" multiple size="4" style="min-width:220px;">${opt(f.clientes)}</select></div>
      <div><div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">Sucursal</div><select id="taSucursal" class="estado" multiple size="4" style="min-width:220px;">${opt(f.sucursales)}</select></div>
      <button id="taFiltrar" style="width:auto;padding:6px 14px;font-size:12px;align-self:flex-end;">Filtrar</button>
    </div>`;
  }

  let html = TIPOA_FILTROS_HTML + '<div class="card"><h2>Aliados Tipo A (categoría Diamante) — ' + (r.data||[]).length + ' sucursales</h2><table><tr><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th class="num">Total 2026</th></tr>';
  (r.data || []).forEach(c => {
    html += `<tr><td>${c.cliente}</td><td>${c.sucursal_despacho||''}</td><td>${titleCase(c.vendedor)}</td><td class="num money">${money(c.total)}</td></tr>`;
  });
  html += '</table></div>';
  el.innerHTML = html;

  const getSel = (id) => Array.from(document.getElementById(id).selectedOptions).map(o => o.value);
  (kams||[]).forEach(v => { const o = document.querySelector(`#taKam option[value="${CSS.escape(v)}"]`); if (o) o.selected = true; });
  (clientes||[]).forEach(v => { const o = document.querySelector(`#taCliente option[value="${CSS.escape(v)}"]`); if (o) o.selected = true; });
  (sucursales||[]).forEach(v => { const o = document.querySelector(`#taSucursal option[value="${CSS.escape(v)}"]`); if (o) o.selected = true; });

  document.getElementById('taFiltrar').addEventListener('click', () => {
    loadTipoA(getSel('taKam'), getSel('taCliente'), getSel('taSucursal'));
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

  html += '<div class="kpis">';
  Object.keys(resumen).sort().forEach(seg => {
    const activo = SEGMENTACION_FILTRO === seg;
    html += `<div class="kpi seg-card" data-seg="${seg}" style="cursor:pointer;${activo ? 'border-color:var(--neon);border-width:2px;' : ''}">
      <div class="label">${seg}</div><div class="value">${resumen[seg].n}</div><div class="value-sub">${money(resumen[seg].total)}</div>
    </div>`;
  });
  html += '</div>';

  const filtrados = SEGMENTACION_FILTRO ? baseData.filter(c => c.segmento === SEGMENTACION_FILTRO) : baseData;
  html += `<div class="card"><h2>Detalle por sucursal ${SEGMENTACION_FILTRO ? '— filtrado: ' + SEGMENTACION_FILTRO + ' <span id="segLimpiar" style="cursor:pointer;color:var(--neon);font-size:12px;">(quitar filtro)</span>' : ''}</h2>
    <table><tr><th>Cliente</th><th>Sucursal</th><th>Segmento</th><th>Vendedor</th><th>Ciudad</th><th class="num">Total 2026</th><th class="num">Días sin comprar</th></tr>`;
  filtrados.forEach(c => {
    html += `<tr><td>${c.cliente}</td><td>${c.sucursal_despacho||''}</td><td>${c.segmento}</td><td>${titleCase(c.vendedor)}</td><td>${c.ciudad||''}</td><td class="num money">${money(c.total)}</td><td class="num">${c.dias_sin_compra}</td></tr>`;
  });
  html += '</table></div>';
  el.innerHTML = html;
  autoFitKpis();

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
  const limpiar = document.getElementById('segLimpiar');
  if (limpiar) limpiar.addEventListener('click', (e) => { e.stopPropagation(); SEGMENTACION_FILTRO = null; renderSegmentacionTabla(); });
}

async function loadSegmentacion() {
  const el = document.getElementById('view-segmentacion');
  el.innerHTML = '<div class="loading">Cargando segmentación...</div>';
  const r = await rpc('dash_segmentacion', { p_token: TOKEN });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  SEGMENTACION_DATA = r.data || [];
  renderSegmentacionTabla();
}

async function loadTicket() {
  const el = document.getElementById('view-ticket');
  el.innerHTML = '<div class="loading">Cargando ticket promedio...</div>';
  const r = await rpc('dash_ticket_promedio', { p_token: TOKEN });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  const g = r.general || {};
  let html = `<div class="kpis">
    <div class="kpi"><div class="label">Venta Total</div><div class="value">${money(g.venta_total)}</div></div>
    <div class="kpi"><div class="label">Ticket Promedio</div><div class="value">${money(g.ticket_promedio)}</div></div>
    <div class="kpi"><div class="label">Unidades Vendidas</div><div class="value">${Math.round(g.unidades||0).toLocaleString('es-CO')}</div></div>
  </div>`;
  html += '<div class="card"><h2>Ticket promedio por familia de producto</h2><table><tr><th>Familia</th><th class="num">Venta</th><th class="num">Unidades</th><th class="num">Ticket Promedio</th></tr>';
  (r.por_familia || []).forEach(f => {
    html += `<tr><td>${f.familia}</td><td class="num money">${money(f.venta)}</td><td class="num">${Math.round(f.unidades).toLocaleString('es-CO')}</td><td class="num money">${money(f.ticket_promedio)}</td></tr>`;
  });
  html += '</table></div>';
  el.innerHTML = html;
  autoFitKpis();
}

const COLORES_FAMILIA = ['#F1FE34','#596B63','#9A979F','#414930','#ff9f43','#4ade80','#ff6b6b','#8b5cf6','#06b6d4'];

async function loadPortafolio() {
  const el = document.getElementById('view-portafolio');
  el.innerHTML = '<div class="loading">Cargando portafolio...</div>';
  const r = await rpc('dash_portafolio', { p_token: TOKEN });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }
  const data = r.data || [];

  // Construir dona SVG simple
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
    paths += `<path d="M ${x1} ${y1} A ${radio} ${radio} 0 ${largeArc} 1 ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${grosor}"/>`;
  });

  let html = '<div class="card"><h2>Participación de portafolio por familia</h2><div style="display:flex;gap:32px;align-items:center;flex-wrap:wrap;">';
  html += `<svg width="200" height="200" viewBox="0 0 200 200">${paths}</svg>`;
  html += '<div style="flex:1;min-width:220px;">';
  data.forEach((d, i) => {
    const color = COLORES_FAMILIA[i % COLORES_FAMILIA.length];
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:13px;">
      <span style="width:12px;height:12px;background:${color};border-radius:2px;flex-shrink:0;"></span>
      <span style="flex:1;">${d.familia}</span>
      <span style="color:var(--text-dim);">${d.pct}%</span>
    </div>`;
  });
  html += '</div></div></div>';

  html += '<div class="card"><h2>Detalle por familia</h2><table><tr><th>Familia</th><th class="num">Venta</th><th class="num">% del total</th></tr>';
  data.forEach(d => {
    html += `<tr><td>${d.familia}</td><td class="num money">${money(d.venta)}</td><td class="num">${d.pct}%</td></tr>`;
  });
  html += '</table></div>';
  el.innerHTML = html;
}

async function loadPerdidos() {
  const el = document.getElementById('view-perdidos');
  el.innerHTML = '<div class="loading">Analizando caídas y clientes inactivos...</div>';
  const r = await rpc('dash_recuperacion', { p_token: TOKEN });
  if (!r.ok) { el.innerHTML = '<div class="loading">Sesión expirada.</div>'; return; }

  const cayendo = (r.cayendo || []).slice().sort((a,b) => b.total_ant - a.total_ant);
  const sinCompra = r.sin_compra_60d || [];

  let html = `<div class="card"><h2>Cayendo vs. mes anterior (mismo tramo de días) — ${cayendo.length} sucursales</h2>
    <table><tr><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th class="num">Mes anterior</th><th class="num">Mes actual</th><th class="num">Caída</th><th>Detalle por categoría</th></tr>`;
  cayendo.forEach(c => {
    const detalles = [];
    if (c.delta_pastas < 0) detalles.push(`Pastas ${money(c.delta_pastas)}`);
    if (c.delta_discos < 0) detalles.push(`Discos ${money(c.delta_discos)}`);
    if (c.delta_liquidos < 0) detalles.push(`Líquidos ${money(c.delta_liquidos)}`);
    html += `<tr><td>${c.cliente}</td><td>${c.sucursal_despacho||''}</td><td>${titleCase(c.vendedor||'')}</td>
      <td class="num money">${money(c.total_ant)}</td><td class="num money">${money(c.total_act)}</td>
      <td class="num" style="color:#ff6b6b;font-weight:700;">${money(c.caida_total)} (${c.caida_pct}%)</td>
      <td style="font-size:11px;color:var(--text-dim);">${detalles.join(' · ') || '—'}</td></tr>`;
  });
  html += '</table></div>';

  html += `<div class="card"><h2>Sin compras hace 60+ días — ${sinCompra.length} sucursales</h2>
    <table><tr><th>Cliente</th><th>Sucursal</th><th>Vendedor</th><th>Ciudad</th><th class="num">Venta 2026</th><th class="num">Días sin comprar</th></tr>`;
  sinCompra.forEach(c => {
    html += `<tr><td>${c.cliente}</td><td>${c.sucursal_despacho||''}</td><td>${titleCase(c.vendedor||'')}</td><td>${c.ciudad||''}</td><td class="num money">${money(c.total_2026)}</td><td class="num">${c.dias_sin_compra}</td></tr>`;
  });
  html += '</table></div>';

  el.innerHTML = html;
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
      html += `<tr><td>${p.cliente}</td><td>${p.sucursal||''}</td><td>${p.tipo_plan}</td><td>${titleCase(p.vendedor||'')}</td><td class="num money">${money(p.potencial_mes)}</td><td>
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

function titleCase(s) {
  return (s||'').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// Auto-login si hay token guardado
if (TOKEN) { showApp(); }
