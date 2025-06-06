
class History{
	constructor(){
		this.data = []
		this.parentIndices = {}
	}
	
	clear(){
		this.data = [];
		this.parentIndices = {};
		if (this.div){
			this.div.selectAll('svg').remove()
			this.div.selectAll('button').remove()
		}
	}
	
	recoverData(data){
		if(data == "") return;
		this.data.push(JSON.parse(data.element));
		d3.select('#loading-text')
			.text((menu.language == 'en' ? 'Recovering history... ' : 'Histoire en récupération...') + Math.trunc((data.index/data.total)*100) + '%')
		if (data.progress == 1) d3.select('#loading-text').remove(); 
	}
	
	updateParentIndices(){
		const self = this;
		
		self.parentIndices = {}
		self.data.forEach(d => {
			if (typeof self.parentIndices[d.parentName] == 'undefined')
				self.parentIndices[d.parentName] = Object.keys(self.parentIndices).length; 
			d.parentIndex = self.parentIndices[d.parentName]
		})
	}
	
	// ----------------------------------
	// recover the data using information from the server
	init(){ 
		const self = this;
				
		self.div = d3.select("div#slidr-history")
			.classed('dragscroll', true)
			.style('cursor', 'default')
		
		const buttonText = {'title': {'en': 'Clear history', 'fr': "Effacer l'histoire"},
							'confirm': {'en': 'Are you sure?', 'fr': 'Êtes-vous sûr ?'},
							'alert': {'en': "You won't be able to revert this!", 'fr': "Vous ne serez plus capable d'annuler cette action !"},
							'done': {'en': 'Done!', 'fr': "C'est fait !"},
							'doneInfo': {'en': 'All items in your history has been deleted.', 'fr': 'Tous les événements de votre histoire ont été effacés.'},
							'ok': {'en': 'Yes, do it!', 'fr': 'Oui, faites-le !'}}	
			
		self.div.append('button')
			.classed('btn btn-default dropdown-toggle', true)
			.style('margin-top', '35px')
			.style('z-index', '10')
			.style('position', 'fixed')
			.attr('id', 'clear-history')
			.text(buttonText.title[menu.language])
			.on('click', function(){
				Swal.fire({
					  title: buttonText.confirm[menu.language],
					  text: buttonText.alert[menu.language],
					  type: 'warning',
					  showCancelButton: true,
					  confirmButtonColor: '#3085d6',
					  cancelButtonColor: '#d33',
					  confirmButtonText: buttonText.ok[menu.language]
				}).then((result) => {
				  if (result.value) {
					  self.data = [];
					  self.events = [];
					  self.parentIndices = {};
					  self.set();
					  
					  client.wsSendMessage(createJSONMessage('clear-history', {'client': client.getUsername()}))
					  
					  Swal.fire(
						buttonText.done[menu.language],
						buttonText.doneInfo[menu.language],
						'success'
					  )
				  }
				})
			})			
			
		self.div.append('button')
			.classed('btn btn-default dropdown-toggle', true)
			.style('z-index', '10')
			.style('position', 'fixed')
			.attr('id', 'goto-top')
			.text(menu.language == 'en' ? 'Go to Top' : 'Aller en Haut de Page')
			.on('click', function(){
				self.div.node().scrollTop = 0;
			})
			
		self.legend = self.div.append('div')
			.styles({
				'position': 'fixed',
				'background-color': 'white',
				'z-index': 1
			})
						
		self.svg = self.div.append('svg')
			.classed('history-items', true)
			
		self.setContextMenu()
	}
	
