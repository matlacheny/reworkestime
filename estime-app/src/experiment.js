/**
 * 
 */

var Experiment = function(){
	this.phase = 0;
	this.data = [];
	this.task = null;
	this.username = null;
	this.running = false;
	this.periods = [];
	this.zoomLevels = [];
	this.selectedSectors = [];
	this.views = [];
	this.sector = '';
}

Experiment.prototype.getCondition = function(){
	return this.condition;
}

Experiment.prototype.loadIcon = function(){
	var self = this;
	var div = d3.select('div#header').append('div')
		.classed('test-icon', true)
		.on('click', function() { self.open(); });
	
	var svg = div.append('svg')
		.attr('width', '45px')
		.attr('height', '45px')
		.attr('transform', transformString('translate', 10, 0));
	
	svg.append('svg:image')
		.attr("xlink:href", "images/testIcon.svg")
		.attr('height', '45px');
}

Experiment.prototype.loadFile = function(){
	var self = this;
	d3.json('data/experiment.json', function(error, data){
		self.data = data;
		
		sessionStorage.setItem("experiment", JSON.stringify(self.data));
	});
}

Experiment.prototype.recoverSession = function(){
	var self = this;
	var recover = sessionStorage.getItem('experiment');
	
	if (recover) self.data = JSON.parse(recover);
	else{
		self.loadFile();
	}
	
	recover = sessionStorage.getItem('current-phase');
	self.phase = recover ? recover : 0;
	
	recover = sessionStorage.getItem('current-task');
	self.task = recover ? JSON.parse(recover) : null;
	
	recover = sessionStorage.getItem('zoom-list');
	self.zoomLevels = recover ? JSON.parse(recover) : [];
	
	recover = sessionStorage.getItem('sectors-list');
	self.selectedSectors = recover ? JSON.parse(recover) : [];

	recover = sessionStorage.getItem('running');
	self.running = recover ? recover : false;
	
	recover = sessionStorage.getItem('periods_list');
	self.periods = recover ? JSON.parse(recover) : [];
	
	recover = sessionStorage.getItem('views-list');
	self.views = recover ? JSON.parse(recover) : [];
	
	recover = sessionStorage.getItem('sector-exp');
	self.sector = recover ? recover : '';
} 

Experiment.prototype.getPhase = function(){
	return this.phase;
}

Experiment.prototype.saveTime = function(start){
	
	var self = this;
	var date = new Date();
	
	self.data[self.phase].children.forEach(function(c){
		if(c.index == self.task.index){
			if(start) if (!c.start) c.start = [date.getHours(), date.getMinutes(), date.getSeconds()];
			else c.end = [date.getHours(), date.getMinutes(), date.getSeconds()];
		}
	})
	
	sessionStorage.setItem("experiment", JSON.stringify(self.data));
}

Experiment.prototype.isRunning = function(){
	return this.running;
}


Experiment.prototype.logPeriod = function(interaction, value){
	if (!this.running) return;
	var date = new Date();
	this.periods.push({
		'time': [date.getHours(), date.getMinutes(), date.getSeconds()],
		'interaction': interaction,
		'value': value
	})
	sessionStorage.setItem('periods_list', JSON.stringify(this.periods));
}

Experiment.prototype.logZoom = function(value){
	if (!this.running) return;
	var date = new Date();
	this.zoomLevels.push({
		'time': [date.getHours(), date.getMinutes(), date.getSeconds()],
		'value': value
	})
	sessionStorage.setItem('zoom-list', JSON.stringify(this.zoomLevels));
}

Experiment.prototype.logSector = function(action, value){
	if (!this.running) return;
	var date = new Date();
	this.selectedSectors.push({
		'time': [date.getHours(), date.getMinutes(), date.getSeconds()],
		'action': action,
		'value': value
	})
	sessionStorage.setItem('sectors-list', JSON.stringify(this.selectedSectors));
}

Experiment.prototype.logView = function(element){
	//console.log(this)
	if (!this.running) return;
	//console.log(element);
	var date = new Date();
	this.views.push({
		'time': [date.getHours(), date.getMinutes(), date.getSeconds()],
		'indicator': element.indicator,
		'time_g': element.time,
		'space': element.sector
	})
	//console.log(this.views)
	sessionStorage.setItem('views-list', JSON.stringify(this.views));
}


