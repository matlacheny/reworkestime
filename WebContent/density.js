/**
 * This file generates the map-based indicators
 */

class Map{
	constructor(){
		this.palette = []
		this.type = 'map';
	}
	
	resetZoom(){
		return client.getRole() == 'controller' ? 9.5 : 9.2;
	}
	
	recoverSession(){
		const zoom = sessionStorage.getItem(this.id+'map-zoom');
		const center = sessionStorage.getItem(this.id+'map-center');
		
		this.leaflet = {
			'zoom': zoom ? +zoom : this.resetZoom(),
			'center': center ? JSON.parse(center) : coords[menu.dataset]
		}
		
		let recover = sessionStorage.getItem('props'+this.id);
		this.leaflet.props = recover ? JSON.parse(recover) : null;
		
		recover = sessionStorage.getItem('period-'+this.id);
		this.period = recover ? +recover : this.period;
	}
	
	clear(){
		var self = this;
		
		if(self.leaflet && self.leaflet.map){
			self.leaflet.map.eachLayer(function(layer){
				self.leaflet.map.remove(layer);
			})
			self.leaflet.map = null;
		}
		self.div.classed('window', true);
	}
	
	updateAttrs(attrs){
		if (attrs.action == 'freeze'){
			if (attrs.dim == 'time')
				this.ftime = attrs.value;
			else
				this.fzoom = attrs.value;
			
			this.updateFreezeText()
		}
		else {
			// hide or show legend
			this.legend = attrs.value; // boolean with true for show and false for hide
			this.updateLegend();
		}	
	}
	
	update(value){
		var self = this;
		if (self.period == value || self.ftime) return;
		
		self.period = value;
		
		sessionStorage.setItem('period-'+self.id, self.period)
		
		if (self.indicator == 'interactive_map' || self.time == 'aggregate') return;
		
		if (self.rep == 'number') self.updateCircles();
		else self.updateStyle()
		self.updateTitle()
		self.updateInfo(null)
		
	}
	
	updateCircles(){
		const self = this;
		
		let index = this.time == 'aggregate' || this.indicator == 'interactive_map' ? 0 : this.period - 4;
		
		self.circles.eachLayer(function(layer){
			const props = layer.feature.properties;
			const color = props.fillColor[index];
			layer.setRadius(props.radius[index]);
			layer.setStyle({fillColor: color, color: d3.rgb(color).darker()})
			layer.bringToFront();
		})
	}

	// I think this method is no longer used
	updateWheels(){ //needs testing
		const self = this;
		
		const res = menu.getSectorCharts();
		self.mesh.features.forEach(d => {
			
			if (res.includes(d.properties.code))
				d.properties.selected = true;
			else d.properties.selected = false;
				
		})
		
	}

	updateStyle(background){
		const self = this;
		
		if (self.geojson)
			self.geojson.eachLayer(layer => layer.setStyle(style(layer.feature)))
		
		function style(feature) {
			let index = self.time == 'aggregate' || self.indicator == 'interactive_map' ? 0 : self.period - 4;
					
			let selected = self.leaflet.props && self.leaflet.props.code == feature.properties.code && !menu.waitingSector();
			return {
			    fillColor: self.rep == 'number' ? '#fff' : feature.properties.fillColor[index],
			    weight: selected ? 2 : 1,
			    opacity: 1,
			    color: '#000',
			    dashArray: selected ? '' : '2',
			    fillOpacity: self.rep == 'number' ? 0 : (menu.showBackground() ? 0.7 : 0)
			};
		}
	}
	
	updateTooltips(show){
		this.leaflet.markers.forEach(m => {
			m.setStyle({fillOpacity: show ? 1 : 0})
			m.getTooltip().setOpacity(show ? 1 : 0)
		})
	}
	
	updateLegend(){
		this.div.selectAll('div.legend').style('display', this.legend ? 'block' : 'none')
	}
	