	setContextMenu(){
		const self = this;
		self.contextMenu = d3.select('body')
			.append('div')
			.classed('menu-container', true)
			.styles({
				'padding': '5px',
				'width': '350px',
				'height': '230px'
			})
		
		const alertMessage = {'en': "You won't be able to revert this!", 'fr': "Vous ne serez plus capable d'annuler cette action !"}
		const buttonMessage = {'en': 'Yes, do it!', 'fr': 'Oui, faites-le !'}
		const doneMessage = {'en': 'Done!', 'fr': "C'est fait !"}
		
		const data = [{'title': {'en':'Restore the dashboard to this event', 'fr': "Rétablir le tableau de bord à cet événement"},
						'confirm': {'en': 'Are you sure?', 'fr': "Êtes-vous sûr ?" },
						'done': {'en': ['The dashboard has being restored to event ', '. To undo it, restore it again to the previous event.'], 
							'fr': ["Le tableau de bord a été rétabli à l'événement ", ". Pour annuler cette action, il faut rétablir le tableau de bord à l'événement précedent."]}},
						
						{'title': {'en':'Restore the entire environment to this event', 'fr': "Rétablir l'environnement à cet événement"},
								'confirm': {'en': 'Are you sure?', 'fr': "Êtes-vous sûr ?"},
								'done': {'en': ['The environment has being restored to event ', '. To undo it, restore it again to the previous event.'], 
									'fr': ["L'environnement a été rétabli à l'événement ", ". Pour annuler cette action, il faut rétablir l'environnement à l'événement précedent."]}},
						
						{'title': {'en': 'Delete event from the History', 'fr': "Effacer cet événement de l'histoire"},
						'confirm': {'en': 'Are you sure you want to delete this event?', 'fr': "Êtes-vous sûr d'effacer cet événement ?"},
						'done': {'en': 'The event has been deleted from your history.', 'fr': "L'événement a été effacé de votre histoire."}},
						
						{'title': {'en': "Delete ALL events from this dashboard", 'fr': "Effacer TOUS les événements de ce tableau de bord"},
						'confirm': {'en': 'Are you sure you want to delete ALL events of this dashboard?', 'fr': "Êtes-vous sûr d'effacer TOUS les événements de ce tableau de bord ?"},
						'done': {'en': ['The events of dashboard ', ' have been deleted from your history.'] , 'fr': ["Tous les événements du tableau de bord ", " ont été effacées de votre histoire."]}},
						
						{'title': {'en': "Delete ALL events from this window", 'fr': 'Effacer TOUS les événements de cette fenêtre'},
						'confirm': {'en': 'Are you sure you want to delete ALL events of this window?', 'fr': "Êtes-vous sûr d'effacer TOUS les événements de cette fenêtre ?"},
						'done': {'en': ['The events of window ', ' have been deleted from your history.'] , 'fr': ["Les événements de la fenêtre ", " ont été effacés de votre histoire."]}},
						{'title': {'en': 'Close', 'fr': 'Fermer'}}]	
		
		self.contextMenu.selectAll('button')
			.data(data)
			.enter()
				.append('button')
				.classed("btn btn-default dropdown-toggle", true)
				.styles((d,i) => {
					switch(i){
					case 5:
						return {
							'width': '100px',
							'float': 'right',
							'margin-right': '0px',
							'margin-top': '10px'
						}
					default:
						return { 'width': '340px' }
					}
				})
				.text(d => d.title[menu.language])
				.on('click', function(d,i) {
					this.parentNode.style.display = 'none';
					if (!self.del) return;
					if (i == 5){
						  self.del = null;
						  return;
					}
					
					const event = self.data.filter(d => d.index == self.del.index)[0];
										
					const restoreMessage = {'en': 'This will change the current dataset to ' + event.settings.dataset + ', which affects the controller and every connected dashboard.', 
								'fr': "Cette action changera le jeu de données à " + event.settings.dataset + ", en affectant le contrôleur et tous les tableaux de bords connectés."}
					
					Swal.fire({
						  title: data[i].confirm[menu.language],
						  text: i > 1 ? alertMessage[menu.language] : (event.settings.dataset != menu.dataset ? restoreMessage[menu.language] : ''),
						  type: 'warning',
						  showCancelButton: true,
						  confirmButtonColor: '#3085d6',
						  cancelButtonColor: '#d33',
						  confirmButtonText: buttonMessage[menu.language]
					}).then((result) => {
						if (result.value) {
							let message = null;
							let items = null;
							
							switch(i){
							case 0:
							case 1:
							  	let attrs = {
									'action': 'restore',
									'client': self.del.dashboard,
									'settings': event.settings,
									'event': {'code' : 'restore', 'item': i == 0 ? 'dashboard' : 'environment', 'value': event.date}
								};
							
							  	client.wsSendMessage(createJSONMessage('update-workspace', attrs))
							  	
							  	message = data[i].done[menu.language][0] + ' "' + event.eventTitle + '" ' + data[i].done[menu.language][1];
							  	break;
							case 2:
								client.wsSendMessage(createJSONMessage('remove-history-item', {'client': client.getUsername(), 'itemID': self.del.index}));
								self.data = self.data.filter(d => d.index != self.del.index)
								
								self.set()
								message = data[i].done[menu.language];
								break;
							case 3:
							  	items = self.data.filter(d => d.parentName == self.del.dashboard)
								items.forEach(d => {
									client.wsSendMessage(createJSONMessage('remove-history-item', {'client': client.getUsername(), 'itemID': d.index}));
							  	})
								
								self.data = self.data.filter(d => Array.isArray(d.parentName) ? true : d.parentName != self.del.dashboard)
								
								self.set()
								
								message = data[i].done[menu.language][0] + self.del.dashboard + data[i].done[menu.language][1];
								break;
							case 4:
							  	items = self.data.filter(d => d.parentName == self.del.dashboard && d.window == self.del.window);
							  	items.forEach(d => {
							  		client.wsSendMessage(createJSONMessage('remove-history-item', {'client': client.getUsername(), 'itemID': d.index}));
							  	})
								
								self.data = self.data.filter(d => !Array.isArray(d.parentName) && d.parentName == self.del.dashboard ? d.window != self.del.window : true)
								
								self.set()
								message = data[i].done[menu.language][0] + self.del.window.split('_')[1] + data[i].done[menu.language][1];
								break;
							  		
							}
							
							Swal.fire(
								doneMessage[menu.language],
								message,
								'success'
							)
						
					  }
					})			
				})
				
		self.contextMenu.node().style.display = 'none';
		

	}
	
