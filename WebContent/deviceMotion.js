/**
 * 
 */

class DeviceMotion{
	constructor(){
		
	}
	
	setType(value){
		this.type = value;
	}
	
	setActive(value){
		this.active = value;
	}
	
	computePeriod(e){
		if (!this.active) return;
		
		var platform = navigator.platform.split(' ');

		const threshold = 20;
		var value = platform[1] == 'armv7l' ? e.gamma : e.beta; // test for the other tablet
//		const value = e.beta;
		let beta = Math.abs(value) > threshold ? threshold * Math.sign(value) : value;
		beta += threshold;
	
		const width = window.innerWidth;
		
		const position = (width * beta)/(threshold * 2);
		menu.timeController.update(position);
	}
}


