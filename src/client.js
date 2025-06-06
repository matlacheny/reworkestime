/**
 * This file manages the exchange of information between client and server
 */

class Client{
	
	constructor(protocol, hostname){
		this.webSocket = null;
	    this.msgQueue = [];
	    this.url = null;
	    
	    this.username = null;
	    this.role = null;
	    this.parent = null; // it defines the controller client to which this is connected
	    this.clientId = null; // Store the client ID
	    
	    this.protocol = protocol;
	    this.hostname = hostname;
	    this.port = 3000; // Default port for the API
	    
	    // Check if we're running in Tauri
	    this.isTauri = typeof window.__TAURI__ !== 'undefined';
	    
	    // Initialize network state
	    this.networkInitialized = false;
	    this.connectedToDevice = false;
	    

	}
	
	recoverSession(){
		var recover = sessionStorage.getItem("client-parent");
		this.parent = recover || null;
		
		recover = sessionStorage.getItem("client-role");
		this.role = recover || null;
		
		recover = sessionStorage.getItem("client-name"); 
		this.username = recover || null;
		
		if (this.username) {
		    // We have a username, try to reconnect
		    console.log("Recovered session, username:", this.username);
		    this.setUrl('reconnect');
		    
		    // Check if menu is available and data is loaded before initializing
		    if (menu) {
		        // Set a flag to initialize when needed
		        this.needsInit = true;
		        
		        // Check if data is ready
		        if (menu.data && menu.data['indicators']) {
		            console.log("Menu data ready, initializing UI");
		            menu.init();
		            this.needsInit = false;
		        } else {
		            console.log("Menu data not ready, will initialize when loaded");
		        }
		    }
		} else if (typeof menu !== 'undefined') {
		    menu.loadInitialPage();
		} else {
		    console.log("Menu not initialized yet, will load initial page later");
		}
	}
	
	// -----------------------------------------------------
	// getters and setters
	setUsername(value, invalid){
		this.username = value;
		sessionStorage.setItem('client-name', this.username);
		
		const attrs = {
				"username": value
		}
		const msg = createJSONMessage("update-username", attrs);
		
		if (invalid) {
			menu.setPageName();
			this.wsSendMessage(msg);
		}
		else {
		    console.log(`Setting username: ${value}, connecting with 'init' action`);
		    this.setUrl('init');
		    
		    // Initialize the UI regardless of WebSocket connection status
		    if (menu && typeof menu.init === 'function') {
		        console.log("Initializing UI for role:", this.role);
		        setTimeout(() => menu.init(), 500);
		    }
		}
	};
	
	setParent(value){
		this.parent = value;
		sessionStorage.setItem('client-parent', this.parent);
	}
	
	setRole(value){
		this.role = value;
		sessionStorage.setItem('client-role', this.role);
	}
	
	getUsername(){
		return this.username;
	}
	
	getParent(){
		return this.parent;
	}
	
	getRole(){
		return this.role;
	}

	getId(){
		return this.clientId;
	}
	
