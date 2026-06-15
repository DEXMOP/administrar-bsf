/**
 * BSF BioManager - Application Controller & Router
 * Coordinates UI states, routing, authentication, and layouts
 */

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    // DOM Cache
    elements: {},
    
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.initTheme();
        this.initGoogleAPI();
        this.registerServiceWorker();
    },

    cacheDOM() {
        this.elements = {
            body: document.body,
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingText: this.elements.loadingOverlay ? this.elements.loadingOverlay.querySelector('.loading-text') : null,
            loginContainer: document.getElementById('login-container'),
            appContainer: document.getElementById('app-container'),
            btnLogin: document.getElementById('btn-login'),
            btnLogoutDesktop: document.getElementById('btn-logout-desktop'),
            btnThemeToggle: document.getElementById('btn-theme-toggle'),
            currentPageTitle: document.getElementById('current-page-title'),
            contentArea: document.getElementById('content-area'),
            userAvatar: document.getElementById('user-avatar'),
            userAvatarMobile: document.getElementById('user-avatar-mobile'),
            userName: document.getElementById('user-name'),
            userRole: document.getElementById('user-role'),
            sidebarNav: document.getElementById('sidebar-nav'),
            bottomNav: document.getElementById('bottom-nav'),
            btnMobileMenu: document.getElementById('btn-mobile-menu'),
            syncStatus: document.getElementById('sync-status'),
            errorModal: document.getElementById('error-modal'),
            errorModalMessage: document.getElementById('error-modal-message'),
            btnErrorClose: document.getElementById('btn-error-close')
        };
        
        // Re-assign query selector inside overlay since cacheDOM is run once
        if (this.elements.loadingOverlay) {
            this.elements.loadingText = this.elements.loadingOverlay.querySelector('.loading-text');
        }
    },

    bindEvents() {
        // Auth events
        this.elements.btnLogin.addEventListener('click', () => GoogleAPI.login());
        this.elements.btnLogoutDesktop.addEventListener('click', () => {
            GoogleAPI.logout(() => {
                this.handleAuthStatusChange('logged-out');
            });
        });

        // Theme toggle
        this.elements.btnThemeToggle.addEventListener('click', () => this.toggleTheme());

        // Mobile drawer menu
        this.elements.btnMobileMenu.addEventListener('click', () => {
            this.elements.sidebarNav.classList.toggle('open');
        });

        // Router events
        window.addEventListener('hashchange', () => this.route());

        // Error modal close
        this.elements.btnErrorClose.addEventListener('click', () => {
            this.elements.errorModal.classList.add('hidden');
        });

        // Close mobile drawer when clicking a link
        document.querySelectorAll('.sidebar-menu .nav-item').forEach(link => {
            link.addEventListener('click', () => {
                this.elements.sidebarNav.classList.remove('open');
            });
        });
    },

    /**
     * Set up dark/light theme on start
     */
    initTheme() {
        let preferredTheme = localStorage.getItem('bsf_theme');
        if (!preferredTheme) {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            preferredTheme = prefersDark ? 'dark-theme' : 'light-theme';
        }
        this.elements.body.className = preferredTheme;
        this.updateThemeIcon(preferredTheme);
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js')
                    .then(reg => console.log('Service Worker registrado con éxito:', reg.scope))
                    .catch(err => console.error('Error al registrar Service Worker:', err));
            });
        }
    },

    toggleTheme() {
        let newTheme = 'dark-theme';
        if (this.elements.body.classList.contains('dark-theme')) {
            newTheme = 'light-theme';
        }
        this.elements.body.className = newTheme;
        localStorage.setItem('bsf_theme', newTheme);
        this.updateThemeIcon(newTheme);
        
        // Re-render dashboard chart to adjust grid colors if on dashboard
        if (window.location.hash === '#dashboard' || !window.location.hash) {
            this.route();
        }
    },

    updateThemeIcon(theme) {
        const icon = this.elements.btnThemeToggle.querySelector('i');
        if (theme === 'dark-theme') {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
    },

    /**
     * Connect GAPI/GSI
     */
    initGoogleAPI() {
        GoogleAPI.init(
            (status) => this.handleAuthStatusChange(status),
            (errMsg) => this.showError(errMsg)
        );
    },

    /**
     * Handles authentication state changes from google-api.js
     */
    handleAuthStatusChange(status) {
        console.log("App auth status changed to:", status);
        
        switch (status) {
            case 'setup-needed':
                this.showSetupView();
                break;
            case 'initializing':
                this.showLoader("Inicializando BSF BioManager...");
                break;
            case 'logged-out':
                this.hideLoader();
                this.elements.appContainer.classList.add('hidden');
                this.elements.loginContainer.classList.remove('hidden');
                break;
            case 'logging-in':
                this.showLoader("Iniciando sesión con Google...");
                break;
            case 'creating-tables':
                this.showLoader("Configurando tablas en Google Sheets...");
                break;
            case 'checking-permissions':
                this.showLoader("Comprobando nivel de acceso del usuario...");
                break;
            case 'setting-up-storage':
                this.showLoader("Configurando almacenamiento de fotos en Drive...");
                break;
            case 'connected':
                this.hideLoader();
                this.elements.loginContainer.classList.add('hidden');
                this.elements.appContainer.classList.remove('hidden');
                
                // Populate profile sidebar
                this.elements.userAvatar.src = GoogleAPI.user.picture || '';
                this.elements.userAvatarMobile.src = GoogleAPI.user.picture || '';
                this.elements.userName.textContent = GoogleAPI.user.name || 'Usuario';
                
                const roleBadge = this.elements.userRole;
                roleBadge.textContent = GoogleAPI.user.role;
                roleBadge.className = 'user-role-badge';
                if (GoogleAPI.user.role === 'Administrador') roleBadge.classList.add('admin');
                else if (GoogleAPI.user.role === 'Socio') roleBadge.classList.add('partner');
                else if (GoogleAPI.user.role === 'Operario') roleBadge.classList.add('operator');

                // Sync status indicator
                this.elements.syncStatus.className = 'sync-status online';
                this.elements.syncStatus.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Conectado';

                // Restrict links in UI depending on role
                this.enforceRoleVisibilities();

                // Run router
                this.route();
                break;
        }
    },

    showLoader(text) {
        if (this.elements.loadingText) {
            this.elements.loadingText.textContent = text;
        }
        this.elements.loadingOverlay.style.opacity = '1';
        this.elements.loadingOverlay.style.visibility = 'visible';
    },

    hideLoader() {
        this.elements.loadingOverlay.style.opacity = '0';
        this.elements.loadingOverlay.style.visibility = 'hidden';
    },

    showSetupView() {
        this.hideLoader();
        this.elements.loginContainer.classList.add('hidden');
        this.elements.appContainer.classList.add('hidden');
        
        // Use components to render setup form in body directly
        document.body.insertAdjacentHTML('beforeend', '<div id="setup-view-wrapper" class="login-container"></div>');
        
        Components.renderSetup('setup-view-wrapper', (config) => {
            GoogleAPI.saveConfig(config);
            document.getElementById('setup-view-wrapper').remove();
            // Reinitialize GAPI with new keys
            this.initGoogleAPI();
        });
    },

    showError(message) {
        this.hideLoader();
        this.elements.errorModalMessage.textContent = message;
        this.elements.errorModal.classList.remove('hidden');
    },

    /**
     * Disable UI tabs that aren't allowed for current role
     */
    enforceRoleVisibilities() {
        const role = GoogleAPI.user.role;
        const isSocioOrAdmin = (role === 'Socio' || role === 'Administrador');
        
        if (!isSocioOrAdmin) {
            // Non-partners should not see Finances or Panel General
            document.getElementById('nav-desktop-dashboard').classList.add('hidden');
            document.getElementById('nav-desktop-finances').classList.add('hidden');
            document.getElementById('nav-mobile-dashboard').classList.add('hidden');
            document.getElementById('nav-mobile-finances').classList.add('hidden');
            
            // Redirect default view to add-report
            if (!window.location.hash || window.location.hash === '#dashboard' || window.location.hash === '#finances') {
                window.location.hash = '#add-report';
            }
        } else {
            // Restore visibility for Partners / Admins
            document.getElementById('nav-desktop-dashboard').classList.remove('hidden');
            document.getElementById('nav-desktop-finances').classList.remove('hidden');
            document.getElementById('nav-mobile-dashboard').classList.remove('hidden');
            document.getElementById('nav-mobile-finances').classList.remove('hidden');
        }
    },

    /**
     * Dynamic Router (Hash Navigation)
     */
    async route() {
        const hash = window.location.hash || '#dashboard';
        const page = hash.replace('#', '');
        
        // Check authentication guard
        const isAuthenticated = GoogleAPI.accessToken || GoogleAPI.idToken;
        if (!isAuthenticated && page !== 'login') {
            window.location.hash = '#login';
            return;
        }

        // Role authorization guard
        const role = GoogleAPI.user.role;
        const isSocioOrAdmin = (role === 'Socio' || role === 'Administrador');
        if (!isSocioOrAdmin && (page === 'dashboard' || page === 'finances')) {
            window.location.hash = '#add-report';
            return;
        }

        // Highlight Nav Items
        document.querySelectorAll('.sidebar-menu .nav-item, .bottom-nav .bottom-nav-item').forEach(item => {
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Set top header title
        let pageTitle = 'Panel General';
        if (page === 'add-report') pageTitle = 'Registrar Tareas de Hoy';
        else if (page === 'reports-list') pageTitle = 'Novedades Guardadas';
        else if (page === 'finances') pageTitle = 'Ingresos y Gastos';
        else if (page === 'supplies') pageTitle = 'Bodega / Alimentos';
        else if (page === 'feeding') pageTitle = 'Control de Tinas';
        else if (page === 'climatology') pageTitle = 'Clima de las Salas (Termómetros)';
        
        this.elements.currentPageTitle.textContent = pageTitle;

        // Render views
        const showLoadingFn = (text) => this.showLoader(text);
        const hideLoadingFn = () => this.hideLoader();

        switch (page) {
            case 'dashboard':
                await Components.renderDashboard('content-area', showLoadingFn, hideLoadingFn);
                break;
            case 'climatology':
                await Components.renderClimatology('content-area', showLoadingFn, hideLoadingFn);
                break;
            case 'add-report':
                await Components.renderAddReport('content-area', showLoadingFn, hideLoadingFn);
                break;
            case 'reports-list':
                await Components.renderReportsList('content-area', showLoadingFn, hideLoadingFn);
                break;
            case 'finances':
                await Components.renderFinances('content-area', showLoadingFn, hideLoadingFn);
                break;
            case 'supplies':
                await Components.renderSupplies('content-area', showLoadingFn, hideLoadingFn);
                break;
            case 'feeding':
                await Components.renderFeeding('content-area', showLoadingFn, hideLoadingFn);
                break;
            default:
                this.elements.contentArea.innerHTML = `<div class="card p-5 text-center"><h3>Error 404</h3><p>Página no encontrada.</p></div>`;
        }
    }
};
