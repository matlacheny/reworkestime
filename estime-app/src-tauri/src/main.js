const console = require("node:console");
const { WebSocketServer } = require('ws');
const http = require("http");
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const bodyParser = require('body-parser');
const { networkInterfaces } = require('os');
const dgram = require('dgram');
const crypto = require('crypto');
const { EventEmitter } = require('events');

// Add at the very top of the file, after the requires
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Stack trace:', err.stack);
  // Keep the process alive for a moment to allow logging
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Keep the process alive for a moment to allow logging
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});

// Add at the top level, after the requires
let sharedSocket = null;

// Add at the top level with other variables
const CLIENT_REMOVAL_DELAY = 5000; // 5 seconds delay before removing disconnected clients
const pendingRemovals = new Map(); // Track pending client removals

// Define DeviceInfo and NetworkManager
class NetworkManager extends EventEmitter {
    constructor(role) {
        super();
        try {
            this.socket = dgram.createSocket("udp4");
            this.id = this.generateId();
            this.role = role;
            this.name = `${role}-${this.id}`;
            this.devices = new Map();
            this.discoverySocket = null;
            this.isScanning = false;
            this.connected = false;
            console.log(`[${this.role}] NetworkManager initialized with ID: ${this.id}`);
            this.setupSocket();
        } catch (err) {
            console.error(`Error initializing NetworkManager for ${role}:`, err);
            console.error('Stack trace:', err.stack);
            throw err;
        }
    }

    generateId() {
        const raw = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
    }

    setupSocket() {
        try {
            // Use fixed port 41234 for the shared Network API socket
            const FIXED_PORT = 41234;
            
            // If this is the first instance, create the shared socket
            if (!sharedSocket) {
                sharedSocket = dgram.createSocket("udp4");
                sharedSocket.once('error', (err) => {
                    console.error(`[Network API] Socket error:`, err);
                    throw err;
                });

                sharedSocket.bind(FIXED_PORT, () => {
                    console.log(`[Network API] Shared socket bound on port ${FIXED_PORT}`);
                    sharedSocket.setBroadcast(true);
                });

                // Set up message handling for the shared socket
                sharedSocket.on("message", (msg, rinfo) => {
                    try {
                        console.log(`[Network API] Received message from ${rinfo.address}:${rinfo.port}`);
                        console.log(`[Network API] Message content: ${msg.toString()}`);
                        
                        try {
                            // Try to parse as JSON first
                            let message = JSON.parse(msg.toString());
                            console.log(`[Network API] Parsed JSON message:`, message);
                            
                            // Handle discovery messages
                            if (message.type === 'DISCOVERY') {
                                console.log(`[Network API] Processing DISCOVERY message`);
                                // Forward discovery message to all connected clients
                                clients.forEach((entry) => {
                                    if (entry.client.role === "dashboard") {
                                        console.log(`[Network API] Forwarding discovery to dashboard: ${entry.client.name}`);
                                        const deviceMsg = {
                                            key: "device-found",
                                            data: JSON.stringify({
                                                id: message.id,
                                                name: message.name,
                                                role: message.role,
                                                address: rinfo.address,
                                                ip: rinfo.address,
                                                status: 'online',
                                                timestamp: Date.now()
                                            })
                                        };
                                        const clientSocket = entry.socket;
                                        console.log("clientSocket is set? And is ready?", clientSocket, clientSocket.readyState);
                                        if (clientSocket && clientSocket.readyState === 1) {
                                            clientSocket.send(JSON.stringify(deviceMsg));
                                        }
                                    }
                                });
                            } else if (message.type === "RESPONSE") {
                                console.log(`[Network API] Processing RESPONSE message from ${rinfo.address}`);
                                // Forward response to all connected controllers
                                clients.forEach((entry) => {
                                    if (entry.client.role === "controller") {
                                        console.log(`[Network API] Forwarding response to controller: ${entry.client.name}`);
                                        const deviceMsg = {
                                            key: "device-found",
                                            data: JSON.stringify({
                                                id: message.id,
                                                name: message.name,
                                                role: message.role,
                                                address: rinfo.address,
                                                ip: rinfo.address,
                                                status: 'online',
                                                timestamp: Date.now()
                                            })
                                        };
                                        const clientSocket = entry.socket;
                                        if (clientSocket && clientSocket.readyState === 1) {
                                            clientSocket.send(JSON.stringify(deviceMsg));
                                        }
                                    }
                                });
                            }
                        } catch (error) {
                            console.error(`[Network API] Error processing message:`, error);
                        }
                    } catch (err) {
                        console.error(`[Network API] Error processing message:`, err);
                        console.error('Stack trace:', err.stack);
                    }
                });
            }

            // Create instance-specific socket for this client
            this.socket = dgram.createSocket("udp4");
            this.socket.once('error', (err) => {
                console.error(`[${this.role}] Socket error:`, err);
                throw err;
            });

            // Bind to a random available port for this instance
            this.socket.bind(0, () => {
                const port = this.socket.address().port;
                console.log(`[${this.role}] Instance socket bound for ${this.role} ${this.name} on port ${port}`);
                this.port = port;
                this.socket.setBroadcast(true);
            });

            // Set up message handling for this instance
            this.socket.on("message", (msg, rinfo) => {
                try {
                    console.log(`[${this.role}] Received message from ${rinfo.address}:${rinfo.port}`);
                    console.log(`[${this.role}] Message content: ${msg.toString()}`);
                    
                    if (this.connected) {
                        console.log(`[${this.role}] Ignoring message due to connected state`);
                        return;
                    }

                    try {
                        let message = JSON.parse(msg.toString());
                        console.log(`[${this.role}] Parsed JSON message:`, message);
                        
                        if (message.type === 'DISCOVERY') {
                            console.log(`[${this.role}] Processing DISCOVERY message`);
                            if (this.role === "dashboard") {
                                console.log(`[${this.role}] Responding to discovery from ${rinfo.address}:${FIXED_PORT}`);
                                this.respondToDiscovery(rinfo.address, FIXED_PORT);
                            }
                        }
                    } catch (error) {
                        console.error(`[${this.role}] Error processing message:`, error);
                    }
                } catch (err) {
                    console.error(`[${this.role}] Error processing message:`, err);
                    console.error('Stack trace:', err.stack);
                }
            });

            this.socket.on("error", (err) => {
                console.error(`[${this.role}] Socket error:`, err);
                console.error('Stack trace:', err.stack);
            });

            this.socket.on("close", () => {
                console.log(`[${this.role}] Socket closed`);
            });
        } catch (err) {
            console.error(`Error in setupSocket for ${this.role}:`, err);
            console.error('Stack trace:', err.stack);
            throw err;
        }
    }