	updateFreezeText(){
		const self = this,
			en = menu.language == 'en';
		
		let text = '';
		if (self.ftime && self.fzoom){
			text += en ? 'Time dimension and zoom are freezed.' : "La dimension temporelle et le zoom sont figés.";
		}else if (self.ftime){
			text += en ? 'Time dimension is freezed.' : 'La dimension temporelle est figée.';
		}else if (self.fzoom){
			text += en ? 'Zoom is freezed.' : 'Le zoom est figé.';
		}
		
		const svg = self.div.select('svg#info-control');
		const info = svg.select('text#freeze-info');
		
		if (info.empty()){
			svg.append('text')
				.attr('id', 'freeze-info')
				.text(text)
				.style('font-size', smallText)
				.style('fill', 'red')
				.style('text-anchor', 'end')
				.attr('x', svg.node().clientWidth - 10)
				.attr('y', 45)
		}else{
			info.text(text)
		}
	}
	
	updateTitle(){
		const self = this;
		
		const svg = self.div.select('svg#info-control'),
			en = menu.language == 'en',
			nb = self.rep == 'number';
		
		
		let data = [];
		let value = {'weight': 'normal', 'text': ''}
		switch(self.indicator){
		case 'fluctuation':
			value.text = en ? 'Estimated fluctuation ' + (nb ? '' : 'rate ') + 'of population' : (nb ? 'Taux de migration ' : 'Migration ') + 'estimée de la population';
			data.push(value)
			break;
		case 'presence':
			value.text = en ? 'Estimated ' + (nb ? 'number ' : 'proportion ') + 'of people present' : (nb ? 'Nombre ' : 'Proportion ') + 'estimée de personnes présentes';
			data.push(value)
			break;
		case 'density':
			value.text = en ? 'Estimated presence density' : 'Densité de présence estimée';
			data.push(value)
			break;
		case 'attractiveness':
			value.text = en ? 'Estimated attractiveness index' : "Indice d'attractivité estimé";
			data.push(value);
			break;
		}
		
		data.push({'text': en ? 'at district level' : 'par secteur', 'weight': 'normal'})
		
		if (self.time == 'aggregate') data.push({'text' : en ? ' over 24 hours' : ' sur 24 heures', 'weight': 'bold'})
		else {
			data.push({'text': en ? ' between' : ' entre', 'weight': 'normal'})
			data.push({'text': getTimeString(self.period), 'weight': 'bold'})
			data.push({'text': en ? 'and' : 'et', 'weight': 'normal'})
			data.push({'text': getTimeString(self.period + 1), 'weight': 'bold'})
		}
		
		if (self.category && self.indicator == 'presence'){
			data.push({'weight': 'normal', 'text': propositions[self.category][menu.language]})
			data.push({'weight': 'bold', 'text': labels[self.category][menu.language]})
		}
		
			
		let textDOM = svg.select('text#title')
		if (textDOM.empty()){
			textDOM = svg.append('text')
				.attr('id', 'title')
				.style('font-size', client.getRole() == 'controller' ? '14px' : normalText)
				.attr('transform', transformString('translate', 0, 15))
		}
		textDOM.selectAll('tspan').remove()
		textDOM.selectAll('tspan')
			.data(data)
			.enter()
			.append('tspan')
			.text(d => d.text + ' ')
			.style('font-weight', d => d.weight)
	}
	
	// -------------------------------
	// preparing environment
	
