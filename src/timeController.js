/**
 * 
 */

class TimeController{
	constructor(){
		this.type = 'linear';
		this.period = 0;
		this.timeActive = false;
		this.interaction = 'animation';
		this.position = 'right';
	}
	
	getPeriod(){
		return this.period;
	}
	
	isTimeActive(){
		return this.timeActive;
	}
	
	init(){
		var recover = sessionStorage.getItem('period');
		this.period = recover ? +recover : 4;
		
		var recover = sessionStorage.getItem('handle-position');
		this.linhandle = recover ? JSON.parse(recover) : {};
		
		var recover = sessionStorage.getItem('handle');
		this.cychandle = recover ? JSON.parse(recover) : {};
		
		this.loadTimeline();
		
		document.getElementById("linear").style.width = '0px';
		document.getElementById("linear").style.height = '0px';
	}
	
	setAttrs(attrs){
		this.type = attrs.type || this.type;
		this.period = +attrs.period || this.period;
		this.interaction = attrs.interaction || this.interaction;
		this.position = attrs.position || this.position;
		
		this.set();
		
		deviceMotion.setType(this.type);
	}
	
	set(){
		const self = this;
		
		clear().then(load())
		
		function clear(){
			return new Promise(function(fulfill, reject){
				document.getElementById("linear").style.width = '0px';
				document.getElementById("linear").style.height = '0px';
				fulfill();
			})
		}
		
		function load(){
			document.getElementById("linear").style.width = '100vw';
			document.getElementById("linear").style.height = '80px';
			
			self.linhandle.x = self.linhandle.scale(self.period + 0.5);
			self.updateHandler(self.period + 0.5);			
		}
	}


	pausePlayInteraction(origin){
		const self = this;
		
		if (origin == 'menu') self.timeActive = false;
		else self.timeActive = !self.timeActive;
		
		deviceMotion.setActive(self.timeActive)
		
		d3.selectAll("#pause-button")
			.attr("xlink:href", !self.timeActive ? "images/play.svg" : "images/pause.svg");
	}

	update(value){

		if (isNaN(value)) return;
	
		value = this.inverseScale(value);
		let period = Math.trunc(value);
		
		if (period == this.period) return;
		this.updateHandler(value);
		
		this.period = period;
		
		// update the controller directly
		const map = menu.dashboard.views.map;
		if (map.length > 0) map[0].update(period);
		
		const msg = createJSONMessage("time-period", {
			'sender': client.getUsername(),
			'period': period
		});
		client.wsSendMessage(msg);
		
		sessionStorage.setItem('period', period)
	}


	clearTimeSelector(){
		var element = d3.select("svg#interactive_time_selector");
		if (element._groups[0]) element.remove();
	}

	inverseScale(value){
		this.linhandle.x = this.linhandle.scale.invert(value);
		return this.linhandle.x;
	}

	updateHandler(x){
		const self = this;
		d3.select('#linear-handler')
			.attrs({
				'cx': self.linhandle.scale(x),
				'cy': 0
			})
			
		sessionStorage.setItem('linear-handle', JSON.stringify(self.linhandle));
	}

	loadTimeline(){
		var self = this;
		
		var margin = {top:0, right:150, bottom:0, left:0};
		
		var div = d3.select("div#linear")
			.style("width", '100vw')
			.style('height', '80px')
		
		const width = div.node().clientWidth,
			height = div.node().clientHeight;
		
		var svg = div.append("svg")
		  	.attr("preserveAspectRatio", "xMinYMin meet")
		  	.attr("viewBox", '0 0 ' + width + ' ' + height)
		  	.attr("width", width)
		  	.attr("height", height)
		  	.classed("svg-content", true);
		 
		const sliderWidth = width - margin.left - margin.right;
		const sliderHeight = height;
		var rectWidth = sliderWidth/23;
		var rectHeight = 5;
		var timer;
					
		self.linhandle.scale = d3.scaleLinear()
		    .domain([4, 28])
		    .range([0, sliderWidth])
		    .clamp(true);
		
		var slider = svg.append("g")
		    .attr("class", "slider")
		    .attr("transform", function() { return transformString('translate', (rectWidth + 50), sliderHeight * 0.4); })
		    .attr('id', 'linear-slider')
				
		var playButton = slider.append("svg:image")
			.attr("xlink:href", function(){ return self.timeActive ? "images/pause.svg" : "images/play.svg"; })
			.attr("transform", function() { return transformString('translate', -rectWidth - 40, sliderHeight/2 - (sliderHeight * 0.8)); })
			.attr("height", sliderHeight * 0.8)
			.attr("width", sliderHeight * 0.8)
			.attr('x', '0px')
			.attr('y', '0px')
			.style('cursor', 'pointer')
			.attr("id", "pause-button")
			.on("click", function() {
				self.pausePlayInteraction();
			  })

		slider.append("line")
		    .attr("class", "track")
		    .attr("x1", self.linhandle.scale.range()[0])
		    .attr("x2", self.linhandle.scale.range()[1])
		  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		    .attr("class", "track-inset")
		  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		    .attr("class", "track-overlay")
		    .call(d3.drag()
		        .on("start.interrupt", function() { slider.interrupt(); })
		        .on("start drag", function() {
		        	self.linhandle.x = d3.event.x;
		        	self.update(self.linhandle.x)
		        })
		        .on('end', function(){
		        	if (self.interaction == 'movement') return; 
		        })
		    );
		
		var elements = slider.insert("g", ".track-overlay")
		    .attr("class", "ticks")
		    .attr("transform", "translate(0," + rectHeight + ")")
		  .selectAll("g")
		    .data(self.linhandle.scale.ticks(23))
		    .enter();
			
		elements.append("text")
		    .attr('x', d => self.linhandle.scale(d))
		    .attr("y", rectHeight * 4)
		    .attr("text-anchor", "middle")
		    .attr('class', 'noSelect')
		    .text(function(d) { return formatHour(d, 'fr'); });
		
		self.linhandle.y = -rectHeight;
		self.linhandle.x = self.linhandle.scale(self.period + 0.5);
		
		var handler = slider.insert('circle', '.track-overlay')
			.attr('id', 'linear-handler')
			.attr("r", 10)
			.attr("stroke", "black")
			.attr("stroke-width", 1)
			.attr('class', 'handle')
			.attrs({
				'cx': self.linhandle.scale(self.period + 0.5),
				'cy': 0
			})
		
		function step() { 
			self.linhandle.x = self.linhandle.x + (sliderWidth/151)  ;
			if (self.linhandle.x > sliderWidth) {
				self.linhandle.x = 0;
			}
			self.update(self.linhandle.x)
		}
		
	}
}