    respondToDiscovery(address, sourcePort) {
        // Create a properly formatted response message
        const responseData = {
            type: "RESPONSE",
            id: this.id,
            name: this.name,
            role: this.role,
            timestamp: Date.now()
        };
        
        const responseMsg = Buffer.from(JSON.stringify(responseData));
        
        // Send to the shared Network API socket
        console.log(`[${this.role}] Sending discovery response to Network API`);
        sharedSocket.send(responseMsg, 0, responseMsg.length, sourcePort, address, (err) => {
            if (err) {
                console.error(`[${this.role}] Error sending discovery response:`, err);
            } else {
                console.log(`[${this.role}] Discovery response sent successfully`);
            }
        });
    }

    startDiscovery() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        console.log('Starting network discovery');
        
        this.discoverySocket = dgram.createSocket('udp4');
        
        // Enable broadcast on the discovery socket
        this.discoverySocket.on('listening', () => {
            this.discoverySocket.setBroadcast(true);
            console.log(`Discovery socket listening on port ${this.discoverySocket.address().port}`);
        });
        
        this.discoverySocket.on('error', (err) => {
            console.error(`Discovery socket error: ${err.message}`);
        });
        
        this.discoverySocket.on('message', (msg, rinfo) => {
            try {
                console.log(`Discovery socket received message from ${rinfo.address}:${rinfo.port}`);
                let message;
                try {
                    message = JSON.parse(msg.toString());
                    console.log(`Parsed JSON discovery response: ${JSON.stringify(message)}`);
                    console.log("Test 1")
                } catch (e) {
                    console.error('Error parsing JSON discovery response:', e);
                    console.log('Raw response:', msg.toString().substring(0, 100));
                    
                    // Try to handle legacy format
                    const msgStr = msg.toString();
                    if (msgStr.startsWith("RESPONSE")) {
                        const parts = msgStr.split(":");
                        message = { 
                            type: "RESPONSE", 
                            id: parts[1] || "unknown",
                            name: parts[2] || "unknown",
                            role: parts[3] || "unknown"
                        };
                    } else {
                        return;
                    }
                }
                console.log(message);
                if (message.type === "RESPONSE") {
                    console.log(`Discovery response from ${rinfo.address}:${rinfo.port}: ${JSON.stringify(message)}`);
                    
                    const device = {
                        id: message.id || rinfo.address,
                        name: message.name || "Unknown Dashboard",
                        role: message.role || "dashboard",
                        address: rinfo.address,
                        ip: rinfo.address,
                        status: 'online',
                        lastSeen: new Date()
                    };
                    
                    // Store both by ID and IP for more reliable lookups
                    this.devices.set(device.id, device);
                    if (device.id !== rinfo.address) {
                        this.devices.set(rinfo.address, device);
                    }
                    
                    console.log(`Added device to discovery list: ${JSON.stringify(device)}`);
                    this.emit("deviceFound", device);
                }
            } catch (e) {
                console.error('Error processing discovery response:', e);
                console.log('Received message:', msg.toString().substring(0, 50));
            }
        });
        
        this.discoverySocket.bind(0, () => {
            console.log(`Discovery socket bound to port ${this.discoverySocket.address().port}`);
            this.sendDiscoveryBroadcast();
            
            // Send discovery broadcast periodically
        //    const discoveryInterval = setInterval(() => {
        //        if (!this.isScanning) {
        //            clearInterval(discoveryInterval);
        //            return;
        //        }
        //        this.sendDiscoveryBroadcast();
        //    }, 5000); // Repeat every 5 seconds
        });
    }

    stopDiscovery() {
        if (!this.isScanning) return;
        
        console.log('Stopping network discovery');
        
        if (this.discoverySocket) {
            this.discoverySocket.close();
            this.discoverySocket = null;
        }
        
        this.isScanning = false;
    }

    sendDiscoveryBroadcast() {
        if (!this.socket || !this.isScanning) return;
        
        const discoveryData = {
            type: "DISCOVERY",
            id: this.id,
            name: this.name,
            role: this.role,
            timestamp: Date.now()
        };
        
        const discoveryMessage = Buffer.from(JSON.stringify(discoveryData));
        
        // Send to the shared Network API socket
        try {
            this.socket.setBroadcast(true);
            sharedSocket.send(discoveryMessage, 0, discoveryMessage.length, this.port || 41234, '255.255.255.255', (err) => {
                if (err) {
                    console.error(`[${this.role}] Error sending discovery broadcast:`, err);
                } else {
                    console.log(`[${this.role}] Discovery broadcast sent to Network API`);
                }
            });
            
            // Also send to localhost
            sharedSocket.send(discoveryMessage, 0, discoveryMessage.length, this.port || 41234, '127.0.0.1', (err) => {
                if (err) {
                    console.error(`[${this.role}] Error sending discovery to localhost:`, err);
                } else {
                    console.log(`[${this.role}] Discovery sent to localhost via Network API`);
                }
            });
        } catch (err) {
            console.error(`Error in discovery broadcast: ${err.message}`);
        }
    }

    getDevices() {
        return Array.from(this.devices.values());
    }

    getDevice(ip) {
        return this.devices.get(ip);
    }

    connectTo(deviceId) {
        console.log(`[${this.role}] Attempting to connect to device: ${deviceId}`);
        const device = this.devices.get(deviceId);
        if (device) {
            console.log(`[${this.role}] Found device to connect to:`, device);
            this.connected = true;
            this.stopDiscovery();
            this.socket.close();
            console.log(`[${this.role}] Emitting connected event with device:`, device);
            this.emit("connected", device);
            return device;
        }
        console.log(`[${this.role}] Device not found: ${deviceId}`);
        return null;
    }

    disconnect() {
        this.connected = false;
        this.devices.clear();
        this.setupSocket();
        this.startDiscovery();
    }

    getName() {
        return this.name;
    }
    
    getId() {
        return this.id;
    }
    
    getRole() {
        return this.role;
    }

    getLocalInterfaces() {
        const interfaces = networkInterfaces();
        const results = [];
        
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

    addDevice(device) {
        const deviceKey = device.id;
        
        // Skip if we already have this device
        if (this.devices.has(deviceKey)) {
            const existingDevice = this.devices.get(deviceKey);
            // Update timestamp
            existingDevice.timestamp = Date.now();
            existingDevice.status = 'online';
            console.log(`[${this.role}] Updated existing device: ${deviceKey}`);
            return;
        }
        
        console.log(`[${this.role}] Adding new device to devices map: ${JSON.stringify(device)}`);
        this.devices.set(deviceKey, device);
        
        // Make sure the device has all required properties before emitting
        if (!device.name || !device.role) {
            console.warn(`[${this.role}] Device is missing required properties:`, device);
            device.name = device.name || device.id || "Unknown";
            device.role = device.role || "dashboard";
        }
        
        // Debug: print all discovered devices
        console.log(`[${this.role}] Current devices (${this.devices.size}):`, 
            Array.from(this.devices.values()).map(d => `${d.name} (${d.role})`).join(', '));
        
        // Emit the device found event
        console.log(`[${this.role}] Emitting deviceFound event for ${device.name} (${device.role})`);
        this.emit("deviceFound", device);
    }
}

