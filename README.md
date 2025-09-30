# Gmail Bulk Attachment Downloader

Currently gmail is not providing to download attachments from different different mails with in single click. Using this program you can do it now.

## 🚀 Features

- **Desktop UI**: User-friendly graphical interface built with Electron
- **Command Line**: Traditional command-line interface for automation
- **Multiple File Formats**: Support for JSON and Excel company files
- **Bulk Download**: Download attachments from multiple companies at once
- **Progress Tracking**: Real-time progress monitoring
- **Date Range Filtering**: Download attachments within specific date ranges

## 📋 Prerequisites

You need `credentials.json` before start this utility. You can get it from https://developers.google.com/gmail/api/quickstart/nodejs by enable GMAIL API.
Save file `credentials.json` in the root folder of the project

## 🛠 Installation

Clone Project

```bash
git clone https://github.com/munir131/attachment-downloader
cd attachment-downloader
```

Install dependencies

```bash
npm install
```

## 🖥 Desktop Application

Run the desktop application

```bash
npm run electron
```

### Desktop UI Features:

- **File Selection**: Browse and select company files (JSON/Excel)
- **Company Preview**: See all companies before processing
- **Selective Download**: Choose specific companies to process
- **Date Range**: Visual date picker for start and end dates
- **Progress Monitoring**: Real-time progress bars and status updates
- **Log Messages**: Detailed status messages with timestamps

## 💻 Command Line Interface

Run program in interactive mode

```bash
node index.js
```

Run program in non-interactive mode

```bash
node index.js --label LABEL_NAME
```

Run custom script with company file and date range

`node custom.js <company_file> <start_date> <end_date>`

Example:

- Using JSON file: `node custom.js company.json 2025/01/01 2025/01/31`
- Using Excel file: `node custom.js companies.xlsx 2025/01/01 2025/01/31`

### Company File Format

The company file can be either JSON or Excel format:

**JSON Format (`company.json`):**

```json
[
  {
    "name": "Company1",
    "email": "company1@example.com"
  },
  {
    "name": "Company2",
    "email": "company2@example.com"
  }
]
```

**Excel Format (`companies.xlsx`):**
Create an Excel file with columns:

- `name`: Company name
- `email`: Company email address

## Contributors

Thanks to all the people who already contributed!

<a href="https://github.com/munir131/attachment-downloader/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=munir131/attachment-downloader" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
