# Minecraft WebSocket Server Framework

This framework allows you to easily develop Minecraft WebSocket-based plugins. 

Here are some features:  
- **Command provided**: You can use `MCWS.uri` function to get commands which can be pasted to connect to the server directly in the command line of Minecraft Bedrock or Education Edition.  
- **Friendly interface**: This package provides a simple interface to easily start development.  
- **Plugin supported**: You can develop plugins and use them easily.  
- **Hot reload supported**: You can hot reload plugin when developing them.  
- **Typescript supported**: This package is developed by Typescript and you can get friendly type prompts.  

How to use:  
1. Import this package  
Use `import MCWS from 'mcws'` or `const { MCWS } = require('mcws')` to import constructor.
2. Start your server  
```typescript
const server = new MCWS({
    port: 11799
})
```
3. Connect to Minecraft
Use `server.uri` to get commands to paste. The return of this function will be an array of string. For instance, 
```typescript
[
  '/connect 127.0.0.1:11799',
  '/connect [::1]:11799',
  '/connect 172.19.185.111:11799',
  '/connect [fe80::215:5dff:fece:a2c9]:11799'
]
```
4. Waiting for connections
Use `server.onConnected` to handle sockets. Here's an example.
```typescript
server.onConnected((socket) => {
    console.log('Connected to Minecraft');
    socket.sendCommand('say Hello Minecraft');
});
```
5. You can use `socket.sendCommand(command: string)` to send a command to Minecraft. And you can get the command status by using `sendCommand(command: string).then(data => console.log(data))`.
6. You can also use `socket.on(eventName: string, callback: (data) => void)` to handle events.
7. Use `server.dispose()` to close server.
8. Use `socket.use()` to activate plugins. Here's an example.
```typescript
/* plugin type: 

interface pluginStructure {
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
type plugin = (sendCommand: (command: string) => void) => pluginStructure;

*/
const state = socket.use(plugin);
state.dispose(); // remove plugin
```