// Create Express app and WebSocket server
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// CORS configuration for Tauri app
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// For parsing JSON payloads
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
console.log("DIRECTORY ROOT ", path.join(path.dirname(process.execPath), 'src'));
app.use(express.static(path.join(path.dirname(process.execPath), 'src')));
// Serve static files from the 'data' folder
app.use('/data', express.static(path.join(path.dirname(process.execPath), 'data')));

const PORT = 3000;

// Store connected clients
const clients = new Map();
let nextClientId = 1;

// Store discovered network devices for REST API access
const discoveredDevices = new Map();

// Add generateId function at the top level
function generateId() {
    const raw = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

// Get the path for the logs
function getLogsPath() {
  const isCompiled = typeof process.pkg !== "undefined";

  const basePath = isCompiled
    ? path.dirname(process.execPath)
    : __dirname;

  const logPath = path.join(basePath, "estime-logs") + path.sep;

  console.log("Log directory path:", logPath);
  return logPath;
}

// Create logs directory
const logPath = getLogsPath();
const logFile = path.join(logPath);
if (!fs.existsSync(logFile)) {
  fs.mkdirSync(logFile, { recursive: true });
  if (!fs.existsSync(logFile)) {
    console.error("Failed to create directory: ", logFile);
  }
  else {
    console.log(`Directory created successfully: ${logFile}`);
  }
}
else {
  console.log("Directory already exists! ", logFile);
}

// Checks if the WebSocketServer is still listening to connections
function isServerRunning() {
  return (wss.options.server && wss.options.server?.listening) === true;
}

// Checks if a client is connected using its designated ID
function isClientConnected(clientId) {
  let client = clients.get(clientId);
  if (client) {
    let clientSocket = client.socket;
    return clientSocket.readyState === 1; // WebSocket.OPEN
  }
  else {
    return false;
  }
}

function getIdByName(name) {
  for (const [id, entry] of clients.entries()) {
    if (entry.client.name === name) {
      return id;
    }
  }
  return undefined;
}

// Function to simplify communications
function createJSON(type, data) {
  const jsonObj = {
    key: type,
    data: data
  };
  return JSON.stringify(jsonObj);
}

// Wrapper function to handle exceptions
function handleException(err) {
  if (err.message !== null && err.message.includes("pipe")) {
    console.error("The session has already been closed...");
  }
  else {
    console.error(err.message);
    console.error(err.stack);
  }
}

// Get client by ID
function getClient(clientId) {
  try {
    const entry = clients.get(clientId);
    if (entry && entry.client) {
      return entry.client;
    }
    else {
      throw new Error(`Client ${clientId} does not exist`);
    }
  }
  catch (err) {
    handleException(err);
    return null;
  }
}

// Get the client's history file
function getHistoryFilePath(client) {
  let fileName = "history-" + client + ".txt";
  return getLogsPath() + fileName;
}

// Reads each line of the history file
async function getHistoryFileContent(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const fileStream = fs.createReadStream(filePath);
    let fileContent = [];
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      fileContent.push(line);
    }
    return fileContent;
  } catch (err) {
    handleException(err);
  }
  return null;
}

async function recoverHistoryLog(client, clientId) {
  let filePath = getHistoryFilePath(client);
  try {
    // If the file doesn't exist then we try to write in it
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, "", { flag: "a+" });
        console.log("File " + filePath + " created.");
      } catch (err) {
        handleException(err);
      }
    }
    else {
      console.log("File " + filePath + " already exists.");
      let fileContent = await getHistoryFileContent(filePath);
      if (!fileContent) {
        throw new Error("File " + filePath + " does not exist.");
      }
      let nbItems = fileContent.length;
      let count = 1;

      fileContent.forEach((item) => {
        let data = { total: nbItems, index: count, element: item };
        if (isServerRunning() && isClientConnected(clientId)) {
          sendMessage(createJSON("history", JSON.stringify(data)), clientId);
          count++;
        }
      });
    }
  }
  catch (err) {
    handleException(err);
  }
}

async function updateHistoryFile(client, value, action, index) {
  try {
    let filePath = getHistoryFilePath(client);
    let fileContent = await getHistoryFileContent(filePath);
    if (fileContent !== null) {
      switch (action) {
        case "append":
          fs.writeFileSync(filePath, value + "\n", { flag: 'a+' });
          break;
        case "remove-item":
          fileContent.forEach((item, removedIndex) => {
            if (JSON.parse(item).index === index) {
              fileContent[removedIndex] = JSON.stringify(value + "\n");
            }
          });
          break;
        case "clear":
          fs.writeFileSync(filePath, "", { flag: 'w' });
          break;
        default:
          fs.writeFileSync(filePath, value + "\n", { flag: 'a+' });
          break;
      }
    }
  }
  catch (err) {
    handleException(err);
  }
}

function sendMessage(msg, idClient) {
  try {
    console.log(`Attempting to send message to client ${idClient}`);
    let clientSocket = clients.get(idClient)?.socket;

    if (clientSocket) {
      console.log(`Client socket found, readyState: ${clientSocket.readyState}`);
      if (clientSocket.readyState === 1) { // WebSocket.OPEN
        clientSocket.send(msg);
        console.log(`Message sent successfully to client ${idClient}`);
      } else {
        console.log(`Client socket not in OPEN state: ${clientSocket.readyState}`);
      }
    } else {
      console.log(`Client ${idClient} socket not found`);
      throw new Error(`Client ${idClient} socket is undefined`);
    }
  } catch (err) {
    console.error(`Error sending message to client ${idClient}:`, err);
    handleException(err);
  }
}

function checkUsername(clientId, client) {
  const clientObj = getClient(clientId);
  if (clientObj && clientObj.name === client) {
    sendMessage(createJSON("username-taken", ""), clientId);
    return true;
  }
  return false;
}

