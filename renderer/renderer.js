class GmailAttachmentDownloader {
    constructor() {
        this.companies = [];
        this.selectedCompanies = [];
        this.companyFilePath = '';
        this.downloadFolder = '';
        this.isDownloading = false;

        this.initializeElements();
        this.attachEventListeners();
        this.setupProgressListeners();
        this.setDefaultDates();
        this.setDefaultDownloadFolder();
    } initializeElements() {
        // Authorization
        this.authSection = document.getElementById('authSection');
        this.authStatus = document.getElementById('authStatus');
        this.authUrlSection = document.getElementById('authUrlSection');
        this.openAuthBtn = document.getElementById('openAuthBtn');
        this.authUrlInput = document.getElementById('authUrlInput');
        this.copyUrlBtn = document.getElementById('copyUrlBtn');

        // File selection
        this.selectFileBtn = document.getElementById('selectFileBtn');
        this.selectedFile = document.getElementById('selectedFile');
        this.companyPreview = document.getElementById('companyPreview');
        this.companyList = document.getElementById('companyList');

        // Download folder selection
        this.selectFolderBtn = document.getElementById('selectFolderBtn');
        this.selectedFolder = document.getElementById('selectedFolder');

        // Date inputs
        this.startDate = document.getElementById('startDate');
        this.endDate = document.getElementById('endDate');

        // Company selection
        this.selectAllBtn = document.getElementById('selectAllBtn');
        this.deselectAllBtn = document.getElementById('deselectAllBtn');
        this.companyCheckboxes = document.getElementById('companyCheckboxes');

        // Controls
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.openFolderBtn = document.getElementById('openFolderBtn');

        // Progress
        this.progressSection = document.getElementById('progressSection');
        this.progressText = document.getElementById('progressText');
        this.progressFill = document.getElementById('progressFill');
        this.currentCompany = document.getElementById('currentCompany');

        // Status
        this.statusMessages = document.getElementById('statusMessages');
    }

    attachEventListeners() {
        // Authorization
        this.openAuthBtn.addEventListener('click', () => this.openAuthUrl());
        this.copyUrlBtn.addEventListener('click', () => this.copyAuthUrl());

        this.selectFileBtn.addEventListener('click', () => this.selectCompanyFile());
        this.selectFolderBtn.addEventListener('click', () => this.selectDownloadFolder());
        this.selectAllBtn.addEventListener('click', () => this.selectAllCompanies(true));
        this.deselectAllBtn.addEventListener('click', () => this.selectAllCompanies(false));
        this.startBtn.addEventListener('click', () => this.startDownload());
        this.stopBtn.addEventListener('click', () => this.stopDownload());
        this.resetBtn.addEventListener('click', () => this.resetDownloadState());
        this.openFolderBtn.addEventListener('click', () => this.openDownloadsFolder());

        // Date validation
        this.startDate.addEventListener('change', () => this.validateDates());
        this.endDate.addEventListener('change', () => this.validateDates());
    }

    setupProgressListeners() {
        window.electronAPI.onDownloadProgress((data) => {
            this.updateProgress(data);
        });

        window.electronAPI.onDownloadComplete((data) => {
            this.handleDownloadComplete(data);
        });

        // Auth listeners
        window.electronAPI.onAuthUrlReceived((url) => {
            this.handleAuthUrl(url);
        });

        window.electronAPI.onAuthStatusUpdate((status) => {
            this.updateAuthStatus(status, 'info');
        });

        window.electronAPI.onAuthSuccess(() => {
            this.handleAuthSuccess();
        });

        window.electronAPI.onAuthError((error) => {
            this.handleAuthError(error);
        });
    }

    setDefaultDates() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

        this.startDate.value = this.formatDate(thirtyDaysAgo);
        this.endDate.value = this.formatDate(today);
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    async selectCompanyFile() {
        try {
            const result = await window.electronAPI.selectCompanyFile();

            if (result.success) {
                this.companyFilePath = result.filePath;
                this.companies = result.companies;
                this.selectedFile.textContent = result.filePath.split('/').pop();

                this.displayCompanyPreview();
                this.createCompanyCheckboxes();
                this.updateStartButtonState();

                this.addStatusMessage(`Loaded ${this.companies.length} companies from ${result.filePath.split('/').pop()}`, 'success');
            } else {
                this.addStatusMessage(`Error loading file: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addStatusMessage(`Error: ${error.message}`, 'error');
        }
    }

    displayCompanyPreview() {
        this.companyPreview.classList.remove('hidden');
        this.companyList.innerHTML = '';

        this.companies.slice(0, 6).forEach(company => {
            const companyItem = document.createElement('div');
            companyItem.className = 'company-item';
            companyItem.innerHTML = `
                <div class="company-name">${company.name}</div>
                <div class="company-email">${company.email}</div>
            `;
            this.companyList.appendChild(companyItem);
        });

        if (this.companies.length > 6) {
            const moreItem = document.createElement('div');
            moreItem.className = 'company-item';
            moreItem.innerHTML = `<div class="company-name">... and ${this.companies.length - 6} more</div>`;
            this.companyList.appendChild(moreItem);
        }
    }

    createCompanyCheckboxes() {
        this.companyCheckboxes.innerHTML = '';
        this.selectedCompanies = [...this.companies.map(c => c.name)]; // Select all by default

        this.companies.forEach(company => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'company-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `company-${company.name}`;
            checkbox.value = company.name;
            checkbox.checked = true;
            checkbox.addEventListener('change', () => this.handleCompanySelection(company.name, checkbox.checked));

            const label = document.createElement('label');
            label.htmlFor = `company-${company.name}`;
            label.textContent = `${company.name} (${company.email})`;

            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            this.companyCheckboxes.appendChild(checkboxDiv);
        });
    }

    handleCompanySelection(companyName, isSelected) {
        if (isSelected) {
            if (!this.selectedCompanies.includes(companyName)) {
                this.selectedCompanies.push(companyName);
            }
        } else {
            this.selectedCompanies = this.selectedCompanies.filter(name => name !== companyName);
        }

        this.updateStartButtonState();
    }

    selectAllCompanies(selectAll) {
        const checkboxes = this.companyCheckboxes.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            this.handleCompanySelection(checkbox.value, selectAll);
        });

        if (selectAll) {
            this.addStatusMessage('All companies selected', 'info');
        } else {
            this.addStatusMessage('All companies deselected', 'info');
        }
    }

    validateDates() {
        const start = new Date(this.startDate.value);
        const end = new Date(this.endDate.value);

        if (start > end) {
            this.addStatusMessage('Start date cannot be later than end date', 'error');
            return false;
        }

        return true;
    }

    updateStartButtonState() {
        const hasCompanies = this.companies.length > 0;
        const hasSelectedCompanies = this.selectedCompanies.length > 0;
        const hasValidDates = this.validateDates();

        this.startBtn.disabled = !hasCompanies || !hasSelectedCompanies || !hasValidDates || this.isDownloading;
    }

    async startDownload() {
        if (!this.validateDates()) {
            return;
        }

        try {
            this.isDownloading = true;
            this.updateUI(true);

            // Convert dates to the format expected by the backend (YYYY/MM/DD)
            const startDateFormatted = this.startDate.value.replace(/-/g, '/');
            const endDateFormatted = this.endDate.value.replace(/-/g, '/');

            const result = await window.electronAPI.startDownload({
                companyFile: this.companyFilePath,
                startDate: startDateFormatted,
                endDate: endDateFormatted,
                selectedCompanies: this.selectedCompanies,
                downloadFolder: this.downloadFolder
            });

            if (result.success) {
                this.addStatusMessage(`Download started for ${this.selectedCompanies.length} companies`, 'success');
                this.progressSection.classList.remove('hidden');
            } else {
                this.addStatusMessage(`Error starting download: ${result.error}`, 'error');
                this.isDownloading = false;
                this.updateUI(false);
            }
        } catch (error) {
            this.addStatusMessage(`Error: ${error.message}`, 'error');
            this.isDownloading = false;
            this.updateUI(false);
        }
    }

    async stopDownload() {
        try {
            const result = await window.electronAPI.stopDownload();

            if (result.success) {
                this.addStatusMessage('Download stopped by user', 'warning');
                this.handleDownloadComplete({ success: false, stopped: true });
            } else {
                this.addStatusMessage(`Error stopping download: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addStatusMessage(`Error: ${error.message}`, 'error');
        }
    }

    updateProgress(data) {
        const progress = ((data.currentCompany + 1) / data.totalCompanies) * 100;

        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `Processing ${data.currentCompany + 1} of ${data.totalCompanies} companies`;
        this.currentCompany.textContent = `Current: ${data.companyName}`;

        this.addStatusMessage(`Processing ${data.companyName}...`, 'info');
    }

    handleDownloadComplete(data) {
        console.log('Download complete event received:', data);
        this.isDownloading = false;
        this.updateUI(false);

        if (data.success) {
            this.progressFill.style.width = '100%';
            this.progressText.textContent = 'Download completed successfully!';
            this.addStatusMessage('All downloads completed successfully! 🎉', 'success');
            if (data.downloadsPath) {
                this.addStatusMessage(`Files saved to: ${data.downloadsPath}`, 'info');
                this.addStatusMessage('Downloads folder opened automatically', 'info');
            }
        } else if (data.stopped) {
            this.addStatusMessage('Download was stopped', 'warning');
        } else {
            this.addStatusMessage(`Download failed: ${data.error || 'Unknown error'}`, 'error');
        }

        // Auto-hide progress section after completion
        setTimeout(() => {
            if (!this.isDownloading) {
                this.progressSection.classList.add('hidden');
            }
        }, 5000);
    }

    updateUI(downloading) {
        this.startBtn.classList.toggle('hidden', downloading);
        this.stopBtn.classList.toggle('hidden', !downloading);
        this.selectFileBtn.disabled = downloading;
        this.selectAllBtn.disabled = downloading;
        this.deselectAllBtn.disabled = downloading;
        this.resetBtn.disabled = downloading;
        this.startDate.disabled = downloading;
        this.endDate.disabled = downloading;

        // Disable company checkboxes
        const checkboxes = this.companyCheckboxes.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.disabled = downloading;
        });

        if (!downloading) {
            this.updateStartButtonState();
        }
    }

    addStatusMessage(message, type = 'info') {
        const messageElement = document.createElement('div');
        messageElement.className = `status-message ${type}`;
        messageElement.textContent = `${new Date().toLocaleTimeString()}: ${message}`;

        this.statusMessages.insertBefore(messageElement, this.statusMessages.firstChild);

        // Keep only last 10 messages
        while (this.statusMessages.children.length > 10) {
            this.statusMessages.removeChild(this.statusMessages.lastChild);
        }

        // Auto-scroll to top
        this.statusMessages.scrollTop = 0;
    }

    // Authorization methods
    handleAuthUrl(url) {
        this.authUrl = url;
        this.authUrlInput.value = url;
        this.authUrlSection.classList.remove('hidden');
        this.updateAuthStatus('Please authorize the application to continue', 'info');
    }

    async openAuthUrl() {
        if (this.authUrl) {
            try {
                await window.electronAPI.openAuthUrl(this.authUrl);
                this.updateAuthStatus('Authorization URL opened in browser', 'info');
            } catch (error) {
                this.updateAuthStatus(`Failed to open URL: ${error}`, 'error');
            }
        }
    }

    copyAuthUrl() {
        if (this.authUrlInput.value) {
            navigator.clipboard.writeText(this.authUrlInput.value).then(() => {
                this.updateAuthStatus('URL copied to clipboard', 'success');
            }).catch(() => {
                this.updateAuthStatus('Failed to copy URL', 'error');
            });
        }
    }

    handleAuthSuccess() {
        this.authUrlSection.classList.add('hidden');
        this.updateAuthStatus('✅ Successfully authorized with Google!', 'success');
        this.addStatusMessage('Google authorization successful', 'success');
    }

    handleAuthError(error) {
        this.updateAuthStatus(`❌ Authorization failed: ${error}`, 'error');
        this.addStatusMessage(`Authorization error: ${error}`, 'error');
    }

    updateAuthStatus(message, type) {
        this.authStatus.innerHTML = `<div class="status-message ${type}">${message}</div>`;
    }

    async resetDownloadState() {
        try {
            this.addStatusMessage('Resetting download state...', 'info');
            const result = await window.electronAPI.resetDownloadState();

            if (result.success) {
                // Reset UI state
                this.isDownloading = false;
                this.updateUI(false);
                this.progressSection.classList.add('hidden');
                this.addStatusMessage('Download state reset successfully', 'success');
            } else {
                this.addStatusMessage('Failed to reset download state', 'error');
            }
        } catch (error) {
            console.error('Failed to reset download state:', error);
            // Even if the IPC call fails, reset the UI state
            this.isDownloading = false;
            this.updateUI(false);
            this.progressSection.classList.add('hidden');
            this.addStatusMessage('UI state reset (manual fallback)', 'warning');
        }
    }

    async openDownloadsFolder() {
        try {
            this.addStatusMessage('Opening downloads folder...', 'info');
            const result = await window.electronAPI.openDownloadsFolder(this.downloadFolder);

            if (result.success) {
                this.addStatusMessage('Downloads folder opened successfully', 'success');
            } else {
                this.addStatusMessage(`Failed to open downloads folder: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Failed to open downloads folder:', error);
            this.addStatusMessage('Failed to open downloads folder', 'error');
        }
    } async setDefaultDownloadFolder() {
        try {
            const result = await window.electronAPI.getDefaultDownloadFolder();
            if (result.success) {
                this.downloadFolder = result.folderPath;
                this.selectedFolder.textContent = this.getDisplayPath(result.folderPath);
                this.addStatusMessage('Default download folder set', 'info');
            }
        } catch (error) {
            console.error('Failed to get default download folder:', error);
            this.downloadFolder = '';
        }
    }

    async selectDownloadFolder() {
        try {
            const result = await window.electronAPI.selectDownloadFolder();
            if (result.success) {
                this.downloadFolder = result.folderPath;
                this.selectedFolder.textContent = this.getDisplayPath(result.folderPath);
                this.addStatusMessage(`Download folder changed to: ${this.getDisplayPath(result.folderPath)}`, 'success');
            } else {
                this.addStatusMessage('No folder selected', 'warning');
            }
        } catch (error) {
            console.error('Failed to select download folder:', error);
            this.addStatusMessage('Failed to select download folder', 'error');
        }
    }

    getDisplayPath(fullPath) {
        // Show a shortened version of the path for better UI
        const parts = fullPath.split('/');
        if (parts.length > 3) {
            return `.../${parts.slice(-3).join('/')}`;
        }
        return fullPath;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GmailAttachmentDownloader();
});