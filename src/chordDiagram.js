/**
 * 
 */

class FlowsView{
	constructor(){
		this.type = 'chord-diagram';
	}
	
	clear(){
		if(this.div != null) this.div.remove();
		sessionStorage.removeItem('chord');
	}

	updateAttrs(attrs){
		const self = this;
		if (attrs.action == 'freeze'){
			if (attrs.dim == 'time')
				this.ftime = attrs.value;
			else
				this.fspace = attrs.value;
				
			self.updateFreezeText();
			
		}else{
			// boolean variable with false for hide and true for show details
			self.details = attrs.value;
			self.updateInfoDisplay();
			const svg = this.div.selectAll('.svg-content');
			svg.select('#g-chords').remove();
			svg.select('#title').remove();
			svg.select('#nodata').remove();
			svg.select('#subtitle').remove();
			self.loadChordDiagram()
		}
	}
	
	recoverSession(){
		
	}
	
	selectSector(attrs){
		const self = this;
		
		if (self.fspace) return;
		
		if (!self.mapping) return;
		
		const oldSector = sessionStorage.getItem('selected-chord-'+self.id)
		let remove = +oldSector == attrs.code;

		let index = -1;
		const filtered = self.mapping.filter(d => { return d.code == attrs.code; })
		if (filtered.length > 0){
			index = filtered[0].index; 
		}

		if (remove){
			self.div.selectAll('path.chord')
				.style('display', 'block')
				
			sessionStorage.removeItem('selected-chord-'+self.id);
			
			self.updateInfo(attrs.code, index, 'clear')
		}else{
			self.div.selectAll('path.chord')
				.style('display', function(d){
					if (index < 0) return 'block';
			    	return d.source.index == index || d.target.index == index ? 'block' : 'none';
			    })
			sessionStorage.setItem('selected-chord-'+self.id, attrs.code);
			
			if (index >= 0)
				self.updateInfo(attrs.code, index, 'add')
			else
				self.updateInfo(attrs.code, index, 'clear')
		}
	}

	
	getCode(index){
		return this.mapping.filter(d => {return d.index == index; })[0].code;
	}
	
	getName(index){
		return this.mapping.filter(d => d.index == index)[0].name;
	}
	
	update(value){
		if (isNaN(value)) return;
		
		if (this.time == 'aggregate' || this.ftime) return;
		
		const svg = this.div.selectAll('.svg-content');
		svg.select('#g-chords').remove();
		svg.select('#title').remove();
		svg.select('#nodata').remove();
		svg.select('#subtitle').remove();
		
		this.period = value;
		
		this.loadChordDiagram();
		if (self.details) this.updateInfoTitle()
	}
	
