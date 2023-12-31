import { networkInterfaces } from 'os';

export default function getIP() {
    const nets = networkInterfaces();
    const result: ({
        type: 4 | 6; // ipv4 or ipv6;
        address: string;
    })[] = [];
    Object.values(nets).forEach(net => {
        net?.forEach(net => {
            result.push({
                address: net.address,
                type: net.family === 'IPv4' ? 4 : 6
            });
        });
    });
    return result;
}