	//-------------------------------------------------------------------------------------
	// attrs should contain the event, the dashboard, the current elements and the imageUrl
	update(attrs){
		const self = this;
		
		const saveData = new Promise(function(fulfill, reject){
			
			const date = new Date();
			const index = self.data.length > 0 ? self.data[self.data.length-1].index + 1 : 1;
			
			if (typeof self.parentIndices[attrs.client] == 'undefined')
				self.parentIndices[attrs.client] =  Object.keys(self.parentIndices).length;
			
			const settings = {
					'elements': menu.elements,
					'dataset': menu.dataset,
					'partition': menu.partition
			}
			
			self.data.push(child())
			
			function child(){
				return {
					'parentName': attrs.client,
					'parentIndex': self.parentIndices[attrs.client],
					'window': attrs.window,
					'index': index,
					'date': formatDate(date), 
					'time': date.getTime(),
					'eventInfo': attrs.event,
					'eventType': attrs.event.code,
					'settings': JSON.parse(JSON.stringify(settings))
				}
			}
			
			
			client.wsSendMessage(createJSONMessage('save-history', {'data' : child(), 'client': client.getUsername()}))
		
		})
		
		saveData.then(self.set())
		
		function formatDate(date){
			return date.getDate() + '/' + (date.getMonth()+1) + '/' + date.getFullYear() + ' at ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0') + ':' + date.getSeconds().toString().padStart(2, '0')
		}
	}
	
	//---------------------------------------------------------------------
	// display the sequence of events
	set(){
		const self = this;
		
		const width = window.innerWidth * 0.95,
			height = window.innerHeight,
			margin = {'top': 20, 'bottom': 150, 'left': 20, 'right': width * 0.03};
		
		self.svg.attrs({
			'width': width,
			'height': height,
			'viewBox': '0 0 ' + width + ' ' + height
		})
		
		// clear the history svg
		let node = self.svg.node();
		while (node.firstChild) {
		    node.removeChild(node.firstChild);
		}
		
		// clear the legend
		node = self.legend.node()
		while (node.firstChild) {
		    node.removeChild(node.firstChild);
		}
		
		self.div.select('button#clear-history')
			.text(menu.language == 'en' ? 'Clear history' : "Effacer l'histoire")
			.style('margin-left', function() { return (width - this.clientWidth - 20) + 'px'; })
			
		self.div.select('button#goto-top')
			.text(menu.language == 'en' ? 'Go to Top' : 'Aller en Haut de Page')
			.styles(function(){
				return{
					'margin-left': (width - this.clientWidth - 20)  + 'px',
					'margin-top': (height - 55) + 'px'
				}
			})
			
		self.contextMenu.selectAll('button')
			.text(d => d.title[menu.language])
		
		if (self.data.length == 0) {
			self.svg.style('top', '0px')
				.append('text')
				.attr('transform', transformString('translate', width/2, 300))
				.style('text-anchor', 'middle')
				.text(menu.language == 'en' ? 'Your history is empty!' : 'Votre histoire est vide !')
			
			return;				
		}
		
		const symbol = {
			'modify': d3.symbolDiamond,
			'create': d3.symbolCircle,
			'switch': d3.symbolWye,
			'restore': d3.symbolStar,
			'global': d3.symbolSquare
		}	
			
		const pathGenerator = d3.symbol()
		  .type(d => d.eventType ? symbol[d.eventType] : symbol[d])
		  .size(400);
		
		const colors = colorPalettes.history_colors;
	
		// prepare data 
		let parents = [client.getUsername()]
		menu.clients.forEach(c => {
			if (c.parent == client.getUsername())
				parents.push(c.username)		
		})
		
		let data = parents.map((d,i) => {
			let windows = []
			d3.range(1,5).forEach(e => windows.push({'name': 'cont_'+e}))
			return {
				'left': margin.left + (d == client.getUsername() ? 0 : 200 + (i-1)*800),
				'name': d,
				'children': d == client.getUsername() ? null : windows,
				'width': d == client.getUsername() ? 200 : 800
			}
		})
			
		let nbItems = [];
		data.forEach(d => {
			if (!d.children) {
				d.items = self.data.filter(i => (Array.isArray(i.parentName) && i.parentName.includes(d.name)) || i.parentName == d.name)
				nbItems.push(d.items.length)
			}
			else d.children.forEach(c => {
				c.items = self.data.filter(i => (Array.isArray(i.parentName) && i.parentName.includes(d.name)) || (i.parentName == d.name && (!i.window || i.window == c.name)))
				nbItems.push(c.items.length)
			})
		})
		
		const svgWidth = (parents.length - 1) * 800 + 300,
			svgHeight = d3.max(nbItems) * 100 + 100;
		
		self.svg.attrs({
			'width': svgWidth,
			'height': svgHeight,
			'viewBox': '0 0 ' + svgWidth + ' ' + svgHeight,
			'transform': transformString('translate', 0, 0)
		})

		
		// ----------------------------------------------------------------------------------
		const dashGroup = self.svg.selectAll('g')
			.data(data)
			.enter()
				.append('g')
				.attr('transform', d => transformString('translate', d.left, margin.top))
				
		dashGroup.append('text')
			.styles({
				'text-anchor': 'middle',
				'font-size': '12px',
				'font-weight': 'bold'
			})
			.attr('transform', d => transformString('translate', d.width / 2, 0))
			.text(d => (d.name == client.getUsername() ? labels['controller'][menu.language] : labels['dashboard'][menu.language]) + ' ' + d.name)
				
		dashGroup.append('line')
			.attrs((d,i) => {
				return {
					'y1': -10,
					'y2': svgHeight,
					'x1': d.width,
					'x2': d.width
				}
			})
			.style('stroke', '#000')
			
			
		const windowGroups = dashGroup.filter(d => d.children)
			.selectAll('g')
			.data(d => d.children)
			.enter()
				.append('g')
				.attr('transform', (d,i) => transformString('translate', i*200, 40))
				
		windowGroups.append('text')
			.styles({
				'text-anchor': 'middle',
				'font-size': '12px',
				'font-weight': 'bold'
			})
			.attr('transform', d => transformString('translate', 100, 0))
			.text(d => labels['window'][menu.language] + ' ' + d.name.split('_')[1])
			
		windowGroups.append('line')
			.attrs((d,i) => {
				return {
					'y1': -10,
					'y2': svgHeight,
					'x1': 200,
					'x2': 200
				}
			})
			.style('stroke', '#000')
			.style('stroke-dasharray', '3')
			.style('display', d => d.name == 'cont_4' ? 'none' : 'block')
			
		//----------------------------------------------------------------------
		
		function getEventTitle(event){
			let value = labels[event.value] ? (['space', 'time'].includes(event.item) ? labels[event.value][event.item][menu.language] : labels[event.value][menu.language]) : event.value;
			let en = menu.language == 'en';
			let category = labels[event.item] ? labels[event.item][menu.language] : event.item;
			
			switch(event.item){
			case 'add':
				return (en ? 'View opening: ' : "Ouverture d'une vue : ") + value;
			case 'remove':
				return (en ? 'View closing: ' : "Fermeture d'une vue : ") + value;
			case 'indicator':
				return (en ? 'Indicator changed to ' : "L'indicateur a changé pour ") + value;
			case 'rep':
				return (en ? 'Representation changed to ' : 'La répresentation a changée pour ') + value;
			case 'space':
				return (en ? 'Spatial aggregation changed to ' : "L'aggrégation spatial a changée pour ") + value;
			case 'time':
				return (en ? 'Temporal aggregation changed to ' : "L'aggrégation temporelle a changée pour ") + value;
			case 'activity':
			case 'modes':
				return en ? category + (value ? ' category changed to ' + value : ' category removed') : 'La catégorie de ' + category + (value ? ' a changée pour ' + value : ' est effacée.')
			case 'partition':
				return (en ? 'Territorial partition changed to ' : 'La découpage du territoire a changée pour ') + value;
			case 'datasets':
				return (en ? 'Dataset changed to ' : 'Le jeu de données a changé pour ') + value;
			case 'switch':
				return (en ? 'Interactive view switched to ' : 'La vue interactive a changé pour ') + value;
			case 'dashboard':
			case 'environment':
				return (en ? '' : 'Le ') + category + (en ? ' restored to event on ' :  " a été rétabli à l'événement le ") + value;
			case 'details':
				return (en ? (value ? 'Details displayed' : 'Details hidden') : (value ? 'Les détails sont affichés' : 'Les détails sont cachés'))
			case 'filtering':
				return (en ? 'Trajectories filtered' : 'Les trajectoires ont été filtrés')
			case 'semantic':
				return (en ? 'Semantic changed to ' : 'La sémantique a changée pour ') + value;
			case 'sector':
				return en ? 'District(s) changed' : 'Secteur(s) changé(s)';
			case 'typology':
				return (en ? (value ? 'Typology changed to ' + value : 'Typology removed') : (value ? 'La typologie à changée pour ' + value : 'La typologie est effacée')) 
			case 'freeze':
				const action = en ? (value ? 'freezed' : 'unfreezed') : (value ? 'figé' : 'défigé')
				switch(event.dimension){
				case 'time':
					return (en ? 'Temporal dimension is ' : 'Le temps est ') + action
				case 'space':
					return (en ? 'Spatial dimension is ' : "L'espace est ") + action;
				case 'zoom':
					return (en ? 'Zoom is ' : 'Le zoom est ') + action;
				}
			case 'customize':
				switch(event.dimension){
				case 'fullscreen':
					return (en ? 'The view is on ' : 'La vue est dans ') + (value ? (en ? 'full screen mode' : 'mode plein écran') : (en ? 'windowed mode' : 'mode fenêtré'))
				case 'details':
					return (en ? (value ? 'Details displayed' : 'Details hidden') : (value ? 'Les détails sont affichés' : 'Les détails sont cachés'))
				case 'legend':
					return (en ? (value ? 'Legend displayed' : 'Legend hidden') : (value ? 'La légende est affichée' : 'La légende est cachée'))
				}
				return;
			}
		}	
			
		function setItems(group){
			
			const itemGroup = group.selectAll('g')
				.data(d => d.items)
				.enter()
					.append('g')
					.attr('transform', (d,i) => transformString('translate', 0, 50 + i * 100))
					.on('click', function(d){
						self.contextMenu.styles(function(){						
							let top = (d3.event.y);
							const height = 230;
							let overflow = (top + height) - (window.innerHeight * .88);
							top = overflow > 0 ? (top - overflow - 50) : top;
							
							const width = 300;
							let left = d3.event.x - width;
							left = left < 0 ? 10 : left;
							return {
								'top': top + 'px',
								'left': left + 'px',
								'transition': '0s',
								'display': 'block'
							}
						})
						
						const parent = this.parentNode,
							cont = d3.select(parent).datum(),
							dash = d3.select(parent.parentNode).datum();
						
						self.del = {
							'index': d.index,
							'window': cont && cont.name == client.getUsername() ? 'cont_1' : cont.name,
							'dashboard': dash ? dash.name : client.getUsername() 
						}
					})
					
			let paths = itemGroup.append('path')
				.attr('transform', (d,i) => transformString('translate', 100, 0))
				.style('fill', d => d.eventType == 'create' ? colors[d.eventInfo.item] : colors[d.eventType])
				.attr('d', pathGenerator)
				
			itemGroup.append('text')
				.styles({
					'text-anchor': 'middle',
					'font-size': '12px'
				})
				.attr('transform', (d,i) => transformString('translate', 100, 30))
				.text(d => d.date)	
				
			itemGroup.append('text')
				.styles({
					'text-anchor': 'middle',
					'font-size': '12px'
				})
				.attr('transform', (d,i) => transformString('translate', 100, 50))
				.text(d => getEventTitle(d.eventInfo))	
				.call(wrap, 200, 0)
		}
			
		setItems(dashGroup.filter(d => !d.children))
		setItems(windowGroups)
		
		//------------------------------------
		// set legend
		
		data = [{'code': 'add', 'en': 'View Opening', 'fr': 'Ouverture de Vue'},  
			{'code':'remove', 'en': 'View Closing', 'fr': 'Fermeture de Vue'}, 
			{'code':'modify', 'en': 'Attributes Modification', 'fr': 'Modification des attributs'},
			{'code':'restore', 'en': 'Environment Restoring', 'fr': "Rétablissement de l'environnement"},
			{'code':'global', 'en': 'Global settings', 'fr': "Changement d'attributs globales"}]

		if (!client.url.includes('lig'))
			data.push({'code':'switch', 'en': 'Interactive View Switch', 'fr': 'Changement de la vue interactive'})
		
		const legendWidth = width - 15,
			legendHeight = 50;

		const legendSvg = self.legend
			.styles({
				'width': legendWidth + 'px',
				'height': legendHeight + 'px'
			})
			.append('svg')
			.attrs(function(){
				return {
					'width': legendWidth,
					'height': legendHeight,
					'viewBox': '0 0 ' + legendWidth + ' ' + legendHeight,
					'transform': transformString('translate', 0, 0)
				}
			})
			
		legendSvg.append('text')
			.attr('transform', transformString('translate', 10, 25))
			.text('Event types: ')
			
		const legendGroup = legendSvg.selectAll('g')
			.data(data)
			.enter()
				.append('g')
				
		legendGroup.append('path')
			.attr('d', d => ['add', 'remove'].includes(d.code) ? pathGenerator('create') : pathGenerator(d.code))
			.style('fill', d => colors[d.code])
			.attr('transform', (d,i) => transformString('translate', 0, -legendHeight/6))
				
		legendGroup.append('text')
			.attr('transform', (d,i) => transformString('translate', 15, 0))
			.text(d => d[menu.language])
		
		legendGroup.attr('transform', function(d) {
			let left = 100;
			let sibling = this.previousSibling;
			while (sibling.nodeName == 'g'){
				left += sibling.getBoundingClientRect().width + 5;
				sibling = sibling.previousSibling;
			}
			return transformString('translate', left, legendHeight/2)
		})
	}
}