function updateClients(clientId, action) {
  try {
    // Build client list to share with everyone
    const clientsList = [];

    // Add all clients to the list
    clients.forEach((clientEntry) => {
      clientsList.push({
        username: clientEntry.client.name,
        role: clientEntry.client.role,
        parent: clientEntry.client.parent
      });
    });

    // Create update message
    const data = {
      action: action,
      client: getClient(clientId)?.name || "",
      clients: JSON.stringify(clientsList)
    };

    // Broadcast to all clients
    const updateMessage = createJSON("update-clients", JSON.stringify(data));

    // Send to the client that triggered the update
    if (isClientConnected(clientId)) {
      sendMessage(updateMessage, clientId);
    }

    // Send to all other connected clients
    clients.forEach((_, id) => {
      if (id !== clientId && isClientConnected(id)) {
        sendMessage(updateMessage, id);
      }
    });
  } catch (err) {
    handleException(err);
  }
}

// Function to broadcast messages to appropriate clients
function broadcastMessage(msg, fromClientId) {
  try {
    console.log(`Broadcasting message from client ${fromClientId}`);
    console.log(`Message content: ${msg}`);

    // Send to source client
    sendMessage(msg, fromClientId);

    // Get source client
    const sourceClient = getClient(fromClientId);
    if (!sourceClient) {
      console.log(`Source client ${fromClientId} not found`);
      return;
    }

    console.log(`Source client: ${sourceClient.name} (${sourceClient.role})`);
    console.log(`Parent relationship: ${sourceClient.parent || 'none'}`);

    // If client is controller, send to all connected dashboards
    if (sourceClient.role === "controller") {
      console.log(`Controller broadcasting to connected dashboards`);
      let dashboardCount = 0;
      clients.forEach((clientEntry, id) => {
        if (clientEntry.client.parent === sourceClient.name) {
          console.log(`Sending to dashboard: ${clientEntry.client.name}`);
          sendMessage(msg, id);
          dashboardCount++;
        }
      });
      console.log(`Sent to ${dashboardCount} dashboards`);
    }
    // If client is dashboard, send to parent controller
    else if (sourceClient.role === "dashboard" && sourceClient.parent) {
      console.log(`Dashboard sending to parent controller: ${sourceClient.parent}`);
      const parentId = getIdByName(sourceClient.parent);
      if (parentId !== undefined) {
        console.log(`Found parent controller ID: ${parentId}`);
        sendMessage(msg, parentId);
      } else {
        console.log(`Parent controller not found: ${sourceClient.parent}`);
      }
    }
  } catch (err) {
    console.error("Error in broadcastMessage:", err);
    handleException(err);
  }
}

