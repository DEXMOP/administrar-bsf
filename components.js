/**
 * BSF BioManager - UI Components and Pages
 * Dynamically renders the application content
 */

/**
 * Helper to extract feeding unit from observations
 */
function getFeedingUnit(obs) {
    if (!obs) return 'kg';
    const match = obs.match(/\((baldes|sacos|kg|L|unidades|g)\)/i);
    return match ? match[1] : 'kg';
}

const Components = {
    // Shared state for selected files in report creation
    selectedFiles: [],

    /**
     * Renders quick quantity increment/decrement buttons
     */
    renderQuickQtyButtons(inputId, isCurrency = false, defaultUnit = '') {
        const formatLabel = (delta) => {
            if (isCurrency) {
                return delta > 0 ? `+$${delta}` : `-$${Math.abs(delta)}`;
            }
            if (defaultUnit) {
                const suffix = (defaultUnit === 'baldes' && Math.abs(delta) === 1) ? 'balde' : 
                               (defaultUnit === 'sacos' && Math.abs(delta) === 1) ? 'saco' : defaultUnit;
                return delta > 0 ? `+${delta} ${suffix}` : `${delta} ${suffix}`;
            }
            return delta > 0 ? `+${delta}` : `${delta}`;
        };
        return `
            <div class="d-flex gap-1 mt-1 flex-wrap">
                <button type="button" class="btn btn-xs btn-outline quick-qty-btn" data-input="${inputId}" data-delta="1" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.75rem;">${formatLabel(1)}</button>
                <button type="button" class="btn btn-xs btn-outline quick-qty-btn" data-input="${inputId}" data-delta="5" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.75rem;">${formatLabel(5)}</button>
                <button type="button" class="btn btn-xs btn-outline quick-qty-btn" data-input="${inputId}" data-delta="10" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.75rem;">${formatLabel(10)}</button>
                <button type="button" class="btn btn-xs btn-outline quick-qty-btn" data-input="${inputId}" data-delta="50" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.75rem;">${formatLabel(50)}</button>
                <button type="button" class="btn btn-xs btn-outline quick-qty-btn" data-input="${inputId}" data-delta="-1" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.75rem;">${formatLabel(-1)}</button>
                <button type="button" class="btn btn-xs btn-outline quick-qty-btn-reset" data-input="${inputId}" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--danger); border-color: var(--danger);">Borrar</button>
            </div>
        `;
    },

    /**
     * Renders collaborators cards checklist
     */
    renderCollaboratorsList(users, prefix) {
        const activeUsers = users.slice(1).filter(u => u[1] && u[1] !== GoogleAPI.user.name);
        if (activeUsers.length === 0) {
            return `<p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0;">No hay otros operarios registrados.</p>`;
        }
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.5rem; max-height: 120px; overflow-y: auto; padding: 0.25rem;">
                ${activeUsers.map((u, i) => `
                    <div class="card p-2 text-center cursor-pointer collab-select-card" data-val="${u[1]}" data-prefix="${prefix}" style="border: 2px solid var(--border-color); background-color: var(--bg-secondary); margin-bottom: 0; user-select: none; transition: all 0.2s;">
                        <input type="checkbox" class="${prefix}-collab-chk hidden" value="${u[1]}" id="collab-${prefix}-${i}">
                        <strong style="font-size: 0.85rem; color: var(--text-primary);">${u[1]}</strong>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Renders tina selection cards grouped by lot
     */
    renderTinaSelection(camas, prefix) {
        if (camas.length === 0) {
            return `<div class="text-center text-secondary py-3">No hay bandejas activas en este momento.</div>`;
        }
        const groupsMap = {};
        camas.forEach(c => {
            const groupName = c[2] || 'Sin Lote';
            if (!groupsMap[groupName]) groupsMap[groupName] = [];
            groupsMap[groupName].push(c);
        });

        return Object.keys(groupsMap).map(groupName => {
            const tinasInGroup = groupsMap[groupName];
            const groupSafeId = groupName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
            return `
                <div class="mb-3 p-2 border-bottom" style="border-bottom-color: var(--border-color); background: rgba(255,255,255,0.01); border-radius: var(--radius-sm);">
                    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <strong style="font-size: 0.85rem; color: var(--brand-primary);"><i class="fa-solid fa-layer-group"></i> ${groupName}</strong>
                        <button type="button" class="btn btn-xs btn-outline btn-select-group" data-group-id="${groupSafeId}" data-prefix="${prefix}" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; width: auto; font-weight: bold;">
                            Seleccionar Lote
                        </button>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.5rem;">
                        ${tinasInGroup.map(c => {
                            const id = c[0];
                            const name = "Bandeja " + id;
                            return `
                                <div class="card p-2 text-center cursor-pointer tina-select-card" data-id="${id}" data-prefix="${prefix}" style="border: 2px solid var(--border-color); background-color: var(--bg-secondary); margin-bottom: 0; user-select: none; transition: all 0.2s;">
                                    <input type="checkbox" class="${prefix}-tina-chk tina-checkbox-group-${groupSafeId} hidden" value="${id}" id="chk-${prefix}-${id}">
                                    <strong style="font-size: 0.9rem; display: block; color: var(--text-primary);">${name}</strong>
                                    <small style="font-size: 0.7rem; color: var(--text-secondary);">ID: ${id}</small>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Renders Setup Config Form if first time using the app
     */
    renderSetup(containerId, onSaveCallback, onCancelCallback = null) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="form-card card slide-in-view mt-3" style="position: relative; max-width: 550px; width: 90%; max-height: 90vh; overflow-y: auto;">
                ${onCancelCallback ? `
                <button type="button" id="btn-close-setup" class="btn-icon-only" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                ` : ''}
                <div class="text-center mb-3">
                    <div class="logo-icon-large"><i class="fa-solid fa-gears"></i></div>
                    <h2>Configuración de BSF BioManager</h2>
                    <p>Conecta la aplicación con tu cuenta de Google Cloud. Este paso es necesario una sola vez.</p>
                </div>
                <form id="setup-form" class="mt-3">
                    <div class="form-group mb-3">
                        <label class="form-label" for="setup-api-key">Google API Key</label>
                        <input type="text" id="setup-api-key" class="form-control" placeholder="AIzaSy..." required>
                        <small class="form-text text-secondary">Obtenida en Google Cloud Console para acceso público a datos.</small>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label" for="setup-client-id">Google Client ID (OAuth 2.0)</label>
                        <input type="text" id="setup-client-id" class="form-control" placeholder="xxxxxx-xxxxxx.apps.googleusercontent.com" required>
                        <small class="form-text text-secondary">Para gestionar el inicio de sesión y autenticación segura.</small>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label" for="setup-sheet-id">Google Spreadsheet ID (Base de Datos)</label>
                        <input type="text" id="setup-sheet-id" class="form-control" placeholder="1aBcDeFgHiJkLmNoPqRsTuVwXyZ..." required>
                        <small class="form-text text-secondary">Crea una hoja de cálculo vacía en Google Sheets y pega su ID aquí (lo encuentras en la URL de la hoja).</small>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label" for="setup-folder-id">Google Drive Folder ID (Opcional)</label>
                        <input type="text" id="setup-folder-id" class="form-control" placeholder="Dejar en blanco para crear una nueva carpeta automáticamente">
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label" for="setup-script-url">Google Apps Script Web App URL (Opcional - Autorización y Cron)</label>
                        <input type="text" id="setup-script-url" class="form-control" placeholder="https://script.google.com/macros/s/XXXXX/exec">
                        <small class="form-text text-secondary">Si se configura, la app utilizará esta API de forma segura y los operarios no requerirán acceso directo al Excel.</small>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        ${onCancelCallback ? `
                        <button type="button" id="btn-cancel-setup" class="btn btn-outline" style="flex: 1;">
                            Cancelar
                        </button>
                        ` : ''}
                        <button type="submit" id="btn-save-setup" class="btn btn-primary" style="flex: 1;">
                            <i class="fa-solid fa-floppy-disk"></i> Guardar
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Pre-fill if some settings exist
        if (GoogleAPI.config) {
            const apiKeyEl = document.getElementById('setup-api-key');
            const clientIdEl = document.getElementById('setup-client-id');
            const sheetIdEl = document.getElementById('setup-sheet-id');
            const folderIdEl = document.getElementById('setup-folder-id');
            const scriptUrlEl = document.getElementById('setup-script-url');

            if (apiKeyEl) apiKeyEl.value = GoogleAPI.config.apiKey || '';
            if (clientIdEl) clientIdEl.value = GoogleAPI.config.clientId || '';
            if (sheetIdEl) sheetIdEl.value = GoogleAPI.config.spreadsheetId || '';
            if (folderIdEl) folderIdEl.value = GoogleAPI.config.driveFolderId || '';
            if (scriptUrlEl) scriptUrlEl.value = GoogleAPI.config.appsScriptUrl || '';
        }

        const setupForm = document.getElementById('setup-form');
        if (setupForm) {
            setupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const apiKeyEl = document.getElementById('setup-api-key');
                const clientIdEl = document.getElementById('setup-client-id');
                const sheetIdEl = document.getElementById('setup-sheet-id');
                const folderIdEl = document.getElementById('setup-folder-id');
                const scriptUrlEl = document.getElementById('setup-script-url');

                const config = {
                    apiKey: apiKeyEl ? apiKeyEl.value.trim() : '',
                    clientId: clientIdEl ? clientIdEl.value.trim() : '',
                    spreadsheetId: sheetIdEl ? sheetIdEl.value.trim() : '',
                    driveFolderId: (folderIdEl && folderIdEl.value.trim()) ? folderIdEl.value.trim() : null,
                    appsScriptUrl: (scriptUrlEl && scriptUrlEl.value.trim()) ? scriptUrlEl.value.trim() : null
                };
                onSaveCallback(config);
            });
        }

        // Bind cancel buttons if callback provided
        if (onCancelCallback) {
            const closeBtn = document.getElementById('btn-close-setup');
            const cancelBtn = document.getElementById('btn-cancel-setup');
            if (closeBtn) closeBtn.addEventListener('click', onCancelCallback);
            if (cancelBtn) cancelBtn.addEventListener('click', onCancelCallback);
        }
    },

    /**
     * Render 1. Dashboard View
     */
    async renderDashboard(containerId, showLoading, hideLoading) {
        const container = document.getElementById(containerId);
        container.innerHTML = `<div class="text-center py-5"><div class="bio-spinner"></div><p>Cargando datos del criadero...</p></div>`;

        try {
            // Fetch necessary data from Sheets
            const financeRows = await GoogleAPI.getSheetData('Finanzas!A:G');
            const supplyRows = await GoogleAPI.getSheetData('Insumos!A:H');
            const reportRows = await GoogleAPI.getSheetData('Reportes!A:G');
            const camasRows = await GoogleAPI.getSheetData('Camas!A:D');
            const feedingRows = await GoogleAPI.getSheetData('Registro_Alimentacion!A:I');

            // Skip headers in processing
            const finances = financeRows.slice(1);
            const supplies = supplyRows.slice(1);
            const reports = reportRows.slice(1);

            // Calculations
            let totalIncome = 0;
            let totalExpenses = 0;
            finances.forEach(row => {
                const type = row[3]; // 'Ingreso' / 'Gasto'
                const amount = parseFloat(row[5]) || 0;
                if (type === 'Ingreso') totalIncome += amount;
                else if (type === 'Gasto') totalExpenses += amount;
            });
            const netBalance = totalIncome - totalExpenses;

            // Group inventory stocks: Additions - Usages
            const stockMap = {};
            const unitMap = {};
            supplies.forEach(row => {
                const name = row[3] ? row[3].trim().toLowerCase() : '';
                const action = row[4]; // 'Adición' / 'Utilización'
                const qty = parseFloat(row[5]) || 0;
                const unit = row[6] || 'kg';

                if (!name) return;
                
                if (!stockMap[name]) {
                    stockMap[name] = 0;
                    unitMap[name] = unit;
                }
                
                if (action === 'Adición') stockMap[name] += qty;
                else if (action === 'Utilización') stockMap[name] -= qty;
            });

            // Generate low stock alerts
            const alerts = [];
            Object.keys(stockMap).forEach(key => {
                const stock = stockMap[key];
                const unit = unitMap[key];
                const displayName = key.charAt(0).toUpperCase() + key.slice(1);
                
                if (stock <= 5) {
                    alerts.push({
                        type: 'danger',
                        title: `Stock Crítico: ${displayName}`,
                        desc: `Quedan solo ${stock.toFixed(1)} ${unit}. Abastecer de inmediato para evitar detener alimentación.`
                    });
                } else if (stock <= 15) {
                    alerts.push({
                        type: 'warning',
                        title: `Stock Bajo: ${displayName}`,
                        desc: `Quedan ${stock.toFixed(1)} ${unit} disponibles en inventario.`
                    });
                }
            });

            // Larva feeding alarms (Semáforo / Alarma de un día sin comer)
            const activeTinas = camasRows.slice(1).filter(c => c[1] === 'En Servicio');
            const feedings = feedingRows.slice(1);
            const nowTime = new Date();

            activeTinas.forEach(tina => {
                const tinaId = tina[0];
                const tinaName = "Bandeja " + tinaId;
                
                // Get feedings for this tina
                const tinaFeedings = feedings.filter(f => f[1] === tinaId);
                
                if (tinaFeedings.length === 0) {
                    alerts.unshift({
                        type: 'danger',
                        title: `⚠️ Alarma de Alimentación: ${tinaName}`,
                        desc: `Esta tina está activa pero no registra ninguna alimentación en el sistema.`
                    });
                } else {
                    // Sort descending (most recent first)
                    tinaFeedings.sort((a, b) => new Date(b[2].replace(' ', 'T')) - new Date(a[2].replace(' ', 'T')));
                    const lastFeedDate = new Date(tinaFeedings[0][2].replace(' ', 'T'));
                    
                    const diffMs = nowTime - lastFeedDate;
                    const diffHours = diffMs / (1000 * 60 * 60);
                    
                    if (diffHours > 24) {
                        alerts.unshift({
                            type: 'danger',
                            title: `⚠️ Alarma de Alimentación: ${tinaName}`,
                            desc: `Lleva sin recibir alimento desde hace ${Math.floor(diffHours)} horas. ¡Atención crítica!`
                        });
                    }
                }
            });

            // If no alerts
            if (alerts.length === 0) {
                alerts.push({
                    type: 'success',
                    title: 'Inventario Saludable',
                    desc: 'Todos los insumos biológicos de cría se encuentran por encima de los límites de seguridad.'
                });
            }

            // Render Dashboard HTML skeleton
            container.innerHTML = `
                <div class="slide-in-view">
                    <!-- KPI cards -->
                    <div class="dashboard-grid">
                        <div class="card kpi-card">
                            <div>
                                h3>Balance Financiero</h3>
                                <div class="kpi-value ${netBalance >= 0 ? 'text-success' : 'text-danger'}">
                                    $${netBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div class="kpi-change">
                                    <i class="fa-solid ${netBalance >= 0 ? 'fa-arrow-trend-up text-success' : 'fa-arrow-trend-down text-danger'}"></i>
                                    <span>Ingreso Neto</span>
                                </div>
                            </div>
                            <div class="kpi-icon"><i class="fa-solid fa-scale-balanced"></i></div>
                        </div>

                        <div class="card kpi-card">
                            <div>
                                <h3>Total Reportes Diarios</h3>
                                <div class="kpi-value">${reports.length}</div>
                                <div class="kpi-change">
                                    <i class="fa-solid fa-calendar-day text-success"></i>
                                    <span>Registros de control</span>
                                </div>
                            </div>
                            <div class="kpi-icon blue"><i class="fa-solid fa-notes-medical"></i></div>
                        </div>

                        <div class="card kpi-card">
                            <div>
                                <h3>Insumos Registrados</h3>
                                <div class="kpi-value">${Object.keys(stockMap).length}</div>
                                <div class="kpi-change">
                                    <i class="fa-solid fa-boxes-stacked text-warning"></i>
                                    <span>Categorías activas</span>
                                </div>
                            </div>
                            <div class="kpi-icon yellow"><i class="fa-solid fa-cubes"></i></div>
                        </div>
                    </div>

                    <!-- Row 2: Charts and Alerts -->
                    <div class="dashboard-row-2">
                        <!-- Chart Card -->
                        <div class="card">
                            <h3 class="mb-3"><i class="fa-solid fa-chart-line text-success"></i> Balance de Flujo de Caja</h3>
                            <div class="chart-container">
                                <canvas id="chart-finances"></canvas>
                            </div>
                        </div>

                        <!-- Alerts Card -->
                        <div class="card">
                            <h3 class="mb-3"><i class="fa-solid fa-triangle-exclamation text-warning"></i> Alertas y Estado BSF</h3>
                            <div class="alert-list">
                                ${alerts.map(a => `
                                    <div class="alert-item ${a.type}">
                                        <div class="alert-icon">
                                            <i class="fa-solid ${a.type === 'danger' ? 'fa-circle-xmark text-danger' : (a.type === 'warning' ? 'fa-circle-exclamation text-warning' : 'fa-circle-check text-success')}"></i>
                                        </div>
                                        <div class="alert-details">
                                            <h4>${a.title}</h4>
                                            <p>${a.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <button id="btn-quick-report" class="btn btn-outline btn-block mt-3">
                                <i class="fa-solid fa-plus"></i> Registrar Acción Hoy
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Setup Quick Report Button redirection
            const btnQuickReport = document.getElementById('btn-quick-report');
            if (btnQuickReport) {
                btnQuickReport.addEventListener('click', () => {
                    window.location.hash = '#add-report';
                });
            }

            // Initialize Charts using Chart.js
            this.renderDashboardCharts(finances);

        } catch (err) {
            console.error("Dashboard render error", err);
            container.innerHTML = `
                <div class="card error-card text-center p-5">
                    <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Error al cargar los datos del Dashboard</h3>
                    <p class="mb-3">${err.message || 'Verifica la conexión a internet o la configuración de Google Sheets.'}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary"><i class="fa-solid fa-rotate"></i> Reintentar</button>
                </div>
            `;
        }
    },

    /**
     * Processes financial data and renders the Chart
     */
    renderDashboardCharts(finances) {
        // Group finances by Year-Month
        const monthlyData = {};
        finances.forEach(row => {
            const dateStr = row[2]; // YYYY-MM-DD
            if (!dateStr) return;
            const month = dateStr.substring(0, 7); // YYYY-MM
            const type = row[3]; // 'Ingreso' / 'Gasto'
            const amount = parseFloat(row[5]) || 0;

            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expenses: 0 };
            }
            if (type === 'Ingreso') monthlyData[month].income += amount;
            else if (type === 'Gasto') monthlyData[month].expenses += amount;
        });

        // Get sorted list of months (last 6 months)
        const sortedMonths = Object.keys(monthlyData).sort().slice(-6);
        const labels = sortedMonths.map(m => {
            const [year, month] = m.split('-');
            const date = new Date(year, month - 1);
            return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
        });
        const incomeData = sortedMonths.map(m => monthlyData[m].income);
        const expenseData = sortedMonths.map(m => monthlyData[m].expenses);

        const ctx = document.getElementById('chart-finances').getContext('2d');
        const isDark = document.body.classList.contains('dark-theme');
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? '#1e293b' : '#e2e8f0';

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['Sin Datos'],
                datasets: [
                    {
                        label: 'Ingresos ($)',
                        data: incomeData.length > 0 ? incomeData : [0],
                        backgroundColor: 'rgba(34, 197, 94, 0.7)',
                        borderColor: '#22c55e',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'Gastos ($)',
                        data: expenseData.length > 0 ? expenseData : [0],
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderColor: '#ef4444',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { family: 'Outfit', size: 12 } }
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { family: 'Inter' } }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { family: 'Inter' } }
                    }
                }
            }
        });
    },

    /**
     * Render 1.5. Climatology Mock View (Room Climate)
     */
    async renderClimatology(containerId, showLoading, hideLoading) {
        showLoading("Cargando Climatología...");
        const container = document.getElementById(containerId);

        let clima = [];
        try {
            clima = await GoogleAPI.getClimaData();
        } catch (err) {
            console.error("Error loading clima data", err);
        }

        hideLoading();

        // Process latest records
        const climaRecords = clima.slice(1).filter(r => r && r[0]);
        // Sort ascending by Date
        climaRecords.sort((a, b) => new Date(a[1].replace(' ', 'T')) - new Date(b[1].replace(' ', 'T')));

        // Latest manual record (if any)
        const latestManual = [...climaRecords].reverse().find(r => r[4] === 'Manual - Planta');
        // Latest API record (if any)
        const latestApi = [...climaRecords].reverse().find(r => r[4] === 'API Open-Meteo');

        const isObservador = GoogleAPI.user.role === 'Observador';

        container.innerHTML = `
            <div class="slide-in-view">
                <!-- Overview Cards -->
                <div class="dashboard-grid mb-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                    <!-- Latest Intern (Manual) -->
                    <div class="card p-4 text-center" style="border-left: 4px solid #ef4444; background-color: var(--bg-secondary);">
                        <h3 class="mb-2"><i class="fa-solid fa-house-laptop text-danger"></i> Clima Interno (Sala)</h3>
                        <p style="font-size: 0.8rem; color: var(--text-secondary);" class="mb-3">Último registro manual en planta</p>
                        ${latestManual ? `
                            <div style="display: flex; justify-content: space-around; gap: 1rem; margin-bottom: 0.5rem;">
                                <div>
                                    <small style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary); display: block;">Temp</small>
                                    <strong style="font-size: 1.8rem; color: #ef4444;">${parseFloat(latestManual[2]).toFixed(1)} °C</strong>
                                </div>
                                <div>
                                    <small style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary); display: block;">Humedad</small>
                                    <strong style="font-size: 1.8rem; color: #1d4ed8;">${parseFloat(latestManual[3]).toFixed(0)} %</strong>
                                </div>
                            </div>
                            <small class="text-secondary" style="font-size: 0.75rem;">Fecha: ${latestManual[1]}</small>
                            ${latestManual[5] ? `<div class="mt-2 text-warning" style="font-size: 0.8rem; font-style: italic;">"${latestManual[5]}"</div>` : ''}
                        ` : `
                            <p class="text-secondary py-3">No hay registros manuales aún</p>
                        `}
                    </div>

                    <!-- Latest Extern (API Open-Meteo) -->
                    <div class="card p-4 text-center" style="border-left: 4px solid #f97316; background-color: var(--bg-secondary);">
                        <h3 class="mb-2"><i class="fa-solid fa-cloud-sun text-warning"></i> Clima Externo</h3>
                        <p style="font-size: 0.8rem; color: var(--text-secondary);" class="mb-3">La Merced (API Open-Meteo)</p>
                        ${latestApi ? `
                            <div style="display: flex; justify-content: space-around; gap: 1rem; margin-bottom: 0.5rem;">
                                <div>
                                    <small style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary); display: block;">Temp</small>
                                    <strong style="font-size: 1.8rem; color: #f97316;">${parseFloat(latestApi[2]).toFixed(1)} °C</strong>
                                </div>
                                <div>
                                    <small style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary); display: block;">Humedad</small>
                                    <strong style="font-size: 1.8rem; color: #06b6d4;">${parseFloat(latestApi[3]).toFixed(0)} %</strong>
                                </div>
                            </div>
                            <small class="text-secondary" style="font-size: 0.75rem;">Fecha: ${latestApi[1]}</small>
                            <div class="mt-2 text-secondary" style="font-size: 0.75rem;"><span class="badge warning" style="background: rgba(249,115,22,0.1); color: #f97316; padding: 0.15rem 0.4rem; border-radius: 4px;">sacado de internet</span></div>
                        ` : `
                            <p class="text-secondary py-3">No hay registros de internet aún</p>
                        `}
                    </div>
                </div>

                <!-- Registration Form (Section 1) -->
                <div class="card p-4 mb-4">
                    <h3 class="mb-3 text-success"><i class="fa-solid fa-square-plus"></i> Registrar Clima Manual - Planta</h3>
                    ${isObservador ? `
                        <div class="text-center text-secondary py-3">El rol 'Observador' no tiene permisos para registrar clima.</div>
                    ` : `
                        <form id="form-add-clima" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) auto; gap: 1rem; align-items: flex-end;">
                            <div class="form-group mb-0" style="margin-bottom: 0;">
                                <label class="form-label" for="clima-temp">Temperatura de la Sala (°C)</label>
                                <input type="number" inputmode="decimal" id="clima-temp" class="form-control" placeholder="Ej: 28.5" step="0.1" required>
                            </div>
                            <div class="form-group mb-0" style="margin-bottom: 0;">
                                <label class="form-label" for="clima-hum">Humedad de la Sala (%)</label>
                                <input type="number" inputmode="decimal" id="clima-hum" class="form-control" placeholder="Ej: 65" step="1" min="0" max="100" required>
                            </div>
                            <div class="form-group mb-0" style="margin-bottom: 0;">
                                <label class="form-label" for="clima-obs">Observación / Nota</label>
                                <input type="text" id="clima-obs" class="form-control" placeholder="Ej: Humedad elevada, ventilador encendido">
                            </div>
                            <button type="submit" class="btn btn-primary" style="height: 42px;">
                                <i class="fa-solid fa-floppy-disk"></i> Registrar Clima
                            </button>
                        </form>
                    `}
                </div>

                <!-- Climate Dual Chart (Section 2) -->
                <div class="card p-4">
                    <h3 class="mb-3"><i class="fa-solid fa-chart-line text-success"></i> Comparativa Clima Ambiental (Últimos 3-5 días)</h3>
                    <div style="height: 320px; position: relative;">
                        <canvas id="chart-clima-ambiental" style="width: 100%; height: 100%;"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Wire form submit
        if (!isObservador) {
            const formClima = document.getElementById('form-add-clima');
            if (formClima) {
                formClima.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    if (GoogleAPI.user.role === 'Observador') {
                        alert("Acceso denegado: El rol 'Observador' no puede ingresar datos.");
                        return;
                    }

                    const temp = parseFloat(document.getElementById('clima-temp').value);
                    const hum = parseFloat(document.getElementById('clima-hum').value);
                    const obs = document.getElementById('clima-obs').value.trim();

                    const payload = { temp, hum, obs };

                    // Reset form immediately
                    formClima.reset();

                    // Submit offline-first via executeBackgroundSubmit
                    executeBackgroundSubmit('add-clima', payload, async () => {
                        await GoogleAPI.addClimaRecord(temp, hum, obs);
                    });

                    // Wait slightly and refresh
                    setTimeout(() => {
                        this.renderClimatology(containerId, showLoading, hideLoading);
                    }, 1500);
                });
            }
        }

        // Render Chart.js
        const ctx = document.getElementById('chart-clima-ambiental');
        if (ctx) {
            // Filter last 4 days of records (from 3 to 5 days)
            const fourDaysAgo = new Date();
            fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

            let filteredClima = climaRecords.filter(r => new Date(r[1].replace(' ', 'T')) >= fourDaysAgo);
            if (filteredClima.length === 0) {
                // Fallback to last 24 entries if empty in last 4 days
                filteredClima = climaRecords.slice(-24);
            }

            // Align on hourly X-axis
            const hoursSet = new Set();
            filteredClima.forEach(r => {
                const dateStr = r[1];
                if (dateStr) {
                    const hourStr = dateStr.substring(0, 13) + ":00";
                    hoursSet.add(hourStr);
                }
            });
            const sortedHours = Array.from(hoursSet).sort();

            const manualTempData = [];
            const manualHumData = [];
            const apiTempData = [];
            const apiHumData = [];

            sortedHours.forEach(hour => {
                const hourPrefix = hour.substring(0, 13);
                
                const mRec = filteredClima.find(r => r[1].startsWith(hourPrefix) && r[4] === 'Manual - Planta');
                const aRec = filteredClima.find(r => r[1].startsWith(hourPrefix) && r[4] === 'API Open-Meteo');

                manualTempData.push(mRec ? parseFloat(mRec[2]) : null);
                manualHumData.push(mRec ? parseFloat(mRec[3]) : null);

                apiTempData.push(aRec ? parseFloat(aRec[2]) : null);
                apiHumData.push(aRec ? parseFloat(aRec[3]) : null);
            });

            // Map sortedHours labels to a readable date format
            const labels = sortedHours.map(h => {
                try {
                    const [datePart, timePart] = h.split(' ');
                    const [y, m, d] = datePart.split('-');
                    const hour = timePart.split(':')[0];
                    const date = new Date(y, m - 1, d);
                    const dayMonth = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                    return `${dayMonth} - ${hour}h`;
                } catch (e) {
                    return h;
                }
            });

            const isDark = document.body.classList.contains('dark-theme');
            const textColor = isDark ? '#94a3b8' : '#64748b';
            const gridColor = isDark ? '#1e293b' : '#e2e8f0';

            new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels.length > 0 ? labels : ['Sin Datos'],
                    datasets: [
                        {
                            label: 'Temp Interna (Manual - Planta)',
                            data: manualTempData,
                            borderColor: '#ef4444', // Red Line
                            backgroundColor: 'rgba(239, 68, 68, 0.05)',
                            borderWidth: 2.5,
                            tension: 0.35,
                            yAxisID: 'y',
                            spanGaps: true
                        },
                        {
                            label: 'Temp Externa (API Open-Meteo)',
                            data: apiTempData,
                            borderColor: '#f97316', // Orange
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            borderDash: [6, 4], // Dotted
                            tension: 0.35,
                            yAxisID: 'y',
                            spanGaps: true
                        },
                        {
                            label: 'Humedad Interna (Manual - Planta)',
                            data: manualHumData,
                            borderColor: '#1d4ed8', // Dark Blue
                            backgroundColor: 'rgba(29, 78, 216, 0.05)',
                            borderWidth: 2.5,
                            tension: 0.35,
                            yAxisID: 'y1',
                            spanGaps: true
                        },
                        {
                            label: 'Humedad Externa (API Open-Meteo)',
                            data: apiHumData,
                            borderColor: '#06b6d4', // Celeste / Cyan
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            borderDash: [6, 4], // Dotted
                            tension: 0.35,
                            yAxisID: 'y1',
                            spanGaps: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: textColor, font: { family: 'Outfit', size: 11 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    const label = context.dataset.label.split(' ')[0];
                                    const isExternal = context.dataset.label.includes('Externa') || context.dataset.label.includes('API');
                                    const originLabel = isExternal ? 'API Open-Meteo (sacado de internet)' : 'Manual - Planta';
                                    const unit = context.dataset.yAxisID === 'y' ? '°C' : '%';
                                    return `${label}: ${value} ${unit} (${originLabel})`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
                        },
                        y: {
                            type: 'linear',
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Temperatura (°C)',
                                color: textColor,
                                font: { family: 'Outfit', weight: 'bold' }
                            },
                            grid: { color: gridColor },
                            ticks: { color: textColor }
                        },
                        y1: {
                            type: 'linear',
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Humedad (%)',
                                color: textColor,
                                font: { family: 'Outfit', weight: 'bold' }
                            },
                            grid: { drawOnChartArea: false },
                            ticks: { color: textColor },
                            min: 0,
                            max: 100
                        }
                    }
                }
            });
        }
    },

    /**
     * Render 2. Add Report Form (Independent Registries)
     */
    async renderAddReport(containerId, showLoading, hideLoading) {
        showLoading("Cargando formularios...");
        
        let camas = [];
        let users = [];
        try {
            const rawCamas = await GoogleAPI.getCamas();
            camas = rawCamas.slice(1).filter(c => c[1] === 'En Servicio');
            users = await GoogleAPI.getUsuarios();
        } catch (err) {
            console.error("Error loading data for report", err);
        }
        
        hideLoading();

        const container = document.getElementById(containerId);
        this.selectedFiles = []; // Reset selected files list
        const isSocioOrAdmin = (GoogleAPI.user.role === 'Socio' || GoogleAPI.user.role === 'Administrador');

        // Determine today's local date for date pickers
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localNow = new Date(now.getTime() - (offset*60*1000));
        const todayStr = localNow.toISOString().substring(0, 10);

        container.innerHTML = `
            <style>
                .tina-select-card, .collab-select-card {
                    border: 2px solid var(--border-color) !important;
                    background-color: var(--bg-secondary) !important;
                    border-radius: var(--radius-sm) !important;
                    padding: 0.75rem !important;
                    transition: all 0.2s ease-in-out !important;
                    cursor: pointer !important;
                    user-select: none !important;
                }
                .tina-select-card:hover, .collab-select-card:hover {
                    border-color: var(--brand-primary) !important;
                    background-color: rgba(255, 255, 255, 0.02) !important;
                }
                .tina-select-card.selected, .collab-select-card.selected {
                    border-color: var(--text-success) !important;
                    background-color: rgba(34, 197, 94, 0.1) !important;
                    box-shadow: 0 0 10px rgba(34, 197, 94, 0.2) !important;
                }
                .quick-qty-btn, .quick-qty-btn-reset {
                    transition: all 0.1s ease !important;
                }
                .quick-qty-btn:active, .quick-qty-btn-reset:active {
                    transform: scale(0.95) !important;
                }
            </style>
            <div class="form-card slide-in-view">
                <!-- Navigation Sub-tabs for Independent Registries -->
                <div class="filter-tabs mb-3" id="report-type-tabs" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <span class="filter-tab active" data-form="section-bitacora" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-notes-medical"></i> 1. Fotos y Novedades del Criadero</span>
                    ${isSocioOrAdmin ? `
                    <span class="filter-tab" data-form="section-finanzas" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-scale-balanced"></i> 2. Apuntar un Gasto (Compras/Pagos)</span>
                    ` : ''}
                    <span class="filter-tab" data-form="section-insumos" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-boxes-stacked"></i> 3. Mover Bodega (Entradas/Salidas)</span>
                    <span class="filter-tab" data-form="section-maquinaria" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-screwdriver-wrench"></i> 4. Registrar Herramientas y Máquinas</span>
                    ${isSocioOrAdmin ? `
                    <span class="filter-tab" data-form="section-ingresos" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-hand-holding-dollar"></i> 5. Apuntar una Venta (Ingresos)</span>
                    ` : ''}
                    ${GoogleAPI.user.role === 'Administrador' ? `
                    <span class="filter-tab" data-form="section-aportes" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-handshake"></i> 6. Aportes de Socios / Efectivo</span>
                    ` : ''}
                </div>

                <!-- FORM SECTION 1: REPORT & PHOTOS -->
                <div id="form-bitacora-section" class="card">
                    <h2 class="mb-3"><i class="fa-solid fa-notes-medical text-success"></i> 1. Fotos y Novedades del Criadero</h2>
                    <p class="mb-3">Registra cómo va el día, la temperatura general o si alimentaste a las larvas hoy.</p>
                    
                    <form id="add-report-form">
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="report-category">¿Qué tipo de tarea hiciste?</label>
                                <select id="report-category" class="form-control" required>
                                    <option value="General">Control Diario General</option>
                                    <option value="Alimentación">Alimentación / Manejo de Sustrato</option>
                                    <option value="Oviposición">Recolección de Huevos / Oviposición</option>
                                    <option value="Cosecha">Cosecha de Larva / Pupa</option>
                                    <option value="Mantenimiento">Mantenimiento de Jaulas / Infraestructura</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="report-date">Fecha de la Tarea</label>
                                <input type="date" id="report-date" class="form-control" value="${todayStr}" required ${GoogleAPI.user.role !== 'Administrador' ? 'disabled' : ''}>
                            </div>
                        </div>

                        <!-- DYNAMIC FEEDING AREA FOR REPORT -->
                        <div id="feeding-report-details" class="hidden mt-3 p-3 card" style="background-color: var(--bg-secondary); border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                            <h4 class="mb-3 text-success"><i class="fa-solid fa-seedling"></i> Distribución de Alimento (Tinas)</h4>
                            <div class="form-row-3" style="display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 1rem;">
                                <div class="form-group mb-0" style="margin-bottom: 0;">
                                    <label class="form-label" for="report-feed-insumo">Insumo / Alimento suministrado</label>
                                    <input type="text" id="report-feed-insumo" class="form-control" list="report-feed-names-list" placeholder="Ej: Salvado de Trigo">
                                    <datalist id="report-feed-names-list">
                                        <option value="Salvado de Trigo">
                                        <option value="Residuos Fruta / Verdura">
                                        <option value="Afrecho de Cerveza">
                                        <option value="Sustrato de Atracción">
                                        <option value="Aserrín">
                                        <option value="Restos de Fruta">
                                    </datalist>
                                </div>
                                <div class="form-group mb-0" style="margin-bottom: 0;">
                                    <label class="form-label" for="report-feed-qty">Cantidad Suministrada</label>
                                    <input type="number" inputmode="decimal" id="report-feed-qty" class="form-control" placeholder="0.0" step="0.1" min="0.1">
                                    ${this.renderQuickQtyButtons('report-feed-qty', false, 'kg')}
                                </div>
                                <div class="form-group mb-0" style="margin-bottom: 0;">
                                    <label class="form-label" for="report-feed-unit">Unidad</label>
                                    <select id="report-feed-unit" class="form-control" style="padding: 0.5rem;">
                                        <option value="kg">kg</option>
                                        <option value="baldes">baldes</option>
                                        <option value="sacos">sacos</option>
                                        <option value="L">L</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group mt-3 mb-0" style="margin-bottom: 0;">
                                <label class="form-label">Toca sobre las tinas que quieres alimentar (por lote):</label>
                                ${this.renderTinaSelection(camas, 'report')}
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="report-desc">Novedades u Observaciones del Día</label>
                            <textarea id="report-desc" class="form-control" placeholder="Escribe aquí de forma simple cómo encontraste el criadero hoy, el desarrollo de las larvas, etc..." required></textarea>
                        </div>

                        <div class="form-group">
                            <label class="form-label">¿Quiénes colaboraron en esta tarea hoy?</label>
                            ${this.renderCollaboratorsList(users, 'report')}
                        </div>

                        <div class="form-group">
                            <label class="form-label">Fotos de Evidencia (Se guardarán en Drive)</label>
                            <div class="file-upload-wrapper" id="file-dropzone">
                                <div class="file-upload-message">
                                    <i class="fa-solid fa-cloud-arrow-up"></i>
                                    <p>Arrastra fotos aquí o <strong>toca para abrir la cámara/galería</strong></p>
                                    <small class="text-secondary">Soporta fotos JPG o PNG</small>
                                </div>
                                <input type="file" id="report-photos" multiple accept="image/*">
                            </div>
                            <div id="preview-images" class="preview-images-container"></div>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block btn-lg mt-3">
                            <i class="fa-solid fa-cloud-arrow-up"></i> Registrar Novedades del Día
                        </button>
                    </form>
                </div>

                <!-- FORM SECTION 2: FINANCES -->
                <div id="form-finanzas-section" class="card hidden">
                    <h2 class="mb-3"><i class="fa-solid fa-scale-balanced text-success"></i> 2. Apuntar un Gasto (Compras / Pagos)</h2>
                    <p class="mb-3">Registra compras de alimentos, transporte del sustrato, pagos de servicios de agua o luz, o el sueldo de los trabajadores.</p>
                    
                    <form id="add-finance-form">
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="finance-type">Tipo de Movimiento</label>
                                <select id="finance-type" class="form-control" required disabled>
                                    <option value="Gasto" selected>Gasto / Egreso (Pago realizado)</option>
                                    <option value="Ingreso">Ingreso / Venta (Entrada de dinero)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="finance-amount">Monto Pagado ($)</label>
                                <input type="number" inputmode="decimal" id="finance-amount" class="form-control" placeholder="0.00" step="0.01" min="0.01" required>
                                ${this.renderQuickQtyButtons('finance-amount', true)}
                            </div>
                        </div>
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="finance-category">¿Qué tipo de gasto fue?</label>
                                <input type="text" id="finance-category" class="form-control" list="finance-cat-list" placeholder="Elige de la lista o escribe..." required>
                                <datalist id="finance-cat-list">
                                    <option value="Servicios: Luz / Agua">
                                    <option value="Logística: Transporte de Sustrato">
                                    <option value="Personal: Pago a Trabajadores">
                                    <option value="Operativo: Compra de Insumos">
                                    <option value="Activos: Compra de Maquinaria">
                                    <option value="Otros Gastos">
                                </datalist>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="finance-date">Fecha del Pago</label>
                                <input type="date" id="finance-date" class="form-control" value="${todayStr}" required ${GoogleAPI.user.role !== 'Administrador' ? 'disabled' : ''}>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="finance-desc">¿En qué se usó el dinero? (Detalle legible)</label>
                            <input type="text" id="finance-desc" class="form-control" placeholder="Ej: Pago de recibo de luz de Mayo, o Compra de 50 sacos de afrecho" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">¿Quiénes colaboraron en esta tarea hoy?</label>
                            ${this.renderCollaboratorsList(users, 'finance')}
                        </div>

                        <button type="submit" class="btn btn-primary btn-block btn-lg mt-3">
                            <i class="fa-solid fa-floppy-disk"></i> Registrar Gasto de Dinero
                        </button>
                    </form>
                </div>

                <!-- FORM SECTION 3: SUPPLIES -->
                <div id="form-insumos-section" class="card hidden">
                    <h2 class="mb-3"><i class="fa-solid fa-boxes-stacked text-success"></i> 3. Mover Bodega (Entradas / Salidas de Alimentos)</h2>
                    <p class="mb-3">Añade stock recién comprado o registra el alimento que le das a las tinas de bodega.</p>
                    
                    <form id="add-supply-form">
                        <div class="form-row-3" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label class="form-label" for="supply-category">Tipo de Insumo</label>
                                <select id="supply-category" class="form-control" required>
                                    <option value="Sustrato">Sustrato (Alimento de larvas)</option>
                                    <option value="Insumo General">Insumo General (Limpieza, bandejas, etc)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="supply-name">Nombre del Producto / Insumo</label>
                                <input type="text" id="supply-name" class="form-control" list="supply-names-list" placeholder="Ej: Aserrín" required>
                                <datalist id="supply-names-list">
                                    <option value="Aserrín">
                                    <option value="Restos de Fruta">
                                    <option value="Salvado de Trigo">
                                    <option value="Afrecho de Cerveza">
                                    <option value="Sustrato de Atracción">
                                    <option value="Cajas / Bandejas de Engorde">
                                </datalist>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="supply-action">¿Qué movimiento harás?</label>
                                <select id="supply-action" class="form-control" required>
                                    <option value="Utilización">Salida de Bodega (Alimentar tinas)</option>
                                    <option value="Adición">Entrada a Bodega (Compra / Ingreso)</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row-3" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label class="form-label" for="supply-qty">Cantidad Movida</label>
                                <input type="number" inputmode="decimal" id="supply-qty" class="form-control" placeholder="0.0" step="0.1" min="0.1" required>
                                ${this.renderQuickQtyButtons('supply-qty', false, 'kg')}
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="supply-unit">Unidad de Medida</label>
                                <input type="text" id="supply-unit" class="form-control" list="supply-units-list" value="kg" placeholder="Ej: kg, sacos, etc" required>
                                <datalist id="supply-units-list">
                                    <option value="kg">Kilogramos (kg)</option>
                                    <option value="baldes">Baldes (restos de fruta)</option>
                                    <option value="sacos">Sacos (aserrín/salvado)</option>
                                    <option value="L">Litros (L)</option>
                                    <option value="unidades">Unidades (unids)</option>
                                    <option value="g">Gramos (g)</option>
                                </datalist>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="supply-date">Fecha del Movimiento</label>
                                <input type="date" id="supply-date" class="form-control" value="${todayStr}" required ${GoogleAPI.user.role !== 'Administrador' ? 'disabled' : ''}>
                            </div>
                        </div>
                        <!-- DYNAMIC FEEDING AREA FOR SUPPLIES -->
                        <div id="supply-feeding-details" class="mt-3 p-3 card" style="background-color: var(--bg-secondary); border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                            <h4 class="mb-3 text-success"><i class="fa-solid fa-seedling"></i> Tinas Alimentadas asociadas</h4>
                            <p style="font-size: 0.85rem; color: var(--text-secondary);" class="mb-3">
                                Selecciona qué tinas recibieron este alimento. La cantidad se dividirá equitativamente.
                            </p>
                            <div class="form-group mb-0" style="margin-bottom: 0;">
                                <label class="form-label">Toca las tinas que recibieron alimento hoy (por lote):</label>
                                ${this.renderTinaSelection(camas, 'supply')}
                            </div>
                        </div>
                        <div class="form-row-2">
                             <div class="form-group">
                                 <label class="form-label" for="supply-size">Tamaño / Presentación (Opcional)</label>
                                 <input type="text" id="supply-size" class="form-control" placeholder="Ej: Saco de 45kg, Botella 1L, Mediano">
                             </div>
                             <div class="form-group">
                                 <label class="form-label" for="supply-cost">Costo Total ($) (Opcional si es compra recién ingresada)</label>
                                 <input type="number" inputmode="decimal" id="supply-cost" class="form-control" placeholder="Dejar vacío si no costó dinero" step="0.01" min="0">
                                 ${this.renderQuickQtyButtons('supply-cost', true)}
                             </div>
                         </div>

                        <div class="form-group">
                            <label class="form-label">¿Quiénes colaboraron en esta tarea hoy?</label>
                            ${this.renderCollaboratorsList(users, 'supply')}
                        </div>

                        <button type="submit" class="btn btn-primary btn-block btn-lg mt-3">
                            <i class="fa-solid fa-floppy-disk"></i> Registrar Movimiento de Bodega
                        </button>
                    </form>
                </div>

                <!-- FORM SECTION 4: MACHINERY -->
                <div id="form-maquinaria-section" class="card hidden">
                    <h2 class="mb-3"><i class="fa-solid fa-screwdriver-wrench text-success"></i> 4. Registrar Herramientas y Máquinas</h2>
                    <p class="mb-3">Registra una nueva herramienta, equipo o máquina para el criadero. Si tiene un costo, se auto-generará un egreso en contabilidad.</p>
                    
                    <form id="add-machinery-form">
                         <div class="form-row-2">
                             <div class="form-group">
                                 <label class="form-label" for="machinery-name">Nombre de la Máquina / Herramienta</label>
                                 <input type="text" id="machinery-name" class="form-control" placeholder="Ej: Trituradora de fruta, Balanza digital, etc" required>
                             </div>
                             <div class="form-group">
                                 <label class="form-label" for="machinery-date">Fecha de Compra</label>
                                 <input type="date" id="machinery-date" class="form-control" value="${todayStr}" required ${GoogleAPI.user.role !== 'Administrador' ? 'disabled' : ''}>
                             </div>
                         </div>
                         <div class="form-row-2">
                             <div class="form-group">
                                 <label class="form-label" for="machinery-qty">Cantidad</label>
                                 <input type="number" inputmode="decimal" id="machinery-qty" class="form-control" value="1" min="1" step="1" required>
                             </div>
                             <div class="form-group">
                                 <label class="form-label" for="machinery-size">Tamaño / Capacidad (Opcional)</label>
                                 <input type="text" id="machinery-size" class="form-control" placeholder="Ej: Grande, 20L, Mediano">
                             </div>
                         </div>
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="machinery-cost">Precio de Compra ($)</label>
                                <input type="number" inputmode="decimal" id="machinery-cost" class="form-control" placeholder="0.00" step="0.01" min="0" required>
                                ${this.renderQuickQtyButtons('machinery-cost', true)}
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="machinery-status">Estado Operativo Inicial</label>
                                <select id="machinery-status" class="form-control" required>
                                    <option value="Operativo">Operativo (Listo para usarse)</option>
                                    <option value="En Mantenimiento">En Mantenimiento</option>
                                    <option value="Fuera de servicio">Fuera de servicio</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="machinery-desc">Descripción / Observación corta</label>
                            <input type="text" id="machinery-desc" class="form-control" placeholder="Ej: Marca Bosch, capacidad 20L, comprado con garantía">
                        </div>

                        <div class="form-group">
                            <label class="form-label">¿Quiénes colaboraron en esta tarea hoy?</label>
                            ${this.renderCollaboratorsList(users, 'machinery')}
                        </div>

                        <button type="submit" class="btn btn-primary btn-block btn-lg mt-3">
                            <i class="fa-solid fa-floppy-disk"></i> Registrar Nueva Herramienta
                        </button>
                    </form>
                </div>

                <!-- FORM SECTION 5: REVENUES / SALES -->
                <div id="form-ingresos-section" class="card hidden">
                    <h2 class="mb-3"><i class="fa-solid fa-hand-holding-dollar text-success"></i> 5. Apuntar una Venta (Ingresos por Ventas)</h2>
                    <p class="mb-3">Registra los ingresos obtenidos por las ventas de los productos de tu criadero (larva viva, seca, abono, etc) o servicios prestados.</p>
                    
                    <form id="add-sale-form">
                        <div class="form-row-3" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label class="form-label" for="sale-product">Producto Vendido</label>
                                <select id="sale-product" class="form-control" required>
                                    <option value="Larva Fresca">Larva Fresca</option>
                                    <option value="Larva Deshidratada">Larva Deshidratada</option>
                                    <option value="Harina de Larva">Harina de Larva</option>
                                    <option value="Aceite de Larva">Aceite de Larva</option>
                                    <option value="Frass (Abono Orgánico)">Frass (Abono Orgánico)</option>
                                    <option value="Pie de Cría (Huevos / Neonatos / Pupas)">Pie de Cría (Huevos/Pupas)</option>
                                    <option value="Servicio de Gestión de Residuos">Servicio de Gestión de Residuos</option>
                                    <option value="Otros Ingresos">Otros Ingresos</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="sale-qty">Cantidad</label>
                                <input type="number" inputmode="decimal" id="sale-qty" class="form-control" placeholder="0.0" step="0.1" min="0.1" required>
                                ${this.renderQuickQtyButtons('sale-qty', false, 'unid')}
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="sale-price">Precio Unitario ($)</label>
                                <input type="number" inputmode="decimal" id="sale-price" class="form-control" placeholder="0.00" step="0.01" min="0.01" required>
                                ${this.renderQuickQtyButtons('sale-price', true)}
                            </div>
                        </div>
                        
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="sale-client">Nombre del Cliente / Detalle</label>
                                <input type="text" id="sale-client" class="form-control" placeholder="Ej: Cliente Juan Pérez, o Venta local" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="sale-date">Fecha de la Venta</label>
                                <input type="date" id="sale-date" class="form-control" value="${todayStr}" required ${GoogleAPI.user.role !== 'Administrador' ? 'disabled' : ''}>
                            </div>
                        </div>

                        <!-- Collaborators -->
                        <div class="form-group">
                            <label class="form-label">¿Quiénes ayudaron en esta tarea hoy? (Colaboradores)</label>
                            ${this.renderCollaboratorsList(users, 'sale')}
                        </div>

                        <!-- Natural Language Dynamic Summary -->
                        <div id="sale-natural-summary" class="alert-item success p-3 mb-3 hidden" style="border-left: 4px solid var(--text-success); background-color: rgba(34, 197, 94, 0.05); font-weight: bold; border-radius: var(--radius-sm); margin-bottom: 1rem;">
                            <!-- Text will be injected by JS -->
                        </div>

                        <button type="submit" class="btn btn-primary btn-block btn-lg mt-3">
                            <i class="fa-solid fa-wallet"></i> Registrar Venta e Ingreso de Dinero
                        </button>
                    </form>
                </div>

                <!-- FORM SECTION 6: PARTNER CONTRIBUTIONS & CASH INFLOWS (Only for Admin) -->
                ${GoogleAPI.user.role === 'Administrador' ? `
                <div id="form-aportes-section" class="card hidden">
                    <h2 class="mb-3"><i class="fa-solid fa-handshake text-success"></i> 6. Aportes de Socios / Ingresos en Efectivo</h2>
                    <p class="mb-3">Registra los aportes de capital realizados por los socios o cualquier otro ingreso de efectivo a caja que no provenga de ventas directas de producto.</p>
                    
                    <form id="add-capital-form">
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="capital-category">Tipo de Ingreso</label>
                                <select id="capital-category" class="form-control" required>
                                    <option value="Aporte de Socio">Aporte de Socio (Capitalización)</option>
                                    <option value="Ingreso en Efectivo">Ingreso en Efectivo (Caja General)</option>
                                    <option value="Préstamo o Financiamiento">Préstamo o Financiamiento</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="capital-amount">Monto Recibido ($)</label>
                                <input type="number" inputmode="decimal" id="capital-amount" class="form-control" placeholder="0.00" step="0.01" min="0.01" required>
                                ${this.renderQuickQtyButtons('capital-amount', true)}
                            </div>
                        </div>
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="capital-partner">Socio Aportante / Persona Origen</label>
                                <input type="text" id="capital-partner" class="form-control" placeholder="Ej: Socio Juan Pérez, o Caja Chica" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="capital-date">Fecha del Ingreso</label>
                                <input type="date" id="capital-date" class="form-control" value="${todayStr}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="capital-desc">Descripción / Nota</label>
                            <input type="text" id="capital-desc" class="form-control" placeholder="Ej: Aporte para compra de insumos de cría, o saldo inicial" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">¿Quiénes gestionaron este ingreso? (Colaboradores)</label>
                            ${this.renderCollaboratorsList(users, 'capital')}
                        </div>
                        <button type="submit" class="btn btn-primary btn-block btn-lg mt-3">
                            <i class="fa-solid fa-floppy-disk"></i> Registrar Aporte / Ingreso en Efectivo
                        </button>
                    </form>
                </div>
                ` : ''}
            </div>
        `;

        // Wire sub-tab switching
        const formTabs = document.querySelectorAll('#report-type-tabs .filter-tab');
        const secBitacora = document.getElementById('form-bitacora-section');
        const secFinanzas = document.getElementById('form-finanzas-section');
        const secInsumos = document.getElementById('form-insumos-section');
        const secMaquinaria = document.getElementById('form-maquinaria-section');
        const secIngresos = document.getElementById('form-ingresos-section');
        const secAportes = document.getElementById('form-aportes-section');

        formTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                formTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const targetForm = tab.getAttribute('data-form');
                
                // PARCHE: Validar existencia antes de ocultar (RBAC Compliance)
                if (secBitacora) secBitacora.classList.add('hidden');
                if (secFinanzas) secFinanzas.classList.add('hidden');
                if (secInsumos) secInsumos.classList.add('hidden');
                if (secMaquinaria) secMaquinaria.classList.add('hidden');
                if (secIngresos) secIngresos.classList.add('hidden');
                if (secAportes) secAportes.classList.add('hidden');

                // PARCHE: Validar existencia antes de mostrar
                if (targetForm === 'section-bitacora' && secBitacora) {
                    secBitacora.classList.remove('hidden');
                } else if (targetForm === 'section-finanzas' && secFinanzas) {
                    secFinanzas.classList.remove('hidden');
                } else if (targetForm === 'section-insumos' && secInsumos) {
                    secInsumos.classList.remove('hidden');
                } else if (targetForm === 'section-maquinaria' && secMaquinaria) {
                    secMaquinaria.classList.remove('hidden');
                } else if (targetForm === 'section-ingresos' && secIngresos) {
                    secIngresos.classList.remove('hidden');
                } else if (targetForm === 'section-aportes' && secAportes) {
                    secAportes.classList.remove('hidden');
                }
            });
        });

        // TACTILE CARDS SELECTORS (Tinas & Collaborators)
        container.querySelectorAll('.tina-select-card').forEach(card => {
            card.addEventListener('click', () => {
                const checkbox = card.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });
        });

        container.querySelectorAll('.btn-select-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = btn.getAttribute('data-group-id');
                const prefix = btn.getAttribute('data-prefix');
                const groupCards = container.querySelectorAll(`.tina-select-card[data-prefix="${prefix}"] input.tina-checkbox-group-${groupId}`);
                
                const checkboxes = Array.from(groupCards);
                const allChecked = checkboxes.every(cb => cb.checked);
                
                checkboxes.forEach(cb => {
                    cb.checked = !allChecked;
                    const card = cb.closest('.tina-select-card');
                    if (cb.checked) {
                        card.classList.add('selected');
                    } else {
                        card.classList.remove('selected');
                    }
                });
            });
        });

        container.querySelectorAll('.collab-select-card').forEach(card => {
            card.addEventListener('click', () => {
                const checkbox = card.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });
        });

        // QUICK QUANTITY BUTTONS
        container.querySelectorAll('.quick-qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const inputId = btn.getAttribute('data-input');
                const delta = parseFloat(btn.getAttribute('data-delta'));
                const input = document.getElementById(inputId);
                const currentVal = parseFloat(input.value) || 0;
                input.value = Math.max(0, currentVal + delta).toFixed(inputId.includes('price') || inputId.includes('amount') || inputId.includes('cost') ? 2 : 1);
                input.dispatchEvent(new Event('input'));
            });
        });

        container.querySelectorAll('.quick-qty-btn-reset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const inputId = btn.getAttribute('data-input');
                const input = document.getElementById(inputId);
                input.value = '';
                input.dispatchEvent(new Event('input'));
            });
        });

        // NATURAL LANGUAGE SUMMARY FOR SALES
        const saleProduct = document.getElementById('sale-product');
        const saleQty = document.getElementById('sale-qty');
        const salePrice = document.getElementById('sale-price');
        const saleSummary = document.getElementById('sale-natural-summary');

        const updateSaleSummary = () => {
            const product = saleProduct.value;
            const qty = parseFloat(saleQty.value) || 0;
            const price = parseFloat(salePrice.value) || 0;
            const total = qty * price;
            
            if (qty > 0 && price > 0) {
                saleSummary.innerHTML = `<i class="fa-solid fa-circle-info"></i> Resumen: Vas a registrar una venta de <strong>${qty.toFixed(1)}</strong> unidades/kg de <strong>${product}</strong> a un precio de <strong>$${price.toFixed(2)}</strong> cada una, por un total de <span style="font-size: 1.1rem; color: var(--brand-primary); font-weight: 800;">$${total.toFixed(2)}</span>.`;
                saleSummary.classList.remove('hidden');
            } else {
                saleSummary.classList.add('hidden');
            }
        };

        if (saleProduct) {
            saleProduct.addEventListener('change', updateSaleSummary);
            saleQty.addEventListener('input', updateSaleSummary);
            salePrice.addEventListener('input', updateSaleSummary);
        }

        // Set up Report/Bitácora photos drag & drop
        const fileInput = document.getElementById('report-photos');
        const dropzone = document.getElementById('file-dropzone');
        const previewContainer = document.getElementById('preview-images');

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            this.handleFileSelection(e.dataTransfer.files, previewContainer);
        });

        fileInput.addEventListener('change', () => {
            this.handleFileSelection(fileInput.files, previewContainer);
        });

        // Dynamic Quick Qty Button Label updates based on selected unit
        const updateDynamicUnitLabels = (inputUnitId, inputQtyId) => {
            const inputUnit = document.getElementById(inputUnitId);
            if (!inputUnit) return;
            const updateLabels = () => {
                const unit = inputUnit.value;
                container.querySelectorAll(`.quick-qty-btn[data-input="${inputQtyId}"]`).forEach(btn => {
                    const delta = parseFloat(btn.getAttribute('data-delta'));
                    const prefix = delta > 0 ? `+${delta}` : `${delta}`;
                    btn.textContent = `${prefix} ${unit}`;
                });
            };
            inputUnit.addEventListener('input', updateLabels);
            inputUnit.addEventListener('change', updateLabels);
            updateLabels();
        };

        updateDynamicUnitLabels('report-feed-unit', 'report-feed-qty');
        updateDynamicUnitLabels('supply-unit', 'supply-qty');

        // Report category dynamic feeding section toggle
        const reportCategory = document.getElementById('report-category');
        const feedingReportDetails = document.getElementById('feeding-report-details');
        
        reportCategory.addEventListener('change', () => {
            if (reportCategory.value === 'Alimentación') {
                feedingReportDetails.classList.remove('hidden');
                document.getElementById('report-feed-insumo').required = true;
                document.getElementById('report-feed-qty').required = true;
            } else {
                feedingReportDetails.classList.add('hidden');
                document.getElementById('report-feed-insumo').required = false;
                document.getElementById('report-feed-qty').required = false;
            }
        });

        // Supply action dynamic feeding section toggle
        const supplyAction = document.getElementById('supply-action');
        const supplyFeedingDetails = document.getElementById('supply-feeding-details');
        
        supplyAction.addEventListener('change', () => {
            if (supplyAction.value === 'Utilización') {
                supplyFeedingDetails.classList.remove('hidden');
            } else {
                supplyFeedingDetails.classList.add('hidden');
                container.querySelectorAll('.tina-select-card[data-prefix="supply"]').forEach(c => {
                    c.classList.remove('selected');
                    c.querySelector('input').checked = false;
                });
            }
        });

        // Auto-save and Restore draft for report
        const restoreReportDraft = () => {
            const draftStr = localStorage.getItem('bsf_report_draft');
            if (!draftStr) return;
            try {
                const draft = JSON.parse(draftStr);
                if (draft.category) document.getElementById('report-category').value = draft.category;
                if (draft.date) document.getElementById('report-date').value = draft.date;
                if (draft.desc) document.getElementById('report-desc').value = draft.desc;
                if (draft.feedInsumo) document.getElementById('report-feed-insumo').value = draft.feedInsumo;
                if (draft.feedQty) document.getElementById('report-feed-qty').value = draft.feedQty;
                if (draft.feedUnit) document.getElementById('report-feed-unit').value = draft.feedUnit;

                // Trigger events to restore UI dynamically
                const catEl = document.getElementById('report-category');
                if (catEl) catEl.dispatchEvent(new Event('change'));
                const feedUnitInput = document.getElementById('report-feed-unit');
                if (feedUnitInput) feedUnitInput.dispatchEvent(new Event('change'));
            } catch (err) {
                console.error("Fallo al restaurar borrador", err);
            }
        };

        const saveReportDraft = () => {
            const draft = {
                category: document.getElementById('report-category')?.value || '',
                date: document.getElementById('report-date')?.value || '',
                desc: document.getElementById('report-desc')?.value || '',
                feedInsumo: document.getElementById('report-feed-insumo')?.value || '',
                feedQty: document.getElementById('report-feed-qty')?.value || '',
                feedUnit: document.getElementById('report-feed-unit')?.value || ''
            };
            localStorage.setItem('bsf_report_draft', JSON.stringify(draft));
        }; // PARCHE: AQUÍ FALTABA ESTA LLAVE DE CIERRE.

        const formRepDraft = document.getElementById('add-report-form');
        if (formRepDraft) {
            formRepDraft.querySelectorAll('input, textarea, select').forEach(input => {
                input.addEventListener('input', saveReportDraft);
                input.addEventListener('change', saveReportDraft);
            });
            restoreReportDraft();
        }

        // FORM SUBMIT 1: DAILY REPORT & FEEDING (Bitácora)
        const formReport = document.getElementById('add-report-form');
        if (formReport) {
            formReport.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (GoogleAPI.user.role === 'Observador') {
                alert("Acceso denegado: El rol 'Observador' no puede ingresar datos.");
                return;
            }

            const reportCat = document.getElementById('report-category').value;
            let selectedTinas = [];
            let insumo = '';
            let totalQty = 0;

            if (reportCat === 'Alimentación') {
                const selectedChks = container.querySelectorAll('input.report-tina-chk:checked');
                if (selectedChks.length === 0) {
                    alert("Por favor, selecciona al menos una tina alimentada.");
                    return;
                }
                selectedTinas = Array.from(selectedChks).map(chk => chk.value);
                insumo = document.getElementById('report-feed-insumo').value.trim();
                totalQty = parseFloat(document.getElementById('report-feed-qty').value) || 0;

                if (!insumo) {
                    alert("Por favor, ingresa el nombre del insumo/alimento suministrado.");
                    return;
                }
                if (totalQty <= 0) {
                    alert("Por favor, ingresa una cantidad válida mayor a 0.");
                    return;
                }

                // Hot stock validation (only when online)
                if (navigator.onLine) {
                    try {
                        const supplyRows = await GoogleAPI.getSheetData('Insumos!A:J');
                        let currentStock = 0;
                        let unit = '';
                        supplyRows.slice(1).forEach(row => {
                            const name = row[3] ? row[3].trim().toLowerCase() : '';
                            if (name === insumo.toLowerCase()) {
                                const act = row[4];
                                const qty = parseFloat(row[5]) || 0;
                                unit = row[6] || 'kg';
                                if (act === 'Adición') currentStock += qty;
                                else if (act === 'Utilización') currentStock -= qty;
                            }
                        });

                        if (totalQty > currentStock) {
                            alert(`Error: No hay suficiente stock en bodega para alimentar.\nStock actual de "${insumo}": ${currentStock.toFixed(2)} ${unit}.\nCantidad solicitada: ${totalQty.toFixed(2)} ${unit}.`);
                            return;
                        }
                    } catch (stockErr) {
                        console.warn("Fallo al verificar stock en caliente", stockErr);
                    }
                }
            }

            // Disable submit button and show spinner to avoid UI freeze
            const submitBtn = formReport.querySelector('button[type="submit"]');
            let originalBtnHtml = '';
            if (submitBtn) {
                originalBtnHtml = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando fotos...';
            }

            // Show a Toast immediately and begin background operation
            showToast("Procesando fotos y registrando bitácora...", "info");

            try {
                // Compress and encode selected images locally
                const localImages = [];
                for (const file of this.selectedFiles) {
                    let fileToUpload = file;
                    try {
                        fileToUpload = await this.compressImage(file);
                    } catch (compressErr) {
                        console.warn("Fallo al comprimir, subiendo original", compressErr);
                    }
                    const base64 = await GoogleAPI.fileToBase64(fileToUpload);
                    localImages.push({
                        base64,
                        name: file.name,
                        type: file.type
                    });
                }

                const reportId = `REP_${Date.now()}`;
                const reportDateVal = document.getElementById('report-date').value;
                const nowTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
                const formattedDate = `${reportDateVal} ${nowTime}`;

                // Collaborators metadata
                const selectedCollabs = Array.from(container.querySelectorAll('input.report-collab-chk:checked')).map(cb => cb.value);
                let collabMeta = '';
                if (selectedCollabs.length > 0) {
                    collabMeta = `[Colaboradores: ${selectedCollabs.join(', ')}] `;
                }

                let reportDesc = collabMeta + document.getElementById('report-desc').value;

                // Resolve Ciclo_ID for the report and selected tinas
                let reportCicloId = '';
                if (reportCat === 'Alimentación' && selectedTinas.length > 0) {
                    const firstTinaId = selectedTinas[0];
                    const trayObj = camas.find(c => c[0] === firstTinaId);
                    if (trayObj && trayObj[3]) {
                        reportCicloId = trayObj[3].toString().trim();
                    }
                }

                // 2. Prepare Report Row values (including Ciclo_ID as 7th column)
                const reportValues = [[
                    reportId,
                    formattedDate,
                    reportDesc,
                    '', // Resolved in background when uploading base64
                    reportCat,
                    GoogleAPI.user.name,
                    reportCicloId
                ]];

                const payload = {
                    reportId,
                    formattedDate,
                    reportDateVal,
                    reportDesc,
                    reportCat,
                    username: GoogleAPI.user.name,
                    localImages,
                    reportValues,
                    cicloId: reportCicloId, // Pass at top level for append payload injection
                    isAlimentacion: reportCat === 'Alimentación',
                    alimentacion: reportCat === 'Alimentación' ? {
                        selectedTinas: selectedTinas.map(tinaId => {
                            const trayObj = camas.find(c => c[0] === tinaId);
                            const tinaCiclo = (trayObj && trayObj[3]) ? trayObj[3].toString().trim() : 'Ciclo Legacy';
                            return { id: tinaId, cicloId: tinaCiclo };
                        }),
                        feedUnit: document.getElementById('report-feed-unit').value,
                        insumo,
                        totalQty
                    } : null
                };

                // Clear/Reset form immediately
                formReport.reset();
                this.selectedFiles = [];
                previewContainer.innerHTML = '';
                localStorage.removeItem('bsf_report_draft');
                
                // Hide dynamic area again if category changes
                feedingReportDetails.classList.add('hidden');
                document.getElementById('report-feed-insumo').required = false;
                document.getElementById('report-feed-qty').required = false;
                container.querySelectorAll('.collab-select-card[data-prefix="report"]').forEach(c => c.classList.remove('selected'));
                container.querySelectorAll('.tina-select-card[data-prefix="report"]').forEach(c => c.classList.remove('selected'));
                
                // Restore submit button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;
                }

                // Redirect user immediately
                window.location.hash = '#reports-list';

                // Dispatch background submission
                executeBackgroundSubmit('add-report', payload, () => submitReportData(payload));

            } catch (err) {
                console.error("Report submit error", err);
                showToast(`Error al procesar formulario: ${err.message}`, "error");
                // Restore submit button on error
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;
                }
            }
        });
    }

        // FORM SUBMIT 2: FINANCES (Expenses)
        const addFinanceForm = document.getElementById('add-finance-form');
        if (addFinanceForm) {
            addFinanceForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (GoogleAPI.user.role === 'Observador') {
                    alert("Acceso denegado: El rol 'Observador' no puede ingresar datos.");
                    return;
                }

                try {
                    const finId = `FIN_${Date.now()}`;
                    const finType = document.getElementById('finance-type').value;
                    const finAmount = parseFloat(document.getElementById('finance-amount').value);
                    const finCat = document.getElementById('finance-category').value.trim();
                    const finDate = document.getElementById('finance-date').value;

                    // Collaborators metadata
                    const selectedCollabs = Array.from(container.querySelectorAll('input.finance-collab-chk:checked')).map(cb => cb.value);
                    let collabMeta = '';
                    if (selectedCollabs.length > 0) {
                        collabMeta = `[Colaboradores: ${selectedCollabs.join(', ')}] `;
                    }

                    let finDesc = collabMeta + document.getElementById('finance-desc').value.trim();

                    const financeValues = [[
                        finId,
                        'MANUAL',
                        finDate,
                        finType,
                        finCat,
                        finAmount,
                        finDesc
                    ]];

                    const payload = { financeValues };

                    // Clear/Reset immediately
                    addFinanceForm.reset();
                    const financeDateEl = document.getElementById('finance-date');
                    if (financeDateEl) financeDateEl.value = todayStr;
                    container.querySelectorAll('.collab-select-card[data-prefix="finance"]').forEach(c => c.classList.remove('selected'));
                    
                    // Redirect immediately
                    window.location.hash = '#finances';

                    // Dispatch background submission
                    executeBackgroundSubmit('add-finance', payload, () => GoogleAPI.appendSheetData('Finanzas!A:G', financeValues));

                } catch (err) {
                    console.error("Finance submit error", err);
                    showToast(`Error al procesar gasto: ${err.message}`, "error");
                }
            });
        }

        // FORM SUBMIT 3: SUPPLIES (Warehouse)
        const addSupplyForm = document.getElementById('add-supply-form');
        if (addSupplyForm) {
            addSupplyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (GoogleAPI.user.role === 'Observador') {
                    alert("Acceso denegado: El rol 'Observador' no puede ingresar datos.");
                    return;
                }

                const supplyAction = document.getElementById('supply-action').value;
                let selectedTinas = [];
                if (supplyAction === 'Utilización') {
                    const selectedChks = container.querySelectorAll('input.supply-tina-chk:checked');
                    selectedTinas = Array.from(selectedChks).map(chk => chk.value);
                }

                try {
                    const supId = `SUP_${Date.now()}`;
                    const supplyCategory = document.getElementById('supply-category').value;
                    const supplyName = document.getElementById('supply-name').value.trim();
                    const supplyQty = parseFloat(document.getElementById('supply-qty').value);
                    const supplyUnit = document.getElementById('supply-unit').value;
                    const supplyDate = document.getElementById('supply-date').value;
                    const supplyCost = parseFloat(document.getElementById('supply-cost').value) || 0;
                    const supplySize = document.getElementById('supply-size').value;

                    // Validation to prevent negative stock on Utilización (only online)
                    if (supplyAction === 'Utilización' && navigator.onLine) {
                        try {
                            const supplyRows = await GoogleAPI.getSheetData('Insumos!A:J');
                            let currentStock = 0;
                            let unit = '';
                            supplyRows.slice(1).forEach(row => {
                                const name = row[3] ? row[3].trim().toLowerCase() : '';
                                if (name === supplyName.toLowerCase()) {
                                    const act = row[4];
                                    const qty = parseFloat(row[5]) || 0;
                                    unit = row[6] || 'kg';
                                    if (act === 'Adición') currentStock += qty;
                                    else if (act === 'Utilización') currentStock -= qty;
                                }
                            });

                            if (supplyQty > currentStock) {
                                alert(`Error: No hay suficiente stock en bodega para esta utilización.\nStock actual de "${supplyName}": ${currentStock.toFixed(2)} ${unit}.\nCantidad solicitada: ${supplyQty.toFixed(2)} ${unit}.`);
                                return;
                            }
                        } catch (stockErr) {
                            console.warn("Fallo al verificar stock en bodega, ignorando check offline:", stockErr);
                        }
                    }

                    // Collaborators metadata
                    const selectedCollabs = Array.from(container.querySelectorAll('input.supply-collab-chk:checked')).map(cb => cb.value);
                    let collabMeta = '';
                    if (selectedCollabs.length > 0) {
                        collabMeta = `[Colaboradores: ${selectedCollabs.join(', ')}] `;
                    }

                    const supplyValues = [[
                        supId,
                        'MANUAL',
                        supplyDate,
                        supplyName,
                        supplyAction,
                        supplyQty,
                        supplyUnit,
                        supplyCost,
                        supplyCategory,
                        supplySize
                    ]];

                    // If Action is Utilización and N > 0 tinas selected, write feeding logs
                    let feedingRows = [];
                    if (supplyAction === 'Utilización' && selectedTinas.length > 0) {
                        const qtyPerTina = supplyQty / selectedTinas.length;

                        let nextOrder = 1;
                        if (navigator.onLine) {
                            try {
                                const allLogs = await GoogleAPI.getFeedingLogs();
                                const todayLogs = allLogs.slice(1).filter(log => log[2] && log[2].startsWith(supplyDate));
                                nextOrder = todayLogs.length + 1;
                            } catch (e) {
                                console.warn("No se pudo consultar logs de alimentación", e);
                            }
                        }

                        const nowTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
                        const formattedDate = `${supplyDate} ${nowTime}`;

                        feedingRows = selectedTinas.map(tinaId => {
                            const trayObj = camas.find(c => c[0] === tinaId);
                            const tinaCiclo = (trayObj && trayObj[3]) ? trayObj[3].toString().trim() : 'Ciclo Legacy';
                            const row = [
                                `FEED_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                                tinaId,
                                formattedDate,
                                nextOrder,
                                supplyName,
                                qtyPerTina,
                                GoogleAPI.user.name,
                                `Alimentación manual vía Movimiento de Insumo ${supId} (${supplyUnit}) ${collabMeta}`,
                                tinaCiclo // 9th column
                            ];
                            nextOrder++;
                            return row;
                        });
                    }

                    // If supply has cost, auto-generate a financial record of Gasto
                    let financeValues = [];
                    if (supplyCost > 0) {
                        let finDesc = `${collabMeta}Compra auto-registrada de ${supplyQty} ${supplyUnit} de ${supplyName} (${supplySize})`;
                        const finId = `FIN_${Date.now()}_SUP`;
                        financeValues = [[
                            finId,
                            'MANUAL',
                            supplyDate,
                            'Gasto',
                            'Operativo: Compra de Insumos',
                            supplyCost,
                            finDesc
                        ]];
                    }

                    const payload = {
                        supplyValues,
                        feedingRows,
                        financeValues
                    };

                    // Clear/Reset immediately
                    addSupplyForm.reset();
                    const supplyDateEl = document.getElementById('supply-date');
                    if (supplyDateEl) supplyDateEl.value = todayStr;
                    container.querySelectorAll('.collab-select-card[data-prefix="supply"]').forEach(c => c.classList.remove('selected'));
                    container.querySelectorAll('.tina-select-card[data-prefix="supply"]').forEach(c => c.classList.remove('selected'));
                    
                    // Show dynamic area again since action resets to "Utilización"
                    if (supplyFeedingDetails) supplyFeedingDetails.classList.remove('hidden');

                    // Redirect immediately
                    window.location.hash = '#supplies';

                    // Dispatch background submission
                    executeBackgroundSubmit('add-supply', payload, () => submitSupplyData(payload));

                } catch (err) {
                    console.error("Supply submit error", err);
                    showToast(`Error al registrar bodega: ${err.message}`, "error");
                }
            });
        }

        // FORM SUBMIT 4: MACHINERY (Tools)
        const addMachineryForm = document.getElementById('add-machinery-form');
        if (addMachineryForm) {
            addMachineryForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (GoogleAPI.user.role === 'Observador') {
                    alert("Acceso denegado: El rol 'Observador' no puede ingresar datos.");
                    return;
                }

                try {
                    const name = document.getElementById('machinery-name').value.trim();
                    const date = document.getElementById('machinery-date').value;
                    const cost = parseFloat(document.getElementById('machinery-cost').value) || 0;
                    const status = document.getElementById('machinery-status').value;
                    const qty = document.getElementById('machinery-qty').value;
                    const size = document.getElementById('machinery-size').value;

                    // Collaborators metadata
                    const selectedCollabs = Array.from(container.querySelectorAll('input.machinery-collab-chk:checked')).map(cb => cb.value);
                    let collabMeta = '';
                    if (selectedCollabs.length > 0) {
                        collabMeta = `[Colaboradores: ${selectedCollabs.join(', ')}] `;
                    }

                    const desc = `${collabMeta} Cant: ${qty}, Tamaño: ${size} | ${document.getElementById('machinery-desc').value.trim()}`;

                    const idEquipo = `EQP-${Date.now()}`;
                    const row = [idEquipo, name, date, cost.toString(), status, desc, qty.toString(), size];

                    let financeValues = [];
                    if (cost > 0) {
                        const txRow = [
                            `TX_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                            'MANUAL',
                            date,
                            'Gasto',
                            'Activos: Compra de Maquinaria',
                            cost.toString(),
                            `Compra de activo: ${name}`
                        ];
                        financeValues = [txRow];
                    }

                    const payload = { row, financeValues };

                    // Clear/Reset immediately
                    addMachineryForm.reset();
                    document.getElementById('machinery-qty').value = '1';
                    document.getElementById('machinery-date').value = todayStr;
                    container.querySelectorAll('.collab-select-card[data-prefix="machinery"]').forEach(c => c.classList.remove('selected'));

                    // Redirect immediately
                    window.location.hash = '#supplies';

                    // Dispatch background submission
                    executeBackgroundSubmit('add-machinery', payload, () => submitMachineryData(payload));

                } catch (err) {
                    console.error("Machinery submit error", err);
                    showToast(`Error al registrar herramienta: ${err.message}`, "error");
                }
            });
        }

        // FORM SUBMIT 5: SALES / REVENUES (Ingresos)
        const addSaleForm = document.getElementById('add-sale-form');
        if (addSaleForm) {
            addSaleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (GoogleAPI.user.role === 'Observador') {
                    alert("Acceso denegado: El rol 'Observador' no puede ingresar datos.");
                    return;
                }

                try {
                    const product = saleProduct.value;
                    const qty = parseFloat(saleQty.value) || 0;
                    const price = parseFloat(salePrice.value) || 0;
                    const client = document.getElementById('sale-client').value.trim();
                    const date = document.getElementById('sale-date').value;
                    const totalAmount = qty * price;

                    // Collaborators metadata
                    const selectedCollabs = Array.from(container.querySelectorAll('input.sale-collab-chk:checked')).map(cb => cb.value);
                    let collabMeta = '';
                    if (selectedCollabs.length > 0) {
                        collabMeta = `[Colaboradores: ${selectedCollabs.join(', ')}] `;
                    }

                    let txDesc = `${collabMeta}Venta a ${client} (${qty} x $${price})`;

                    const txRow = [
                        `TX_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                        'MANUAL',
                        date,
                        'Ingreso',
                        `Venta: ${product}`,
                        totalAmount.toString(),
                        txDesc
                    ];

                    const payload = { txRow };

                    // Reset immediately
                    addSaleForm.reset();
                    document.getElementById('sale-date').value = todayStr;
                    saleSummary.classList.add('hidden');
                    container.querySelectorAll('.collab-select-card[data-prefix="sale"]').forEach(c => c.classList.remove('selected'));

                    // Redirect immediately
                    window.location.hash = '#finances';

                    // Dispatch background submission
                    executeBackgroundSubmit('add-sale', payload, () => GoogleAPI.appendSheetData('Finanzas!A:G', [payload.txRow]));

                } catch (err) {
                    console.error("Sale submit error", err);
                    showToast(`Error al registrar venta: ${err.message}`, "error");
                }
            });
        }

        // FORM SUBMIT 6: PARTNER CONTRIBUTIONS & CASH INFLOWS (Aportes / Capital)
        const addCapitalForm = document.getElementById('add-capital-form');
        if (addCapitalForm) {
            addCapitalForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (GoogleAPI.user.role !== 'Administrador') {
                    alert("Acceso denegado: Solo el Administrador puede ingresar aportes de socios o efectivo general.");
                    return;
                }

                try {
                    const category = document.getElementById('capital-category').value;
                    const amount = parseFloat(document.getElementById('capital-amount').value);
                    const partner = document.getElementById('capital-partner').value.trim();
                    const date = document.getElementById('capital-date').value;
                    const descInput = document.getElementById('capital-desc').value.trim();
                    
                    const selectedCollabChks = container.querySelectorAll('input.capital-collab-chk:checked');
                    const collabs = Array.from(selectedCollabChks).map(chk => chk.value);
                    const collabsStr = collabs.length > 0 ? ` (Colaboradores: ${collabs.join(', ')})` : '';
                    const fullDesc = `${category} - Origen: ${partner} | ${descInput}${collabsStr}`;

                    const txRow = [
                        `FIN_CAP_${Date.now()}`,
                        'Manual',
                        date,
                        'Ingreso',
                        category,
                        amount.toString(),
                        fullDesc
                    ];

                    const payload = { txRow };

                    // Reset form and show visual cues immediately
                    addCapitalForm.reset();
                    document.getElementById('capital-date').value = todayStr;
                    container.querySelectorAll('.collab-select-card[data-prefix="capital"]').forEach(c => c.classList.remove('selected'));

                    // Redirect immediately
                    window.location.hash = '#finances';

                    // Dispatch background submission
                    executeBackgroundSubmit('add-capital', payload, () => GoogleAPI.appendSheetData('Finanzas!A:G', [payload.txRow]));

                } catch (err) {
                    console.error("Capital submit error", err);
                    showToast(`Error al registrar aporte de capital: ${err.message}`, "error");
                }
            });
        }
    },

    /**
     * Compress an image file using HTML5 Canvas
     */
    compressImage(file, maxWidth = 1280, maxHeight = 720, quality = 0.75) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error("Canvas compression failed"));
                            return;
                        }
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    }, 'image/jpeg', quality);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    },

    /**
     * File selection helper to add files and generate preview
     */
    handleFileSelection(files, previewContainer) {
        Array.from(files).forEach(file => {
            // Check file is image
            if (!file.type.startsWith('image/')) return;
            
            this.selectedFiles.push(file);
            const index = this.selectedFiles.length - 1;

            const card = document.createElement('div');
            card.className = 'preview-image-card';
            card.dataset.index = index;

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            card.appendChild(img);

            const btn = document.createElement('button');
            btn.className = 'btn-remove-preview';
            btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectedFiles.splice(index, 1);
                card.remove();
                // Update indexes
                Array.from(previewContainer.children).forEach((child, i) => {
                    child.dataset.index = i;
                });
            });
            card.appendChild(btn);

            previewContainer.appendChild(card);
        });
    },

    /**
     * Render 3. Reports List (Historial)
     */
    async renderReportsList(containerId, showLoading, hideLoading) {
        const container = document.getElementById(containerId);
        container.innerHTML = `<div class="text-center py-5"><div class="bio-spinner"></div><p>Cargando bitácora diaria...</p></div>`;

        try {
            const reportRows = await GoogleAPI.getSheetData('Reportes!A:G');
            const financeRows = await GoogleAPI.getSheetData('Finanzas!A:G');
            const supplyRows = await GoogleAPI.getSheetData('Insumos!A:J');

            const reports = reportRows.slice(1);
            const finances = financeRows.slice(1);
            const supplies = supplyRows.slice(1);

            if (reports.length === 0) {
                container.innerHTML = `
                    <div class="card text-center p-5 slide-in-view">
                        <i class="fa-solid fa-folder-open text-secondary" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <h3>Sin reportes registrados</h3>
                        <p class="mb-3">Aún no se ha cargado ninguna bitácora diaria en el sistema.</p>
                        <button onclick="window.location.hash='#add-report'" class="btn btn-primary"><i class="fa-solid fa-circle-plus"></i> Añadir Primer Reporte</button>
                    </div>
                `;
                return;
            }

            // Maps for relations
            const financeMap = {};
            finances.forEach(row => {
                const repId = row[1];
                if (repId) financeMap[repId] = row;
            });

            const supplyMap = {};
            supplies.forEach(row => {
                const repId = row[1];
                if (repId) supplyMap[repId] = row;
            });

            // Sort reports chronologically desc (newest first)
            reports.sort((a, b) => new Date(b[1]) - new Date(a[1]));

            // Render Timeline skeleton
            container.innerHTML = `
                <div class="reports-timeline slide-in-view">
                    ${reports.map(row => {
                        const id = row[0];
                        const date = row[1];
                        const desc = row[2];
                        const photos = row[3] ? row[3].split(',') : [];
                        const cat = row[4] || 'General';
                        const user = row[5] || 'Sistema';

                        const relatedFinance = financeMap[id];
                        const relatedSupply = supplyMap[id];

                        return `
                            <div class="card timeline-card" id="timeline-card-${id}">
                                <div class="timeline-card-header">
                                    <div class="timeline-meta">
                                        <span class="timeline-date">${date}</span>
                                        <span class="timeline-user">Registrado por: <strong>${user}</strong></span>
                                    </div>
                                    <div class="timeline-actions">
                                        <span class="timeline-category">${cat}</span>
                                        ${(GoogleAPI.user.role === 'Socio' || GoogleAPI.user.role === 'Administrador') ? `
                                            <button class="btn btn-outline btn-sm text-danger btn-delete-report" data-id="${id}" title="Eliminar reporte">
                                                <i class="fa-solid fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                                
                                <div class="timeline-body">
                                    <p>${desc}</p>
                                </div>

                                ${photos.length > 0 ? `
                                    <div class="timeline-images-grid">
                                        ${photos.map(pId => `
                                            <img class="timeline-img" 
                                                 src="https://drive.google.com/thumbnail?id=${pId}&sz=w300" 
                                                 data-full="https://drive.google.com/uc?id=${pId}" 
                                                 alt="Reporte BSF"
                                                 onerror="this.src='https://placehold.co/150x110?text=Cargando+Drive...'"
                                            >
                                        `).join('')}
                                    </div>
                                ` : ''}

                                ${(relatedFinance || relatedSupply) ? `
                                    <div class="timeline-extra">
                                        ${relatedFinance ? `
                                            <div class="timeline-extra-item">
                                                <i class="fa-solid fa-scale-balanced ${relatedFinance[3] === 'Ingreso' ? 'text-success' : 'text-danger'}"></i>
                                                <span>${relatedFinance[3]}: <strong>$${parseFloat(relatedFinance[5]).toFixed(2)}</strong> (${relatedFinance[4]})</span>
                                            </div>
                                        ` : ''}
                                        ${relatedSupply ? `
                                            <div class="timeline-extra-item">
                                                <i class="fa-solid fa-boxes-stacked text-warning"></i>
                                                <span>${relatedSupply[4]} Insumo: <strong>${relatedSupply[3]}</strong> (${parseFloat(relatedSupply[5])} ${relatedSupply[6]}${relatedSupply[9] ? ` - Presentación: ${relatedSupply[9]}` : ''})</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Wire image lightboxes
            const images = container.querySelectorAll('.timeline-img');
            images.forEach(img => {
                img.addEventListener('click', () => {
                    const fullSrc = img.getAttribute('data-full');
                    this.showLightbox(fullSrc);
                });
            });

            // Wire delete buttons (Admins only)
            const deleteButtons = container.querySelectorAll('.btn-delete-report');
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const repId = btn.getAttribute('data-id');
                    
                    this.showDeleteReasonModal(async (reason) => {
                        showLoading("Eliminando registro y respaldando auditoría...");
                        try {
                            // 1. Fetch data from sheets to find original content
                            const reportRows = await GoogleAPI.getSheetData('Reportes!A:G');
                            const financeRows = await GoogleAPI.getSheetData('Finanzas!A:G');
                            const supplyRows = await GoogleAPI.getSheetData('Insumos!A:J');
                            const feedingRows = await GoogleAPI.getSheetData('Registro_Alimentacion!A:I');

                            // Find report row index
                            const repIdx = reportRows.findIndex(row => row[0] === repId);
                            if (repIdx !== -1) {
                                const repRow = reportRows[repIdx];
                                const repDetail = `Fecha: ${repRow[1]} | Categoria: ${repRow[4]} | Descripcion: ${repRow[2]} | Fotos: ${repRow[3] || 'Ninguna'}`;
                                
                                // Back up report deletion
                                await GoogleAPI.logDeletion('Reportes', repId, repRow[1], repDetail, reason);
                                
                                // Clear report row from Sheet (rowNumber is idx + 1)
                                await GoogleAPI.clearSheetRange(`Reportes!A${repIdx + 1}:G${repIdx + 1}`);
                            }

                            // Find and delete any linked finance transactions
                            let finIdx;
                            while ((finIdx = financeRows.findIndex(row => row[1] === repId)) !== -1) {
                                const finRow = financeRows[finIdx];
                                const finDetail = `Fecha: ${finRow[2]} | Tipo: ${finRow[3]} | Categoria: ${finRow[4]} | Monto: $${finRow[5]} | Descripcion: ${finRow[6]}`;
                                
                                // Back up finance deletion
                                await GoogleAPI.logDeletion('Finanzas', finRow[0], finRow[2], finDetail, reason);
                                
                                // Clear finance row from Sheet
                                await GoogleAPI.clearSheetRange(`Finanzas!A${finIdx + 1}:G${finIdx + 1}`);
                                
                                // Remove from local memory so while loop progresses if multiple exist
                                financeRows[finIdx] = []; 
                            }

                            // Find and delete any linked supply movements
                            let supIdx;
                            while ((supIdx = supplyRows.findIndex(row => row[1] === repId)) !== -1) {
                                const supRow = supplyRows[supIdx];
                                const supDetail = `Fecha: ${supRow[2]} | Insumo: ${supRow[3]} | Accion: ${supRow[4]} | Cantidad: ${supRow[5]} ${supRow[6]} | Costo: $${supRow[7]}`;
                                
                                // Back up supply deletion
                                await GoogleAPI.logDeletion('Insumos', supRow[0], supRow[2], supDetail, reason);
                                
                                // Clear supply row from Sheet
                                await GoogleAPI.clearSheetRange(`Insumos!A${supIdx + 1}:J${supIdx + 1}`);
                                
                                // Remove from local memory
                                supplyRows[supIdx] = [];
                            }

                            // Find and delete any linked feeding logs in Registro_Alimentacion (by searching repId in Observations)
                            let feedIdx;
                            while ((feedIdx = feedingRows.findIndex(row => row[7] && row[7].includes(repId))) !== -1) {
                                const feedRow = feedingRows[feedIdx];
                                const feedUnit = getFeedingUnit(feedRow[7]);
                                const feedDetail = `Tina: ${feedRow[1]} | Fecha: ${feedRow[2]} | Insumo: ${feedRow[4]} | Cantidad: ${feedRow[5]}${feedUnit} | Obs: ${feedRow[7]}`;
                                
                                // Back up feeding deletion
                                await GoogleAPI.logDeletion('Alimentacion', feedRow[0], feedRow[2], feedDetail, reason);
                                
                                // Clear row from Sheet
                                await GoogleAPI.clearSheetRange(`Registro_Alimentacion!A${feedIdx + 1}:H${feedIdx + 1}`);
                                
                                // Remove from local memory
                                feedingRows[feedIdx] = [];
                            }

                            hideLoading();
                            alert("Reporte y sus datos asociados eliminados del sistema activo. El registro de auditoría fue guardado.");
                            this.renderReportsList(containerId, showLoading, hideLoading); // Re-render
                        } catch (deleteErr) {
                            console.error(deleteErr);
                            hideLoading();
                            alert(`Error al intentar borrar el registro: ${deleteErr.message}`);
                        }
                    }, () => {
                        // On cancel, do nothing
                    });
                });
            });

        } catch (err) {
            console.error("Timeline render error", err);
            container.innerHTML = `<div class="card p-5 text-center"><p class="text-danger">Error al cargar bitácora: ${err.message}</p></div>`;
        }
    },

    /**
     * Delete row matching specific column key (Client-side helper)
     */
    async deleteRowByKeyValue(sheetName, colIndex, value) {
        const rows = await GoogleAPI.getSheetData(`${sheetName}!A:H`);
        const idx = rows.findIndex(row => row[colIndex] === value);
        
        if (idx !== -1) {
            // Excel rows are 1-indexed. Plus we clear the range to "delete".
            const rowNumber = idx + 1;
            await GoogleAPI.clearSheetRange(`${sheetName}!A${rowNumber}:H${rowNumber}`);
        }
    },

    /**
     * Show premium Glassmorphic modal to capture reason for deletion
     */
    showDeleteReasonModal(onConfirm, onCancel) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width: 500px;">
                <div class="modal-header" style="background-color: var(--danger); color: white;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h3>Confirmar Eliminación de Registro</h3>
                </div>
                <div class="modal-body" style="padding: 1.25rem;">
                    <p class="mb-3">Esta acción eliminará físicamente el reporte y todos sus datos relacionados (finanzas, insumos) de forma irreversible.</p>
                    <form id="delete-reason-form">
                        <div class="form-group">
                            <label class="form-label" for="delete-reason-input">Motivo de la Eliminación (Obligatorio)</label>
                            <textarea id="delete-reason-input" class="form-control" placeholder="Explica detalladamente por qué estás eliminando este registro (ej. registro duplicado, error en los montos)..." required style="min-height: 80px;"></textarea>
                        </div>
                        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0; border: none; background: transparent;">
                            <button type="button" id="btn-delete-cancel" class="btn btn-secondary">Cancelar</button>
                            <button type="submit" class="btn btn-danger">Eliminar Definitivamente</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const cancelBtn = modal.querySelector('#btn-delete-cancel');
        const form = modal.querySelector('#delete-reason-form');

        const close = () => {
            modal.remove();
        };

        cancelBtn.addEventListener('click', () => {
            close();
            onCancel();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const reason = modal.querySelector('#delete-reason-input').value.trim();
            close();
            onConfirm(reason);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                close();
                onCancel();
            }
        });
    },

    /**
     * Show zoomable lightbox overlay for high-res images
     */
    showLightbox(src) {
        const overlay = document.createElement('div');
        overlay.className = 'lightbox';
        overlay.innerHTML = `
            <button class="lightbox-close"><i class="fa-solid fa-xmark"></i></button>
            <img class="lightbox-content" src="${src}" alt="Zoom Image">
        `;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('.lightbox-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target.tagName !== 'IMG') close();
        });
    },

    /**
     * Render 4. Finances Page (Contabilidad)
     */
    async renderFinances(containerId, showLoading, hideLoading) {
        const container = document.getElementById(containerId);
        container.innerHTML = `<div class="text-center py-5"><div class="bio-spinner"></div><p>Cargando registros contables...</p></div>`;

        try {
            const financeRows = await GoogleAPI.getSheetData('Finanzas!A:G');
            const finances = financeRows.slice(1).filter(row => row[0]); // Filter empty/cleared rows

            let totalIncome = 0;
            let totalExpenses = 0;
            finances.forEach(row => {
                const type = row[3];
                const val = parseFloat(row[5]) || 0;
                if (type === 'Ingreso') totalIncome += val;
                else if (type === 'Gasto') totalExpenses += val;
            });
            const balance = totalIncome - totalExpenses;

            container.innerHTML = `
                <div class="slide-in-view">
                    <!-- Balance Summary Bar -->
                    <div class="dashboard-grid">
                        <div class="card kpi-card">
                            <div>
                                <h3>Total Ingresos</h3>
                                <div class="kpi-value text-success">$${totalIncome.toFixed(2)}</div>
                            </div>
                            <div class="kpi-icon"><i class="fa-solid fa-circle-arrow-up text-success"></i></div>
                        </div>
                        <div class="card kpi-card">
                            <div>
                                <h3>Total Gastos</h3>
                                <div class="kpi-value text-danger">$${totalExpenses.toFixed(2)}</div>
                            </div>
                            <div class="kpi-icon"><i class="fa-solid fa-circle-arrow-down text-danger"></i></div>
                        </div>
                        <div class="card kpi-card">
                            <div>
                                <h3>Saldo de Caja Neto</h3>
                                <div class="kpi-value ${balance >= 0 ? 'text-success' : 'text-danger'}">$${balance.toFixed(2)}</div>
                            </div>
                            <div class="kpi-icon blue"><i class="fa-solid fa-wallet"></i></div>
                        </div>
                    </div>

                    <!-- Ledger Table -->
                    <div class="card mt-3">
                        <h3 class="mb-3"><i class="fa-solid fa-list-check text-success"></i> Registro Contable Detallado</h3>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Tipo</th>
                                        <th>Categoría</th>
                                        <th>Monto ($)</th>
                                        <th>Detalle / Descripción</th>
                                        <th>Reporte Asoc.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${finances.length === 0 ? `
                                        <tr>
                                            <td colspan="6" class="text-center py-4">No se han registrado transacciones financieras aún.</td>
                                        </tr>
                                    ` : finances.map(row => `
                                        <tr>
                                            <td><strong>${row[2]}</strong></td>
                                            <td><span class="badge ${row[3] === 'Ingreso' ? 'badge-success' : 'badge-danger'}">${row[3]}</span></td>
                                            <td>${row[4]}</td>
                                            <td class="${row[3] === 'Ingreso' ? 'text-success' : 'text-danger'}"><strong>$${parseFloat(row[5]).toFixed(2)}</strong></td>
                                            <td>${row[6]}</td>
                                            <td><small class="text-secondary">${row[1] && row[1].startsWith('REP_') ? `<a href="#reports-list" style="color: var(--brand-primary); font-weight: bold; text-decoration: underline;"><i class="fa-solid fa-file-lines"></i> Ver Reporte</a>` : (row[1] || 'Manual')}</small></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error("Finances render error", err);
            container.innerHTML = `<div class="card p-5 text-center"><p class="text-danger">Error al cargar contabilidad: ${err.message}</p></div>`;
        }
    },

    /**
     * Render 5. Supplies Page (Insumos/Stock)
     */
    async renderSupplies(containerId, showLoading, hideLoading) {
        const container = document.getElementById(containerId);
        container.innerHTML = `<div class="text-center py-5"><div class="bio-spinner"></div><p>Cargando inventario y activos...</p></div>`;

        try {
            const supplyRows = await GoogleAPI.getSheetData('Insumos!A:J');
            const machineryRows = await GoogleAPI.getMaquinaria();

            const supplies = supplyRows.slice(1).filter(row => row[0]);
            const machinery = machineryRows.slice(1).filter(row => row[0]);

            // Consolidate inventory stocks
            const sustratos = {};
            const insumosGenerales = {};

            supplies.forEach(row => {
                const name = row[3] ? row[3].trim().toLowerCase() : '';
                const action = row[4]; // 'Adición' / 'Utilización'
                const qty = parseFloat(row[5]) || 0;
                const unit = row[6] || 'kg';
                const category = row[8] ? row[8].trim() : 'Insumo General';

                if (!name) return;

                const key = name;
                const targetDict = (category === 'Sustrato') ? sustratos : insumosGenerales;

                if (!targetDict[key]) {
                    targetDict[key] = {
                        name: row[3].trim(),
                        stock: 0,
                        unit: unit,
                        additions: 0,
                        usages: 0
                    };
                }

                if (action === 'Adición') {
                    targetDict[key].stock += qty;
                    targetDict[key].additions += qty;
                } else if (action === 'Utilización') {
                    targetDict[key].stock -= qty;
                    targetDict[key].usages += qty;
                }
            });

            // Calculate total machinery investment
            let totalInvestment = 0;
            machinery.forEach(m => {
                const cost = parseFloat(m[3]) || 0;
                totalInvestment += cost;
            });

            // Determine today's local date
            const now = new Date();
            const offset = now.getTimezoneOffset();
            const localNow = new Date(now.getTime() - (offset*60*1000));
            const todayStr = localNow.toISOString().substring(0, 10);

            container.innerHTML = `
                <div class="slide-in-view">
                    <!-- Main Tabs -->
                    <div class="filter-tabs mb-3" id="supplies-main-tabs" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="filter-tab active" data-tab="section-stock" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-boxes-stacked"></i> Insumos y Sustratos</span>
                        <span class="filter-tab" data-tab="section-machinery" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-screwdriver-wrench"></i> Maquinaria y Equipos</span>
                    </div>

                    <div id="supplies-tabs-content">
                        <!-- TAB 1: CONSUMABLES AND SUBSTRATES -->
                        <div id="stock-tab-section">
                            ${GoogleAPI.user.role !== 'Observador' ? `
                                <div class="d-flex justify-content-end mb-3">
                                    <button id="btn-quick-adjust-supply" class="btn btn-primary">
                                        <i class="fa-solid fa-dolly"></i> Movimiento de Stock
                                    </button>
                                </div>
                            ` : ''}
                            <!-- Sustratos (Alimentación) -->
                            <div class="card mb-4">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h3><i class="fa-solid fa-wheat-awn text-success"></i> 1. Sustratos (Alimentación y Cría)</h3>
                                </div>
                                <div class="table-responsive">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Sustrato</th>
                                                <th>Stock Disponible</th>
                                                <th>Estado</th>
                                                <th>Total Ingresos (+)</th>
                                                <th>Total Consumos (-)</th>
                                                <th>Unidad</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${Object.keys(sustratos).length === 0 ? `
                                                <tr>
                                                    <td colspan="6" class="text-center py-4 text-secondary">No hay sustratos registrados en el inventario.</td>
                                                </tr>
                                            ` : Object.keys(sustratos).map(k => {
                                                const item = sustratos[k];
                                                let statusBadge = '<span class="badge badge-success">Saludable</span>';
                                                if (item.stock <= 5) statusBadge = '<span class="badge badge-danger">Crítico</span>';
                                                else if (item.stock <= 15) statusBadge = '<span class="badge badge-warning">Bajo</span>';
                                                
                                                return `
                                                    <tr>
                                                        <td><strong>${item.name}</strong></td>
                                                        <td class="${item.stock <= 5 ? 'text-danger font-weight-bold' : (item.stock <= 15 ? 'text-warning' : 'text-success')}">
                                                            <strong>${item.stock.toFixed(2)}</strong>
                                                        </td>
                                                        <td>${statusBadge}</td>
                                                        <td>+ ${item.additions.toFixed(1)}</td>
                                                        <td>- ${item.usages.toFixed(1)}</td>
                                                        <td><small>${item.unit}</small></td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Insumos Generales -->
                            <div class="card">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h3><i class="fa-solid fa-boxes-stacked text-success"></i> 2. Insumos Generales y Herramientas</h3>
                                </div>
                                <div class="table-responsive">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Insumo</th>
                                                <th>Stock Disponible</th>
                                                <th>Estado</th>
                                                <th>Total Adiciones (+)</th>
                                                <th>Total Consumos (-)</th>
                                                <th>Unidad</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${Object.keys(insumosGenerales).length === 0 ? `
                                                <tr>
                                                    <td colspan="6" class="text-center py-4 text-secondary">No hay insumos generales registrados.</td>
                                                </tr>
                                            ` : Object.keys(insumosGenerales).map(k => {
                                                const item = insumosGenerales[k];
                                                let statusBadge = '<span class="badge badge-success">Saludable</span>';
                                                if (item.stock <= 5) statusBadge = '<span class="badge badge-danger">Crítico</span>';
                                                else if (item.stock <= 15) statusBadge = '<span class="badge badge-warning">Bajo</span>';
                                                
                                                return `
                                                    <tr>
                                                        <td><strong>${item.name}</strong></td>
                                                        <td class="${item.stock <= 5 ? 'text-danger font-weight-bold' : (item.stock <= 15 ? 'text-warning' : 'text-success')}">
                                                            <strong>${item.stock.toFixed(2)}</strong>
                                                        </td>
                                                        <td>${statusBadge}</td>
                                                        <td>+ ${item.additions.toFixed(1)}</td>
                                                        <td>- ${item.usages.toFixed(1)}</td>
                                                        <td><small>${item.unit}</small></td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- TAB 2: MACHINERY AND ASSETS -->
                        <div id="machinery-tab-section" class="hidden">
                            <div class="card p-3 mb-4" style="background-color: var(--bg-secondary); border-left: 4px solid var(--brand-primary); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                                <div>
                                    <small class="text-secondary" style="text-transform: uppercase; font-size: 0.75rem;">Inversión Total en Activos</small>
                                    <h2 class="text-success mt-1" style="font-family: 'Outfit', sans-serif;">$${totalInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                                </div>
                                <a href="#add-report" class="btn btn-outline btn-sm ${GoogleAPI.user.role === 'Observador' ? 'hidden' : ''}">
                                    <i class="fa-solid fa-plus"></i> Registrar Nueva Maquinaria
                                </a>
                            </div>

                            <div class="card">
                                <h3 class="mb-4"><i class="fa-solid fa-screwdriver-wrench text-success"></i> Listado de Maquinaria y Equipos</h3>
                                
                                ${machinery.length === 0 ? `
                                    <div class="text-center py-5 text-secondary">
                                        <i class="fa-solid fa-industry mb-3" style="font-size: 3rem;"></i>
                                        <p>No hay maquinaria o equipos registrados en el sistema.</p>
                                        <p style="font-size: 0.85rem;" class="mt-1">Puedes darlos de alta desde la sección "Nuevo Reporte -> Registrar Maquinaria".</p>
                                    </div>
                                ` : `
                                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;" id="machinery-grid-container">
                                        ${machinery.map(m => {
                                            const id = m[0];
                                            const name = m[1];
                                            const date = m[2];
                                            const cost = parseFloat(m[3]) || 0;
                                            const status = m[4];
                                            const desc = m[5] || '';
                                            const cantidad = m[6] || '1';
                                            const tamano = m[7] || '';

                                            let statusClass = 'disponible';
                                            if (status === 'En Mantenimiento') statusClass = 'neonatos';
                                            else if (status === 'Fuera de servicio') statusClass = 'prepupa';

                                            return `
                                                <div class="cama-card" data-id="${id}" style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; min-height: 180px; gap: 0.75rem;">
                                                    <div>
                                                        <div class="d-flex justify-content-between align-items-start">
                                                            <h4 style="margin: 0; font-family: 'Outfit', sans-serif; font-size: 1.1rem; color: var(--text-primary); font-weight: bold;">${name}</h4>
                                                            <span class="cama-badge ${statusClass}">${status}</span>
                                                        </div>
                                                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;" class="mb-0">
                                                            Adquisición: <strong>${date}</strong><br>
                                                            Inversión: <strong class="text-success">$${cost.toFixed(2)}</strong><br>
                                                            Cantidad: <strong>${cantidad}</strong>${tamano ? `<br>Tamaño/Capacidad: <strong>${tamano}</strong>` : ''}
                                                        </p>
                                                        ${desc ? `<p style="font-size: 0.8rem; color: var(--text-warning); font-style: italic; margin-top: 0.5rem; line-height: 1.25;" class="mb-0"><i class="fa-solid fa-info-circle"></i> ${desc}</p>` : ''}
                                                    </div>

                                                    <div style="margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.5rem;">
                                                        <label style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0; white-space: nowrap;">Estado:</label>
                                                        <select class="form-control select-machinery-status" data-id="${id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; height: auto;" ${GoogleAPI.user.role === 'Observador' ? 'disabled' : ''}>
                                                            <option value="Operativo" ${status === 'Operativo' ? 'selected' : ''}>Operativo</option>
                                                            <option value="En Mantenimiento" ${status === 'En Mantenimiento' ? 'selected' : ''}>En Mantenimiento</option>
                                                            <option value="Fuera de servicio" ${status === 'Fuera de servicio' ? 'selected' : ''}>Fuera de servicio</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>

                    <!-- Supply movement modal overlay -->
                    <div id="supply-adjust-modal" class="modal-overlay hidden">
                        <div class="modal-card">
                            <div class="modal-header" style="background-color: var(--brand-primary); color: #090d16;">
                                <i class="fa-solid fa-dolly"></i>
                                <h3>Nuevo Movimiento de Insumo</h3>
                            </div>
                            <div class="modal-body">
                                <form id="quick-supply-form">
                                    <div class="form-group">
                                        <label class="form-label" for="m-supply-category">Categoría</label>
                                        <select id="m-supply-category" class="form-control" required>
                                            <option value="Sustrato">Sustrato</option>
                                            <option value="Insumo General">Insumo General</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label" for="m-supply-name">Insumo</label>
                                        <input type="text" id="m-supply-name" class="form-control" placeholder="Ej: Salvado de Trigo" required>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label" for="m-supply-action">Operación</label>
                                        <select id="m-supply-action" class="form-control" required>
                                            <option value="Adición">Adición (Entrada / Compra)</option>
                                            <option value="Utilización">Utilización (Consumo / Alimentar)</option>
                                        </select>
                                    </div>
                                    <div class="form-row-2">
                                        <div class="form-group">
                                            <label class="form-label" for="m-supply-qty">Cantidad</label>
                                            <input type="number" inputmode="decimal" id="m-supply-qty" class="form-control" step="0.1" required>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label" for="m-supply-unit">Unidad</label>
                                            <input type="text" id="m-supply-unit" class="form-control" list="m-supply-units-list" value="kg" required>
                                            <datalist id="m-supply-units-list">
                                                <option value="kg">
                                                <option value="baldes">
                                                <option value="sacos">
                                                <option value="L">
                                                <option value="unidades">
                                                <option value="g">
                                            </datalist>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label" for="m-supply-size">Tamaño / Presentación (Opcional)</label>
                                        <input type="text" id="m-supply-size" class="form-control" placeholder="Ej: Saco 40kg, Balde Grande">
                                    </div>
                                    <div class="modal-footer" style="padding-right: 0; padding-bottom: 0; border: none;">
                                        <button type="button" id="btn-modal-cancel" class="btn btn-secondary">Cancelar</button>
                                        <button type="submit" class="btn btn-primary">Registrar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Tab switching logic
            const tabStock = document.getElementById('stock-tab-section');
            const tabMachinery = document.getElementById('machinery-tab-section');
            const mainTabs = document.querySelectorAll('#supplies-main-tabs .filter-tab');

            mainTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    mainTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    const selectedTab = tab.getAttribute('data-tab');
                    if (selectedTab === 'section-stock') {
                        tabStock.classList.remove('hidden');
                        tabMachinery.classList.add('hidden');
                    } else {
                        tabStock.classList.add('hidden');
                        tabMachinery.classList.remove('hidden');
                    }
                });
            });

            // Machinery Status Change listener
            document.querySelectorAll('.select-machinery-status').forEach(select => {
                select.addEventListener('change', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const newStatus = e.target.value;
                    showLoading("Actualizando estado de maquinaria...");
                    try {
                        await GoogleAPI.updateMaquinariaStatus(id, newStatus);
                        hideLoading();
                        alert("Estado de maquinaria actualizado.");
                        this.renderSupplies(containerId, showLoading, hideLoading); // Re-render
                    } catch (err) {
                        console.error(err);
                        hideLoading();
                        alert(`Error al actualizar estado: ${err.message}`);
                    }
                });
            });

            // Modal logic wiring
            if (GoogleAPI.user.role !== 'Observador') {
                const modal = document.getElementById('supply-adjust-modal');
                const openBtn = document.getElementById('btn-quick-adjust-supply');
                const cancelBtn = document.getElementById('btn-modal-cancel');
                const quickForm = document.getElementById('quick-supply-form');

                openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
                cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

                quickForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    showLoading("Guardando movimiento de insumo...");
                    try {
                        const now = new Date();
                        const offset = now.getTimezoneOffset();
                        const localNow = new Date(now.getTime() - (offset*60*1000));
                        const formattedDate = localNow.toISOString().substring(0, 10);

                        const mCategory = document.getElementById('m-supply-category').value;
                        const mName = document.getElementById('m-supply-name').value.trim();
                        const mAction = document.getElementById('m-supply-action').value;
                        const mQty = parseFloat(document.getElementById('m-supply-qty').value);
                        const mUnit = document.getElementById('m-supply-unit').value;
                        const mSize = document.getElementById('m-supply-size').value.trim();

                        const rowValues = [[
                            `SUP_${Date.now()}`,
                            'MANUAL',
                            formattedDate,
                            mName,
                            mAction,
                            mQty,
                            mUnit,
                            0,
                            mCategory,
                            mSize
                        ]];

                        await GoogleAPI.appendSheetData('Insumos!A:J', rowValues);
                        try {
                            await checkAndSyncTinasOnPurchase(mName, mAction, mQty);
                        } catch (syncErr) {
                            console.error("Error in checkAndSyncTinasOnPurchase in quick modal:", syncErr);
                        }
                        modal.classList.add('hidden');
                        hideLoading();
                        alert("Movimiento de inventario guardado.");
                        this.renderSupplies(containerId, showLoading, hideLoading); // Re-render
                    } catch (err) {
                        console.error(err);
                        hideLoading();
                        alert("Error al registrar movimiento.");
                    }
                });
            }

        } catch (err) {
            console.error("Supplies render error", err);
            container.innerHTML = `<div class="card p-5 text-center"><p class="text-danger">Error al cargar insumos: ${err.message}</p></div>`;
        }
    },

    async renderFeeding(containerId, showLoading, hideLoading) {
        const container = document.getElementById(containerId);
        container.innerHTML = `<div class="text-center py-5"><div class="bio-spinner"></div><p>Cargando control de bandejas...</p></div>`;

        try {
            // 1. Fetch Camas (Tinas), Feeding Logs, and Stage Logs
            const camasRows = await GoogleAPI.getCamas();
            const feedingRows = await GoogleAPI.getFeedingLogs();
            const stagesRows = await GoogleAPI.getEtapasLogs();

            const camas = camasRows.slice(1).filter(row => row[0]); // Skip headers
            const logs = feedingRows.slice(1).filter(row => row[0]);
            const stages = stagesRows.slice(1).filter(row => row[0]);

            // Map each tray's latest stage from Registro_Etapas
            const latestStageMap = {};
            stages.forEach(log => {
                const tinaId = log[1];
                const newStage = log[4];
                latestStageMap[tinaId] = newStage;
            });

            // Extract unique active group names
            const groupsSet = new Set();
            camas.forEach(c => {
                const status = c[1];
                const group = c[2] ? c[2].trim() : '';
                if (status === 'En Servicio' && group) {
                    groupsSet.add(group);
                }
            });
            const uniqueGroups = Array.from(groupsSet).sort();

            // Determine local date string (YYYY-MM-DD)
            const now = new Date();
            const offset = now.getTimezoneOffset();
            const localNow = new Date(now.getTime() - (offset*60*1000));
            const todayStr = localNow.toISOString().substring(0, 10);

            // Filter today's feeding logs to compute bed states
            const todayLogs = logs.filter(log => log[2] && log[2].startsWith(todayStr));
            
            // Map today's logs by Bed ID
            const todayFeedMap = {};
            todayLogs.forEach(log => {
                const bedId = log[1];
                const dateTimeStr = log[2];
                const orderNum = log[3];
                const insumo = log[4];
                const qty = log[5];
                const time = dateTimeStr.split(' ')[1] ? dateTimeStr.split(' ')[1].substring(0, 5) : '';
                todayFeedMap[bedId] = { time, orderNum, insumo, qty };
            });

            const isSocioOrAdmin = (GoogleAPI.user.role === 'Socio' || GoogleAPI.user.role === 'Administrador');

            // Render Core UI Frame with Sub-tabs
            container.innerHTML = `
                <div class="slide-in-view">
                    <!-- Main sub-tabs for Control de Bandejas -->
                    <div class="filter-tabs mb-3" id="feeding-main-tabs" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="filter-tab active" data-tab="tinas-grid" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-border-all"></i> Bandejas Activas</span>
                        <span class="filter-tab" data-tab="armar-lote" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-square-plus"></i> Armar Lote</span>
                        ${isSocioOrAdmin ? `
                        <span class="filter-tab" data-tab="inventario-activos" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-boxes-stacked"></i> Inventario de Activos</span>
                        ` : ''}
                        <span class="filter-tab" data-tab="feeding-history" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-clock-rotate-left"></i> Historial de Alimentación</span>
                    </div>
                    
                    <!-- Content sections wrapper -->
                    <div id="feeding-tabs-content">
                        <!-- VISTA 3: BANDEJAS ACTIVAS -->
                        <div id="tinas-grid-section">
                            <div class="camas-filter-bar mb-3" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                                <div class="form-group mb-0" style="margin-bottom: 0; min-width: 200px; flex-grow: 1; max-width: 400px;">
                                    <input type="text" id="search-cama-input" class="form-control" placeholder="Buscar por ID o Lote... (ej. B-001)">
                                </div>
                                <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
                                    <label style="display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; margin-bottom: 0;">
                                        <input type="checkbox" id="toggle-hide-fed" style="width: 17px; height: 17px; accent-color: var(--brand-primary);">
                                        Ocultar alimentadas hoy
                                    </label>
                                </div>
                            </div>
                            <div id="camas-grid-container"></div>
                        </div>

                        <!-- VISTA 2: ARMAR LOTE -->
                        <div id="armar-lote-section" class="hidden">
                            <div class="card p-3 mb-3">
                                <h4 class="mb-3 text-success"><i class="fa-solid fa-square-plus"></i> Crear Nuevo Lote de Producción</h4>
                                <form id="form-start-batch" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end;">
                                    <div class="form-group mb-0" style="flex: 1; min-width: 200px; margin-bottom: 0;">
                                        <label class="form-label" for="batch-group-name">Nombre del Lote / Grupo</label>
                                        <input type="text" id="batch-group-name" class="form-control" placeholder="Ej: Lote A, Estante 3" required>
                                    </div>
                                    <button type="submit" class="btn btn-primary" style="height: 42px;">
                                        <i class="fa-solid fa-play"></i> Iniciar Lote con Seleccionadas
                                    </button>
                                </form>
                            </div>
                            <div class="card p-3 mb-3" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                                <div class="form-group mb-0" style="flex: 1; max-width: 300px; margin-bottom: 0;">
                                    <input type="text" id="search-disponible-input" class="form-control" placeholder="Buscar disponible por ID...">
                                </div>
                                <label style="display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; margin-bottom: 0;">
                                    <input type="checkbox" id="toggle-select-all-disponibles" style="width: 17px; height: 17px; accent-color: var(--brand-primary);">
                                    Seleccionar todas las disponibles
                                </label>
                            </div>
                            <div class="camas-grid" id="disponibles-grid-container"></div>
                        </div>

                        <!-- VISTA 1: INVENTARIO DE ACTIVOS (ADMIN) -->
                        ${isSocioOrAdmin ? `
                        <div id="inventario-activos-section" class="hidden">
                            <div class="card p-3 mb-3">
                                <h4 class="mb-3 text-success"><i class="fa-solid fa-boxes-stacked"></i> Alta Secuencial de Bandejas</h4>
                                <form id="form-manage-assets" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)) auto; gap: 1rem; align-items: flex-end;">
                                    <div class="form-group mb-0" style="margin-bottom: 0;">
                                        <label class="form-label" for="asset-prefix">Prefijo</label>
                                        <input type="text" id="asset-prefix" class="form-control" value="B-" placeholder="Ej: B-" required>
                                    </div>
                                    <div class="form-group mb-0" style="margin-bottom: 0;">
                                        <label class="form-label" for="asset-start">Inicio Secuencia</label>
                                        <input type="number" id="asset-start" class="form-control" value="1" min="1" required>
                                    </div>
                                    <div class="form-group mb-0" style="margin-bottom: 0;">
                                        <label class="form-label" for="asset-end">Fin Secuencia</label>
                                        <input type="number" id="asset-end" class="form-control" value="48" min="1" required>
                                    </div>
                                    <button type="submit" class="btn btn-primary" style="height: 42px;">
                                        <i class="fa-solid fa-plus"></i> Dar de Alta
                                    </button>
                                </form>
                            </div>
                            <div class="card">
                                <h4 class="mb-3"><i class="fa-solid fa-list"></i> Listado Total de Bandejas</h4>
                                <div class="table-responsive">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>ID Bandeja</th>
                                                <th>Estado</th>
                                                <th>Lote Actual / Grupo</th>
                                                <th>Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody id="assets-table-body"></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        <!-- SECCIÓN HISTORIAL -->
                        <div id="feeding-history-section" class="hidden">
                            <div class="card p-3 mb-3">
                                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                    <div class="filter-tabs" id="history-view-tabs" style="border: none; margin-bottom: 0; display: flex; gap: 0.5rem;">
                                        <span class="filter-tab active" data-view="all-feedings" style="cursor: pointer; padding: 0.35rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem;"><i class="fa-solid fa-list-ol"></i> Ver por Alimentaciones</span>
                                        <span class="filter-tab" data-view="by-tina" style="cursor: pointer; padding: 0.35rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem;"><i class="fa-solid fa-filter"></i> Ver por Número de Bandeja</span>
                                    </div>
                                    <div id="history-tina-selector-wrapper" class="hidden" style="display: flex; align-items: center; gap: 0.5rem;">
                                        <label for="history-tina-select" class="form-label mb-0" style="font-size: 0.85rem; margin-bottom: 0; white-space: nowrap;">Seleccionar Bandeja:</label>
                                        <select id="history-tina-select" class="form-control" style="padding: 0.35rem 0.5rem; font-size: 0.85rem; width: 180px;">
                                            <option value="">-- Seleccionar --</option>
                                            ${camas.map(c => `<option value="${c[0]}">Bandeja ${c[0]}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div id="feeding-history-list-container"></div>
                        </div>
                    </div>

                    <!-- Floating Batch Action Bar -->
                    <div id="batch-action-bar" class="batch-action-bar hidden">
                        <span class="batch-action-text" id="batch-selected-count">0 bandejas seleccionadas</span>
                        <button id="btn-batch-feed" class="btn btn-primary btn-sm">
                            <i class="fa-solid fa-seedling"></i> Alimentar Selección
                        </button>
                    </div>

                    <!-- Modals -->
                    <div id="cama-feed-modal" class="modal-overlay hidden"></div>
                    <div id="tina-detail-modal" class="modal-overlay hidden"></div>
                </div>
            `;

            // Setup Event Listeners and render initial states
            this.setupCamasControls(containerId, camas, logs, todayFeedMap, latestStageMap, showLoading, hideLoading);

        } catch (err) {
            console.error("Feeding view render error", err);
            container.innerHTML = `<div class="card p-5 text-center"><p class="text-danger">Error al cargar panel de bandejas: ${err.message}</p></div>`;
        }
    },

    setupCamasControls(containerId, camas, logs, todayFeedMap, latestStageMap, showLoading, hideLoading) {
        const gridContainer = document.getElementById('camas-grid-container');
        const searchInput = document.getElementById('search-cama-input');
        const hideFedCheckbox = document.getElementById('toggle-hide-fed');
        const batchBar = document.getElementById('batch-action-bar');
        const batchCount = document.getElementById('batch-selected-count');
        const batchFeedBtn = document.getElementById('btn-batch-feed');

        // Sub-tabs navigation
        const mainTabs = document.querySelectorAll('#feeding-main-tabs .filter-tab');
        const gridSection = document.getElementById('tinas-grid-section');
        const armarLoteSection = document.getElementById('armar-lote-section');
        const inventarioSection = document.getElementById('inventario-activos-section');
        const historySection = document.getElementById('feeding-history-section');
        const historyContainer = document.getElementById('feeding-history-list-container');
        const historyViewTabs = document.querySelectorAll('#history-view-tabs .filter-tab');
        const tinaSelectorWrapper = document.getElementById('history-tina-selector-wrapper');
        const tinaSelect = document.getElementById('history-tina-select');

        let selectedBeds = new Set();
        let selectedDisponibles = new Set();
        let currentSearchQuery = '';
        let currentDisponibleSearch = '';
        let currentHideFed = false;
        let currentHistoryView = 'all-feedings'; // 'all-feedings' or 'by-tina'

        // Main sub-tabs handler
        if (mainTabs && mainTabs.length > 0) {
            mainTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    mainTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    const selectedTab = tab.getAttribute('data-tab');
                    if (gridSection) gridSection.classList.add('hidden');
                    if (armarLoteSection) armarLoteSection.classList.add('hidden');
                    if (inventarioSection) inventarioSection.classList.add('hidden');
                    if (historySection) historySection.classList.add('hidden');
                    if (batchBar) batchBar.classList.add('hidden');

                    if (selectedTab === 'tinas-grid') {
                        if (gridSection) gridSection.classList.remove('hidden');
                        drawGrid();
                        updateBatchBar();
                    } else if (selectedTab === 'armar-lote') {
                        if (armarLoteSection) armarLoteSection.classList.remove('hidden');
                        drawDisponibles();
                    } else if (selectedTab === 'inventario-activos') {
                        if (inventarioSection) inventarioSection.classList.remove('hidden');
                        drawAssetsTable();
                    } else if (selectedTab === 'feeding-history') {
                        if (historySection) historySection.classList.remove('hidden');
                        drawHistory();
                    }
                });
            });
        }

        // History sub-tabs handler
        if (historyViewTabs && historyViewTabs.length > 0) {
            historyViewTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    historyViewTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    currentHistoryView = tab.getAttribute('data-view');
                    
                    if (currentHistoryView === 'all-feedings') {
                        if (tinaSelectorWrapper) tinaSelectorWrapper.classList.add('hidden');
                        drawHistory();
                    } else {
                        if (tinaSelectorWrapper) tinaSelectorWrapper.classList.remove('hidden');
                        drawHistory();
                    }
                });
            });
        }

        if (tinaSelect) {
            tinaSelect.addEventListener('change', () => {
                drawHistory();
            });
        }

        // Draw feeding history records
        const drawHistory = () => {
            if (!historyContainer) return;
            if (currentHistoryView === 'all-feedings') {
                const sortedLogs = [...logs].sort((a, b) => new Date(b[2].replace(' ', 'T')) - new Date(a[2].replace(' ', 'T')));
                if (sortedLogs.length === 0) {
                    historyContainer.innerHTML = `<div class="card p-4 text-center text-secondary">No hay alimentaciones registradas.</div>`;
                    return;
                }
                
                historyContainer.innerHTML = `
                    <div class="card">
                        <h4 class="mb-3"><i class="fa-solid fa-list-ol text-success"></i> Lista General de Alimentaciones Registradas</h4>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Fecha / Hora</th>
                                        <th>Bandeja</th>
                                        <th>Alimento</th>
                                        <th>Cantidad</th>
                                        <th>Operario</th>
                                        <th>Observación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sortedLogs.map(row => {
                                        const camaId = row[1];
                                        const name = "Bandeja " + camaId;
                                        const feedUnit = getFeedingUnit(row[7]);
                                        const cycle = row[8] || 'Ciclo Legacy';
                                        return `
                                            <tr>
                                                <td><strong>${row[2]}</strong></td>
                                                <td>
                                                    <span class="badge neonatos cursor-pointer" style="font-size:0.85rem; text-decoration: underline;" 
                                                          onclick="Components.showTinaDetailModal('${camaId}')">
                                                        ${name}
                                                    </span>
                                                    <br><small class="text-secondary" style="font-size: 0.7rem;">Ciclo: ${cycle.split('-')[0]}</small>
                                                </td>
                                                <td>${row[4]}</td>
                                                <td><strong>${parseFloat(row[5]).toFixed(2)} ${feedUnit}</strong></td>
                                                <td><small>${row[6]}</small></td>
                                                <td><span class="text-secondary" style="font-size: 0.85rem;">${row[7] || '-'}</span></td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            } else {
                if (!tinaSelect) return;
                const selectedTinaId = tinaSelect.value;
                if (!selectedTinaId) {
                    historyContainer.innerHTML = `<div class="card p-4 text-center text-secondary">Por favor, selecciona una bandeja para visualizar sus alimentaciones.</div>`;
                    return;
                }
                
                const tinaLogs = logs.filter(row => row[1] === selectedTinaId);
                const sortedLogs = [...tinaLogs].sort((a, b) => new Date(b[2].replace(' ', 'T')) - new Date(a[2].replace(' ', 'T')));
                
                if (sortedLogs.length === 0) {
                    historyContainer.innerHTML = `
                        <div class="card p-4 text-center text-secondary">
                            No se han registrado alimentaciones todavía para la <strong>Bandeja ${selectedTinaId}</strong>.
                        </div>
                    `;
                    return;
                }
                
                historyContainer.innerHTML = `
                    <div class="card">
                        <h4 class="mb-3"><i class="fa-solid fa-shuttle-space text-success"></i> Alimentaciones de Bandeja ${selectedTinaId}</h4>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Fecha / Hora</th>
                                        <th>Alimento</th>
                                        <th>Cantidad</th>
                                        <th>Operario</th>
                                        <th>Observación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sortedLogs.map(row => {
                                        const feedUnit = getFeedingUnit(row[7]);
                                        return `
                                            <tr>
                                                <td><strong>${row[2]}</strong></td>
                                                <td>${row[4]}</td>
                                                <td><strong>${parseFloat(row[5]).toFixed(2)} ${feedUnit}</strong></td>
                                                <td><small>${row[6]}</small></td>
                                                <td><span class="text-secondary" style="font-size: 0.85rem;">${row[7] || '-'}</span></td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
        };

        // VISTA 3: Render Active grouped by Grupo_Actual
        const drawGrid = () => {
            if (!gridContainer) return;
            const activeCamas = camas.filter(c => c[1] === 'En Servicio');
            
            const filtered = activeCamas.filter(c => {
                const id = c[0];
                const group = c[2] || 'Sin Grupo';
                const isFed = todayFeedMap[id];
                
                if (currentHideFed && isFed) return false;
                
                if (currentSearchQuery) {
                    const searchLower = currentSearchQuery.toLowerCase();
                    if (!id.toLowerCase().includes(searchLower) && !group.toLowerCase().includes(searchLower)) return false;
                }
                return true;
            });

            if (filtered.length === 0) {
                gridContainer.innerHTML = `<div class="text-center py-5 text-secondary"><i class="fa-solid fa-magnifying-glass mb-2" style="font-size: 2rem;"></i><p>No se encontraron bandejas activas con los filtros aplicados.</p></div>`;
                return;
            }

            // Group by Grupo_Actual
            const groups = {};
            filtered.forEach(c => {
                const groupName = c[2] || 'Sin Lote';
                if (!groups[groupName]) groups[groupName] = [];
                groups[groupName].push(c);
            });

            gridContainer.innerHTML = Object.keys(groups).map(groupName => {
                const groupTrays = groups[groupName];
                const cicloId = groupTrays[0][3] || 'Ciclo Legacy';
                return `
                    <div class="card p-3 mb-4 group-lot-panel" style="background-color: var(--bg-secondary); border-left: 5px solid var(--brand-primary); margin-bottom: 1.5rem;">
                        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                            <div>
                                <h3 class="mb-0" style="color: var(--text-success); font-size: 1.15rem; font-weight: 700;">
                                    <i class="fa-solid fa-layer-group"></i> Lote: ${groupName}
                                </h3>
                                <small class="text-secondary" style="font-size: 0.75rem;">Ciclo ID: ${cicloId}</small>
                            </div>
                            ${GoogleAPI.user.role !== 'Observador' ? `
                            <button class="btn btn-xs btn-danger btn-close-batch-group" data-ciclo-id="${cicloId}" data-grupo="${groupName}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; width: auto; font-weight: bold;">
                                <i class="fa-solid fa-crop"></i> Cosechar / Cerrar Lote
                            </button>
                            ` : ''}
                        </div>
                        <div class="camas-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 0.75rem;">
                            ${groupTrays.map(c => {
                                const id = c[0];
                                const name = "Bandeja " + id;
                                const stage = latestStageMap[id] || 'Neonatos';
                                const isFed = todayFeedMap[id];
                                const isChecked = selectedBeds.has(id);
                                return `
                                    <div class="cama-card ${isFed ? 'fed' : 'pending'}" data-id="${id}" style="cursor: pointer; padding: 0.75rem; margin-bottom: 0; min-height: 140px;">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <input type="checkbox" class="cama-card-checkbox" data-id="${id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; z-index: 2;">
                                            <span class="cama-badge ${stage.toLowerCase().replace(/ /g, '-').replace(/ñ/g, 'n')}" style="font-size: 0.65rem; padding: 0.15rem 0.35rem;">${stage}</span>
                                        </div>
                                        <div class="cama-number" style="font-size: 0.95rem; font-weight: bold; margin: 0.4rem 0;">${name}</div>
                                        <div class="cama-status-indicator" style="font-size: 0.7rem; margin-bottom: 0.5rem;">
                                            ${isFed ? `
                                                <i class="fa-solid fa-circle-check" style="color: var(--success);"></i>
                                                <span>${isFed.time} (${isFed.qty}kg)</span>
                                            ` : `
                                                <i class="fa-solid fa-circle-minus" style="color: var(--text-secondary);"></i>
                                                <span>Pendiente</span>
                                            `}
                                        </div>
                                        <button class="btn btn-outline btn-xs btn-quick-feed-cama" data-id="${id}" ${GoogleAPI.user.role === 'Observador' ? 'disabled' : ''} style="width: 100%; padding: 0.2rem; font-size: 0.7rem; z-index: 2;">
                                            <i class="fa-solid fa-seedling"></i> Alimentar
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('');

            // Wire events inside the active grid
            gridContainer.querySelectorAll('.cama-card').forEach(card => {
                const id = card.getAttribute('data-id');
                const chk = card.querySelector('.cama-card-checkbox');
                const quickFeedBtn = card.querySelector('.btn-quick-feed-cama');

                if (chk) {
                    chk.addEventListener('change', (e) => {
                        e.stopPropagation();
                        if (chk.checked) selectedBeds.add(id);
                        else selectedBeds.delete(id);
                        updateBatchBar();
                    });
                }

                card.addEventListener('click', (e) => {
                    if (e.target.closest('button') || e.target.closest('.cama-card-checkbox')) return;
                    this.showTinaDetailModal(containerId, id, camas, todayFeedMap, showLoading, hideLoading);
                });

                if (quickFeedBtn) {
                    quickFeedBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showCamaFeedingModal(containerId, [id], todayFeedMap, showLoading, hideLoading, camas);
                    });
                }
            });

            // Bind Cerrar Lote buttons
            gridContainer.querySelectorAll('.btn-close-batch-group').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (GoogleAPI.user.role === 'Observador') return;
                    
                    const cicloId = btn.getAttribute('data-ciclo-id');
                    const grupoName = btn.getAttribute('data-grupo');
                    
                    const biomasaStr = prompt(`Cosechar Lote: "${grupoName}"\n\nIngresa los kg totales de biomasa cosechada de este lote:`, "0.0");
                    if (biomasaStr === null) return; // Cancelled
                    
                    const biomasa = parseFloat(biomasaStr);
                    if (isNaN(biomasa) || biomasa < 0) {
                        alert("Por favor, ingresa un peso de cosecha válido mayor o igual a 0.");
                        return;
                    }

                    showLoading("Cosechando y cerrando lote...");
                    try {
                        await GoogleAPI.closeBatch(cicloId, biomasa);
                        hideLoading();
                        alert(`¡Lote "${grupoName}" cerrado y cosechado exitosamente! Las bandejas vuelven a estar disponibles.`);
                        this.renderFeeding(containerId, showLoading, hideLoading);
                    } catch (err) {
                        console.error(err);
                        hideLoading();
                        alert(`Error al cerrar lote: ${err.message}`);
                    }
                });
            });
        };

        // VISTA 2: Render Available trays
        const drawDisponibles = () => {
            const grid = document.getElementById('disponibles-grid-container');
            if (!grid) return;

            const disponibles = camas.filter(c => c[1] === 'Disponible');
            const filtered = disponibles.filter(c => {
                const id = c[0];
                if (currentDisponibleSearch) {
                    return id.toLowerCase().includes(currentDisponibleSearch.toLowerCase());
                }
                return true;
            });

            if (filtered.length === 0) {
                grid.innerHTML = `<div style="grid-column: 1 / -1;" class="text-center py-5 text-secondary"><i class="fa-solid fa-circle-info mb-2" style="font-size: 2rem;"></i><p>No hay bandejas disponibles en este momento.</p></div>`;
                return;
            }

            grid.innerHTML = filtered.map(c => {
                const id = c[0];
                const name = "Bandeja " + id;
                const isChecked = selectedDisponibles.has(id);
                return `
                    <div class="cama-card pending cursor-pointer" data-id="${id}" style="border: 1px dashed var(--border-color); opacity: 0.9; padding: 0.75rem; min-height: 100px; display: flex; flex-direction: column; justify-content: space-between;">
                        <div class="d-flex justify-content-between align-items-center">
                            <input type="checkbox" class="disponible-checkbox" data-id="${id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; z-index: 2;">
                            <span class="cama-badge disponible" style="font-size: 0.65rem; padding: 0.15rem 0.35rem;">Disponible</span>
                        </div>
                        <div class="cama-number" style="font-size: 0.95rem; font-weight: bold; margin: 0.5rem 0;">${name}</div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary);"><i class="fa-solid fa-circle-check"></i> Vacía y lista</div>
                    </div>
                `;
            }).join('');

            // Wire events
            grid.querySelectorAll('.cama-card').forEach(card => {
                const id = card.getAttribute('data-id');
                const chk = card.querySelector('.disponible-checkbox');

                // PARCHE: Proteger el checkbox antes de asignar el evento
                if (chk) {
                    chk.addEventListener('change', (e) => {
                        e.stopPropagation();
                        if (chk.checked) selectedDisponibles.add(id);
                        else selectedDisponibles.delete(id);
                    });
                }

                card.addEventListener('click', (e) => {
                    if (e.target.closest('.disponible-checkbox')) return;
                    if (selectedDisponibles.has(id)) {
                        selectedDisponibles.delete(id);
                        if (chk) chk.checked = false; // PARCHE
                    } else {
                        selectedDisponibles.add(id);
                        if (chk) chk.checked = true; // PARCHE
                    }
                });
            });
        };

        // VISTA 1: Render total inventory list (Admin)
        const drawAssetsTable = () => {
            const tbody = document.getElementById('assets-table-body');
            if (!tbody) return;

            if (camas.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-secondary">No hay activos registrados en el sistema.</td></tr>`;
                return;
            }

            tbody.innerHTML = camas.map(c => {
                const id = c[0];
                const estado = c[1];
                const grupo = c[2] || '-';
                const isDisponible = estado === 'Disponible';
                return `
                    <tr>
                        <td><a href="#" class="view-tina-detail text-success" data-id="${id}" style="font-weight: 600; text-decoration: underline;">${id}</a></td>
                        <td><span class="badge ${estado === 'Disponible' ? 'success' : (estado === 'En Servicio' ? 'warning' : 'danger')}" style="font-size:0.75rem;">${estado}</span></td>
                        <td>${grupo}</td>
                        <td>
                            ${isDisponible ? `
                            <button class="btn btn-xs btn-danger btn-retire-asset" data-id="${id}" style="width:auto; padding: 0.2rem 0.5rem; font-size: 0.7rem;">
                                <i class="fa-solid fa-trash"></i> Dar de Baja
                            </button>
                            ` : `<span class="text-secondary" style="font-size:0.75rem;">-</span>`}
                        </td>
                    </tr>
                `;
            }).join('');

            tbody.querySelectorAll('.btn-retire-asset').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    const confirmation = confirm(`¿Estás seguro de que deseas DAR DE BAJA la bandeja ${id}?\n\nEsta bandeja se marcará como 'Baja' y no estará disponible para nuevos lotes.`);
                    if (!confirmation) return;

                    showLoading("Dando de baja bandeja...");
                    try {
                        await GoogleAPI.manageAsset([id], 'Baja');
                        hideLoading();
                        alert(`¡Bandeja ${id} dada de baja con éxito!`);
                        this.renderFeeding(containerId, showLoading, hideLoading);
                    } catch (err) {
                        console.error(err);
                        hideLoading();
                        alert(`Error al dar de baja bandeja: ${err.message}`);
                    }
                });
            });

            tbody.querySelectorAll('.view-tina-detail').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const id = link.getAttribute('data-id');
                    this.showTinaDetailModal(containerId, id, camas, todayFeedMap, showLoading, hideLoading);
                });
            });
        };

        // Batch Action Bar coordinator
        const updateBatchBar = () => {
            const selectedFilteredCount = Array.from(selectedBeds).filter(id => camas.some(c => c[0] === id)).length;

            if (selectedFilteredCount > 0 && gridSection && gridSection.classList.contains('hidden') === false) {
                if (batchCount) batchCount.textContent = `${selectedFilteredCount} bandeja(s) seleccionada(s)`;
                if (batchBar) batchBar.classList.remove('hidden');
            } else {
                if (batchBar) batchBar.classList.add('hidden');
            }
        };

        // Filter search input
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                currentSearchQuery = searchInput.value.trim();
                drawGrid();
            });
        }

        // Hide fed toggle binding
        if (hideFedCheckbox) {
            hideFedCheckbox.addEventListener('change', () => {
                currentHideFed = hideFedCheckbox.checked;
                drawGrid();
            });
        }

        // Batch Feed trigger
        if (batchFeedBtn) {
            batchFeedBtn.addEventListener('click', () => {
                if (GoogleAPI.user.role === 'Observador') return;
                const bedsList = Array.from(selectedBeds);
                this.showCamaFeedingModal(containerId, bedsList, todayFeedMap, showLoading, hideLoading, camas);
            });
        }

        // Form Submit: Iniciar Lote (start_batch)
        const formStartBatch = document.getElementById('form-start-batch');
        if (formStartBatch) {
            formStartBatch.addEventListener('submit', async (e) => {
                e.preventDefault();
                const grupo = document.getElementById('batch-group-name').value.trim();
                const selectedList = Array.from(selectedDisponibles);
                if (selectedList.length === 0) {
                    alert("Por favor, selecciona al menos una bandeja disponible para armar el lote.");
                    return;
                }
                
                showLoading("Iniciando lote de producción...");
                try {
                    await GoogleAPI.startBatch(selectedList, grupo);
                    hideLoading();
                    alert(`¡Lote "${grupo}" creado e iniciado con éxito con ${selectedList.length} bandejas!`);
                    selectedDisponibles.clear();
                    
                    this.renderFeeding(containerId, showLoading, hideLoading);
                } catch (err) {
                    console.error(err);
                    hideLoading();
                    alert(`Error al iniciar lote: ${err.message}`);
                }
            });
        }

        // Form Submit: Alta de Activos (manage_asset)
        const formManageAssets = document.getElementById('form-manage-assets');
        if (formManageAssets) {
            formManageAssets.addEventListener('submit', async (e) => {
                e.preventDefault();
                const prefix = document.getElementById('asset-prefix').value.trim();
                const start = parseInt(document.getElementById('asset-start').value);
                const end = parseInt(document.getElementById('asset-end').value);

                if (end < start) {
                    alert("El número final no puede ser menor que el inicial.");
                    return;
                }
                if (end - start > 500) {
                    alert("Por seguridad, el límite máximo por lote es de 500 bandejas.");
                    return;
                }

                const assetIds = [];
                for (let i = start; i <= end; i++) {
                    const idStr = `${prefix}${String(i).padStart(3, '0')}`;
                    assetIds.push(idStr);
                }

                showLoading("Registrando nuevas bandejas...");
                try {
                    await GoogleAPI.manageAsset(assetIds, 'Alta');
                    hideLoading();
                    alert(`¡${assetIds.length} bandejas dadas de alta con éxito!`);
                    this.renderFeeding(containerId, showLoading, hideLoading);
                } catch (err) {
                    console.error(err);
                    hideLoading();
                    alert(`Error al registrar activos: ${err.message}`);
                }
            });
        }

        // Available search binding
        const searchDisponibleInput = document.getElementById('search-disponible-input');
        if (searchDisponibleInput) {
            searchDisponibleInput.addEventListener('input', () => {
                currentDisponibleSearch = searchDisponibleInput.value.trim();
                drawDisponibles();
            });
        }

        // Available select all binding
        const selectAllDisponiblesCheckbox = document.getElementById('toggle-select-all-disponibles');
        if (selectAllDisponiblesCheckbox) {
            selectAllDisponiblesCheckbox.addEventListener('change', () => {
                const disponibles = camas.filter(c => c[1] === 'Disponible');
                if (selectAllDisponiblesCheckbox.checked) {
                    disponibles.forEach(c => selectedDisponibles.add(c[0]));
                } else {
                    disponibles.forEach(c => selectedDisponibles.delete(c[0]));
                }
                drawDisponibles();
            });
        }

        // Expose global variables and callback
        window.Components = window.Components || {};
        window.Components.camas = camas;
        window.Components.todayFeedMap = todayFeedMap;
        window.Components.showLoading = showLoading;
        window.Components.hideLoading = hideLoading;
        window.Components.showTinaDetailModal = (tinaId) => {
            this.showTinaDetailModal(
                containerId,
                tinaId, 
                window.Components.camas, 
                window.Components.todayFeedMap, 
                window.Components.showLoading, 
                window.Components.hideLoading
            );
        };

        // Draw initially
        drawGrid();
    },

    showCamaFeedingModal(containerId, camasIds, todayFeedMap, showLoading, hideLoading, camas) {
        const modal = document.getElementById('cama-feed-modal');

        // Create quick lookup map for names and groups
        const camaDetailsMap = {};
        camas.forEach(c => {
            camaDetailsMap[c[0]] = { name: "Bandeja " + c[0], group: c[2] || 'Sin Lote' };
        });

        const defaultQty = 1.0;

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 600px;">
                <div class="modal-header" style="background-color: var(--brand-primary); color: #090d16;">
                    <i class="fa-solid fa-seedling"></i>
                    <h3>Registrar Alimentación (Bandejas)</h3>
                </div>
                <div class="modal-body" style="padding: 1.25rem;">
                    <form id="modal-feeding-form">
                        <!-- GENERAL DETAILS -->
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="feed-insumo">Insumo / Alimento</label>
                                <input type="text" id="feed-insumo" class="form-control" list="feed-names-list" placeholder="Ej: Salvado de Trigo" required>
                                <datalist id="feed-names-list">
                                    <option value="Salvado de Trigo">
                                    <option value="Residuos Fruta / Verdura">
                                    <option value="Afrecho de Cerveza">
                                    <option value="Sustrato de Atracción">
                                </datalist>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="feed-qty">Dosis General (kg/bandeja)</label>
                                <input type="number" inputmode="decimal" id="feed-qty" class="form-control" placeholder="1.0" step="0.1" value="${defaultQty}" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="feed-observacion-general">Observación General de Alimentación</label>
                            <input type="text" id="feed-observacion-general" class="form-control" placeholder="Ej: Mezcla seca de salvado. Clima cálido hoy.">
                        </div>

                        <!-- INDIVIDUAL BED BREAKDOWN -->
                        <div class="section-divider" style="margin: 1rem 0;"></div>
                        <label class="form-label" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                            <span>Desglose y Notas por Bandeja (${camasIds.length})</span>
                            <small class="text-secondary">Opcional: puedes cambiar dosis o añadir notas por bandeja</small>
                        </label>

                        <!-- Beds List scroll wrapper -->
                        <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 1.25rem; background-color: var(--bg-primary); padding: 0.25rem;">
                            ${camasIds.map(id => {
                                const details = camaDetailsMap[id] || { name: "Bandeja " + id, group: 'Sin Lote' };
                                return `
                                    <div class="d-flex align-items-center justify-content-between p-2 border-bottom modal-cama-row" data-id="${id}" style="gap: 0.5rem; border-bottom-color: var(--border-color); flex-wrap: wrap;">
                                        <div style="display: flex; flex-direction: column; min-width: 90px;">
                                            <span style="font-size: 0.85rem; font-weight: 600;">${details.name}</span>
                                            <span style="font-size: 0.7rem; color: var(--text-secondary);">${details.group}</span>
                                        </div>
                                        <div style="display: flex; gap: 0.5rem; align-items: center; flex-grow: 1;">
                                            <input type="number" inputmode="decimal" class="form-control form-control-sm individual-qty" data-id="${id}" value="${defaultQty}" step="0.1" style="width: 70px; margin-bottom: 0; padding: 0.35rem 0.5rem; font-size: 0.8rem;" required>
                                            <span style="font-size: 0.75rem; color: var(--text-secondary); margin-right: 0.25rem;">kg</span>
                                            <input type="text" class="form-control form-control-sm individual-obs" data-id="${id}" placeholder="Nota..." style="flex-grow: 1; margin-bottom: 0; padding: 0.35rem 0.5rem; font-size: 0.8rem;">
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <!-- MODAL ACTIONS -->
                        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0; border: none; background: transparent;">
                            <button type="button" id="btn-feed-cancel" class="btn btn-secondary">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Registrar Alimentación</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        const generalQtyInput = document.getElementById('feed-qty');
        generalQtyInput.addEventListener('input', () => {
            const val = generalQtyInput.value;
            modal.querySelectorAll('.individual-qty').forEach(input => {
                input.value = val;
            });
        });

        const cancelBtn = document.getElementById('btn-feed-cancel');
        cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

        const form = document.getElementById('modal-feeding-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            modal.classList.add('hidden');
            showLoading("Guardando registros en Google Sheets...");

            try {
                const allLogs = await GoogleAPI.getFeedingLogs();
                const now = new Date();
                const offset = now.getTimezoneOffset();
                const localNow = new Date(now.getTime() - (offset*60*1000));
                const todayPrefix = localNow.toISOString().substring(0, 10);
                
                const todayLogs = allLogs.slice(1).filter(log => log[2] && log[2].startsWith(todayPrefix));
                let nextOrder = todayLogs.length + 1;

                const insumo = document.getElementById('feed-insumo').value.trim();
                const generalObs = document.getElementById('feed-observacion-general').value.trim();
                const dateTimeStr = localNow.toISOString().replace('T', ' ').substring(0, 19);

                let totalQtyUsed = 0;
                const rowsHTML = modal.querySelectorAll('.modal-cama-row');
                const feedingRows = Array.from(rowsHTML).map(row => {
                    const bedId = row.getAttribute('data-id');
                    const qty = parseFloat(row.querySelector('.individual-qty').value) || 0;
                    const specificObs = row.querySelector('.individual-obs').value.trim();
                    totalQtyUsed += qty;

                    let finalObs = '';
                    if (generalObs && specificObs) {
                        finalObs = `[Gral: ${generalObs}] - ${specificObs}`;
                    } else if (generalObs) {
                        finalObs = generalObs;
                    } else if (specificObs) {
                        finalObs = `[Bandeja: ${specificObs}]`;
                    }

                    const trayObj = camas.find(c => c[0] === bedId);
                    const tinaCiclo = (trayObj && trayObj[3]) ? trayObj[3].toString().trim() : 'Ciclo Legacy';

                    const record = [
                        `FEED_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                        bedId,
                        dateTimeStr,
                        nextOrder,
                        insumo,
                        qty,
                        GoogleAPI.user.name,
                        finalObs,
                        tinaCiclo // Column 9 (Index 8)
                    ];
                    nextOrder++;
                    return record;
                });

                // Write batch to Sheets
                await GoogleAPI.appendFeedingLogsBatch(feedingRows);

                // Register total stock decrease in Insumos
                const supplyValues = [[
                    `SUP_${Date.now()}_FEED_GRP`,
                    'MANUAL',
                    todayPrefix,
                    insumo,
                    'Utilización',
                    totalQtyUsed,
                    'kg',
                    0,
                    'Sustrato',
                    ''
                ]];
                await GoogleAPI.appendSheetData('Insumos!A:J', supplyValues);

                hideLoading();
                alert(`¡Alimentación registrada para ${camasIds.length} bandeja(s). Total alimento utilizado: ${totalQtyUsed.toFixed(1)} kg.`);
                
                const selectAllCheckbox = document.getElementById('toggle-select-all');
                if (selectAllCheckbox) selectAllCheckbox.checked = false;
                
                this.renderFeeding(containerId, showLoading, hideLoading); // Reload

            } catch (err) {
                console.error("Group feeding submit error", err);
                hideLoading();
                alert(`Error al registrar alimentación masiva: ${err.message}`);
            }
        });
    },



    /**
     * Show detailed Tina Ficha Técnica
     */
    async showTinaDetailModal(containerId, tinaId, camas, todayFeedMap, showLoading, hideLoading) {
        showLoading("Cargando Ficha Técnica...");
        
        try {
            const details = camas.find(c => c[0] === tinaId) || [tinaId, 'Disponible', '', ''];
            const name = "Bandeja " + tinaId;
            const estado = details[1] || 'Disponible';
            const grupo = details[2] || 'Sin Lote';
            const cicloId = details[3] || 'Sin Ciclo';
            
            // Fetch feedings and stages
            const allFeedings = await GoogleAPI.getFeedingLogs();
            const allStages = await GoogleAPI.getEtapasLogs();
            
            const tinaFeedings = allFeedings.slice(1).filter(f => f[1] === tinaId);
            const tinaStages = allStages.slice(1).filter(s => s[1] === tinaId);
            
            // Sort stages ascending to calculate durations
            const sortedStages = [...tinaStages].sort((a, b) => new Date(a[2].replace(' ', 'T')) - new Date(b[2].replace(' ', 'T')));
            const currentStage = sortedStages.length > 0 ? sortedStages[sortedStages.length - 1][4] : 'Neonatos';
            
            // Find the start of the current cycle (most recent re-initialization)
            let currentCycleStartIdx = 0;
            for (let i = sortedStages.length - 1; i >= 0; i--) {
                const prevStage = sortedStages[i][3]; // Etapa_Anterior
                if (prevStage === 'Creación' || prevStage === 'Disponible' || prevStage.includes('Cosecha Total')) {
                    currentCycleStartIdx = i;
                    break;
                }
            }
            
            const currentCycleStages = sortedStages.slice(currentCycleStartIdx);
            
            // Check if the current cycle has ended (has a Cosecha Total log)
            const lastLog = currentCycleStages[currentCycleStages.length - 1];
            const hasCycleEnded = lastLog && lastLog[4].includes('Cosecha Total');
            const cycleEndVal = hasCycleEnded ? new Date(lastLog[2].replace(' ', 'T')) : new Date();
            
            // Duration calculation
            const durations = {
                'Neonatos': 0,
                'Pequeña': 0,
                'Mediana': 0,
                'Grande': 0,
                'Prepupa': 0
            };
            
            if (currentCycleStages.length > 0) {
                for (let i = 0; i < currentCycleStages.length; i++) {
                    const currentLog = currentCycleStages[i];
                    const stageName = currentLog[4]; // Etapa_Nueva
                    const currentVal = new Date(currentLog[2].replace(' ', 'T'));
                    
                    let nextVal = cycleEndVal;
                    if (i < currentCycleStages.length - 1) {
                        nextVal = new Date(currentCycleStages[i+1][2].replace(' ', 'T'));
                    }
                    
                    const diffMs = nextVal - currentVal;
                    const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
                    
                    let mappedStageName = stageName;
                    if (stageName.includes('Cosecha Parcial de Larva')) mappedStageName = 'Grande';
                    else if (stageName.includes('Cosecha Parcial de Pupa')) mappedStageName = 'Prepupa';
                    
                    if (durations[mappedStageName] !== undefined) {
                        durations[mappedStageName] += diffDays;
                    }
                }
            }
            
            const totalDuration = Object.values(durations).reduce((acc, curr) => acc + curr, 0);
            
            // Build Unified Timeline (Feedings + Stage Changes)
            const timeline = [];
            
            tinaFeedings.forEach(f => {
                timeline.push({
                    type: 'feeding',
                    id: f[0],
                    date: f[2],
                    order: f[3],
                    insumo: f[4],
                    qty: parseFloat(f[5]) || 0,
                    user: f[6],
                    obs: f[7] || ''
                });
            });
            
            tinaStages.forEach(s => {
                timeline.push({
                    type: 'stage_change',
                    id: s[0],
                    date: s[2],
                    oldStage: s[3],
                    newStage: s[4],
                    obs: s[5] || '',
                    user: s[6]
                });
            });
            
            // Sort chronological desc (newest first)
            timeline.sort((a, b) => new Date(b.date.replace(' ', 'T')) - new Date(a.date.replace(' ', 'T')));
            
            // Render Modal
            const modal = document.getElementById('tina-detail-modal');
            modal.innerHTML = `
                <div class="modal-card" style="max-width: 800px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
                    <div class="modal-header" style="background-color: var(--brand-primary); color: #090d16; flex-shrink: 0;">
                        <i class="fa-solid fa-bug"></i>
                        <h3>Ficha Técnica: ${name} (${tinaId})</h3>
                        <button class="btn-icon-only" id="btn-close-detail-modal" style="color: #090d16; font-size: 1.5rem; background: none; border: none; cursor: pointer; margin-left: auto;">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body" style="padding: 1.5rem; overflow-y: auto; flex-grow: 1;">
                        <!-- Status Cards -->
                        <div style="margin-bottom: 1.5rem;">
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                                <div class="card p-3" style="flex: 1; min-width: 150px; background-color: var(--bg-secondary); border-left: 4px solid var(--brand-primary);">
                                    <small class="text-secondary" style="text-transform: uppercase; font-size: 0.7rem;">Etapa Actual</small>
                                    <h4 class="mt-1 ${currentStage.toLowerCase().replace(/ /g, '-').replace(/ñ/g, 'n')}-text">${currentStage}</h4>
                                </div>
                                <div class="card p-3" style="flex: 1; min-width: 150px; background-color: var(--bg-secondary); border-left: 4px solid var(--text-success);">
                                    <small class="text-secondary" style="text-transform: uppercase; font-size: 0.7rem;">Grupo / Estante</small>
                                    <h4 class="mt-1">${grupo}</h4>
                                </div>
                                <div class="card p-3" style="flex: 1; min-width: 150px; background-color: var(--bg-secondary); border-left: 4px solid var(--text-warning);">
                                    <small class="text-secondary" style="text-transform: uppercase; font-size: 0.7rem;">Estado</small>
                                    <h4 class="mt-1">${estado}</h4>
                                </div>
                            </div>
                        </div>

                        <!-- Stage duration stats -->
                        <div class="card p-3 mb-4" style="background-color: var(--bg-secondary);">
                            <h4 class="mb-3"><i class="fa-solid fa-clock text-success"></i> Duración por Etapa del Ciclo</h4>
                            <div class="duration-flex-container" style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: space-between;">
                                <div class="duration-badge-card" style="flex: 1; min-width: 110px; text-align: center; padding: 0.75rem; background-color: var(--bg-primary); border-radius: var(--radius-sm);">
                                    <span class="stage-label" style="display: block; font-size: 0.8rem; color: var(--text-secondary);">Neonatos</span>
                                    <strong class="stage-value text-success" style="font-size: 1.1rem; display: block; margin-top: 0.25rem;">${durations['Neonatos'].toFixed(1)}d</strong>
                                </div>
                                <div class="duration-badge-card" style="flex: 1; min-width: 110px; text-align: center; padding: 0.75rem; background-color: var(--bg-primary); border-radius: var(--radius-sm);">
                                    <span class="stage-label" style="display: block; font-size: 0.8rem; color: var(--text-secondary);">Pequeña</span>
                                    <strong class="stage-value text-success" style="font-size: 1.1rem; display: block; margin-top: 0.25rem;">${durations['Pequeña'].toFixed(1)}d</strong>
                                </div>
                                <div class="duration-badge-card" style="flex: 1; min-width: 110px; text-align: center; padding: 0.75rem; background-color: var(--bg-primary); border-radius: var(--radius-sm);">
                                    <span class="stage-label" style="display: block; font-size: 0.8rem; color: var(--text-secondary);">Mediana</span>
                                    <strong class="stage-value text-success" style="font-size: 1.1rem; display: block; margin-top: 0.25rem;">${durations['Mediana'].toFixed(1)}d</strong>
                                </div>
                                <div class="duration-badge-card" style="flex: 1; min-width: 110px; text-align: center; padding: 0.75rem; background-color: var(--bg-primary); border-radius: var(--radius-sm);">
                                    <span class="stage-label" style="display: block; font-size: 0.8rem; color: var(--text-secondary);">Grande</span>
                                    <strong class="stage-value text-success" style="font-size: 1.1rem; display: block; margin-top: 0.25rem;">${durations['Grande'].toFixed(1)}d</strong>
                                </div>
                                <div class="duration-badge-card" style="flex: 1; min-width: 110px; text-align: center; padding: 0.75rem; background-color: var(--bg-primary); border-radius: var(--radius-sm);">
                                    <span class="stage-label" style="display: block; font-size: 0.8rem; color: var(--text-secondary);">Prepupa</span>
                                    <strong class="stage-value text-success" style="font-size: 1.1rem; display: block; margin-top: 0.25rem;">${durations['Prepupa'].toFixed(1)}d</strong>
                                </div>
                            </div>
                            <div class="mt-3 p-2 text-center" style="background-color: var(--bg-primary); border-radius: var(--radius-sm); font-size: 0.9rem;">
                                Ciclo acumulado total: <strong class="text-success">${totalDuration.toFixed(1)} días</strong>
                            </div>
                        </div>

                        <!-- Update lifecycle stage (Only for En Servicio) -->
                        ${GoogleAPI.user.role !== 'Observador' && estado === 'En Servicio' ? `
                            <div class="card p-3 mb-4" style="border: 1px solid var(--border-color); background-color: var(--bg-primary);">
                                <h4 class="mb-3"><i class="fa-solid fa-arrows-spin text-success"></i> Actualizar Etapa de Ciclo de Vida</h4>
                                <form id="form-update-stage">
                                    <div class="form-row-2">
                                        <div class="form-group mb-0">
                                            <label class="form-label" for="detail-new-stage">Nueva Etapa</label>
                                            <select id="detail-new-stage" class="form-control" style="padding: 0.5rem;" required>
                                                <optgroup label="Etapas Biológicas">
                                                    <option value="Neonatos" ${currentStage === 'Neonatos' ? 'selected' : ''}>Neonatos (1-5 días)</option>
                                                    <option value="Pequeña" ${currentStage === 'Pequeña' ? 'selected' : ''}>Pequeña (larva joven)</option>
                                                    <option value="Mediana" ${currentStage === 'Mediana' ? 'selected' : ''}>Mediana (crecimiento)</option>
                                                    <option value="Grande" ${currentStage === 'Grande' ? 'selected' : ''}>Grande (engorde)</option>
                                                    <option value="Prepupa" ${currentStage === 'Prepupa' ? 'selected' : ''}>Prepupa</option>
                                                </optgroup>
                                                <optgroup label="Cosechas Parciales (Mantienen Ciclo)">
                                                    <option value="Cosecha Parcial de Larvas">Cosecha Parcial de Larvas</option>
                                                    <option value="Cosecha Parcial de Pupas">Cosecha Parcial de Pupas</option>
                                                </optgroup>
                                            </select>
                                        </div>
                                        <div class="form-group mb-0">
                                            <label class="form-label" for="detail-stage-obs">Observación / Nota</label>
                                            <input type="text" id="detail-stage-obs" class="form-control" placeholder="Ej: desarrollo vigoroso, sustrato húmedo">
                                        </div>
                                    </div>
                                    <button type="submit" class="btn btn-primary btn-sm mt-3" style="width: auto;">
                                        <i class="fa-solid fa-floppy-disk"></i> Guardar Nueva Etapa
                                    </button>
                                </form>
                            </div>
                        ` : ''}

                        <!-- Traspasar Contenido a Otra Tina (Only for En Servicio) -->
                        ${GoogleAPI.user.role !== 'Observador' && estado === 'En Servicio' ? `
                            <div class="card p-3 mb-4" style="border: 1px solid var(--border-color); background-color: var(--bg-primary);">
                                <h4 class="mb-3"><i class="fa-solid fa-arrows-left-right text-success"></i> Traspasar Contenido a Otra Tina</h4>
                                <form id="form-transfer-asset">
                                    <div class="form-row-2">
                                        <div class="form-group mb-0">
                                            <label class="form-label" for="transfer-target-asset">Tina Destino (Disponible)</label>
                                            ${(() => {
                                                const disponibles = camas.filter(c => c[1] === 'Disponible');
                                                const hasDisponibles = disponibles.length > 0;
                                                return `
                                                <select id="transfer-target-asset" class="form-control" style="padding: 0.5rem;" ${hasDisponibles ? '' : 'disabled'} required>
                                                    <option value="" disabled selected>${hasDisponibles ? 'Seleccione una tina disponible...' : 'No hay tinas disponibles'}</option>
                                                    ${disponibles.map(c => `<option value="${c[0]}">${c[0]}</option>`).join('')}
                                                </select>
                                                `;
                                            })()}
                                        </div>
                                        <div class="form-group mb-0" style="display: flex; align-items: center; padding-top: 1.5rem;">
                                            <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; user-select: none; margin-bottom: 0;">
                                                <input type="checkbox" id="transfer-discard-origin" style="width: auto; height: auto; margin-top: 0;">
                                                Desechar tina de origen (Dar de Baja)
                                            </label>
                                        </div>
                                    </div>
                                    <button type="submit" class="btn btn-warning btn-sm mt-3" style="width: auto; color: #090d16; font-weight: bold;" ${camas.filter(c => c[1] === 'Disponible').length > 0 ? '' : 'disabled'}>
                                        <i class="fa-solid fa-arrows-left-right"></i> Ejecutar Traspaso
                                    </button>
                                </form>
                            </div>
                        ` : ''}

                        <!-- Dar de Baja Tina Directamente (Only for Disponible) -->
                        ${GoogleAPI.user.role !== 'Observador' && estado === 'Disponible' ? `
                            <div class="card p-3 mb-4" style="border: 1px solid var(--border-color); background-color: var(--bg-primary); text-align: center;">
                                <h4 class="mb-2"><i class="fa-solid fa-trash text-danger"></i> Dar de Baja Bandeja</h4>
                                <p class="text-secondary mb-3" style="font-size: 0.85rem;">Esta bandeja está disponible y puede ser retirada del inventario de servicio.</p>
                                <button id="btn-detail-retire-asset" class="btn btn-danger btn-sm" style="width: auto;">
                                    <i class="fa-solid fa-trash"></i> Retirar Bandeja (Baja)
                                </button>
                            </div>
                        ` : ''}

                        <!-- Timeline (Historial) -->
                        <div>
                            <h4 class="mb-3"><i class="fa-solid fa-clock-rotate-left text-success"></i> Línea de Tiempo de Actividades</h4>
                            ${timeline.length === 0 ? `
                                <div class="text-center py-4 text-secondary">No hay actividades registradas en esta tina.</div>
                            ` : `
                                <div class="tina-timeline" style="display: flex; flex-direction: column; gap: 1rem; border-left: 2px solid var(--border-color); padding-left: 1.25rem; margin-left: 0.5rem;">
                                    ${timeline.map(item => {
                                        if (item.type === 'feeding') {
                                            const feedUnit = getFeedingUnit(item.obs);
                                            return `
                                                <div class="timeline-event" style="position: relative;">
                                                    <span style="position: absolute; left: -1.7rem; top: 0.15rem; background: var(--brand-primary); color: #090d16; width: 15px; height: 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.5rem;"><i class="fa-solid fa-seedling"></i></span>
                                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${item.date}</div>
                                                    <div style="font-size: 0.9rem; font-weight: 600; margin-top: 0.15rem;">Alimentación (${item.order}º)</div>
                                                    <div style="font-size: 0.85rem; margin-top: 0.1rem;">Se suministró <strong>${item.qty.toFixed(2)} ${feedUnit}</strong> de <strong>${item.insumo}</strong> por <small class="text-secondary">${item.user}</small>.</div>
                                                    ${item.obs ? `<div style="font-size: 0.8rem; color: var(--text-warning); font-style: italic; margin-top: 0.15rem; background: rgba(234,179,8,0.1); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); border-left: 2px solid var(--text-warning);">${item.obs}</div>` : ''}
                                                </div>
                                            `;
                                        } else {
                                            const isHarvest = item.newStage.includes('Cosecha');
                                            const badgeClass = item.newStage.toLowerCase().replace(/ /g, '-').replace(/ñ/g, 'n');
                                            return `
                                                <div class="timeline-event" style="position: relative;">
                                                    <span style="position: absolute; left: -1.7rem; top: 0.15rem; background: ${isHarvest ? 'var(--brand-primary)' : 'var(--text-success)'}; color: #090d16; width: 15px; height: 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.5rem;"><i class="fa-solid ${isHarvest ? 'fa-wheat-awn' : 'fa-arrows-spin'}"></i></span>
                                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${item.date}</div>
                                                    <div style="font-size: 0.9rem; font-weight: 600; margin-top: 0.15rem; color: ${isHarvest ? 'var(--brand-primary)' : 'var(--text-success)'};">${isHarvest ? 'Cosecha Registrada' : 'Cambio de Etapa'}</div>
                                                    <div style="font-size: 0.85rem; margin-top: 0.1rem;">Transición de <span class="badge" style="background: rgba(255,255,255,0.1);">${item.oldStage}</span> a <span class="badge ${badgeClass}">${item.newStage}</span> por <small class="text-secondary">${item.user}</small>.</div>
                                                    ${item.obs ? `<div style="font-size: 0.8rem; color: var(--text-secondary); font-style: italic; margin-top: 0.15rem; background: var(--bg-primary); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); border-left: 2px solid var(--border-color);">${item.obs}</div>` : ''}
                                                </div>
                                            `;
                                        }
                                    }).join('')}
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;
            
            modal.classList.remove('hidden');
            hideLoading();
            
            // Close modal button
            document.getElementById('btn-close-detail-modal').addEventListener('click', () => {
                modal.classList.add('hidden');
            });
            
            // Close clicking overlay
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
            
            // Individual cycles are started via startBatch (Armar Lote) in groups.
            
            // Submit stage change form
            const form = document.getElementById('form-update-stage');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const newStage = document.getElementById('detail-new-stage').value;
                    const obs = document.getElementById('detail-stage-obs').value.trim();
                    
                    if (newStage === currentStage) {
                        alert("La nueva etapa seleccionada debe ser diferente a la etapa actual.");
                        return;
                    }
                    
                    modal.classList.add('hidden');
                    showLoading("Guardando cambio de ciclo de vida...");
                    
                    try {
                        await GoogleAPI.changeTinaStage(tinaId, currentStage, newStage, obs);
                        hideLoading();
                        alert(`Etapa de ${name} actualizada a ${newStage} con éxito.`);
                        
                        // Re-render
                        this.renderFeeding(containerId, showLoading, hideLoading);
                    } catch (err) {
                        console.error(err);
                        hideLoading();
                        alert(`Error al actualizar ciclo de vida: ${err.message}`);
                    }
                });
            }

            // Submit transfer form
            const transferForm = document.getElementById('form-transfer-asset');
            if (transferForm) {
                transferForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    if (GoogleAPI.user.role === 'Observador') {
                        alert("Acceso denegado: El rol 'Observador' no puede realizar esta operación.");
                        return;
                    }
                    
                    const targetAsset = document.getElementById('transfer-target-asset').value;
                    const discardOld = document.getElementById('transfer-discard-origin').checked;
                    
                    if (!targetAsset) {
                        alert("Por favor, seleccione una tina de destino.");
                        return;
                    }
                    
                    const confirmMsg = `¿Estás seguro de que deseas traspasar el contenido de la tina ${tinaId} a la tina ${targetAsset}?` + 
                        (discardOld ? `\n\nATENCIÓN: La tina de origen ${tinaId} será dada de BAJA.` : `\n\nLa tina de origen ${tinaId} quedará Disponible.`);
                        
                    if (!confirm(confirmMsg)) return;
                    
                    modal.classList.add('hidden');
                    showLoading("Procesando traspaso de tina...");
                    
                    try {
                        await GoogleAPI.transferAsset(tinaId, targetAsset, discardOld);
                        hideLoading();
                        alert(`Traspaso de ${tinaId} a ${targetAsset} completado con éxito.`);
                        
                        // Re-render
                        this.renderFeeding(containerId, showLoading, hideLoading);
                    } catch (err) {
                        console.error(err);
                        hideLoading();
                        alert(`Error al traspasar bandeja: ${err.message}`);
                    }
                });
            }

            // Direct retire from detail modal (Disponible)
            const btnDetailRetire = document.getElementById('btn-detail-retire-asset');
            if (btnDetailRetire) {
                btnDetailRetire.addEventListener('click', async () => {
                    if (GoogleAPI.user.role === 'Observador') {
                        alert("Acceso denegado: El rol 'Observador' no puede realizar esta operación.");
                        return;
                    }
                    
                    if (!confirm(`¿Estás seguro de que deseas DAR DE BAJA la bandeja ${tinaId}?\n\nNo estará disponible para nuevos lotes.`)) return;
                    
                    modal.classList.add('hidden');
                    showLoading("Dando de baja bandeja...");
                    try {
                        await GoogleAPI.manageAsset([tinaId], 'Baja');
                        hideLoading();
                        alert(`¡Bandeja ${tinaId} dada de baja con éxito!`);
                        this.renderFeeding(containerId, showLoading, hideLoading);
                    } catch (err) {
                        console.error(err);
                        hideLoading();
                        alert(`Error al dar de baja bandeja: ${err.message}`);
                    }
                });
            }

            // Habilitación and range creations are deleted as assets are managed via manageAsset and startBatch.
            
        } catch (err) {
            console.error("Detail modal load error", err);
            hideLoading();
            alert(`Error al abrir ficha técnica: ${err.message}`);
        }
    }
};

