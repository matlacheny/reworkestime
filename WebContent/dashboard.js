/*
 * Manages the views
 */

class Dashboard{
	constructor(){
		this.views = null;
	}
	
	//--------------------------------------------------
	// setters and getters
	getViews(){
		return this.views();
	}
	
	//--------------------------------------------------
	// visual 
	
	fullscreen(attrs){	
		const self = this;
	
		const view = self.views[attrs.depiction].filter(d => { 
			return d.client == client.getUsername() && d.window == attrs.window;
		})[0];
		const element = menu.elements[menu.getKey(client.getUsername(), attrs.window)]
		
		const windowID = attrs.window.substr(-1);
		if (element.customize == 'fullscreen' && client.getRole() != 'controller'){
			for (let i = 1; i <= 4; i++){
				d3.select('div#window'+i)
					.styles({
						'display': windowID != i ? 'none' : 'table-row',
						'width': windowID == i ? '90vw' : '44.7vw',
						'height': windowID == i ? '100vh': '47vh'
					})
			}
		}else self.resetWindows();
		
		view.updateAttrs({
			'fullscreen': element.customize == 'fullscreen',
			'width': element.customize == 'fullscreen' ? Math.floor(window.innerWidth * 0.9) : Math.floor(window.innerWidth * 0.447),
			'height': element.customize == 'fullscreen' ? Math.floor(window.innerHeight) : Math.floor(window.innerHeight * 0.47)
		})
	}
	
	resetWindows(){
		d3.selectAll('div.window')
			.styles({
				'display': 'table-row',
				'width': '44.5vw',
				'height': '47vh'
			})
	}
	
	setControllerWindow(){
		const height = window.innerHeight - 130;
		const div = d3.select('div#window1')
			.styles({
				'width': '100vw',
				'height': '100vh',
				'display': 'table-row',
				'margin': '0px'
			});
		
		['window2, window3', 'window4'].forEach(d => d3.select('div#'+d).remove())
	}
	
	loadInteractiveSpace(){
		this.setControllerWindow()
		
		const div = d3.select('div#window1')
		
		if (this.views.stc.length > 0) this.views.stc[0].clear()
		if (this.views.map.length > 0) this.views.map[0].clear()
		
		this.views.map = [];
		this.views.stc = [];
		
		const partition = menu.partition;
		
		const id = menu.view == 'map' ? menu.dataset + '-' + partition + "_interactive_map" : 'interactive_stc';
		
		let view = null;
		if (menu.view == 'map'){
		
			view = new Map();
			view.set({
				'div': div,
				'partition': partition,
				'indicator': 'interactive_map',
				'id': id,
				'client': client.getUsername(),
				'window': 'cont_1'
			});
			this.views.map.push(view);
		}else{
			view = new STC()
			
			view.set({
				'div': div,
				'id': id,
				'width': div.node().clientWidth,
				'height': div.node().clientHeight,
				'client': client.getUsername(),
				'window': 'cont_1',
				'selected': [],
			})	
			this.views.stc.push(view);
		}
	}

	
	/*
	 * load initial dashboards containing 4 blank windows
	 */
	load(elements){
		const self = this;

		if (!self.views) self.views = client.getRole() == 'controller' ? {
			'map': [],
			'stc': []
		} : {
				'map': [],
				'index': [],
				'stc': [],
				'clock': [],
				'chord-diagram': [],
				'stacked-view': []
		};
			
		let element = elements[menu.getKey(client.getUsername(), 'cont_1')]
		if (client.getRole() == 'controller'){
			if (!element || typeof element == 'undefined' || menu.view == 'stc'){
				self.loadInteractiveSpace();
			}else{
				self.clearSessionStorage({
					'partition': menu.getPartition(),
					'depiction': 'map',
					'indicator': 'interactive_map'
				})
				self.updateWindow(element);
			}
			menu.reload = false;
		}else{
			self.loadLegends()
			let fullAttrs = null;
			
			const display = new Promise(function(fulfill, reject){
				for (var i = 1; i <= 4; i++){
					var div = d3.selectAll('div#window'+i)
						.style('display', 'table-cell')
						.html(null);
					
					element = elements[menu.getKey(client.getUsername(), 'cont_'+i)]
					if (typeof element == 'undefined'){
						blankWindow(div);
					} else if (element.partition != menu.partition || element.dataset != menu.dataset) {
						blankWindow(div);
					} else {
						self.updateWindow(element);
						if (element.depiction == 'stc' && element.customize == 'fullscreen'){
							fullAttrs = { 'window': 'cont_'+i, 'depiction': element.depiction };
						} 
					}
				}
				fulfill()
			})
			
			
			display.then(function(){ //verify whether an element is set for fullscreen
				if(fullAttrs){
					self.fullscreen(fullAttrs);
				}
				menu.reload = false;
			})

		}
		
		function blankWindow(div){
			var height = d3.select('div.dashboard').node().clientHeight * .47;
			div.style('line-height', height + 'px')
			
			div.append('text')
				.classed('window-info-text', true)
				.text(self.getWindowText());
		}
	}

