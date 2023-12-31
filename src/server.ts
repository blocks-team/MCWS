import { WebSocketServer, ServerOptions as WebSocketServerOptions, WebSocket } from 'ws';

export type serverOptions = WebSocketServerOptions & {
    port: number;
};

export type serverType = WebSocketServer;
export type connectionType = WebSocket;

export function createServer(options: serverOptions) {
    return new WebSocketServer(options);
}
