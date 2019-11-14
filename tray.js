
const { app, Menu, Tray, MenuItem, NativeImage, dialog } = require("electron");
const Server = require("./server.class");
const fs = require("fs");
const path = require("path");
const homedir = require('os').homedir();
const changeCase = require('change-case');

const CONFIG_FILE_PATH = path.resolve("~/.light-http/config.json".replace(/^~/,homedir));

let tray = null;
app.setName("Light HTTP Server");
app.dock.hide();
app.on('ready', async () => {

    tray = new Tray('icon@2x.png');

    const openServerWindow = (serverItem) => {
        // Choose Path
        let path = dialog.showOpenDialogSync({
            properties: ['openDirectory']
        });
        if ( !path ) return;
        path = path[0];

        if ( !serverItem ) {
            // Create new server
            serverList.push(createServerItem({
                name: serverList.length,
                path,
                port: {
                    http: 8080 + serverList.length
                }
            }));
        } else {
            // Change an existing path
            serverItem.server.setPath(path);

            // Restart server if needed
            serverItem.server.reconnect()
                .then(() => rebuildMenu(serverList));
        }
        rebuildMenu(serverList);
    };

    const buildMenuTemplate = serverList => {
        let menu = [];
        menu.push({ label: 'Create New Server', click: () => openServerWindow() });
        serverList.length && menu.push({ type: 'separator' });
        for ( let serverItem of serverList ) {
            menu.push({
                id: serverItem.id,
                label: `Server "${serverItem.server.name}" : ${serverItem.server.port}`,
                icon: serverItem.server.alive ? 'running@2x.png' : 'stopped@2x.png',
                submenu: [
                    // { label: 'Up for 2:15:01', disabled: true },
                    {
                        label: serverItem.server.alive ? 'Stop' : 'Start',
                        async click(submenuItem, b, event) {
                            if ( serverItem.server.alive ) {
                                serverItem.server.disconnect();
                            } else {
                                try {
                                    await serverItem.server.connect();
                                    submenuItem.label = 'Stop';
                                    serverItem.warning = null;
                                } catch (e) {
                                    serverItem.warning = e;
                                }
                            }
                            await rebuildMenu(serverList);
                        }
                    },
                    { label: "Restart", visible: serverItem.server.alive, click: () => serverItem.server.reconnect() },
                    { type: 'separator' },
                    { label: serverItem.server.path, click: () => openServerWindow(serverItem) },
                    { label: 'Auto Start', type: 'checkbox', checked: serverItem.autoStart, click: async menuItem => {
                        serverItem.autoStart = menuItem.checked;
                        await rebuildMenu(serverList);
                    } },
                    { label: 'Edit', click: () => openServerWindow(serverItem) },
                ]
            });
        }
        menu.push({ type: 'separator' });
        menu.push({ role: 'about' });
        menu.push({ label: 'Quit', role: 'quit' });
        return menu;
    };

    const createServerItem = configItem => {
        const server = new Server(configItem.name, configItem.path, configItem.port.http, configItem.port.https);
        const id = `server_${changeCase.snakeCase(configItem.name)}`;
        const autoStart = configItem.autoStart || false;
        return {id, server, autoStart};
    };

    const rebuildMenu = async serverList => {
        const menuTemplate = buildMenuTemplate(serverList);
        const menu = Menu.buildFromTemplate(menuTemplate);
        tray.setContextMenu(menu);

        // save into config
        const config = buildConfig(serverList);
        try {
            await updateConfig(config, CONFIG_FILE_PATH);
        } catch(e) {
            dialog.showErrorBox("Error occurred while updating the config file!", e.message);
        }

        return menu;
    };

    const updateConfig = async (config, filename = CONFIG_FILE_PATH) => {
        const basedir = path.dirname(filename);

        try {
            await fs.promises.access(basedir, fs.constants.R_OK);
        } catch (e) {
            try {
                await fs.promises.mkdir(basedir);
            } catch (e) {
                throw new Error(`Unable to create the configuration directory under '${filename}'. Please check whether it have the right permission to do so.\n${e.message}`);
            }
        }

        let configString;
        try {
            configString = JSON.stringify(config);
        } catch(e) {
            throw new Error(`Failed to convert the configuration object into JSON string.\n${e.message}`);
        }

        try {
            await fs.promises.writeFile(filename, configString);
        } catch (e) {
            throw new Error(`Unable to write data into a config file '${filename}'.\n${e.message}`);
        }
    };

    const readConfig = async (filename = CONFIG_FILE_PATH) => {
        let data;
        try {
            data = await fs.promises.readFile(filename);
        } catch (e) {
            throw new Error(`Unable to read the configuration file '${filename}'.\n${e.message}`);
        }

        try {
            return JSON.parse(data);
        } catch (e) {
            throw new Error(`Failed to parse the configuration file. Looks like the file does not contain a valid JSON data.\n${e.message}`);
        }
    };

    const buildConfig = serverList => {
        const config = {
            serverList: [],
        };

        for ( const serverItem of serverList ) {
            config.serverList.push({
                name: serverItem.server.name,
                path: serverItem.server.path,
                port: {
                    http: serverItem.server.httpPort,
                    https: serverItem.server.httpsPort,
                },
                autoStart: serverItem.autoStart
            });
        }

        return config;
    };

    const buildServerListFromConfig = config => {
        return config.serverList.map(createServerItem);
    };

    const autoStart = async serverList => {
        await Promise.all(serverList.map( async serverItem => serverItem.autoStart && await serverItem.server.connect() ));
    };


    const serverList = buildServerListFromConfig(await readConfig(CONFIG_FILE_PATH));

    try {
        await rebuildMenu(serverList);
        await autoStart(serverList);
        await rebuildMenu(serverList);
    } catch (e) {
        dialog.showErrorBox("Error!", e.message);
    }

    tray.setToolTip('This is my application.');

});
