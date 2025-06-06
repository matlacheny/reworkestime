/**
 * The menu consists into a sidenav menu with options to load the workspace, but it also contains all the information related to the drawn representations and the memory 
 */

class Menu{
	constructor(){
		this.elements = {};
		this.data = [];
		this.clients = [];
		
		this.dashboard = new Dashboard();
		this.timeController = new TimeController();
		this.history = new History()
		
		this.view = 'map';
		this.toast = swal.mixin({
		  toast: true,
		  position: 'top-start',
		  showConfirmButton: false,
		  timer: 3000
		});
		
	}
	
	switchView(elem){
		if (client.url.includes('lig')){
			this.errorMessage('The STC is not available in this version !')
			return;
		}
		
		const self = this;
		
		self.closeAll()
		
		this.view = this.view == 'map' ? 'stc' : 'map';
		d3.select(elem).attr('xlink:href', self.view == 'map' ? 'images/cube.svg' : 'images/map.svg')
		
		sessionStorage.setItem('view', this.view)
		if (this.view == 'map') self.setHeader();
		
		self.dashboard.load(self.elements)
		
		self.takeScreenshot({
			'client': client.getUsername(),
			'event': {'code':'switch', 'item': 'switch', 'value': self.view},
			'label': self.view
		})
	}
	
	switchLanguage(elem){
		const self = this;
		self.closeAll()
		
		const language = elem.innerHTML;
		
		elem.parentNode.childNodes.forEach(function(node) {
			if (node.nodeName == 'P' && ['fr', 'en'].includes(node.innerHTML))
				if (node.innerHTML != language)
					node.style.textDecoration = 'none';
				else node.style.textDecoration = 'underline';
		})
		
		client.wsSendMessage(createJSONMessage("update-workspace", {'action': 'update-language', 'value': language}));
	}
	
	refreshPage(){
		window.location.reload(true)
	}
	
	startDashTourGuide(){
		const clients = this.clients.filter(d => d.parent == client.getUsername())
		if (clients.length == 0) guide.dashGuide.start()
		else guide.completeDashGuide.start()
	}
	
	prepare(){
		document.getElementsByTagName('BODY')[0].addEventListener('mouseup', function(e){	
			if (e.target.parentNode.className == 'dropdown' ||
					e.target.nodeName == 'SPAN' ||
					e.target.nodeName == 'A' ||
					e.target.className.baseVal == 'button symbol' ||
					e.target.parentNode.className.baseVal == 'settings-icon' ||
					e.target.nodeName == 'INPUT' ||
					e.target.className == 'handler' ||
					e.target.parentNode.className == 'vertical-buttons' ||
					e.target.parentNode.id == 'slidr-history' ||
					e.target.parentNode.id == 'slidr-menu') return;
			
		})	
		
		
		//--------------------------------------------------------
		// Recover items on sessionStorage
		
		const self = this;
		
		let recover = sessionStorage.getItem('elements')
		this.elements = recover ? JSON.parse(recover) : {};
		
		recover = sessionStorage.getItem('view');
		this.view = recover || 'map';
		
		recover = sessionStorage.getItem('partition')
		this.partition = recover || 'D30';
		
		recover = sessionStorage.getItem('labels')
		this.labels = recover == 'false' ? false : true;
		
		recover = sessionStorage.getItem('background')
		this.background = recover == 'false' ? false : true;
		
		recover = sessionStorage.getItem('dataset')
		this.dataset = recover || 'grenoble';	
		
		recover = sessionStorage.getItem('language')
		this.language = recover || 'en';
		console.log("Loading data...");
		d3.json('http://localhost:3000/data/indicators.json', function(error, data){

			self.data['indicators'] = data;	
			
			client.recoverSession();
		})
	}
	
	// ----------------------------------------------------
	getDataDirectory(){
		return 'http://localhost:3000/data/' + this.dataset + '/';
	}
	
	//----------------------------------------
	// Load login page
	
	loadInitialPage(){
		const self = this;
		
		const div = d3.select('div#window1')
			.style('line-height', null)
			.styles({
				'height': '100vh',
				'width': client.getRole() == 'dashboard' ? '90vw' : '100vw',
				'display': 'table-row'
			});
		
		const width = div.node().clientWidth,
			height = div.node().clientHeight,
			left = width/2 - 220,
			top = height/2 + 100,
			svgWidth = width * .5, 
			svgHeight = height * .25;
		
		const svg = div.append('svg')
			.attrs({
				'width': width,
				'height': height,
				'viewBox': '0 0 ' + width + ' ' + height,
				"preserveAspectRatio" : "xMinYMin meet",
				'transform': transformString('translate', 0, 0)
			})
			
		svg.append('image')
			.attrs({
				'xlink:href': 'images/home.svg',
				'width': '50%',
				'height': '50%',
				'transform': transformString('translate', width/2 - svgWidth/2, height/2 - svgHeight)
			})
			
		const data = ['Controller', 'Dashboard']	
		
		const btns = svg.selectAll('g')
			.data(data)
			.enter()
			.append('g')
				.attrs((d,i) => {
					return {
						'transform': transformString('translate', left + 220 * i, top)
					}
				})
				.style('cursor', 'pointer')
			
		btns.append('rect')
			.attrs((d,i) => {
				return {
					'width': '200px',
					'height': '30px',
					'rx': '5px',
					'ry': '5px'
				}
			})
			.styles({
				'stroke-width': '1.5px',
				'stroke': '#ccc',
				'fill': '#fff'
			})
			
		btns.append('text')
			.attr('transform', transformString('translate', 100, 20))
			.style('text-anchor', 'middle')
			.text(d => 'Open a ' + d + ' page')
			.on("click", function(d) {
				 self.setUsername(d, false);
			})
	}
	
	setUsername(role, invalid){
		const invalidMessage = menu.language == 'en' ? 'The username ' + client.getUsername() + ' has already been taken, please choose a different one.' :
			"L'identifiant " + client.getUsername() + " est déjà utilisé, veuillez en choisir un autre.";
		
		swal({
		  title: 'Enter the ' + role + ' username',
		  text: invalid ? invalidMessage : '',
		  input: 'text',
		  showCancelButton: false,
		  inputValidator: (value) => {
			  if (value) connect(role, value);
			  return !value && 'You need to enter something!'
		  }
		})
		
		function connect(role, username){					
			client.setRole(role.toLowerCase());
			client.setUsername(username, invalid);
		}
	}
	
	init(attrs){		
		const self = this;
		
		// remove the login page
		const div = d3.select('div#window1');
		div.selectAll('svg').remove()
		div.selectAll('g').remove()
		
		
		if (client.getRole() == 'controller'){
			d3.selectAll("div.menu-button").style('display', 'block');
			d3.select('div#right').selectAll('p').each(function(){
				if (this.innerHTML == self.language)
					this.style.textDecoration = 'underline';
			})
			
			self.timeController.init();
			self.timeController.setAttrs({'type': menu.getPickerFormat(), 'position': menu.getPickerPosition()})
			// initialize this controller history	
			self.history.init();
			
			// Initialize network discovery
			client.initNetworkDiscovery();
		}else{
			d3.select('div#dashboard-container').style('display', 'block');
			d3.select('div#dashboard-container').selectAll('svg').remove();
			
			// Initialize network discovery for dashboard
			client.initNetworkDiscovery();
		}
		
		// Initial UI setup
		self.setPageName();
		
		self.setHeader()
		
		self.reload = true;
		self.dashboard.resetWindows()
		self.dashboard.load(self.elements);
		
		sessionStorage.setItem("elements", JSON.stringify(self.elements));
	}
	
	setPageName(){
		document.title = labels[client.getRole()][this.language] + ' ' + client.getUsername();
		d3.select('div#header').select('label#dash-title').text(document.title).style('width', client.getRole() == 'controller' ? '150px' : '300px');
	}
	