	// load data
	set(attrs){
		const self = this;
		
		self.time = attrs.time;
		self.div = attrs.div;
		self.id = attrs.id;
		self.indicator = attrs.indicator;
		self.period = attrs.period;
		self.category = attrs.category;
		self.partition = attrs.partition;
		self.rep = attrs.rep;
		self.client = attrs.client;
		self.window = attrs.window;
		self.ftime = attrs.ftime;
		self.fzoom = attrs.fzoom;
		self.legend = attrs.legend;
		
		const waitingText = self.div.append('text')
			.style('line-height', self.div.node().clientHeight + 'px')
			.text(labels['loading'][menu.language])
		
		const names = ['mesh'];
		const folder = menu.getDataDirectory();
		const q = d3.queue()
			.defer(d3.json, folder + self.partition+'_sectors.geojson')
		
		if (self.indicator != 'interactive_map'){
			names.push('data')
			names.push('centroids')
			q.defer(d3.csv, folder + 'presence.csv')
			q.defer(d3.json, folder + self.partition+'_centroids.geojson')
		}
		
		q.awaitAll(function(error, files) {
			if (error) throw error;

			files.forEach((f,i) => {
				
				if (names[i] == 'data') {
					
					let data = f.filter(d => (self.indicator == 'density' ? d.indicator == 'presence' : d.indicator == self.indicator) && d.partition == self.partition);
					data = data.filter(d => (self.time == 'aggregate' || self.indicator == 'attractiveness' ? d.start == 0 : d.start != 0) && d.space == 'individual')
					data = data.filter(d => d.class ? d.class == 0 : true)
					
					if (self.indicator == 'presence')
						data = data.filter(d => self.category ? d.status == self.category : d.status == 'general_activity')
					else if (self.indicator == 'density') 
						data = data.filter(d => d.status == 'general_activity')
						
					self[names[i]] = data;  
				} else self[names[i]] = f;
			})
		
			waitingText.remove();
			self.recoverSession();
			self.prepareData();
			self.loadMap();
		})
	}
	
	
	// prepare data
	prepareData(){
		const self = this;
		if (self.indicator != 'interactive_map'){
			
			let domain = ss.jenks(self.data.map(d => self.indicator == 'density' ? +d.density : +d.value), 7)
			const colors = self.category ? colorPalettes[self.category] : colorPalettes[self.indicator];
			let color = d3.scaleThreshold().domain(domain).range(colors)
			const extent = d3.extent(self.data, d => +d.value)
			
			switch(self.indicator){
			case 'fluctuation':
				if (extent[0] >= 0) color = d3.scaleThreshold().domain(domain).range(d3.schemeReds[8]) // if the lowest value is positive, makes the scale over red colors 
				else color = d3.scaleDiverging(t => d3.interpolateRdBu(1-t)).domain([extent[0], 0, extent[1]]) // otherwise, use the diverging color scale for negative and positive values
				// all values would probably never be lower than 0
				break;
			case 'attractiveness':
				color = d3.scaleDiverging(t => d3.interpolateBrBG(1 - t)).domain([extent[0], 1, extent[1]])
				break;
			}
			 
			self.palette = {'color': color}
		}
				
		function getValues(d){
			let data = self.data.filter(x => { return +x.code == d.properties.code; })
			
			const values = [],
				colors = [],
				radius = [];
			
			data.forEach((d,i) => {
				
				let index = self.time == 'aggregate' ? 0 : i;
				let value = self.indicator == 'density' ? +d.density : +d.value;
				let color = self.palette.color(value);
				
				let scale;
				if (self.rep == 'number'){
					value = +d.total;
					switch(self.indicator){
					case 'fluctuation':
						if (+d.total > 0) color = colorPalettes[self.indicator][7];
						else if (+d.total < 0) color = colorPalettes[self.indicator][0];
						else color = '#fff';
						scale = self.time == 'aggregate' ? 0.1 : 0.15;
						break;
					case 'presence':
						color = self.category ? colorPalettes['activity'][self.category] : colorPalettes[self.indicator][7];
						scale = self.category ? 0.05 : 0.01;
						break;
					}
				}
				
				radius.splice(index, 0, calcRadius(value, scale))
				colors.splice(index, 0, color);
				values.splice(index, 0, value);
			})
			return {'colors': colors, 'values': values, 'radius': radius};
		}	
		
		self.mesh.features.forEach(d => {
			const res = self.indicator == 'interactive_map' ? {'colors': ['#d4c2ac'], 'values': [0]} :  getValues(d);
			d.properties.fillColor = res.colors; 
			d.properties.values = res.values;
			d.properties.selected = false;
		})
						
		if (self.indicator != 'interactive_map'){
			self.centroids.features.forEach(d => {
				const res = getValues(d);
				d.properties.fillColor = res.colors; 
				d.properties.values = res.values;
				d.properties.radius = res.radius;
				d.properties.selected = false;
			})
			self.centroids.features.sort((a, b) => { return b.properties.values[12] - a.properties.values[12]; })
		}
		
		self.updateWheels(null)
	}
	
	getDistrictName(code) {
		let name = this.mesh.features.filter(f => f.properties.code == code);
		return name.length > 0 ? name[0].properties.name : null;
	}
	
