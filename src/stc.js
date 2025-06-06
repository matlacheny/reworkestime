/*
 * This class manages the STC
 */

class STCWebSocket{
	constructor(protocol, hostname, port){
		this.webSocket = null;
		
		this.protocol = protocol;
		this.hostname = hostname;
		this.port = port;
		
		this.msgQueue = [];
	}
	
	getUrl(){
		return this.protocol+'://'+this.hostname+':'+this.port;
	}
	
	wsConnect(){
		const self = this;
				
		this.webSocket = new WebSocket(self.getUrl());
		this.webSocket.onopen = function() { self.wsOnOpen(); };
		this.webSocket.onmessage = function(msg) { self.wsOnMessage(msg); };
		this.webSocket.onclose = function() { self.wsOnClose(); };
		this.webSocket.onerror = function() { self.wsOnError(); };
	}
	
	wsSendMessage(key, data) {
		const message = createJSONMessage(key, data);
		this.msgQueue.push(message);
	    this.wsSendNextMessages();
	}
	
	wsOnOpen(){
        console.log('STC server connected...');
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
	
	wsOnMessage(msg){
		menu.updateSTC(msg);
	}
	
	wsOnClose(){
		console.log("STC server disconnected ... ");
	    this.webSocket = null;
	}

	wsOnError(){
		console.log("Error");
		this.webSocket.close();
	}

}

class STC{
	constructor(){
		this.last_date = new Date();
		this.type = 'stc';
		this.canvas;
		this.div;
		this.indicator = 'trajs';
	}
	
	recoverSession(){
		const self = this;
		let recover = sessionStorage.getItem(this.id+'-wiggle')
		this.wiggle = recover == 'true' ? true : false;
		
		recover = sessionStorage.getItem(this.id+'-floor-darkness')
		this.darkness = recover || 15;
		
		recover = sessionStorage.getItem(this.id+'-trajects-width')
		this.traj_width = recover || 15;
		
		recover = sessionStorage.getItem(this.id+'-dynamic-floor')
		this.dynamic = recover == 'true' ? true : false;
		
		recover = sessionStorage.getItem(self.id+'-select-trajectories')
		this.select = recover == 'false' ? false : true;
		
		recover = sessionStorage.getItem(self.id+'-density')
		this.density = recover == 'true' ? true : false;
		
		recover = sessionStorage.getItem(self.id+'-select-multiple')
		this.multiple = recover == 'true' ? true : false;
		
		recover = sessionStorage.getItem(self.id+'-semantic')
		this.semantic = recover || 'activity';
		
		recover = sessionStorage.getItem(self.id+'-current-dataset')
		this.dataset = recover || 'grenoble';
		
		recover = sessionStorage.getItem(self.id+'-details')
		this.details = recover == 'true' ? true : false;
		
		this.filtering = this.setFiltering()
		
		recover = sessionStorage.getItem(self.id+'-selected-trajs')
		this.displayed = recover ? JSON.parse(recover) : this.filtering;
				
		recover = sessionStorage.getItem('translate-'+self.id);
		this.translate = recover == 'true' ? true : false;
		
		recover = sessionStorage.getItem(self.id+'-selected-trajectory')
		this.selected = recover ? JSON.parse(recover) : this.selected;
		
		recover = sessionStorage.getItem(self.id+'-displayed-codes')
		this.displayed_codes = recover ? JSON.parse(recover) : self.data.map(d => d.pcode);
	
	}
	
	setFiltering(){
		const self = this;
		
		let age_groups = self.info.filter(d => d.aspect == "age");
		age_groups = age_groups.map(d => d.description);
		age_groups = age_groups.filter((d,i) => age_groups.indexOf(d) == i)
	    let occupation = self.data.map(d => d['work status']);
		occupation = occupation.filter((d,i) => { return occupation.indexOf(d) == i; })
		let classes = self.data.map(d => d.class);
		classes = classes.filter((d,i) => { return classes.indexOf(d) == i; })
		classes.sort(d3.ascending)
		
		let criterion = self.data.map(d => d.criterion); // recover possible criteria for representative trajectories
		criterion = criterion.filter((d,i) => criterion.indexOf(d) == i)
		criterion.sort(d3.ascending)
		
	    return {'occupation': occupation, 'typology': classes, 'criterion': criterion, 'age': age_groups, 'sex': ['male', 'female'], 'semantic': ['activity', 'modes', 'both']}
	}
	
	updateAttrs(attrs){
		const self = this;
	
		if (attrs.action == 'customize'){
			if(self[attrs.dim] == attrs.value) return
			self[attrs.dim] = attrs.value;
			
			if (attrs.dim == 'details'){
				d3.select('div#class-info').style('display', self.details ? 'block' : 'none');
			}else{
				if (client.getRole() == 'dashboard'){
					if (self.fullscreen){
						stcClient.wsSendMessage('resize', [self.width, self.height]);
						self.setTimeAxis();
						self.updateSelection({'attrs': 'init'});
					}else{
						self.div.selectAll('div.stc-info').remove();
						self.div.select('g#time-axis').remove();
						stcClient.wsSendMessage('image', ['high'])
					}
				}else{
					if (!self.fullscreen) stcClient.wsSendMessage('resize', [self.width, self.height]);
					stcClient.wsSendMessage('image', ['high'])
				}		
			}
		}else{
			this.height = attrs.height || this.height;
			this.width = attrs.width || this.width;
			
			this.div.styles({
				'height': self.height + 'px',
				'width': self.width + 'px'
			})
			
			if (self.canvas){
				self.canvas.attrs({
		    		'width': self.width,
		    		'height': self.height
		    	})
			}
		}
	}
	
	clear(){
		let node = this.div.node();
		while(node.firstChild){
			node.removeChild(node.firstChild);
		}
		
//		d3.select('div.header').selectAll('div.dropdown')
//			.each(function(d) {
//				if (!this.id.includes('datasets')) d3.select(this).remove()
//			})
	}
	