function setupListeners(ws, client) {
  ws.on("message", (message) => {
    try {
      let messageJson = JSON.parse(message.toString());
      let dataMessage;

      try {
        dataMessage = JSON.parse(messageJson.data);
      } catch (e) {
        dataMessage = messageJson.data;
      }

      switch (messageJson.key) {
        case "update-username":
          let isDuplicate = false;
          clients.forEach(checkingClient => {
            if (dataMessage.username === checkingClient.client.name) {
              isDuplicate = true;
            }
          });

          if (isDuplicate) {
            sendMessage(createJSON("username-taken", ""), client.clientId);
          } else {
            clients.forEach((entry, id) => {
              if (entry.client.clientId === client.clientId) {
                entry.client.name = dataMessage.username;
              }
            });
          }
          updateClients(client.clientId, "update-username");
          break;

        case "set-parent":
          if (client !== null && client.role === "controller") {
            const dashboardId = dataMessage.dashboard;
            const dashboardDevice = discoveredDevices.get(dashboardId);
            
            if (dashboardDevice) {
                // Stop discovery if it's running
                if (client.networkManager && client.networkManager.isScanning) {
                    client.networkManager.stopDiscovery();
                }

                // Connect to the dashboard
                const connectedDevice = client.networkManager.connectTo(dashboardDevice.id);
                if (connectedDevice) {
                    console.log(`Successfully connected to dashboard: ${JSON.stringify(connectedDevice)}`);
                    
                    // Find the dashboard client
                    let dashboardClient = null;
                    let tempArray = Array.from(clients.values());
                    let tempDashboardClient = tempArray.find((entry) => {return entry.id === dashboardDevice.id});
                    console.log(tempDashboardClient);
                    
                    // Use find instead of some since we want to get the matching client
                    const foundClient = Array.from(clients.entries()).find(([id, entry]) => {
                        console.log(entry.client);
                        console.log(entry.client.networkManager.id, "is it equal to ", dashboardDevice.id);
                        return entry.client.networkManager.id === dashboardDevice.id;
                    });

                    if (foundClient) {
                        const [id, entry] = foundClient;
                        dashboardClient = { id, client: entry.client };
                        console.log("Dashboard client initialized", dashboardClient);
                    }

                    // Find controller client by ID
                    clients.forEach((entry, id) => {
                        if (entry.client.clientId === controllerId && entry.client.role === 'controller') {
                            controllerClient = { id, client: entry.client };
                        }
                    });

                    if (controllerClient) {
                        // Update the dashboard's parent
                        dashboardClient.client.parent = dataMessage.parent;
                        
                        // Send set-parent message to dashboard
                        const dashboardMessage = {
                            key: "set-parent",
                            data: JSON.stringify({
                                username: dataMessage.username,
                                parent: dataMessage.parent
                            })
                        };
                        sendMessage(JSON.stringify(dashboardMessage), dashboardClient.id);
                        
                        // Send confirmation to controller
                        const controllerMessage = {
                            key: "connected",
                            data: JSON.stringify({
                                device: connectedDevice,
                                status: "connected"
                            })
                        };
                        sendMessage(JSON.stringify(controllerMessage), client.clientId);
                        
                        // Update client list for all clients
                        updateClients(client.clientId, "parent");
                    }
                }
            }
          }
          break;

        case "init":
          // Handle initialization and network discovery
          console.log(`Initializing client ${client.clientId} as ${dataMessage.role}`);
          client.role = dataMessage.role;
          
          // Make sure we have a NetworkManager for this client
          if (!client.networkManager) {
            client.networkManager = new NetworkManager(client.role);
            
            // Set up event listeners for network discovery
            client.networkManager.on("deviceFound", (device) => {
                console.log(`device found: ${device}`);
              // Store for REST API
              discoveredDevices.set(device.id, device);
              
              // Send to the client
              console.log(`Forwarding device to client ${client.clientId}: ${JSON.stringify(device)}`);
              const deviceMsg = {
                key: "device-found",
                data: JSON.stringify(device)
              };
              const clientSocket = clients.get(client.clientId)?.socket;
              if (clientSocket && clientSocket.readyState === 1) { // WebSocket.OPEN
                clientSocket.send(JSON.stringify(deviceMsg));
              }
            });
        
            client.networkManager.on("connected", (device) => {
              sendMessage(createJSON("connected", JSON.stringify(device)), client.clientId);
            });
          }
          
          // If forceDiscovery flag is set or this is a new initialization,
          // restart network discovery
          if (dataMessage.forceDiscovery || !client.networkManager.isScanning) {
            console.log('Forcing network discovery restart');
            if (client.networkManager.isScanning) {
              client.networkManager.stopDiscovery();
            }
            client.networkManager.startDiscovery();
          }
          
          // Send welcome message
          const welcomeMsg = {
            key: 'welcome',
            data: JSON.stringify({
              name: client.name,
              role: client.role,
              clientId: client.clientId
            })
          };
          ws.send(JSON.stringify(welcomeMsg));
          break;

        case "discover-dashboards":
          // Specific request to find dashboard devices
          console.log(`Client ${client.clientId} is requesting dashboard discovery`);

          if (client.networkManager) {
            // Force a new discovery broadcast
            client.networkManager.sendDiscoveryBroadcast();
            
            // Check discovery devices from API endpoint
            console.log(`Checking ${discoveredDevices.size} globally known devices for dashboards`);
            let dashboardCount = 0;
            
            // Send all currently known dashboard devices back to client
            discoveredDevices.forEach((device) => {
              if (device.role === 'dashboard') {
                dashboardCount++;
                console.log(`Sending known dashboard to client: ${JSON.stringify(device)}`);
                const deviceMsg = {
                  key: 'device-found',
                  data: JSON.stringify(device)
                };
                ws.send(JSON.stringify(deviceMsg));
              }
            });
            
            // Also check client's own discovered devices
            if (client.networkManager.devices && client.networkManager.devices.size > 0) {
              console.log(`Checking ${client.networkManager.devices.size} client-specific devices`);
              client.networkManager.devices.forEach((device) => {
                if (device.role === 'dashboard') {
                  dashboardCount++;
                  console.log(`Sending client-specific dashboard: ${JSON.stringify(device)}`);
                  const deviceMsg = {
                    key: 'device-found',
                    data: JSON.stringify(device)
                  };
                  ws.send(JSON.stringify(deviceMsg));
                }
              });
            }
            
            // If no dashboards found, make sure discovery is active
            if (dashboardCount === 0) {
              console.log(`No dashboards found, restarting discovery for client ${client.clientId}`);
              if (client.networkManager.isScanning) {
                client.networkManager.stopDiscovery();
              }
              client.networkManager.startDiscovery();
              
              // Send a message to notify client that discovery is in progress
              const discoveryMsg = {
                key: 'discovery-status',
                data: JSON.stringify({
                  status: 'scanning',
                  message: 'Searching for dashboards...'
                })
              };
              ws.send(JSON.stringify(discoveryMsg));
            }
          } else {
            console.log(`Client ${client.clientId} has no NetworkManager, creating one`);
            client.networkManager = new NetworkManager(client.role);
            
            // Set up event listeners and start discovery
            client.networkManager.on("deviceFound", (device) => {
              // Store for REST API
              discoveredDevices.set(device.id, device);
              
              // Send to the client
              console.log(`Forwarding new device to client ${client.clientId}: ${JSON.stringify(device)}`);
              const deviceMsg = {
                key: "device-found",
                data: JSON.stringify(device)
              };
              const clientSocket = clients.get(client.clientId)?.socket;
              if (clientSocket && clientSocket.readyState === 1) { // WebSocket.OPEN
                clientSocket.send(JSON.stringify(deviceMsg));
              }
            });
            
            client.networkManager.startDiscovery();
          }
          break;

        case "connect-to-dashboard":
          console.log(`Client ${client.clientId} requesting connection to dashboard:`, dataMessage);
          
          // Find the dashboard device
          const dashboardDevice = discoveredDevices.get(dataMessage.dashboardId);
          if (!dashboardDevice) {
            console.log(`Dashboard device not found: ${dataMessage.dashboardId}`);
            sendMessage(createJSON("connection-error", "Dashboard not found"), client.clientId);
            return;
          }

          // Stop discovery if it's running
          if (client.networkManager && client.networkManager.isScanning) {
            client.networkManager.stopDiscovery();
          }

          // Connect to the dashboard
          const connectedDevice = client.networkManager.connectTo(dashboardDevice.id);
          if (connectedDevice) {
            console.log(`Successfully connected to dashboard: ${JSON.stringify(connectedDevice)}`);
            
            // Send connection success message
            const connectionMsg = {
              key: "connected",
              data: JSON.stringify({
                device: connectedDevice,
                status: "connected"
              })
            };
            ws.send(JSON.stringify(connectionMsg));
            
            // Also update the client's state
            client.connectedDevice = connectedDevice;
          } else {
            console.log(`Failed to connect to dashboard: ${dataMessage.dashboardId}`);
            sendMessage(createJSON("connection-error", "Failed to connect to dashboard"), client.clientId);
          }
          break;

        case "device-found":
          // Handle device found message from client
          console.log(`Client ${client.clientId} found device:`, dataMessage);
          
          // Store the device
          const device = typeof dataMessage === 'string' ? JSON.parse(dataMessage) : dataMessage;
          discoveredDevices.set(device.id, device);
          
          // If this is a dashboard and we're a controller, we can connect directly
          if (device.role === 'dashboard' && client.role === 'controller') {
            console.log(`Found dashboard device, ready for connection: ${device.id}`);
            
            // Send device found message with connection capability
            const deviceMsg = {
              key: "device-found",
              data: JSON.stringify({
                ...device,
                canConnect: true
              })
            };
            ws.send(JSON.stringify(deviceMsg));

            // When a dashboard is clicked, it should trigger a set-parent message
            // The client should send a set-parent message with:
            // {
            //   dashboard: device.id,
            //   parent: client.name
            // }
          }
          break;

        default:
          // Broadcast message to relevant clients
          broadcastMessage(createJSON(messageJson.key, messageJson.data), client.clientId);
          break;
      }
    } catch (err) {
      console.error("Error processing message:", err);
    }
  });

  ws.on("close", () => {
    console.log(`Client ${client.name} disconnected, waiting ${CLIENT_REMOVAL_DELAY}ms before removal`);
    
    // Store the client info for potential reconnection
    const clientInfo = {
      name: client.name,
      role: client.role,
      clientId: client.clientId,
      networkManager: client.networkManager
    };
    
    // Set a timeout to remove the client if no reconnection occurs
    const removalTimeout = setTimeout(() => {
      console.log(`Removing client ${client.name} after timeout`);
      clients.delete(client.clientId);
      pendingRemovals.delete(client.clientId);
      updateClients(client.clientId, "close");
    }, CLIENT_REMOVAL_DELAY);
    
    // Store the timeout for potential cancellation
    pendingRemovals.set(client.clientId, {
      timeout: removalTimeout,
      clientInfo: clientInfo
    });
  });
}

