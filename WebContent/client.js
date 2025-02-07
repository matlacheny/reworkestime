/**
 * This file manages the exchange of information between client and server
 */

class Client{
	
	constructor(protocol, hostname, port){
		this.webSocket = null;
	    this.msgQueue = [];
	    this.url = null;
	    
	    this.username = null;
	    this.role = null;
	    this.parent = null; // it defines the controller client to which this is connected
	    
	    this.protocol = protocol;
	    this.hostname = hostname;
	    this.port = port;
	}
	
	recoverSession(){
		var recover = sessionStorage.getItem("client-parent");
		this.parent = recover || null;
		
		recover = sessionStorage.getItem("client-role");
		this.role = recover || null;
		
		recover = sessionStorage.getItem("client-name"); 
		this.username = recover || null;
		
		if (this.username) this.setUrl('reconnect');
		else menu.loadInitialPage();
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
			this.wsSendMessage(msg) 
		}
		else this.setUrl('init') 
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
	
	setUrl(action){
		let username = this.role + '-' + this.username + '-' + action;
		username = this.parent ? username + '-' + this.parent : username;
		
		//this.url = this.protocol+'://'+this.hostname+(this.port ? ':'+this.port : '')+'/estime/server/'+username;
		this.url = '/estime/server/'+username;
		this.wsConnect();
	}

	//----------------------------------------------------------------------
	// WebSocket manipulation
	
	wsConnect(){
		const self = this;
		
		this.webSocket = new WebSocket(self.url);
		this.webSocket.onopen = function() { self.wsOnOpen(); };
		this.webSocket.onmessage = function(msg) { self.wsGetMessage(msg); };
		this.webSocket.onclose = function() { self.wsOnClose(); };
		this.webSocket.onerror = function() { self.wsOnError(); };
	}

	wsGetMessage(msg){	
		
		var d = JSON.parse(msg.data);

		var data = d.data.length > 0 ? JSON.parse(d.data) : d.data;
		
		switch(d.key){
		case 'time-period':
			menu.dashboard.updatePeriod(data);
			break;
		case 'update-workspace':
			menu.update(data)//.then(menu.takeScreenshot(data));
			break;
		case 'update-clients':
			menu.updateClients(data)
			break;
		case 'savetopng':
			menu.saveToPNG(data);
			break;
		case 'select-sector':
			menu.selectSector(data);
			break;
		case 'update-mapview':
			menu.updateMapView(data);
			break;
		case 'update-attrs':
			menu.updateAttrs(data);
			break;
		case 'update-stc':
			menu.updateSTC(d);
			break;
		case 'get-reference':
			menu.sendReference()
			break;
		case 'history':
			menu.history.recoverData(data);
			break;
		case 'set-parent':
			this.setParent(data.username);
			menu.updateParentInfo(data);
			break;
		case 'unset-parent':
			this.setParent(null);
			menu.updateParentInfo(null);
			break;			
		case 'elements':
			menu.restoreElements(data);
			break;
		case 'update-trajs':
			menu.updateTrajs(data);
			break;
		case 'username-taken':
			menu.setUsername(this.role, true);
			break;
		}
	}

	wsOnOpen(){
		console.log("Connected ...");
	    this.wsSendNextMessages();
	}

	wsSendMessage(message){
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
	        this.webSocket.send(JSON.stringify(message));
	        this.wsSendNextMessages(); // recurse
	    }
	}

	wsCloseConnection(){
		this.webSocket.close();
	}

	wsOnClose(){
		console.log("Disconnected ... ");
		if (this.role == 'controller') menu.history.clear();
	    this.webSocket = null;
	    this.wsConnect();
	}

	wsOnError(){
		console.log("Error");
		this.webSocket.close();
	}

	
};