	setUrl(action){
		let username = this.role + '-' + this.username + '-' + action;
		username = this.parent ? username + '-' + this.parent : username;
		
		// Always use localhost with the default API port when running in Tauri
		const baseUrl = `ws://localhost:${this.port}`;
		this.url = `${baseUrl}/server/${username}`;
		
		console.log("Connecting to WebSocket:", this.url);
		this.wsConnect();
		
		// For reconnections, allow more time before showing an error
		const isReconnecting = action === 'reconnect';
		const timeoutDuration = isReconnecting ? 5000 : 3000;
		
		// Add fallback: If connection fails after timeout, show error
		setTimeout(() => {
			if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
				console.error("WebSocket connection failed - API may not be running");
				
				// Don't show the error immediately for reconnects - we'll retry
				if (!isReconnecting || this.reconnectAttempts >= 5) {
					this.showNetworkError();
				}
			}
		}, timeoutDuration);
	}

	setClientId(value) {
		this.clientId = value;
		sessionStorage.setItem('client-id', this.clientId);
	}

	getClientId() {
		return this.clientId;
	}

	//----------------------------------------------------------------------
	// WebSocket manipulation
	
	wsConnect(){
		const self = this;
		
		try {
		    if (this.webSocket && this.webSocket.readyState !== WebSocket.CLOSED) {
		        console.log("WebSocket already exists, closing before reconnecting");
		        this.webSocket.close();
		    }
		    
		    console.log("Creating new WebSocket connection to:", this.url);
		    this.webSocket = new WebSocket(self.url);
		    
		    this.webSocket.onopen = function() { self.wsOnOpen(); };
		    this.webSocket.onmessage = function(msg) { self.wsGetMessage(msg); };
		    this.webSocket.onclose = function() { self.wsOnClose(); };
		    this.webSocket.onerror = function(error) { 
		        console.error("WebSocket error:", error);
		        self.wsOnError(); 
		    };
		} catch (error) {
		    console.error("Failed to connect to WebSocket:", error);
		    this.showNetworkError();
		}
	}
	
	// Display network error message
	showNetworkError() {
		console.error("Network API is required - cannot proceed without it");
		
		// Don't show error message during reconnection attempts unless we've tried multiple times
		if (this.username && sessionStorage.getItem("client-name")) {
			// This is likely a reconnection attempt, not first-time connection
			// Check if we already have an error notification
			const existingError = document.querySelector('.error-notification');
			if (existingError) {
				return; // Don't keep adding notifications
			}
			
			// Only show error after multiple failures
			if (this.reconnectAttempts < 5) {
				console.log("Delaying error notification during reconnection attempt");
				return;
			}
		}
		
		// Display error message to user
		const errorMsg = document.createElement('div');
		errorMsg.className = 'error-notification';
		errorMsg.textContent = 'ERROR: Network API is not running. Please restart the application.';
		document.body.appendChild(errorMsg);
		
		// Style the notification
		errorMsg.style.position = 'fixed';
		errorMsg.style.top = '50%';
		errorMsg.style.left = '50%';
		errorMsg.style.transform = 'translate(-50%, -50%)';
		errorMsg.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
		errorMsg.style.color = 'white';
		errorMsg.style.padding = '20px';
		errorMsg.style.borderRadius = '5px';
		errorMsg.style.zIndex = '9999';
		errorMsg.style.textAlign = 'center';
		errorMsg.style.fontWeight = 'bold';
		
		// Initialize UI anyway, even if the network is not available
		if (this.role && this.username && menu && typeof menu.init === 'function') {
			console.log("Initializing UI despite network error");
			setTimeout(() => menu.init(), 1000);
		}
	}

	wsGetMessage(msg){	
		try {
			const message = JSON.parse(msg.data);
			console.log('Received message:', message);
			
			// Process the message based on its type
			switch (message.key) {
				case 'welcome':
					const data = JSON.parse(message.data);
					console.log(`Connected as ${data.role}: ${data.name}`);
					this.networkInitialized = true;
					if (data.clientId) {
						this.setClientId(data.clientId);
						console.log('Received client ID:', data.clientId);
					}
					break;
				case 'time-period':
					const timeData = JSON.parse(message.data);
					menu.dashboard.updatePeriod(timeData);
					break;
				case 'update-workspace':
					const workspaceData = JSON.parse(message.data);
					menu.update(workspaceData);
					break;
				case 'update-clients':
					const clientsData = JSON.parse(message.data);
					menu.updateClients(clientsData);
					break;
				case 'savetopng':
					const pngData = JSON.parse(message.data);
					menu.saveToPNG(pngData);
					break;
				case 'select-sector':
					const sectorData = JSON.parse(message.data);
					menu.selectSector(sectorData);
					break;
				case 'update-mapview':
					const mapData = JSON.parse(message.data);
					menu.updateMapView(mapData);
					break;
				case 'update-attrs':
					const attrsData = JSON.parse(message.data);
					menu.updateAttrs(attrsData);
					break;
				case 'update-stc':
					menu.updateSTC(message);
					break;
				case 'get-reference':
					menu.sendReference();
					break;
				case 'history':
					const historyData = JSON.parse(message.data);
					menu.history.recoverData(historyData);
					break;
				case 'set-parent':
					const parentData = JSON.parse(message.data);
					console.log("Processing set-parent message:", parentData);
					if (parentData.parent) {
						this.setParent(parentData.parent);
						menu.updateParentInfo(parentData);
					}
					break;
				case 'unset-parent':
					this.setParent(null);
					menu.updateParentInfo(null);
					break;			
				case 'elements':
					const elementsData = JSON.parse(message.data);
					menu.restoreElements(elementsData);
					break;
				case 'update-trajs':
					const trajsData = JSON.parse(message.data);
					menu.updateTrajs(trajsData);
					break;
				case 'username-taken':
					menu.setUsername(this.role, true);
					break;
				case 'device-found':
					// Handle discovered network device
					const deviceData = JSON.parse(message.data);
					console.log("Found device:", deviceData);
					menu.updateNetworkDevices(deviceData);
					break;
				case 'connected':
					// Handle successful connection to a device
					const connectionData = JSON.parse(message.data);
					console.log("Connected to device:", connectionData);
					this.connectedToDevice = true;
					menu.updateConnectionStatus(connectionData);
					break;
				case 'connection-error':
					// Handle connection errors
					console.error('Connection error:', message.data);
					break;
				default:
					console.log('Unhandled message type:', message.key);
			}
		} catch (error) {
			console.error('Error processing message:', error);
		}
	}

	wsOnOpen(){
		console.log("WebSocket connected!");
	    this.wsSendNextMessages();
	    
	    // If this is a fresh connection and we haven't initialized network yet
	    if (!this.networkInitialized && this.role) {
	        this.initNetworkDiscovery();
	    }
	}

	wsSendMessage(message){
	    console.log("Queuing message:", message);
	    this.msgQueue.push(message);
	    this.wsSendNextMessages();
	}

	wsSendNextMessages(){
	    if (this.msgQueue.length == 0) {
	        return; // nothing to do
	    }
	    else if (this.webSocket == null) {
	        this.wsConnect();
	    }
	    else if (this.webSocket.readyState == 1 /* OPEN */) {
	        let message = this.msgQueue.shift();
	        console.log("Sending message:", message);
	        this.webSocket.send(JSON.stringify(message));
	        this.wsSendNextMessages(); // recurse
	    }
	}

	wsCloseConnection(){
		this.webSocket.close();
	}

	wsOnClose(){
		console.log("WebSocket disconnected");
		if (this.role == 'controller') menu.history.clear();
	    this.webSocket = null;
	    
	    // Reconnect after a delay if we were previously connected to a device
	    if (this.connectedToDevice) {
	        console.log("Reconnecting in 2 seconds...");
	        setTimeout(() => {
	            this.wsConnect();
	        }, 2000);
	    }
	}

	wsOnError(){
		console.log("WebSocket error occurred");
		if (this.webSocket) {
		    this.webSocket.close();
		}
		
		// After error, attempt reconnection before giving up
		this.reconnectAttempts = this.reconnectAttempts || 0;
		
		// Increase number of reconnection attempts for refreshes
		const maxReconnectAttempts = this.username && sessionStorage.getItem("client-name") ? 7 : 3;
		
		if (this.reconnectAttempts < maxReconnectAttempts) {
		    this.reconnectAttempts++;
		    console.log(`WebSocket reconnection attempt ${this.reconnectAttempts}`);
		    
		    // Increase delay for each subsequent attempt
		    setTimeout(() => {
		        this.reconnectToWebSocket();
		    }, 1000 * this.reconnectAttempts); // Increasing backoff
		} else {
		    // After multiple failures, show network error
		    this.showNetworkError();
		}
		
		// Even if connection fails, initialize the UI if not already done
		if (this.role && this.username && 
			menu && typeof menu.init === 'function' && !menu.initialized) {
			console.log("Initializing UI after WebSocket errors");
			setTimeout(() => menu.init(), 500);
		}
	}

	// New method to handle reconnection
	reconnectToWebSocket() {
	    if (this.url) {
	        console.log("Attempting to reconnect to WebSocket");
	        this.wsConnect();
	    } else if (this.role && this.username) {
	        // Recreate URL if needed
	        this.setUrl('reconnect');
	    }
	}

	// Network device methods
	
	// Connect to a discovered device
	connectToDevice(deviceId) {
	    console.log("Connecting to device:", deviceId);
	    const msg = createJSONMessage("connect-to-device", { deviceId });
	    this.wsSendMessage(msg);
	}
	
	// Initialize network discovery
	initNetworkDiscovery() {
	    console.log("Initializing network discovery, role:", this.role);
	    try {
	        // Clear any existing discovery errors
	        const existingError = document.querySelector('.error-notification');
	        if (existingError) {
	            existingError.remove();
	        }
	        
	        // Force discovery regardless of prior initialization
	        this.networkInitialized = true;
	        
	        // Send discovery message
	        const msg = createJSONMessage("init", { 
	            role: this.role, 
	            forceDiscovery: true,
	            timestamp: Date.now() // Add timestamp to ensure unique message
	        });
	        this.wsSendMessage(msg);
	        
	        // If we're a controller looking for dashboards, also send a specific discovery request
	        if (this.role === 'controller') {
	            console.log("Controller sending dashboard discovery request");
	            const discoveryMsg = createJSONMessage("discover-dashboards", {
	                controllerName: this.username,
	                timestamp: Date.now()
	            });

	        }
	        
	        // Update the menu after discovery completes
	        if (menu && typeof menu.updateDashboards === 'function' && this.role === 'controller') {
	            setTimeout(() => {
	                menu.updateDashboards();
	            }, 1500);
	        }
	    } catch (error) {
	        console.error("Error during network discovery:", error);
	        this.networkInitialized = true; // Mark as initialized anyway
	    }
	}
};

// Helper function to create JSON messages
function createJSONMessage(key, data) {
    return {
        key: key,
        data: typeof data === 'string' ? data : JSON.stringify(data)
    };
}

