const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const { EventEmitter } = require('events');
let server;
let authEmitter = new EventEmitter();
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';



module.exports.getAuthAndGmail = function (callback) {
  // Load client secrets from a local file.
  fs.readFile('credentials.json', (err, content) => {
    if (err) {
      console.log('Error loading client secret file:', err);
      authEmitter.emit('auth-error', err);
      callback(null, null);
      return;
    }

    try {
      // Authorize a client with credentials, then call the Gmail API.
      authorize(JSON.parse(content), (auth) => {
        if (auth) {
          const gmail = google.gmail({ version: 'v1', auth });
          callback(auth, gmail);
        } else {
          console.log('Authorization failed');
          callback(null, null);
        }
      });
    } catch (parseError) {
      console.log('Error parsing credentials.json:', parseError);
      authEmitter.emit('auth-error', parseError);
      callback(null, null);
    }
  });
}

module.exports.authEmitter = authEmitter;

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, "http://localhost:47319");

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, async (err, token) => {
    if (err) {
      authEmitter.emit('auth-status', 'No existing token found');
      return getNewToken(oAuth2Client, callback);
    }

    try {
      authEmitter.emit('auth-status', 'Validating existing token...');
      const tokenData = JSON.parse(token);

      // Check if token has required fields
      if (!tokenData.access_token) {
        throw new Error('Invalid token structure - missing access_token');
      }

      oAuth2Client.setCredentials(tokenData);

      // Validate the token by making a test request
      await validateToken(oAuth2Client);

      // Token is valid, proceed with callback
      authEmitter.emit('auth-status', 'Token validation successful');
      callback(oAuth2Client);
    } catch (error) {
      console.log('Token validation failed:', error.message);
      console.log('Getting new token...');
      authEmitter.emit('auth-status', 'Token expired or invalid, requesting new authorization');
      // Token is invalid or expired, get a new one
      getNewToken(oAuth2Client, callback);
    }
  });
}

/**
 * Validate the token by making a test API call
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to validate
 */
async function validateToken(oAuth2Client) {
  return new Promise(async (resolve, reject) => {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // First, try to refresh the token if it's expired
    try {
      await oAuth2Client.getAccessToken();
    } catch (refreshError) {
      console.log('Token refresh failed:', refreshError.message);
      reject(new Error('Token refresh failed: ' + refreshError.message));
      return;
    }

    // Make a simple API call to test if the token is valid
    gmail.users.getProfile({
      userId: 'me'
    }, (err, response) => {
      if (err) {
        reject(new Error('Token validation failed: ' + err.message));
      } else {
        // If token was refreshed, save the new token
        const credentials = oAuth2Client.credentials;
        if (credentials.access_token) {
          fs.writeFile(TOKEN_PATH, JSON.stringify(credentials), (writeErr) => {
            if (writeErr) {
              console.log('Warning: Could not save refreshed token:', writeErr.message);
            } else {
              console.log('Token refreshed and saved successfully');
            }
          });
        }
        resolve(response);
      }
    });
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);

  // Emit the auth URL for Electron UI
  authEmitter.emit('auth-url', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  server = http.createServer(function (req, res) {
    const queryObject = url.parse(req.url, true).query;
    code = queryObject.code

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write("<h1>You have successfully login. Please go back to terminal.</h1>\n\n");
    res.end();
    oAuth2Client.getToken(code, (err, token) => {
      console.log(code)
      if (err) {
        console.error('Error retrieving access token', err);
        authEmitter.emit('auth-error', err);
        return;
      }
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) {
          console.error(err);
          authEmitter.emit('auth-error', err);
          return;
        }
        console.log('Token stored to', TOKEN_PATH);
        authEmitter.emit('auth-success');
      });
      callback(oAuth2Client);
    });
  })
  server.listen(47319);
  // rl.question('Enter the code from that page here: ', (code) => {
  //   rl.close();
  //   oAuth2Client.getToken(code, (err, token) => {
  //     if (err) return console.error('Error retrieving access token', err);
  //     oAuth2Client.setCredentials(token);
  //     // Store the token to disk for later program executions
  //     fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
  //       if (err) return console.error(err);
  //       console.log('Token stored to', TOKEN_PATH);
  //     });
  //     callback(oAuth2Client);
  //   });
  // });
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  gmail.users.labels.list({
    userId: 'me',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const labels = res.data.labels;
    if (labels.length) {
      console.log('Labels:');
      labels.forEach((label) => {
        console.log(`- ${label.name}`);
      });
    } else {
      console.log('No labels found.');
    }
  });
}