	//---------------------------------------------
	// prepare legends
	setLegends(){
		const self = this;
		
		const values = self.data.map(d => +d.total);
		const posExtent = d3.extent(values.filter(d => d > 0))
		const negExtent = d3.extent(values.filter(d => d < 0))
		const en = menu.language == 'en';
		
		let features = null;
		let title;
		if (self.rep == 'number'){
			switch(self.indicator){
			case 'presence':
				features = {
					'classes': [[Math.round(posExtent[1]), 
						Math.round((posExtent[0]+posExtent[1])/2), 
						Math.round((posExtent[0]+posExtent[1])/3),
						Math.round((posExtent[0]+posExtent[1])/10)]],
						'scale': self.category ? 0.05 : 0.01
				}
				break;
			case 'fluctuation':
				features = {
					'classes': [[Math.round(posExtent[1]), 
							Math.round((posExtent[0]+posExtent[1])/2), 
							Math.round((posExtent[0]+posExtent[1])/3), 
							Math.round((posExtent[0]+posExtent[1])/10)],
							[Math.round(negExtent[0]), 
							Math.round((negExtent[0]+negExtent[1])/2), 
							Math.round((negExtent[0]+negExtent[1])/3), 
							Math.round((negExtent[0]+negExtent[1])/10)]],
					'scale': self.time == 'aggregate' ? 0.1 : 0.15
				}
				break;
			}
		}else{
			features = [];
			// create the information for the jenks legend
			const colors = self.category ? colorPalettes[self.category] : (self.indicator == 'fluctuation' ? d3.schemeReds[7] : colorPalettes[self.indicator]);
			let value, breaks;
			let extent = d3.extent(self.data, d => +d.value)
			// if time is disaggregate and the indicator is fluctuation then we can't use invertExtent because this function does not exist for scaleDiverging
			if (self.indicator == 'attractiveness' || (self.indicator == 'fluctuation' && extent[0] < 0)){
				let step = (extent[1]-extent[0])/7;
				breaks = d3.range(extent[0], extent[1] + step, step)			
			}else{
				breaks = ss.jenks(self.data.map(d => self.indicator == 'density' ? +d.density : +d.value), 7)
			}	
			
			for (let i = 1; i < breaks.length; i++) {
				
				value = (i == 1 ? '[' : '(')
				switch(self.indicator){
				case 'presence':
				case 'fluctuation':
					value += (breaks[i-1] * 100).toFixed(2) + ', ' + (breaks[i] * 100).toFixed(2);
					break;
				case 'density':
					value += Math.trunc(breaks[i-1]).toLocaleString(menu.language) + ', ' + Math.trunc(breaks[i]).toLocaleString(menu.language);
					break;
				case 'attractiveness':
					value += breaks[i-1].toFixed(2) + ', ' + breaks[i].toFixed(2);
					break;
				}
				
				value += ']';
				
				features.push({
					'color': self.palette.color(breaks[i]),
					'value': value
				})
			}
			
			if (['fluctuation'].includes(self.indicator)) features.reverse();
			
			title = '<b>';
			switch(self.indicator){
			case 'fluctuation':
				title += (en ? 'Fluctuation rate ' : 'Taux de migration ') + '(%)';
				break;
			case 'density':
				title += (en ? 'Presence density (persons ' : 'Densité de présence (personnes ') + ' / km<sup>2)';
				break;
			case 'attractiveness':
				title += en ? 'Attractiveness Index' : "Indice d'attractivité";
				break;
			case 'presence':
				title = (self.category ? (en ? 'People in activity' : 'Personnes en activité') : (en ? 'Present people' : 'Personnes présentes')) + ' (%)';
				break;
			}
			title += '</b>'
		}
	
		// -----------------------
		// Create the control that hold the legend
		const control = L.control({position: 'bottomleft'}); 
		control.onAdd = function (map) {
		    this._div = L.DomUtil.create('div', 'legend')
		    this.setContent();
		    return this._div;
		};
		
		control.setContent = function(){
			if (self.rep == 'number') loadCircleLegend(this)
			else{
				this._div.innerHTML = title + '<br>';
				features.forEach(d => {
					this._div.innerHTML +=
			            '<br><i style="background:' + d.color + '"></i> ' + d.value;
				}) 
				this._div.style.bottom = client.getRole() == 'controller' ? '130px' : '10px';
				this._div.style.fontSize = client.getRole() == 'controller' ? '12px' : normalText;
			}
		}
		
		control.addTo(self.leaflet.map)
		
		// -----------------------------------------------
		// Proportional Symbol Map legend
		
		function loadCircleLegend(_this){
			const largestRadius = calcRadius(d3.max(features.classes[0], d => Math.abs(d)), features.scale);
			
			let legendheight = largestRadius*2 + 50;
			legendheight = legendheight > 160 ? legendheight : 160;
			
			if (self.indicator == 'fluctutation')
				legendheight += 20;
			
			let legendwidth = largestRadius*4;
			legendwidth = legendwidth > 250 ? legendwidth : 250;  
			if (self.indicator == 'fluctuation')
				legendwidth = self.time == 'aggregate' ? legendwidth * 1.5 : legendwidth * 2;
			
			
			const legend = d3.select(_this._div)
				.style('position', 'relative')
				.style('width', legendwidth + 'px')
				.style('height', legendheight + 'px')
				.style('bottom', client.getRole() == 'controller' ? '130px' : 0)
				
			const svg = legend.append('svg')
				.attr('width', legendwidth)
				.attr('height', legendheight)
				
			svg.append('text')
				.text(en ? 'Number of people' : 'Nombre de personnes')
				.style('font-size', client.getRole() == 'controller' ? '12px' : normalText)
				.attr('transform', transformString('translate', 5, 15))
				.style('font-weight', 'bold')
			
			pushCircles(0)
			if (self.indicator == 'fluctuation' && typeof negExtent[0] != 'undefined') pushCircles(1)
			
			function pushCircles(pos){
				let top = 0;
				let left = self.indicator == 'fluctuation' && self.time == 'aggregate' ? legendwidth * 0.5 : legendwidth * 0.5;
				const circleGroup = svg.append('g')
					.attr('transform', transformString('translate', left * pos))
					
				if (self.indicator == 'fluctuation'){
					circleGroup.append('text')
						.attr('transform', transformString('translate', 20, 40))
						.text(pos == 0 ? (en ? 'Overpopulation' : 'Surpopulation') : (en ? 'Under-population' : 'Sous-population'))
						.style('font-size', client.getRole() == 'controller' ? '12px' : normalText)
						.style('fill', pos == 0 ? colorPalettes[self.indicator][7] : colorPalettes[self.indicator][0])
						.style('font-weight', 'bold')
					
					top = 15;
				}
				
				const circleX = self.indicator == 'fluctuation' ? legendwidth/3 : legendwidth/2,
						circleY = (self.indicator == 'fluctuation' ? legendheight - 20 : legendheight) + top - 15;
				
				circleGroup.selectAll('circle')
					.data(features.classes[pos])
					.enter()
						.append('circle')
						.attr('r', d => calcRadius(d, features.scale))
						.classed('legendCircle', true)
						.attr('cx', d => circleX)
						.attr('cy', d => circleY - calcRadius(d, features.scale))
				
				let highestText = calcRadius(d3.max(features.classes[pos], d => Math.abs(d)), features.scale) * 2,
					lineHeight = 25;
				
				let textTop = (self.indicator == 'fluctuation' ? legendheight - 10 : legendheight) + top - 100;
				circleGroup.selectAll('text.value')
					.data(features.classes[pos])
					.enter()
						.append('text')
						.style('text-anchor', 'start')
						.style('font-size', client.getRole() == 'controller' ? '12px' : normalText)
						.attr('transform', (d, i) => { 
							return transformString('translate', 20, textTop + (lineHeight * i)); 
						})
						.text(d => d.toLocaleString(menu.language))
						.style('display', d => d != 0 ? 'block': 'none')
			}
		}
		self.updateLegend();
	}
	