	//---------------------------------
	// load the dropdowns
	setHeader(){
		const self = this;
		const header = d3.select('div.header');			
		
		header.selectAll('div.dropdown').remove();
		
		if (client.getRole() == 'dashboard')
			setControllersList()
		else setViewButtons()
		
		
		function setControllersList(){
			header.selectAll('button#parent-info').remove()
			
			let label = client.getParent();
			if (label){		
				label = (self.language == 'en' ? "Connected to Controller " : 'Connecté au Contrôleur ') + label;
			}else{
				label = (self.language == 'en' ? "No controller" : 'Aucun Contrôleur');
			}
			
			//---------------------------------
			// load buttons
			
			const dropdown = header.append('button')
				.classed("btn btn-default dropdown-toggle", true)
				.text(label)
				.styles({
					'background-color': 'black',
					'color': 'white',
					'height': '50px',
					'border-color': 'black',
					'float': 'right'
				})
				.attr('id', 'parent-info')
		}
		
		
		function setViewButtons(){
//			console.log(self.language)
			
			d3.select('image#switch-view').attr('xlink:href', self.view == 'map' ? 'images/cube.svg' : 'images/map.svg')
			
			// set vertical buttons for menu and history
			const buttons = ['menu', 'history']
			let div = d3.select('div.vertical-buttons')
			div.selectAll('button').remove()		
			
			div.selectAll('button')
				.data(buttons)
				.enter()
					.append('button')
					.classed("btn btn-default dropdown-toggle rotate", true)
					.style('margin-top', (d,i) => (100*i) + 'px')
					.text(getLabel)
					.style('padding', '0px')
					.on('click', d => self.open(d))
					.attr('id', d => d+'-button')
			
			d3.select('div#slidr-menu').style('display', 'none')
			d3.select('div#slidr-history').style('display', 'none')
			
			//---------------------------------
			// load controller dropdowns
			console.log('self.data = ', self.data);
			let data = JSON.parse(JSON.stringify(self.data['indicators'])) // hard copy the data before modifying it
			let keys = self.view == 'stc' ? ['datasets'] : ['partition', 'indicator', 'rep', 'time', 'activity', 'customize', 'symbols', 'datasets']; 
			
			data = data.filter(d => keys.includes(d.value))
			data.push({'label': 'Tutorial', 'value': 'tutorial', 'type': 'button'})
			
			if (self.view != 'stc'){
				let symbols = data.filter(d => d.value == 'symbols')[0]
				data.forEach(d => {
					
					if (!['indicator', 'customize', 'symbols'].includes(d.value)) return;
					d.children = d.children.filter(c => (d.value == 'indicator' && !['modes', 'activity'].includes(c.value)) || (d.value == 'customize' && c.value == 'legend'));
					
					if (d.value == 'customize'){
						
						symbols.children.forEach(c => {
							if (['fzoom', 'fspace', 'selectspace'].includes(c.value)) return;
							d.children.push(c)
						}) 
						
						const index = [0, 4, 2, 3, 1];
	
						d.children = index.map(i => d.children[i]);
						
						d.children.splice(2, 0, {'value': 'background'})
						d.children.splice(3, 0, {'value': 'labels'})
					}
				})
				data = data.filter(d => d.value != 'symbols')
			}
						
		    let dropdown = header.selectAll('div.dropdown')
		    	.data(data)
		    	.enter()
			    	.append('div')
					.classed('dropdown', true)
					.style('display', 'inline')
					.style('left', '10px')
					.attr('id', d => 'header-'+d.value+'-dropdown')
					
			self.loadDropdowns(dropdown)

			dropdown.selectAll('button')
				.styles({
					'background-color': 'black',
					'color': 'white',
					'height': '50px',
					'border-color': 'black'
				}).text(d => {
					if (d.value == 'activity') 
						return self.language == 'en' ? 'Activity' : 'Activité';
					else if (d.value == 'time')
						return self.language == 'en' ? 'Time' : 'Temps';
					else if (d.value == 'partition')
						return self.language == 'en' ? 'Partition' : 'Découpage';
					else return getLabel(d)
				})
				
			dropdown.selectAll('ul.dropdown-menu')
				.style('min-width', '190px')
				.style('top', '35px')
				
			function isButton(d) { return ['clear', 'download', 'information'].includes(d.value); }
				
			const custom = dropdown.selectAll('ul.dropdown-menu').filter(d => d.value == 'customize')
			
			custom.selectAll('input')
				.style('display', d => isButton(d) ? 'none' : 'inline')
			
			custom.selectAll('text')
				.style('margin', d => isButton(d) ? '0px 7px 10px' : '0px 0px 10px')
				
			custom.selectAll('tr')
				.style('cursor', d => isButton(d) ? 'pointer' : 'auto')
				.on('click', function(d){ //verify
					if (!isButton(d)) return;
					d3.select(this.parentNode.parentNode).style('display', 'none')
					self.key = self.getKey(client.getUsername(), 'cont_1')
					switch(d.value){
					case 'clear':
						self.sendInfo('remove')
						break;
					case 'download':
						self.download()
						break;
					case 'information':
						self.errorMessage(menu.language == 'en' ? 'Not yet implemented!' : 'Non implementé à ce jour!')
						break;
					}
				})
	        	    
		}

	}
	
	updateParentInfo(attrs){
		const self = this;
			
		if (attrs){
			
			if (self.language != attrs.language){
				self.language = attrs.language;
				sessionStorage.setItem('language', attrs.language)
				
				self.setPageName()
				self.dashboard.loadLegends()
			}
			
			if (Object.keys(self.elements).length > 0 && self.dataset == attrs.dataset){
				const data = {
						"parent": attrs.username,
						"username": client.getUsername(),
						"elements": self.elements
				}
				
				var msg = createJSONMessage("elements", data);
				client.wsSendMessage(msg);
				
				if (self.partition != attrs.partition){
					self.partition = attrs.partition;
					sessionStorage.setItem('partition', attrs.partition)
					
					self.dashboard.load(self.elements)
				}
			}else if (self.dataset != attrs.dataset){
				self.partition = attrs.partition;
				sessionStorage.setItem('partition', attrs.partition)
				
				self.dataset = attrs.dataset;
				sessionStorage.setItem('dataset', attrs.dataset)
				
				self.dashboard.load(self.elements)

			}
		}
		
		d3.select('div#header').select('button#parent-info')
			.text(attrs ? (self.language == 'en' ? 'Connected to Controller ' : 'Connecté au Contrôleur ') + attrs.username : 
				(self.language == 'en' ? 'No controller' : 'Aucun contrôleur'))
	}
	
	
	errorMessage(message){
		this.toast({
			type: 'error',
			title: message
		})
	}
	
	// check or uncheck the inputs according to the current element on the modified container
	updateInputs(node){
		const self = this;
		d3.select(node).selectAll('input').property('checked', self.checked)
	}
	
	// check the inputs according to the current element in each container
	checked(d){
		const ddmenu = this.parentNode.parentNode.parentNode;
		const slide = ddmenu.parentNode.parentNode.parentNode.parentNode;
		const isController = slide.id.length == 0;
		const key = isController ? menu.getKey(client.getUsername(), 'cont_1') : menu.getKey(slide.id.split('-')[1], ddmenu.id.split('-')[2]);
		const element = menu.elements[key]
		const parent = d3.select(this.parentNode.parentNode).datum().value;

		if (isController){
			switch(parent){
			case 'datasets':
				return menu.dataset == d.value;
			case 'partition':
				return menu.partition == d.value;
			case 'customize':
				if (!['labels', 'background'].includes(d.value)) return false;
				else return d.value == 'labels' ? menu.labels : menu.background;
			default:
				if (typeof element == 'undefined') return false;
				else return checkElement()
			}				
			
		}else if (typeof element == 'undefined') return false;
		else return checkElement()
		
		function checkElement(){
			switch(parent){
			case 'view':
				return d.value == element.depiction;
			case 'activity':
				return ['map', 'chord-diagram'].includes(element.depiction) && d.value == element.category;
			case 'modes':
				return ['chord-diagram'].includes(element.depiction) && d.value == element.category;
			case 'typology':
				return ['index', 'stacked-view', 'clock'].includes(element.depiction) && d.value == element.category;
			case 'rep_trajs':
				return false;
			case 'customize':
				return element[parent] ? element[parent].includes(d.value) : false;
			default:
				return d.value == element[parent]
			}
		}
		
	}
	
