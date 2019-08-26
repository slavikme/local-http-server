const LocalWebServer = require('local-web-server')
require('dotenv').config();

const PLAYER_SERVER_HOST = process.env.PLAYER_SERVER_HOST || 'localhost';
const PLAYER_SERVER_PORT = process.env.PLAYER_SERVER_PORT || '8001';
const PLAYER_PATH = process.env.PLAYER_PATH || '../player/player';

const EDITOR_SERVER_HOST = process.env.EDITOR_SERVER_HOST || 'localhost';
const EDITOR_SERVER_PORT = process.env.EDITOR_SERVER_PORT|| '8002';
const EDITOR_PATH = process.env.EDITOR_PATH || '../editor/source';

const LOCAL_SERVER_HOST = process.env.LOCAL_SERVER_HOST || 'localhost';
const LOCAL_SERVER_PORT = process.env.LOCAL_SERVER_PORT || '80';
const LOCAL_PLAYER_ALIAS_PATH = process.env.LOCAL_PLAYER_ALIAS_PATH || 'mt';
const LOCAL_EDITOR_ALIAS_PATH = process.env.LOCAL_EDITOR_ALIAS_PATH || 'WM.Editor';
const LOCAL_PUBLIC_PATH = process.env.LOCAL_PUBLIC_PATH || 'public';

// Run the Player Resources
console.log("Creating Player resources server...");
const wsPlayer = LocalWebServer.create({
    port: PLAYER_SERVER_PORT,
    directory: PLAYER_PATH
})
.on('verbose', (eventName, data) => {
    switch (eventName) {
        case 'server.listening':
            console.log(`Player resources server is listening on ${data.join(', ')}`);
            break;
        case 'server.error':
            console.error(data);
            break;
        case 'server.close':
            console.log(`Player resources server stopped`)
            break;
    }
});

// Run the Editor Resources
console.log("Creating Editor resources server...");
const wsEditor = LocalWebServer.create({
    port: EDITOR_SERVER_PORT,
    directory: EDITOR_PATH
})
.on('verbose', (eventName, data) => {
    switch (eventName) {
        case 'server.listening':
            console.log(`Editor resources server is listening on ${data.join(', ')}`);
            break;
        case 'server.error':
            console.error(data);
            break;
        case 'server.close':
            console.log(`Editor resources server stopped`)
            break;
    }
});

// Run the main http server with required aliases
console.log("Creating global resources server...");
const wsGlobal = LocalWebServer.create({
    port: LOCAL_SERVER_PORT,
    rewrite: [
        `/${LOCAL_PLAYER_ALIAS_PATH}/(.*) -> http://${PLAYER_SERVER_HOST}:${PLAYER_SERVER_PORT}/$1`,
        `/${LOCAL_EDITOR_ALIAS_PATH}/(.*) -> http://${EDITOR_SERVER_HOST}:${EDITOR_SERVER_PORT}/$1`
    ],
    directory: LOCAL_PUBLIC_PATH
})
.on('verbose', (eventName, data) => {
    switch (eventName) {
        case 'server.listening':
            console.log(`Global resources server is listening on ${data.join(', ')}`);
            break;
        case 'server.error':
            console.error(data);
            break;
        case 'server.close':
            console.log(`Global resources server stopped`)
            break;
    }
});

process.on('SIGINT', function() {
    console.log("\nShutting down servers...");
    wsPlayer.server.close();
    console.log(`Player resources server stopped`);
    wsEditor.server.close();
    console.log(`Editor resources server stopped`);
    wsGlobal.server.close();
    console.log(`Global resources server stopped`);
    process.exit();
});