	loadMap(){
		const self = this;
		
		const width = self.div.node().clientWidth,
			height = self.div.node().clientHeight;
		
		self.leaflet.map = L.map(self.div.node(), { zoomControl: false, touchZoom: true, zoomDelta: 0.25, zoomSnap: 0, renderer: L.canvas() });
		self.leaflet.map.setView(self.leaflet.center, self.leaflet.zoom);
		
		const tiles = L.tileLayer(mapTiles, {
		    attribution: attribution,
		    maxZoom: 20
		}).addTo(self.leaflet.map)
		
		L.svg().addTo(self.leaflet.map);
		
		function onEachFeature(feature, layer) {
		    layer.on({
		        click: function(e) { 
		        	let waiting = menu.waitingSector();
		        	switch(waiting){
		        		case 'flows':
		        			if (menu.sectors.length == 10 && !menu.sectors.includes(e.target.feature.properties.code)){
		        				menu.toast({
		        					 type: 'error',
		        					 title: menu.language == 'en' ? 'You reached the maximum number of districts (10) allowed on this view.' :
		        						 "Vous avez atteint le nombre maximum de secteurs (10) autorisés pour cette vue."
		        				})
		        				return;
		        			}
		        			self.updateHighlight(e, 'flows')
		        			break;
		        		case 'clock':
		        			menu.sendSectorElement(e.target.feature.properties.code)
		        			break;
		        		default:
		        			highlightFeature(e)
		        	}
		        }
		    });
		}
		
		// the region shape
		self.geojson = L.geoJson(self.mesh, {
		    onEachFeature: onEachFeature
		}).addTo(self.leaflet.map);
		
		self.updateStyle()
		
		// add the sectors' names
		if (client.getRole() == 'controller'){
			self.leaflet.markers = [];
			self.geojson.eachLayer(function(layer){
				    const bounds = layer.getBounds();
				    const center = layer.getCenter();
					const marker = L.circleMarker(new L.LatLng(center.lat, center.lng), 
							{opacity: 0, fillOpacity: 1, fillColor: 'black', radius: 3, color: 'black', interactive: false}
					).bindTooltip(layer.feature.properties.name + ' (' + layer.feature.properties.code + ')', 
						  			{permanent: true, className: self.id + ' tooltip', direction: 'right', offset: [0,0]}
					).addTo(self.leaflet.map);
					
					self.leaflet.markers.push(marker)
			})
		}
		
		if (!menu.showLabels()) self.updateTooltips(false)
		
		if (self.indicator != 'interactive_map'){
			if (self.rep == 'number'){
				// the centroids of each sector
				self.circles = L.geoJson(self.centroids, {
					pointToLayer: function(feature, latlng) {
						return L.circleMarker(latlng, {
							weight: 1,
							fillOpacity: 0.5
						})
					},
					onEachFeature : onEachFeature
				}).addTo(self.leaflet.map)
				
				self.updateCircles()
			}
			
			self.info = L.control({position: 'topleft'});

			self.info.onAdd = function (map) {
			    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
			    d3.select(this._div)
			    	.styles({
			    		'top': client.getRole() == 'controller' ? '10px' : 0,
			    		'left': client.getRole() == 'controller' ? '30px' : 0,
			    		'height': '60px',
			    		'width': '680px'
			    	})
			    	.append('svg')
			    	.attrs({
			    		'viewBox': '0 0 680 60',
			    		'width': '680',
			    		'height': '60'
			    	})
			    	.attr('id', 'info-control')
			    return this._div;
			};

			self.info.addTo(self.leaflet.map);
			self.updateTitle();
		    self.updateInfo(null);
		    self.updateFreezeText();
			
		    self.setLegends();
		}
		
		L.control.scale()
			.setPosition('bottomright')
			.addTo(self.leaflet.map)
			
		if (client.getRole() == 'controller'){
			const reset = L.control({position: 'topleft'});
	
			reset.onAdd = function (map) {
			    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
			    
			    d3.select(this._div)
			    	.styles({
			    		'padding': '10px',
			    		'top': '10px',
			    		'left': '30px'
			    	})
			    this._div.innerHTML = menu.language == 'en' ? "Reset Zoom" : 'Réinitialiser le zoom';
			    this._div.addEventListener("click", this.set, false);
			    return this._div;
			};
			
			reset.set = function(){
				const center = coords[menu.dataset]
				self.leaflet.map.setView([center.lat, center.lng], self.resetZoom());
				
				saveMapView('reset')
			}
			reset.addTo(self.leaflet.map);
		}
		
		self.updateMapView({'zoom':0, 'center':{'lat':0, 'lng':0}, 'width': width});
		
		// update the dashboards
		function highlightFeature(e) {
			if (client.getRole() != 'controller') return;
			if (self.indicator == 'interactive_map') self.updateHighlight(e, 'info')
			else self.highlightFeature(e);
						
			var attrs = {
				'code': e.target.feature.properties.code
			}
			
			if (menu.exists(['map', 'chord-diagram'])){
				var msg = createJSONMessage("select-sector", attrs);
				client.wsSendMessage(msg);
			}
			
		}
		
		function saveMapView(action){
			if (client.getRole() != 'controller') return;
			var zoomLevel = self.leaflet.map.getZoom();
			var center = self.leaflet.map.getCenter();
			
			sessionStorage.setItem(self.id+'map-zoom', zoomLevel);
			sessionStorage.setItem(self.id+'map-center', JSON.stringify(center));
			
			var attrs = {
				'center': {
					'lat' : center.lat - self.leaflet.center.lat,
					'lng' : center.lng - self.leaflet.center.lng
				},
				'zoom': zoomLevel - self.leaflet.zoom,
				'width': width,
				'sender': client.getUsername(),
				'action': action
			}
			
			if (action != 'reset')
				self.updateMapView(attrs)
			
			if (!menu.exists('map')) return;
			
			var msg = createJSONMessage("update-mapview", attrs);
			client.wsSendMessage(msg);
			
			self.leaflet.zoom = zoomLevel;
			self.leaflet.center = center;
			
		}
		
		self.leaflet.map.on('zoomend', function(){ saveMapView('update'); });
		self.leaflet.map.on('dragend', function(){ saveMapView('update'); });
	}
	