	reloadData(){
		const self = this;
		stcClient.wsSendMessage('reload_shape', ['data/'+menu.dataset+'/OD_sectors.geojson'])
		stcClient.wsSendMessage('reload_data', ['data/'+menu.dataset+'/stc.csv'])
		
		var ctx = self.canvas.node().getContext("2d");
		ctx.font = "20px Roboto sans-serif";
		ctx.fillText("Please wait...", self.width/2 - 20, self.height/2);
		
		self.dataset = menu.dataset;
		sessionStorage.setItem(self.id+'-current-dataset', menu.dataset)
		
		self.filtering = self.displayed = self.setFiltering()
		self.displayed_codes = self.data.map(d => d.pcode)
		sessionStorage.setItem(self.id+'-displayed-codes', JSON.stringify(self.displayed_codes))
	}
	
	displayTrajectories(){
		const self = this;
		
		const all_codes = self.data.map(d => d.pcode)
		
		stcClient.wsSendMessage('show_trajectories', [self.displayed_codes]);
		stcClient.wsSendMessage('hide_trajectories', [all_codes.filter(d => !self.displayed_codes.includes(d))]);
		
		stcClient.wsSendMessage('unselect_all_trajects')
	}
	
	saveToHistory(event){
		menu.takeScreenshot({
			'client': client.getUsername(),
			'event': event,
			'label': 'stc'
		})
	}
	
	switchLanguage(){
		this.setHeader()
		this.setLegend()
		this.setInfo()
	}
	
	set(attrs){
		const self = this;
		
		self.div = attrs.div;
		self.id = attrs.id;
		self.client = attrs.client;
		self.window = attrs.window;
		self.width = attrs.width;
		self.height = client.getRole() == 'controller' ? attrs.height - 130 : attrs.height;
		self.selected = attrs.selected;
		
		self.fullscreen = attrs.fullscreen;
		self.details = attrs.details;
		
		self.div.style('height', self.height + 'px')
		
		const waitingText = self.div.append('text')
			.style('line-height', self.div.node().clientHeight + 'px')
			.text(labels['loading'][menu.language])
		
		const names = ['data', 'info'];
		const folder = menu.getDataDirectory();
		const q = d3.queue()
			.defer(d3.json, folder + 'stc_semantic.json')
			.defer(d3.csv, folder + 'class_semantic.csv')
		
		q.awaitAll(function(error, files){
			files.forEach((f,i) => {
				self[names[i]] = f;
			})
			
			// the data are in a list format, so we keep only the first element of one-item lists
			self.data.forEach(d => {
				Object.keys(d).forEach(key => {
					if (['location_names', 'location_codes', 'activity', 'mode'].includes(key)) return;
					if (d[key].length == 1) d[key] = d[key][0]
				})
			})
			
			self.recoverSession();
			waitingText.remove()
			self.loadDiagram();
			
			if (client.getRole() == 'controller') 
				self.addInteraction()
		})
	}
	
	loadDiagram(){
		const self = this;
		
		const loadCanvas = new Promise(function(fulfill, reject){
			let node = self.div.node();
			while(node.firstChild){
				node.removeChild(node.firstChild);
			}
			
			self.canvas = self.div.append('canvas')
		    	.attrs({
		    		'width': self.width,
		    		'height': self.height,
		    		'id': 'stc-canvas'+self.id
		    	})
			
			if (self.dataset != menu.dataset){
				self.reloadData()
			}

	    	fulfill()
		})
		
		loadCanvas.then(function(){			
			if (client.getRole() == 'controller'){
				
				// initial settings for the cube
				
				self.recover = true;
				const fullscreen = Object.keys(menu.elements).some(key => menu.elements[key].customize == 'fullscreen')
				if (!fullscreen) stcClient.wsSendMessage('resize', [self.width, self.height]);
				
				stcClient.wsSendMessage('darkness', [self.darkness/100]);
				stcClient.wsSendMessage('set_updatable_floor', [self.dynamic]);
				stcClient.wsSendMessage('toggle_selection', [self.select])
				stcClient.wsSendMessage('wiggle', [self.wiggle]);
				self.setWiggle();
				stcClient.wsSendMessage('set_back_color', [[1,1,1,1]])
				stcClient.wsSendMessage('select_semantic', [self.filtering.semantic.indexOf(self.semantic)])
				
				const all_codes = self.data.map(d => d.pcode)
				stcClient.wsSendMessage('show_trajectories', [self.displayed_codes]);
				stcClient.wsSendMessage('hide_trajectories', [all_codes.filter(d => !self.displayed_codes.includes(d))]);
				
				stcClient.wsSendMessage('unselect_all_trajects')
				
				self.setTimeAxis();
				self.setLegend();
				self.setInfo();
				self.setHeader();
			}else{
				if (self.fullscreen) stcClient.wsSendMessage('resize', [self.width, self.height]);
			}
			
			stcClient.wsSendMessage('image', ['high']);
			stcClient.wsSendMessage('dates')
		})
	}
	
