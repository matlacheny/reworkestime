/**
 * 
 */

class Clock{
	constructor(){
		this.type = 'clock';
		this.palette = [];
	}
	
	recoverSession(){

	}
	
	updateAttrs(attrs){
		if (attrs.action == 'freeze'){
			this.ftime = attrs.value;
		}else{
			// boolean variable with false for hide and true for show details
			this.details = attrs.value;
			this.updateInfo()
			this.setInfoDisplay();
		}
		this.updateFreezeText();
	}

	
	// Update the pie chart
	update(value){
		const self = this;
		if (isNaN(value) || self.time == 'aggregate') return;
		if (value == self.period || value > 28) return;
		if (this.ftime) return;
		
		const group = self.div.selectAll('g.centerPie')
		
		d3.select('text#'+self.id+'center-text')
			.text(getTimeString(value))
		
		let data = self.data.filter(d => d.indicator != 'general' && d.start == value)
		data.sort((a,b) => b.value - a.value)	
			
		data = d3.nest()
		 	.key(function(d) { return d.status; })
	        .entries(data)
		
		this.period = value;
		
	    const path = group.selectAll('path')
	    	.data(self.pie(data))
	    	
	    path.transition()
	    	.duration(10)
	    	.attrTween("d", arcTween) // redraw the arcs
	    	.style('fill', d => colorPalettes[self.indicator][d.data.key])
		
		const text = group.selectAll('text')
			.data(self.pie(data))
			
		text.transition()
			.duration(10)
			.text(d => { return d.value > 0.05 ? Math.trunc(d.value * 100) + '%' : ''; })
			.attrs(d => {
    			let c = self.pieArc.centroid(d);
    			return{
    				'dx': c[0],
    				'dy': c[1]
    			}
    		})
		
		function arcTween(a) {
		  var i = d3.interpolate(this._current, a);
		  this._current = i(0);
		  return function(t) {
		    return self.pieArc(i(t));
		  };
		}
		
		if (self.details) self.updateInfo()
	}
	
	updateFreezeText(){
		const self = this;
		
		let text = '';
		if (self.ftime)
			text += menu.language == 'en' ? 'Time dimension is freezed.' : 'La dimension temporelle est figée.';
		
		const svg = self.div.select('svg.svg-content');
		const info = svg.select('text#freeze-info');
		
		if (info.empty()){
			svg.append('text')
				.attr('id', 'freeze-info')
				.text(text)
				.style('font-size', smallText)
				.style('fill', 'red')
				.style('text-anchor', 'end')
				.attr('x', self.div.node().clientWidth - 5)
				.attr('y', self.div.node().clientHeight - 5)
		}else{
			info.text(text)
		}
	}

	set(attrs){
		const self = this;
		self.div = attrs.div;
		self.indicator = attrs.indicator;
		self.id = attrs.id;
		self.sector = attrs.sector;
		self.label = attrs.label;
		self.partition = attrs.partition;
		self.children = attrs.children; 
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
		
		d3.csv(menu.getDataDirectory() + 'mobility.csv', function(error, data){
			if (error) throw error;
			
			let indicators = [self.indicator, 'general'];
			
			self.data = data.filter(d => self.space == 'aggregate' ? d.partition == 'none' : d.partition == self.partition) // change to partition == 'none' when update the data
			
			self.data = self.data.filter(d => indicators.includes(d.indicator) && (self.category && d.indicator == 'general' ? d.status == self.indicator : true))
				
			if (self.indicator == 'activity')
				self.data = self.data.filter(d => !d.status.includes('other'))
			
			self.data = self.data.filter(d => self.space == 'individual' ? d.code == self.sector : true)
			
			self.data = self.data.filter(d => d.class ? (self.category ? d.class == self.category : d.class == 0) : true)
						
			waitingText.remove();
			self.loadDiagram();
		})
	}
	
