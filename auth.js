const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {
    authenticate
} = require('@google-cloud/local-auth');
const {
    google
} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose'
];

// The file token.json stores the user's access and refresh tokens, and is created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// Load client secrets from a local file.
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.OAuth2(credentials);
    } catch (err) {
        return null;
    }
}


// Save OAuth2 credentials to a file.
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

// Create an OAuth2 client with the given credentials.
async function authorize() {
    // Load client secrets from a local file.
    let client = await loadSavedCredentialsIfExist();
    // Check if we have previously stored a token.
    if (client) {
        return client;
    }
    // Create an OAuth2 client with the given credentials.
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    // Save credentials for the next run
    if (client.credentials) {
        await saveCredentials(client);
    }
    // return the client
    return client;
}

module.exports = {
    SCOPES,
    authorize,
}