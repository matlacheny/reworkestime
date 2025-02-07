/*
 * It creates and manages the multi-ring donut chart that presents activities and transportation means usage
 */

class StackedArea{
	constructor(){
		this.type = 'stacked-view';
	}
	
	updateAttrs(attrs){
		if (attrs.action == 'freeze'){
			this.ftime = attrs.value;
		}else{
			if (this.details == attrs.value) return;
			this.details = attrs.value; // true for show, false for hide details
			this.div.selectAll('svg').remove();
			this.loadDiagram()
		}
	}
	
	update(value){
		const self = this;
		
		if (self.ftime) return;
		if (value > 27) return;
		
		this.div.select('svg.svg-content').select('line#'+self.id+'period-marker')
			.attr('transform', transformString('translate', self.markerPosition(value), 0))
			.style('display', self.minTime >= self.period || self.maxTime < self.period ? 'none' : 'block')
			
		this.period = value;
		
		if (self.details) self.updateInfo()
	}
	
	recoverSession(){
		
	}
	
	set(attrs){
		const self = this;
		
		self.indicator = attrs.indicator;
		self.div = attrs.div;
		self.id = attrs.id;
		self.partition = attrs.partition;
		self.sector = attrs.sector;
		self.space = attrs.space;
		self.time = attrs.time;
		self.period = attrs.period;
		self.client = attrs.client;
		self.window = attrs.window;
		self.details = attrs.details;
		self.ftime = attrs.ftime;
		self.category = attrs.category;
		
		const waitingText = self.div.append('text')
			.style('line-height', self.div.node().clientHeight + 'px')
			.text(labels['loading'][menu.language])
			
		d3.csv(menu.getDataDirectory() + 'presence.csv', function(error, data){
			if(error) throw error;
			
			self.data = data.filter(d => d.indicator == 'presence' && (label_priority[self.indicator].includes(d.status) || d.status == 'general_'+self.indicator))	
			self.data = self.data.filter(d => self.space == 'aggregate' ? d.partition == 'none' : d.partition == self.partition)
			self.data = self.data.filter(d => d.code == self.sector)
			
			waitingText.remove();
			self.loadDiagram();
		})
	}
	