	filterData(general){
		const self = this;

		let data = self.data.filter(d => { return self.time == 'aggregate' ? d.start == 0 : d.start == self.period; })
		
		if (self.indicator != 'general')
			data = data.filter(d => general ? d.indicator == 'general' : d.status == self.category)
		
		if (self.sectors.length > 0) 
			self.sectors.sort()
		
		if (data.length == 0){
			noDataInfo()
			return null;
		}else if (math.sum(data[0].matrix) == 0){
			noDataInfo()
			return null;
		}	
			
		let matrix = data[0].matrix;
		
		//------------------------------
		// select the greatest 5 flows from each origin
		matrix.forEach((row, i) => {
			let tempRow = []
			row.forEach((d,i) => {
				tempRow.push({
					'value': d,
					'index': i
				})
			})
			tempRow.sort((a,b) => b.value - a.value)
			
			tempRow.forEach((d,j) => {
				matrix[i][d.index] = j < 5 ? d.value : 0;
			})
		})
		
		let mapping = data[0].indexing;
		
	    // -------------------------------------------------------------------------------------------------
		// if the space is not aggregate, the matrix need to be cleaned according to the selected sectors
		if (self.space != 'aggregate' && self.sectors != 0){
			let valid = [];
			if (self.sectors.length > 1){
				mapping.forEach(d => { 
					if(self.sectors.includes(d.code)) valid.push(d);
				})
				
				setMapping(valid)
				matrix = cleanMatrix(valid, matrix)
			}else{
				let index = mapping.filter(d => d.code == self.sectors);
				if (index.length == 0){
					noDataInfo()
					return null;
				}
				index = index[0].index;
				let sum = 0;
				let j = -1; while (++j < matrix.length){
					sum += matrix[index][j]
				}
				if (d3.sum(matrix[index]) == 0 && sum == 0){
					noDataInfo()
					return;
				}
				
				matrix = sectorMatrix(index, matrix)
			}
			
			//--------------------------------------------------------------------------------------------
			// clean the matrix to contain only the sectors which are interacting with the chosen sector
			function sectorMatrix(index, matrix){
				let n_matrix = [],
					invalid = [];
					
				// keep only the sectors which have any exchange with the given location
				matrix.forEach( (d,i) => {
					if (matrix[index][i] != 0 || d[index] != 0 || i == index){
						n_matrix.push(d)
						valid.push(mapping.filter(d => d.index == i)[0])
					}else{
						invalid.push(i)
					}
				})
		
				matrix = [];
				n_matrix.forEach( row => {
					const n_row = [];
					row.forEach((val,j) => {
						if (!invalid.includes(j))
							n_row.push(val)
					})
					matrix.push(n_row)
				})
				setMapping(valid)

				return matrix;
			}
			

			//-----------------------------------------------------------------------------
			// clean the matrix to contain only the interaction among the chosen sectors
			function cleanMatrix(valid, matrix){
				let invalid = [],
					n_matrix = [];
				valid.forEach(i => {
					const row = [];
					let sum = 0;
					valid.forEach(j => {
						row.push(matrix[i.index][j.index])
						sum += matrix[j.index][i.index]
					})

					if (d3.sum(row) == 0 || sum == 0){
						invalid.push(mapping.filter(d => { return d.code == i.code; })[0])
					}
					n_matrix.push(row)
				})

				valid = mapping.filter(d => { return !invalid.includes(d); })
				setMapping(valid)
				
				if (invalid.length > 0) n_matrix = cleanMatrix(valid, n_matrix)
				return n_matrix
			}
			
			function setMapping(codes){
				mapping = []
				codes.forEach( (d,i) => {
					mapping.push({
						'code': d.code,
						'index': i,
						'name': d.name
					})
				})
			}

		}
		
		if (matrix.length == 0){
			noDataInfo()
			return null;
		}
		
		function noDataInfo(){
			const en = menu.language == 'en',
				width = self.div.node().clientWidth,
				height = self.div.node().clientHeight;
			
			self.div.select('.svg-content').append('text')
				.style('text-anchor', 'middle')
				.style('word-wrap', 'normal')
				.style('font-size', normalText)
				.attr('transform', () => transformString('translate', 0, height/2))
				.text((self.sectors.length > 1 ? 
						(en ? 'There is no flows exchanges within districts ' : 'Aucune échange de flux parmi les secteurs ') + self.sectors.join(', ') :
							(self.sectors == 0 ? (en ? 'There is no flow exchanges within the region ' : 'Aucune échange de flux dans la région ') :
						(en ? 'The district ' : 'Le secteur ') + self.sectors[0] + (en ? ' does not generate any flows' : 'ne génère aucun flux'))) +
						(self.time == 'individual' ? (en ? ' between ' : ' entre ') + 
								getTimeString(self.period) + (en ? ' and ' : ' et ') + getTimeString(self.period+1) : (en ? ' over 24 hours' : ' sur 24 heures')) + '.')
				.attr('id', 'nodata')
				.call(wrap, width, (width * .25) + (width * .75)/2)
				
			self.updateInfo(0, 0, 'clear')
		}
		
		return {'matrix': matrix, 'mapping': mapping}
		
	}
	