// WebSocket connection handler
wss.on("connection", (ws, request) => {
  try {
    console.log(`New WebSocket connection attempt from ${request.socket.remoteAddress}`);
    const path = request.url || "";
    const match = path.match(/^\/server\/(controller|dashboard)-([a-zA-Z0-9]+)-([a-zA-Z]+)(?:-([a-zA-Z0-9]+))?$/);

    if (!match) {
      console.log(`Invalid connection path format: ${path}`);
      ws.close(1008, "Invalid connection path format");
      return;
    }

    const role = match[1];
    let name = match[2];
    const action = match[3];
    const parent = match[4] || "";

    console.log(`Connection details - Role: ${role}, Name: ${name}, Action: ${action}, Parent: ${parent}`);

    // Try to find existing client for reconnection
    let clientId = null;
    let existingClient = null;

    // First check if we have a client with this name and role
    clients.forEach((entry, id) => {
      if (entry.client.name === name && entry.client.role === role) {
        console.log(`Found existing client with name ${name} and role ${role}`);
        existingClient = entry.client;
        clientId = id;
      }
    });

    // If no existing client found in active connections, check pending removals
    if (!clientId) {
      for (const [id, removal] of pendingRemovals.entries()) {
        if (removal.clientInfo.name === name && removal.clientInfo.role === role) {
          console.log(`Found pending removal for client ${name}, attempting reconnection`);
          clientId = id;
          existingClient = removal.clientInfo;
          clearTimeout(removal.timeout);
          pendingRemovals.delete(id);
          break;
        }
      }
    }

    // If still no ID found, generate new one
    if (!clientId) {
      clientId = generateId();
      console.log(`Generated new client ID: ${clientId}`);
    } else {
      console.log(`Reusing existing client ID: ${clientId}`);
    }

    const tryRegister = () => {
      const isUsernameTaken = (username) => {
        console.log(`Checking if username ${username} is taken`);
        // Check if username is already taken by a different client
        for (const [id, client] of clients.entries()) {
          if (client.client.name === username && client.client.role === role && id !== clientId) {
            console.log(`Found existing client with same name: ${username}`);
            // If the client with the same name already exists, but the socket is closed, replace it
            if (client.socket.readyState !== 1) { // WebSocket.OPEN
              console.log(`Replacing disconnected client ${username}`);
              clients.delete(id);
              return false;
            }
            return true;
          }
        }
        console.log(`Username ${username} is available`);
        return false;
      };

      if (isUsernameTaken(name)) {
        console.log(`Username ${name} is taken, requesting new username`);
        ws.send(createJSON("username-taken", ""));

        const handleNewUsername = (newMsg) => {
          name = newMsg.toString().trim();
          console.log(`Received new username attempt: ${name}`);
          if (isUsernameTaken(name)) {
            console.log(`New username ${name} is still taken`);
            ws.send("Still taken. Try again.");
            // Wait again for another attempt
            ws.once("message", handleNewUsername);
          } else {
            console.log(`New username ${name} is available, proceeding with registration`);
            // Name is valid — proceed
            const newClient = { 
              name, 
              clientId, 
              role, 
              parent: existingClient?.parent || parent,
              networkManager: existingClient?.networkManager || new NetworkManager(role)
            };
            console.log(`Creating new client:`, newClient);
            isController(newClient);
            
            // Set up event listeners for network discovery if not already set up
            if (!existingClient?.networkManager) {
              newClient.networkManager.on("deviceFound", (device) => {
                console.log(`[${role}] Device found:`, device);
                // Store for REST API
                discoveredDevices.set(device.id, device);
                
                // Send to the client
                console.log(`Forwarding device to client ${clientId}:`, device);
                const deviceMsg = {
                  key: "device-found",
                  data: JSON.stringify(device)
                };
                const clientSocket = clients.get(clientId)?.socket;
                if (clientSocket && clientSocket.readyState === 1) { // WebSocket.OPEN
                  clientSocket.send(JSON.stringify(deviceMsg));
                }
              });
          
              newClient.networkManager.on("connected", (device) => {
                console.log(`[${role}] Connected to device:`, device);
                sendMessage(createJSON("connected", JSON.stringify(device)), clientId);
              });
            }
            
            clients.set(clientId, { client: newClient, socket: ws });
            ws.send(createJSON("welcome", JSON.stringify({ name, role, clientId })));
            setupListeners(ws, newClient);
          }
        };

        ws.once("message", handleNewUsername);
      } else {
        console.log(`Username ${name} is available, proceeding with registration`);
        // Name is valid first try
        const newClient = { 
          name, 
          clientId, 
          role, 
          parent: existingClient?.parent || parent,
          networkManager: existingClient?.networkManager || new NetworkManager(role)
        };
        console.log(`Creating new client:`, newClient);
        isController(newClient);
        
        // Set up event listeners for network discovery if not already set up
        if (!existingClient?.networkManager) {
          newClient.networkManager.on("deviceFound", (device) => {
            console.log(`[${role}] Device found:`, device);
            // Store for REST API
            discoveredDevices.set(device.id, device);
            
            // Send to the client
            console.log(`Forwarding device to client ${clientId}:`, device);
            const deviceMsg = {
              key: "device-found",
              data: JSON.stringify(device)
            };
            const clientSocket = clients.get(clientId)?.socket;
            if (clientSocket && clientSocket.readyState === 1) { // WebSocket.OPEN
              clientSocket.send(JSON.stringify(deviceMsg));
            }
          });
    
          newClient.networkManager.on("connected", (device) => {
            console.log(`[${role}] Connected to device:`, device);
            sendMessage(createJSON("connected", JSON.stringify(device)), clientId);
          });
        }
        
        clients.set(clientId, { client: newClient, socket: ws });
        ws.send(createJSON("welcome", JSON.stringify({ name, role, clientId })));
        setupListeners(ws, newClient);
      }
    };

    ws.once("close", () => {
      console.log(`Client disconnected during username selection`);
    });

    if (action === "init") {
      console.log(`Processing init action for ${role} ${name}`);
      tryRegister();
    } else {
      console.log(`Processing direct registration for ${role} ${name}`);
      // Directly register for non-init actions
      const newClient = { 
        name, 
        clientId, 
        role, 
        parent: existingClient?.parent || parent,
        networkManager: existingClient?.networkManager || new NetworkManager(role)
      };
      console.log(`Creating new client:`, newClient);
      isController(newClient);
      
      // Set up event listeners for network discovery if not already set up
      if (!existingClient?.networkManager) {
        newClient.networkManager.on("deviceFound", (device) => {
          console.log(`[${role}] Device found:`, device);
          // Store for REST API
          discoveredDevices.set(device.id, device);
          clients.set(clientId, { client: newClient, socket: ws });
          
          // Send to the client
          console.log(`Forwarding device to client ${clientId}:`, device);
          const deviceMsg = {
            key: "device-found",
            data: JSON.stringify(device)
          };
          const clientSocket = clients.get(clientId)?.socket;
          if (clientSocket && clientSocket.readyState === 1) { // WebSocket.OPEN
            clientSocket.send(JSON.stringify(deviceMsg));
          }
        });

        newClient.networkManager.on("connected", (device) => {
          console.log(`[${role}] Connected to device:`, device);
          sendMessage(createJSON("connected", JSON.stringify(device)), clientId);
        });
      }
      
      clients.set(clientId, { client: newClient, socket: ws });
      ws.send(createJSON("welcome", JSON.stringify({ name, role, clientId })));
      setupListeners(ws, newClient);
    }
  } catch (err) {
    console.error('Error handling WebSocket connection:', err);
    console.error('Stack trace:', err.stack);
    ws.close(1011, 'Internal server error');
  }
});

