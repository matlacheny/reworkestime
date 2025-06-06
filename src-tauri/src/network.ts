// src/network.ts
import { networkInterfaces } from 'os';
import * as dgram from 'dgram';
import crypto from "crypto";
import { EventEmitter } from "events";

export type Role = "dashboard" | "controller";

export interface DeviceInfo {
    id: string;
    name: string;
    role: Role;
    address: string;
    ip: string;
    mac?: string;
    hostname?: string;
    type?: string;
    status: 'online' | 'offline';
    lastSeen: Date;
}

const BROADCAST_PORT = 4321;
const BROADCAST_INTERVAL = 2000;
const DISCOVERY_MESSAGE_TYPE = "DISCOVERY";
const RESPONSE_MESSAGE_TYPE = "RESPONSE";

export class NetworkManager extends EventEmitter {
    private socket = dgram.createSocket("udp4");
    private readonly id: string;
    private readonly role: Role;
    private readonly name: string;
    private devices: Map<string, DeviceInfo> = new Map();
    private discoverySocket: dgram.Socket | null = null;
    private isScanning: boolean = false;
    private connected = false;

    constructor(role: Role) {
        super();
        this.id = this.generateId();
        this.role = role;
        this.name = `${role}-${this.id}`;
        this.setupSocket();
    }

    private generateId(): string {
        const raw = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
    }

    private setupSocket() {
        this.socket.bind(BROADCAST_PORT, () => {
            this.socket.setBroadcast(true);
        });

        this.socket.on("message", (msg, rinfo) => {
            if (this.connected) return;
            try {
                const message = JSON.parse(msg.toString());
                if (message.type === DISCOVERY_MESSAGE_TYPE && this.role === "dashboard") {
                    this.respondToDiscovery(rinfo.address);
                } else if (message.type === RESPONSE_MESSAGE_TYPE && this.role === "controller") {
                    this.addDevice({
                        id: message.id,
                        name: message.name,
                        role: message.role,
                        address: rinfo.address,
                        ip: rinfo.address,
                        status: 'online',
                        lastSeen: new Date()
                    });
                }
            } catch {}
        });
    }

    private respondToDiscovery(address: string) {
        const response = JSON.stringify({
            type: RESPONSE_MESSAGE_TYPE,
            id: this.id,
            name: this.name,
            role: this.role,
        });
        this.socket.send(response, 0, response.length, BROADCAST_PORT, address);
    }

    private broadcastDiscovery() {
        const message = JSON.stringify({
            type: DISCOVERY_MESSAGE_TYPE,
            id: this.id,
            name: this.name,
            role: this.role,
        });

        try {
            const interfaces = networkInterfaces();
            for (const name in interfaces) {
                const networkInterfaces = interfaces[name];
                if (networkInterfaces) {
                    for (const iface of networkInterfaces) {
                        if (iface.family === "IPv4" && !iface.internal) {
                            const parts = iface.address.split(".");
                            parts[3] = "255";
                            const broadcastAddress = parts.join(".");
                            this.socket.send(message, 0, message.length, BROADCAST_PORT, broadcastAddress);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error sending broadcast:", err);
        }
    }

    public startDiscovery() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        console.log('Starting network discovery');
        
        // Create a UDP socket for discovery
        this.discoverySocket = dgram.createSocket('udp4');
        
        // Handle incoming discovery responses
        this.discoverySocket.on('message', (msg, rinfo) => {
            console.log(`Discovery response from ${rinfo.address}:${rinfo.port}`);
            
            // Add or update device in the devices map
            this.devices.set(rinfo.address, {
                id: this.id,
                name: this.name,
                role: this.role,
                address: rinfo.address,
                ip: rinfo.address,
                status: 'online',
                lastSeen: new Date()
            });
            this.emit("deviceFound", this.devices.get(rinfo.address));
        });
        
        // Bind socket to start listening
        this.discoverySocket.bind(0, () => {
            console.log('Discovery socket bound');
            this.sendDiscoveryBroadcast();
        });
    }

    public stopDiscovery() {
        if (!this.isScanning) return;
        
        console.log('Stopping network discovery');
        
        if (this.discoverySocket) {
            this.discoverySocket.close();
            this.discoverySocket = null;
        }
        
        this.isScanning = false;
    }

    private sendDiscoveryBroadcast() {
        if (!this.discoverySocket || !this.isScanning) return;
        
        const discoveryMessage = Buffer.from(DISCOVERY_MESSAGE_TYPE);
        
        this.discoverySocket.setBroadcast(true);
        this.discoverySocket.send(discoveryMessage, 0, discoveryMessage.length, BROADCAST_PORT, '255.255.255.255', (err) => {
            if (err) {
                console.error('Error sending discovery broadcast:', err);
            } else {
                console.log('Discovery broadcast sent');
            }
        });
    }

    public getDevices(): DeviceInfo[] {
        return Array.from(this.devices.values());
    }

    public getDevice(ip: string): DeviceInfo | undefined {
        return this.devices.get(ip);
    }

    public connectTo(deviceId: string) {
        const device = this.devices.get(deviceId);
        if (device) {
            this.connected = true;
            this.stopDiscovery();
            this.socket.close();
            this.emit("connected", device);
            return device;
        }
        return null;
    }

    public disconnect() {
        this.connected = false;
        this.devices.clear();
        this.setupSocket();
        this.startDiscovery();
    }

    public getName(): string {
        return this.name;
    }
    
    public getId(): string {
        return this.id;
    }
    
    public getRole(): Role {
        return this.role;
    }

    public getLocalInterfaces(): { name: string; address: string; family: string }[] {
        const interfaces = networkInterfaces();
        const results: { name: string; address: string; family: string }[] = [];
        
        for (const [name, netInterface] of Object.entries(interfaces)) {
            if (netInterface) {
                for (const iface of netInterface) {
                    if (!iface.internal) {
                        results.push({
                            name,
                            address: iface.address,
                            family: iface.family
                        });
                    }
                }
            }
        }
        
        return results;
    }

    private addDevice(device: DeviceInfo) {
        if (!this.devices.has(device.ip)) {
            this.devices.set(device.ip, device);
            this.emit("deviceFound", device);
        }
    }
}