	resetStyle(){
		this.geojson.eachLayer(layer => {
			layer.setStyle({
				weight: 1
			})
		})
	}
	
	
	highlightFeature(attrs){
		const self = this;
		if (self.indicator == 'interactive_map') return;
		
		if (client.getRole() == 'controller'){
			if (attrs.target) updateInfo(attrs.target);
		}else{
			if (self.geojson){
				self.geojson.eachLayer(function(layer){
					if (layer.feature.properties.code == attrs.code){
//						updateInfo(layer)
						if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
					        layer.bringToFront();
					    }
						self.updateInfo(layer.feature.properties);
					}
					
				});
			}
		}
		
		function updateInfo(layer){
			var weight = layer.options.weight;
		    
			if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
		        layer.bringToFront();
		    }

//			if (weight == 2) self.updateInfo(layer.feature.properties);
			self.updateInfo(layer.feature.properties);
			
			self.updateStyle();
		}
	}
	
	// for flows : props = e (the clicked layer from the geojson) and action = 'flows'
	// cancel selection : no arguments
	// to reuse selection : props = menu.sectors (an array of codes), action = 'flows'
	// to highlight information : props = e (clicked layer) and action = 'info'
	updateHighlight(){
		const self = this;
		const props = arguments.length > 0 ? (arguments[0].target ? arguments[0].target.feature.properties : arguments[0]) : self.leaflet.props;
		const targetCode = props && !Array.isArray(props) ? props.code : props;
		const action = arguments.length > 1 ? arguments[1] : null;
		
		let index = self.time == 'aggregate' || self.indicator == 'interactive_map' ? 0 : self.period - 4;
		
		self.geojson.eachLayer(function(layer){
			let weight = layer.options.weight;
			let layerCode = layer.feature.properties.code;
			let valid = Array.isArray(targetCode) ? targetCode.includes(layerCode) : targetCode == layerCode;
			let color = layer.feature.properties.fillColor[index];
			
			if (action == 'flows' && !valid) return;
			
			if (layerCode == targetCode && action != 'flows'){
				if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
			        layer.bringToFront();
			    }
			}
			
			if (action == 'flows') {
				if (Array.isArray(targetCode)) setColor(valid, layer, color)
				else {
					valid = valid && menu.sectors && !menu.sectors.includes(targetCode)
					
					setColor(valid, layer, color)
					menu.saveSector(targetCode)
				}
			} else {
				valid = valid && weight != 2;
				
				layer.setStyle({
					weight : valid ? 2 : 1,
					fillOpacity : menu.showBackground() && self.rep != 'number' ? 0.7 : 0,
					fillColor : self.rep == 'number' ? '#fff' : color
				});
			}	
			
		});
		
		function setColor(valid, layer, color){
			if (!menu.showBackground() || self.rep == 'number'){
				layer.setStyle({
					fillColor : valid ? '#fff' : color,
					fillOpacity : valid ? 0.7 : 0
				})
			}else{
				layer.setStyle({
					fillColor : valid ? tinycolor(color).darken(20).toString() : color,
					fillOpacity : valid ? 1 : 0.7
				})
			}
		}
		
		if (!action && !Array.isArray(props)) sessionStorage.setItem('props'+self.id, JSON.stringify(props));
	}
	
	updateInfo(props){
		const self = this;
		const svg = self.div.select('svg#info-control');
		const en = menu.language == 'en',
			nb = self.rep == 'number';
		
		let textDOM = svg.select('text#value')
		if (textDOM.empty())
			textDOM = svg.append('text')
				.attr('id', 'value')
				.style('font-size', client.getRole() == 'controller' ? '12px' : normalText)
				.attr('transform', transformString('translate', 0, 45))
		
		if (props){
			//update the information being displayed
			if (!self.leaflet.props || (self.leaflet.props && self.leaflet.props.code != props.code))
				self.leaflet.props = props;
			else{
				self.leaflet.props = null;
				props = null;
			}
		}
		else if (self.leaflet.props) props = self.leaflet.props;
		
		self.updateStyle();
		sessionStorage.setItem('props'+self.id, JSON.stringify(self.leaflet.props));
		
		if (!props) {
			textDOM.text(en ? 'Select a district on the map' : 'Séléctionnez un secteur sur la carte')
			return;
		}
		
		let value = '';
		let index = self.time == 'aggregate' ? 0 : self.period-4;
		switch (self.indicator){
		case 'fluctuation':
			value = nb ? Math.trunc(props.values[index]).toLocaleString(menu.language) + (en ? ' persons' : ' personnes') : (props.values[index] * 100).toFixed(2) + '%';
			break;
		case 'attractiveness':
			value = props.values[0].toFixed(2);
			break;
		case 'density':
			value = Math.trunc(props.values[index]).toLocaleString(menu.language) + (en ? ' persons / square kilometer' : ' personnes / kilomèters carrés');
			break
		case 'presence':
			value = nb ? Math.trunc(props.values[index]).toLocaleString(menu.language) : (props.values[index] * 100).toFixed(2);
			value = nb ? value + (en ? ' persons' : ' personnes') : value + '%';
			break;
		} 
		
		textDOM.text(props.name + ' (' + props.code + '):  ' + value)
		
	}
	
	// translate and zoom
	updateMapView(attrs){
		const self = this;
		
		if (self.fzoom) return;
		
	    const tooltip = d3.selectAll('.' + self.id);
	    const distances =[];
	    const positions = [];
	    const width = this.div.node().clientWidth;
	    
	    if (client.getRole() != 'controller'){
			if (attrs.action == 'reset'){
				self.leaflet.center = coords[menu.dataset]
				self.leaflet.zoom = self.resetZoom();
			}else{
				self.leaflet.center.lat += attrs.center.lat * (attrs.width/width);
    	        self.leaflet.center.lng += attrs.center.lng * (attrs.width/width);
    	    	self.leaflet.zoom += (attrs.zoom * width) / attrs.width;
			}
	        
	    	sessionStorage.setItem(self.id+'map-zoom', self.leaflet.zoom);
			sessionStorage.setItem(self.id+'map-center', JSON.stringify(self.leaflet.center));
	    	
	        self.leaflet.map.setView(new L.LatLng(self.leaflet.center.lat, self.leaflet.center.lng), self.leaflet.zoom);

	    }    
	    
	}



}