// REST API Endpoints for Tauri App
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverRunning: isServerRunning() });
});

app.get('/api/devices', (req, res) => {
  const devices = Array.from(discoveredDevices.values());
  res.json({ devices });
});

app.get('/api/clients', (req, res) => {
  const clientList = Array.from(clients.values()).map(client => ({
    name: client.client.name,
    role: client.client.role,
    parent: client.client.parent,
    id: client.client.clientId
  }));
  res.json({ clients: clientList });
});

app.get('/api/hello', (req, res) => {
  console.log('Received request to /api/hello');
  res.json({ 
    message: "Hello from the Network API!"
  });
});

app.get('/api/run-script', (req, res) => {
  console.log('Received request to /api/run-script');
  // This is a mock implementation - replace with actual script execution if needed
  res.json({
    result: "Script executed successfully!"
  });
});

app.post('/api/connect', (req, res) => {
  const { username, dashboard, controllerId, dataset, partition, language } = req.body;
  
  if (!username || !dashboard || !controllerId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required parameters (username, dashboard, or controllerId)'
    });
  }
  
  console.log(`Connection request from controller ${username} (${controllerId}) to dashboard ${dashboard}`);
  
  // Find controller client
  let controllerClient = null;
  let dashboardClient = null;

  // First try to find by device ID in discoveredDevices
  let dashboardDevice = discoveredDevices.get(dashboard);
  console.log(dashboardDevice);
  if (dashboardDevice) {
    // Find the corresponding client
    let tempArray = Array.from(clients.values());
    let tempDashboardClient = tempArray.find((entry) => {return entry.id === dashboardDevice.id});
    console.log(tempDashboardClient);
    
    // Use find instead of some since we want to get the matching client
    const foundClient = Array.from(clients.entries()).find(([id, entry]) => {
        console.log(entry.client);
        console.log(entry.client.networkManager.id, "is it equal to ", dashboardDevice.id);
        return entry.client.networkManager.id === dashboardDevice.id;
    });

    if (foundClient) {
        const [id, entry] = foundClient;
        dashboardClient = { id, client: entry.client };
        console.log("Dashboard client initialized", dashboardClient);
    }

    // Find controller client by ID
    clients.forEach((entry, id) => {
        if (entry.client.clientId === controllerId && entry.client.role === 'controller') {
            controllerClient = { id, client: entry.client };
        }
    });
  }
  
  if (!controllerClient) {
    return res.status(401).json({
      success: false, 
      error: 'Controller not found' 
    });
  }
    console.log("Is dashboardClient still alive?", !dashboardClient);
  if (dashboardClient === null) {
    return res.status(401).json({
      success: false, 
      error: 'Dashboard not found' 
    });
  }
  
  // Send message to connect controller to dashboard
  try {
    // Update the dashboard's parent to the controller's ID
    dashboardClient.client.parent = controllerId;
    
    // Send set-parent message to dashboard
    const message = {
      key: "set-parent",
      data: JSON.stringify({
        username: username,
        parent: controllerId,
        dataset: dataset || '',
        partition: partition || '',
        language: language || 'en'
      })
    };
    
    sendMessage(JSON.stringify(message), dashboardClient.id);
    
    // Update client list for all clients
    updateClients(controllerClient.id, "parent");
    
    return res.json({ 
      success: true, 
      message: `Connected ${username} to dashboard ${dashboardClient.client.name}`,
      controllerId: controllerId,
      dashboardId: dashboard
    });
  } catch (error) {
    console.error('Error connecting to dashboard:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to connect to dashboard'
    });
  }
});

app.post('/api/discovery', (req, res) => {
  const { role } = req.body;

  if (!role || (role !== 'controller' && role !== 'dashboard')) {
    return res.status(400).json({ error: 'Invalid role. Must be "controller" or "dashboard"' });
  }

  try {
    // Create a new network manager instance
    const tempManager = new NetworkManager(role);

    // Clear previous device list
    discoveredDevices.clear();
    clients.forEach((entry, id) => {
        discoveredDevices.set(id, entry);
    })

    // Listen for new devices
    tempManager.on('deviceFound', (device) => {
      discoveredDevices.set(device.id, device);
    });

    // Start discovery if controller
    if (role === 'controller') {
      tempManager.startDiscovery();
      
      // Set a timeout to stop discovery after 10 seconds
      setTimeout(() => {
        tempManager.stopDiscovery();
      }, 10000);
    }

    res.json({
      success: true,
      message: `Started ${role} discovery`,
      id: tempManager.getId()
    });
  } catch (error) {
    console.error('Error starting discovery:', error);
    res.status(500).json({ error: 'Failed to start discovery' });
  }
});

