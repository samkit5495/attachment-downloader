# Gmail Bulk Attachment Downloader

Currently gmail is not providing to download attachments from different different mails with in single click. Using this program you can do it now.

You need `credentials.json` before start this utility. You can get it from https://developers.google.com/gmail/api/quickstart/nodejs by enable GMAIL API.
Save file `credentials.json` in the root folder of the project

Clone Project

`git clone https://github.com/munir131/attachment-downloader`

Install dependencies

`npm i`

Run program in interactive mode

`node index.js`

Run program in non-interactive mode

`node index.js --label LABEL_NAME`

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