Experiment.prototype.reset = function(){
	this.loadFile();
	this.phase = 0;
	this.task = null;
	this.periods = [];
	this.views = [];
	this.selectedSectors = [];
	this.zoomLevels = [];
	this.running = false;
	this.sector = '';
	
	sessionStorage.removeItem('periods_list');
	sessionStorage.removeItem('zoom-list');
	sessionStorage.removeItem('views-list');
	sessionStorage.removeItem('sectors-list');
	sessionStorage.removeItem('current-task');
	sessionStorage.removeItem('current-phase');
	sessionStorage.removeItem('running');
	sessionStorage.removeItem('sector-exp');
	
}

Experiment.prototype.open = function(){
	var self = this;
	var html = addSettings();
	
	if (!self.running){
		
		html += "<b>Identifiant du participant :</b> " + controller.workspace.getUsername() + '<br>' +
			"<b>Secteur d'interêt :</b> <textarea rows='1' cols='10' id='sector-interest'>" + self.sector + '</textarea> <br>' +
		    '<button type="button" role="button" tabindex="0" class="StartBtn customSwalBtn">' + 'Commencer' + '</button>';
		
		swal({
		  title: 'Gestionnaire de Tâches',
		  html: html,
		  showCancelButton: false,
		  showConfirmButton: false,
		  showCloseButton: true,
		  width: '1000px'
		});
	}else{
		//console.log(self.data)
		var data = self.data[self.phase];
		//console.log(data)

		self.task = null;
		for (var i = 0, length = data.children.length; i < length; i++){
			if (!data.children[i].next){
				self.task = data.children[i];
				break;
			}
		}
		
		//console.log(self.task);
		//console.log(self.periods);
		//console.log(self.zoomLevels);
		//console.log(self.views);
		
		sessionStorage.setItem('current-task', JSON.stringify(self.task));
		
		if (!self.task){
			
			if (self.phase == 0){
				html += "<b>L'étape d'entraînement est terminée ! Vous allez passer maintenant aux questions.</b> <br>" +
			    '<button type="button" role="button" tabindex="0" class="OkBtn customSwalBtn" id="display_button">' + 'OK' + '</button>';
			}else{
				html += "<b>L'étape des questions est terminée ! Merci de bien vouloir répondre le questionnaire d'utilisabilité et charge de travail sur l'ordinateur.</b> <br>" +
			    '<button type="button" role="button" tabindex="0" class="OkBtn customSwalBtn" id="display_button">' + 'OK' + '</button>';
			}
			
			$(document).on('click', '.OkBtn', function() {
				swal.clickConfirm();
				self.phase += 1;
				sessionStorage.setItem('current-phase', self.phase);
				
				if (self.phase > 1) self.saveResults();
				else self.open()
				
			})
			
			swal({
				title: 'Gestionnaire de Tâches',
				html: html,
				showCancelButton: false,
				showConfirmButton: false,
				showCloseButton: false,
				width: '1000px'
			})
			
			return;
		}
		
		html += '<b>Identifiant du participant :</b> ' + controller.workspace.getUsername() + '<br><br>' + '<b>' + data.label + '</b><br><br>';
		
		if (typeof self.task.label == 'string'){
			html += self.task.label ;
		}else{
			html += self.task.label[0] + self.sector + self.task.label[1];
		}
		
		if (self.task.indicator)
			html += self.task.indicator; 
			
		if (self.task.howto){
			self.task.howto.forEach(function(e){
				html += e + '</p>';
			})
		}
		
		if (!self.task.howto)
			html += "<input type='checkbox' name='help' value='help' id='check-help'> J’ai demandé de l’aide à l’enseignant <br>";
		
		html += "<br>";
		
		if (self.task.index > 1){
			html += '<button type="button" role="button" tabindex="0" class="TaskBtn3 customSwalBtn">' + 'Précedente' + '</button>';
		}
		
		if (self.task.start){
			html += '<button type="button" role="button" tabindex="0" class="TaskBtn2 customSwalBtn">' + 'Revenir sur la carte' + '</button>' +
			    '<button type="button" role="button" tabindex="0" class="TaskBtn1 customSwalBtn">' + 'Suivante' + '</button>';
		}else{
			html += '<button type="button" role="button" tabindex="0" class="TaskBtn2 customSwalBtn">' + 'Commencer' + '</button>';
		}
		
		
		
		swal({
			title: 'Gestionnaire de Tâches',
			html: html,
			showCancelButton: false,
			showConfirmButton: false,
			allowOutsideClick: false,
			showCloseButton: false,
			width: '1000px'
		})
		
	}
	
	$(document).on('click', '.StartBtn', function() {
		event.stopPropagation();
		event.preventDefault();
		
		self.sector = document.getElementById('sector-interest').value;
		sessionStorage.setItem('sector-exp', self.sector);
		
		if (self.sector.length == 0){
			swal.getContent().firstChild.innerHTML += '<br> <p style="text-align:center; color:red">You must select a sector to start the experiment!.</p>';
		}else{
			self.running = true;
			sessionStorage.setItem('running', true);
			
			swal.clickConfirm();
			
			self.open();
		}
	});
	
	$('.TaskBtn3').off('click').one('click', function(){
		event.stopPropagation();
		event.preventDefault();
		
		var date = new Date();
		self.data[self.phase].children.forEach(function(c){
			
			if (c.index == self.task.index-1){
				c.next = false;
				
				self.periods = c.periods;
				self.zoomLevels = c.zoom;
				self.selectedSectors = c.sectors;
				self.views = c.views;
			}
		})
		
		sessionStorage.setItem('periods_list', JSON.stringify(self.periods));
		sessionStorage.setItem('zoom-list', JSON.stringify(self.zoomLevels));
		sessionStorage.setItem('views-list', JSON.stringify(self.views));
		sessionStorage.setItem('sectors-list', JSON.stringify(self.selectedSectors));
		
		swal.clickConfirm();
		
		self.open();
		
	})
	
	$('.TaskBtn1').off('click').one('click', function(){
		event.stopPropagation();
		event.preventDefault();
		var checkedValue = document.querySelector('#check-help:checked');
		
		var date = new Date();
		self.data[self.phase].children.forEach(function(c){
			if (c.index == self.task.index){
				c.end = [date.getHours(), date.getMinutes(), date.getSeconds()];
				
				c.periods = self.periods;
				c.zoom = self.zoomLevels;
				c.sectors = self.selectedSectors;
				c.views = self.views;
				c.help = checkedValue ? 'yes' : 'no';
				c.next = true;
			}else if (c.index == self.task.index + 1){
				self.periods = c.periods || [];
				self.zoomLevels = c.zoom || [];
				self.selectedSectors = c.sectors || [];
				self.views = c.views || [];
			}
		})
		
		/*console.log(self.periods);
		console.log(self.selectedSectors)
		console.log(self.views);
		console.log(self.zoomLevels)*/
		sessionStorage.setItem('periods_list', JSON.stringify(self.periods));
		sessionStorage.setItem('zoom-list', JSON.stringify(self.zoomLevels));
		sessionStorage.setItem('views-list', JSON.stringify(self.views));
		sessionStorage.setItem('sectors-list', JSON.stringify(self.selectedSectors));
		
		swal.clickConfirm();
		
		self.open();
		
	})
	
	$(document).on('click', '.TaskBtn2', function() {
		event.stopPropagation();
		event.preventDefault();
		if (self.phase != 'training')
			self.saveTime(true);
		
		swal.clickConfirm();
	})
	
	function addSettings(){
		
		
		var html = '<div class="exp-settings" style="display: block;">' +
   	   		'<svg>' +
   				'<image xlink:href="images/settings-exp.svg" width="40px" height="40px"></image></svg></div>'
   	   	
   	   	
   	   	$(document).on('click', '.exp-settings', function() {
   	   		event.stopPropagation();
   	   		event.preventDefault();
	   	   	swal({
				title: "Enter your admin password",
				input: 'text',
				showCancelButton: true
			}).then((result) => {
				if (result.value == 'admin159'){
					loadSettingsPage();
				}
			})
   	   		//swal.clickConfirm();
   	   		//loadSettingsPage();
   	   	})
   	   	
   	   	function loadSettingsPage(){
			var div = d3.select('body').append('div')
				.styles(function(){
					var left = window.innerWidth/2 - 125 + 'px';
					var top = window.innerHeight/2 - 75 + 'px';
					return {
						'z-index': '1200',
						'width': '250px',
						'height': '165px',
						'top': top,
						'left': left,
						'background-color': 'white',
						'position': 'absolute'
					}
				})
				
			div.append('label')
				.classed('item', true)
				.style('font-size', '20px')
				.style('border-style', 'solid')
				.style('border-color', '#cccccc')
				.style('border-width', '0px 0px 1px 0px')
				.style('line-height', '50px')
				.text('Experiment Settings')
			
			var data = ['Reset', 'Download Results'];
			var group = div.selectAll('button')
				.data(data)
				.enter()
				.append('button')
					.classed('dropbtn', true)
					.styles(function(d){
						return{
							'font-size': '12px',
							'border': '2px solid #cccccc',
							'background-color': d.selected ? 'black' : '#cccccc',
							'color': d.selected ? 'white' : 'black',
							'margin-left': '10px',
							'margin-top': '10px'
						}
					})
					.text(d => d)
					.on('click', function(d){	
						const toast = swal.mixin({
							  toast: true,
							  position: 'top-end',
							  showConfirmButton: false,
							  timer: 3000
							});
						
						if (d == 'Reset'){
							self.reset();
							toast({
							  type: 'success',
							  title: 'The experiment has been reseted!'
							})
						}else{
							self.saveResults();
							toast({
							  type: 'success',
							  title: 'The results have been downloaded!'
							})
						}
					})
			
			var buttons = div.append('div')
				.styles({
					'width': '100%',
					'height': '50px',
					'bottom': '0px',
					'border-style': 'solid',
					'border-color': '#cccccc',
					'border-width': '1px 0 0 0',
					'background-color': 'white',
					'margin-top': '10px',
					'float': 'left'
				})
			
			/*buttons.append('button')
				.text('OK')
				.classed('dropbtn', true)
				.style('float', 'right')
				.style('color', '#468499')
				.style('padding', '17px')
				.on('click', function(){
					div.styles({
						'width': '0px',
						'height': '0px'
					})
				})*/
				
				
			buttons.append('button')
				.text('Close')
				.classed('dropbtn', true)
				.style('float', 'right')
				.style('color', '#468499')
				.style('padding', '17px')
				.on('click', function(){
					div.remove();
				})
		}
   	   	
   	   	return html;
	}
	
}