	loadDiagram(){		
		const self = this;
		const en = menu.language == 'en';
		// ---------------------------------------
		// Filter the data according to the indicator: activity or modes
		let data = self.data.filter(d => label_priority[self.indicator].includes(d.status))
		
		data = data.filter(d => d.class ? (self.category ? d.class == self.category : d.class == 0) : true)
			
		data.sort(function(a, b) { return a.start - b.start; }); // sort it according to the starting time
		
		// parse the values to integer
	    data.forEach(function(d){
	    	d.start = +d.start;
	    	d.end = +d.end;
	    	d.value = +d.value;
	    	d.total = +d.total;
	    })
	    
	    data = data.filter(d => d.start > 0 && d.end > 0 && d.start < 29)
	    
	    self.maxTime = d3.max(data, d => d.start);
	    self.minTime = d3.min(data, d => d.start);
			    
		const width = self.div.node().clientWidth,
		    height = self.div.node().clientHeight,
			chart = {
					'left': self.details ? width * .28 : width * .1,  
					'top': height * 0.15, 
					'bottom': height - 50, 
					'height': height * 0.75, 
					'width': self.details ? width * 0.7 : width * .85
					};
		
		const svg = this.div.append('svg')
		        .attr('width', width)
		        .attr('height', height)
		        .attr('viewBox', '0 0 ' + width + ' ' + height)
		        .classed('svg-content', true)		
	
		function getTitle(){
			const sName = data[0].name.charAt(0).toUpperCase() + data[0].name.slice(1),
				modes = self.indicator == 'modes',
				category = self.category ? (en ? 'of Class ' : 'de la Classe ') + self.category.substr(-1) : '',
				aggregate_space = self.space == 'aggregate',
				sector_code = ' (' + self.sector + ')';
			
			return en ? 'Estimated proportion of people ' + (modes ? 'on the move ' : '') + 
					category + (modes ? ' by mode of transport ' : ' by activity ') + 'in ' + 
					(aggregate_space ? 'the region of ' : '') +
					sName + (aggregate_space ? '' : sector_code) :
						'Proportion estimée de personnes ' + category + (modes ? ' en déplacement' : ' présentes') +
						(modes ? ' par mode de transport' : ' par activité') + ' sur ' + 
						(aggregate_space ? 'la région de ' : '') + sName +
						(aggregate_space ? '' : sector_code)
		}        
		        
		svg.append('text')
			.attr('transform', function(){ return transformString('translate', 0, 30);})
			.style('text-anchor', 'middle')
			.text(getTitle())
			.style('font-size', titleText)
			.call(wrap, chart.width - 20, chart.left + (chart.width - 20)/2)
		        
		const x = d3.scaleLinear().domain([self.minTime, self.maxTime]).range([0, chart.width]),
			y = d3.scaleLinear().range([chart.height, 0]).domain([0,1]);
		
		//-------------------------------------------------------
		// Stacked area chart
			
		const area = d3.area()
	        .x(function(d, i) { return x(d.data.key); })
	        .y0(function(d) { return y(d[0]); })
	        .y1(function(d) { return y(d[1]); })
	        .curve(d3.curveBasis)
	        
	    //-----------------------------------------------------
	    // Data modeling and filtering
	    
	    // Sort by time
	    
	    data = d3.nest()
	        .key(function(d) { return d.start; })
	        .sortValues((a,b) => label_priority[self.indicator].indexOf(a.status) - label_priority[self.indicator].indexOf(b.status))
	        .entries(data);
	    
	    const stackedData = d3.stack()
	    	.keys(d3.range(label_priority[self.indicator].length))
	    	.offset(d3.stackOffsetExpand)
	    	.value((d, key) => {
	    		return d.values[key].value;
	    	})(data)	
	    
	    svg.selectAll('.layer')
	    	.data(stackedData)
	    	.enter()
	    		.append('path')
	    		.attr('transform', transformString('translate', chart.left, chart.top))
	    		.style('fill', d => colorPalettes[self.indicator][label_priority[self.indicator][d.key]])
	    		.style('fill-opacity', '0.9')
	    		.style('stroke', d => colorPalettes[self.indicator][label_priority[self.indicator][d.key]])
	    		.attr('d', area)
	    
	    const lineWidth = (chart.width/(self.maxTime - 4));
		const left = chart.left + lineWidth/2;
		self.markerPosition = d3.scaleLinear().domain([self.minTime, self.maxTime]).range([left, left + chart.width])
	    
	    svg.append('line')
	    	.attr("x1", 0)
		    .attr("x2", 0)
		    .attr("y1", chart.top + chart.height)
		    .attr("y2", chart.top)
		    .attr("stroke", "#ccc")
		    .attr('stroke-width', lineWidth+'px')
		    .attr('opacity', '0.5')
		    .attr('transform', transformString('translate', self.markerPosition(self.period), 0))
		    .attr('id', self.id+'period-marker')
		    .style('display', self.minTime >= self.period || self.maxTime < self.period ? 'none' : 'block')
		   
			    // gridlines in x axis function
		function make_x_gridlines() {		
		    return d3.axisBottom(x)
		        .tickValues(d3.range(6, 28, 2))
		}
		
		// gridlines in y axis function
		function make_y_gridlines() {		
		    return d3.axisLeft(y)
		    	.tickValues(d3.range(0.2, 1, 0.2))
		}
	    
	    // add the X gridlines
		svg.append("g")			
		  .attr("class", "grid")
		  .attr("transform", transformString('translate', chart.left, chart.top + chart.height))
		  .style('stroke', '#ccc')
		  .call(make_x_gridlines()
		      .tickSize(-chart.height)
		      .tickFormat("")
		  )

		  // add the Y gridlines
		svg.append("g")			
		  .attr("class", "grid")
		  .attr("transform", transformString('translate', chart.left, chart.top))
		  .style('stroke', '#ccc')
		  .call(make_y_gridlines()
		      .tickSize(-chart.width)
		      .tickFormat("")
		  )
			    	
	    svg.append('g')
	    	.attr('transform', transformString('translate', chart.left, chart.top + chart.height))
	    	.style('font-size', normalText)
	    	.call(d3.axisBottom(x).ticks(self.maxTime - self.minTime).tickFormat(d => formatHour(d, 'fr')))
	    
	    svg.append('g')
	    	.attr('transform', transformString('translate', chart.left, chart.top))
	    	.style('font-size', normalText)
	    	.call(d3.axisLeft(y).tickFormat(d => Math.trunc(d * 100) + '%'))
	    	
	    svg.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", chart.left - 58)
			.attr("x",0 - (height / 2))
			.attr("dy", "1em")
			.style("text-anchor", "middle")
			.style('font-size', titleText)
			.text(en ? 'Proportion of people on ' + (self.indicator == 'modes' ? 'the move' : 'activity') :
				'Proportion de personnes en ' + (self.indicator == 'modes' ? 'déplacement' : 'activité'));        
		    
		if (self.details) self.setInfo()
		
	}
	
