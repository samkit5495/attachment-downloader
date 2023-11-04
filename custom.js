const _ = require("lodash");
const atob = require("atob");
const fs = require("fs");
const path = require("path");
const ora = require("ora");

const AuthFetcher = require("./lib/googleAPIWrapper");
const FileHelper = require("./lib/fileHelper");

let gmail;
String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};

if (process.argv.length != 4) {
  console.error(`This file expects start and end date in args
  e.g. node custom.js <start_date> <end_date>`);
  process.exit(0);
}

const spinner = ora("Reading 1 page");
AuthFetcher.getAuthAndGmail(main);

async function fetchAndSaveAttachments(auth, attachments, folderName) {
  let results = [];
  let promises = [];
  let counter = 0;
  let processed = 0;
  spinner.text = "Fetching attachment from mails";
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
        spinner.text = processed + " attachemets are saved";
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
        }
        var data = response.data.data.replaceAll("-", "+");
        data = data.replaceAll("_", "/");
        var content = fixBase64(data);
        resolve(content);
      }
    );
  }).then((content) => {
    var fileName = path.resolve(__dirname, "files", folderName, attachment.name.replaceAll("/", "-"));
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
  spinner.text = "Fetching each mail";
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
        spinner.text = processed + " mails fetched";
        await sleep(3000);
      }
    }
  }
  mails = await Promise.all(promises);
  results = results.concat(mails);
  return results;
}

function sleep(ms) {
  spinner.text = `sleeping for ${ms / 1000} s`;
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
  const base64str = binaryData; // base64 string from  thr response of server
  const binary = atob(base64str.replace(/\s/g, "")); // decode base64 string, remove space for IE compatibility
  const len = binary.length; // get binary length
  const buffer = new ArrayBuffer(len); // create ArrayBuffer with binary length
  const view = new Uint8Array(buffer); // create 8-bit Array

  // save unicode of binary data into 8-bit Array
  for (let i = 0; i < len; i++) {
    view[i] = binary.charCodeAt(i);
  }

  return view;
}

const companies = JSON.parse(fs.readFileSync("companies.json"));

spinner.start();

async function main(auth, gmailInstance) {
  gmail = gmailInstance;
  for (const company of companies) {
    await processCompany(company, auth);
  }
  spinner.stop();
  console.log("Done");
}

async function processCompany(company, auth) {
  const folderPath = `./files/${company.name}`;
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
  let coredata = {};
  spinner.text = `processing ${company.name} `;
  coredata.mailList = await getListOfMailIdByFilter(auth, `from:(${company.email}) after:${process.argv[2]} before:${process.argv[3]}`, 2000);
  const mails = await fetchMailsByMailIds(auth, coredata.mailList);
  coredata.attachments = pluckAllAttachments(mails);
  await fetchAndSaveAttachments(auth, coredata.attachments, company.name);
}
