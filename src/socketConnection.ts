import { connectionType } from './server';
import { v4 as uuidv4 } from 'uuid';

import { RawData } from 'ws';


export type McEventName = 'AdditionalContentLoaded' | 'AgentCommand' | 'AgentCreated' | 'Apilnit' | 'AppPaused' | 'AppResumed' | 'AppSuspended' | 'AwardAchievement' | 'BlockBroken' | 'BlockPlaced' | 'BoardTextUpdated' | 'BossKilled' | 'CameraUsed' | 'CauldronUsed' | 'ChunkChanged' | 'ChunkLoaded' | 'ChunkUnloaded' | 'ConfigurationChanged' | 'ConnectionFailed' | 'CraftingSessionCompleted' | 'EndOfDay' | 'EntitySpawned' | 'FileTransmissionCancelled' | 'FileTransmissionCompleted' | 'FileTransmissionStarted' | 'FirstTimeClientOpen' | 'FocusGained' | 'FocusLost' | 'GameSessionComplete' | 'GameSessionStart' | 'HardwareInfo' | 'HasNewContent' | 'ItemAcquired' | 'ItemCrafted' | 'ItemDestroyed' | 'ItemDropped' | 'ItemEnchanted' | 'ItemSmelted' | 'ItemUsed' | 'JoinCanceled' | 'JukeboxUsed' | 'LicenseCensus' | 'MascotCreated' | 'MenuShown' | 'MobInteracted' | 'MobKilled' | 'MultiplayerConnectionStateChanged' | 'MultiplayerRoundEnd' | 'MultiplayerRoundStart' | 'NpcPropertiesUpdated' | 'OptionsUpdated' | 'performanceMetrics' | 'PackImportStage' | 'PlayerBounced' | 'PlayerDied' | 'PlayerJoin' | 'PlayerLeave' | 'PlayerMessage' | 'PlayerTeleported' | 'PlayerTransform' | 'PlayerTravelled' | 'PortalBuilt' | 'PortalUsed' | 'PortfolioExported' | 'PotionBrewed' | 'PurchaseAttempt' | 'PurchaseResolved' | 'RegionalPopup' | 'RespondedToAcceptContent' | 'ScreenChanged' | 'ScreenHeartbeat' | 'SignInToEdu' | 'SignInToXboxLive' | 'SignOutOfXboxLive' | 'SpecialMobBuilt' | 'StartClient' | 'StartWorld' | 'TextToSpeechToggled' | 'UgcDownloadCompleted' | 'UgcDownloadStarted' | 'UploadSkin' | 'VehicleExited' | 'WorldExported' | 'WorldFilesListed' | 'WorldGenerated' | 'WorldLoaded' | 'WorldUnloaded';

export interface eventResponse {
    body: {
        eventName: string;
        measurements: unknown;
        properties: Record<string, unknown>;
    },
    header: {
        messagePurpose: 'event';
        requestId: string;
        version: number;
    }
}

export interface commandResponse {
    body: Record<string, unknown> & {
        statusCode: number;
        statusMessage?: string;
    },
    header: {
        messagePurpose: 'commandResponse';
        requestId: string;
        version: number;
    }
}

export interface pluginStructure {
    uuid: string;
    name: string;
    description: string;
    eventListeners: {
        event: McEventName;
        handler: (data: eventResponse['body']) => void;
        id: number;
    }[];
    onDispose?: CallableFunction;
}
export type plugin = (sendCommand: (command: string) => void) => pluginStructure;

export class SocketConnection {
    socket: connectionType;
    subscription: Map<string, number>;
    eventListeners: Map<string, (CallableFunction | null)[]>;
    commandListeners: ({
        uuid: string;
        callback: CallableFunction
    })[];
    plugins: pluginStructure[];
    private messageHandler: (data: RawData, isBinary: boolean) => void;

