const _ = require("lodash");
const atob = require("atob");
const fs = require("fs");
const path = require("path");

const FileHelper = require("./fileHelper");

let gmail;

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

async function fetchAndSaveAttachments(auth, attachments, folderName) {
    let results = [];
    let promises = [];
    let counter = 0;
    let processed = 0;

    for (index in attachments) {
        if (attachments[index].id) {
            promises.push(fetchAndSaveAttachment(auth, attachments[index], folderName));
            counter++;
            processed++;
            if (counter === 100) {
                attachs = await Promise.all(promises);
                _.merge(results, attachs);
                promises = [];
                counter = 0;
                await sleep(3000);
            }
        }
    }
    attachs = await Promise.all(promises);
    _.merge(results, attachs);
    return results;
}

function fetchAndSaveAttachment(auth, attachment, folderName) {
    return new Promise((resolve, reject) => {
        gmail.users.messages.attachments.get(
            {
                auth: auth,
                userId: "me",
                messageId: attachment.mailId,
                id: attachment.id,
            },
            function (err, response) {
                if (err) {
                    console.log("The API returned an error: " + err);
                    reject(err);
                }
                if (!response) {
                    console.log("Empty response: " + response);
                    reject(response);
                    return;
                }
                var data = response.data.data.replaceAll("-", "+");
                data = data.replaceAll("_", "/");
                var content = fixBase64(data);
                resolve(content);
            }
        );
    }).then((content) => {
        var fileName = path.resolve(__dirname, "..", "files", folderName, attachment.name.replaceAll("/", "-"));
        return FileHelper.isFileExist(fileName)
            .then((isExist) => {
                if (isExist) {
                    return FileHelper.getNewFileName(fileName);
                }
                return fileName;
            })
            .then((availableFileName) => {
                return FileHelper.saveFile(availableFileName, content);
            });
    });
}

function pluckAllAttachments(mails) {
    return _.compact(
        _.flatten(
            _.map(mails, (m) => {
                if (!m.data || !m.data.payload || !m.data.payload.parts) {
                    return undefined;
                }
                return _.map(m.data.payload.parts, (p) => {
                    if (!p.body || !p.body.attachmentId) {
                        return undefined;
                    }
                    const attachment = {
                        mailId: m.data.id,
                        name: p.filename,
                        id: p.body.attachmentId,
                    };
                    return attachment;
                });
            })
        )
    );
}

async function getListOfMailIdByFilter(auth, filter, maxResults = 500) {
    let messages = [];
    let nextPageToken;
    do {
        const response = await gmail.users.messages.list({
            auth: auth,
            userId: "me",
            q: filter,
            maxResults: maxResults,
            pageToken: nextPageToken,
        });
        nextPageToken = response.data.nextPageToken;
        messages = messages.concat(response.data.messages);
        console.log(`Pulled ${messages.length} messages`);
    } while (nextPageToken);
    return messages;
}

async function fetchMailsByMailIds(auth, mailList) {
    let results = [];
    let promises = [];
    let counter = 0;
    let processed = 0;

    for (index in mailList) {
        if (mailList[index]) {
            promises.push(getMail(auth, mailList[index].id));
            counter++;
            processed++;
            if (counter === 100) {
                mails = await Promise.all(promises);
                results = results.concat(mails);
                promises = [];
                counter = 0;
                await sleep(3000);
            }
        }
    }
    mails = await Promise.all(promises);
    results = results.concat(mails);
    return results;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMail(auth, mailId) {
    return new Promise((resolve, reject) => {
        gmail.users.messages.get(
            {
                userId: "me",
                id: mailId,
                auth,
            },
            (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response);
            }
        );
    });
}

function fixBase64(binaryData) {
    const base64str = binaryData;
    const binary = atob(base64str.replace(/\s/g, ""));
    const len = binary.length;
    const buffer = new ArrayBuffer(len);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < len; i++) {
        view[i] = binary.charCodeAt(i);
    }

    return view;
}

async function processCompany(company, auth, gmailInstance, startDate, endDate) {
    gmail = gmailInstance;

    const folderPath = `./files/${company.name}`;
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    let coredata = {};

    coredata.mailList = await getListOfMailIdByFilter(
        auth,
        `from:(${company.email}) after:${startDate} before:${endDate}`,
        2000
    );

    const mails = await fetchMailsByMailIds(auth, coredata.mailList);
    coredata.attachments = pluckAllAttachments(mails);
    await fetchAndSaveAttachments(auth, coredata.attachments, company.name);

    return {
        company: company.name,
        emailsFound: coredata.mailList.length,
        attachmentsDownloaded: coredata.attachments.length
    };
}

module.exports = {
    processCompany
};