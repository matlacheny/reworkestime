

class IndexPlot{
	constructor(){
		this.type = "index";
	}
	
	updateAttrs(attrs){
		const self = this;
		if (attrs.action == 'freeze') this.ftime = attrs.value;
		else {
			const update = new Promise(function(fulfill, reject){
				self.details = attrs.value; // false for hide, true for show details
				self.div.select('g#chart-container').remove()
				self.div.select('g#info-box').style('display', attrs.value ? 'block' : 'none')
				fulfill()
			})
			
			update.then(self.loadDiagram())
		}
	}
	
	updateHighlight(attrs){
		const self = this;
		
		const myCodes = self.data.map(d => d.pcode)
		if (attrs.code && !myCodes.includes(attrs.code)) return;
		
		switch(attrs.action){
		case 'unselect':
			self.selected = self.selected.filter(d => d != attrs.code);
			break;
		case 'select':
			if (attrs.multiple && !self.selected.includes(attrs.code))
				self.selected.push(attrs.code);
			else self.selected = [attrs.code];
			break;
		case 'unselectall':
			self.selected = [];
			break;
		case 'recover':
			self.selected = self.selected.filter(d => attrs.select_codes.includes(d))
			break;
		case 'init':
			self.selected = self.selected.filter(d => myCodes.includes(d))
			break;
		}
		
		sessionStorage.setItem(self.id+'-selected-trajectories', JSON.stringify(self.selected))
		
		const lines = self.div.select('g#chart-container').selectAll('g.line');
		lines.style('stroke-opacity', d => self.selected.length == 0 ? '1' : (self.selected.includes(d.key) ? '1' : '0.6'))
		lines.attr('transform', (d,i) => transformString('translate', self.chart.left, self.chart.top + self.y(i) - self.lineHeight/2 + (self.selected.length > 0 && self.selected.includes(d.key) ? 20 : 0)))
		
		lines.selectAll('line').style('stroke-width', function(d) {
			const parent = d3.select(this.parentNode).datum()
			return self.selected.length > 0 && self.selected.includes(parent.key) ?  20 : self.lineHeight;
		})
			
	}
	
	update(value){
		const self = this;
		
		if (self.freezed) return;
		if (value > 27) return;
		
		this.div.select('svg.svg-content').select('line#'+self.id+'period-marker')
			.attr('transform', transformString('translate', self.markerPosition(value), 0))
			
		this.period = value;
	}
	
	recoverSession(){
		let recover = sessionStorage.getItem(this.id+'-selected-trajectories')
		this.selected = recover ? JSON.parse(recover) : this.selected;
	}
	
	set(attrs){
		const self = this;
		
		self.div = attrs.div;
		self.indicator = attrs.indicator;
		self.id = attrs.id;
		self.category = attrs.category;
		self.period = attrs.period;
		self.client = attrs.client;
		self.window = attrs.window;
		self.ftime = attrs.ftime;
		self.details = attrs.details;
		self.selected = attrs.selected;
		
		self.recoverSession();
		
		const waitingText = self.div.append('text')
			.style('line-height', self.div.node().clientHeight + 'px')
			.text(labels['loading'][menu.language])
		
		const names = ['data', 'info'];
		const folder = menu.getDataDirectory();
		const q = d3.queue()
			.defer(d3.csv, folder + 'index_plot.csv')
			.defer(d3.csv, folder + 'class_semantic.csv')
		
		q.awaitAll(function(error, files){
			files.forEach((f,i) => {
				if (names[i] == 'data'){
					self.nbTotalTrajs = d3.nest()
						.key(function(d) { return d.pcode; })
						.entries(f).length;
					
					self.data = f.filter(d => self.category ? d.class == self.category : true)
					
					self.data.forEach(d => {
						d.color = colorPalettes[self.indicator][self.indicator == 'activity' ? d.activity : d.mode];
	//						d.start = Math.floor(+d.start / 60);
	//						d.end = Math.floor(+d.end / 60);
					})
				}else self[names[i]] = f;
			})
	
			const svg = self.div.append("svg")
			  	.attr("preserveAspectRatio", "xMinYMin meet")
			  	.classed("svg-content", true);
			
			waitingText.remove();
			self.loadDiagram()
			self.setInfo()
		})
	}
	