	setHeader(){
		const self = this;
				
		const header = d3.select('div.header');
		header.selectAll('div.dropdown').each(function(d) {
			if (!this.id.includes('datasets')) d3.select(this).remove()
		})
		
		//------------------------------------------
		// STC lists
		
		const min = self.filtering.age[0],
			max = self.filtering.age[1],
			average = (self.filtering.age[0] + self.filtering.age[1])/2;
		
		let data =[{'value': 'customize','type': 'dropdown',
			'children': [
				{'type': 'checkbox', 'value': 'wiggle', 'checked': self.wiggle},
				{'type': 'checkbox', 'value': 'dynamic_floor', 'checked': self.dynamic},
//				{'type': 'checkbox', 'value': 'density', 'checked': self.density},
				{'type': 'checkbox', 'value': 'details', 'checked': self.details},
				{'type': 'checkbox', 'value': 'translate', 'checked': self.translate},
				{'type': 'group_checkbox', 'value': 'semantic', 'data': self.filtering.semantic},
				{'type': 'range', 'value': 'darkness', 'min': 0, 'max': 100, 'selected': self.darkness, 'unit': '%'},
//				{'type': 'range', 'value': 'traj_width', 'min': 0, 'max': 100, 'value': self.traj_width, 'unit': '%'},
				{'type': 'button', 'value': 'reload_data'},
				{'type': 'button', 'value': 'reset'},
				{'type': 'button', 'value': 'download'}
			]},
			{'value': 'selection', 'type': 'dropdown',
				'children': [
					{'type': 'checkbox', 'value': 'select', 'checked': self.select},
					{'type': 'checkbox', 'value': 'multiple', 'checked': self.multiple},
					{'type': 'button', 'value': 'unselectall'}
				]},
			{'value': 'filtering','type': 'dropdown',
			'children': [
//				{'type': 'group_range', 'value': 'age', 'min': self.displayed.age[0], 'max': self.displayed.age[1],
//					'data': [
//						{'value': 'age-a', 'selected': self.displayed.age[0], 'min': min, 'max': average},
//						{'value': 'age-b', 'selected': self.displayed.age[1], 'min': average + 1, 'max': max}
//					]},
				{'type': 'group_checkbox', 'value': 'sex', 'data': self.filtering.sex},
				{'value': 'other', 'type': 'group_dropdown', 'children': [
					{'data': self.filtering.occupation, 'value': 'occupation'},
					{'data': self.filtering.age, 'value': 'age'},
					{'data': self.filtering.typology, 'value': 'typology'},
					{'data': self.filtering.criterion, 'value': 'criterion'}
				]},
				{'type': 'group_button', 'children': [
					{'value': 'show_all'},
					{'value': 'hide_all'},
					{'value': 'ok'}
				]}
			]}
		] 
		
		const dropdowns = header.selectAll('div.dropdown_') // dropdown_ so it does not delete the ones created in menu.js
			.data(data)
			.enter()
				.append('div')
				.classed('dropdown', true)
				.style('left', '20px')
				.style('display', 'inline')
				.attr('id', d => d.value + '-dropdown')
		
		const ddbtn = dropdowns.append('button')
			.classed("btn btn-default dropdown-toggle", true)
			.on("click", function(d){
				openDropdown(this)
				
				let sibling = this.parentNode.parentNode.firstChild;
				while(sibling){
					if (sibling.className == 'dropdown' && sibling !== this.parentNode)
						d3.select(sibling).selectAll('ul.dropdown-menu').style('display', 'none')
					sibling = sibling.nextSibling;
				}	
			})
			.text(getLabel)
			.styles({
				'background-color': 'black',
				'color': 'white',
				'height': '50px',
				'border-color': 'black'
			})
				
			
		ddbtn.filter(d => d.type == 'dropdown')
			.append('span')
			.classed('caret', true)
			.style('margin-left', '10px')
			
		let ddmenu = dropdowns.filter(d => d.type == 'dropdown')
			.append('ul')
			.classed('dropdown-menu', true)
			.style('min-width', d => d.value == 'selection' ? '250px' : '420px')
			.style('top', '35px')
			
		let table = ddmenu.append('table')
			.attr('id', d => d.value + '-table')
		
		let table_tr = table.append('g')
			.selectAll('tr')
			.data(d => d.children)
			.enter()
				.append('tr')
				.style('height', '45px')
				.style('top', '10px')
		
		// add the labels
		table_tr.append('td')
			.text(d => d.value == 'other' ? '' : getLabel(d))
			.style('min-width', d => d.type.split('_')[0] == 'group' ? '50px' : '140px')
			.style('position', 'relative')
			.style('left', '10px')
		
		// set the click function to each button
		table_tr.filter(d => d.type == 'button')
			.style('cursor', 'pointer')
			.on('click', function(d){
				d3.selectAll('ul.dropdown-menu').style('display', 'none')
				switch(d.value){
				case 'reload_data':
					self.reloadData()
					stcClient.wsSendMessage('image', ['high'])
					break;
				case 'reset':
					stcClient.wsSendMessage('reset_position');
					stcClient.wsSendMessage('reset_cube_height');
					stcClient.wsSendMessage('reset_zoom');
					
					//self.updateSelection('recover')
					break;
				case 'download':
					const imageName = menu.dataset + '-stc-' + (self.semantic == 'both' ? 'modes-activity' : self.semantic) + '.png';
					
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
								'window': 'cont_1',
								'client': client.getUsername(),
								'image_name': extension == 'png' ? value : value + '.png'
							  }
							  
							  menu.saveToPNG(attrs);
						  }
						  return !value && warningMessage
					  }
					})
					break;
				case 'unselectall':
					stcClient.wsSendMessage('unselect_all_trajects')
					break;
				}
			})

			
		// ----------------------------------------------------------------
		// Add the checkboxes
			
		table_tr.filter(d => d.type == 'checkbox')
			.append('td')
			.append('input')
			.attr('type', 'checkbox')
			.classed('custom-control-input', true)
			.attr('id', 'wiggle_checkbox')
			.style('margin-left', '30px')
			.on('change', function(d){
				switch(d.value){
				case 'wiggle':
					self.wiggle = this.checked;
			        stcClient.wsSendMessage('wiggle', [self.wiggle]); 
			        sessionStorage.setItem(self.id+'-wiggle', self.wiggle)
			        self.setWiggle();
					break;
				case 'dynamic_floor':
					self.dynamic = this.checked;
					sessionStorage.setItem(self.id+'-dynamic-floor', self.dynamic)
					stcClient.wsSendMessage('set_updatable_floor', [self.dynamic]);
					break;
				case 'select': // enable and disable trajectory selection
					self.select = this.checked;
					sessionStorage.setItem(self.id+'-select-trajectories', self.select)
					stcClient.wsSendMessage('toggle_selection', [self.select])
					break;
				case 'multiple': // enable and disable the selection of multiple trajectories
					self.multiple = this.checked;
					sessionStorage.setItem(self.id+'-select-multiple', self.multiple)
					break;
				case 'density': // enable and disable the representation of trajectories through density
					self.density = this.checked;
					sessionStorage.setItem(self.id+'-density', self.density)
					stcClient.wsSendMessage('toggle_density', [self.density])
					
					self.recover = true;
					stcClient.wsSendMessage('unselect_all_trajects') // unselect all trajectories to be able to re-select them
					break;
				case 'details':
					self.details = this.checked;
					sessionStorage.setItem(self.id+'-details', self.details)
					d3.select('div#class-info').style('display', self.details ? 'block' : 'none')
					
					self.saveToHistory({'code': 'modify', 'item': 'details', 'value': self.details})
					
					break;
				case 'translate':
					self.translate = this.value;
					sessionStorage.setItem('translate-'+self.id, self.translate);
					break;
				}
				
				d3.select('div#view-dropdown').selectAll('ul.dropdown-menu').style('display', 'none');
	        })
	        .property('checked', d => d.checked)
	        .style('transform', 'scale(1.7)')
	        
	    // -------------------------------------------
	    // add the ranges
		
	    let range = table_tr.filter(d => d.type == 'range')
	    
	    range.selectAll('td').style('top', '20px')
	    
	    range.append('text')
			.text(d => d.min + d.unit)
			.style('position', 'relative')
			.style('margin-left', '25px')
			.style('top', '20px')
		
		range.append('g')
			.style('position', 'relative')
			.style('left', '50px')
			.style('top', '0px')
			.append('input')
			.attrs(d => {
				return {
					'type': 'range',
					'min': d.min,
					'max': d.max,
					'value': d.selected,
					'class': 'slider',
					'step': 5
				}
			})
			.style('width', '150px')
			.on('input', function(d) {
				switch(d.value){
				case 'darkness':
					self.darkness = this.value;
				    stcClient.wsSendMessage('darkness', [self.darkness/100]);			
				    sessionStorage.setItem(self.id+'-floor-darkness', self.darkness);
				    break;
				case 'traj_width':
					self.traj_width = this.value;
					stcClient.wsSendMessage('set_trajects_width')
					sessionStorage.setItem(self.id+'-trajects-width', self.traj_width);
					break;
				}
				stcClient.wsSendMessage('image', ['high'])
				
			}) // modify if there is more than one range
		
		range.append('text')
			.text(d => d.max + d.unit)
			.style('position', 'relative')
			.style('margin-left', '205px')
			.style('top', '-20px')
	    
		// ------------------------------------------------------------------
		// add the group of ranges
		
		let group_range = table_tr.filter(d => d.type == 'group_range')
		
		group_range.selectAll('td').style('top', '10px')
		
		group_range = group_range
			.append('g')
			.attr('id', d => d.value + '-group')
			
		group_range.append('text')
			.style('margin-left', '27%')
			.style('text-anchor', 'middle')
			.attr('id', d => d.value + '-text')
			.text(d => d.min+' - '+d.max)
			
		range = group_range.append('td')
			.style('position', 'relative')
			.style('left', '30px')
			.style('top', '-5px')
			.style('width', '50%')
			.style('display', 'flex')
			
		range.selectAll('input')
			.data(d => d.data)
			.enter()
				.append('input')
				.styles({
					'min-width': '0', 
					'margin': '0',
					'padding': '0',
					'flex': '1 0 0'
				})
				.attrs(d => {
					return {
						'type': 'range',
						'max': d.max,
						'min': d.min,
						'value': d.value,
						'class': 'slider',
						'step': 1,
						'id': d.value
					}
				}).on('input', updateInputAge)
		
		
		// --------------------------------------------------------
		// add group of checkboxes
				
		let group_check = table_tr.filter(d => d.type == 'group_checkbox')
			.append('g')
			.style('margin-left', '20px')
			.attr('id', d => d.value + '-group')
			
		let check = group_check.selectAll('g')
			.data(d => d.data)
			.enter()
				.append('g')
		
		check.append('input')
			.attr('type', d => self.filtering.semantic.includes(d) ? 'radio' : 'checkbox')
			.classed('custom-control-input', true)
			.style('margin', '10px 10px')
			.property('checked', function(d){
				let key = d3.select(this.parentNode.parentNode).datum().value;
				if (key == 'semantic') return d == self.semantic;
				return self.displayed[key].includes(d)
			})
			.style('transform', 'scale(1.7)')
			.on('click', function(d,i){
				if (!self.filtering.semantic.includes(d)) return;
				
				d3.select('div#view-dropdown').selectAll('ul.dropdown-menu').style('display', 'none');
				
				self.semantic = d;
				sessionStorage.setItem(self.id+'-semantic', d)
				
				stcClient.wsSendMessage('select_semantic', [i])
				
				d3.select(this.parentNode.parentNode).selectAll('input')
					.property('checked', e => e == d)
					
				self.setLegend()
				self.recover = true;
				stcClient.wsSendMessage('unselect_all_trajects') // unselect all trajectories to be able to re-select them
				
				self.saveToHistory({'code': 'modify', 'item': 'semantic', 'value': d})
			})
		
		check.append('text')
			.text(getLabel)
			.style('margin', '0  0 10px')
				
		
		//---------------------------------------------------------
		// append group of dropdowns
			
		let dropdown_group = table_tr.filter(d => d.type == 'group_dropdown')
			.append('g')
			.attr('id', d => d.value + '-group')

		let dropdown = dropdown_group.selectAll('div.dropdown')
			.data(d => d.children)
			.enter()
				.append('div')
				.classed('dropdown', true)
				.style('width', '250px')