	loadDiagram(){
		const self = this;	
		
		let sName = self.data[0].name;
		
		const width = self.div.node().clientWidth,
			height = self.div.node().clientHeight,
			chart = {'left': width * .24, 'width': width * .76}
		
		const svg = self.div.append("svg")	
			.attr("preserveAspectRatio", "xMinYMin meet")
			.attr("viewBox", function() { 
		  		return "0 0 " + width + " " + height + ""; 
		  	})
		  	.attr("width", width)
		  	.attr("height", height)
			.classed("svg-content", true);
		
		function getTitle(){
			const en = menu.language == 'en',
				modes = self.indicator == 'modes',
				category = self.category ? (en ? 'of Class ' : 'de la Classe ') + self.category.substr(-1) : '',
				aggregate_space = self.space == 'aggregate',
				sector_code = ' (' + self.sector + ')', 
				sector_name = sName.charAt(0).toUpperCase() + sName.slice(1);
				
			return en ? (modes ? 'Modes of Transport' : 'Trip Purposes') +
			' of moving people ' + category + ' in ' +
			(aggregate_space ? 'the region of ' : '') + sector_name +
			(aggregate_space ? '' : sector_code) + ' around the clock' :
				(modes ? 'Modes de transport ' : 'Motifs ') + 'des personnes en déplacement ' + category + ' sur ' +
				(aggregate_space ? 'la région de ' : '') + sector_name +
				(aggregate_space ? '' : sector_code) + ' sur 24 heures';
		}
		
		svg.append('text')
			.attr('transform', function(){ return transformString('translate', 0, 30);})
			.style('text-anchor', 'middle')
			.style('font-size', titleText)
			.text(getTitle())
			.call(wrap, chart.width - 20, chart.left + (chart.width - 20)/2)
		
		
		const angleScale = d3.scaleLinear()
			.domain([0, 24])
			.range([0, Math.PI*2])
			
		const pie = d3.pie()
			.sort(function(a, b){ return formatHour(a.start, 'fr') - formatHour(b.start, 'fr'); })
		    .value(function(d) {
		    	return d.indicator == 'general' ? (2*Math.PI)/24 : +d.value;
		    })
		
		const radius = Math.min(chart.width, height) * 0.3,
			cwidth = 25,
			top = height / 2 + 20,
			left = chart.left + chart.width / 2;
		
		const arc = d3.arc()
			.startAngle(function(d){ return d.startAngle; })
			.endAngle(function(d) { return d.endAngle; })
			.innerRadius(function(d) { return radius + (cwidth * (d.data.indicator == 'general' ? 1 : 0)); })
			.outerRadius(function(d) { return radius + cwidth * (d.data.indicator == 'general' ? 2 : 1); })
		
		pushArc('general')
		pushArc(self.indicator)
		
		function pushArc(indicator){
			let data = self.data.filter(d => { return d.indicator == indicator && d.time == 'individual'; })

			if (indicator == 'general'){
				let breaks = ss.jenks(data.map(d => +d.value), 7)
				self.outerColor = d3.scaleThreshold().domain(breaks).range(colorPalettes['moving'])
			}
			
			let slice = svg.append('g') 
				.classed('clockSlice', true)
			
			slice.selectAll('path')
				.data(pie(data))
				.enter()
					.append('path')	
					.classed('main-arc', true)
					.attr('transform', function() { return transformString('translate', left, top); })
					.attr("fill", d => indicator == 'general' ? self.outerColor(d.data.value) : colorPalettes[self.indicator][d.data.status])
				    .attr('d', arc)
				    .attr('id', function() { return self.id+'main_arc'; })
				    
			if (indicator == 'general')
				slice.styles({
					'stroke': '#fff',
					'stroke-width': '1.5px'
				})
		}
		
		//---------------------------------------
		// add the hours
		const labelArc = d3.arc()
			.startAngle(function(d){ return angleScale(d) - 0.12; })
			.endAngle(function(d) { return angleScale(d+1) - 0.12; })
			.innerRadius(function(d) { return radius * 0.9; })
			.outerRadius(function(d) { return radius * 0.9; });
		 
		let data = d3.range(4, 28)

		let slice = svg.selectAll('g.textSlice')
			.data(data)
			.enter()
				.append('g')
				.classed('textSlice', true)
				.style('dominant-baseline', 'middle')
				.attr('transform', transformString('translate', left, top))
				
		slice.append('text')
			.style('text-anchor', 'middle')
			.style('font-size', normalText)
			.attrs(function(d){ 
				var c = labelArc.centroid(d);
				return {
					'dx': c[0],
					'dy': c[1]
				} 
			})
			.text(function(d) { return formatHour(d, 'fr'); })
			
		slice.append("line")
		    .attr("x1", 0)
		    .attr("x2", 0)
		    .attr("y1", -radius)
		    .attr("y2", -radius - 25)
		    .attr("stroke", "#fff")
		    .attr('stroke-width', '1.5px')
		    .attr("transform", function(d) {
		      return "rotate(" + angleScale(d) * (180/Math.PI) + ")";
		    });
		
		//-------------------------------------------
		// PieChart summarizing the data
		
		data = self.data.filter(d => d.indicator != 'general' && d.time == self.time && (self.time == 'individual' ? d.start == self.period : d.start == 0))
		
		self.pie = pie.value(d => d3.mean(d.values, v => +v.value))
		
		data.sort((a,b) => b.value - a.value)
		
		data = d3.nest()
		 	.key(d => d.status)
	        .entries(data)
	        			
		self.pieArc = d3.arc()
	    	.startAngle(function(d) { return d.startAngle; })
		    .outerRadius(radius-30)
		    .innerRadius(30)
		    .padAngle(0.02)
		    .cornerRadius(2);
		
	    slice = svg.append('g')
    		.classed('centerPie', true)
	    	.attr('transform', function() { return transformString('translate', left, top); })
	    	
	    slice.selectAll('path')
	    	.data(self.pie(data))
	    	.enter()
	    	.append('path')
		    	.attr('d', self.pieArc)
		    	.style('fill', function(d) { return colorPalettes[self.indicator][d.data.key]; })
		    	
	    slice.selectAll('text')
	    	.data(self.pie(data))
	    	.enter()
	    	.append('text')
    		.attrs(d => {
    			let c = self.pieArc.centroid(d);
    			return{
    				'dx': c[0],
    				'dy': c[1]
    			}
    		})
    		.styles({
	    		'font-size': normalText,
	    		'text-anchor': 'middle',
	    		'font-weight': 'bold'
	    	})
    		.text(d => { return d.value > 0.05 ? Math.trunc(d.value * 100) + '%' : ''; })
		    	
	    svg.append('text')
	    	.attr('transform', function(d) { 
	    		return transformString('translate', left, top + 5);
	    	})
	    	.text(self.time == 'aggregate' ? '24h' : getTimeString(self.period))
	    	.styles({
	    		'font-size': titleText,
	    		'text-anchor': 'middle',
	    		'font-weight': 'bold'
	    	})
	    	.attr('id', self.id+'center-text')
	    

	    self.setInfo();
	    self.setLegend();
	    self.updateFreezeText();
	    
	}
	