	loadDiagram(){
		const self = this;
		
		const width = self.div.node().clientWidth,
			height = self.div.node().clientHeight,
			svg = self.div.selectAll('svg.svg-content'),
			en = menu.language == 'en';
		
		self.chart = {
				'height': height * .75, 
				'width': self.details ? width * 0.7 : width * .9,
				'top': height * .15, 
				'bottom': height * .1, 
				'left': self.details ? width * .28 : width * .07, 
				'right': width * .03
			}
				
		svg.attr("viewBox", '0 0 ' + width + ' ' + height)
		  	.attr("width", width)
		  	.attr("height", height)
		
		const chartGroup = svg.append('g')
			.attr('id', 'chart-container')
			
		const startTime = d3.min(self.data, d => +d.start),
			endTime = d3.max(self.data, d => +d.end);
		
		let data = d3.nest()
			.key(d => d.pcode)
			.entries(self.data);

		const nTrajs = data.length;		
		
		const category = self.indicator == 'activity' ? (en ? 'Activities' : 'Activités') : (en ? 'Modes of Transport' : 'Modes de Transport');
		const classe = self.category ? (en ? 'of Group ' : 'du Groupe ') + self.category.substr(-1) : '';
		let title = chartGroup.append('text')
			.attr('transform', function(){ return transformString('translate', 0, 30);})
			.style('text-anchor', 'middle')
			.style('font-size', titleText)
			.text((en ? 'Individual trajectories ' : 'Trajectoires individuelles ') + classe + (en ? ' described by ' : ' selon les ') + category)
			.call(wrap, self.chart.width, self.chart.left + self.chart.width/2)
		
		// save the representative trajectories 
		let rep_trajs = data.filter(d => d.values[0].criterion != 'none')
		// random selection of 1,000 trajectories, more than that is not visually useful
		if (!self.category || data.length > 1000) {
			data = _.take(data.filter(d => d.values[0].criterion == 'none'), 1000 - rep_trajs.length)
			rep_trajs.forEach(t => {
				data.push(t)
			})
			data = _.shuffle(data)
		}
		
		data.sort((a,b) => {
			
			let indexA = a.values.findIndex(v => v.activity == "moving") + 1;
			let indexB = b.values.findIndex(v => v.activity == "moving") + 1;
			
			return label_priority[self.indicator].indexOf(b.values[indexB][self.indicator]) - label_priority[self.indicator].indexOf(a.values[indexA][self.indicator])
		})
		
		
		data.sort((a,b) => {
			
			if (a.values[0].activity != "home") return -1;
			if (b.values[0].activity != "home") return 1;
			
			let elemA = a.values.find(v => v.activity == "moving");
			let elemB = b.values.find(v => v.activity == "moving");
			
			return elemA.start - elemB.start;			
		})
		
		const nDrawnTrajs = data.length;

		self.lineHeight = self.chart.height / nDrawnTrajs;
		self.lineHeight = self.lineHeight < 1 ? 1 : self.lineHeight;
				
		const x = d3.scaleLinear().domain([startTime, endTime]).range([0, self.chart.width]),
			xAxis = d3.axisBottom(x).tickValues(d3.range(startTime, endTime, 60)).tickFormat(d => formatHour(Math.floor(d / 60), 'fr'))//ticks(22).tickFormat(d => {console.log(d); return formatHour(Math.floor(d / 60), 'fr')})
		
		self.y = d3.scaleLinear().domain([0, nDrawnTrajs]).range([self.chart.height, 0])
			
		chartGroup.append("g")
		    .attr("class", "x axis")
		    .style('font-size', normalText)
		    .attr("transform", transformString('translate', self.chart.left, self.chart.top + self.y(0)))
		    .call(xAxis); // Create an axis component with d3.axisBottom
		
		chartGroup.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", self.chart.left - 35)
			.attr("x",0 - (height / 2))
			.attr("dy", "1em")
			.style("text-anchor", "middle")
			.style('font-size', titleText)
			.text(nTrajs.toLocaleString(menu.language) + (en ? ' individuals ' : ' individus ') + '(' + Math.trunc((nTrajs/self.nbTotalTrajs)*100) + '%)')     	
				
		const lineGroup = chartGroup.selectAll('g.line')
			.data(data)
			.enter()
				.append('g')
				.classed('line', true)
				.attr('transform', (d,i) => transformString('translate', self.chart.left, self.chart.top + self.y(i) + (self.selected.length > 0 && self.selected.includes(d.key) ? 20 : self.lineHeight)))
				.style('stroke-opacity', d => self.selected.length == 0 ? '1' : (self.selected.includes(d.key) ? '1' : '0.6'))
			
		function isParentSelected(node){
			const d = d3.select(node.parentNode).datum();
			return self.selected.length > 0 && self.selected.includes(d.key)
		}
		
		lineGroup.selectAll('line')
			.data(d => d.values)
			.enter()
			.append('line')
				.attr('x1', d => x(d.start))
				.attr('x2', d => x(d.end))
				.attr("y1", 0)
				.attr("y2", 0)
				.style("stroke", d => d.color)
				.style('stroke-width', function(d) {
					return isParentSelected(this) ? 20 : self.lineHeight;
				})
				
		// gridlines in x axis function
		function make_x_gridlines() {		
		    return d3.axisBottom(x)
		        .tickValues(d3.range(startTime+120, endTime, 120))
		}
	    
	    // add the X gridlines
		chartGroup.append("g")			
		  .attr("class", "grid")
		  .style('opacity', '0.6')
		  .attr("transform", transformString('translate', self.chart.left, height - self.chart.bottom))
		  .call(make_x_gridlines()
		      .tickSize(-self.chart.height)
		      .tickFormat("")
		  )
		
		// -----------------------------------------
		// time marker
		
		const lineWidth = (self.chart.width/24);
		const left = self.chart.left + lineWidth/2;
		self.markerPosition = d3.scaleLinear().domain([4, 28]).range([left, left + self.chart.width])
		
	    chartGroup.append('line')
	    	.attr("x1", 0)
		    .attr("x2", 0)
		    .attr("y1", height - self.chart.bottom)
		    .attr("y2", self.chart.top)
		    .attr("stroke", "#ccc")
		    .attr('stroke-width', lineWidth+'px')
		    .attr('opacity', '0.5')
		    .attr('transform', transformString('translate', self.markerPosition(self.period), 0))
		    .attr('id', self.id+'period-marker')
		    
	    if (self.selected.length > 0){
			self.updateHighlight({'action':'init'})
		}
	}
	