//				.style('display', 'inline')
//				.style('left', (d,i) => (130 * i) + 20 + 'px')
				.style('left', '-30px')
				.style('position', 'relative')
	
		dropdown.append('button')
			.classed("btn btn-default dropdown-toggle", true)
			.on("click", openDropdown)
			.style('width', '100%')
			.style('margin-top', '10px')
			.text(getLabel)
			.append('span')
			.classed('caret', true)
			.style('float', 'right')
			.style('margin-right', '5px')
			.style('margin-top', '10px')
		
		ddmenu = dropdown.append('ul')
			.classed('dropdown-menu', true)
			.style('overflow-y', 'auto')
			.style('width', '100%')
		
		let ddlist = ddmenu.selectAll('li')
			.data(d => d.data)
			.enter()
				.append('li')	
				.style('display', 'flex')
				.style('margin-bottom', '7px')
				.style('margin-top', '5px')
		
		ddlist.append('input')
			.attr('type', 'checkbox')
			.classed('custom-control-input', true)
			.style('margin', '3px 10px')
			.property('checked', function(d){
				let key = d3.select(this.parentNode.parentNode).datum().value;
				return self.displayed[key].includes(d)
			})
			.style('transform', 'scale(1.7)')
			
		ddlist.append('a')
			.attr('href', '#')
			.attr('tabindex', '-1')
			.style('padding', '0')
			.text(getLabel)
			
		//--------------------------------------------------------------
		// append group of buttons
			
		let button_group = table_tr.filter(d => d.type == 'group_button')
			.append('g')
			
		button_group.selectAll('button')
			.data(d => d.children)
			.enter()
				.append('button')
				.classed("btn btn-default dropdown-toggle", true)
				.style('margin-top', '10px')
				.style('left', (d,i) => (130 * i) + 20 + 'px')
				.style('position', 'absolute')
				.style('width', '120px')
				.text(getLabel)
				.on('click', function(d){
					d3.selectAll('ul.dropdown-menu').style('display', 'none')
					
					self.displayed = {'occupation': [], 'typology': [], 'age': [], 'sex': [], 'criterion': []};
					if (d.value == 'ok'){
						
						let group = table.select('g#age-group');			
//						
//						const age = group.selectAll('text#age-text').node().innerText.split('-');
//						self.displayed.age = [parseInt(age[0]), parseInt(age[1])];
						
						
						// sex checkboxes
						group = table.select('g#sex-group').selectAll('g')
						
						group.selectAll('input').nodes().forEach(function(n){
							if (n.checked){
								self.displayed.sex.push(d3.select(n).datum())
							}
						})
						
						// dropdowns
						
						group = table.select('g#other-group').selectAll('div.dropdown').selectAll('ul.dropdown-menu').selectAll('li')
						
						group.selectAll('input').nodes().forEach(function(n){
							if (n.checked){
								let key = d3.select(n.parentNode.parentNode.previousSibling).datum().value;
								let value = d3.select(n).datum();
								self.displayed[key].push(value)
							}
						})
						
					}else{
						if (d.value == 'show_all'){
							const codes = self.data.map(d => d.pcode)
							if (codes.length == self.displayed_codes.length) return;
							self.displayed = JSON.parse(JSON.stringify(self.filtering));
						}else if (self.displayed_codes.length == 0) return;
						
						table.select('g#age-group').selectAll('input#age-a').attr('value', self.filtering.age[0])
						table.select('g#age-group').selectAll('input#age-b').attr('value', self.filtering.age[1])
						
						// sex checkboxes
						table.select('g#sex-group')
							.selectAll('g')
							.selectAll('input')
							.property('checked', d.value == 'show_all')
						
						// dropdowns
						table.select('g#other-group')
							.selectAll('div.dropdown')
							.selectAll('ul.dropdown-menu')
							.selectAll('li')
							.selectAll('input')
							.property('checked', d.value == 'show_all')
						
					}
						
					
					sessionStorage.setItem(self.id+'-selected-trajs', JSON.stringify(self.displayed))
					self.filter()
				})
				
				
		//---------------------------------------------------------------------		
		// methods
			
		function updateInputAge(){
			let pivot = null;
			const group = d3.select(this.parentNode.parentNode);
			
			const a = group.select('input#age-a').node(),
				b = group.select('input#age-b').node();
			
			if (this === a){
				if (a.valueAsNumber >= Number(a.max)) {
					pivot = Math.min(max - 1, Number(a.max) + 1);
				}
			}
			
			if (this === b){
				if (b.valueAsNumber <= Number(b.min)) {
				    pivot = Math.max(min, Number(b.min) - 2);
			    }
			}

			if (pivot){
				a.max = pivot;
				b.min = pivot + 1;
			}
			
			group.select('text#age-text').text(a.value+' - '+b.value)
			
			a.style.flexGrow = Number(a.max) - Number(a.min) + 1;
			b.style.flexGrow = Number(b.max) - Number(b.min) + 1;
		}
	}
	
	filter() {
		const self = this;
		
		const hide = [], show = [];
			
		const age_ranges = self.displayed.age.map(a => {
			let age = a.split('-');
			return d3.range(age.length > 1 ? +age[0] : 65, age.length > 1 ? +age[1] + 1 : 100)
		})
		
		self.data.forEach((d,i) => {
			const valid_age = age_ranges.some(a => a.includes(+d.age))
			if (self.displayed.occupation.includes(d['work status']) && 
					self.displayed.sex.includes(d.gender) && 
					self.displayed.typology.includes(d.class) && 
					self.displayed.criterion.includes(d.criterion) && valid_age)
				show.push(d.pcode);
			else hide.push(d.pcode)
		})
		
		self.recover = true;
		stcClient.wsSendMessage('show_trajectories', [show]);
		stcClient.wsSendMessage('hide_trajectories', [hide]);
		
		stcClient.wsSendMessage('unselect_all_trajects')
		
		self.saveToHistory({'code': 'modify', 'item': 'filtering', 'value': null})
		
	}
	
	setLegend(){
		const self = this;

		const legendwidth = 180,
			en = menu.language == 'en';
		
		
		self.div.selectAll('div').each(function(d) {
			if (this.id.includes('legend')) d3.select(this).remove()
		})
		
		self.div.append('div')
			.classed('stc-info', true)
			.styles({
				'top': '20px',
				'line-height': '20px',
				'padding': '5px',
				'width': legendwidth + 'px',
				'left': '40px'
			})
			.append('text')
			.text(self.displayed_codes.length.toLocaleString(menu.language) + (en ? ' trajectories' : ' trajectoires'))
			.attr('id', self.id+'-trajs-number')
		
		let top = 60;
		if (self.semantic == 'both'){
			top = load('activity')
			load('modes')
		} else load(self.semantic)
			
		function load(status){
			let data = [];
			Object.keys(colorPalettes[status]).forEach(d => {
				if (d == 'none') return;
				data.push({
					'name': d,
					'color': colorPalettes[status][d]
				})
			})
			
			const legendheight = data.length * 28;
			
			const div = self.div
				.append('div')	
				.classed('stc-info', true)
				.styles({
					'top': top + 'px',
					'left': '40px'
				})
				.attr('id', status+'-legend')
			
			const svg = div.append('svg')
				.styles({
					'position': 'relative'
				})
				.attr("preserveAspectRatio", "xMinYMin meet")
				.attr("viewBox", function() { 
			  		return "0 0 " + legendwidth + " " + legendheight; 
			  	})
				.attrs({
					'width': legendwidth+'px',
					'height': legendheight+'px'
				})
				
			svg.append('text')
				.style('fill', '#000')
				.style('font-weight', 'bold')
				.attr('transform', transformString('translate', 10, 20))
				.text(labels[status][menu.language])
				
				
			const rectSize = 15;
			
			const group = svg.selectAll('g')
				.data(data)
				.enter()
					.append('g')
					.attr('transform', (d, i) => { return transformString('translate', 10, 30 + (rectSize + 8)*i); } )
					
			group.append('rect')
				.attr('width', rectSize+'px')
				.attr('height', rectSize+'px')
				.style('fill', d => d.color)
			
			group.append('text')
				.style('fill', '#000')
				.attr('transform', d => transformString('translate', 0, rectSize - 4))
				.text(d => getLabel(d.name))
				.style('font-size', '13.5px')
				.call(wrap, legendwidth, rectSize + 5)
				
			return top + legendheight;
		} 
			
	}
	
	updateDisplayedTrajs(res){
		const valid = res.filter(d => d.answer != 'unknown trajectory')
		this.displayed_codes = valid.map(d => d.name) 
		sessionStorage.setItem(this.id+'-displayed-codes', JSON.stringify(this.displayed_codes))	
		
		d3.select('text#'+this.id+'-trajs-number').text(this.displayed_codes.length.toLocaleString(menu.language)+' trajectories')
		this.setInfo()
	}
	
	
	
	//--------------------------------------------------------
	// Semantic Information on selected trajectory
	
	setInfo(){
		const self = this;
		const box = {width: 240, height: self.height}, 
			nbIndividuals = {},
			en = menu.language == 'en';
		
		d3.select('div#class-info').remove()
		
		const div = self.div.append('div')
			.classed('dragscroll stc-info', true)
			.styles({
				'right': '20px',
				'top': '20px',
				'padding': '5px',
				'height': box.height + 'px',
				'width': box.width + 'px',
				'overflow-y': 'auto',
				'overflow-x': 'hidden'
			}).attr('id', 'class-info')
		
		const svg = div.append('svg')
			.styles({
				'position': 'relative',
				'overflow-y': 'scroll',
				'overflow-x': 'hidden',
				'white-space': 'nowrap'
			})
		
		let group = svg.append('g')
			
		let classes = self.displayed['typology']
		let data = filterInfo()
		let top = 20;
		
		const nbInd = nbIndividuals.gender ? nbIndividuals.gender.toLocaleString(menu.language) : null;
		let text = group.append('text')
			.style('fill', '#000')
			.style('font-weight', 'bold')
			.style('font-size', '12px')
			.style('text-anchor', 'middle')
			.attr('transform', transformString('translate', box.width/2, top))
			.text(!nbInd ? (en ? 'There is no individuals to describe' : 'Aucun individu pour décrire') : 
				(en ? 'Description of ' + nbInd + ' individuals' : 'Déscription de ' + nbInd + ' individus'))
			.call(wrap, box.width-25, 0)
			
		top += text.node().childNodes.length * 20;
		
		if (nbIndividuals.gender){
			text = group.append('text')
				.style('fill', '#000')
				.style('font-weight', 'bold')
				.style('font-size', '12px')
				.style('text-anchor', 'middle')
				.attr('transform', transformString('translate', box.width/2, top))
				.text(classes.length == 6 ? (en ? 'All classes together' : 'Toutes les classes confondues') : 
					(classes.length > 1 ? 'Classes ' : labels['class'][menu.language] + ' ') + classes.map(d => d.substr(-1)).join(', '))
				.call(wrap, box.width, 0)
		
			top += text.node().childNodes.length * 20;
		}

		let priority = ['gender', 'age', 'socioprofessional groups', 'work status', 'work hours', 'work shift', 'freq']
		data = d3.nest()
			.key(d => d.aspect)
			.sortKeys((a,b) => priority.indexOf(a.includes('freq') ? 'freq' : a) - priority.indexOf(b.includes('freq') ? 'freq' : b))
			.entries(data); 
			
		const infoGroup = group.selectAll('g')
			.data(data)
			.enter()
				.append('g')
			
		const title = infoGroup.append('text')
			.text(d => d.key.includes('freq') ? (en ? 'Use frequence of ' : "Fréquence d'utilisation de ") + getLabel(d.key.replace('freq ','')) : getLabel(d.key))
			.style('font-size', '12px')
			.call(wrap, box.width-25, 2)
					
		const values = infoGroup.selectAll('text.values')
			.data(d => !['age'].includes(d.key) ? d.values.sort((a,b) => (b.total - a.total)) : d.values)
			.enter()
				.append('text')
				.style('font-size', '12px')
				.text(d => getLabel(d.description) + ': ' + Math.trunc(d.total).toLocaleString() + ' (' + (d.value * 100).toFixed(2) + '%)')
				.call(wrap, box.width-5, 2)
				
		title.attr('transform', function(d, i) {
			let sibling = this.previousSibling;
			let top = 0;
			while (sibling && sibling.nodeName == 'text'){
				top += sibling.childNodes.length * 15;
				sibling = sibling.previousSibling;
			}
			return transformString('translate', 0, top)
		}).style('font-weight', 'bold')	
		
		values.attr('transform', function(d,i) {
			let sibling = this.previousSibling;
			let top = 0;
			while (sibling && sibling.nodeName == 'text'){
				top += sibling.childNodes.length * 15;
				sibling = sibling.previousSibling;
			}
			return transformString('translate', 0, top)
			
		})
		
		if (classes.length < 6)
			values.style('fill', d => d.total > (d.mean + d.sd) ? 'red' : (d.total < Math.abs(d.mean - d.sd) ? 'blue' : 'black'))
		
		// position each group below the previous one according to the number of tspans
		infoGroup.attr('transform', function(d,i) { 
			const sibling = this.previousSibling;
			if (sibling && sibling.nodeName == 'g') {
				d3.select(sibling).selectAll('text').each(function(d){
					top += this.childNodes.length * 15;
				})
			}
			return transformString('translate', 5, top + 10)
		})
		
		svg.attrs(function(){
				const children = this.firstChild.childNodes;
				const lastChild = children[children.length-1];
				box.height = lastChild.getBoundingClientRect().top + lastChild.childNodes.length * 10;
				return {
					'height': box.height+'px',
					'viewBox': '0 0 ' + box.width + ' ' + box.height
				}
			})
		
		function filterInfo(){			
			
			const classData = self.info.filter(d => (classes.length == 6 ? d.class == 'none' : classes.includes(d.class)) 
				 && !d.description.includes('00') && d.description != 'none')
				 
			classData.forEach(d => {
				d.total = +d.total;
				d.value = +d.value;
				d.mean = +d.mean;
				d.sd = +d.sd;
			})
				 
			let keys = classData.map(d => d.aspect)
			keys = keys.filter((d,i) => { return keys.indexOf(d) == i; })
			
			let items = {};
			
			keys.forEach(key => {
				let aspect = classData.filter(d => d.aspect == key)
				nbIndividuals[key] = d3.sum(aspect, d => d.total)
				let description = aspect.map(d => d.description)
				items[key] = description.filter((d,i) => description.indexOf(d) == i) 
			})
			
			
			if (classes.length == 6) return classData;
			else {
				// the total is supposed to be always the same, by because I don't know yet what 0 on P9c and P9d means, so shift and hours have less people for now
				
				let data = []
				keys.forEach(key => {
					items[key].forEach(item => {
						let temp = classData.filter(d => d.aspect == key && d.description == item);
						let total = d3.sum(temp, d => d.total)
						let mean = d3.mean(temp, d => d.mean)
						let sd = d3.mean(temp, d => d.sd)
						data.push({
							'aspect': key,
							'description': item,
							'total' : total,
							'value' : total / nbIndividuals[key],
							'mean': mean,
							'sd': sd
						})
					})
				})
				return data;
			}
		}
		
		div.style('display', self.details ? 'block' : 'none')
			
	}
	
	updateSelection(attrs){
		const self = this;
		
		const text = self.div.select('text#traj-info'),
			box = {width: 160, height: 200},
			trajectory = null;
		
		switch(attrs.action){
		case 'unselect':
			self.selected = self.selected.filter(d => d != attrs.code);
			break;
		case 'select':
			if (!self.multiple){
				stcClient.wsSendMessage('unselect_trajects_by_name', [self.selected]); // unselect the trajectories currently selected
				self.selected = [];
			}
			self.selected.push(attrs.code);
			break;
		case 'unselectall': 
			if (self.recover){ // recover previously selected trajectories
				const select_codes = self.selected.filter(t => self.displayed_codes.includes(t));
		
				// verify whether the selected trajectories are still visible
				self.selected = self.selected.filter(d => select_codes.includes(d))
				sessionStorage.setItem(self.id+'-selected-trajectory', JSON.stringify(self.selected))
				
				if (select_codes.length > 0) {
					stcClient.wsSendMessage('select_trajects_by_name', [select_codes])
				}
				self.recover = false;
				
				client.wsSendMessage(createJSONMessage('update-trajs', {'action': 'recover', 'select_codes': select_codes}))
			}else
				self.selected = [];
			break;
		}
		
		sessionStorage.setItem(self.id+'-selected-trajectory', JSON.stringify(self.selected))
				
		const message = {'action': attrs.action, 'code': attrs.code, 'multiple': self.multiple}

		if (self.selected.length == 0){
			if (client.getRole() == 'controller'){
				stcClient.wsSendMessage('highlight_shapes', [[]])
				client.wsSendMessage(createJSONMessage('update-trajs', message))
			}
			return;
		}
			
		const locations = [];
		self.data.forEach(d => {
			if (self.selected.includes(d.pcode))
				d.location_codes.forEach(l => {
					if (!locations.includes(l) && l != 'none') locations.push(l)
				})
		})
		
		if (client.getRole() == 'controller'){		
			stcClient.wsSendMessage('highlight_shapes', [locations])
			if (attrs.action != 'unselectall') client.wsSendMessage(createJSONMessage('update-trajs', message))			
		}
	}
	
	// -------------------------------------------------------
	// Time Axis
	
	setTimeAxis(){
		//-----------------------------------------
		// hours marks for the time axis
		const self = this;
		
		let data = d3.range(4, 29)
		
		self.div.select('g#time-axis').remove()
		const group = self.div.append('g')
			.style('font-weight', 'bold')
			.attr('id', 'time-axis')
			
		const panels = group.selectAll('div')
			.data(data)
			.enter()
				.append('div')
				.classed('panel panel-default', true)
				.styles(d => {
					return {
						'z-index': 1,
						'bottom': 0,
						'position': 'absolute',
						'top': 0,
						'left': 0,
						'background-color': 'transparent',
						'border-color': 'transparent',
						'display': 'none'
					}
				})
				
		panels.append('text')
			.styles({
				'padding': 0
			})
			.text(d => formatHour(d, 'fr'))
			
	}
	
	updateTimeAxis(times){
		const self = this;

		if (!Array.isArray(times)) return;
		if (typeof self.image == 'undefined') {
			stcClient.wsSendMessage('dates');
			return;
		}
		times = [times[0], times[1]];
		
		const scale_x = self.width/self.image.width, // from the larger towards the smaller
			scale_y = self.height/self.image.height;
		
		times.forEach(t => {
			t.x *= scale_x;
			t.y *= scale_y;
		})

		const stepy = (times[1].y - times[0].y) / 24,
			stepx = (times[1].x - times[0].x) / 24;
		
		const positions = [{'x':times[0].x, 'y':times[0].y}]
		for (let i = 1; i < 25; i++){
			positions.push({
				'x' : positions[i-1].x + stepx, 
				'y' : positions[i-1].y + stepy
			})
		}
		
		self.div.selectAll('div.panel')
			.styles((d,i) => {
				const left = self.image.left + positions[i].x,
					top = self.height - self.image.top - positions[i].y;
				return {
					'left': left + 'px',
					'top': top + 'px',
					'height': '20px',
					'display': d % 2 != 0 || left < self.image.left || left > self.image.left + self.image.width || top < self.image.top - 50 || top >= self.image.top - (client.getRole() == 'controller' ? 0 : 100) + self.image.height ? 'none' : 'block'  
				}
			})
			
		function lerp(v0, v1, t) {
			return (1 - t) * v0 + t * v1;
		}
	}
	
	setWiggle(){
		if (this.wiggle) {
            this.interval_id = setInterval(function(){ stcClient.wsSendMessage('image', ['high']); }, 50);
        }
        else {
            clearInterval(this.interval_id);
        }
	}
	
	tileType() {
		//needs changing
	    const select = document.getElementById('tile_type_select');
	    stcClient.wsSendMessage('tile', [select.options[select.selectedIndex].value]);
	}
	
	loadImage(data){
		const self = this;
		var image = new Image();

        image.src = URL.createObjectURL(data);
       
        const canvasNode = self.canvas.node();
        image.onload = function() {
             
            var ctx = canvasNode.getContext("2d");
            self.image = {'top': 0, 'left': 0, 'height': image.height, 'width': image.width};
            ctx.drawImage(image,0,0, self.width, self.height);
            
            ctx.restore();
        }
        
	}
	
	addInteraction(){
		const self = this;
		
		const canvas = self.canvas.node();
		let moving = false;
		let mouse_move_pre_date = new Date();
		const max_messages_per_seconds = 22;
		
		
		function getPos(event, interaction) {
			const rect = self.canvas.node().getBoundingClientRect();
			
			const scale_x = self.image ? self.image.width/self.width : 1, // the smaller towards the larger
				scale_y = self.image ? self.image.height/self.height : 1;
			
			if (interaction == 'mouse')
			    return {
			        x: parseInt((event.clientX * scale_x) - rect.left),
			        y: parseInt((event.clientY * scale_y) - rect.top)
			    };
			// else return positions calculated according to touch
		    return {
				x: parseInt(event.changedTouches[0].clientX * scale_x - rect.left),
				y: parseInt(event.changedTouches[0].clientY * scale_y - rect.top)
			}
		}
		
		//--------------------------------------
		// mouse interaction

		canvas.addEventListener('mousemove', function(evt) {
			if (!moving) return;
			var d = Date.now();
		    if ((d - mouse_move_pre_date)/1000 > 1/max_messages_per_seconds) {
		    	var pos = getPos(evt, 'mouse');
			    stcClient.wsSendMessage('move', [pos.x, pos.y]);
		        mouse_move_pre_date = d;
		    }
		    
		}, false);

		canvas.addEventListener('mousedown', function(evt) {
		    evt.preventDefault();
		    evt.stopPropagation();
		    moving = true;
		    var pos = getPos(evt, 'mouse');
		    stcClient.wsSendMessage('click', [evt.button, 0, pos.x, pos.y]);
		}, false);

		canvas.addEventListener('mouseup', function(evt) {
		    evt.preventDefault();
		    evt.stopPropagation();
		    moving = false;
		    var pos = getPos(evt, 'mouse');
		    stcClient.wsSendMessage('click', [evt.button, 1, pos.x, pos.y]);
		}, false);

		canvas.addEventListener('contextmenu', function(evt) {
		    evt.preventDefault();
		}, false);

		canvas.addEventListener('wheel', function(evt) {
		    evt.preventDefault();
		    stcClient.wsSendMessage('wheel', [evt.deltaY]);
		}, false);
		
		canvas.addEventListener('dblclick', function (e) {
			e.preventDefault();
			stcClient.wsSendMessage('unselect_all_trajects')
		}, false);
		
		//--------------------------------------
		// touch interaction
		
		let	scaling = false;
		let lastZoom = 0,
			lastT1Pos = null,
			lastT2Pos = null;
		let lastTap = 0, timeout;
		
		const radToDeg = 180/Math.PI;
		const thresholdZoom = 150, // the difference between the angles (to know they are opposite)
			thresholdMov = 5; // the minimum distance to take action is 5 units
		
		canvas.addEventListener('touchstart', function(evt){
			evt.preventDefault();
			evt.stopPropagation();
			
			d3.selectAll('ul.dropdown-menu').style('display', 'none')
			if (evt.touches.length == 2) scaling = true;
			else{
				var pos = getPos(evt, 'touch', 0);
			    stcClient.wsSendMessage('click', [(self.translate ? 2 : 0), 0, pos.x, pos.y]);
			}
			
		}, false)

		canvas.addEventListener('touchend', function(evt) {
			evt.preventDefault();
			evt.stopPropagation();
			
		    let pos = getPos(evt, 'touch');
		    stcClient.wsSendMessage('click', [(self.translate ? 2 : 0), 1, pos.x, pos.y]);
		    scaling = false;
		    lastT1Pos = lastT2Pos = null;
		}, false)

		canvas.addEventListener('touchmove', function(evt) {
			evt.preventDefault();
		    evt.stopPropagation();
		    if (scaling){
		    	if (evt.changedTouches.length != 2) return;
		    	
		    	// get current position of each touch
		    	let nowT1Pos = {'x' : evt.changedTouches[0].clientX, 'y' : evt.changedTouches[0].clientY},
	    			nowT2Pos = {'x' : evt.changedTouches[1].clientX, 'y' : evt.changedTouches[1].clientY};
		    	
		    	if (!lastT1Pos || !lastT2Pos){
		    		lastT1Pos = nowT1Pos;
		    		lastT2Pos = nowT2Pos;
		    		return;
		    	}
		    	
		    	// get the distance between the first and last movement of each touch
		    	let t1dist = Math.hypot(nowT1Pos.x - lastT1Pos.x, nowT1Pos.y - lastT1Pos.y),
		    		t2dist = Math.hypot(nowT2Pos.x - lastT2Pos.x, nowT2Pos.y - lastT2Pos.y);
		    	
		    	if (t1dist < thresholdMov && t2dist < thresholdMov) return;
		    	
		    	lastT1Pos = nowT1Pos;
	    		lastT2Pos = nowT2Pos;
		    	
		    	if (scaling){
		    		let zoom = Math.hypot(nowT1Pos.x - nowT2Pos.x, nowT1Pos.y - nowT2Pos.y);
			    	stcClient.wsSendMessage('wheel', [Math.sign(lastZoom - zoom) * 1]);
			    	lastZoom = zoom;
		    	}
		    }
		    else{
		    	var d = Date.now();
		    	
			    if ((d - mouse_move_pre_date)/1000 > 1/max_messages_per_seconds) {
			    	let currentPos = {'x' : evt.changedTouches[0].clientX, 'y' : evt.changedTouches[0].clientY};
			    	
			    	if (!lastT1Pos){
			    		lastT1Pos = currentPos;
			    		return;
			    	}
			    	
			    	let distance = Math.sqrt(Math.pow(lastT1Pos.x-currentPos.x, 2) + Math.pow(lastT1Pos.y-currentPos.y, 2))
			    	
			    	if (distance > 1.5){
			    		let pos = getPos(evt, 'touch');
					    stcClient.wsSendMessage('move', [pos.x, pos.y]);
			    	}
			    	lastT1Pos = currentPos;
			    	
			        mouse_move_pre_date = d;
			    }
		    }		    
		}, false);
			
	}
}
