const LocalWebServer = require('local-web-server');
require('dotenv').config();

const PLAYER_SERVER_PORT = process.env.PLAYER_SERVER_PORT || '8001';
const PLAYER_SERVER_PROTOCOL = process.env.PLAYER_SERVER_PROTOCOL || 'https';
const PLAYER_PATH = process.env.PLAYER_PATH || '../player/player';

const EDITOR_SERVER_PORT = process.env.EDITOR_SERVER_PORT|| '8002';
const EDITOR_SERVER_PROTOCOL = process.env.EDITOR_SERVER_PROTOCOL || 'https';
const EDITOR_PATH = process.env.EDITOR_PATH || '../editor/source';

const LOCAL_SERVER_PORT_HTTP = process.env.LOCAL_SERVER_PORT_HTTP || '80';
const LOCAL_SERVER_PORT_HTTPS = process.env.LOCAL_SERVER_PORT_HTTPS || '443';
const LOCAL_PLAYER_ALIAS_PATH = process.env.LOCAL_PLAYER_ALIAS_PATH || 'mt';
const LOCAL_EDITOR_ALIAS_PATH = process.env.LOCAL_EDITOR_ALIAS_PATH || 'WM.Editor';
const LOCAL_PUBLIC_PATH = process.env.LOCAL_PUBLIC_PATH || 'public';

const connectToServer = (serverName, port, path = '.', config = {}) => {
    config.port = port;
    config.directory = path;

    console.log(`Creating ${serverName} server...`);
    let ws = LocalWebServer.create(config)
        .on('verbose', (eventName, data) => {
            switch (eventName) {
                case 'server.listening':
                    console.log(`${serverName} server is listening on ${data.join(', ')}`);
                    break;
                case 'server.error':
                    console.error(data);
                    break;
                case 'server.close':
                    console.log(`${serverName} server stopped`)
                    break;
            }
        });
    ws.serverName = serverName;
    return ws;
};

const mainServerRewrite = [
    `/${LOCAL_PLAYER_ALIAS_PATH}/(.*) -> ${PLAYER_SERVER_PROTOCOL}://127.0.0.1:${PLAYER_SERVER_PORT}/$1`,
    `/${LOCAL_EDITOR_ALIAS_PATH}/(.*) -> ${EDITOR_SERVER_PROTOCOL}://127.0.0.1:${EDITOR_SERVER_PORT}/$1`
];

const serverList = [
    connectToServer('Player Resources', PLAYER_SERVER_PORT, PLAYER_PATH, {https: PLAYER_SERVER_PROTOCOL=='https'}),
    connectToServer('Editor Resources', EDITOR_SERVER_PORT, EDITOR_PATH, {https: EDITOR_SERVER_PROTOCOL=='https'}),
    connectToServer('Main Resources HTTP', LOCAL_SERVER_PORT_HTTP, LOCAL_PUBLIC_PATH, {rewrite: mainServerRewrite}),
    connectToServer('Main Resources HTTPS', LOCAL_SERVER_PORT_HTTPS, LOCAL_PUBLIC_PATH, {rewrite: mainServerRewrite, https: true}),
];

process.on('SIGINT', function() {
    console.log("\nShutting down servers...");
    for ( let i=0; i<serverList.length; i++ ) {
        serverList[i].server.close();
        console.log(`${serverList[i].serverName} server stopped`);
    }
    process.exit();
});