	//---------------------------------------
	// Load the info space
	setInfo(){
		const self = this;
		
		const width = self.div.node().clientWidth,
	    	height = self.div.node().clientHeight,
	    	box = {'height' : height, 'width': width * 0.23, 'top': 0},
			svg = self.div.select('.svg-content'),
			en = menu.language == 'en';
		
		let group = svg.append('g').attr('id', 'info-box')
		
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
			.style('text-anchor', 'middle')
			.text(en ? "Individuals description" : 'Description des individus')
			.style('font-weight', 'bold')
			.style('font-size', normalText)
			.attr('transform', transformString('translate', 0, top))
			.call(wrap, box.width, box.width/2)
			
		top += text.node().childNodes.length * 20;
		
		let infoData = self.info.filter(d => self.category ? d.class == self.category : d.class == 'none');
		infoData.forEach(d => {
			d.value = +d.value;
			d.total = +d.total,
			d.mean = +d.mean;
			d.sd = +d.sd;
		})
		
		let data = d3.nest()
			.key(d => d.aspect)
			.entries(infoData.filter(d => d.aspect[0] != 'f' && d.aspect != 'socioprofessional groups' && !d.description.includes('00') && d.description != 'none'));
		
		data.sort((a,b) => {
			if (a.key == 'age' || a.key == 'sex') return -1;
			return 1
		})
			
		const infoGroup = group.selectAll('g')
			.data(data)
			.enter()
				.append('g')
				.attr('transform', function(d,i) { 
					const sibling = this.previousSibling;
					if (sibling && sibling.nodeName == 'g') {
						let children = d3.select(sibling).datum().values.length;
						top += (children + 1) * 15; 
					}
					return transformString('translate', 5, top)
				})
			
		infoGroup.append('text')
			.text(d => getLabel(d.key))
			.style('font-weight', 'bold')
			.style('font-size', normalText)
					
		const values = infoGroup.selectAll('text.values')
			.data(d => d.key == 'occupation' ? d.values.sort((a,b) => (b.total - a.total)) : d.values)
			.enter()
				.append('text')
				.style('font-size', normalText)
				.text(d => getLabel(d.description) + ': ' + Math.trunc(d.total).toLocaleString(menu.language) + ' (' + (d.value * 100).toFixed(2) + '%)')
				.call(wrap, box.width-5, 2)
				
		values.attr('transform', function(d,i) {
			let sibling = this.previousSibling;
			let top = 0;
			while (sibling && sibling.nodeName == 'text'){
				top += sibling.childNodes.length * 15;
				sibling = sibling.previousSibling;
			}
			return transformString('translate', 0, top)
		})
		
		if (self.category)
			values.style('fill', d => d.total > (d.mean + d.sd) ? 'red' : (d.total < Math.abs(d.mean - d.sd) ? 'blue' : 'black'))
		
		group.style('display', self.details ? 'block' : 'none')
	}
}