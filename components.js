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
            return `<div class="text-center text-secondary py-3">No hay tinas activas en este momento.</div>`;
        }
        const groupsMap = {};
        camas.forEach(c => {
            const groupName = c[4] || 'Sin Lote';
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
                            const name = c[1].replace('Cama', 'Tina');
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
    renderSetup(containerId, onSaveCallback) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="form-card card slide-in-view mt-3">
                <div class="text-center mb-3">
                    <div class="logo-icon-large"><i class="fa-solid fa-gears"></i></div>
                    <h2>Configuración de BSF BioManager</h2>
                    <p>Conecta la aplicación con tu cuenta de Google Cloud. Este paso es necesario una sola vez.</p>
                </div>
                <form id="setup-form" class="mt-3">
                    <div class="form-group">
                        <label class="form-label" for="setup-api-key">Google API Key</label>
                        <input type="text" id="setup-api-key" class="form-control" placeholder="AIzaSy..." required>
                        <small class="form-text text-secondary">Obtenida en Google Cloud Console para acceso público a datos.</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="setup-client-id">Google Client ID (OAuth 2.0)</label>
                        <input type="text" id="setup-client-id" class="form-control" placeholder="xxxxxx-xxxxxx.apps.googleusercontent.com" required>
                        <small class="form-text text-secondary">Para gestionar el inicio de sesión y autenticación segura.</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="setup-sheet-id">Google Spreadsheet ID (Base de Datos)</label>
                        <input type="text" id="setup-sheet-id" class="form-control" placeholder="1aBcDeFgHiJkLmNoPqRsTuVwXyZ..." required>
                        <small class="form-text text-secondary">Crea una hoja de cálculo vacía en Google Sheets y pega su ID aquí (lo encuentras en la URL de la hoja).</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="setup-folder-id">Google Drive Folder ID (Opcional)</label>
                        <input type="text" id="setup-folder-id" class="form-control" placeholder="Dejar en blanco para crear una nueva carpeta automáticamente">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="setup-script-url">Google Apps Script Web App URL (Opcional - Arquitectura Segura)</label>
                        <input type="text" id="setup-script-url" class="form-control" placeholder="https://script.google.com/macros/s/XXXXX/exec">
                        <small class="form-text text-secondary">Si se configura, la app utilizará esta API de forma segura y los operarios no requerirán acceso directo al Excel.</small>
                    </div>
                    <button type="submit" id="btn-save-setup" class="btn btn-primary btn-block mt-3">
                        <i class="fa-solid fa-floppy-disk"></i> Guardar y Conectar
                    </button>
                </form>
            </div>
        `;

        // Pre-fill if some settings exist
        if (GoogleAPI.config) {
            document.getElementById('setup-api-key').value = GoogleAPI.config.apiKey || '';
            document.getElementById('setup-client-id').value = GoogleAPI.config.clientId || '';
            document.getElementById('setup-sheet-id').value = GoogleAPI.config.spreadsheetId || '';
            document.getElementById('setup-folder-id').value = GoogleAPI.config.driveFolderId || '';
            document.getElementById('setup-script-url').value = GoogleAPI.config.appsScriptUrl || '';
        }

        document.getElementById('setup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const config = {
                apiKey: document.getElementById('setup-api-key').value.trim(),
                clientId: document.getElementById('setup-client-id').value.trim(),
                spreadsheetId: document.getElementById('setup-sheet-id').value.trim(),
                driveFolderId: document.getElementById('setup-folder-id').value.trim() || null,
                appsScriptUrl: document.getElementById('setup-script-url').value.trim() || null
            };
            onSaveCallback(config);
        });
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
            const reportRows = await GoogleAPI.getSheetData('Reportes!A:F');
            const camasRows = await GoogleAPI.getSheetData('Camas!A:E');
            const feedingRows = await GoogleAPI.getSheetData('Registro_Alimentacion!A:H');

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
            const activeTinas = camasRows.slice(1).filter(c => c[3] === 'Activo');
            const feedings = feedingRows.slice(1);
            const nowTime = new Date();

            activeTinas.forEach(tina => {
                const tinaId = tina[0];
                const tinaName = tina[1].replace('Cama', 'Tina');
                
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
            document.getElementById('btn-quick-report').addEventListener('click', () => {
                window.location.hash = '#add-report';
            });

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
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="slide-in-view">
                <!-- Planning Ribbon -->
                <div class="card p-3 mb-4 text-center" style="border-left: 4px solid var(--brand-primary); background-color: rgba(34, 197, 94, 0.05);">
                    <h4 style="color: var(--brand-primary);"><i class="fa-solid fa-clock-rotate-left"></i> MÓDULO PLANIFICADO PARA EL FUTURO</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Monitoreo de Climatología y Sensores Automáticos en Tiempo Real. Esta vista está diseñada para integrarse con sensores de IoT próximamente.
                    </p>
                </div>

                <!-- Climate Dashboard Layout -->
                <div class="dashboard-grid">
                    <!-- Room 1 (Neonatos / Larvas Jóvenes) -->
                    <div class="card p-4 text-center">
                        <h3 class="mb-3"><i class="fa-solid fa-door-closed text-success"></i> Sala 1: Maternidad y Eclosión</h3>
                        <p style="font-size: 0.8rem; color: var(--text-secondary);" class="mb-3">Optimizado para Huevos y Neonatos</p>
                        
                        <div style="display: flex; justify-content: space-around; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                            <!-- Temperature Meter -->
                            <div style="flex: 1;">
                                <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary);">Temperatura</div>
                                <div style="font-size: 2rem; font-weight: bold; color: var(--text-success); margin: 0.25rem 0;">28.5 °C</div>
                                <div style="height: 6px; width: 100%; background: var(--bg-primary); border-radius: 3px; overflow: hidden;">
                                    <div style="height: 100%; width: 75%; background: var(--text-success);"></div>
                                </div>
                                <small style="font-size: 0.7rem; color: var(--text-secondary);">Ideal (27-30°C)</small>
                            </div>
                            <!-- Humidity Meter -->
                            <div style="flex: 1;">
                                <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary);">Humedad</div>
                                <div style="font-size: 2rem; font-weight: bold; color: var(--text-success); margin: 0.25rem 0;">65 %</div>
                                <div style="height: 6px; width: 100%; background: var(--bg-primary); border-radius: 3px; overflow: hidden;">
                                    <div style="height: 100%; width: 65%; background: var(--text-success);"></div>
                                </div>
                                <small style="font-size: 0.7rem; color: var(--text-secondary);">Ideal (60-70%)</small>
                            </div>
                        </div>
                        <div class="alert-item success p-2 text-center" style="font-size: 0.8rem; display: block; border-radius: var(--radius-sm);">
                            <i class="fa-solid fa-circle-check"></i> Ambiente Estable
                        </div>
                    </div>

                    <!-- Room 2 (Crecimiento / Engorde) -->
                    <div class="card p-4 text-center">
                        <h3 class="mb-3"><i class="fa-solid fa-door-closed text-success"></i> Sala 2: Engorde de Larvas</h3>
                        <p style="font-size: 0.8rem; color: var(--text-secondary);" class="mb-3">Optimizado para Larvas Medianas y Grandes</p>
                        
                        <div style="display: flex; justify-content: space-around; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                            <!-- Temperature Meter -->
                            <div style="flex: 1;">
                                <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary);">Temperatura</div>
                                <div style="font-size: 2rem; font-weight: bold; color: var(--text-warning); margin: 0.25rem 0;">31.2 °C</div>
                                <div style="height: 6px; width: 100%; background: var(--bg-primary); border-radius: 3px; overflow: hidden;">
                                    <div style="height: 100%; width: 85%; background: var(--text-warning);"></div>
                                </div>
                                <small style="font-size: 0.7rem; color: var(--text-warning);">Caluroso (>30°C)</small>
                            </div>
                            <!-- Humidity Meter -->
                            <div style="flex: 1;">
                                <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary);">Humedad</div>
                                <div style="font-size: 2rem; font-weight: bold; color: var(--text-success); margin: 0.25rem 0;">61 %</div>
                                <div style="height: 6px; width: 100%; background: var(--bg-primary); border-radius: 3px; overflow: hidden;">
                                    <div style="height: 100%; width: 61%; background: var(--text-success);"></div>
                                </div>
                                <small style="font-size: 0.7rem; color: var(--text-secondary);">Ideal (60-70%)</small>
                            </div>
                        </div>
                        <div class="alert-item warning p-2 text-center" style="font-size: 0.8rem; display: block; border-radius: var(--radius-sm);">
                            <i class="fa-solid fa-triangle-exclamation"></i> Temperatura ligeramente alta
                        </div>
                    </div>
                </div>

                <!-- Sensor charts simulated -->
                <div class="card mt-4 p-4">
                    <h3 class="mb-3"><i class="fa-solid fa-chart-area text-success"></i> Gráficos Históricos Simulados</h3>
                    <div style="height: 250px; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); border-radius: var(--radius-sm); border: 1px dashed var(--border-color);">
                        <div class="text-center text-secondary">
                            <i class="fa-solid fa-chart-line" style="font-size: 3rem; margin-bottom: 0.75rem;"></i>
                            <p>El gráfico histórico de 24 horas aparecerá automáticamente al conectar los sensores.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
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
            camas = rawCamas.slice(1).filter(c => c[3] === 'Activo');
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
                                    <input type="number" id="report-feed-qty" class="form-control" placeholder="0.0" step="0.1" min="0.1">
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
                                <input type="number" id="finance-amount" class="form-control" placeholder="0.00" step="0.01" min="0.01" required>
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
                                <input type="number" id="supply-qty" class="form-control" placeholder="0.0" step="0.1" min="0.1" required>
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
                                 <input type="number" id="supply-cost" class="form-control" placeholder="Dejar vacío si no costó dinero" step="0.01" min="0">
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
                                 <input type="number" id="machinery-qty" class="form-control" value="1" min="1" step="1" required>
                             </div>
                             <div class="form-group">
                                 <label class="form-label" for="machinery-size">Tamaño / Capacidad (Opcional)</label>
                                 <input type="text" id="machinery-size" class="form-control" placeholder="Ej: Grande, 20L, Mediano">
                             </div>
                         </div>
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="machinery-cost">Precio de Compra ($)</label>
                                <input type="number" id="machinery-cost" class="form-control" placeholder="0.00" step="0.01" min="0" required>
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
                                <input type="number" id="sale-qty" class="form-control" placeholder="0.0" step="0.1" min="0.1" required>
                                ${this.renderQuickQtyButtons('sale-qty', false, 'unid')}
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="sale-price">Precio Unitario ($)</label>
                                <input type="number" id="sale-price" class="form-control" placeholder="0.00" step="0.01" min="0.01" required>
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
            </div>
        `;

        // Wire sub-tab switching
        const formTabs = document.querySelectorAll('#report-type-tabs .filter-tab');
        const secBitacora = document.getElementById('form-bitacora-section');
        const secFinanzas = document.getElementById('form-finanzas-section');
        const secInsumos = document.getElementById('form-insumos-section');
        const secMaquinaria = document.getElementById('form-maquinaria-section');
        const secIngresos = document.getElementById('form-ingresos-section');

        formTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                formTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const targetForm = tab.getAttribute('data-form');
                secBitacora.classList.add('hidden');
                secFinanzas.classList.add('hidden');
                secInsumos.classList.add('hidden');
                secMaquinaria.classList.add('hidden');
                secIngresos.classList.add('hidden');

                if (targetForm === 'section-bitacora') {
                    secBitacora.classList.remove('hidden');
                } else if (targetForm === 'section-finanzas') {
                    secFinanzas.classList.remove('hidden');
                } else if (targetForm === 'section-insumos') {
                    secInsumos.classList.remove('hidden');
                } else if (targetForm === 'section-maquinaria') {
                    secMaquinaria.classList.remove('hidden');
                } else if (targetForm === 'section-ingresos') {
                    secIngresos.classList.remove('hidden');
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
                document.getElementById('report-category').dispatchEvent(new Event('change'));
                const feedUnitInput = document.getElementById('report-feed-unit');
                if (feedUnitInput) {
                    feedUnitInput.dispatchEvent(new Event('change'));
                }
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
        const form = document.getElementById('add-report-form');
        if (form) {
            form.querySelectorAll('input, textarea, select').forEach(input => {
                input.addEventListener('input', saveReportDraft);
                input.addEventListener('change', saveReportDraft);
            });
            restoreReportDraft();
        }

        // FORM SUBMIT 1: DAILY REPORT & FEEDING (Bitácora)
        document.getElementById('add-report-form').addEventListener('submit', async (e) => {
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

                // 2. Prepare Report Row values
                const reportValues = [[
                    reportId,
                    formattedDate,
                    reportDesc,
                    '', // Resolved in background when uploading base64
                    reportCat,
                    GoogleAPI.user.name
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
                    isAlimentacion: reportCat === 'Alimentación',
                    alimentacion: reportCat === 'Alimentación' ? {
                        selectedTinas,
                        feedUnit: document.getElementById('report-feed-unit').value,
                        insumo,
                        totalQty
                    } : null
                };

                // Clear/Reset form immediately
                document.getElementById('add-report-form').reset();
                this.selectedFiles = [];
                previewContainer.innerHTML = '';
                localStorage.removeItem('bsf_report_draft');
                
                // Hide dynamic area again if category changes
                feedingReportDetails.classList.add('hidden');
                document.getElementById('report-feed-insumo').required = false;
                document.getElementById('report-feed-qty').required = false;
                container.querySelectorAll('.collab-select-card[data-prefix="report"]').forEach(c => c.classList.remove('selected'));
                container.querySelectorAll('.tina-select-card[data-prefix="report"]').forEach(c => c.classList.remove('selected'));
                
                // Redirect user immediately
                window.location.hash = '#reports-list';

                // Dispatch background submission
                executeBackgroundSubmit('add-report', payload, () => submitReportData(payload));

            } catch (err) {
                console.error("Report submit error", err);
                showToast(`Error al procesar formulario: ${err.message}`, "error");
            }
        });

        // FORM SUBMIT 2: FINANCES (Expenses)
        document.getElementById('add-finance-form').addEventListener('submit', async (e) => {
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
                document.getElementById('add-finance-form').reset();
                document.getElementById('finance-date').value = todayStr;
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

        // FORM SUBMIT 3: SUPPLIES (Warehouse)
        document.getElementById('add-supply-form').addEventListener('submit', async (e) => {
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
                        const row = [
                            `FEED_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                            tinaId,
                            formattedDate,
                            nextOrder,
                            supplyName,
                            qtyPerTina,
                            GoogleAPI.user.name,
                            `Alimentación manual vía Movimiento de Insumo ${supId} (${supplyUnit}) ${collabMeta}`
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
                document.getElementById('add-supply-form').reset();
                document.getElementById('supply-date').value = todayStr;
                container.querySelectorAll('.collab-select-card[data-prefix="supply"]').forEach(c => c.classList.remove('selected'));
                container.querySelectorAll('.tina-select-card[data-prefix="supply"]').forEach(c => c.classList.remove('selected'));
                
                // Show dynamic area again since action resets to "Utilización"
                supplyFeedingDetails.classList.remove('hidden');

                // Redirect immediately
                window.location.hash = '#supplies';

                // Dispatch background submission
                executeBackgroundSubmit('add-supply', payload, () => submitSupplyData(payload));

            } catch (err) {
                console.error("Supply submit error", err);
                showToast(`Error al registrar bodega: ${err.message}`, "error");
            }
        });

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
            const reportRows = await GoogleAPI.getSheetData('Reportes!A:F');
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
                            const reportRows = await GoogleAPI.getSheetData('Reportes!A:F');
                            const financeRows = await GoogleAPI.getSheetData('Finanzas!A:G');
                            const supplyRows = await GoogleAPI.getSheetData('Insumos!A:J');
                            const feedingRows = await GoogleAPI.getSheetData('Registro_Alimentacion!A:H');

                            // Find report row index
                            const repIdx = reportRows.findIndex(row => row[0] === repId);
                            if (repIdx !== -1) {
                                const repRow = reportRows[repIdx];
                                const repDetail = `Fecha: ${repRow[1]} | Categoria: ${repRow[4]} | Descripcion: ${repRow[2]} | Fotos: ${repRow[3] || 'Ninguna'}`;
                                
                                // Back up report deletion
                                await GoogleAPI.logDeletion('Reportes', repId, repRow[1], repDetail, reason);
                                
                                // Clear report row from Sheet (rowNumber is idx + 1)
                                await GoogleAPI.clearSheetRange(`Reportes!A${repIdx + 1}:F${repIdx + 1}`);
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
                                            <input type="number" id="m-supply-qty" class="form-control" step="0.1" required>
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

    /**
     * Render 6. Control y Alimentación de Camas (BSF)
     */
    async renderFeeding(containerId, showLoading, hideLoading) {
        const container = document.getElementById(containerId);
        container.innerHTML = `<div class="text-center py-5"><div class="bio-spinner"></div><p>Cargando control de tinas...</p></div>`;

        try {
            // 1. Fetch Camas (Tinas) and Feeding Logs
            const camasRows = await GoogleAPI.getCamas();
            const feedingRows = await GoogleAPI.getFeedingLogs();

            const camas = camasRows.slice(1).filter(row => row[0]); // Skip headers
            const logs = feedingRows.slice(1).filter(row => row[0]);

            // Extract unique Group names from Camas list (Column 5/Index 4)
            const groupsSet = new Set();
            camas.forEach(c => {
                const group = c[4] ? c[4].trim() : 'Sin Grupo';
                groupsSet.add(group);
            });
            const uniqueGroups = Array.from(groupsSet).sort();

            // Determine local date string (YYYY-MM-DD)
            const now = new Date();
            const offset = now.getTimezoneOffset();
            const localNow = new Date(now.getTime() - (offset*60*1000));
            const todayStr = localNow.toISOString().substring(0, 10);

            // Filter today's feeding logs to compute bed states
            const todayLogs = logs.filter(log => log[2] && log[2].startsWith(todayStr));
            
            // Map today's logs by Bed ID to easily check if fed today
            const todayFeedMap = {};
            todayLogs.forEach(log => {
                const bedId = log[1];
                const dateTimeStr = log[2]; // YYYY-MM-DD HH:MM:SS
                const orderNum = log[3];
                const insumo = log[4];
                const qty = log[5];
                
                const time = dateTimeStr.split(' ')[1] ? dateTimeStr.split(' ')[1].substring(0, 5) : '';
                todayFeedMap[bedId] = { time, orderNum, insumo, qty };
            });

            // If zero beds exist, render setup placeholder
            if (camas.length === 0) {
                container.innerHTML = `
                    <div class="card text-center p-5 slide-in-view">
                        <i class="fa-solid fa-shuttle-space text-secondary" style="font-size: 3.5rem; margin-bottom: 1.5rem;"></i>
                        <h3>No hay tinas registradas en el sistema</h3>
                        <p class="mb-4">Para comenzar a registrar alimentaciones, primero debes dar de alta las tinas de tu criadero.</p>
                        ${(GoogleAPI.user.role === 'Socio' || GoogleAPI.user.role === 'Administrador') ? `
                            <button id="btn-open-creator-first" class="btn btn-primary"><i class="fa-solid fa-wand-magic-sparkles"></i> Crear Tinas en Rango</button>
                        ` : '<p class="text-warning">Solo los administradores y socios pueden crear tinas en el sistema.</p>'}
                    </div>

                    <!-- Creation Modal Container (Placeholder) -->
                    <div id="cama-create-modal" class="modal-overlay hidden"></div>
                `;

                if (GoogleAPI.user.role === 'Socio' || GoogleAPI.user.role === 'Administrador') {
                    document.getElementById('btn-open-creator-first').addEventListener('click', () => {
                        this.showCamaCreatorModal(containerId, showLoading, hideLoading);
                    });
                }
                return;
            }

            const enabledCamas = camas.filter(c => c[3] !== 'Inactivo');
            const inactiveCount = camas.length - enabledCamas.length;

            // Render Core UI Frame with Sub-tabs
            container.innerHTML = `
                <div class="slide-in-view">
                    <!-- Main sub-tabs for Control de Tinas -->
                    <div class="filter-tabs mb-3" id="feeding-main-tabs" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="filter-tab active" data-tab="tinas-grid" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-border-all"></i> Tinas Activas</span>
                        <span class="filter-tab" data-tab="feeding-history" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;"><i class="fa-solid fa-clock-rotate-left"></i> Historial de Alimentación</span>
                    </div>
                    
                    <!-- Content sections wrapper -->
                    <div id="feeding-tabs-content">
                        <!-- SECTION A: TINAS GRID (ACTIVE) -->
                        <div id="tinas-grid-section">
                            <!-- Filter bar by Stage and Group -->
                            <div class="camas-filter-bar">
                                <div class="filter-tabs" id="cama-stage-tabs">
                                    <span class="filter-tab active" data-stage="Todas">Todas (${enabledCamas.length})</span>
                                    <span class="filter-tab" data-stage="Neonatos">Neonatos</span>
                                    <span class="filter-tab" data-stage="Pequeña">Pequeña</span>
                                    <span class="filter-tab" data-stage="Mediana">Mediana</span>
                                    <span class="filter-tab" data-stage="Grande">Grande</span>
                                    <span class="filter-tab" data-stage="Prepupa">Prepupa</span>
                                    <span class="filter-tab" data-stage="Disponible">Disponibles</span>
                                    <span class="filter-tab" data-stage="Inactivas" style="border-left: 1px solid var(--border-color); padding-left: 1rem; margin-left: 0.5rem; color: var(--text-warning);"><i class="fa-solid fa-power-off"></i> Por Habilitar (${inactiveCount})</span>
                                </div>

                                <div class="d-flex gap-2 align-items-center flex-wrap">
                                    <div class="form-group mb-0" style="margin-bottom: 0; min-width: 170px;">
                                        <select id="filter-group-select" class="form-control" style="padding: 0.5rem; font-size: 0.85rem;">
                                            <option value="Todos">-- Todos los Grupos --</option>
                                            ${uniqueGroups.map(g => `<option value="${g}">${g}</option>`).join('')}
                                        </select>
                                    </div>

                                    ${(GoogleAPI.user.role === 'Socio' || GoogleAPI.user.role === 'Administrador') ? `
                                        <button id="btn-open-cama-creator" class="btn btn-outline btn-sm" style="height: 38px;">
                                            <i class="fa-solid fa-plus"></i> Configurar Tinas
                                        </button>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- Search, Hide Fed checkbox, Select All -->
                            <div class="card p-3 mb-3" style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between;">
                                <div class="form-group mb-0" style="flex-grow: 1; max-width: 400px; margin-bottom: 0;">
                                    <input type="text" id="search-cama-input" class="form-control" placeholder="Buscar tina por ID o Nombre... (ej. Tina 25)">
                                </div>
                                <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
                                    <label style="display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; margin-bottom: 0;">
                                        <input type="checkbox" id="toggle-hide-fed" style="width: 17px; height: 17px; accent-color: var(--brand-primary);">
                                        Ocultar alimentadas hoy
                                    </label>
                                    <label style="display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; margin-bottom: 0;">
                                        <input type="checkbox" id="toggle-select-all" style="width: 17px; height: 17px; accent-color: var(--brand-primary);">
                                        Seleccionar filtradas
                                    </label>
                                </div>
                            </div>

                            <!-- Tinas Grid -->
                            <div class="camas-grid" id="camas-grid-container"></div>
                        </div>

                        <!-- SECTION B: FEEDING HISTORY -->
                        <div id="feeding-history-section" class="hidden">
                            <div class="card p-3 mb-3">
                                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                    <div class="filter-tabs" id="history-view-tabs" style="border: none; margin-bottom: 0; display: flex; gap: 0.5rem;">
                                        <span class="filter-tab active" data-view="all-feedings" style="cursor: pointer; padding: 0.35rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem;"><i class="fa-solid fa-list-ol"></i> Ver por Alimentaciones</span>
                                        <span class="filter-tab" data-view="by-tina" style="cursor: pointer; padding: 0.35rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem;"><i class="fa-solid fa-filter"></i> Ver por Número de Tina</span>
                                    </div>
                                    
                                    <!-- Selector de Tina (Oculto al inicio) -->
                                    <div id="history-tina-selector-wrapper" class="hidden" style="display: flex; align-items: center; gap: 0.5rem;">
                                        <label for="history-tina-select" class="form-label mb-0" style="font-size: 0.85rem; margin-bottom: 0; white-space: nowrap;">Seleccionar Tina:</label>
                                        <select id="history-tina-select" class="form-control" style="padding: 0.35rem 0.5rem; font-size: 0.85rem; width: 180px;">
                                            <option value="">-- Seleccionar Tina --</option>
                                            ${camas.map(c => `<option value="${c[0]}">${c[1].replace('Cama', 'Tina')} (${c[0]})</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Listado del historial -->
                            <div id="feeding-history-list-container"></div>
                        </div>
                    </div>

                    <!-- Floating Batch Action Bar -->
                    <div id="batch-action-bar" class="batch-action-bar hidden">
                        <span class="batch-action-text" id="batch-selected-count">0 tinas seleccionadas</span>
                        <button id="btn-batch-feed" class="btn btn-primary btn-sm">
                            <i class="fa-solid fa-seedling"></i> Alimentar Tinas
                        </button>
                    </div>

                    <!-- Creation Modal Container -->
                    <div id="cama-create-modal" class="modal-overlay hidden"></div>

                    <!-- Feeding Form Modal Container -->
                    <div id="cama-feed-modal" class="modal-overlay hidden"></div>
                    
                    <!-- Tina Detail Modal Container -->
                    <div id="tina-detail-modal" class="modal-overlay hidden"></div>
                </div>
            `;

            // Setup Event Listeners and render initial grid
            this.setupCamasControls(containerId, camas, logs, todayFeedMap, showLoading, hideLoading);

        } catch (err) {
            console.error("Feeding view render error", err);
            container.innerHTML = `<div class="card p-5 text-center"><p class="text-danger">Error al cargar panel de tinas: ${err.message}</p></div>`;
        }
    },

    /**
     * Bind controls, search filtering, tabs, checkboxes and dynamic grid updates
     */
    setupCamasControls(containerId, camas, logs, todayFeedMap, showLoading, hideLoading) {
        const grid = document.getElementById('camas-grid-container');
        const searchInput = document.getElementById('search-cama-input');
        const hideFedCheckbox = document.getElementById('toggle-hide-fed');
        const selectAllCheckbox = document.getElementById('toggle-select-all');
        const stageTabs = document.querySelectorAll('#cama-stage-tabs .filter-tab');
        const groupSelect = document.getElementById('filter-group-select');
        const batchBar = document.getElementById('batch-action-bar');
        const batchCount = document.getElementById('batch-selected-count');
        const batchFeedBtn = document.getElementById('btn-batch-feed');

        // Sub-tabs navigation
        const mainTabs = document.querySelectorAll('#feeding-main-tabs .filter-tab');
        const gridSection = document.getElementById('tinas-grid-section');
        const historySection = document.getElementById('feeding-history-section');
        const historyContainer = document.getElementById('feeding-history-list-container');
        const historyViewTabs = document.querySelectorAll('#history-view-tabs .filter-tab');
        const tinaSelectorWrapper = document.getElementById('history-tina-selector-wrapper');
        const tinaSelect = document.getElementById('history-tina-select');

        let selectedBeds = new Set();
        let currentFilterStage = 'Todas';
        let currentFilterGroup = 'Todos';
        let currentSearchQuery = '';
        let currentHideFed = false;
        let currentHistoryView = 'all-feedings'; // 'all-feedings' or 'by-tina'

        // Admin bed creator button binding
        const creatorBtn = document.getElementById('btn-open-cama-creator');
        if (creatorBtn) {
            creatorBtn.addEventListener('click', () => {
                this.showCamaCreatorModal(containerId, showLoading, hideLoading);
            });
        }

        // Main sub-tabs handler
        mainTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                mainTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const selectedTab = tab.getAttribute('data-tab');
                if (selectedTab === 'tinas-grid') {
                    gridSection.classList.remove('hidden');
                    historySection.classList.add('hidden');
                    updateBatchBar();
                } else {
                    gridSection.classList.add('hidden');
                    historySection.classList.remove('hidden');
                    batchBar.classList.add('hidden'); // Ocultar barra de lote en historial
                    drawHistory();
                }
            });
        });

        // History sub-tabs handler
        historyViewTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                historyViewTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentHistoryView = tab.getAttribute('data-view');
                
                if (currentHistoryView === 'all-feedings') {
                    tinaSelectorWrapper.classList.add('hidden');
                    drawHistory();
                } else {
                    tinaSelectorWrapper.classList.remove('hidden');
                    drawHistory();
                }
            });
        });

        tinaSelect.addEventListener('change', () => {
            drawHistory();
        });

        // Draw feeding history records
        const drawHistory = () => {
            if (currentHistoryView === 'all-feedings') {
                // List ALL feeding records sorted by date/time registration desc
                const sortedLogs = [...logs].sort((a, b) => new Date(b[2].replace(' ', 'T')) - new Date(a[2].replace(' ', 'T')));
                if (sortedLogs.length === 0) {
                    historyContainer.innerHTML = `<div class="card p-4 text-center text-secondary">No hay alimentaciones registradas en la base de datos.</div>`;
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
                                        <th>Tina</th>
                                        <th>Alimento</th>
                                        <th>Cantidad</th>
                                        <th>Operario</th>
                                        <th>Observación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sortedLogs.map(row => {
                                        const camaId = row[1];
                                        const details = camas.find(c => c[0] === camaId) || [camaId, camaId];
                                        const name = details[1].replace('Cama', 'Tina');
                                        const feedUnit = getFeedingUnit(row[7]);
                                        return `
                                            <tr>
                                                <td><strong>${row[2]}</strong></td>
                                                <td>
                                                    <span class="badge neonatos cursor-pointer" style="font-size:0.85rem; text-decoration: underline;" 
                                                          onclick="Components.showTinaDetailModal('${camaId}')">
                                                        ${name}
                                                    </span>
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
                // Filter by selected Tina
                const selectedTinaId = tinaSelect.value;
                if (!selectedTinaId) {
                    historyContainer.innerHTML = `<div class="card p-4 text-center text-secondary">Por favor, selecciona una tina del selector superior para visualizar sus alimentaciones.</div>`;
                    return;
                }
                
                const tinaLogs = logs.filter(row => row[1] === selectedTinaId);
                const sortedLogs = [...tinaLogs].sort((a, b) => new Date(b[2].replace(' ', 'T')) - new Date(a[2].replace(' ', 'T')));
                
                const details = camas.find(c => c[0] === selectedTinaId) || [selectedTinaId, selectedTinaId];
                const name = details[1].replace('Cama', 'Tina');
                
                if (sortedLogs.length === 0) {
                    historyContainer.innerHTML = `
                        <div class="card p-4 text-center text-secondary">
                            No se han registrado alimentaciones todavía para la <strong>${name} (${selectedTinaId})</strong>.
                        </div>
                    `;
                    return;
                }
                
                historyContainer.innerHTML = `
                    <div class="card">
                        <h4 class="mb-3"><i class="fa-solid fa-shuttle-space text-success"></i> Alimentaciones de ${name} (${selectedTinaId})</h4>
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

        // Render function based on current filters
        const drawGrid = () => {
            const filteredCamas = camas.filter(c => {
                const id = c[0];
                const stage = c[2];
                const status = c[3]; // 'Activo'/'Inactivo'/'Disponible'
                const group = c[4] ? c[4].trim() : 'Sin Grupo';

                // Handle Inactivas tab filter
                if (currentFilterStage === 'Inactivas') {
                    if (status !== 'Inactivo') return false;
                } else {
                    if (status === 'Inactivo') return false;
                    
                    // Handle stage and status filtering
                    if (currentFilterStage === 'Disponible') {
                        if (status !== 'Disponible') return false;
                    } else if (currentFilterStage !== 'Todas') {
                        if (stage !== currentFilterStage || status !== 'Activo') return false;
                    }
                }

                if (currentFilterGroup !== 'Todos' && group !== currentFilterGroup) return false;

                const isFed = todayFeedMap[id];
                if (currentHideFed && (isFed || status === 'Disponible')) return false;

                if (currentSearchQuery) {
                    const searchLower = currentSearchQuery.toLowerCase();
                    const matchId = id.toLowerCase().includes(searchLower);
                    const matchName = c[1].toLowerCase().includes(searchLower);
                    if (!matchId && !matchName) return false;
                }

                return true;
            });

            // If empty grid
            if (filteredCamas.length === 0) {
                grid.innerHTML = `<div style="grid-column: 1 / -1;" class="text-center py-5 text-secondary"><i class="fa-solid fa-magnifying-glass mb-2" style="font-size: 2rem;"></i><p>No se encontraron tinas con los filtros activos.</p></div>`;
                selectAllCheckbox.checked = false;
                return;
            }

            // Map and generate HTML
            grid.innerHTML = filteredCamas.map(c => {
                const id = c[0];
                const name = c[1].replace('Cama', 'Tina');
                const stage = c[2];
                const status = c[3]; // 'Activo'/'Inactivo'/'Disponible'
                const isFed = todayFeedMap[id];
                const isChecked = selectedBeds.has(id);

                if (status === 'Inactivo') {
                    return `
                        <div class="cama-card pending" data-id="${id}" style="cursor: pointer; border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.02); opacity: 0.85;">
                            <div style="width: 17px; height: 17px;"></div>
                            <div class="cama-number" style="color: var(--text-secondary);">${name}</div>
                            <span class="cama-badge" style="background-color: rgba(239, 68, 68, 0.15); color: #ef4444;">Inhabilitada</span>
                            <div class="cama-status-indicator" style="color: var(--text-secondary);">
                                <i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i>
                                <span>Fuera de servicio</span>
                            </div>
                            <button class="btn btn-outline btn-sm btn-enable-tina" data-id="${id}" ${GoogleAPI.user.role === 'Observador' ? 'disabled' : ''} style="position: relative; z-index: 2; border-color: var(--brand-primary); color: var(--brand-primary);">
                                <i class="fa-solid fa-square-check"></i> Habilitar Tina
                            </button>
                        </div>
                    `;
                }

                if (status === 'Disponible') {
                    return `
                        <div class="cama-card pending" data-id="${id}" style="cursor: pointer; border: 1px dashed var(--border-color); opacity: 0.85;">
                            <div style="width: 17px; height: 17px;"></div>
                            <div class="cama-number" style="color: var(--text-secondary);">${name}</div>
                            <span class="cama-badge disponible">Disponible</span>
                            <div class="cama-status-indicator" style="color: var(--text-secondary);">
                                <i class="fa-solid fa-circle-minus"></i>
                                <span>Vacía (Listo para usar)</span>
                            </div>
                            <button class="btn btn-outline btn-sm btn-start-cycle-tina" data-id="${id}" ${GoogleAPI.user.role === 'Observador' ? 'disabled' : ''} style="position: relative; z-index: 2; border-color: var(--brand-primary); color: var(--brand-primary);">
                                <i class="fa-solid fa-play"></i> Iniciar Ciclo
                            </button>
                        </div>
                    `;
                }

                return `
                    <div class="cama-card ${isFed ? 'fed' : 'pending'}" data-id="${id}" style="cursor: pointer;">
                        <input type="checkbox" class="cama-card-checkbox" data-id="${id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; position: relative; z-index: 2;">
                        <div class="cama-number">${name}</div>
                        <span class="cama-badge ${stage.toLowerCase().replace(/ /g, '-').replace(/ñ/g, 'n')}">${stage}</span>
                        <div class="cama-status-indicator ${isFed ? 'fed' : ''}">
                            ${isFed ? `
                                <i class="fa-solid fa-circle-check"></i>
                                <span>Alimentada: ${isFed.time} (${isFed.orderNum}º)</span>
                            ` : `
                                <i class="fa-solid fa-circle-minus"></i>
                                <span>Pendiente hoy</span>
                            `}
                        </div>
                        <button class="btn btn-outline btn-sm btn-quick-feed-cama cama-feed-btn" data-id="${id}" ${GoogleAPI.user.role === 'Observador' ? 'disabled' : ''} style="position: relative; z-index: 2;">
                            <i class="fa-solid fa-seedling"></i> ${isFed ? 'Re-alimentar' : 'Alimentar'}
                        </button>
                    </div>
                `;
            }).join('');

            // Wire events inside cards
            grid.querySelectorAll('.cama-card').forEach(card => {
                const id = card.getAttribute('data-id');
                const chk = card.querySelector('.cama-card-checkbox');
                const quickFeedBtn = card.querySelector('.btn-quick-feed-cama');
                const startCycleBtn = card.querySelector('.btn-start-cycle-tina');
                const enableTinaBtn = card.querySelector('.btn-enable-tina');

                // Checkbox toggle
                if (chk) {
                    chk.addEventListener('change', (e) => {
                        e.stopPropagation();
                        if (chk.checked) selectedBeds.add(id);
                        else selectedBeds.delete(id);
                        updateBatchBar();
                    });
                }

                // Clicking card opens the Ficha Técnica detail modal
                card.addEventListener('click', (e) => {
                    if (e.target.closest('button') || e.target.closest('.cama-card-checkbox')) return;
                    this.showTinaDetailModal(containerId, id, camas, todayFeedMap, showLoading, hideLoading);
                });

                // Quick feeding button
                if (quickFeedBtn) {
                    quickFeedBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (GoogleAPI.user.role === 'Observador') return;
                        this.showCamaFeedingModal(containerId, [id], todayFeedMap, showLoading, hideLoading, camas);
                    });
                }

                // Start cycle button
                if (startCycleBtn) {
                    startCycleBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showTinaDetailModal(containerId, id, camas, todayFeedMap, showLoading, hideLoading);
                    });
                }

                // Enable tina button
                if (enableTinaBtn) {
                    enableTinaBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (GoogleAPI.user.role === 'Observador') return;
                        
                        showLoading("Habilitando tina...");
                        try {
                            await GoogleAPI.enableTina(id);
                            hideLoading();
                            alert(`¡Tina ${id.replace('TIN-', '')} habilitada con éxito! Ahora puedes iniciar su ciclo.`);
                            
                            this.renderFeeding(containerId, showLoading, hideLoading); // Re-render
                        } catch (err) {
                            console.error(err);
                            hideLoading();
                            alert(`Error al habilitar tina: ${err.message}`);
                        }
                    });
                }
            });
        };

        // Batch Action Bar coordinator
        const updateBatchBar = () => {
            const selectedFilteredCount = Array.from(selectedBeds).filter(id => camas.some(c => c[0] === id)).length;

            if (selectedFilteredCount > 0 && gridSection.classList.contains('hidden') === false) {
                batchCount.textContent = `${selectedFilteredCount} tina(s) seleccionada(s)`;
                batchBar.classList.remove('hidden');
            } else {
                batchBar.classList.add('hidden');
            }
        };

        // Filter tabs binding (Stage)
        stageTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                stageTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilterStage = tab.getAttribute('data-stage');
                drawGrid();
            });
        });

        // Filter dropdown binding (Group)
        groupSelect.addEventListener('change', () => {
            currentFilterGroup = groupSelect.value;
            drawGrid();
        });

        // Search input binding
        searchInput.addEventListener('input', () => {
            currentSearchQuery = searchInput.value.trim();
            drawGrid();
        });

        // Hide fed toggle binding
        hideFedCheckbox.addEventListener('change', () => {
            currentHideFed = hideFedCheckbox.checked;
            drawGrid();
        });

        // Select All toggle binding
        selectAllCheckbox.addEventListener('change', () => {
            const visibleCamas = camas.filter(c => {
                const id = c[0];
                const stage = c[2];
                const status = c[3];
                const group = c[4] ? c[4].trim() : 'Sin Grupo';
                
                if (status === 'Inactivo') return false;
                if (status === 'Disponible') return false; // Exclude empty tubs
                
                if (currentFilterStage !== 'Todas' && stage !== currentFilterStage) return false;
                if (currentFilterGroup !== 'Todos' && group !== currentFilterGroup) return false;
                if (currentHideFed && todayFeedMap[id]) return false;
                if (currentSearchQuery) {
                    const searchLower = currentSearchQuery.toLowerCase();
                    if (!id.toLowerCase().includes(searchLower) && !c[1].toLowerCase().includes(searchLower)) return false;
                }
                return true;
            });

            if (selectAllCheckbox.checked) {
                visibleCamas.forEach(c => selectedBeds.add(c[0]));
            } else {
                visibleCamas.forEach(c => selectedBeds.delete(c[0]));
            }

            drawGrid();
            updateBatchBar();
        });

        // Batch Feed trigger
        batchFeedBtn.addEventListener('click', () => {
            if (GoogleAPI.user.role === 'Observador') return;
            const bedsList = Array.from(selectedBeds);
            this.showCamaFeedingModal(containerId, bedsList, todayFeedMap, showLoading, hideLoading, camas);
        });

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

    /**
     * Show Modal for quick-feeding one or more beds with observations and individual tweaks
     */
    showCamaFeedingModal(containerId, camasIds, todayFeedMap, showLoading, hideLoading, camas) {
        const modal = document.getElementById('cama-feed-modal');

        // Create quick lookup map for names and groups
        const camaDetailsMap = {};
        camas.forEach(c => {
            camaDetailsMap[c[0]] = { name: c[1].replace('Cama', 'Tina'), group: c[4] || 'Sin Grupo' };
        });

        const defaultQty = 1.0;

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 600px;">
                <div class="modal-header" style="background-color: var(--brand-primary); color: #090d16;">
                    <i class="fa-solid fa-seedling"></i>
                    <h3>Registrar Alimentación (Tinas)</h3>
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
                                <label class="form-label" for="feed-qty">Dosis General (kg/tina)</label>
                                <input type="number" id="feed-qty" class="form-control" placeholder="1.0" step="0.1" value="${defaultQty}" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="feed-observacion-general">Observación General de Alimentación</label>
                            <input type="text" id="feed-observacion-general" class="form-control" placeholder="Ej: Mezcla seca de salvado. Clima cálido hoy.">
                        </div>

                        <!-- INDIVIDUAL BED BREAKDOWN -->
                        <div class="section-divider" style="margin: 1rem 0;"></div>
                        <label class="form-label" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                            <span>Desglose y Notas por Tina (${camasIds.length})</span>
                            <small class="text-secondary">Opcional: puedes cambiar dosis o añadir notas por tina</small>
                        </label>

                        <!-- Beds List scroll wrapper -->
                        <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 1.25rem; background-color: var(--bg-primary); padding: 0.25rem;">
                            ${camasIds.map(id => {
                                const details = camaDetailsMap[id] || { name: id, group: 'Sin Grupo' };
                                return `
                                    <div class="d-flex align-items-center justify-content-between p-2 border-bottom modal-cama-row" data-id="${id}" style="gap: 0.5rem; border-bottom-color: var(--border-color); flex-wrap: wrap;">
                                        <div style="display: flex; flex-direction: column; min-width: 90px;">
                                            <span style="font-size: 0.85rem; font-weight: 600;">${details.name}</span>
                                            <span style="font-size: 0.7rem; color: var(--text-secondary);">${details.group}</span>
                                        </div>
                                        <div style="display: flex; gap: 0.5rem; align-items: center; flex-grow: 1;">
                                            <input type="number" class="form-control form-control-sm individual-qty" data-id="${id}" value="${defaultQty}" step="0.1" style="width: 70px; margin-bottom: 0; padding: 0.35rem 0.5rem; font-size: 0.8rem;" required>
                                            <span style="font-size: 0.75rem; color: var(--text-secondary); margin-right: 0.25rem;">kg</span>
                                            <input type="text" class="form-control form-control-sm individual-obs" data-id="${id}" placeholder="Nota tina (ej. larva lenta, humedad alta)" style="flex-grow: 1; margin-bottom: 0; padding: 0.35rem 0.5rem; font-size: 0.8rem;">
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

        // Dynamic synchronization between general qty input and individual inputs
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
                // 1. Fetch current feeding logs to calculate starting order
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

                // 2. Map through each row in modal to collect individual qty and notes
                let totalQtyUsed = 0;
                const rowsHTML = modal.querySelectorAll('.modal-cama-row');
                const feedingRows = Array.from(rowsHTML).map(row => {
                    const bedId = row.getAttribute('data-id');
                    const qty = parseFloat(row.querySelector('.individual-qty').value) || 0;
                    const specificObs = row.querySelector('.individual-obs').value.trim();
                    totalQtyUsed += qty;

                    // Concatenate general notes and specific bed observations
                    let finalObs = '';
                    if (generalObs && specificObs) {
                        finalObs = `[Gral: ${generalObs}] - ${specificObs}`;
                    } else if (generalObs) {
                        finalObs = generalObs;
                    } else if (specificObs) {
                        finalObs = `[Tina: ${specificObs}]`;
                    }

                    const record = [
                        `FEED_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                        bedId,
                        dateTimeStr,
                        nextOrder,
                        insumo,
                        qty,
                        GoogleAPI.user.name,
                        finalObs
                    ];
                    nextOrder++;
                    return record;
                });

                // Write batch to Sheets
                await GoogleAPI.appendFeedingLogsBatch(feedingRows);

                // 3. Register total stock decrease in Insumos
                const supplyValues = [[
                    `SUP_${Date.now()}_FEED_GRP`,
                    'MANUAL',
                    todayPrefix,
                    insumo,
                    'Utilización',
                    totalQtyUsed,
                    'kg',
                    0
                ]];
                await GoogleAPI.appendSheetData('Insumos!A:H', supplyValues);

                hideLoading();
                alert(`¡Alimentación registrada para ${camasIds.length} tina(s). Total alimento utilizado: ${totalQtyUsed.toFixed(1)} kg.`);
                
                // Clear batch selection bar
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
     * Show Modal for creating a range of camas
     */
    showCamaCreatorModal(containerId, showLoading, hideLoading) {
        const modal = document.getElementById('cama-create-modal');

        modal.innerHTML = `
            <div class="modal-card">
                <div class="modal-header" style="background-color: var(--brand-primary); color: #090d16;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    <h3>Configuración de Tinas (Rango)</h3>
                </div>
                <div class="modal-body">
                    <p class="mb-3">Genera múltiples tinas automáticamente. Ideal para dar de alta estanterías enteras.</p>
                    <form id="modal-cama-form">
                        <div class="form-group">
                            <label class="form-label" for="c-prefix">Prefijo de ID</label>
                            <input type="text" id="c-prefix" class="form-control" value="TIN" placeholder="Ej: TIN" required>
                        </div>
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="c-start">Tina Inicial (Número)</label>
                                <input type="number" id="c-start" class="form-control" value="1" min="1" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="c-end">Tina Final (Número)</label>
                                <input type="number" id="c-end" class="form-control" value="100" min="1" required>
                            </div>
                        </div>
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="c-stage">Etapa Larva Inicial</label>
                                <select id="c-stage" class="form-control" required>
                                    <option value="Neonatos">Neonatos (1-5 días)</option>
                                    <option value="Pequeña">Pequeña (Larva joven)</option>
                                    <option value="Mediana">Mediana (Crecimiento)</option>
                                    <option value="Grande">Grande (Engorde final)</option>
                                    <option value="Prepupa">Prepupa</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="c-group">Grupo / Estante</label>
                                <input type="text" id="c-group" class="form-control" value="Grupo A" placeholder="Ej: Estante A, Lote 1" required>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0; border: none; background: transparent;">
                            <button type="button" id="btn-c-cancel" class="btn btn-secondary">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Generar Tinas</button>
                        </div>
                    </form>
                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed var(--border-color);">
                        <h4 class="text-danger mb-2" style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Zona de Peligro (Reinicio)</h4>
                        <p style="font-size: 0.85rem; color: var(--text-secondary);" class="mb-3">
                            Esto borrará permanentemente todas las tinas, alimentaciones, etapas, reportes, contabilidad e inventario para iniciar el sistema desde cero.
                        </p>
                        <button type="button" id="btn-reset-database" class="btn btn-sm mb-3" style="background-color: #ef4444; border-color: #ef4444; color: white; width: 100%; margin-bottom: 0.75rem;">
                            <i class="fa-solid fa-trash-can"></i> Reiniciar Todo el Sistema
                        </button>
                        
                        <p style="font-size: 0.85rem; color: var(--text-secondary);" class="mt-2 mb-2">
                            O desactiva todas las tinas para reconfigurar el criadero desde cero (mantiene los reportes históricos pero inhabilita todas las tinas).
                        </p>
                        <button type="button" id="btn-disable-all-tinas" class="btn btn-sm" style="background-color: var(--text-warning); border-color: var(--text-warning); color: #090d16; width: 100%; font-weight: bold;">
                            <i class="fa-solid fa-power-off"></i> Inhabilitar Todas las Tinas
                        </button>
                    </div>

                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed var(--border-color);">
                        <h4 class="mb-2" style="color: var(--brand-primary);"><i class="fa-solid fa-key"></i> Credenciales de Google API</h4>
                        <p style="font-size: 0.85rem; color: var(--text-secondary);" class="mb-3">
                            Copia estos códigos para rellenar el archivo <code>config.js</code>:
                        </p>
                        <div style="font-size: 0.8rem; background: var(--bg-primary); padding: 0.75rem; border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 0.5rem; word-break: break-all; user-select: all; text-align: left;">
                            <div><strong>Google API Key:</strong> <br><span style="font-family: monospace; color: var(--text-warning);">${GoogleAPI.config?.apiKey || ''}</span></div>
                            <div class="mt-2"><strong>Google Client ID:</strong> <br><span style="font-family: monospace; color: var(--text-warning);">${GoogleAPI.config?.clientId || ''}</span></div>
                            <div class="mt-2"><strong>Spreadsheet ID:</strong> <br><span style="font-family: monospace; color: var(--text-warning);">${GoogleAPI.config?.spreadsheetId || ''}</span></div>
                            <div class="mt-2"><strong>Drive Folder ID:</strong> <br><span style="font-family: monospace; color: var(--text-warning);">${GoogleAPI.config?.driveFolderId || ''}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        const cancelBtn = document.getElementById('btn-c-cancel');
        cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

        const resetBtn = document.getElementById('btn-reset-database');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                const confirmation = confirm("¿Estás absolutamente seguro de que deseas REINICIAR todo el sistema?\n\nEsta acción eliminará de forma permanente todas las tinas, bitácoras, transacciones contables e inventario de insumos. No se puede deshacer.");
                if (!confirmation) return;
                
                const typeConfirm = prompt("Por seguridad, escribe 'REINICIAR TODO' en mayúsculas para proceder:");
                if (typeConfirm !== 'REINICIAR TODO') {
                    alert("Confirmación incorrecta. Operación cancelada.");
                    return;
                }
                
                modal.classList.add('hidden');
                showLoading("Reiniciando base de datos completa...");
                
                try {
                    await GoogleAPI.resetDatabase();
                    hideLoading();
                    alert("¡El sistema ha sido reiniciado por completo! La base de datos está en blanco.");
                    
                    // Redirect to home and refresh to trigger setup / blank state
                    window.location.hash = '#feeding';
                    window.location.reload();
                } catch (err) {
                    console.error("Database reset error", err);
                    hideLoading();
                    const errMsg = err.result?.error?.message || err.message || (typeof err === 'object' ? JSON.stringify(err) : err) || "Error desconocido";
                    alert(`Error al reiniciar la base de datos: ${errMsg}`);
                }
            });
        }

        const disableAllBtn = document.getElementById('btn-disable-all-tinas');
        if (disableAllBtn) {
            disableAllBtn.addEventListener('click', async () => {
                const confirmation = confirm("¿Estás seguro de que deseas INHABILITAR todas las tinas?\n\nEsto cambiará el estado de todas las tinas a 'Inactivo' y tendrás que habilitar manualmente cada una para iniciar nuevos ciclos.");
                if (!confirmation) return;
                
                modal.classList.add('hidden');
                showLoading("Inhabilitando todas las tinas...");
                
                try {
                    await GoogleAPI.disableAllTinas();
                    hideLoading();
                    alert("¡Todas las tinas han sido inhabilitadas con éxito!");
                    
                    window.location.hash = '#feeding';
                    window.location.reload();
                } catch (err) {
                    console.error("Disable all tinas error", err);
                    hideLoading();
                    const errMsg = err.result?.error?.message || err.message || (typeof err === 'object' ? JSON.stringify(err) : err) || "Error desconocido";
                    alert(`Error al inhabilitar tinas: ${errMsg}`);
                }
            });
        }

        const form = document.getElementById('modal-cama-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            modal.classList.add('hidden');
            showLoading("Generando tinas en base de datos de Sheets...");

            try {
                const prefix = document.getElementById('c-prefix').value.trim();
                const start = parseInt(document.getElementById('c-start').value);
                const end = parseInt(document.getElementById('c-end').value);
                const stage = document.getElementById('c-stage').value;
                const group = document.getElementById('c-group').value.trim();

                if (end < start) {
                    throw new Error("La tina final no puede ser menor que la inicial.");
                }

                if ((end - start) > 1000) {
                    throw new Error("Por seguridad, el límite máximo por lote es de 1000 tinas.");
                }

                // Call GoogleAPI batch creator with group parameter
                await GoogleAPI.createCamasRange(start, end, prefix, stage, group);

                hideLoading();
                alert(`¡Tinas del ${start} al ${end} generadas en el ${group} con éxito!`);
                this.renderFeeding(containerId, showLoading, hideLoading); // Refresh

            } catch (err) {
                console.error("Camas range creation error", err);
                hideLoading();
                alert(`Error al generar tinas: ${err.message}`);
            }
        });
    },

    /**
     * Show detailed Tina Ficha Técnica
     */
    async showTinaDetailModal(containerId, tinaId, camas, todayFeedMap, showLoading, hideLoading) {
        showLoading("Cargando Ficha Técnica...");
        
        try {
            const details = camas.find(c => c[0] === tinaId) || [tinaId, `Tina ${tinaId}`, 'Neonatos', 'Activo', 'Sin Grupo'];
            const name = details[1].replace('Cama', 'Tina');
            const currentStage = details[2];
            const estado = details[3];
            const grupo = details[4] || 'Sin Grupo';
            
            // Fetch feedings and stages
            const allFeedings = await GoogleAPI.getFeedingLogs();
            const allStages = await GoogleAPI.getEtapasLogs();
            
            const tinaFeedings = allFeedings.slice(1).filter(f => f[1] === tinaId);
            const tinaStages = allStages.slice(1).filter(s => s[1] === tinaId);
            
            // Sort stages ascending to calculate durations
            const sortedStages = [...tinaStages].sort((a, b) => new Date(a[2].replace(' ', 'T')) - new Date(b[2].replace(' ', 'T')));
            
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

                        <!-- Update lifecycle stage, Start cycle, or Enable (Form) -->
                        ${GoogleAPI.user.role !== 'Observador' ? (
                            estado === 'Inactivo' ? `
                                <div class="card p-3 mb-4" style="border: 1px solid var(--text-warning); background-color: var(--bg-primary);">
                                    <h4 class="mb-3 text-warning"><i class="fa-solid fa-square-check"></i> Habilitar Tina para Uso</h4>
                                    <p style="font-size: 0.85rem; color: var(--text-secondary);" class="mb-3">
                                        Esta tina se encuentra inhabilitada (fuera de servicio). Para poder iniciar un nuevo ciclo de cría en ella, debes habilitarla manualmente.
                                    </p>
                                    <button type="button" id="btn-modal-enable-tina" class="btn btn-warning btn-sm" style="width: auto; font-weight: bold;">
                                        <i class="fa-solid fa-square-check"></i> Habilitar Tina ahora
                                    </button>
                                </div>
                            ` : (
                                estado === 'Disponible' ? `
                                    <div class="card p-3 mb-4" style="border: 1px solid var(--brand-primary); background-color: var(--bg-primary);">
                                        <h4 class="mb-3"><i class="fa-solid fa-play text-success"></i> Iniciar Nuevo Ciclo de Cría</h4>
                                        <form id="form-start-cycle">
                                            <div class="form-row-2">
                                                <div class="form-group mb-0">
                                                    <label class="form-label" for="start-initial-stage">Etapa Inicial</label>
                                                    <select id="start-initial-stage" class="form-control" style="padding: 0.5rem;" required>
                                                        <option value="Neonatos">Neonatos (1-5 días)</option>
                                                        <option value="Pequeña">Pequeña (larva joven)</option>
                                                        <option value="Mediana">Mediana (crecimiento)</option>
                                                        <option value="Grande">Grande (engorde)</option>
                                                        <option value="Prepupa">Prepupa</option>
                                                    </select>
                                                </div>
                                                <div class="form-group mb-0">
                                                    <label class="form-label" for="start-group">Grupo / Estante</label>
                                                    <input type="text" id="start-group" class="form-control" value="${grupo}" placeholder="Ej: Estante A">
                                                </div>
                                            </div>
                                            <div class="form-group mt-3">
                                                <label class="form-label" for="start-obs">Observación Inicial</label>
                                                <input type="text" id="start-obs" class="form-control" placeholder="Ej: Iniciando lote con 20g de huevos">
                                            </div>
                                            <button type="submit" class="btn btn-primary btn-sm mt-3" style="width: auto;">
                                                <i class="fa-solid fa-play"></i> Iniciar Ciclo Activo
                                            </button>
                                        </form>
                                    </div>
                                ` : `
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
                                                        <optgroup label="Cosechas Totales (Terminan Ciclo)">
                                                            <option value="Cosecha Total de Larvas">Cosecha Total de Larvas (Finaliza ciclo)</option>
                                                            <option value="Cosecha Total de Pupas">Cosecha Total de Pupas (Finaliza ciclo)</option>
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
                                `
                            )
                        ) : ''}

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
            
            // Submit start cycle form
            const startForm = document.getElementById('form-start-cycle');
            if (startForm) {
                startForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const initialStage = document.getElementById('start-initial-stage').value;
                    const newGroup = document.getElementById('start-group').value.trim() || 'Sin Grupo';
                    const obs = document.getElementById('start-obs').value.trim();
                    
                    modal.classList.add('hidden');
                    showLoading("Iniciando nuevo ciclo de cría...");
                    
                    try {
                        await GoogleAPI.startNewCycle(tinaId, initialStage, newGroup, obs);
                        hideLoading();
                        alert(`¡Nuevo ciclo de cría iniciado en la tina ${tinaId} con etapa ${initialStage}!`);
                        
                        // Re-render
                        this.renderFeeding(containerId, showLoading, hideLoading);
                    } catch (err) {
                        console.error(err);
                        hideLoading();
                        alert(`Error al iniciar ciclo de cría: ${err.message}`);
                    }
                });
            }
            
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

            // Submit enable tina button in modal
            const modalEnableBtn = document.getElementById('btn-modal-enable-tina');
            if (modalEnableBtn) {
                modalEnableBtn.addEventListener('click', async () => {
                    modal.classList.add('hidden');
                    showLoading("Habilitando tina...");
                    
                    try {
                        await GoogleAPI.enableTina(tinaId);
                        hideLoading();
                        alert(`¡Tina ${tinaId} habilitada con éxito! Ahora puedes iniciar su ciclo.`);
                        
                        // Re-render
                        this.renderFeeding(containerId, showLoading, hideLoading);
                    } catch (err) {
                        console.error(err);
                        hideLoading();
                        alert(`Error al habilitar tina: ${err.message}`);
                    }
                });
            }
            
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
        const feedingRows = payload.alimentacion.selectedTinas.map(tinaId => {
            const row = [
                `FEED_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                tinaId,
                payload.formattedDate,
                nextOrder,
                payload.alimentacion.insumo,
                qtyPerTina,
                payload.username,
                `Alimentación registrada vía Reporte Diario ${payload.reportId} (${payload.alimentacion.feedUnit})`
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
    
    await GoogleAPI.appendSheetData('Reportes!A:F', payload.reportValues);
}

async function submitSupplyData(payload) {
    if (payload.feedingRows && payload.feedingRows.length > 0) {
        await GoogleAPI.appendFeedingLogsBatch(payload.feedingRows);
    }
    await GoogleAPI.appendSheetData('Insumos!A:J', payload.supplyValues);
    if (payload.financeValues && payload.financeValues.length > 0) {
        await GoogleAPI.appendSheetData('Finanzas!A:G', payload.financeValues);
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