	//------------------------------
	// draw the legends
	setLegend(){
		const self = this;	
		const features = []
		const colors = colorPalettes['moving']
			
		colors.forEach((c,i) => {
			let extent = self.outerColor.invertExtent(c)
			if (typeof extent[0] == 'undefined' || typeof extent[1] == 'undefined') return;
			
			let v1 = (extent[0] * 100).toFixed(2),
				v2 = (extent[1] * 100).toFixed(2);
			
			let value = (v1 < 10 ? '  ' + v1 : v1) + ' - ' + (v2 < 10 ? ' ' + v2 : v2)
			
			features.push({
				'color': c,
				'value': value
			})
		})
			
		const width = self.div.node().clientWidth,
	    	height = self.div.node().clientHeight,
			legendheight = 190,
		    legendwidth = width * 0.24;
		
		const svg = self.div.select('.svg-content')
			.append('g')
			.styles({
				'box-shadow': '2px 2px 2px #ccc',
				'fill': 'white',
				'border-radius': '5px',
				'position': 'relative',
				'text-align': 'center'
			})
			.attr("preserveAspectRatio", "xMinYMin meet")
			.attr("viewBox", function() { 
		  		return "0 0 " + legendwidth + " " + legendheight; 
		  	})
			.attrs({
				'transform': transformString('translate', 0, height - legendheight),
				'width': legendwidth+'px',
				'height': legendheight+'px'
			})
				
		svg.append('text')
			.style('fill', '#000')
			.style('font-weight', 'bold')
			.style('font-size', normalText)
			.attr('transform', transformString('translate', 5, 20))
			.text(menu.language == 'en' ? 'Mobility Rate (%)' : 'Taux de mobilité (%)')
			
				
		const rectSize = 15;
		
		const group = svg.selectAll('g')
			.data(features)
			.enter()
				.append('g')
				.attr('transform', (d, i) => { return transformString('translate', 5, 30 + (rectSize + 8)*i); } )
				
		group.append('rect')
			.attr('width', rectSize+'px')
			.attr('height', rectSize+'px')
			.style('fill', d => d.color)
		
		group.append('text')
			.style('fill', '#000')
			.style('font-size', normalText)
			.attr('transform', d => { return transformString('translate', rectSize + 5, rectSize - 4); })
			.text(d => d.value)
			.style("white-space","pre")
			.style('font-size', '13.5px')
	}

	clear(){
		if(this.div != null) this.div.remove();
		this.nModesCharts = 0;
	}
	
	//---------------------------------------
	// Load the info space
	setInfo(){
		const self = this;
		
		const width = self.div.node().clientWidth,
	    	height = self.div.node().clientHeight,
	    	box = {'height' : height - 190, 'width': width * 0.22, 'top': 0},
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
		
		group.append('line')
			.attrs({
				'x1': 0,
				'x2': box.width,
				'y1': box.height,
				'y2': box.height,
				'id': 'separator'
			})
			.styles({
				'stroke': '#808080',
				'stroke-dasharray': ('3', '3')
			})
			
		const infoGroup = group.append('g')
			.attr('id', 'info-body')
			
		
		self.updateInfo()
		self.setInfoDisplay()
			
	}

