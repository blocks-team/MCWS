import { createServer, serverOptions, serverType } from './server';
import { SocketConnection } from './socketConnection';

import getIP from './utils/getIP';

export class MCWS {
    server: serverType;
    port: number;

    constructor(options: serverOptions) {
        this.server = createServer(options);
        this.port = options.port;
    }

    public get uri() {
        return getIP().map(item => item.type === 4 ? `/connect ${item.address}:${this.port}` : `/connect [${item.address}]:${this.port}`);
    }

    private getEventHandler(once: boolean): serverType['on'] | serverType['once'] {
        if (once) return this.server.once.bind(this.server);
        return this.server.on.bind(this.server);
    }

    public onReady(callback: () => void, once = false) {
        this.getEventHandler(once)('listening', callback);
    }

    public onConnected(callback: (socket: SocketConnection) => void, once = false) {
        this.getEventHandler(once)('connection', socket => {
            callback(new SocketConnection(socket));
        });
    }

    public onDisConnected(callback: () => void, once = false) {
        this.getEventHandler(once)('close', callback);
    }

    public on(eventName: 'ready' | 'disconnected', callback: () => void, once?: boolean): void;
    public on(eventName: 'connected', callback: (socket: SocketConnection) => void, once?: boolean): void;

    public on(eventName: 'ready' | 'disconnected' | 'connected', callback: { (): void; (socket: SocketConnection): void; (): void; }, once = false): void {
        switch (eventName) {
            case 'ready': return this.onReady(callback, once);
            case 'connected': return this.onConnected(callback, once);
            case 'disconnected': return this.onDisConnected(callback, once);
            default: throw new Error(`MCWS: Event ${eventName} not found.`);
        }
    }

    public dispose() {
        this.server.close();
    }

    static Connection = SocketConnection;
}

export default MCWS;


export * from './version';
export { McEventName, eventResponse, commandResponse, plugin, pluginStructure } from './socketConnection';