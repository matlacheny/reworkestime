/**
 * 
 */

var Element = function(attrs){
	this.label = attrs.label || 'Not labeled'
	this.indicator = attrs.indicator;
	this.type = attrs.type || 'view';
	this.space = attrs.space || 'aggregated';
	this.partition = attrs.partition || 't30';
	this.client = attrs.client;
	this.window = attrs.window;
	this.depiction = attrs.depiction;
	this.time = attrs.time || 'aggregated';
	this.children = attrs.children || [];
	this.sectors = attrs.sectors || 0;
	this.category = attrs.category; // activity, modes or classes
	this.period = attrs.period;
	this.fspace = false;
	this.ftime = false;
	this.fzoom = false;
	this.rep = attrs.rep; // representation, only valid for maps : number or percentage
	this.selected = attrs.selected; // for the index plot, passes the selected trajectories from the cube
	this.dataset = attrs.dataset;
	this.customize = attrs.customize;
}