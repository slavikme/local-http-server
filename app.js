const Server = require('./server.class');
require('dotenv').config();

const PLAYER_SERVER_PORT = process.env.PLAYER_SERVER_PORT || '8001';
const PLAYER_PATH = process.env.PLAYER_PATH || '../player/player';

const EDITOR_SERVER_PORT = process.env.EDITOR_SERVER_PORT|| '8002';
const EDITOR_PATH = process.env.EDITOR_PATH || '../editor/source';

const LOCAL_SERVER_PORT_HTTP = process.env.LOCAL_SERVER_PORT_HTTP || '80';
const LOCAL_SERVER_PORT_HTTPS = process.env.LOCAL_SERVER_PORT_HTTPS || '443';
const LOCAL_PLAYER_ALIAS_PATH = process.env.LOCAL_PLAYER_ALIAS_PATH || 'mt';
const LOCAL_EDITOR_ALIAS_PATH = process.env.LOCAL_EDITOR_ALIAS_PATH || 'WM.Editor';
const LOCAL_PUBLIC_PATH = process.env.LOCAL_PUBLIC_PATH || 'public';

(async () => {

    const [playerServer, editorServer] = await Promise.all([
        (new Server('Player Resources', PLAYER_PATH, PLAYER_SERVER_PORT)).connect(),
        (new Server('Editor Resources', EDITOR_PATH, EDITOR_SERVER_PORT)).connect(),
    ]);

    const mainServer = await (new Server('Main Resources HTTP', LOCAL_PUBLIC_PATH, LOCAL_SERVER_PORT_HTTP, LOCAL_SERVER_PORT_HTTPS))
        .createAliasPath(LOCAL_PLAYER_ALIAS_PATH, playerServer)
        .createAliasPath(LOCAL_EDITOR_ALIAS_PATH, editorServer)
        .connect();

    process.on('SIGINT', function() {
        console.log("\nShutting down servers...");
        playerServer.disconnect();
        editorServer.disconnect();
        mainServer.disconnect();
        process.exit();
    });
})();