Experiment.prototype.saveResults = function(){
	var self = this;
	
	var table = [];
	
	function createTable(){
		return new Promise(function(fulfill, reject){
			table.push(['user', 'phase', 'task', 'start_hour', 'start_min', 'start_sec', 'end_hour', 'end_min', 'end_sec', 'help', 'periods', 'zoom', 'views', 'sectors']);
			self.data.forEach(function(d){
				d.children.forEach(function(c){
					table.push([controller.workspace.getUsername(),
						d.value,
						c.label, 
						c.start ? c.start[0] : 'NA', 
						c.start ? c.start[1] : 'NA', 
						c.start ? c.start[2] : 'NA',
						c.end ? c.end[0] : 'NA', 
						c.end ? c.end[1] : 'NA',
						c.end ? c.end[2] : 'NA',
						c.help || 'NA', 
						c.periods ? JSON.stringify(c.periods) : 'NA',
						c.zoom ? JSON.stringify(c.zoom) : 'NA',
						c.views ? JSON.stringify(c.views) : 'NA',
						c.sectors ? JSON.stringify(c.sectors) : 'NA'
					]);
				})
			})
			
			fulfill(table)
		})
	}
	
	createTable().then(function(){
		var date = new Date();
		
		//console.log(table)
		var fileName = date.getHours()+'_'+date.getMinutes()+'_'+date.getSeconds()+'_'+controller.workspace.getUsername()+'.csv';
		exportToCsv(fileName, table);
		
		self.reset();
	})
	
}