	updateWindow(element){
		const self = this;
					
		const id = element.window.split('_')[1];
		const div = d3.select('div#window'+id)
					.style('line-height', null)
					.html(null);
		
		if (client.getRole() == 'controller'){
			self.setControllerWindow()
		}
		
		var elem_id = element.dataset + '-' + element.partition + "-" + element.indicator + "-" + element.client + '-' + element.window;
		
		let period = sessionStorage.getItem('period');
		period = parseInt(period || element.period);
		
		let attrs = null;
		let view = null;
		switch(element.depiction){
		case "map":
			attrs = {
				"time": element.time,
				'div': div,
				'id': elem_id,
				'indicator': element.indicator,
				'period': period, 
				'category': element.category,
				'partition': element.partition,
				'rep': element.rep,
				'client': element.client,
				'window': element.window,
				'legend': element.customize.includes('legend'),
				'fzoom': element.fzoom,
				'ftime': element.ftime
			}
		
			view = new Map();
			break;
		case "clock":
			attrs = {
				'div': div,
				'id': elem_id,
				'indicator': element.indicator,
				'space': element.space,
				'sector': element.sectors,
				'children': element.children,
				'partition': element.partition,
				'time': element.time,
				'period': period,
				'client': element.client,
				'window': element.window,
				'details': element.customize.includes('details'),
				'ftime': element.ftime,
				'category': element.category
			}
			view = new Clock();
			break;
		case "chord-diagram":
			attrs = {
				'partition': element.partition, 
				'sectors': element.sectors,
				'time': element.time,
				'space': element.space,
				'id': elem_id,
				'indicator': element.indicator,
				'div': div,
				'category': element.category,
				'period': period,
				'client': element.client,
				'window': element.window,
				'details': element.customize.includes('details'),
				'ftime': element.ftime,
				'fspace': element.fspace
			}
			view = new FlowsView();
			break;
		case 'stacked-view':
			attrs = {
				'partition': element.partition,
				'sector': element.sectors,
				'id': elem_id,
				'indicator': element.indicator,
				'div': div,
				'time': element.time,
				'space': element.space,
				'period': period,
				'client': element.client,
				'window': element.window,
				'details': element.customize.includes('details'),
				'ftime': element.ftime,
				'category': element.category
			}
			view = new StackedArea()
			break;
		case 'stc':
			attrs = {
				'div': div,
				'id': elem_id,
				'client': element.client,
				'window': element.window,
				'width': div.node().clientWidth,
				'height': div.node().clientHeight,
				'fullscreen': element.customize.includes('fullscreen'),
				'details': element.customize.includes('details'),
				'selected': element.selected,
			}
			view = new STC()
		    break;
		case 'index':
			attrs = {
				'div': div,
				'id': elem_id,
				'period': period,
				'indicator': element.indicator,
				'category': element.category,
				'client': element.client,
				'window': element.window,
				'details': element.customize.includes('details'),
				'selected': element.selected
			}
			view = new IndexPlot();
			break;
		}
		
		//------------------------------------------------------------------------------
		// delete the previous view in this window before adding a new one to the array
		self.clearView(element).then(function(){
			view.set(attrs);

			self.views[element.depiction].push(view)

			if (client.getRole() == 'controller'){
				menu.view = 'map';
				sessionStorage.setItem('view', menu.view)
				d3.select('#switch-view').attr('xlink:href', 'images/cube.svg')
				const stc = self.views['stc'][0];
				if (stc) stc.clear();
				self.views['stc'] = [];
			}
		})
	}

	clearWindow(element){
		const self = this;
		
		var id = element.window.split('_')[1];
		var div = d3.select('div#window'+id).html(null);
		
		if (client.getRole() == 'controller'){
			self.loadInteractiveSpace();
			// no need to call 'clearView' because this is done while loading the interactive space for the controller
		}else{
			self.resetWindows();
			var height = div.node().clientHeight;
			div.style('line-height', height + 'px')
			
			div.append('text')
				.style('font-size', titleText)
				.text(self.getWindowText())
			
			// delete the view from the array
			self.clearView(element)
		}
				
		self.clearSessionStorage(element);
	}
	
	clearSessionStorage(element){
		var i = sessionStorage.length;
		while(i--) {
		  var key = sessionStorage.key(i);
		  if((key.includes(element.dataset) && (key.includes(element.client+'-'+element.window) || 
				  key.includes(element.dataset+'-'+element.partition+'_'+element.indicator))) || 
				  (element.depiction == 'stc' && key.includes('interactive_stc')))
			  sessionStorage.removeItem(key);
		}
	}
	