	loadDropdowns(dropdown){
		const self = this;
		
		const ddbtn = dropdown.append('button')
			.classed("btn btn-default dropdown-toggle", true)
			.attr('id', function(d) {
				let cont = this.parentNode.parentNode.id;
				cont = cont.length == 0 ? this.parentNode.parentNode.parentNode.id : cont;
				return cont + '-' + d.value + '-button'
			})
			.on("click", function(d){
				if (!d.children) {
					guide.controlGuide.start()
					return;
				}
				
				openDropdown(this)
				
				let sibling = this.parentNode.parentNode.firstChild;
				while(sibling){
					if (sibling.className == 'dropdown' && sibling !== this.parentNode)
						d3.select(sibling).selectAll('ul.dropdown-menu').style('display', 'none')
					sibling = sibling.nextSibling;
				}	
			})
			.text(getLabel)
			
		const ddmenu = dropdown.filter(d => d.children)
			.append('ul')
			.style('float', 'none')
			.classed('dropdown-menu', true)
			.attr('id',  function(d){
				let cont = this.parentNode.parentNode.parentNode.id;
				cont = cont.length == 0 ? this.parentNode.parentNode.id : cont;
				return 'ddmenu-'+d.value+'-'+cont;
			})
			
		const table = ddmenu.append('table')
			.attr('id', d => d.value + '-table')
		
		let table_tr = table.selectAll('tr')
			.data(d => d.children)
			.enter()
				.append('tr')
				.style('line-height', '35px')
				.attr('id', function(d){
					const cont = this.parentNode.parentNode.id.split('-')[2];
					return cont+'-'+d.value;
				})
			
		table_tr.append('input')
			.attr('type', function(d) { return d3.select(this.parentNode.parentNode).datum().type; })
			.classed('custom-control-input', true)
			.style('margin', '0 10px')
			.property('checked', self.checked)
			.style('transform', 'scale(1.5)')
			.on('change', onChange)
			
		table_tr.append('text')
			.text(getLabel)
			.style('margin', '0  0 10px')		

		
		// generate the element from the given attributes (checked inputs)
		function getElement(attrs){
			const element = new Element({
				'depiction': attrs.view ? attrs.view.value : 'map',
				'indicator': attrs.indicator,
				'space': attrs.space || 'aggregate',
				'time': attrs.time || 'aggregate',
				'category': attrs.modes || attrs.activity || attrs.class, // see this, the state distribution plot cannot have category : home
				'period': self.timeController.getPeriod(),
				'partition': self.partition,
				'client': self.key.split('-')[1],
				'window': self.key.split('-')[2],
				'ftime': false,
				'fzoom': false,
				'fspace': false,
				'selected': attrs.view == 'index' && self.view == 'stc' && self.dashboard.views['stc'].length > 0 ? self.dashboard.views['stc'][0].selected : [],
				'customize': attrs.customize || [],
				'rep': attrs['indicator'] == 'density' || attrs['indicator'] == 'attractiveness' ? 'ratio' : attrs['rep'] || 'number',
				'dataset': self.dataset
			})
			
			// define a default indicator, if none is selected
			if (typeof element.indicator == 'undefined'){
				switch(element.depiction){
				case 'map':
					element.indicator = 'interactive_map';
					break;
				case 'chord-diagram':
					element.indicator = 'general';
					break;
				default:
					element.indicator = 'activity';
					break;
				}
			}

			getDefault(element)

			return element;
		}

		function getDefault(element){
			// in case the map takes the info from a previous view
			if (element.depiction == 'map') element.space == 'individual';
			if (element.depiction == 'map' && element.indicator == 'attractiveness') element.time = 'aggregate';
			if (element.depiction == 'map' && ['activity', 'modes'].includes(element.indicator)) element.indicator = 'interactive_map';
			if (['clock', 'stacked-view'].includes(element.depiction) && element.space == 'aggregate') element.sectors = 0;
			if (['clock', 'stacked-view', 'index'].includes(element.depiction) && (element.category && !element.category.includes('classe'))) element.category = null;


			// define a default category, if indicator is activity or modes
			if (!element.category && !['index', 'stacked-view', 'clock'].includes(element.depiction)){
				switch(element.indicator){
				case 'modes':
					element.category = 'car';
					break;
				case 'activity':
					element.category = 'home';
					break;
				}
			}else if (['index', 'stacked-view', 'clock'].includes(element.depiction) && !['activity', 'modes'].includes(element.indicator)) {
				element.indicator = 'activity';
				element.category = null;
			}else if (['activity', 'modes'].includes(element.indicator) && element.category && element.category.includes('classe') && !['stacked-view', 'clock', 'index'].includes(element.depiction)){
				element.category = 'home';
			}
			
		}
		
		function getChecked(node){
			// recover the inputs value
			let attrs = {}
			while (node){
				if (node.className == 'dropdown'){
					let input = d3.select(node).selectAll('ul.dropdown-menu').selectAll('input')
					input.each(function() { 
						let parent = d3.select(this.parentNode.parentNode).datum().value;
						let data = d3.select(this).datum()
						if (this.checked)
							switch(parent){
							case 'view':
								attrs[parent] = data
								break
							case 'customize':
								if (!attrs[parent]) attrs[parent] = []
								attrs[parent].push(data.value)
								break;
							default:
								attrs[parent] = data.value;
							}
//							attrs[parent] = parent == 'view' ? data : data.value;
					});
					
				}
				node = node.nextSibling;
			}
			return attrs;
		}
		
		// method triggered by the change on the inputs
		function onChange(d){
			const ddmenu = this.parentNode.parentNode.parentNode;
			const slide = ddmenu.parentNode.parentNode.parentNode.parentNode;
			
			// put the key in a global variable to use in the other functions before displaying the view
			self.key = slide.id.length == 0 ? self.getKey(client.getUsername(), 'cont_1') : self.getKey(slide.id.split('-')[1], ddmenu.id.split('-')[2])
			let element = self.elements[self.key] // use this element if the option is to update it
			const isController = self.key.split('-')[1] == client.getUsername()

			if (isController)
				d3.select(ddmenu).style('display', 'none')	
				
			let parent = d3.select(this.parentNode.parentNode).datum().value
			let parentNode = this.parentNode.parentNode;
			let value = this.checked;	
			
			if (!isController && parent == 'customize' && !element){
				self.errorMessage(self.language == 'en' ? 'You must open a view first!' : "Vous devez d'abord ouvrir une Vue!")
				self.updateInputs(parentNode)
				return;
			}
			
			if (parent != 'customize'){
				// keep only the current one selected
				let sibling = this.parentNode.parentNode.firstChild;
				while(sibling){
					if (sibling !== this.parentNode)
						d3.select(sibling).selectAll('input').property('checked', false)
					sibling = sibling.nextSibling;
				}	
			}
						
			if (parent == 'view'){
//				self.clearIndicator().then(function(){
					// replace the element previously in this container
					element = getElement(getChecked(ddmenu.parentNode.parentNode.firstChild));	
					self.elements[self.key] = element;
					
					// if space is set to individual and it is the right element, let the user choose a sector on the map
					if (element.space == 'individual' && !['map', 'index', 'stc'].includes(element.depiction)) 
						self.openSpaceSelector(element.depiction)
					else self.sendInfo('add')
					
					self.updateInputs(ddmenu.parentNode.parentNode)

//				})								
				return
			}else{
				if (typeof element == 'undefined') {
					if (isController && parent == 'indicator'){ // creates a map element and add the indicator below
						element = getElement(getChecked(ddmenu.parentNode.parentNode.firstChild));
						self.elements[self.key] = JSON.parse(JSON.stringify(element));
					}else if (!['labels', 'background'].includes(d.value) && !['datasets', 'partition'].includes(parent)) return
				}
			}
			
			let attrs = {}
			const clientsNames = [client.getUsername()]
			self.clients.forEach(c => {
				if (c.parent == client.getUsername())
					 clientsNames.push(c.username)
			})
				
			self.event = {'code': 'modify', 'item': parent}
			switch(parent){
			case 'indicator':
				if (!['map'].includes(element.depiction) && ['fluctuation', 'presence', 'density', 'attractiveness'].includes(d.value)){
					self.errorMessage(self.language == 'en' ? 'This view does not support the chosen indicator.' : "Cette vue n'est pas compatible avec l'indicateur choisi")
					self.updateInputs(parentNode)
					return;
				}
				
				if (element.depiction == 'map' && ['activity', 'modes'].includes(d.value)){
					self.errorMessage(d.value == 'activity' ? 
							(self.language == 'en' ? 'You must first choose the presence indicator and then pick an activity.' : "Vous devez d'abord choisir l'indicateur de présence et après choisir une activité.") : 
							(self.language == 'en' ? 'This view does not support this indicator' : "Cette vue n'est pas compatible avec l'indicateur choisi"))
					self.updateInputs(parentNode)
					return;
				}
				
				if (!['modes', 'activity'].includes(d.value)) element.category = null; // if the indicator is not activity or modes, no need for category
				element.indicator = d.value;
				element.rep = d.value == 'density' || d.value == 'attractiveness' ? 'ratio' : (d.value == 'presence' ? 'number' : element.rep);
				
				getDefault(element)
//				console.log(element)
				
				self.event.value = d.value;
				break;
			case 'rep':
				if (element.depiction != 'map' || ['attractiveness', 'density'].includes(element.indicator)) {
					self.errorMessage(self.language == 'en' ? 'Only available for presence and fluctuation indicators.' : "Uniquement disponible(s) pour les indicateurs de présence et de migration")
					self.updateInputs(parentNode)
					return;
				}
				// allow it only for maps, except density and attractiveness
				element.rep = d.value;
				self.event.value = d.value;
				break;
			case 'space':
				if (element.depiction == 'map'){
					self.errorMessage(self.language == 'en' ? 'Not available on maps.' : "Non disponible(s) sur la carte")
					self.updateInputs(parentNode)
					return;
				}
				element.space = d.value;
				if (d.value == 'individual') {
					self.openSpaceSelector(element.depiction)
					return;
				}
				if (['clock', 'stacked-view'].includes(element.depiction) && d.value == 'aggregate') element.sectors = 0;
				
				self.event.value = d.value;
				break;
			case 'time':
				if (['stc'].includes(element.depiction)){
					self.errorMessage(self.language == 'en' ? 'Not available on the Space-Time Cube.' : "Non disponible dans le Cube Espace-Temps.")
					self.updateInputs(parentNode)
					return;
				}
				element.time = d.value;
				
				self.event.value = d.value;
				break;
			case 'activity':
			case 'modes':
				if (!['map', 'chord-diagram'].includes(element.depiction)){
					self.errorMessage(self.language == 'en' ? 'Only available on Flows and Map Views.' : "Uniquement disponible(s) sur la Carte et le Diagramme des flux.")
					self.updateInputs(parentNode)
					return
				}
				const sameCategory = element.category == d.value;
				if (element.depiction == 'chord-diagram'){
					element.category = sameCategory ? null : d.value;
					element.indicator = sameCategory ? 'general' : parent;
				}else if (element.depiction == 'map' && element.indicator == 'presence'){
					element.category = sameCategory ? null : d.value;
				}else{
					element.category = d.value;
				}
				
				self.event.value = element.category;
				break;
			case 'typology':
				if (!['index', 'stacked-view', 'clock'].includes(element.depiction)){
					self.errorMessage(self.language == 'en' ? 'Not available for the current view!' : "Non disponible(s) pour la vue actuelle.")
					self.updateInputs(parentNode)
					return
				}
				element.category = element.category == d.value ? null : d.value;
				
				self.event.value = element.category;
				break;
//			case 'rep_trajs':
//				// only allow for index plot displaying the same class as the one selected
//				element.rep_trajs = d.value;
//				break;
			case 'customize':
				if (isController){
					let view = self.dashboard.views.map[0];
					switch(d.value){
					case 'labels':
						self.labels = this.checked;
						view.updateTooltips(this.checked)
						sessionStorage.setItem('labels', this.checked)
						return
					case 'background':
						if (element) {
							self.errorMessage(self.language == 'en' ? 'Not allowed on indicators!' : "Non autorisé  sur les indicateurs!")
							self.updateInputs(parentNode)
							return;
						} 
						self.background = this.checked;
						view.updateStyle(this.checked)
						sessionStorage.setItem('background', this.checked)
						return
					case 'legend':
						self.updateElement({'action': 'customize', 'value': value, 'dim': d.value})
						return
					case 'ftime':
						self.updateElement({'action': 'freeze', 'value': value, 'dim': 'time'})
						return
					}
				}else{
					if (d.value == 'fullscreen' && element.depiction != 'stc') {
						self.errorMessage(self.language == 'en' ? 'Only available on the Space-Time Cube.' : "Uniquement disponible dans le Cube Espace-Temps")
						self.updateInputs(parentNode)
						return;
					}else if (d.value == 'legend' && element.depiction != 'map'){
						self.errorMessage(self.language == 'en' ? 'Only available on Map Views.' : "Uniquement disponible(s) dans les Cartes")
						self.updateInputs(parentNode)
						return
					}else if (d.value == 'details' && ['map', 'stc'].includes(element.depiction)){
						self.errorMessage(element.depiction == 'map' ? 
								(self.language == 'en' ? 'Not available on Maps.' : "Non disponible dans les Cartes") : 
								(self.language == 'en' ? 'Only available on the Controller interface.' : "Uniquement disponible dans l'interface de Contrôle"))
						self.updateInputs(parentNode)
						return
					}
					self.updateElement({'action': 'customize', 'value': value, 'dim': d.value})
				}
				self.event = null;
				return;
			case 'partition': // update the territorial partition of the whole system (except the STC)
				if (d.value != 'DTIR' && self.dataset == 'rennes'){
					self.errorMessage(self.language == 'en' ? 'Not yet available for the current dataset.' : "Non disponible pour le jeu de données actuel")
					self.updateInputs(parentNode)
					return
				}
				
				self.partition = d.value;
				sessionStorage.setItem('partition', d.value);
				
				attrs = {
					'action': 'modify-partition',
					'partition': self.partition,
					'client': clientsNames,
					'event': {'code': 'global', 'item': parent, 'value': d.value} 
				}
				client.wsSendMessage(createJSONMessage("update-workspace", attrs));
				
				self.event = null;
				return;
			case 'datasets':
				self.dataset = d.value;
				sessionStorage.setItem('dataset', d.value)
				attrs = {
					'action': 'modify-dataset',
					'dataset': d.value,
					'client': clientsNames,
					'event': {'code': 'global', 'item': parent, 'value': d.value}
				}
				client.wsSendMessage(createJSONMessage("update-workspace", attrs));
				
				if (self.view == 'stc'){
					// update dataset in the stc
					stcClient.wsSendMessage('reload_shape', ['data/'+d.value+'/OD_sectors.geojson'])
					stcClient.wsSendMessage('reload_data', ['data/'+d.value+'/stc.csv'])
				}
				
				self.event = null;
				return;
			}
			
			self.sendInfo('add')
			self.updateInputs(ddmenu.parentNode.parentNode)
			
		}
	}
	