    constructor(socket: connectionType) {
        this.socket = socket;
        this.subscription = new Map();
        this.eventListeners = new Map();
        this.commandListeners = [];

        this.messageHandler = (data: RawData) => {
            let json: eventResponse | commandResponse;
            try {
                json = JSON.parse(data.toString());
            } catch (err) {
                console.error(err);
                throw new Error('MCWS: Cannot parse websocket data');
            }
            if (json.header.messagePurpose === 'event') {
                const listeners = this.eventListeners.get(json.body.eventName as string);
                if (listeners) {
                    for (let i = 0; i < listeners.length; i++) 
                        if (listeners[i]) listeners[i]!(json.body);
                }
            } else if (json.header.messagePurpose === 'commandResponse') {
                for (let i = 0; i < this.commandListeners.length; i++) {
                    if (this.commandListeners[i].uuid === json.header.requestId) {
                        this.commandListeners[i].callback(json.body);
                        this.commandListeners.splice(i, 1);
                        return;
                    }
                }
            }
        }
        this.socket.on('message', this.messageHandler);
    }

    private subscribe(event: McEventName) {
        this.socket.send(JSON.stringify({
            body: {
                eventName: event
            },
            header: {
                requestId: uuidv4(),
                messagePurpose: 'subscribe',
                version: 1,
                messageType: 'commandRequest'
            }
        }));
        this.subscription.set(event, 0);
    }

    private unsubscribe(event: McEventName) {
        this.socket.send(JSON.stringify({
            body: {
                eventName: event
            },
            header: {
                requestId: uuidv4(),
                messagePurpose: 'unsubscribe',
                version: 1,
                messageType: 'commandRequest'
            }
        }));
        this.subscription.delete(event);
    }

    public on(event: McEventName, callback: CallableFunction) {
        if (!this.subscription.has(event)) {
            this.subscribe(event);
            this.eventListeners.set(event, []);
        }
        const listeners = this.eventListeners.get(event)!;
        const listenerID = listeners.push(callback);
        this.eventListeners.set(event, listeners);

        const listenerCount = this.subscription.get(event)!;
        this.subscription.set(event, listenerCount + 1);

        return listenerID;
    }

    public off(event: McEventName, id: number) {
        const listeners = this.eventListeners.get(event);
        if (!listeners) return false;

        if (id >= listeners.length) return false;
        listeners[id] = null;
        this.eventListeners.set(event, listeners);

        const count = this.subscription.get(event)!;
        this.subscription.set(event, count-1);
        if (count === 1) this.unsubscribe(event);

        return true;
    }

    public once(event: McEventName, callback: CallableFunction) {
        const id = this.on(event, (...data: any[]) => {
            this.off(event, id);
            callback(...data);
        });
        return id;
    }

    public sendCommand(command: string, callback: CallableFunction): void;
    public sendCommand(command: string): Promise<commandResponse['body']>;

    public sendCommand(command: string, callback?: CallableFunction) {
        return new Promise<commandResponse['body']>(resolve => {
            const uuid = uuidv4();
            this.socket.send(JSON.stringify({
                body: {
                    origin: {
                        type: 'player'
                    },
                    commandLine: command,
                    version: 1
                },
                header: {
                    requestId: uuid,
                    messagePurpose: 'commandRequest',
                    version: 1,
                    messageType: 'commandRequest'
                }
            }));
            const commandResponseHandler = (data: commandResponse['body']) => {
                if (callback) callback(data);
                resolve(data);
            }
            this.commandListeners.push({
                uuid: uuid,
                callback: commandResponseHandler
            });
        });
    }

    public use(plugin: plugin) {
        const app = plugin(this.sendCommand.bind(this));
        
        app.eventListeners.forEach(listener => {
            listener.id = this.on(listener.event, listener.handler);
        })

        const appId = this.plugins.push(app);
        return {
            appId: appId,
            uuid: app.uuid,
            name: app.name,
            description: app.description,
            dispose: () => {
                app.onDispose && app.onDispose();
                app.eventListeners.forEach(listener => {
                    this.off(listener.event, listener.id);
                });
                this.plugins.splice(appId, 1);
            }
        }
    }

    public dispose() {
        this.socket.off('message', this.messageHandler);
        this.socket.close();
        this.commandListeners.length = 0;
        this.eventListeners.clear();
        this.subscription.clear();
    }
}