	updateInfo(){
		const self = this;
			
		const width = self.div.node().clientWidth,
	    	height = self.div.node().clientHeight,
	    	box = {'height' : height - 190, 'width': width * 0.19, 'top': 0},
	    	en = menu.language == 'en';
		
		let data = self.data.filter(d => self.time == 'individual' ? +d.start == self.period : d.start == '0')
		
		let general = data.filter(d => d.indicator == 'general')[0]
		data = data.filter(d => d.indicator != 'general')
		
		let group = self.div.select('g#info-body')
		
		var groupNode = group.node();
		while (groupNode.firstChild) {
		    groupNode.removeChild(groupNode.firstChild);
		}
		
		let top = 15;
		let text = group.append('text')
			.attr('transform', transformString('translate', 0, top))
			.style('font-weight', 'bold')
			.style('text-anchor', 'middle')
			.style('font-size', normalText)
			.text(self.time == 'aggregate' ? (en ? 'Over 24 hours' : 'Sur 24 heures') : getTimeString(self.period) + ' - ' + getTimeString(self.period+1))
			.call(wrap, box.width, 2 + box.width/2)
			
		top += text.node().childNodes.length * 20;
		
		if (general.total == 0){
			let text = group.append('text')
				.attr('transform', transformString('translate', 0, box.height/2))
				.style('text-anchor', 'middle')
				.style('font-size', normalText)
				.text((en ? 'There is no data between ' : 'Aucune donnée entre ' ) + getTimeString(self.period) + (en ? ' and ' : ' et ') + getTimeString(self.period+1))
				.call(wrap, box.width, 2 + box.width/2)
			return;
		}
		
		let sName = data.map(d => d.name)[0]
		
		let value = (general.value * 100).toFixed(2) + '% (' + Math.trunc(general.total).toLocaleString() + ' persons)'; 
		let content = '';
		if (self.space == 'aggregate' || self.space == 'aggregate')
			content += value + (en ? " of people is on the move in the region" : ' des personnes se déplacent dans la région'); 
		else
			content += value + (en ? ' of active people are moving inner or towards ' : " des personnes actives se déplacent à l'intérieur ou en direction de ") + sName;
		
		text = group.append('text')
			.attr('transform', transformString('translate', 0, top))
			.style('font-size', normalText)
			.text(content + (en ? '. Distributed as:' : '. Répartition:'))
			.call(wrap, box.width, 5)
		
		top += text.node().childNodes.length * parseFloat(normalText.split('p')[0]) + 5;	
		
		let infoData = []
		let multi = 0;
		data.forEach(d => {
			if (d.indicator == 'general' || d.status == 'none') return;
			if (d.total == 0) return;
			
			infoData.push({
				'status': d.status,
				'effect': d.total,
				'prop': d.value,
				'color': colorPalettes[self.indicator][d.status]
			})
			
			multi += (+d.total_multi);
		})
		
		const rectSize = 15;
		infoData.sort((a,b) => b.effect - a.effect)
		const statusGroup = group.selectAll('g')
			.data(infoData)
			.enter()
				.append('g')
				.attr('transform', (d, i) => { return transformString('translate', 5, top + (rectSize + 5)*i); } )
				.classed('status-group', true)
				
		statusGroup.append('rect')
			.attr('width', rectSize+'px')
			.attr('height', rectSize+'px')
			.style('fill', d => d.color)
		
		statusGroup.append('text')
			.style('fill', '#000')
			.style('font-size', normalText)
			.attr('transform', d => { return transformString('translate', rectSize + 5, rectSize - 4); })
			.text(d => Math.trunc(d.effect).toLocaleString() + ' (' + (d.prop * 100).toFixed(2) + '%)')
			.style('font-size', '13.5px')
			
		top += infoData.length * 22;
		
		if (multi == 0) return;
		let prop_multi = (multi/(+general.total) *100).toFixed(2)
		let multiText = self.indicator == 'modes' ? (en ? 'using different modes of transport' : 'avec différents modes de transport') : 
			(en ? 'for different purposes' : 'pour des différents motifs');
		group.append('text')
			.attr('transform', transformString('translate', 0, top))
			.style('font-size', normalText)
			.text(Math.trunc(multi).toLocaleString() + (en ? ' persons make various trips ' : ' personnes font divers déplacements ') + multiText + ' (' + prop_multi + '%)')
			.call(wrap, box.width, 5)
	}
	
	setInfoDisplay(){
		this.div.select('g#info-box').style('display', this.details ? 'block' : 'none')
	}

}

