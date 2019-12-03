const LocalWebServer = require('local-web-server');

class Server {

    #name;

    #baseConfig = {
        directory: 'public',
        rewrite: [],
    };
    #httpConfig = {
        port: undefined,
        https: false,
    };
    #httpsConfig = {
        port: undefined,
        https: true,
    };

    #wsHttp;
    #wsHttps;
    #listenURLs = [];

    /**
     * @param {string} name
     * @param {string} path
     * @param {number|null} httpPort
     * @param {number|null} httpsPort
     */
    constructor(name, path = '.', httpPort = 80, httpsPort = null) {
        this.setName(name);
        this.setPath(path);
        httpPort ? this.enableHTTP(httpPort) : this.disableHTTP();
        httpsPort ? this.enableHTTPS(httpsPort) : this.disableHTTPS();
    }

    get name() {
        return this.#name;
    }

    get port() {
        return this.httpPort || this.httpsPort;
    }

    get httpPort() {
        return this.#httpConfig.port;
    }

    get httpsPort() {
        return this.#httpsConfig.port;
    }

    get directory() {
        return this.#baseConfig.directory;
    }

    get path() {
        return this.directory;
    }

    get alive() {
        return this.#listenURLs.length;
    }

    get listenURL() {
        return this.alive ? this.#listenURLs[0] : null;
    }

    get http() {
        return !!this.httpPort;
    }

    get https() {
        return !!this.httpsPort;
    }

    /**
     * Creates a new server
     * @returns {Promise<Server>}
     */
    async connect() {
        const eventHandler = (resolve, reject) => (eventName, data) => {
            switch (eventName) {
                case 'server.listening':
                    resolve(data);
                    break;

                case 'server.error':
                    reject(data);
                    break;
            }
        };

        if ( this.http || this.https )
            console.log(`Creating ${this.#name} server...`);

        const [listenListHttp, listenListHttps] = await Promise.all([
            new Promise((resolve, reject) => {
                if ( this.http )
                    this.#wsHttp = LocalWebServer.create({...this.#baseConfig, ...this.#httpConfig})
                        .on('verbose', eventHandler(resolve, reject));
                else resolve();
            }),
            new Promise( (resolve, reject) => {
                if ( this.https )
                    this.#wsHttps = LocalWebServer.create({...this.#baseConfig, ...this.#httpsConfig})
                    .on('verbose', eventHandler(resolve, reject));
                else resolve();
            })
        ]);

        listenListHttp instanceof Array && (this.#listenURLs = this.#listenURLs.concat(listenListHttp));
        listenListHttps instanceof Array && (this.#listenURLs = this.#listenURLs.concat(listenListHttps));

        if ( (this.http || this.https) )
            if ( this.#listenURLs.length )
                console.log(`${this.#name} server is listening on ${this.#listenURLs.join(', ')}`);
            else
                throw new Error(`Unable to start the server ${this.#name}`);

        return this;
    }

    /**
     * Create an alias to another server.
     * @param {string} aliasPath
     * @param {Server|URL} server
     * @param {string} redirectUrl
     * @returns {Server}
     */
    createAliasPath(aliasPath, server, redirectUrl = server.listenURL) {
        let url = server instanceof URL ? server : undefined;
        if ( server instanceof Server && !server.alive )
            throw new Error(`Server ${server.name} must be alive before creating an alias`)
        else
            url = new URL(server.listenURL);

        if ( !url )
            throw new Error("An instance of Server or URL must be provided");

        if ( typeof aliasPath !== 'string' && (aliasPath = aliasPath.trim()) )
            throw new Error("'aliasPath' must be a non-empty string");

        aliasPath = encodeURIComponent(aliasPath).replace(/%2F/g,"/");

        this.#baseConfig.rewrite.push(`/${aliasPath}/(.*) -> ${redirectUrl}/$1`);
        console.log(`A path alias has been added to ${this.#name} server: '/${aliasPath}' -> '${redirectUrl}'`);

        return this;
    }

    /**
     * Enables HTTP server and defines its port number.
     * @param {number} port
     * @returns {Server}
     */
    enableHTTP(port = 80) {
        this.#httpConfig.port = port;
        return this;
    }

    /**
     * Enables HTTPS server and defines its port number.
     * @param {number} port
     * @returns {Server}
     */
    enableHTTPS(port = 443) {
        this.#httpsConfig.port = port;
        return this;
    }

    /**
     * Disables HTTP server
     * @returns {Server}
     */
    disableHTTP() {
        this.#httpConfig.port = undefined;
        return this;
    }

    /**
     * Disables HTTPS server
     * @returns {Server}
     */
    disableHTTPS() {
        this.#httpsConfig.port = undefined;
        return this;
    }

    /**
     * Defines a working base path of the server.
     * @param {string} path
     * @returns {Server}
     */
    setPath(path) {
        this.#baseConfig.directory = path;
        return this;
    }

    /**
     * Set server's name.
     * @param {string} name
     * @returns {Server}
     */
    setName(name) {
        this.#name = name;
        return this;
    }

    /**
     * Reconnect the server
     * @returns {Promise<Server>}
     */
    async reconnect() {
        if ( !this.alive ) return this;

        this.disconnect();
        return await this.connect();
    }

    /**
     * Alias for Server.disconnect
     * @returns {Server}
     */
    close() {
        return this.disconnect();
    }

    /**
     * Stop the server
     * @returns {Server}
     */
    disconnect() {
        console.log(`Stopping ${this.#name} server...`);
        this.#wsHttp && this.#wsHttp.server.close();
        this.#wsHttps && this.#wsHttps.server.close();
        this.#listenURLs = [];
        console.log(`${this.#name} server stopped`);

        return this;
    }
}

module.exports = Server;