	//------------------------------------------------------------------------
	// Delete the corresponding view to the element given as argument
	clearView(element){
		const self = this;
		return new Promise(function(fulfill, reject){
			if (self.views) 
				Object.keys(self.views).forEach(key => {
					if (typeof self.views[key] == 'undefined') return;
					const index = self.views[key].findIndex(v => v.client == element.client && v.window == element.window)
					if (index >= 0){
						if (key == 'map') self.views[key][index].clear() // this is specially important for the maps, when the leaflet needs to be reseted
						self.views[key].splice(index, 1)
					}
				})
			fulfill()
		})
	}
	
	//--------------------------------------------------------------------
	// Load the legends for activities and modes of transport next to the view windows
	loadLegends(){
		const self = this;
		
		const div = d3.select('div.legend-body')
			.style('display', 'block')
			
		let node = div.node();
		while (node.firstChild) {
		    node.removeChild(node.firstChild);
		}
		
		const width = div.node().clientWidth,
			height = div.node().clientHeight,
			legend = {'top': 80, 'width': width * 0.9, 'height': 230, 'left': 10},
			rectSize = 15;
			
		const data = [{'value': 'activity', 'data': [], 'top': legend.top},
			{'value': 'modes', 'data': [], 'top': legend.top + legend.height},
			{'value': 'extra', 'data': [], 'top': legend.top + legend.height * 2}]
		
		data.forEach((d,i) => {
			colorPalettes[d.value+'-breaks'].forEach(b => {
				d.data.push({
					'value': b,
					'color': colorPalettes[d.value][b]
				})
			})
		})
		
		const svg = div.append('svg')
			.attrs({
				'preserveAspectRatio': 'xMidYMin meet',
				'viewBox': '0 0 ' + width + ' ' + height,
				'width': width,
				'height': height
			})
			
		svg.append('text')
			.attr('transform', transformString('translate', 5, 20))
			.style('font-size', normalText)
			.text(menu.language == 'en' ? 'Color palettes used in this dashboard.' : "Palettes de couleurs utilisées dans ce tableau de bord.")
			.call(wrap, legend.width, 0, false)
		
		let group = svg.selectAll('g')
			.data(data)
			.enter()
				.append('g')
				.styles({
					'box-shadow': '2px 2px 2px #ccc',
					'border-radius': '5px',
					'position': 'relative',
					'text-align': 'center'
				})
				.attrs((d,i) => {
					return {
						'x': 5,
						'y': d.top,
						'width': legend.width,
						'height': legend.height
					}
				})
		
		group.append('text')
			.style('text-anchor', 'middle')
			.style('font-size', normalText)
			.attr('x', legend.width/2)
			.attr('y', (d,i) => d.top + 20)
			.text(getLabel)
				
		group.append('line')
			.attrs((d,i) => {
				return {
					'x1': 10,
					'x2': legend.width,
					'y1': d.top,
					'y2': d.top
				}
			})
			.styles({
				'stroke': '#808080',
				'stroke-dasharray': '3'
			})
				
				
		group = group.selectAll('g')
			.data(d => d.data)
			.enter()
				.append('g')
					
		group.append('rect')
			.attr('width', rectSize+'px')
			.attr('height', rectSize+'px')
			.style('fill', d => d.color)
			.attr('x', 10)
			.attr('y', function(d,i) {
				let top = d3.select(this.parentNode.parentNode).datum().top;
				return top + 40 + (rectSize * 1.5 * i)
			})
		
		group.append('text')
			.style('fill', '#000')
			.attr('x', rectSize + 10)
			.attr('y', function(d,i) {
				let top = d3.select(this.parentNode.parentNode).datum().top;
				return top + rectSize + (rectSize * 1.5 * i) + (['public transport', 'personal business'].includes(d.value) && menu.language == 'fr'  ? 30 : 36)
			})
			.text(getLabel)
			.style('font-size', normalText)
			.call(wrap, legend.width - rectSize, rectSize * 2)
			
		d3.selectAll('div.window').selectAll('text.window-info-text').text(self.getWindowText())
	}
	
	getWindowText(){
		return menu.language == 'en' ? 'Select a view on the menu' : 'Selectionnez une vue sur le menu'
	}
	
	//------------------------------------------------------
	// update
	updatePeriod(value){
		const self = this;
		if (menu.view == 'stc' && client.getRole() == 'controller') return;
		
		Object.keys(self.views).forEach(key => {
			if (key == 'stc') return;
			self.views[key].forEach(v => {
				v.update(value.period);
			})
		})
		
		sessionStorage.setItem('period', value.period)
	}
	// it looks like I dont use this anymore
	updateElement(attrs){
		const self = this;
		
		self.views[attrs.element].forEach(v => {
			v.update(attrs);
		});
	}
}