// ==========================================================================
// Toast & Offline Sync Queue Modules
// ==========================================================================

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="toast-icon fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}"></i>
            <span>${message}</span>
        </div>
    `;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

const SyncQueue = {
    getQueue() {
        const queue = localStorage.getItem('bsf_sync_queue');
        return queue ? JSON.parse(queue) : [];
    },
    saveQueue(queue) {
        localStorage.setItem('bsf_sync_queue', JSON.stringify(queue));
    },
    enqueue(task) {
        const queue = this.getQueue();
        task.id = `TASK_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        task.timestamp = new Date().toISOString();
        queue.push(task);
        this.saveQueue(queue);
        this.updateSyncUI();
    },
    remove(taskId) {
        let queue = this.getQueue();
        queue = queue.filter(t => t.id !== taskId);
        this.saveQueue(queue);
        this.updateSyncUI();
    },
    updateSyncUI() {
        const queue = this.getQueue();
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) {
            if (queue.length > 0) {
                syncStatus.className = 'sync-status pending';
                syncStatus.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin"></i> ${queue.length} pendiente(s)`;
                syncStatus.title = `${queue.length} operaciones pendientes de sincronización. Haz clic para reintentar.`;
                syncStatus.style.cursor = 'pointer';
                syncStatus.onclick = (e) => {
                    e.stopPropagation();
                    this.processQueue();
                };
            } else {
                syncStatus.className = 'sync-status online';
                syncStatus.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Conectado';
                syncStatus.title = 'Sincronizado con Google Sheets';
                syncStatus.style.cursor = 'default';
                syncStatus.onclick = null;
            }
        }
    },
    async processQueue() {
        const queue = this.getQueue();
        if (queue.length === 0) return;
        
        showToast("Iniciando sincronización pendiente...", "info");
        let successCount = 0;
        let failedCount = 0;
        
        for (const task of queue) {
            try {
                await this.runTask(task);
                this.remove(task.id);
                successCount++;
            } catch (err) {
                console.error("Fallo al procesar tarea de cola:", task, err);
                failedCount++;
                if (this.isNetworkError(err)) {
                    showToast(`Red inestable. Quedan ${queue.length - successCount} pendientes.`, "error");
                    break;
                } else {
                    // Poison Pill: remove task from queue immediately if rejection from server
                    this.remove(task.id);
                    showToast(`Error al sincronizar: ${err.message || err}. Registro descartado por datos no válidos.`, "error");
                }
            }
        }
        
        if (successCount > 0) {
            showToast(`Sincronizados ${successCount} registros exitosamente.`, "success");
        }
        if (failedCount > 0) {
            showToast(`No se pudieron sincronizar ${failedCount} registros. Reintenta luego.`, "error");
        }
    },
    isNetworkError(err) {
        return !navigator.onLine || 
               err.message.includes('NetworkError') || 
               err.message.includes('Failed to fetch') ||
               err.message.includes('network error') ||
               err.message.includes('HttpError');
    },
    async runTask(task) {
        if (task.type === 'add-report') {
            await submitReportData(task.payload);
        } 
        else if (task.type === 'add-finance') {
            await GoogleAPI.appendSheetData('Finanzas!A:G', task.payload.financeValues);
        }
        else if (task.type === 'add-supply') {
            await submitSupplyData(task.payload);
        }
        else if (task.type === 'add-machinery') {
            await submitMachineryData(task.payload);
        }
        else if (task.type === 'add-sale') {
            await GoogleAPI.appendSheetData('Finanzas!A:G', [task.payload.txRow]);
        }
        else if (task.type === 'add-capital') {
            await GoogleAPI.appendSheetData('Finanzas!A:G', [task.payload.txRow]);
        }
        else if (task.type === 'add-clima') {
            await GoogleAPI.addClimaRecord(task.payload.temp, task.payload.hum, task.payload.obs);
        }
    }
};

