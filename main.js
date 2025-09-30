const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const AuthFetcher = require('./lib/googleAPIWrapper');

let mainWindow;
let downloadProcess = null;
let authWindow = null;

// Reset download process on startup to clear any stale state
downloadProcess = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'), // Optional icon
        title: 'Gmail Attachment Downloader'
    });

    mainWindow.loadFile('renderer/index.html');

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
} app.whenReady().then(() => {
    createWindow();

    // Reset any stale download process on startup
    downloadProcess = null;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Set up auth event listeners
AuthFetcher.authEmitter.on('auth-url', (authUrl) => {
    mainWindow.webContents.send('auth-url-received', authUrl);
});

AuthFetcher.authEmitter.on('auth-status', (status) => {
    mainWindow.webContents.send('auth-status-update', status);
});

AuthFetcher.authEmitter.on('auth-success', () => {
    mainWindow.webContents.send('auth-success');
});

AuthFetcher.authEmitter.on('auth-error', (error) => {
    mainWindow.webContents.send('auth-error', error.message);
});// IPC Handlers
ipcMain.handle('select-company-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Company Files', extensions: ['json', 'xlsx', 'xls'] },
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        try {
            const companies = readCompanyFile(filePath);
            return { success: true, filePath, companies };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: 'No file selected' };
});

ipcMain.handle('select-download-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, folderPath: result.filePaths[0] };
    }

    return { success: false, error: 'No folder selected' };
});

ipcMain.handle('get-default-download-folder', async () => {
    const os = require('os');
    const defaultPath = path.join(os.homedir(), 'Downloads', 'gmail-attachments');

    // Create the folder if it doesn't exist
    try {
        if (!fs.existsSync(defaultPath)) {
            fs.mkdirSync(defaultPath, { recursive: true });
        }
        return { success: true, folderPath: defaultPath };
    } catch (error) {
        // Fallback to current directory if Downloads folder is not accessible
        const fallbackPath = path.join(__dirname, 'files');
        if (!fs.existsSync(fallbackPath)) {
            fs.mkdirSync(fallbackPath, { recursive: true });
        }
        return { success: true, folderPath: fallbackPath };
    }
});

ipcMain.handle('start-download', async (event, { companyFile, startDate, endDate, selectedCompanies, downloadFolder }) => {
    try {
        if (downloadProcess) {
            console.log(downloadProcess);
            return { success: false, error: 'Download already in progress' };
        }

        const companies = readCompanyFile(companyFile);
        const filteredCompanies = selectedCompanies.length > 0
            ? companies.filter(company => selectedCompanies.includes(company.name))
            : companies;

        downloadProcess = {
            companies: filteredCompanies,
            startDate,
            endDate,
            downloadFolder: downloadFolder || path.join(__dirname, 'files'),
            currentCompany: 0,
            totalCompanies: filteredCompanies.length,
            status: 'starting'
        };

        // Start the download process
        AuthFetcher.getAuthAndGmail((auth, gmailInstance) => {
            if (auth && gmailInstance) {
                processDownload(auth, gmailInstance, downloadProcess);
            } else {
                console.error('Failed to get auth or gmail instance');
                downloadProcess = null;
                mainWindow.webContents.send('download-complete', {
                    success: false,
                    error: 'Authentication failed'
                });
            }
        });

        return { success: true, message: 'Download started' };
    } catch (error) {
        console.error('Error in start-download:', error);
        downloadProcess = null;
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-download-status', () => {
    if (!downloadProcess) {
        return { active: false };
    }

    return {
        active: true,
        currentCompany: downloadProcess.currentCompany,
        totalCompanies: downloadProcess.totalCompanies,
        status: downloadProcess.status,
        currentCompanyName: downloadProcess.companies[downloadProcess.currentCompany]?.name || 'Unknown'
    };
});

ipcMain.handle('stop-download', () => {
    if (downloadProcess) {
        downloadProcess.status = 'stopped';
        downloadProcess = null;
        return { success: true, message: 'Download stopped' };
    }
    return { success: false, error: 'No active download' };
});

ipcMain.handle('open-auth-url', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('reset-download-state', () => {
    downloadProcess = null;
    return { success: true, message: 'Download state reset' };
});

ipcMain.handle('open-downloads-folder', async (event, folderPath) => {
    try {
        // Use provided folder path or default to the most recent download folder
        let pathToOpen = folderPath;

        if (!pathToOpen) {
            if (downloadProcess && downloadProcess.downloadFolder) {
                pathToOpen = downloadProcess.downloadFolder;
            } else {
                // Get default folder
                const os = require('os');
                pathToOpen = path.join(os.homedir(), 'Downloads', 'gmail-attachments');
            }
        }

        await shell.openPath(pathToOpen);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

function readCompanyFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.json') {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else if (ext === '.xlsx' || ext === '.xls') {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(worksheet);
    } else {
        throw new Error(`Unsupported file format: ${ext}. Please use .json, .xlsx, or .xls files.`);
    }
}

async function processDownload(auth, gmailInstance, process) {
    try {
        const { processCompany } = require('./lib/downloadLogic');

        for (let i = 0; i < process.companies.length; i++) {
            if (process.status === 'stopped') break;

            process.currentCompany = i;
            process.status = `Processing ${process.companies[i].name}`;

            mainWindow.webContents.send('download-progress', {
                currentCompany: i,
                totalCompanies: process.totalCompanies,
                companyName: process.companies[i].name,
                status: process.status
            });

            await processCompany(process.companies[i], auth, gmailInstance, process.startDate, process.endDate, process.downloadFolder);
        }

        process.status = 'completed';

        // Open the downloads folder automatically
        const downloadsPath = process.downloadFolder;
        shell.openPath(downloadsPath).catch(err => {
            console.log('Could not open downloads folder:', err.message);
        });

        mainWindow.webContents.send('download-complete', {
            success: true,
            downloadsPath: downloadsPath
        });
    } catch (error) {
        console.error('Error in processDownload:', error);
        process.status = 'error';
        mainWindow.webContents.send('download-complete', { success: false, error: error.message });
    } finally {
        downloadProcess = null;
    }
}