	updateFreezeText(){
		const self = this,
			en = menu.language == 'en';
		
		let text = '';
		if (self.ftime && self.fspace){
			text += en ? 'Time and space dimensions are freezed.' : 'Les dimensions spatial et temporelle sont figées.';
		}else if (self.ftime){
			text += en ? 'Time dimension is freezed.' : 'La dimension temporelle est figée.';
		}else if (self.fspace){
			text += en ? 'Space dimension is freezed.' : 'La dimension spatiale est figée.';
		}
		
		const svg = self.div.select('svg.svg-content');
		const info = svg.select('text#freeze-info');
		
		if (info.empty()){
			svg.append('text')
				.attr('id', 'freeze-info')
				.text(text)
				.style('font-size', smallText)
				.style('fill', 'red')
				.style('text-anchor', 'start')
				.attr('x', self.div.node().clientWidth * .2 + 5)
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
		self.partition = attrs.partition;
		self.sectors = attrs.sectors;
		self.time = attrs.time;
		self.space = attrs.space;
		self.category = attrs.category;
		self.period = attrs.period;
		self.client = attrs.client;
		self.window = attrs.window;
		self.ftime = attrs.ftime;
		self.fspace = attrs.fspace;
		self.details = attrs.details;
		
		const waitingText = self.div.append('text')
			.style('line-height', self.div.node().clientHeight + 'px')
			.text(labels['loading'][menu.language])
			
		d3.json(menu.getDataDirectory() + 'flows.json', function(error, data){
			if(error) throw error;
			
			data.forEach(d => {
				d.start = d.start[0],
				d.end = d.end[0],
				d.partition = d.partition[0],
				d.indicator = d.indicator[0],
				d.status = d.status[0],
				d.indexing = d.indexing[0],
				d.matrix = d.matrix[0]
			})
			
			self.data = data.filter(d => d.partition == self.partition && (d.indicator == 'general' || d.indicator == self.indicator))
			
			waitingText.remove();
			
			const width = self.div.node().clientWidth,
				height = self.div.node().clientHeight;
			
			const svg = self.div.append("svg")	
				.attr("preserveAspectRatio", "xMinYMin meet")
				.attr("viewBox", '0 0 ' + width + ' ' + height)
			  	.attr("width", width)
			  	.attr("height", height)
				.classed("svg-content", true);
			
			self.generateChords = d3.multichord()
			    .padAngle(.05)
			    .sortGroups((a, b) => { return b - a; })
			
			svg.append('text')
				.text(menu.language == 'en' ? 'The names of districts generating less than 5% of total flow volume are hidden.' :
					"Les noms des secteurs qui génèrent mois de 5% du volume total de flux sont masqués.")
				.style('font-size', '10px')
				.style('text-anchor', 'end')
				.attr('x', width)
				.attr('y', height - 5)	
				
			self.updateFreezeText();
			self.setInfo();
			self.loadChordDiagram();
			self.updateInfoDisplay();
		})
			
		
	}
	
	loadChordDiagram(){
		const self = this;
		
		const res = self.filterData();
		
		if (!res) return;
		if (!res.matrix) return;
		
		const matrix = res.matrix;
		self.mapping = res.mapping;
		
		
		const svg = self.div.select('.svg-content'),
			width = self.div.node().clientWidth,
			height = self.div.node().clientHeight,
			margin = {
				'top': 20, 
				'left': self.details ? width * .2 : 0
				},
			diagram = {
				'width': self.details ? width * .8 : width, 
				'height': height - 20
				};
		
		// ----------------------------------------------------------------
		// chart title
		
		let validSectors = self.mapping.map(d => d.code)
		let invalidSectors = Array.isArray(self.sectors) ? self.sectors.filter(x => !validSectors.includes(x)) : null;
		
		let left = width * 0.25,
			titleWidth = width * .75 - 50;
		let sectors = self.sectors.length == 1 ? self.mapping.filter(d => d.code == self.sectors[0])[0].name + ' (' + self.sectors[0] + ')' : 
			self.mapping.map(d => d.name + ' (' + d.code + ')').join(', ');
		
		function getTitle(){
			const aggregate_space = self.space == 'aggregate',
				region_name = menu.dataset.charAt(0).toUpperCase() + menu.dataset.slice(1),
				unique_sector = self.sectors.length == 1, 
				invalid = invalidSectors && invalidSectors.length > 0;
			
			return menu.language == 'en' ? 'Estimated flows exchanges ' +
					(!aggregate_space && unique_sector ? 'with the district of ' : 'within ') +
					(aggregate_space ? 'the region of ' + region_name : sectors) +
					(invalid ? '*' : '') :
						'Estimation des échanges de flux ' +
						(!aggregate_space && unique_sector ? 'avec le secteur de ' + sectors : 
						(aggregate_space ? 'dans la région de ' + region_name :  'parmi les secteurs ' + sectors) +
						(invalid ? '*' : '')) 
		}
					
		svg.append('text')
			.style('text-anchor', 'middle')
			.attr('transform', function(){ return transformString('translate', 0, 20);})
			.attr('id', 'title')
			.attr('font-size', titleText)
			.text(getTitle())
			.call(wrap, titleWidth - 5, left + titleWidth/2)
		
		if (invalidSectors && invalidSectors.length > 0){
			svg.append('text')
				.style('text-anchor', 'end')
				.attr('id', 'subtitle')
				.attr('transform', () => transformString('translate', width - 5, height - 20))
				.style('font-size', smallText)
				.text((menu.language == 'en' ? '*No data for districts ' : '*Aucune donnée pour les secteurs ') + invalidSectors.join(', '))
//				.call(wrap, titleWidth, left + titleWidth/2)
		}
			
		
		// diagram's variables
		const outerRadius = Math.min(diagram.width, diagram.height) * .4,
			innerRadius = outerRadius - 20;
		
		const arc = d3.arc()
		    .innerRadius(innerRadius)
		    .outerRadius(outerRadius);
	
		const ribbon = d3.ribbon()
			.radius(innerRadius)
			
		const targetArc = d3.arc()
	    	.innerRadius(innerRadius-5)
	    	.outerRadius(innerRadius)
	    	
	    // calculate the chords
		self.chordsData = self.generateChords(matrix)
		const chordGroups = self.chordsData.groups;
		
		const color = self.indicator == 'general' ? '#666666' : colorPalettes[self.indicator][self.category];
		let total = 0;
		self.chordsData.groups.forEach(d => {
			d.color = color;
			total += d.value.in + d.value.out;
		})
		
		self.chordsData.forEach(d => {
			if (d.source && d.target){
				d.source.color = color;
				d.target.color = color;
			}
		})	
		
		// ------------------------------------------------------
		// verify whether there is a ribbon selected
		let selected_chord = sessionStorage.getItem('selected-chord-'+this.id);
		let chord_index = null;
		
		if (!selected_chord){
			Object.keys(sessionStorage).map(function(d){
				if (d.match(/selected-chord/g)) {
					selected_chord = sessionStorage.getItem(d);
					sessionStorage.setItem('selected-chord-'+self.id, selected_chord)
				}
			})
		}

		if (selected_chord){
			const value = self.mapping.filter(s => { return s.code == selected_chord; });
			if (value.length > 0){
				chord_index = value[0].index;
				self.updateInfo(selected_chord, chord_index, 'add')
			}else{
				self.updateInfo(0, 0, 'clear')
				sessionStorage.removeItem('selected-chord'+self.id)
			}
		}else self.updateInfo(0, 0, 'clear')

			
		const g = svg.append("g")
		    .attr("transform", function(){ return transformString("translate", margin.left + diagram.width/2, height / 2 + margin.top); })
		    .datum(self.chordsData)
		    .attr('id', 'g-chords');
		
		// ------------------------------------------
		// spatial locations
		const groups = g.append('g').selectAll("g")
		  .data(function(chords) { return chords.groups; })
		  .enter().append("g");

		groups.append("path")
		    .style("fill", function(d) { return d.color; })
		    .style('fill-opacity', '1')
		    .style("stroke", function(d) { return d3.rgb(d.color).darker(); })
		    .attr("d", arc);
		
		// ticks and values
		const groupTick = groups.append("g")
		    .selectAll("g")
		    .data(d => groupTicks(d))
		    .enter().append("g")
		      .attr("transform", d => { return 'rotate('+ (d.angle * (180 / Math.PI) - 90) +') translate('+outerRadius+',0)';});
		
		groupTick.append("line")
		      .attr("stroke", "#000")
		      .attr("x2", d => d.value % 5 == 0 ? 6 : 3);

		groupTick.append("text")
		      .attr("x", 8)
		      .attr("dy", ".32em")
		      .attr("transform", d => d.angle > Math.PI ? "rotate(180) translate(-16)" : null)
		      .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
		      .style('font-size', normalText)
		      .text(d => d.value + '%')
		      .style('display', d => d.value % 5 == 0 && d.value > 0 ? 'block': 'none')
		
		var chords = g.append("g")
		  .selectAll("path")
		  .data(function(chords) {return chords;})
		  .enter().append("path")
		  	.classed('chord', true)
		    .attr("d", ribbon)
		    .style("fill", function(d) { return d.source.color; })
		    .style("stroke", function(d) { return d3.rgb(d.source.color).darker(); })
		    .style('display', function(d){
		    	if (typeof chord_index != 'number') return 'block';
		    	return d.source.index == chord_index || d.target.index == chord_index ? 'block' : 'none';
		    })
		
		// -----------------------------------
		// Sectors' names
		
		const distance = diagram.width/2 - 10;
		
		groups.append("text")
		  .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
		  .attr("dy", ".35em")
		  .attr("class", "titles")
		  .style('font-size', normalText)
		  .style('text-anchor', d => d.angle < Math.PI ? 'end' : null)
		  .style('font-size', normalText)
		  .attr("transform", function(d) {
			  let centroid = arc.centroid(d)
				return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
				+ (d.angle > Math.PI ? "rotate(180)rotate("+ (-d.angle *180/Math.PI) +')rotate(-90)' : "rotate("+ (-d.angle*180/Math.PI) +')rotate(90)') 
				+ transformString('translate', d.angle > Math.PI ? -distance : distance, centroid[1] - 7)
		  })
		  .text(d => self.getName(d.index) + ' (' + self.getCode(d.index) + ')')
		  .style('display', d => (d.value.in + d.value.out) / total < 0.05 ? 'none' : 'block')
//		  .call(wrap, d => arc.centroid(d)[0] + distance, 0)
		
		groups.append('line')
			.each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
			.attrs(d => {
				let centroid = arc.centroid(d)
				return {
					'x1': centroid[0],
					'x2': d.angle > Math.PI ? -distance : distance,
					'y1': centroid[1],
					'y2': centroid[1]
				}
			})
			.style('stroke', '#636363')
			.style("stroke-dasharray", ("3, 3"))
			.style('display', d => (d.value.in + d.value.out) / total < 0.05 ? 'none' : 'block')
		
		
		// ----------------------------------------
		// White arcs indicating the arriving flows
		var curves = g.append("g")

	    curves.selectAll("path")
	        .data(d => d) 
	        .enter()
	        	.append("path")
	        	.each(arcFunction)
	        	.style("fill", 'white')
	        	.style('stroke', 'white')
		
		// Function called for each path appended to increase scale and iterate.
	    function arcFunction(d, i){
	    	var startAngle = d.source.index == d.target.index ? 0 : d.target.startAngle;
	    	var endAngle = d.source.index == d.target.index ? 0 : d.target.endAngle;
	    	
	        return d3.select(this)
	        	.attr("d", targetArc.startAngle(startAngle).endAngle(endAngle))
	    }
	    

		// Returns an array of tick angles and values for a given group and step.
		function groupTicks(d, step) {
			const proportion = ((d.value.in + d.value.out) / total) * 100;
			const k = (d.endAngle - d.startAngle) / proportion;
			return d3.range(0, proportion, 1).map(value => {
				return {value: value, angle: value * k + d.startAngle};
			});
		}
	}
	
	// ---------------------------------------------------------------
	// info panel
	
	updateInfo(sector, index, action){
		const self = this;
		
		const width = self.div.node().clientWidth,
	    	height = self.div.node().clientHeight,
	    	box = {'height' : height, 'width': width * .2, 'top': 0},
	    	svg = self.div.select('.svg-content'),
	    	en = menu.language == 'en';
		
		// select the group element to hold the info
		const group = svg.select('g#info-body')
		group.selectAll('g').remove()
		group.selectAll('text').remove()
		
		self.updateInfoTitle()
		
		if (action == 'clear'){
			group.append('text')
				.style('font-size', normalText)
				.attr('transform', transformString('translate', 0, (box.height)/2))
				.style('text-anchor', 'middle')
				.text(en ? 'Select a district on the map' : 'Séléctionnez un secteur sur la carte')
				.call(wrap, box.width - 5, box.width/2)
			return;
		}
		
		//---------------------------------------------
		// calculate the inner, out and in flows
		let total = 0;
		self.chordsData.groups.forEach(d => { total += d.value.in + d.value.out; })
		
		const chordsGroup = self.chordsData.groups[index];
		const totalGroup = chordsGroup.value.in + chordsGroup.value.out;
		
		const ribbons = self.chordsData.filter(d => {
			if (d.source && d.target) return d.source.index == index || d.target.index == index;
			else return false;
		})
		
		const data = {
			'inner' : [],
			'out': [],
			'in': []
		}

		ribbons.forEach(d => {
			if ((self.time == 'aggregate' || self.space == 'aggregate') && (d.source.value/totalGroup) < 0.01) return;
			if (d.source.index == d.target.index){
				data['inner'].push({
					'sector': sector,
					'value': d.source.value,
				})
			}else if(d.source.index == index){
				data['out'].push({
					'sector': self.getCode(d.target.index),
					'value': d.target.value,
				})
			}else{
				data['in'].push({
					'sector': self.getCode(d.source.index),
					'value': d.source.value,
				})
			}
		})
		
		// ---------------------------------------------
		// load the text on the box
		
		let top = parseInt(svg.select('line#separator').node().y1.baseVal.value) + 20;
		
		let text;
		text = group.append('text')
			.attr('transform', transformString('translate', box.width/2, top))
			.style('text-anchor', 'middle')
			.style('font-size', normalText)
			.text(self.getName(index) + ' (' + self.getCode(index) + ')')
			.call(wrap, box.width, 0)
			
		text.style('font-weight', 'bold')
		
		top += (text.node().childNodes.length * 12) + 10;
		
		if (self.category){
			let total = 0;
			let generalIndex = self.generalMapping.filter(d => d.code == sector)[0].index;
			self.generalChordsData.groups.forEach(d => {
				if (d.index == generalIndex)
					total += d.value.in + d.value.out;
			})
			
			function isSingular(){
				return self.indicator == 'modes' || ['home', 'working'].includes(self.category)
			}
			
			text = group.append('text')
				.style('text-anchor', null)
				.style('font-size', normalText)
				.attr('transform', transformString('translate', 0, top))
				.text(labels[self.category][menu.language] + (en ? ' generates ' : (isSingular() ? ' génère ' : ' génèrent ')) + 
						((totalGroup/total) * 100).toFixed(2) + 
						(en ? '% of total flow exchanges for this district.' : "% du total des échanges de flux pour ce secteur"))
				.call(wrap, box.width - 5, 5)
				
			top += (text.node().childNodes.length * 12) + 10;
		}
		
		text = group.append('text')
			.style('text-anchor', null)
			.style('font-size', normalText)
			.attr('transform', transformString('translate', 0, top))
			.text((en ? 'This district generates ' : 'Ce secteur génère une échange des flux totale de ') + 
					(totalGroup/total*100).toFixed(2) + '% ('+ Math.trunc(totalGroup).toLocaleString(menu.language) + (en ? ' trips)' : ' déplacements)') + 
					(en ? ' of total flow exchanges within the selection.' : ' dans la sélection.'))
			.call(wrap, box.width - 5, 5)
			
		top += text.node().childNodes.length * 12;
		
		group.selectAll('g').remove()
		
		addText(data.inner, 'inner')
		addText(data.out.sort((a,b) => b.value - a.value), 'out')
		addText(data.in.sort((a,b) => b.value - a.value), 'in')
		
		function addText(data, type){
			let label = '';
			switch (type){
			case 'inner':
				label = data.length > 0 ? (en ? 'Inner flows: ' : 'Flux internes : ') : (en ? 'There are no inner flows' : "Il n'y a pas de flux internes");
				break;
			case 'out':
				label = data.length > 0 ? (en ? 'Output flows to: ' : 'Flux sortant vers : ') : (en ? 'There are no output flows' : "Il n'y a pas de flux sortants");
				break;
			case 'in':
				label = data.length > 0 ? (en ? 'Input flows from: ' : 'Flux entrants de : ') : (en ? 'There are no input flows' : "Il n'y a pas de flux entrants");
				break;
			}
			
			const textGroup = group.append('g')
				.classed('values-group', true)
			
			textGroup.append('text')
				.style('fill', '#000')
				.style('font-size', normalText)
				.style('font-weight', 'bold')
				.attr('transform', transformString('translate', 5, top += 15))
				.text(label)
			
			const valuesGroup = textGroup.selectAll('g')
				.data(data)
				.enter()
					.append('g')
					
			valuesGroup.append('text')
				.style('fill', '#000')
				.style('font-size', normalText)
				.style('font-weight', type == 'inner' ? 'normal' : 'bold')
				.attr('transform', (d, i) => { return transformString('translate', 10, top + 15 * (i + 1)) ;})
				.text(d => type == 'inner' ? (d.value / totalGroup * 100).toFixed(2) + '% (' + Math.trunc(d.value).toLocaleString() +')' : d.sector + ':  ')
					
			valuesGroup.append('text')
				.style('fill', '#000')
				.style('font-size', normalText)
				.attr('transform', (d, i) => { return transformString('translate', 30, top + 15 * (i + 1));})
				.text(d => {
					if (type == 'inner') return;
					return (d.value / totalGroup * 100).toFixed(2) + '% (' + Math.trunc(d.value).toLocaleString() +')'
				})
					
			top += 15 * data.length;
		}	
	}
	
	updateInfoTitle(){
		const period = this.time == 'aggregate' ? (menu.language == 'en' ? ' 24 hours' : ' 24 heures') : 
			getTimeString(this.period) + ' - ' + getTimeString(this.period+1);
		const width = this.div.node().clientWidth;
		this.div.select('#info-text-1')
			.text((menu.language == 'en' ? 'Time Interval: ' : 'Période de temps : ') + period)
			.call(wrap, width * .25, 0)
	}
	
	updateInfoDisplay(){
		const self = this;
		this.div.select('g#info-body').style('display', self.details ? 'block' : 'none')
	}
	
	//---------------------------------------
	// Load the info space
	setInfo(){
		const self = this;
		
		const width = self.div.node().clientWidth,
	    	height = self.div.node().clientHeight,
	    	box = {'height' : height, 'width': width * 0.2, 'top': 0, 'title': width * .25},
			svg = self.div.select('.svg-content'),
			en = menu.language == 'en';
		
		let group = svg.append('g')
						
		const period = self.time == 'aggregate' ? (en ? ' 24 hours' : ' 24 heures') : 
			getTimeString(self.period) + ' - ' + getTimeString(+self.period+1);
		
		let	data = [(en ? 'All trip purposes and modes of transport combined' : 'Tous les motifs et modes de transport confondus'), 
				(en ? 'Time Interval: ' : 'Période de temps : ') + period];
		
		if (self.indicator != 'general'){
			data[0] = labels[self.indicator][menu.language] + (en ? ': ' : ' : ') + labels[self.category][menu.language]
		}
		
		const texts = group.selectAll('text')
			.data(data)
			.enter()
				.append('text')
				.text(d => d)
				.attr('id', (d,i) => 'info-text-'+i)
				.style('font-size', normalText)
				.call(wrap, box.title, 0)
		
		let lineY = 0;
		texts.attr('transform', function(d,i) {
			const sibling = this.previousSibling;
			if (sibling && sibling.nodeName == 'text'){
				lineY += 15 + (sibling.childNodes.length * 15) * i;
				return transformString('translate', 5, box.top + 20 + (sibling.childNodes.length * 15) * i)
			}
			lineY += box.top + 15;
			return transformString('translate', 5, box.top + 15)
		})
		
		group.append('line')
			.attrs({
				'x1': 0,
				'x2': box.width,
				'y1': lineY,
				'y2': lineY,
				'id': 'separator'
			})
			.styles({
				'stroke': '#808080',
				'stroke-dasharray': ('3', '3')
			})
		
		const infoGroup = group.append('g')
			.attr('id', 'info-body')
			
		infoGroup.append('line')
			.attrs({
				'x1': box.width,
				'x2': box.width,
				'y1': lineY,
				'y2': height
			})
			.style('stroke', '#808080')
			.style('stroke-dasharray', '3')
	
		infoGroup.append('text')
			.attr('transform', transformString('translate', 0, box.top + (box.height + lineY)/2))
			.style('text-anchor', 'middle')
			.style('font-size', normalText)
			.text(en ? 'Select a district on the map' : 'Séléctionnez un secteur sur la carte')
			.call(wrap, box.width - 5, box.width/2)
			
		const res = self.filterData(true);
		if (!res) return;
		if (!res.matrix) return;
		
		self.generalMapping = res.mapping;
		self.generalChordsData = self.generateChords(res.matrix)
			
	}
	
}