async function executeBackgroundSubmit(type, payload, runAction) {
    if (!navigator.onLine) {
        showToast("Sin conexión. Guardado en la cola para sincronizar después.", "warning");
        SyncQueue.enqueue({ type, payload });
        return;
    }
    
    showToast("Guardando en segundo plano...", "info");
    try {
        await runAction();
        showToast("Registro guardado con éxito.", "success");
    } catch (err) {
        console.error(`Error al enviar ${type} en background:`, err);
        showToast("Error de conexión. Se guardó en la cola para reintento.", "warning");
        SyncQueue.enqueue({ type, payload });
    }
}

async function submitReportData(payload) {
    const photoIds = [];
    if (payload.localImages && payload.localImages.length > 0) {
        for (const img of payload.localImages) {
            let driveId;
            if (GoogleAPI.config.appsScriptUrl) {
                const response = await fetch(GoogleAPI.config.appsScriptUrl, {
                    method: 'POST',
                    mode: 'cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'uploadImage',
                        token: GoogleAPI.idToken,
                        base64Data: img.base64,
                        fileName: `${Date.now()}_${img.name}`,
                        mimeType: img.type,
                        folderId: GoogleAPI.config.driveFolderId
                    })
                });
                const res = await response.json();
                if (!res.success) throw new Error(res.error || "Fallo en subida");
                driveId = res.fileId;
            } else {
                const metadata = {
                    name: `${Date.now()}_${img.name}`,
                    mimeType: img.type,
                    parents: [GoogleAPI.config.driveFolderId]
                };
                const boundary = 'bsf_multipart_boundary';
                const delimiter = `\r\n--${boundary}\r\n`;
                const close_delim = `\r\n--${boundary}--`;
                const multipartRequestBody =
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    `Content-Type: ${img.type}\r\n` +
                    'Content-Transfer-Encoding: base64\r\n\r\n' +
                    img.base64 +
                    close_delim;
                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GoogleAPI.accessToken}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body: multipartRequestBody
                });
                const result = await response.json();
                try {
                    await gapi.client.drive.permissions.create({
                        fileId: result.id,
                        resource: { role: 'reader', type: 'anyone' }
                    });
                } catch (pErr) { console.warn(pErr); }
                driveId = result.id;
            }
            photoIds.push(driveId);
        }
    }
    
    const finalPhotosString = photoIds.join(',');
    payload.reportValues[0][3] = finalPhotosString;
    
    if (payload.isAlimentacion && payload.alimentacion) {
        let nextOrder = 1;
        try {
            const allLogs = await GoogleAPI.getFeedingLogs();
            const todayLogs = allLogs.slice(1).filter(log => log[2] && log[2].startsWith(payload.reportDateVal));
            nextOrder = todayLogs.length + 1;
        } catch (e) {
            console.warn("No se pudo consultar orden de alimentación", e);
        }
        
        const qtyPerTina = payload.alimentacion.totalQty / payload.alimentacion.selectedTinas.length;
        const feedingRows = payload.alimentacion.selectedTinas.map(tinaObj => {
            const tinaId = typeof tinaObj === 'object' ? tinaObj.id : tinaObj;
            const tinaCiclo = typeof tinaObj === 'object' ? tinaObj.cicloId : 'Ciclo Legacy';
            const row = [
                `FEED_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                tinaId,
                payload.formattedDate,
                nextOrder,
                payload.alimentacion.insumo,
                qtyPerTina,
                payload.username,
                `Alimentación registrada vía Reporte Diario ${payload.reportId} (${payload.alimentacion.feedUnit})`,
                tinaCiclo // 9th column
            ];
            nextOrder++;
            return row;
        });
        
        const supplyValues = [[
            `SUP_${Date.now()}_FEED_REP`,
            payload.reportId,
            payload.reportDateVal,
            payload.alimentacion.insumo,
            'Utilización',
            payload.alimentacion.totalQty,
            payload.alimentacion.feedUnit,
            0,
            'Sustrato',
            ''
        ]];
        
        await GoogleAPI.appendFeedingLogsBatch(feedingRows);
        await GoogleAPI.appendSheetData('Insumos!A:J', supplyValues);
    }
    
    await GoogleAPI.appendSheetData('Reportes!A:G', payload.reportValues);
}

async function submitSupplyData(payload) {
    if (payload.feedingRows && payload.feedingRows.length > 0) {
        await GoogleAPI.appendFeedingLogsBatch(payload.feedingRows);
    }
    await GoogleAPI.appendSheetData('Insumos!A:J', payload.supplyValues);
    if (payload.financeValues && payload.financeValues.length > 0) {
        await GoogleAPI.appendSheetData('Finanzas!A:G', payload.financeValues);
    }

    // Auto-sync Tinas on purchase
    try {
        const supplyVal = payload.supplyValues[0];
        if (supplyVal) {
            await checkAndSyncTinasOnPurchase(supplyVal[3], supplyVal[4], parseFloat(supplyVal[5]));
        }
    } catch (syncErr) {
        console.error("Error running checkAndSyncTinasOnPurchase in submitSupplyData:", syncErr);
    }
}

async function checkAndSyncTinasOnPurchase(supplyName, supplyAction, supplyQty) {
    if (supplyAction === 'Adición' && supplyQty > 0) {
        const nameLower = supplyName.toLowerCase();
        if (nameLower.includes('tina') || nameLower.includes('bandeja') || nameLower.includes('caja') || nameLower.includes('cama')) {
            const qty = Math.floor(supplyQty);
            if (qty > 0) {
                try {
                    const camas = await GoogleAPI.getCamas();
                    let maxId = 0;
                    for (let i = 1; i < camas.length; i++) {
                        const row = camas[i];
                        if (row && row[0]) {
                            const match = row[0].toString().trim().match(/^B-(\d+)$/i);
                            if (match) {
                                const num = parseInt(match[1], 10);
                                if (num > maxId) {
                                    maxId = num;
                                }
                            }
                        }
                    }
                    const assetIds = [];
                    for (let i = 1; i <= qty; i++) {
                        const nextNum = maxId + i;
                        const idStr = `B-${String(nextNum).padStart(3, '0')}`;
                        assetIds.push(idStr);
                    }
                    await GoogleAPI.manageAsset(assetIds, 'Alta');
                    console.log(`Auto-sincronización exitosa: ${qty} bandejas dadas de alta:`, assetIds);
                } catch (syncErr) {
                    console.error("Error al sincronizar cantidad de tinas con activos:", syncErr);
                }
            }
        }
    }
}

async function submitMachineryData(payload) {
    await GoogleAPI.appendSheetData('Maquinaria!A:H', [payload.row]);
    if (payload.financeValues && payload.financeValues.length > 0) {
        await GoogleAPI.appendSheetData('Finanzas!A:G', payload.financeValues);
    }
}

window.showToast = showToast;
window.SyncQueue = SyncQueue;
window.addEventListener('online', () => {
    SyncQueue.processQueue();
});
window.addEventListener('DOMContentLoaded', () => {
    SyncQueue.updateSyncUI();
    if (navigator.onLine) {
        SyncQueue.processQueue();
    }
});


