/**
 * BSF BioManager - Google API Integration (OAuth, Drive, Sheets)
 * Handles client-side connection with Google Services
 */

const GoogleAPI = {
    // Config values (retrieved from localStorage)
    config: null,
    
    // GAPI and GSI Client instances
    tokenClient: null,
    gapiInitialized: false,
    gsiInitialized: false,
    accessToken: null,
    
    // Client-side cache
    clientCache: {},
    cacheExpiryMs: 60000, // 60 seconds (1 minute)

    getSheetNameFromRange(range) {
        if (!range) return '';
        const parts = range.split('!');
        return parts[0].replace(/['"]/g, '');
    },

    invalidateCacheForSheet(sheetName) {
        if (!sheetName) return;
        const normalized = sheetName.toLowerCase();
        for (const key in this.clientCache) {
            if (this.getSheetNameFromRange(key).toLowerCase() === normalized) {
                delete this.clientCache[key];
            }
        }
    },

    clearAllCache() {
        this.clientCache = {};
    },
    
    // Current user info
    user: {
        email: '',
        name: '',
        picture: '',
        role: 'Observador' // Default role (Admin, Operario, Observador)
    },

    /**
     * Load config from localStorage
     */
    loadConfig() {
        const stored = localStorage.getItem('bsf_biomanager_config');
        if (stored) {
            this.config = JSON.parse(stored);
        } else if (typeof DEFAULT_CONFIG !== 'undefined' && DEFAULT_CONFIG.apiKey && DEFAULT_CONFIG.clientId && DEFAULT_CONFIG.spreadsheetId) {
            this.config = { ...DEFAULT_CONFIG };
        } else {
            this.config = null;
        }
        return this.config !== null;
    },

    /**
     * Save config to localStorage
     */
    saveConfig(config) {
        this.config = config;
        localStorage.setItem('bsf_biomanager_config', JSON.stringify(config));
    },

    /**
     * Check if API config is completely filled
     */
    hasValidConfig() {
        return this.config && 
               this.config.apiKey && 
               this.config.clientId && 
               this.config.spreadsheetId;
    },

    /**
     * Initialize Google APIs
     */
    init(onStatusChange, onError) {
        this.loadConfig();
        
        if (!this.hasValidConfig()) {
            onStatusChange('setup-needed');
            return;
        }

        onStatusChange('initializing');

        // Polling check to make sure GAPI and GSI libraries are fully loaded on DOM
        let attempts = 0;
        const checkLibraries = () => {
            attempts++;
            if (typeof gapi !== 'undefined' && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
                this.startGoogleAPI(onStatusChange, onError);
            } else if (attempts < 50) { // Try for 5 seconds (50 * 100ms)
                setTimeout(checkLibraries, 100);
            } else {
                console.error("Google SDK libraries failed to load (timeout)");
                onError("No se pudieron cargar las librerías de Google. Por favor, verifica tu conexión a internet o desactiva bloqueadores de anuncios (AdBlock) que puedan interferir.");
            }
        };

        checkLibraries();
    },

    startGoogleAPI(onStatusChange, onError) {
        // Initialize Google Identity Services (GSI) Credential Client (JWT / ID Token)
        try {
            google.accounts.id.initialize({
                client_id: this.config.clientId,
                callback: async (response) => {
                    if (response && response.credential) {
                        this.idToken = response.credential;
                        localStorage.setItem('bsf_id_token', this.idToken);
                        
                        const payload = this.decodeJwtLocally(this.idToken);
                        if (payload) {
                            this.user.email = payload.email;
                            this.user.name = payload.name;
                            this.user.picture = payload.picture || '';
                        }
                        
                        onStatusChange('logging-in');
                        await this.initializeDatabase(onStatusChange, onError);
                    }
                }
            });

            // Render Google Sign-in button over login placeholder if Apps Script is configured
            // Render Google Sign-in button if Apps Script is configured
            const gsiContainer = document.getElementById("gsi-button-container");
            const btnLogin = document.getElementById("btn-login");
            if (this.config && this.config.appsScriptUrl) {
                if (gsiContainer) {
                    gsiContainer.classList.remove("hidden");
                    if (btnLogin) btnLogin.classList.add("hidden");
                    google.accounts.id.renderButton(
                        gsiContainer,
                        { theme: "filled_blue", size: "large", width: 320 }
                    );
                }
            } else {
                if (gsiContainer) gsiContainer.classList.add("hidden");
                if (btnLogin) btnLogin.classList.remove("hidden");
            }
        } catch (err) {
            console.error("GSI Credential Client init error", err);
        }

        // Load GAPI
        try {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: this.config.apiKey,
                        discoveryDocs: [
                            "https://sheets.googleapis.com/$discovery/rest?version=v4",
                            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
                        ],
                    });
                    this.gapiInitialized = true;
                    this.checkAllInitialized(onStatusChange, onError);
                } catch (err) {
                    console.error("GAPI init error", err);
                    onError("Error al inicializar la librería de Google API (gapi). Verifica la API Key e internet.");
                }
            });
        } catch (err) {
            console.error("GAPI load crash", err);
            onError("Fallo al llamar gapi.load. Verifica si tu navegador bloquea scripts externos.");
        }

        // Initialize Google Identity Services (GSI) Token Client (Access Token for GAPI)
        try {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.config.clientId,
                scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                callback: async (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        this.accessToken = tokenResponse.access_token;
                        
                        localStorage.setItem('bsf_access_token', this.accessToken);
                        localStorage.setItem('bsf_token_expiry', Date.now() + (tokenResponse.expires_in * 1000));
                        
                        onStatusChange('logging-in');
                        await this.fetchUserProfile(onStatusChange, onError);
                    }
                }
            });
            this.gsiInitialized = true;
            this.checkAllInitialized(onStatusChange, onError);
        } catch (err) {
            console.error("GSI Token Client init error", err);
            onError("Error al inicializar el cliente de autenticación de Google (gsi). Verifica el Client ID.");
        }
    },

    checkAllInitialized(onStatusChange, onError) {
        if (this.gapiInitialized && this.gsiInitialized) {
            if (this.config && this.config.appsScriptUrl) {
                const savedIdToken = localStorage.getItem('bsf_id_token');
                if (savedIdToken) {
                    const payload = this.decodeJwtLocally(savedIdToken);
                    const nowSecs = Date.now() / 1000;
                    if (payload && payload.exp && nowSecs < payload.exp) {
                        this.idToken = savedIdToken;
                        this.user.email = payload.email;
                        this.user.name = payload.name;
                        this.user.picture = payload.picture || '';
                        
                        onStatusChange('logging-in');
                        this.initializeDatabase(onStatusChange, onError);
                        
                        // Render Google Sign-in button inside GSI container if visible
                        const gsiContainer = document.getElementById("gsi-button-container");
                        const btnLogin = document.getElementById("btn-login");
                        if (gsiContainer) {
                            gsiContainer.classList.remove("hidden");
                            if (btnLogin) btnLogin.classList.add("hidden");
                            google.accounts.id.renderButton(
                                gsiContainer,
                                { theme: "filled_blue", size: "large", width: 280 }
                            );
                        }
                        return;
                    }
                }
                
                // If Apps Script is configured but ID token is missing/expired, force login
                this.accessToken = null;
                localStorage.removeItem('bsf_access_token');
                localStorage.removeItem('bsf_token_expiry');
                onStatusChange('logged-out');
                
                // Render Google button inside GSI container
                const gsiContainer = document.getElementById("gsi-button-container");
                const btnLogin = document.getElementById("btn-login");
                if (gsiContainer) {
                    gsiContainer.classList.remove("hidden");
                    if (btnLogin) btnLogin.classList.add("hidden");
                    google.accounts.id.renderButton(
                        gsiContainer,
                        { theme: "filled_blue", size: "large", width: 320 }
                    );
                }
                return;
            }

            // Normal OAuth2 access token login (No Apps Script URL)
            const savedToken = localStorage.getItem('bsf_access_token');
            const expiry = localStorage.getItem('bsf_token_expiry');
            
            if (savedToken && expiry && Date.now() < parseInt(expiry)) {
                this.accessToken = savedToken;
                gapi.client.setToken({ access_token: savedToken });
                onStatusChange('logging-in');
                this.fetchUserProfile(onStatusChange, onError);
            } else {
                onStatusChange('logged-out');
            }
        }
    },

    /**
     * Request Access Token (Login)
     */
    login() {
        if (this.config && this.config.appsScriptUrl) {
            // Under Apps Script Web App mode, the Google renderButton handles popup automatically
            google.accounts.id.prompt();
            return;
        }
        if (!this.tokenClient) {
            alert("El cliente de autenticación no está listo.");
            return;
        }
        // Force account selection to prevent getting stuck with wrong account
        this.tokenClient.requestAccessToken({ prompt: 'select_account' });
    },

    /**
     * Logout
     */
    logout(onLogoutCallback) {
        if (this.accessToken) {
            google.accounts.oauth2.revokeToken(this.accessToken, () => {});
        }
        this.accessToken = null;
        this.idToken = null;
        this.user = { email: '', name: '', picture: '', role: 'Observador' };
        localStorage.removeItem('bsf_access_token');
        localStorage.removeItem('bsf_token_expiry');
        localStorage.removeItem('bsf_id_token');
        if (onLogoutCallback) onLogoutCallback();
    },

    /**
     * Fetch user details from Google UserInfo endpoint
     */
    async fetchUserProfile(onStatusChange, onError) {
        try {
            const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            const data = await resp.json();
            
            this.user.email = data.email;
            this.user.name = data.name;
            this.user.picture = data.picture;

            // Fetch User Roles and initialize DB sheets if needed
            await this.initializeDatabase(onStatusChange, onError);
        } catch (err) {
            console.error("Failed fetching user info", err);
            this.logout();
            onError("No se pudo obtener la información de perfil del usuario de Google.");
        }
    },

    /**
     * Initialize DB (Google Sheets)
     * Check schemas, create sheets if missing, fetch user role
     */
    async initializeDatabase(onStatusChange, onError) {
        try {
            if (this.config.appsScriptUrl) {
                // If Web App backend is configured, we bypass GAPI client calls entirely
                onStatusChange('checking-permissions');
                try {
                    await this.determineUserRole(onError);
                } catch (determineErr) {
                    if (determineErr.message.includes('Failed to fetch') || determineErr.toString().includes('Failed to fetch')) {
                        throw new Error('No se pudo conectar con el servidor (Failed to fetch). Esto suele deberse a un bloqueador de anuncios (AdBlock/Privacy) que interfiere con Google Apps Script, a una URL de Apps Script incorrecta o a una falta de conexión a internet');
                    }
                    throw determineErr;
                }
                onStatusChange('connected');
                return;
            }

            // 1. Get spreadsheet details to see which sheets exist
            const spreadsheet = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: this.config.spreadsheetId
            });
            
            const existingSheets = spreadsheet.result.sheets.map(s => s.properties.title);
            const requiredSheets = ['Usuarios', 'Reportes', 'Finanzas', 'Insumos', 'Camas', 'Registro_Alimentacion', 'Registro_Etapas', 'Registro_Eliminados', 'Maquinaria', 'Historico_Ciclos', 'Clima'];
            const sheetsToCreate = requiredSheets.filter(name => !existingSheets.includes(name));

            // 2. Create missing sheets and initialize headers
            if (sheetsToCreate.length > 0) {
                onStatusChange('creating-tables');
                const requests = sheetsToCreate.map(name => ({
                    addSheet: { properties: { title: name } }
                }));

                await gapi.client.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.config.spreadsheetId,
                    resource: { requests }
                });

                // Write headers for newly created sheets
                for (const sheetName of sheetsToCreate) {
                    let headers = [];
                    if (sheetName === 'Usuarios') headers = [['Email', 'Nombre', 'Rol']];
                    else if (sheetName === 'Reportes') headers = [['ID_Reporte', 'Fecha_Hora', 'Descripcion', 'Fotos_IDs', 'Categoria', 'Usuario', 'Ciclo_ID']];
                    else if (sheetName === 'Finanzas') headers = [['ID_Transaccion', 'ID_Reporte', 'Fecha', 'Tipo', 'Categoria', 'Monto', 'Descripcion']];
                    else if (sheetName === 'Insumos') headers = [['ID_Movimiento', 'ID_Reporte', 'Fecha', 'Insumo', 'Accion', 'Cantidad', 'Unidad', 'Costo_Total', 'Categoria', 'Tamaño']];
                    else if (sheetName === 'Camas') headers = [['ID_Bandeja', 'Estado', 'Grupo_Actual', 'Ciclo_Activo_ID']];
                    else if (sheetName === 'Registro_Alimentacion') headers = [['ID_Alimentacion', 'ID_Cama', 'Fecha_Hora', 'Orden', 'Insumo', 'Cantidad', 'Usuario', 'Observaciones', 'Ciclo_ID']];
                    else if (sheetName === 'Registro_Etapas') headers = [['ID_Cambio', 'ID_Tina', 'Fecha_Hora', 'Etapa_Anterior', 'Etapa_Nueva', 'Observacion', 'Usuario']];
                    else if (sheetName === 'Registro_Eliminados') headers = [['ID_Eliminacion', 'Tipo_Registro', 'ID_Original', 'Fecha_Hora_Original', 'Contenido_Original', 'Fecha_Hora_Eliminacion', 'Usuario', 'Motivo']];
                    else if (sheetName === 'Maquinaria') headers = [['ID_Equipo', 'Nombre', 'Fecha_Adquisicion', 'Costo', 'Estado', 'Descripcion', 'Cantidad', 'Tamaño']];
                    else if (sheetName === 'Historico_Ciclos') headers = [['Ciclo_ID', 'Grupo', 'Bandejas_IDs', 'Fecha_Inicio', 'Fecha_Cierre', 'Alimento_Consumido_Kg', 'Biomasa_Cosechada_Kg', 'Usuario']];
                    else if (sheetName === 'Clima') headers = [['ID_Registro', 'Fecha_Hora', 'Temperatura', 'Humedad', 'Origen', 'Observacion']];

                    await gapi.client.sheets.spreadsheets.values.update({
                        spreadsheetId: this.config.spreadsheetId,
                        range: `${sheetName}!A1`,
                        valueInputOption: 'RAW',
                        resource: { values: headers }
                    });
                }
            }

            // Ensure existing sheets also get updated headers if they don't have the new columns yet
            const sheetsToCheck = [
                { name: 'Camas', expected: ['ID_Bandeja', 'Estado', 'Grupo_Actual', 'Ciclo_Activo_ID'] },
                { name: 'Registro_Alimentacion', expected: ['ID_Alimentacion', 'ID_Cama', 'Fecha_Hora', 'Orden', 'Insumo', 'Cantidad', 'Usuario', 'Observaciones', 'Ciclo_ID'] },
                { name: 'Reportes', expected: ['ID_Reporte', 'Fecha_Hora', 'Descripcion', 'Fotos_IDs', 'Categoria', 'Usuario', 'Ciclo_ID'] },
                { name: 'Registro_Etapas', expected: ['ID_Cambio', 'ID_Tina', 'Fecha_Hora', 'Etapa_Anterior', 'Etapa_Nueva', 'Observacion', 'Usuario'] },
                { name: 'Registro_Eliminados', expected: ['ID_Eliminacion', 'Tipo_Registro', 'ID_Original', 'Fecha_Hora_Original', 'Contenido_Original', 'Fecha_Hora_Eliminacion', 'Usuario', 'Motivo'] },
                { name: 'Insumos', expected: ['ID_Movimiento', 'ID_Reporte', 'Fecha', 'Insumo', 'Accion', 'Cantidad', 'Unidad', 'Costo_Total', 'Categoria', 'Tamaño'] },
                { name: 'Maquinaria', expected: ['ID_Equipo', 'Nombre', 'Fecha_Adquisicion', 'Costo', 'Estado', 'Descripcion', 'Cantidad', 'Tamaño'] },
                { name: 'Historico_Ciclos', expected: ['Ciclo_ID', 'Grupo', 'Bandejas_IDs', 'Fecha_Inicio', 'Fecha_Cierre', 'Alimento_Consumido_Kg', 'Biomasa_Cosechada_Kg', 'Usuario'] },
                { name: 'Clima', expected: ['ID_Registro', 'Fecha_Hora', 'Temperatura', 'Humedad', 'Origen', 'Observacion'] }
            ];

            for (const item of sheetsToCheck) {
                try {
                    const res = await gapi.client.sheets.spreadsheets.values.get({
                        spreadsheetId: this.config.spreadsheetId,
                        range: `${item.name}!A1:J1`
                    });
                    const currentHeaders = res.result.values ? res.result.values[0] : [];
                    const needsUpdate = currentHeaders.length < item.expected.length || 
                                        currentHeaders.length === 0 || 
                                        currentHeaders[0] !== item.expected[0];
                    if (needsUpdate) {
                        await gapi.client.sheets.spreadsheets.values.update({
                            spreadsheetId: this.config.spreadsheetId,
                            range: `${item.name}!A1`,
                            valueInputOption: 'RAW',
                            resource: { values: [item.expected] }
                        });
                    }
                } catch (headerErr) {
                    console.warn(`Could not check/update headers for ${item.name}`, headerErr);
                }
            }

            // 3. Check / Add current user to 'Usuarios' sheet to establish role
            onStatusChange('checking-permissions');
            await this.determineUserRole(onError);
            
            // 4. Ensure we have a Drive photos folder
            if (!this.config.driveFolderId) {
                onStatusChange('setting-up-storage');
                const folderId = await this.ensurePhotosFolder();
                this.config.driveFolderId = folderId;
                this.saveConfig(this.config);
            }

            onStatusChange('connected');
        } catch (err) {
            console.error("Database initialization failed", err);
            onError(`Error al conectar con las hojas de cálculo: ${err.message || err}. Verifica que el Spreadsheet ID sea válido, que tu cuenta de Google tenga accesos compartidos, y que el Apps Script esté implementado como Aplicación Web.`);
        }
    },

    /**
     * Read 'Usuarios' sheet and find matching role. 
     * If no users exist, the first logged-in user becomes 'Administrador' by default.
     */
    async determineUserRole(onError) {
        try {
            if (this.config.appsScriptUrl) {
                const url = this.config.appsScriptUrl;
                const response = await fetch(url, {
                    method: 'POST',
                    mode: 'cors',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        action: 'determineUserRole',
                        token: this.idToken,
                        spreadsheetId: this.config.spreadsheetId
                    })
                });
                if (!response.ok) {
                    throw new Error(`Error de red en Apps Script Web App: ${response.statusText}`);
                }
                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || "Error indeterminado al validar rol");
                }
                this.user.role = result.role;
                return;
            }

            const resp = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.config.spreadsheetId,
                range: 'Usuarios!A:C'
            });
            
            const rows = resp.result.values || [];
            
            if (rows.length <= 1) {
                // Sheet is empty (only header exists). Register this first user as Admin!
                this.user.role = 'Administrador';
                await gapi.client.sheets.spreadsheets.values.append({
                    spreadsheetId: this.config.spreadsheetId,
                    range: 'Usuarios!A:C',
                    valueInputOption: 'RAW',
                    resource: {
                        values: [[this.user.email, this.user.name, 'Administrador']]
                    }
                });
            } else {
                // Search for the user email (case-insensitive)
                const userRow = rows.find(row => row[0] && row[0].toLowerCase().trim() === this.user.email.toLowerCase().trim());
                if (userRow) {
                    this.user.role = userRow[2] || 'Observador';
                } else {
                    // Not registered. Add as 'Observador' (read-only) by default
                    this.user.role = 'Observador';
                    await gapi.client.sheets.spreadsheets.values.append({
                        spreadsheetId: this.config.spreadsheetId,
                        range: 'Usuarios!A:C',
                        valueInputOption: 'RAW',
                        resource: {
                            values: [[this.user.email, this.user.name, 'Observador']]
                        }
                    });
                }
            }
        } catch (err) {
            console.error("Failed determining user role", err);
            throw err;
        }
    },

    /**
     * Locate or create 'BSF_BioManager_Photos' folder in Drive
     */
    async ensurePhotosFolder() {
        try {
            // Look for existing folder with name BSF_BioManager_Photos
            const query = "name = 'BSF_BioManager_Photos' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
            const response = await gapi.client.drive.files.list({
                q: query,
                fields: 'files(id, name)'
            });
            
            const files = response.result.files || [];
            if (files.length > 0) {
                return files[0].id;
            }

            // Create new folder
            const fileMetadata = {
                name: 'BSF_BioManager_Photos',
                mimeType: 'application/vnd.google-apps.folder'
            };
            const folder = await gapi.client.drive.files.create({
                resource: fileMetadata,
                fields: 'id'
            });
            return folder.result.id;
        } catch (err) {
            console.error("Failed ensuring GDrive folder", err);
            throw err;
        }
    },

    /**
     * Upload an image file to Drive folder
     */
    async uploadImageToDrive(file) {
        if (this.config.appsScriptUrl) {
            const base64Data = await this.fileToBase64(file);
            const response = await fetch(this.config.appsScriptUrl, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'uploadImage',
                    token: this.idToken,
                    base64Data: base64Data,
                    fileName: `${Date.now()}_${file.name}`,
                    mimeType: file.type,
                    folderId: this.config.driveFolderId
                })
            });
            if (!response.ok) {
                throw new Error(`Error de red al subir imagen por Apps Script: ${response.statusText}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || "Error al subir imagen mediante el script");
            }
            return result.fileId;
        }

        const metadata = {
            name: `${Date.now()}_${file.name}`,
            mimeType: file.type,
            parents: [this.config.driveFolderId]
        };

        const base64Data = await this.fileToBase64(file);

        const boundary = 'bsf_multipart_boundary';
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;
        
        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            `Content-Type: ${file.type}\r\n` +
            'Content-Transfer-Encoding: base64\r\n\r\n' +
            base64Data +
            close_delim;

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: multipartRequestBody
        });

        if (!response.ok) {
            throw new Error(`Fallo al subir imagen a Drive: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Also grant public/anyone read permission to this uploaded image file, so we can display it via simple thumbnail links
        try {
            await gapi.client.drive.permissions.create({
                fileId: result.id,
                resource: {
                    role: 'reader',
                    type: 'anyone'
                }
            });
        } catch (permissionErr) {
            console.warn("Could not make file public. Thumbnail loading might rely on direct drive authenticated embeds.", permissionErr);
        }

        return result.id;
    },

    /**
     * Helper: Convert File to Base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    },

    /**
     * Generic sheets data fetching
     */
    async getSheetData(range, forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this.clientCache[range] && (now - this.clientCache[range].timestamp < this.cacheExpiryMs)) {
            console.log(`Cache hit for range: ${range}`);
            return this.clientCache[range].data;
        }

        let data;
        if (this.config.appsScriptUrl) {
            const url = `${this.config.appsScriptUrl}?action=read&token=${encodeURIComponent(this.idToken)}&spreadsheetId=${encodeURIComponent(this.config.spreadsheetId)}&range=${encodeURIComponent(range)}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error al leer datos por Apps Script: ${response.statusText}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || "Error al leer datos mediante el script");
            }
            data = result.values || [];
        } else {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.config.spreadsheetId,
                range: range
            });
            data = response.result.values || [];
        }

        // Save in cache
        this.clientCache[range] = {
            data: data,
            timestamp: now
        };
        return data;
    },

    /**
     * Generic sheets data appending
     */
    async appendSheetData(range, values) {
        const sheetName = this.getSheetNameFromRange(range);
        this.invalidateCacheForSheet(sheetName);
        if (this.config.appsScriptUrl) {
            const response = await fetch(this.config.appsScriptUrl, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'append',
                    token: this.idToken,
                    spreadsheetId: this.config.spreadsheetId,
                    range: range,
                    values: values
                })
            });
            if (!response.ok) {
                throw new Error(`Error al agregar datos por Apps Script: ${response.statusText}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || "Error al agregar datos mediante el script");
            }
            return result;
        }

        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: this.config.spreadsheetId,
            range: range,
            valueInputOption: 'RAW',
            resource: { values: values }
        });
        return response.result;
    },

    /**
     * Generic sheets row updates
     */
    async updateSheetRow(range, values) {
        const sheetName = this.getSheetNameFromRange(range);
        this.invalidateCacheForSheet(sheetName);
        if (this.config.appsScriptUrl) {
            const response = await fetch(this.config.appsScriptUrl, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'update',
                    token: this.idToken,
                    spreadsheetId: this.config.spreadsheetId,
                    range: range,
                    values: values
                })
            });
            if (!response.ok) {
                throw new Error(`Error al actualizar datos por Apps Script: ${response.statusText}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || "Error al actualizar datos mediante el script");
            }
            return result;
        }

        const response = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.config.spreadsheetId,
            range: range,
            valueInputOption: 'RAW',
            resource: { values: values }
        });
        return response.result;
    },

    /**
     * Generic sheets row deletion (by clearing values)
     */
    async clearSheetRange(range) {
        const sheetName = this.getSheetNameFromRange(range);
        this.invalidateCacheForSheet(sheetName);
        if (this.config.appsScriptUrl) {
            const response = await fetch(this.config.appsScriptUrl, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'clear',
                    token: this.idToken,
                    spreadsheetId: this.config.spreadsheetId,
                    range: range
                })
            });
            if (!response.ok) {
                throw new Error(`Error al borrar datos por Apps Script: ${response.statusText}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || "Error al borrar datos mediante el script");
            }
            return result;
        }

        const response = await gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId: this.config.spreadsheetId,
            range: range
        });
        return response.result;
    },

    /**
     * Get all Camas (Breeding Units)
     */
    async getCamas() {
        return await this.getSheetData('Camas!A:D');
    },

    /**
     * Get all feeding records
     */
    async getFeedingLogs() {
        return await this.getSheetData('Registro_Alimentacion!A:I');
    },

    /**
     * Mass create Camas in range
     */
    async createCamasRange(startNum, endNum, prefix, type, grupo) {
        const values = [];
        const stageLogs = [];
        const groupVal = grupo ? grupo.trim() : 'Sin Grupo';
        
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localNow = new Date(now.getTime() - (offset*60*1000));
        const dateTimeStr = localNow.toISOString().replace('T', ' ').substring(0, 19);

        for (let i = startNum; i <= endNum; i++) {
            const paddedNum = String(i).padStart(4, '0');
            const idCama = `${prefix}-${paddedNum}`;
            const nombre = `Cama ${i}`;
            values.push([idCama, nombre, type, 'Activo', groupVal]);
            
            // Initial stage log
            stageLogs.push([
                `STAGE_${Date.now()}_${Math.floor(Math.random()*1000)}_${i}`,
                idCama,
                dateTimeStr,
                'Creación',
                type,
                'Inicialización de tina',
                this.user.name
            ]);
        }
        
        const appendResult = await this.appendSheetData('Camas!A:E', values);
        await this.appendSheetData('Registro_Etapas!A:G', stageLogs);
        return appendResult;
    },

    /**
     * Append multiple feeding logs in batch
     */
    async appendFeedingLogsBatch(values) {
        return await this.appendSheetData('Registro_Alimentacion!A:I', values);
    },

    /**
     * Get all stage change logs
     */
    async getEtapasLogs() {
        return await this.getSheetData('Registro_Etapas!A:G');
    },

    /**
     * Change a Tina stage (updates Camas sheet and appends to Registro_Etapas)
     */
    async changeTinaStage(tinaId, oldStage, newStage, obs) {
        const camas = await this.getCamas();
        const idx = camas.findIndex(c => c[0] === tinaId);
        if (idx === -1) {
            throw new Error(`Tina ${tinaId} no encontrada en la base de datos.`);
        }
        
        const rowNum = idx + 1;
        const isTotalHarvest = newStage.includes('Cosecha Total');
        const nextEstado = isTotalHarvest ? 'Inactivo' : 'Activo';
        
        // Update stage and status in Camas sheet (columns C and D)
        await this.updateSheetRow(`Camas!C${rowNum}:D${rowNum}`, [[newStage, nextEstado]]);
        
        // Append log to Registro_Etapas
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localNow = new Date(now.getTime() - (offset*60*1000));
        const dateTimeStr = localNow.toISOString().replace('T', ' ').substring(0, 19);
        
        const logRow = [
            `STAGE_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            tinaId,
            dateTimeStr,
            oldStage,
            newStage,
            obs || '',
            this.user.name
        ];
        
        await this.appendSheetData('Registro_Etapas!A:G', [logRow]);
    },

    /**
     * Start a new cycle on a Disponible tina
     */
    async startNewCycle(tinaId, initialStage, group, obs) {
        const camas = await this.getCamas();
        const idx = camas.findIndex(c => c[0] === tinaId);
        if (idx === -1) {
            throw new Error(`Tina ${tinaId} no encontrada en la base de datos.`);
        }
        
        const rowNum = idx + 1;
        
        // Update stage, status and group in Camas sheet (columns C, D, E)
        await this.updateSheetRow(`Camas!C${rowNum}:E${rowNum}`, [[initialStage, 'Activo', group]]);
        
        // Append log to Registro_Etapas
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localNow = new Date(now.getTime() - (offset*60*1000));
        const dateTimeStr = localNow.toISOString().replace('T', ' ').substring(0, 19);
        
        const logRow = [
            `STAGE_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            tinaId,
            dateTimeStr,
            'Disponible',
            initialStage,
            obs || '',
            this.user.name
        ];
        
        await this.appendSheetData('Registro_Etapas!A:G', [logRow]);
    },

    /**
     * Log a deletion for audit purposes
     */
    async logDeletion(tipo, idOriginal, fechaOriginal, detalleText, motivo) {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localNow = new Date(now.getTime() - (offset*60*1000));
        const dateTimeStr = localNow.toISOString().replace('T', ' ').substring(0, 19);
        
        const row = [
            `DEL_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            tipo,
            idOriginal,
            fechaOriginal || '',
            detalleText || '',
            dateTimeStr,
            this.user.name,
            motivo
        ];
        
        await this.appendSheetData('Registro_Eliminados!A:H', [row]);
    },

    /**
     * Clear all system data (tinas, logs, finances, reports, etc.) to start from scratch
     */
    async resetDatabase() {
        const sheetsToClear = [
            'Camas!A2:D10000',
            'Registro_Alimentacion!A2:I10000',
            'Registro_Etapas!A2:G10000',
            'Reportes!A2:G10000',
            'Finanzas!A2:G10000',
            'Insumos!A2:J10000',
            'Registro_Eliminados!A2:H10000',
            'Maquinaria!A2:H10000',
            'Historico_Ciclos!A2:H10000'
        ];
        
        const promises = sheetsToClear.map(range => this.clearSheetRange(range));
        await Promise.all(promises);
    },

    /**
     * Gestor de Activos (Alta/Baja de bandejas)
     */
    async manageAsset(assetIds, operation) {
        if (!this.config.appsScriptUrl) {
            throw new Error("La URL de Google Apps Script no está configurada. Se requiere el backend para gestionar activos.");
        }
        const response = await fetch(this.config.appsScriptUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'manage_asset',
                token: this.idToken,
                spreadsheetId: this.config.spreadsheetId,
                assetIds: assetIds,
                operation: operation
            })
        });
        if (!response.ok) {
            throw new Error(`Error en el servidor: ${response.statusText}`);
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Error al gestionar activos");
        }
        return result;
    },

    /**
     * Iniciar un lote productivo
     */
    async startBatch(assetIds, grupo) {
        if (!this.config.appsScriptUrl) {
            throw new Error("La URL de Google Apps Script no está configurada. Se requiere el backend para iniciar lotes.");
        }
        const response = await fetch(this.config.appsScriptUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'start_batch',
                token: this.idToken,
                spreadsheetId: this.config.spreadsheetId,
                assetIds: assetIds,
                grupo: grupo
            })
        });
        if (!response.ok) {
            throw new Error(`Error en el servidor: ${response.statusText}`);
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Error al iniciar lote");
        }
        return result;
    },

    /**
     * Cerrar / Cosechar un lote
     */
    async closeBatch(cicloId, biomasaCosechada) {
        if (!this.config.appsScriptUrl) {
            throw new Error("La URL de Google Apps Script no está configurada. Se requiere el backend para cerrar lotes.");
        }
        const response = await fetch(this.config.appsScriptUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'close_batch',
                token: this.idToken,
                spreadsheetId: this.config.spreadsheetId,
                cicloId: cicloId,
                biomasaCosechada: biomasaCosechada
            })
        });
        if (!response.ok) {
            throw new Error(`Error en el servidor: ${response.statusText}`);
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Error al cerrar lote");
        }
        return result;
    },

    /**
     * Traspasar el contenido de una tina a otra disponible
     */
    async transferAsset(oldAssetId, newAssetId, discardOld) {
        if (!this.config.appsScriptUrl) {
            throw new Error("La URL de Google Apps Script no está configurada. Se requiere el backend para traspasar contenido de bandejas.");
        }
        const response = await fetch(this.config.appsScriptUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'transfer_asset',
                token: this.idToken,
                spreadsheetId: this.config.spreadsheetId,
                oldAssetId: oldAssetId,
                newAssetId: newAssetId,
                discardOld: discardOld
            })
        });
        if (!response.ok) {
            throw new Error(`Error en el servidor: ${response.statusText}`);
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Error al realizar el traspaso de bandeja");
        }
        return result;
    },

    /**
     * Enable a single tina manually (sets status to 'Disponible' and stage to 'Disponible')
     */
    async enableTina(tinaId) {
        const camas = await this.getCamas();
        const idx = camas.findIndex(c => c[0] === tinaId);
        if (idx === -1) {
            throw new Error(`Tina ${tinaId} no encontrada en la base de datos.`);
        }
        const rowNum = idx + 1;
        
        // Update stage and status to 'Disponible' in Camas sheet
        await this.updateSheetRow(`Camas!C${rowNum}:D${rowNum}`, [['Disponible', 'Disponible']]);
        
        // Log transition in Registro_Etapas
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localNow = new Date(now.getTime() - (offset*60*1000));
        const dateTimeStr = localNow.toISOString().replace('T', ' ').substring(0, 19);
        
        const logRow = [
            `STAGE_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            tinaId,
            dateTimeStr,
            'Inactivo',
            'Disponible',
            'Tina habilitada manualmente',
            this.user.name
        ];
        
        await this.appendSheetData('Registro_Etapas!A:G', [logRow]);
    },

    /**
     * Disable all tinas in the system (sets status/stage to 'Inactivo' and group to 'Sin Grupo')
     */
    async disableAllTinas() {
        const camas = await this.getCamas();
        if (camas.length <= 1) return;
        
        // 1. Update Camas sheet stage, status and group
        const updateValues = camas.slice(1).map(c => ['Inactivo', 'Inactivo', 'Sin Grupo']);
        await this.updateSheetRow(`Camas!C2:E${camas.length}`, updateValues);

        // 2. Append stage transition logs to Registro_Etapas
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localNow = new Date(now.getTime() - (offset*60*1000));
        const dateTimeStr = localNow.toISOString().replace('T', ' ').substring(0, 19);
        
        const logRows = camas.slice(1).map((c, i) => {
            const tinaId = c[0];
            const oldStage = c[2] || 'Desconocido';
            return [
                `STAGE_${Date.now()}_${Math.floor(Math.random()*1000)}_${i}`,
                tinaId,
                dateTimeStr,
                oldStage,
                'Inactivo',
                'Inhabilitación general del criadero',
                this.user.name
            ];
        });
        
        await this.appendSheetData('Registro_Etapas!A:G', logRows);
    },

    /**
     * Get all Machinery
     */
    async getMaquinaria() {
        return await this.getSheetData('Maquinaria!A:H');
    },

    /**
     * Add new machinery and log optional automatic finance expense
     */
    async addMaquinaria(nombre, fecha, costo, estado, desc, cantidad, tamano) {
        const idEquipo = `EQP-${Date.now()}`;
        
        let finalDesc = desc || '';

        const row = [
            idEquipo,
            nombre,
            fecha,
            costo.toString(),
            estado,
            finalDesc,
            (cantidad || 1).toString(),
            tamano || ''
        ];
        
        await this.appendSheetData('Maquinaria!A:H', [row]);
        
        // Auto-log expense if cost > 0
        const parsedCost = parseFloat(costo) || 0;
        if (parsedCost > 0) {
            let txDesc = `Compra de activo: ${nombre}`;
            const txRow = [
                `TX_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                'MANUAL',
                fecha,
                'Gasto',
                'Activos: Compra de Maquinaria',
                parsedCost.toString(),
                txDesc
            ];
            await this.appendSheetData('Finanzas!A:G', [txRow]);
        }
        
        return idEquipo;
    },

    /**
     * Update machinery status
     */
    async updateMaquinariaStatus(equipoId, nuevoEstado) {
        const machinery = await this.getMaquinaria();
        const idx = machinery.findIndex(m => m[0] === equipoId);
        if (idx === -1) {
            throw new Error(`Equipo ${equipoId} no encontrado en la base de datos.`);
        }
        const rowNum = idx + 1;
        await this.updateSheetRow(`Maquinaria!E${rowNum}:E${rowNum}`, [[nuevoEstado]]);
    },

    /**
     * Get all users
     */
    async getUsuarios() {
        try {
            return await this.getSheetData('Usuarios!A:C');
        } catch (err) {
            console.error("Failed to fetch users", err);
            return [];
        }
    },

    /**
     * Get all Climate data
     */
    async getClimaData() {
        return await this.getSheetData('Clima!A:F');
    },

    /**
     * Add Climate record via doPost add_clima action
     */
    async addClimaRecord(temp, hum, obs = '') {
        if (!this.config.appsScriptUrl) {
            throw new Error("La URL de Google Apps Script no está configurada. Se requiere el backend para registrar el clima.");
        }
        const response = await fetch(this.config.appsScriptUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'add_clima',
                token: this.idToken,
                spreadsheetId: this.config.spreadsheetId,
                temp: parseFloat(temp),
                hum: parseFloat(hum),
                obs: obs
            })
        });
        if (!response.ok) {
            throw new Error(`Error en el servidor: ${response.statusText}`);
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Error al registrar el clima");
        }
        return result;
    },

    decodeJwtLocally(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Error decoding JWT locally", e);
            return null;
        }
    }
};