	//---------------------------------------
	// Load the info space
	setInfo(){
		const self = this;
		
		const width = self.div.node().clientWidth,
	    	height = self.div.node().clientHeight,
	    	box = {'height' : height, 'width': width * 0.2, 'top': 0},
			svg = self.div.select('.svg-content');
		
		let group = svg.append('g')
			.attr('id', 'info-box')
		
		group.append('line')
			.attrs({
				'x1': box.width,
				'x2': box.width,
				'y1': 0,
				'y2': height
			})
			.style('stroke', '#808080')
			.style('stroke-dasharray', '3')
		
		let top = 15;
		let text = group.append('text')
			.style('font-weight', 'bold')
			.style('text-anchor', 'middle')
			.style('font-size', normalText)
			.text(menu.language == 'en' ? 'Over 24 Hours' : 'Sur 24 heures')
			.attr('transform', transformString('translate', box.width/2, top))
			
		top += 20;
		

		let data = self.data.filter(d => d.indicator == 'presence' && d.time == 'aggregate' && (self.category ? d.class == self.category : d.class == 0))
		data = data.filter(d => d.status == 'general_'+self.indicator)[0]

		const value = (data.value * 100).toFixed(2)
		const total = Math.trunc(data.total);
		
		function getTitle(){
			const aggregate_space = self.space == 'aggregate',
				activity = self.indicator == 'activity',
				s_name = data.name.charAt(0).toUpperCase() + data.name.slice(1),
				value_string = ' (' + total.toLocaleString(menu.language);
			
			return menu.language == 'en' ? value + '% of active people ' +
					(activity ? 'in ' : (aggregate_space ? 'moving in ' : 'moving inner or towards ')) + s_name +
					(self.space == 'aggregate' ? ' region ' : ' ') + value_string + ' persons). Distributed as:' :
						value + '% de personnes actives sont en ' + 
						(activity ? 'activité sur ' : ('déplacement ' + (aggregate_space ? 'sur ' : "à l'intérieur ou en direction de "))) + 
						s_name + value_string + ' personnes). Répartition :';
		}
		
		
		text = group.append('text')
			.style('font-size', normalText)
			.text(getTitle()) 
			.attr('transform', transformString('translate', 0, top)) 
			.call(wrap, box.width-5, 5)
		
		data = self.data.filter(d => (self.category ? d.class == self.category : d.class == 0) && d.time == 'aggregate');
		top = self.setDetailsPerActivity(group, data, 40 + text.node().childNodes.length * 12) - 10

		group.append('line')
			.attrs({
				'x1': 0,
				'x2': box.width,
				'y1': top,
				'y2': top,
				'id': 'separator'
			})
			.styles({
				'stroke': '#808080',
				'stroke-dasharray': ('3', '3')
			})
		
		self.updateInfo()
	}
	