// New endpoint to trigger network discovery
app.post('/api/discover', (req, res) => {
  console.log('Received request to trigger network discovery');
  let controllerId = req.body.controllerId;
  
  // Clear existing devices so we get fresh results
  discoveredDevices.clear();
  
  // Get the controller's NetworkManager
  const controllerClient = clients.get(controllerId)?.client;
  if (!controllerClient || !controllerClient.networkManager) {
    return res.status(400).json({ 
      success: false,
      error: 'Controller not found or has no NetworkManager' 
    });
  }

  // Create discovery message
  const discoveryData = {
    type: "DISCOVERY",
    id: controllerClient.networkManager.id,
    name: controllerClient.networkManager.name,
    role: controllerClient.networkManager.role,
    timestamp: Date.now()
  };
  
  const discoveryMessage = Buffer.from(JSON.stringify(discoveryData));
  
  // Send discovery broadcast using shared socket
  try {
    if (!sharedSocket) {
      return res.status(500).json({ 
        success: false,
        error: 'Network API not initialized' 
      });
    }

    // Send to broadcast address
    sharedSocket.send(discoveryMessage, 0, discoveryMessage.length, 41234, '255.255.255.255', (err) => {
      if (err) {
        console.error(`Error sending discovery broadcast:`, err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to send discovery broadcast' 
        });
      }
      console.log(`Discovery broadcast sent to 255.255.255.255:41234`);
    });
    
    // Also send to localhost
    sharedSocket.send(discoveryMessage, 0, discoveryMessage.length, 41234, '127.0.0.1', (err) => {
      if (err) {
        console.error(`Error sending discovery to localhost:`, err);
      } else {
        console.log(`Discovery sent to localhost:41234`);
      }
    });

    // Return initial response
    res.json({ 
      success: true,
      message: "Discovery broadcast sent - check /api/devices for results", 
      pendingDiscovery: true 
    });
    
  } catch (err) {
    console.error('Error in discovery broadcast:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send discovery broadcast' 
    });
  }
});

// Add a new API endpoint to test dashboard connectivity
app.get('/api/ping-dashboard/:id', (req, res) => {
  const dashboardId = req.params.id;
  
  console.log(`Received dashboard ping request for ${dashboardId}`);
  
  // Try to find the dashboard by ID or IP
  let dashboard = discoveredDevices.get(dashboardId);
  if (!dashboard) {
    // If not found by ID, search by IP address
    discoveredDevices.forEach((device) => {
      if (device.address === dashboardId || device.ip === dashboardId) {
        dashboard = device;
      }
    });
  }
  
  if (!dashboard) {
    // Dashboard not found in discovered devices, check connected clients
    let dashboardClient = null;
    clients.forEach((entry) => {
      if ((entry.client.id === dashboardId || entry.client.name === dashboardId) && 
          entry.client.role === 'dashboard') {
        dashboardClient = entry.client;
      }
    });
    
    if (dashboardClient) {
      return res.json({
        success: true,
        message: 'Dashboard is connected directly to this server',
        device: {
          id: dashboardClient.id || dashboardClient.clientId,
          name: dashboardClient.name,
          role: 'dashboard',
          status: 'online',
          connection: 'direct'
        }
      });
    }
    
    return res.status(404).json({
      success: false,
      message: 'Dashboard not found'
    });
  }
  
  // Create a temporary network manager to ping the dashboard
  const tempManager = new NetworkManager('controller');
  let receivedResponse = false;
  
  // Set a response timeout
  const responseTimeout = setTimeout(() => {
    if (!receivedResponse) {
      tempManager.socket.close();
      res.status(408).json({
        success: false,
        message: 'Dashboard did not respond to ping',
        device: dashboard
      });
    }
  }, 5000);
  
  // Listen for responses
  tempManager.on("deviceFound", (device) => {
    if (device.id === dashboard.id || device.address === dashboard.address || 
        device.ip === dashboard.ip) {
      receivedResponse = true;
      clearTimeout(responseTimeout);
      
      // Update the device status
      dashboard.status = 'online';

      
      res.json({
        success: true,
        message: 'Dashboard responded to ping',
        device: device
      });
      
      // Clean up
      setTimeout(() => {
        tempManager.socket.close();
      }, 1000);
    }
  });
  
  // Send a targeted discovery message
  const discoveryData = {
    type: "DISCOVERY",
    id: tempManager.id,
    name: tempManager.name,
    role: 'controller',
    timestamp: Date.now()
  };
  
  const discoveryMessage = Buffer.from(JSON.stringify(discoveryData));
  
  console.log(`Sending targeted discovery to dashboard at ${dashboard.address}`);
  tempManager.socket.send(discoveryMessage, 0, discoveryMessage.length, 41234, dashboard.address, (err) => {
    if (err) {
      console.error(`Error sending targeted discovery:`, err);
      clearTimeout(responseTimeout);
      res.status(500).json({
        success: false,
        message: 'Failed to send discovery message',
        error: err.message
      });
      
      tempManager.socket.close();
    } else {
      console.log(`Targeted discovery sent to ${dashboard.address}, waiting for response...`);
    }
  });
});

// Add a map tile proxy for accessing OSM tiles
app.get('/proxy/tiles/:s/:z/:x/:y.png', (req, res) => {
  const { s, z, x, y } = req.params;
  const tileUrl = `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  
  console.log(`Proxying map tile request to: ${tileUrl}`);
  
  // Forward the request to OpenStreetMap
  const https = require('https');
  https.get(tileUrl, (tileRes) => {
    // Set appropriate headers
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*'
    });
    
    // Pipe the tile data directly to our response
    tileRes.pipe(res);
  }).on('error', (err) => {
    console.error(`Error proxying tile request: ${err.message}`);
    res.status(500).send('Error loading map tile');
  });
});

app.get('/data/:file', (req, res) => {
    const file = req.params.file;
    const filePath = path.join(path.dirname(process.execPath), 'data', file);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
    }

    res.sendFile(filePath);
});


app.get('/data/:dir/:file', (req, res) => {
    const file = req.params.file;
    const dir = req.params.dir;
    return res.get(path.join(path.dirname(process.execPath)), 'data', dir, file);

})


// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebSocket server is running at ws://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('Error starting server:', err);
  console.error('Stack trace:', err.stack);
  // Keep the process alive for a moment to allow logging
  setTimeout(() => {
    process.exit(1);
  }, 5000);
}); 

// Add this function back before the WebSocket connection handler
function isController(client) {
  if (client.role === "controller") {
    recoverHistoryLog(client.name, client.clientId);
    return true;
  }
  return false;
} 