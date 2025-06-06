import * as console from "node:console";
import WebSocket, { WebSocketServer } from 'ws';
import * as http from "http";
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import {NetworkManager, DeviceInfo} from "./network";
import bodyParser from 'body-parser';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
let networkManager: NetworkManager;

// CORS configuration for Tauri app
app.use(cors({
  origin: '*', // Adjust based on your security needs
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// For parsing JSON payloads
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// Store connected clients
const clients = new Map<number, { client: Client; socket: WebSocket }>();
let nextClientId = 1;

// Store discovered network devices for REST API access
const discoveredDevices = new Map<string, DeviceInfo>();

declare namespace NodeJS {
  interface Process {
    pkg?: {
      entrypoint: string;
      defaultEntrypoint: string;
    };
  }
}

interface Client {
  name: string;
  clientId: number;
  role: string;
  parent: string;
}

const logPath: String = getLogsPath();
const logFile: string = path.join(logPath.toString());
if (!fs.existsSync(logFile)) {
  fs.mkdirSync(logFile);
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

// Checks if the WebSocketServer is still listening to connections, if not then it must be off
function isServerRunning(): boolean {
  return (wss.options.server && wss.options.server?.listening) === true;
}

// Checks if a client is connected using its designated ID, if the readyState isn't open then the client isn't connected
function isClientConnected(clientId: number): boolean {
  let client = clients.get(clientId);
  if (client) {
    let clientSocket: WebSocket = client.socket;
    return clientSocket.readyState === WebSocket.OPEN;
  }
  else {
    return false;
  }
}

function getIdByName(name: string): number | undefined {
  for (const id of clients.keys()) {
    const entry = clients.get(id);
    if (entry?.client.name === name) {
      return id;
    }
  }
  return undefined;
}

// Function to simplify communications between the frontend and the backend
function createJSON(type: String, data: String) {
  const jsonObj = {
    key: type,
    data: data
  };
  return JSON.stringify(jsonObj);
}

// Wrapper function to handle exceptions
function handleException(err: Error) {
  if (err.message !== null && err.message.includes("pipe")) {
    console.error("The session has already been closed...");
  }
  else {
    console.error(err.message);
    console.error(err.stack);
  }
}

// Get client by ID
function getClient(clientId: number): Client | undefined | null {
  try {
    if (!clients.get(clientId)?.client === undefined) {
      return clients.get(clientId)?.client;
    }
    else {
      throw new Error("client client does not exist");
    }
  }
  catch (err: unknown) {
    if (err instanceof Error) {
      handleException(err);
      return null;
    } else {
      console.error("An unknown error occurred:", err);
      return null;
    }
  }
}

// -------------------------------------------------------------------
// History related methods

async function recoverHistoryLog(client: String, clientId: number) {
  let filePath: String = getHistoryFilePath(client);
  try {
    // If the file doesn't exist then we try to write in it with a+ flag (creates file if not exist)
    if (!fs.existsSync(filePath.toString())) {
      try {
        fs.writeFile(filePath.toString(), "", { flag: "a+" }, (err) => {
          if (err) throw err;
        });
        console.log("File " + filePath + "created.");
      } catch (err: unknown) {
        if (err instanceof Error) {
          handleException(err);
        } else {
          console.error("An unknown error occurred:", err);
        }
      }
    }
    else {
      console.log("File " + filePath + "already exists.");
      let fileContent: Array<String> | null = await getHistoryFileContent(filePath);
      if (!fileContent) {
        throw new Error("File " + filePath + " does not exist.");
      }
      let nbItems: number = fileContent.length;
      let count: number = 1;

      fileContent.forEach((item: String) => {
        let data = { total: nbItems, index: count, element: item };
        if (isServerRunning() && isClientConnected(clientId)) {
          sendMessage(createJSON("history", JSON.stringify(data)), clientId);
          count++;
        }
      });
    }
  }
  catch (err: unknown) {
    if (err instanceof Error) {
      handleException(err);
    } else {
      console.error("An unknown error occurred:", err);
    }
  }
}

// Reads each line of the history file and returns an array where at each index we have a line of the file
async function getHistoryFileContent(filePath: String): Promise<Array<string> | null> {
  try {
    // Solution from : https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line
    const fileStream = fs.createReadStream(filePath.toString());
    let fileContent: Array<string> = [];
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.
    for await (const line of rl) {
      // Each line in input.txt will be successively available here as `line`.
      fileContent.push(line);
    }
    return fileContent;
  } catch (err: unknown) {
    if (err instanceof Error) {
      handleException(err);
    } else {
      console.error("An unknown error occurred:", err);
    }
  }
  return null;
}

async function updateHistoryFile(client: String, value: string, action: String, index: String): Promise<void> {
  try {
    let filePath: String = getHistoryFilePath(client);
    let fileContent: Array<string> | null = await getHistoryFileContent(filePath);
    if (fileContent !== null) {
      switch (action) {
        case "append":
          fs.writeFile(filePath.toString(), value + "\n", { flag: 'a+' }, (err) => {
            if (err) throw err;
          });
          break;
        case "remove-item":
          fileContent.forEach((item: string, removedIndex: number) => {
            if (JSON.parse(item).index === index) {
              fileContent[removedIndex] = JSON.stringify(value + "\n");
            }
          });
          break;
        case "clear":
          fs.writeFile(filePath.toString(), "", { flag: 'w' }, (err) => {
            if (err) throw err;
          });
          break;
        default:
          fs.writeFile(filePath.toString(), value + "\n", { flag: 'a+' }, (err) => {
            if (err) throw err;
          });
          break;
      }
    }
  }
  catch (err: unknown) {
    if (err instanceof Error) {
      handleException(err);
    } else {
      console.error("An unknown error occurred:", err);
    }
  }
}

// Get the path for the logs, checks if we're running a build version to get the proper path
function getLogsPath(): string {
  const isCompiled = typeof (process as any).pkg !== "undefined";

  const basePath = isCompiled
    ? path.dirname(process.execPath)
    : __dirname;

  const logPath = path.join(basePath, "estime-logs") + path.sep;

  console.log("Log directory path:", logPath);
  return logPath;
}

// Get the client's history file
function getHistoryFilePath(client: String): String {
  let fileName: String = "history-" + client + ".txt";
  return getLogsPath() + "" + fileName;
}

//----------------------------------
// Server stuff

function sendMessage(msg: String, idClient: number): void {
  try {
    let clientSocket: WebSocket | undefined = clients.get(idClient)?.socket;

    if (clientSocket) {
      clientSocket.send(JSON.stringify(msg));
    } else {
      throw new Error(`Client ${idClient} socket is undefined`);
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      handleException(err);
    } else {
      console.error("An unknown error occurred:", err);
    }
  }
}

function checkUsername(clientId: number, client: String): boolean {
  if (getClient(clientId)?.name === client) {
    sendMessage(createJSON("username-taken", ""), clientId);
  }
  return getClient(clientId)?.name === client;
}

function setupListeners(ws: WebSocket, client: Client) {
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
          // Equivalent to Java update-username
          let isDuplicate: boolean = false;
          clients.forEach(checkingClient => {
            if (dataMessage.username === checkingClient.client.name) {
              isDuplicate = true;
            }
          });

          if (isDuplicate) {
            sendMessage(createJSON("username-taken", ""), client.clientId);
          } else {
            for (const id of clients.keys()) {
              const entry = clients.get(id);
              if (entry && entry.client.clientId === client.clientId) {
                entry.client.name = dataMessage.username;
                clients.set(id, entry);
              }
            }
          }
          updateClients(client.clientId, "update-username");
          break;

        case "set-parent":
          // Equivalent to Java set-parent
          if (client !== null && client.role === "controller") {
            const dashboardId = getIdByName(dataMessage.dashboard);
            if (dashboardId !== undefined) {
              for (let id of clients.keys()) {
                const entry = clients.get(id);
                if (entry && entry.client.clientId === dashboardId) {
                  entry.client.parent = dataMessage.parent;
                  sendMessage(createJSON("set-parent", messageJson.data), dashboardId);
                }
              }
              updateClients(client.clientId, "parent");
            }
          }
          break;

        case "unset-parent":
          // Equivalent to Java unset-parent
          if (client !== null && client.role === "controller") {
            const dashboardId = getIdByName(dataMessage.dashboard);
            if (dashboardId !== undefined) {
              for (let id of clients.keys()) {
                const entry = clients.get(id);
                if (entry && entry.client.clientId === dashboardId) {
                  entry.client.parent = "";
                  sendMessage(createJSON("unset-parent", messageJson.data), dashboardId);
                }
              }
              updateClients(client.clientId, "parent");
            }
          }
          break;

        case "elements":
          // Equivalent to Java elements
          if (client !== null && client.role === "dashboard") {
            const parentId = getIdByName(dataMessage.parent);
            if (parentId !== undefined) {
              sendMessage(createJSON("elements", messageJson.data), parentId);
            }
          }
          break;

        case "clear-history":
          // Equivalent to Java clear-history
          updateHistoryFile(dataMessage.client, "", "clear", "");
          break;

        case "save-history":
          // Equivalent to Java save-history
          updateHistoryFile(dataMessage.client, dataMessage.data, "append", "");
          break;

        case "remove-history-item":
          // Equivalent to Java remove-history-item
          updateHistoryFile(dataMessage.client, "", "remove-item", dataMessage.itemID);
          break;

        case "init":
          // Handle network discovery
          networkManager = new NetworkManager(dataMessage.role);
          networkManager.startDiscovery();

          // Event listeners for network discovery
          networkManager.on("deviceFound", (device) => {
            // Store for REST API
            discoveredDevices.set(device.id, device);
            sendMessage(createJSON("device-found", JSON.stringify(device)), client.clientId);
          });

          networkManager.on("connected", (device) => {
            sendMessage(createJSON("connected", JSON.stringify(device)), client.clientId);
          });
          break;

        case "connect-to-device":
          // Connect to a specific device
          if (networkManager) {
            const device = networkManager.connectTo(dataMessage.deviceId);
            if (device) {
              if (client.role === "dashboard") {
                client.parent = device.id;
              }
              updateClients(client.clientId, "connect");
            }
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
    clients.delete(client.clientId);
    console.log(`Client ${client.name} disconnected`);
    updateClients(client.clientId, "close");
  });
}

// Function to broadcast messages to appropriate clients
function broadcastMessage(msg: String, fromClientId: number): void {
  try {
    // Send to source client
    sendMessage(msg, fromClientId);

    // Get source client
    const sourceClient = getClient(fromClientId);
    if (!sourceClient) return;

    // If client is controller, send to all connected dashboards
    if (sourceClient.role === "controller") {
      clients.forEach((clientEntry, id) => {
        if (clientEntry.client.parent === sourceClient.name) {
          sendMessage(msg, id);
        }
      });
    }
    // If client is dashboard, send to parent controller
    else if (sourceClient.role === "dashboard" && sourceClient.parent) {
      const parentId = getIdByName(sourceClient.parent);
      if (parentId !== undefined) {
        sendMessage(msg, parentId);
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      handleException(err);
    } else {
      console.error("An unknown error occurred:", err);
    }
  }
}

function updateClients(clientId: number, action: String): void {
  try {
    // Build client list to share with everyone
    const clientsList: Array<object> = [];

    // Add all clients to the list
    clients.forEach((clientEntry, id) => {
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
  } catch (err: unknown) {
    if (err instanceof Error) {
      handleException(err);
    } else {
      console.error("An unknown error occurred:", err);
    }
  }
}

// Standard WebSocket connection handler
wss.on("connection", (ws: WebSocket, request: http.IncomingMessage) => {
  const path = request.url || "";
  const match = path.match(
    /^\/server\/(controller|dashboard)-([\p{L}\w]+)-([a-zA-Z]+)(?:-([\p{L}\w]+))?$/u
  );

  if (!match) {
    ws.close(1008, "Invalid connection path format");
    return;
  }

  const role = match[1];
  let name = match[2];
  const action = match[3];
  const parent = match[4] || "";

  const clientId = nextClientId++;
  const tryRegister = () => {
    if (isUsernameTaken(name)) {
      ws.send("Username is taken. Please send a new one:");

      const handleNewUsername = (newMsg: WebSocket.RawData) => {
        name = newMsg.toString().trim();
        if (isUsernameTaken(name)) {
          ws.send("Still taken. Try again.");
          // Wait again for another attempt
          ws.once("message", handleNewUsername);
        } else {
          // Name is valid — proceed
          const newClient: Client = { name, clientId, role, parent };
          isController(newClient);
          clients.set(clientId, { client: newClient, socket: ws });
          ws.send(`Welcome ${name}!`);
          setupListeners(ws, newClient);
        }
      };

      ws.once("message", handleNewUsername);
    } else {
      // Name is valid first try
      const newClient: Client = { name, clientId, role, parent };
      isController(newClient);
      clients.set(clientId, { client: newClient, socket: ws });
      ws.send(`Welcome ${name}!`);
      setupListeners(ws, newClient);
    }
  };

  const isUsernameTaken = (username: string) =>
    Array.from(clients.values()).some(client =>
      client.client.name === username
    );

  ws.once("close", () => {
    console.log(`Client disconnected during username selection`);
  });

  if (action === "init") {
    tryRegister();
  } else {
    // Directly register for non-init actions
    const newClient: Client = { name, clientId, role, parent };
    isController(newClient);
    clients.set(clientId, { client: newClient, socket: ws });
    ws.send(`Welcome ${name}!`);
    setupListeners(ws, newClient);
  }
  function isController(client: Client): boolean {
    if (client.role === "controller") {
      recoverHistoryLog(client.name, client.clientId).then(r => { });
      return true;
    }
    return false;
  }
});

//----------------------------------
// REST API Endpoints for Tauri App
//----------------------------------

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', serverRunning: isServerRunning() });
});

// Get all discovered devices
app.get('/api/devices', (req: Request, res: Response) => {
  const devices = Array.from(discoveredDevices.values());
  res.json({ devices });
});

// Get all connected clients
app.get('/api/clients', (req: Request, res: Response) => {
  const clientList = Array.from(clients.values()).map(client => ({
    name: client.client.name,
    role: client.client.role,
    parent: client.client.parent,
    id: client.client.clientId
  }));
  res.json({ clients: clientList });
});

// Initialize network discovery
// @ts-ignore
app.post('/api/discovery', (req: Request, res: Response) => {
  const { role } = req.body;

  if (!role || (role !== 'controller' && role !== 'dashboard')) {
    return res.status(400).json({ error: 'Invalid role. Must be "controller" or "dashboard"' });
  }

  try {
    networkManager = new NetworkManager(role);

    // Clear previous device list
    discoveredDevices.clear();

    // Listen for new devices
    networkManager.on('deviceFound', (device) => {
      discoveredDevices.set(device.id, device);
    });

    // Start discovery if controller
    if (role === 'controller') {
      networkManager.startDiscovery();
    }

    res.json({
      success: true,
      message: `Started ${role} discovery`,
      id: networkManager.getId()
    });
  } catch (error) {
    console.error('Error starting discovery:', error);
    res.status(500).json({ error: 'Failed to start discovery' });
  }
});

// Connect to a device
// @ts-ignore
app.post('/api/connect', (req: Request, res: Response) => {
  const { deviceId, clientName, role } = req.body;
  
  if (!networkManager) {
    return res.status(400).json({ error: 'Network manager not initialized. Call /api/discovery first' });
  }
  
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }
  
  try {
    const device = networkManager.connectTo(deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json({ 
      success: true, 
      message: `Connected to ${device.name}`,
      device 
    });
  } catch (error) {
    console.error('Error connecting to device:', error);
    res.status(500).json({ error: 'Failed to connect to device' });
  }
});

// Send a message to connected clients
// @ts-ignore
app.post('/api/message', (req: Request, res: Response) => {
  const { key, data, target } = req.body;
  
  if (!key) {
    return res.status(400).json({ error: 'key is required' });
  }
  
  try {
    // Find target client
    let targetClientId: number | undefined;
    
    if (target) {
      targetClientId = getIdByName(target);
      if (targetClientId === undefined) {
        return res.status(404).json({ error: 'Target client not found' });
      }
    }
    
    // Create message
    const jsonMessage = createJSON(key, JSON.stringify(data || {}));
    
    // Send to specific client or broadcast
    if (targetClientId !== undefined) {
      sendMessage(jsonMessage, targetClientId);
    } else {
      // Broadcast to all
      clients.forEach((client, id) => {
        if (isClientConnected(id)) {
          sendMessage(jsonMessage, id);
        }
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get history for a client
// @ts-ignore
app.get('/api/history/:clientName', async (req: Request<{ clientName: string }>, res: Response) => {
  const { clientName } = req.params;
  
  try {
    const filePath = getHistoryFilePath(clientName);
    const history = await getHistoryFileContent(filePath);
    
    if (!history) {
      return res.status(404).json({ error: 'History not found' });
    }
    
    res.json({ history });
  } catch (error) {
    console.error('Error retrieving history:', error);
    res.status(500).json({ error: 'Failed to retrieve history' });
  }
});

// Update history
// @ts-ignore
app.post('/api/history/:clientName', async (req: Request<{ clientName: string }>, res: Response) => {
  const { clientName } = req.params;
  const { action, data, itemId } = req.body;
  
  if (!action || !['append', 'clear', 'remove-item'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be "append", "clear", or "remove-item"' });
  }
  
  try {
    await updateHistoryFile(
      clientName, 
      data || '', 
      action, 
      itemId || ''
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating history:', error);
    res.status(500).json({ error: 'Failed to update history' });
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebSocket server is running at ws://localhost:${PORT}`);
});