	// per time interval
	updateInfo(){
		const self = this;
		
		const width = self.div.node().clientWidth,
	    	height = self.div.node().clientHeight,
	    	box = {'height' : height, 'width': width * 0.2, 'top': 0},
			svg = self.div.select('.svg-content');
	
		const group = svg.select('g#info-box');
		
		let periodGroup = group.select('g.period')
		if (periodGroup.empty()) {
			periodGroup = group.append('g')
				.classed('period', true)
		} 
		// clear the group
		let groupNode = periodGroup.node();
		while (groupNode.firstChild) {
		    groupNode.removeChild(groupNode.firstChild);
		}
		
		let top = group.select('line#separator').node().y1.baseVal.value + 20;
		
		let text = periodGroup.append('text')
			.style('font-weight', 'bold')
			.style('text-anchor', 'middle')
			.style('font-size', normalText)
			.text(getTimeString(self.period) + ' - ' + getTimeString(self.period+1))
			.attr('transform', transformString('translate', box.width/2, top))
		
		top += 20;
		
		let data = self.data.filter(d => d.indicator == 'presence' && d.start == self.period && (self.category ? d.class == self.category : d.class == 0));
		
		function getText(){
			const en = menu.language == 'en',
				general_data = data.filter(d => d.status.includes('general'))[0];
			
			if (!general_data) return en ? 'There is no data for the current time interval.' : 'Aucune donnée pour le créneau de temps séléctionné.';
			
			const value = ' (' + (general_data.value * 100).toFixed(2) + '%)',
				total = Math.trunc(general_data.total).toLocaleString(menu.language);
			
			return en ? total + ' persons' + value + '. Distributed as:' : total + ' personnes' + value + '. Répartition :'
		}
		
		
		text = periodGroup.append('text')
			.style('font-size', normalText)
			.text(getText()) 
			.attr('transform', transformString('translate', 0, top)) 
			.call(wrap, box.width-5, 5)
		
		if (data.length > 0) self.setDetailsPerActivity(periodGroup, data, top + text.node().childNodes.length * 12)
		
	}
	
	setDetailsPerActivity(group, data, top){
		const self = this;
		
		const width = self.div.node().clientWidth,
	    	height = self.div.node().clientHeight,
	    	box = {'height' : height, 'width': width * 0.2, 'top': 0},
			svg = self.div.select('.svg-content');
		
		let infoData = []
		let multi = 0;
		data.forEach(d => {
			d.total = +d.total;
			d.value = +d.value;
			d.total_multi = +d.total_multi;
			d.value_multi = +d.value_multi;
			if (d.status.includes('general') || d.total == 0) return;
			
			infoData.push({
				'status': d.status,
				'total': d.total,
				'value': d.value,
				'color': colorPalettes[self.indicator][d.status]
			})
			
			multi += (+d.total_multi);
		})
		
		const statusGroup = group.append('g')
		const rectSize = 15;
		infoData.sort((a,b) => b.total - a.total)
		const statusContent = statusGroup.selectAll('g')
			.data(infoData)
			.enter()
				.append('g')
				.attr('transform', (d, i) => { return transformString('translate', 5, top + (rectSize + 5)*i); } )
				.classed('status-group', true)
				
		statusContent.append('rect')
			.attr('width', rectSize+'px')
			.attr('height', rectSize+'px')
			.style('fill', d => d.color)
		
		statusContent.append('text')
			.style('fill', '#000')
			.style('font-size', normalText)
			.attr('transform', d => { return transformString('translate', rectSize + 5, rectSize - 4); })
			.text(d => Math.trunc(d.total).toLocaleString(menu.language) + ' (' + (d.value * 100).toFixed(2) + '%)')
			
		top += infoData.length * 23;
		
		if (multi == 0 || data[0].time == 'aggregate') return top;
		const total = data.filter(d => d.indicator == 'presence')[0].total;
		let prop_multi = (multi/total *100).toFixed(2);
		
		function getMultiText(){
			const prop = ' (' + prop_multi + '%)',
				value_string = Math.trunc(multi).toLocaleString(menu.language),
				activity = self.indicator == 'activity';
				
			return menu.language == 'en' ? value_string + ' persons ' + (activity ? 'perform various activities' : 'use various modes') + prop :
				value_string + ' personnes ' + (activity ? ' font divers activités' : ' utilisent divers modes') + prop
		}
	
		group.append('text')
			.attr('transform', transformString('translate', 0, top))
			.style('font-size', normalText)
			.text(getMultiText())
			.call(wrap, box.width-5, 5)
			
		return top;
	}
	    
}