	//------------------------------------------------------------------------------------------
	// Update the slides and their content, according to the connected clients
	
	updateDashboards() {
		const self = this;

		// Remove the remaining slides
		const conts = d3.select('div#slidr-menu').select('div#slide-container');
		conts.selectAll('div').remove();
		d3.select('div.tab-buttons').selectAll('div.tab').remove();

		const myUsername = client.getUsername();
		const clients = self.clients.filter(d => d.parent == myUsername);

		// in case there is no dashboard connected
		const noDashText = d3.select('div#slide-container').select('text#no-dash');
		if (clients.length == 0) {
			if (noDashText.empty()) {
				d3.select('div#slide-container')
					.append('text')
					.style('margin-left', '40%')
					.style('top', '50%')
					.style('position', 'relative')
					.text(self.language == 'en' ? 'No dashboard connected!' : "Aucun tableau de bord connecté!")
					.attr('id', 'no-dash');
			} else {
				noDashText.style('display', 'block');
			}
		} else {
			noDashText.style('display', 'none');
		}

		// Get available dashboards using the fetch API
		this.fetchAvailableDevices().then(devices => {
			// Filter for dashboard devices only
			const available = devices.filter(d => d.role === 'dashboard' && d.parent !== myUsername);

			const dropdown = d3.select('div.tab-buttons').select('div#add-dash')
				.on("click", function (d) {
					// Trigger network discovery when the button is clicked
					console.log('Add-dash button clicked, triggering device discovery');

					// Show searching message
					self.errorMessage(self.language == 'en' ? 'Searching for available dashboards...' : 'Recherche de tableaux de bord disponibles...');

					// First trigger discovery using the new endpoint
					fetch('http://localhost:3000/api/discover', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({controllerId: client.getClientId()})
					})
						.then(response => response.json())
						.then(data => {
							console.log('Discovery triggered:', data);

							// After discovery, fetch the updated device list
							setTimeout(() => {
								self.fetchAvailableDevices().then(devices => {
									// Update the dropdown menu with found devices
									const available = devices.filter(d => d.role === 'dashboard' && d.parent !== myUsername);

									if (available.length === 0) {
										self.errorMessage(self.language == 'en' ? 'No dashboards available' : 'Aucun tableau de bord disponible');
										return;
									}

									// Update the dropdown menu
									d3.select('div#dashboard-dropdown').remove();
									const ddmenu = d3.select('div.tab-buttons')
										.append('div')
										.attr('id', 'dashboard-dropdown')
										.append('ul')
										.styles({
											'position': 'absolute',
											'float': 'right',
											'left': 'auto',
											'right': '0px',
											'display': 'block',
											'z-index': '1000'
										})
										.classed('dropdown-menu', true);

									// Bind the data to the list items
									const items = ddmenu.selectAll('li')
										.data(available)
										.enter()
										.append('li');

									// Add links to each item
									items.append('a')
										.attr('href', '#')
										.attr('tabindex', '-1')
										.text(d => (self.language == 'en' ? 'Dashboard ' : 'Tableau de Bord ') + d.name)
										.on('click', function (event, d) {
											// Call connectDashboard with the data
											self.connectDashboard(d);
											return false; // Prevent any further event handling
										});
								});
							}, 1000);
						})
						.catch(error => {
							console.error('Error triggering discovery:', error);
							self.errorMessage(self.language == 'en' ? 'Error finding dashboards' : 'Erreur lors de la recherche des tableaux de bord');
						});
				});
		});

	}


	async connectDashboard(d) {
		let devices = null;

		await fetch('http://localhost:3000/api/devices', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		})
			.then(response => response.json())
			.then(data => {
				console.log(data.devices);
				devices = Array.from(data.devices);
				console.log(devices);
				console.log(devices[d]);
			});

		console.log('Connecting to dashboard:', devices[d])
		d3.select('div#dashboard-dropdown').remove();
		d = devices[d];
		// Show connecting message
		this.errorMessage(this.language == 'en' ? 'Connecting to dashboard...' : 'Connexion au tableau de bord...');

		// Validate required data
		if (!d || !d.id) {
			console.error('Invalid dashboard data:', d);
			this.errorMessage(this.language == 'en' ? 'Invalid dashboard data' : 'Données de tableau de bord invalides');
			return;
		}

		const controllerId = client.getClientId();
		if (!controllerId) {
			console.error('Controller ID not set');
			this.errorMessage(this.language == 'en' ? 'Controller not initialized' : 'Contrôleur non initialisé');
			return;
		}

		// Use REST API to connect
		const baseUrl = `http://localhost:${client.port}`;
		console.log("controller id:", controllerId);
		console.log("dashboard id:", d.id);
		fetch(`${baseUrl}/api/connect`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				username: client.getUsername(),
				dashboard: d.id,
				controllerId: controllerId,
				dataset: this.getPartition(),
				partition: this.getPickerFormat(),
				language: this.language
			})
		})
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					console.log('Successfully connected to dashboard:', data);
					this.errorMessage(this.language == 'en' ? 'Connected to dashboard' : 'Connecté au tableau de bord');
				} else {
					console.error('Failed to connect to dashboard:', data.error);
					this.errorMessage(this.language == 'en' ? data.error : 'Erreur de connexion au tableau de bord');
				}
			})
			.catch(error => {
				console.error('Error connecting to dashboard:', error);
				this.errorMessage(this.language == 'en' ? 'Error connecting to dashboard' : 'Erreur de connexion au tableau de bord');
			});
	}

	freeze(dim, node) {
		const element = this.elements[this.key];
		if (typeof element == 'undefined') {
			this.errorMessage(this.language == 'en' ? 'You must open a view first!' : "Vous devez d'abord ouvrir une Vue!");
			return;
		}

		if (['index', 'stc', 'map'].includes(element.depiction)) {
			this.errorMessage(this.language == 'en' ? 'Not available for Maps, Index Plots and the Space-Time Cube.' : "Non disponible(s) pour les Cartes, les Actogrammes, et le Cube Espace-Temps!");
			return;
		}

		// if the stc is displayed on the controller, switch it temporarily for the map
		if (this.view == 'stc') {
			this.previousView = this.view;
			this.view = 'map';
			this.dashboard.loadInteractiveSpace();
			sessionStorage.setItem('view', this.view);
		}

		this.backup = {'space': element.space};
		element.space = 'individual';
		this.event = {'code': 'modify', 'item': 'sector', 'value': null};
		this.openSpaceSelector(element.depiction);
	}
	
	// Update element according to freezing option
	updateElement(attrs){
		const self = this;
		const element = self.elements[self.key || self.getKey(attrs.client, attrs.window)];
		
		if (attrs.action == 'freeze'){
			element.fspace = (element.fspace && !(attrs.dim == 'space')) || ( !element.fspace && (attrs.dim == 'space'));
			element.ftime = (element.ftime && !(attrs.dim == 'time')) || ( !element.ftime && (attrs.dim == 'time'));
			element.fzoom = (element.fzoom && !(attrs.dim == 'zoom')) || ( !element.fzoom && (attrs.dim == 'zoom'));
		}else {
			if (element.customize.includes(attrs.dim)) element.customize = element.customize.filter(d => d != attrs.dim)
			else element.customize.push(attrs.dim) 
		}
		
		
		let value = attrs.action == 'freeze' ? element['f'+attrs.dim] : attrs.value;
		
		const username = attrs.client || self.client;
		if (client.getRole() == 'controller'){
			
			if (self.view == 'stc') self.dashboard.views.stc[0].updateAttrs(attrs)
			
			if (username == client.getUsername()) self.dashboard.views[self.view][0].updateAttrs(attrs) // update the attrs of the interactive map or stc
			else // send the information ot the connected dashboards
				client.wsSendMessage(createJSONMessage("update-attrs", {
					'action': attrs.action,
					'window': self.key.split('-')[2],
					'client': self.key.split('-')[1],
					'value': value,
					'dim': attrs.dim,
					'depiction': element.depiction
				}));
			
			self.takeScreenshot({
				'element': element,
				'event': {'code': 'modify', 'item': attrs.action, 'value': value, 'dimension': attrs.dim}
			})
		}
		
		sessionStorage.setItem('elements', JSON.stringify(self.elements));
	}
	
	
	
	// ------------------------------------
	// modify attributes of the view, such as freeze dimensions, hide legend and make it fullscreen (for the stc)
	
	updateAttrs(attrs){
		const self = this;
		self.key = null;
		if (attrs.client != client.getUsername()) return;
		
		if (client.getRole() != 'controller')
			self.updateElement(attrs);
		
		if (attrs.depiction == 'stc')
			self.dashboard.fullscreen(attrs);
		else
			self.dashboard.views[attrs.depiction].filter(d => { 
				return d.client == attrs.client && d.window == attrs.window;
			})[0].updateAttrs(attrs); //when it gets here the sender already verified whether a view exists

	}
	
	updateSymbols(){
		const self = this;
		const containers = d3.selectAll('div.container')
		
		containers.selectAll('svg').selectAll('image')
			.attr("xlink:href", function(d){
				if (!d.active) return d.image;
				
				const parent = this.parentNode.parentNode.parentNode;
				const dashboard = parent.parentNode.id.split('-')[1],
					window = parent.id;
				
				const element = self.elements[self.getKey(dashboard, window)];
				if (typeof element == 'undefined') return d.image;
				return element[d.value] ? d.active : d.image;
			})
	}
	
	getKey(){
		if (arguments.length > 0) {
			return this.dataset + '-' + arguments[0] + '-' + arguments[1] + '-' + this.partition;
		}
		return this.dataset + '-' + this.client + '-' + this.window + '-' + this.partition;
	}
	
	
	//-----------------------------------------------------------------------------------
	
	// Clear the elements in the corresponding dashboard
	clearIndicator(id){
		const self = this;
		return new Promise(function(fulfill, reject){
			const element = self.elements[self.key]
			
			if (self.backup){ // if the user regrets updating the element, it only recover the space and time settings
				element.time = self.backup.time;
				element.space = self.backup.space;
				self.backup = null;
			}else self.elements[self.key] = undefined; // otherwise, it deletes the information on the new element
			fulfill(self.elements)
		})
		
	}
	
	// Send the chosen element to the corresponding dashboard
	sendInfo(action){
		const self = this;
		
		let element = self.elements[self.key];
		if (typeof element == 'undefined') return;
		
		var attrs = {
			"action": action,
			"element": element,
			'event': self.event ? self.event : {'code': 'create', 'item' : action, 'value': element.depiction}
		}
		
		if (element.client == client.getUsername()) self.update(attrs)//.then(self.takeScreenshot(attrs))
		else client.wsSendMessage(createJSONMessage("update-workspace", attrs))

		
		sessionStorage.setItem('elements', JSON.stringify(self.elements))
		
		// set time granularity and freeze in the controller header
		d3.select('div.header').select('#time-dropdown').selectAll('tr').selectAll('td').selectAll('input')
				.property('checked', self.checked)
				
		d3.select('div.header').select('#view-dropdown').selectAll('tr').selectAll('td').selectAll('input')
				.property('checked', self.checked)
		
		// Remove the temporary variables
		self.key = self.waiting = self.backup = self.sectors = self.event = self.previousView = null;
	}
	
	//----------------------------------------------------------------------
	// Open interface for choosing the sectors for the view
	openSpaceSelector(view, key){
		const self = this; 
		self.closeAll();
		const en = menu.language == 'en';
		
		const div = d3.select("body")
			.append('div')
			.classed('waiting-message', true)
			.attr('id','waiting')
		
		const text = div.append('text')
			.text(en ? 'Please select a district.' : 'Merci de séléctionner un secteur.')
		
		const btnStyle = {
			'background-color': 'black',
			'margin-top': '20px',
			'margin-right': '10px',
			'float': 'right',
			'color': 'white',
			'border-color': 'black'
		}
		
		div.append('button')
			.classed('btn btn-default dropdown-toggle', true)
			.styles(btnStyle)
			.text(en ? 'Cancel' : 'Annuler')
			.on('click', function(){
				d3.select('div#waiting').remove();
				
				self.clearIndicator().then(function(){
					// Remove the temporary variables
					self.key = self.waiting = self.backup = self.sectors = self.event = null;
					if (self.view == 'map') self.dashboard.views['map'][0].updateHighlight()
				})
				
			})	
			
		self.waiting = 'clock';
		
		// if it is a chord-diagram the user must choose at least one sector
		if (view == 'chord-diagram'){
			
			function getName(code){
				return self.dashboard.views.map[0].mesh.features.filter(d => d.properties.code == code)[0].properties.name;
			}	
			
			const data = []
			Object.keys(self.elements).forEach(key => {
				if (typeof self.elements[key] == 'undefined') return;
				if (self.elements[key].depiction != 'chord-diagram') return;
				if (self.elements[key].partition != self.partition) return;
				if (self.elements[key].dataset != self.dataset) return;
				if (self.elements[key].space == 'aggregate') return;
				if (!Array.isArray(self.elements[key].sectors)) return;
				let exists = false;
				data.forEach(d => {
					if (exists) return;
					let filtered = d.length > self.elements[key].sectors.length ? d.filter(x => !self.elements[key].sectors.includes(x)) : self.elements[key].sectors.filter(x => !d.includes(x));
					if (filtered.length == 0) exists = true;
				})
				if (!exists) data.push(self.elements[key].sectors)
			})
			
			const okButton = div.append('button')
				.classed('btn btn-default dropdown-toggle', true)
				.styles(btnStyle)
				.text('OK')
				.on('click', function(d) {
					self.sendSectorElement()
					if (self.view == 'map') self.dashboard.views['map'][0].updateHighlight()
				})
			
			const dd = div.append('div')
				.classed('dropdown', true)
				.style('float', 'right')
				
			dd.append('button')
				.classed('btn btn-default dropdown-toggle', true)
				.styles(btnStyle)
				.text(en ? 'Reuse Selection' : 'Réutiliser une sélection existante')
				.on('click', function() {
					if (data.length == 0) return;
					else openDropdown(this)
				})
			
			const ddmenu = dd.append('ul')
				.classed('dropdown-menu', true)
				.style('right', '0')
				.style('left', 'auto')
				.style('top', '70px')
			
			self.sectors = []
			
			// List of sectors selected on previous views
			const ddli = ddmenu.selectAll('li')
				.data(data)
				.enter()
					.append('li')
					.append('a')
					.attr('href', '#')
					.attr('tabindex', '-1')
					.style('text-anchor', 'end')
					.text(d => {
						d.sort()
						let text = '';
						d.forEach((s,i) => {
							text += getName(s) + ' (' + s + ')' + (i == d.length - 1 ? '' : ', ')  
						})
						return text;
					})
					.on('click', function(d){
						self.sectors = d;
						self.dashboard.views['map'][0].updateHighlight(self.sectors, 'flows');
						ddmenu.style('display', 'none')
					})
							
				
			text.text(self.language == 'en' ? 'Please select up to 10 districts. Then click on OK' : "Merci de sélectionner jusqu'à 10 secteurs puis cliquer sur OK")	
			self.waiting = 'flows';
			
			// reset the border weight of spatial locations
			self.dashboard.views['map'][0].resetStyle()
		}
	}
	
	// The map view uses it to know which action to take when the user clicks on a sector
	waitingSector(){
		return this.waiting;
	}
	
	// Save sectors in a list while the user is selecting them
	saveSector(code){
		
		const index = this.sectors.findIndex(d => d == code);
		if (index == -1){
			this.sectors.push(code)
		}
		else 
			this.sectors.splice(index, 1)
			
	}
	
	// Update element with the selected sector(s)
	// Send it to be displayed on the corresponding dashboard
	sendSectorElement(){
		const self = this;
		const values = arguments.length > 0 ? arguments[0] : self.sectors;
		
		if (self.waiting == 'flows' && values.length == 0){
			self.errorMessage(self.language == 'en' ? 'A Flows View requires at least one (1) district.' : "Le diagramme des flux requiert de choisir au moins un secteur.")
			return;
		}
		
		d3.select('div#waiting').remove();
		
		const element = self.elements[self.key]
		if (typeof element == 'undefined') return;
		element.sectors = values;
		
		if (self.previousView == 'stc'){
			self.view = 'stc';
			self.dashboard.loadInteractiveSpace()
			sessionStorage.setItem('view', self.view)
		}
		
		self.sendInfo('add')
	}
	
	// --------------------------------------------------------------------------
	// Fill up the menu with the information about which indicator is being viewed
	updateContainersInfo(){
		const self = this;
		
		const div = d3.selectAll('div.container'),
			width = window.innerWidth * .4,
			height = (window.innerHeight * .96) * .95 / 2;
		
		let title = div.selectAll('div.info-view')
		if (title.empty()){ 
			title = div.append('div')
				.styles({
					'position': 'relative',
					'top': (height * 0.25) + 'px',
					'text-align': 'center',
					'left': '200px',
					'top': '-70%',
					'width': (width-100) + 'px'
				})
				.classed('info-view', true)
		
		}
		
		title.text(function(){
			const node = this.parentNode;
			const window = node.id;
			const dash = node.parentNode.id.split('-')[1]
			
			const period = self.timeController.getPeriod();
			const element = self.elements[self.getKey(dash, window)];
			return element ? labels[element.depiction][self.language] : '';
		})
		
		// check inputs according to displayed views on each window
		d3.select('div#slide-container').selectAll('div.slide').selectAll('div.container').selectAll('input').property('checked', self.checked)
		if (self.view == 'map') d3.select('div.header').selectAll('div.dropdown').selectAll('ul.dropdown-menu').selectAll('input').property('checked', self.checked)
	}
	
	
	//----------------------------------------------------------------------------------
	// Methods to receive and treat the information sent by the controller client
	
	// Receives the new element, add or remove it accordingly
	update(attrs){
		const self = this;
		
		return new Promise(function(fulfill, reject){
			
			let key = null,
				element = null;
			switch (attrs.action){
			case 'add':
				let deleted;
				
				key = self.getKey(attrs.element.client, attrs.element.window);
				element = self.elements[key]
				if (typeof element != 'undefined'){
					deleted = element.depiction == 'clock' || element.depiction == 'stacked-view';
					self.dashboard.clearSessionStorage(element);
				}
				self.elements[key] = attrs.element;
								
				if (attrs.element.client == client.getUsername())
					self.dashboard.updateWindow(attrs.element);
				
				if (client.getRole() == 'controller'){
					self.updateContainersInfo();
					if (attrs.element.depiction == 'clock' || deleted)
						if (self.dashboard.views['map'][0])
							self.dashboard.views['map'][0].updateWheels();
				}
				
				
				break;
			case 'remove':
				key = self.getKey(attrs.element.client, attrs.element.window);
				element = self.elements[key];
				if (typeof element != 'undefined'){
					self.dashboard.clearSessionStorage(element);
					self.elements[key] = undefined;
					
					// update the inputs
					d3.select('div#slide-'+attrs.element.client).select('div#'+attrs.element.window).selectAll('input').property('checked', false)
				}
			
				if (attrs.element.client == client.getUsername())
					self.dashboard.clearWindow(attrs.element);
					
				if (client.getRole() == 'controller'){
					self.updateContainersInfo();
					if (attrs.element.depiction == 'clock')
						if (self.dashboard.views['map'][0])
							self.dashboard.views['map'][0].updateWheels();
				}
				
				break;
			case 'modify-partition':	
				self.partition = attrs.partition;
		
				sessionStorage.setItem('partition', attrs.partition);
				
				self.dashboard.load(self.elements)
				
				if (client.getRole() == 'controller') self.updateContainersInfo()
				break;
			case 'modify-dataset':
				self.partition = attrs.dataset == 'rennes' ? 'DTIR' : 'D30';
				sessionStorage.setItem('partition', self.partition)
				self.dataset = attrs.dataset;
				sessionStorage.setItem('dataset', self.dataset)
								
				self.dashboard.load(self.elements)
				if (client.getRole() == 'controller') self.updateContainersInfo()		
				break;
			case 'update-language':
				self.language = attrs.value;
				sessionStorage.setItem('language', self.language)
				if (client.getRole() == 'controller'){
					self.setHeader()
					if (self.view == 'stc') self.dashboard.views.stc[0].switchLanguage()
					
					self.updateDashboards()
					self.setPageName()
					guide.setTourGuides()
					
				}else{
					self.setHeader()
					self.dashboard.loadLegends();
					self.setPageName()
				}
				
				self.dashboard.load(self.elements)
				return;
			case 'restore': 
				
				const validKeys = Object.keys(attrs.settings.elements);
				const currentKeys = Object.keys(self.elements);
				const invalidKeys = currentKeys.filter(d => !validKeys.includes(d))

				validKeys.forEach(key => {
					if (attrs.event == 'restore-dashboard' && key.split('-')[1] != attrs.client) return; // only modify the elements of the concerned dashboard
					self.elements[key] = JSON.parse(JSON.stringify(attrs.settings.elements[key]));	
				})
				
				currentKeys.forEach(key => {
					if (invalidKeys.includes(key))
						self.elements[key] = undefined;
				})
								
				self.partition = attrs.settings.partition;
				sessionStorage.setItem('partition', self.partition)
				
				if (self.dataset != attrs.settings.dataset){
					self.dataset = attrs.settings.dataset;
					sessionStorage.setItem('dataset', self.dataset)	
				}
				
				self.dashboard.load(self.elements);
				
				if (client.getRole() == 'controller'){
					self.updateContainersInfo();
					if (self.dashboard.views['map'][0])
						self.dashboard.views['map'][0].updateWheels();
				}
				break;
			}
			
			sessionStorage.setItem("elements", JSON.stringify(self.elements));
			
			if (client.getRole() == 'controller') self.takeScreenshot(attrs);
			
			fulfill()
		})
	}
	
	removeCache() {
		const self = this;
		
		return new Promise(function(fulfill, reject){
			Object.keys(self.elements).forEach(key => {
				if (typeof self.elements[key] == 'undefined') return;
				self.dashboard.clearSessionStorage(self.elements[key])
			})
			
			if (client.getRole() == 'controller'){
				self.dashboard.clearSessionStorage({
					'partition': menu.getPartition(),
					'depiction': 'map',
					'indicator': 'interactive_map'
				})
				
				self.dashboard.clearSessionStorage({
					'depiction': 'stc'
				})
			}
				
			fulfill(self.elements)
		})
	}
	
	//------------------------------------------------------
	// take a screenshot and save it in the history
	
	takeScreenshot(attrs){
		const self = this;
		
		const username = attrs && attrs.element ? attrs.element.client : attrs.client;
		
		let data = {
			'parent': client.getParent(),
			'client': username,
			'event': attrs.event,
			'window': attrs.element ? attrs.element.window : null,
			'eventIndex': attrs.eventIndex
		}
		
		self.history.update(data) 
	}
	
	download() {
		const self = this;
		
		const element = self.elements[self.key];
		if(client.getRole() == 'dashboard' && !element) {
			self.errorMessage(menu.language == 'en' ? 'There is no open view to download.' : "Il n'y a pas de visualisation ouverte pour enregistrer.")
			return;
		}
		
		let districtName = self.view == 'map' ? self.dashboard.views.map[0].getDistrictName(element.sectors) : null;
		const imageName = self.dataset + '-' + (element ? element.depiction + '-' + element.indicator + (element.category ? '-' + element.category : '') : 
			self.view) + (element.sectors > 0 && districtName ? '-' + districtName + ' (' + element.sectors + ')' : '') + '.png';
		
		const warningMessage = menu.language == 'en' ? 'You need to enter something!' : "Vous devez donner un nom à l'image!"
		
		swal({
		  title: menu.language == 'en' ? 'Enter the name of the image' : "Donnez un nom à l'image",
		  input: 'text',
		  showCancelButton: true,
		  inputValue: imageName,
		  inputValidator: (value) => {
			  if (value) {
				  let extension = value.split('.')
				  extension = extension[extension.length - 1]
				  const attrs = {
					'window': self.key.split('-')[2],
					'client': self.key.split('-')[1],
					'image_name': extension == 'png' ? value : value + '.png', 
					'element': element
				  }
				  
				  if (attrs.client == client.getUsername()) self.saveToPNG(attrs)
				  else {
					  client.wsSendMessage(createJSONMessage("savetopng", attrs));
				  }
			  }
			  return !value && warningMessage
		  }
		})
	}
	
	// Download the PNG image on the browser running the dashboard where the view is displayed
	saveToPNG(attrs){
		const self = this;
		let window = attrs.window ? attrs.window.split('_')[1] : '1';
		let container = d3.select("div#window"+window);

		if (attrs.client != client.getUsername()) return;
		
		let view = client.getRole() == 'controller' ? self.dashboard.views[self.view][0] : 
			self.dashboard.views[attrs.element.depiction].filter(v => {
				return v.client == attrs.client && v.window == attrs.window;
			})[0]
		
		const width = container.node().clientWidth,
			height = container.node().clientHeight;
		
		if (view.type == 'map' || view.type == 'stc'){
			html2canvas(view.div.node()).then(function (canvas) {
				self.saveAsPNG(canvas.toDataURL('image/png'),  attrs.image_name)
			})
		}else{
			var svgString = getSVGString(view.div.selectAll('.svg-content').node());
			svgString2Image(svgString, 2*width, 2*height, 'png', save); // passes Blob and filesize String to the callback
			
			function save( dataBlob, filesize ){
				saveAs(dataBlob, attrs.image_name)
			}
		}
	}
	
	saveAsPNG(uri, fileName) {
	    var link = document.createElement('a');
	    if (typeof link.download === 'string') {
	      link.href = uri;
	      link.download = fileName;
	
	      //Firefox requires the link to be in the body
	      document.body.appendChild(link);
	
	      //simulate click
	      link.click();
	
	      //remove the link when done
	      document.body.removeChild(link);
	    } else {
	      window.open(uri);
	    }
	  }
	
	//-----------------------------------------------------------------------------------
	// Settings
	
	getPartition(){
		return this.partition;
	}
	
	getPickerFormat(){
		return this.pickerFormat;
	}
	
	getPickerPosition(){
		return this.pickerPos;
	}
	
	showBackground(){
		return this.background;
	}
	
	showLabels(){
		return this.labels;
	}
	
	exists(depiction){
		return !depiction ? true : Object.keys(menu.elements).some(key => {
			if (typeof menu.elements[key] == 'undefined') return false;
			return (Array.isArray(depiction) ? depiction.includes(menu.elements[key].depiction) : menu.elements[key].depiction == depiction) && menu.elements[key].client != client.getUsername()
		})
	}
	
	
	//-----------------------------------------------------------------------------------------------
	// Menu manipulation
	
	closeAll(){
		d3.select('div#slidr').style('width', '30px'),
		d3.select('div#slidr-menu').style('display', 'none'),
		d3.select('div#slidr-history').style('display', 'none'),
		d3.selectAll('div.vertical-buttons').style('left', '-35px')
		
		if (this.divIndicators)
			this.divIndicators.styles({
					'width': '0px',
					'height': '0px',
					'display': 'none'
				})
				
		d3.selectAll('ul.dropdown-menu')
			.style('display', 'none')
	}
	
	// Opens the menu
	open(button){
		const self = this;
		
		const cont = d3.select('div#slidr'),
			menu = d3.select('div#slidr-menu').node(),
			history = d3.select('div#slidr-history').node(),
			buttons =  d3.selectAll('div.vertical-buttons');
		
		switch(button){
		case 'menu':
			if (cont.node().clientWidth == 30){
				open()
				menu.style.display = 'block';
			}else if (menu.style.display == 'none'){
				menu.style.display = 'block';
				history.style.display = 'none';
			}else{
				menu.style.display = 'none';
				close()
			}
			self.timeController.pausePlayInteraction('menu');
			break;
		case 'history':
			if (cont.node().clientWidth == 30){
				open()
				history.style.display = 'block';
				self.history.set()
			}else if (history.style.display == 'none'){
				history.style.display = 'block';
				menu.style.display = 'none';
				self.history.set()
			}else{
				history.style.display = 'none';
				close()
			}
			break;
		}
				
		self.history.contextMenu.node().style.display = 'none';
		function close(){
			cont.style('width', '30px')
			buttons.style('left', '-35px')
		}
		
		function open(){
			cont.style('width', '100vw')
			buttons.style('left', function(){ return (window.innerWidth * 0.95 -35) + 'px';})
		}
		
	};
	
	//-------------------------------------------------------------------------------
	// Reconnecting
	
	// while we don't know whether a client has been disconnected or its page is getting refreshed, this method dissociate all elements from this client
	removeElements(attrs){
		const self = this;
		if (attrs.role == 'controller') return;
		const keys = Object.keys(self.elements).filter(d => { return d.split('-')[1] == attrs.username; });
		keys.forEach(key => {
			self.elements[key] = undefined;
		})
		sessionStorage.setItem('elements', JSON.stringify(self.elements)); 
			
	}
	
	// Restore the elements when a dashboard has been refreshed
	restoreElements(attrs){
		const self = this;
		
		if (client.getRole() != 'controller') return;
		
		Object.keys(attrs.elements).forEach(key => {
			self.elements[key] = attrs.elements[key];
		})
		
		if (self.dashboard.views && self.dashboard.views.map[0])
			self.dashboard.views.map[0].updateStyle();
		
		self.updateSymbols();
		
		self.updateContainersInfo();
		sessionStorage.setItem('elements', JSON.stringify(self.elements));
	}
	
	//--------------------------------------------
	// update clients each time a new client is connected
	updateClients(attrs){
		const self = this;
		
		if (client.getRole() == 'dashboard' && attrs.action == 'open' && attrs.client == client.getUsername()) self.init()
		if (client.getRole() != 'controller') return;
		
		const myUsername = client.getUsername();
		const myOldDashs = self.clients.filter(d => d.parent == myUsername);
		
		const selectClients = new Promise(function(fulfill, reject){
			const clients = JSON.parse(attrs.clients);
			self.clients = clients.filter(d => {
				return d.role == 'dashboard';
			})
			fulfill(self.clients)
		})
		
		selectClients.then(function(){
			if (attrs.action == 'open' && attrs.client == myUsername) self.init();
			
			self.updateDashboards();
			
			const myNewDashs = self.clients.filter(d => d.parent == myUsername)
			if (myNewDashs.length < myOldDashs.length){
				var difference = myOldDashs.filter(x => !myNewDashs.some(c => c.username == x.username));
				//in case the new clients array is shorter than the old one, it means some dashboard has disconnected
				self.removeElements(difference[0]);
				if (self.dashboard.views['map'][0])
					self.dashboard.views['map'][0].updateStyle();
				self.updateContainersInfo();
			}
		})
	}
	
	//-------------------------------------------------------------------
	// Extra charts control
	
	getSectorCharts(){
		const self = this;
		const sectors = [];
		Object.keys(self.elements).forEach(key => {
			let element = self.elements[key];
			if (typeof element != 'undefined' && (element.depiction == 'clock' || element.depiction == 'stacked-view')){
				if (!sectors.includes(element.sectors))
					sectors.push(element.sectors);
			}
		})
		return sectors
	}

	
	//---------------------------------
	// Map View control
	
	selectSector(attrs){
		const self = this;
		
		self.dashboard.views['map'].forEach(v => {
			v.highlightFeature(attrs);
		})
		
		if (client.getRole() == 'controller') return;
			self.dashboard.views['chord-diagram'].forEach(v => {
				v.selectSector(attrs);
			})
	}
	
	updateMapView(attrs){
		if (client.getRole() == 'controller') return;
		this.dashboard.views['map'].forEach(v => {
			v.updateMapView(attrs);
		})
	}
	
	//----------------------------------------
	// stc control
	
	updateTrajs(attrs){
		if (client.getRole() == 'controller') return;
		
		if (!this.dashboard.views) return;
		
		const self = this;
		Object.keys(self.dashboard.views).forEach(key => {
			if (key != 'index') return;
			if (self.dashboard.views[key].length == 0) return;
			
			self.dashboard.views[key].forEach(v => { // we can have several index plots
				v.updateHighlight(attrs) 
			})
		})
	}
	
	updateSTC(attrs){
		if (!this.dashboard.views) return;
		const stc = this.dashboard.views['stc'][0];
		if (!stc) return;
		
		const keys = ['move', 'wheel', 'hide_trajectories', 'show_trajectories', 'wiggle', 'reset_zoom', 
				'reset_cube_height', 'reset_position', 'toggle_selection', 'select_trajects_by_name', 'unselect_trajects_by_name', 'set_back_color',
				'resize', 'update-stc', 'set_updatable_floor', 'darkness', 'highlight_shapes', 'toggle_density', 'set_trajects_width', 'reload_data', 
				'reload_shape', 'select_semantic']
		
		let data = attrs.data;
		
		if (data instanceof Blob){
			stc.loadImage(data);
			if (client.getRole() == 'controller') // diffuses the new image to the dashboards 
				client.wsSendMessage(createJSONMessage('update-stc', {'key': 'update-stc'}));
			
			return;
		} 
		
		data = JSON.parse(data);
		const onlyController = ['highlight_shapes', 'unselect_all_trajects', 'click']
		if (data.key == 'update-stc' && client.getRole() != 'dashboard') return;
		if (onlyController.includes(data.key) && client.getRole() != 'controller') return;
		
		
		switch(data.key){
		case 'update-stc':
			stcClient.wsSendMessage('image', ['high'])
			stcClient.wsSendMessage('dates')
			break;
		case 'dates':
			if (client.getRole() == 'controller')
				stc.updateTimeAxis(data.value);
			break;
		case 'unselect_all_trajects':
			stc.updateSelection({'action':'unselectall'})
			break;
		case 'click':
			const value = data.value[0];
			if (value.action != 'none'){
				stc.updateSelection({'action':value.action, 'code':value.name})
			}else{
				stcClient.wsSendMessage('image', ['high'])
			}
			break;
		case 'highlight_shapes':
			stcClient.wsSendMessage('image', ['high'])
			break;
		case 'show_trajectories':
			stc.updateDisplayedTrajs(data.value);
			break;
		default:
			if (client.getRole() != 'controller') return;
			if (!keys.includes(data.key)) {
				console.log('Unknown action:', data.key)
				return;
			}
			
			if (['toggle_selection', 'select_trajects_by_name', 'unselect_trajects_by_name', 'set_back_color', 'hide_trajectories', 'show_trajectories', 
				'set_updatable_floor', 'wiggle', 'resize', 'set_trajects_width', 'reload_shape', 'reload_data', 'select_semantic', 'darkness'].includes(data.key)) return;
						
			if (data.key == 'move' || data.key == 'wheel') stcClient.wsSendMessage('image', ['low'])
			else stcClient.wsSendMessage('image', ['high'])
			
			stcClient.wsSendMessage('dates')
				
		}
	}
	
	// Added network functions for new offline usage
	
	// Update UI with discovered network devices
	updateNetworkDevices(deviceData) {
		console.log("Device found:", deviceData);
		
		// Store device data for the dashboard list
		if (!this.availableDevices) {
			this.availableDevices = [];
		}
		
		// Check if device already exists in the list
		const existingDeviceIndex = this.availableDevices.findIndex(d => d.id === deviceData.id);
		if (existingDeviceIndex >= 0) {
			// Update existing device data
			this.availableDevices[existingDeviceIndex] = deviceData;
		} else {
			// Add new device data
			this.availableDevices.push(deviceData);
		}
		
		// Update dashboard dropdown if we're in controller view
		if (client.getRole() === 'controller') {
			this.updateDashboards();
		}
	}
	
	// Handle connection status updates
	updateConnectionStatus(deviceData) {
		console.log("Connected to device:", deviceData);
		
		// Update UI to show connected status
		const toast = this.toast;
		if (toast) {
			toast({
				type: 'success',
				title: `Connected to ${deviceData.name}`
			});
		}
		
		// If we're in dashboard mode and connected to a controller,
		// update the parent info
		if (client.getRole() === 'dashboard' && deviceData.role === 'controller') {
			client.setParent(deviceData.name);
			this.updateParentInfo({username: deviceData.name});
		}
		
		// Initialize page according to role
		if (client.getRole() === 'controller') {
			// Controller's dashboard setup
			this.setHeader();
		} else {
			// Dashboard setup
			if (this.dashboard && this.dashboard.load) {
				this.dashboard.load(this.elements);
			}
		}
	}

	// Fetch available devices from the network API
	async fetchAvailableDevices() {
		try {
			const response = await fetch('http://localhost:3000/api/devices');
			if (response.ok) {
				const data = await response.json();
				return data.devices || [];
			}
			console.error('Failed to fetch devices:', response.statusText);
			return [];
		} catch (error) {
			console.error('Error fetching devices:', error);
			return [];
		}
	}

	// Fetch available clients from the network API
	async fetchClients() {
		try {
			const response = await fetch('http://localhost:3000/api/clients');
			if (response.ok) {
				const data = await response.json();
				return data.clients || [];
			}
			console.error('Failed to fetch clients:', response.statusText);
			return [];
		} catch (error) {
			console.error('Error fetching clients:', error);
			return [];
		}
	}

}