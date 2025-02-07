/**
 * This file contains the global objects used to control the visualizations
 */

window.addEventListener("load", function() { window.scrollTo(0, 0); });

const host = window.location.host.split(':');
const client = new Client('ws', host[0], host[1])

const stcClient = new STCWebSocket('ws', 'menina', '10433')

const deviceMotion = new DeviceMotion();
if (window.DeviceOrientationEvent)
	window.addEventListener('deviceorientation', function(e) { deviceMotion.computePeriod(e); }, false);
else console.log("Sorry, your browser doesn't support Device Orientation");

const menu = new Menu();
menu.prepare()

const guide = new Guide();
guide.setTourGuides()

//const mapboxLink = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?',
//mapboxLink2 = 'https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?',
//accessToken = 'access_token=pk.eyJ1IjoibGluZW1lbmluIiwiYSI6ImNqaGtrbTd6ZjBlbWYzNnFrZ2FueHRzYjMifQ.1o4gqQmeIbE1GC5FI55xJA';
//attribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';

//const mapTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
//const mapTiles = 'http://menina:8888/styles/osm-bright/{z}/{x}/{y}.png';
//const mapTiles = 'http://menina:3000/styles/osm-bright/{z}/{x}/{y}.png';
//const mapTiles = 'http://localhost:3000/styles/osm-bright/{z}/{x}/{y}.png';
//const mapTiles = 'http://10.42.0.1:8000/styles/osm-bright/{z}/{x}/{y}.png';

const mapTiles = 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png';

const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const normalText = (window.innerHeight * 0.012) + 'px',
	smallText = (window.innerHeight * 0.01) + 'px',
	titleText = (window.innerHeight * 0.015) + 'px';

const label_priority = {
	'activity': ['home', 'business', 'education', 'leisure', 'shopping', 'personal business', 'escort trips', 'other purposes'],
	'modes': ['car', 'walking', 'cycling', 'public transport', 'other modes']
} 

const propositions = {
		'home' : {'en' : 'at ', 'fr': 'au '},
		'business': {'en': 'for ', 'fr': 'pour le '},
		'shopping': {'en': 'for ', 'fr': 'pour les '},
		'education': {'en': 'for ', 'fr': 'pour les '},
		'personal business': {'en': 'for ', 'fr': 'pour les '},
		'escort trips': {'en': 'for ', 'fr': 'pour '},
		'leisure': {'en': 'for ', 'fr': 'pour '}
}

const colorPalettes = {
		'home': ['#eeee94', '#d3e48c', '#b7d985', '#9cce80', '#81c27c', '#65b67a', '#46aa78', '#1b9e77'],
		'leisure': ['#eeee94', '#eadc7a', '#e7c961', '#e4b54a', '#e1a134', '#de8c20', '#db750e', '#d85d00'],
		'shopping': ['#eee89b', '#face8c', '#feb489', '#f99c90', '#e9899c', '#ce7ca9', '#a774b2', '#7570b3'],
		'education': ['#eee89b', '#f4d281', '#faba6d', '#ffa063', '#ff8462', '#ff676a', '#f74878', '#e7298a'],
		'business': ['#e7eee4', '#dbe9cc', '#d3e2b1', '#d1da94', '#d2d076', '#d6c657', '#ddb936', '#e6ab02'],
		'escort trips': ['#FAF1D1', '#F6E2A4', '#E4C473', '#C9A24C', '#A6761D', '#8E5F15', '#774B0E', '#603809'],
		'personal business': ['#EEFAD1', '#DBF6A5', '#BAE474', '#95C94D', '#66a61e', '#508E15', '#3C770F', '#2B6009'],
		'fluctuation': ['#d73027','#f46d43','#fdae61','#fee090','#e0f3f8','#abd9e9','#74add1','#4575b4'].reverse(),
		'density': ['#f7fcf0','#e0f3db','#ccebc5','#a8ddb5','#7bccc4','#4eb3d3','#2b8cbe','#08589e'],
		'presence': ['#f7fcfd','#e0ecf4','#bfd3e6','#9ebcda','#8c96c6','#8c6bb1','#88419d','#6e016b'],
		'attractiveness': ['#8c510a','#bf812d','#dfc27d','#f6e8c3','#c7eae5','#80cdc1','#35978f','#01665e'],
		'car': ['#eeecb2', '#bbdea4', '#82cfa3', '#37beac', '#00aab8', '#0093c2', '#007ac3', '#055db4'],
		'multimode': ['#003380', '#653d84', '#974e84', '#bb6784', '#d48688', '#e6a895', '#f3cbab', '#ffeecc'].reverse(),
		'pts': ['#eeeb94', '#d3d87f', '#b8c66b', '#9db458', '#82a246', '#669135', '#4a7f25', '#2c6e14'],
		'bike': ['#eee2dd', '#f6dccb', '#f9d8b7', '#f5d7a2', '#ead78f', '#d8d97e', '#c0dc72', '#9fdf6d'],
		'walk': ['#eee2dd', '#efdad9', '#edd3d9', '#e7cddc', '#dac8e2', '#c6c6e7', '#adc5e8', '#91c5e3'],
		'modes':{
			'car': '#1f78b4',
			'walking': '#33a02c', 			
			'cycling': '#b2df8a', 
			'public transport': '#a6cee3',
			'other modes': '#e5c494',
			'none': '#ccc',
			'stationary': '#808080'	
		},
		'activity': {
			'home' : '#1b9e77',
			'leisure': '#d85d00',
			'shopping': '#7570b3',
			'education': '#e7298a',
			'business': '#e6ab02',
			'personal business': '#66a61e',
			'escort trips': '#a6761d',
			'other purposes': '#e5c494',
			'none': '#ccc',
			'moving': '#808080'
		},
		'extra':{
			'none': '#ccc',
			'move-stay': '#808080'
		},
		'moving': ['#ffffe5','#fff7bc','#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#8c2d04'],
		'modes-breaks': ['walking', 'cycling', 'car', 'public transport', 'other modes'],
		'activity-breaks': ['home', 'leisure', 'shopping', 'education', 'business', 'personal business', 'escort trips', 'other purposes'],
		'extra-breaks': ['none', 'move-stay'],
		'history_colors':{
			'add': '#0099cc',
			'remove': '#993300',
			'switch': '#cc99cc',
			'modify': '#cccc00',
			'restore': '#00cc66',
			'global': '#666699'
		},
		'history_codes': ['add', 'remove', 'switch', 'modify', 'restore', 'global']
}

const labels = {
		'map': {'en': 'Map View', 'fr': 'Carte'},
		'stacked-view': {'en': 'Event Distribution View', 'fr': 'Chronogramme'},
		'chord-diagram': {'en': 'Flows View', 'fr': 'Diagramme des Flux'},
		'clock': {'en': 'Mobility Wheel', 'fr': 'Roue de la Mobilité'},
		'stc': {'en': 'Space-Time Cube', 'fr': 'Cube Espace-Temps'},
		'index': {'en': 'Sequences View', 'fr': 'Actogramme'},
		'fluctuation': {'en': 'Presence Fluctuation', 'fr': 'Variation de la présence'},
		'presence': {'en': 'Presence', 'fr': 'Présence'},
		'density': {'en': 'Presence Density', 'fr': 'Densité de Présence'},
		'attractiveness': {'en': 'Attractiveness Index', 'fr': "Indice d'attractivité"},
		'activity': {'en': 'Activity / Trip Purpose', 'fr': 'Activité / Motif'},
		'modes': {'en': 'Transportation Mode', 'fr': 'Mode de Transport'},
		'extra': {'en': 'Other', 'fr' : 'Autre'},
		'number': {'en': 'Quantity', 'fr': 'Quantité'},
		'ratio': {'en': 'Proportion', 'fr': 'Proportion'},
		'individual': {'time': {'en': 'One-hour Intervals', 'fr': "Intervalles d'1 heure"},
						'space': {'en': 'Per District', 'fr': 'Par Secteur'}},
		'aggregate': {'time': {'en': '24 hours', 'fr': '24 heures'},
						'space': {'en': 'The whole region', 'fr': 'Toute la Région'}},
		'fullscreen': {'en': 'Full Screen', 'fr': 'Plein Ecran'},
		'legend': {'en': 'Show Legend', 'fr': 'Afficher la légende'},
		'details': {'en': 'Show Details', 'fr': 'Afficher les détails'},
		'clear': {'en': 'Clear Indicator', 'fr': 'Effacer Indicateur'},
		'download': {'en': 'Save Image', 'fr': "Enregistrer l'Image"},
		'ftime': {'en': 'Freeze Time', 'fr': 'Figer le temps'},
		'fspace': {'en': 'Freeze Space', 'fr': "Figer l'espace"},
		'fzoom': {'en': 'Freeze Zoom', 'fr': 'Figer le zoom'},
		'selectspace': {'en': 'Change District(s)', 'fr': 'Changer le(s) secteur(s)'},
		'datasets': {'en': 'City Region', 'fr': 'Région'},
		'partition': {'en': 'Territorial Partition', 'fr': 'Découpage du Territoire'},
		'view': {'en': 'View', 'fr': 'Vue'},
		'indicator': {'en': 'Indicator', 'fr': 'Indicateur'},
		'rep': {'en': 'Representation', 'fr': 'Répresentation'},
		'space': {'en': 'Spatial Aggregation', 'fr': 'Aggrégation Spatial'},
		'time': {'en': 'Temporal Aggregation', 'fr': 'Aggrégation Temporelle'},
		'typology': {'en': 'Typology', 'fr': 'Typologie'},
		'customize': {'en': 'Customize', 'fr': 'Personnaliser'},
		'class': {'en': 'Group', 'fr': 'Groupe'},
		'home':	{'en': 'Home', 'fr': 'Domicile'},
		'business': {'en': 'Business', 'fr': 'Travail'},
		'education': {'en': 'Education', 'fr': 'Etudes'}, 
		'shopping':	{'en': 'Shopping', 'fr': 'Achats'}, 
		'personal business': {'en': 'Personal business', 'fr': 'Démarches personnelles'},
		'escort trips': {'en': 'Escort Trips', 'fr': 'Accompagnement'},
		'leisure': {'en': 'Leisure', 'fr': 'Loisirs'},
		'other purposes': {'en': 'Other purposes', 'fr': 'Autres motifs'},
		'walking': {'en': 'Walking' , 'fr': 'Marche à pied'},
		'cycling': {'en': 'Cycling', 'fr': 'Vélo'},
		'car': {'en': 'Car/Van' , 'fr': 'Véhicule particulier'},
		'public transport':	{'en': 'Public transport', 'fr': 'Transport en commun'},
		'other modes': {'en': 'Other modes', 'fr': 'Autres modes'},
		'multimode': {'en': 'Several', 'fr': 'Divers'},
		
		'male': {'en': 'Male' , 'fr':'Homme'},
		'female': {'en': 'Female', 'fr': 'Femme'},
		'full-time employment': {'en': 'Full-time employment', 'fr': 'Travail a plein temps'},
		'part-time employment': {'en': 'Partial-time employment' , 'fr': 'Travail a temps partiel'},
		'internship': {'en': 'Internship' , 'fr': 'Stage'},
		'university student': {'en': 'University student' , 'fr': 'Etudiant'},
		'school student': {'en': 'School student', 'fr': 'Scolaire'},
		'unemployed': {'en': 'Unemployed', 'fr': 'Chomeur'},
		'retired': {'en': 'Retired', 'fr': 'Retraite'},
		'stay at home': {'en': 'Stay at home' , 'fr': 'Reste au foyer'},
		'other': {'en': 'Other', 'fr': 'Autre'},
		'farmers': {'en': 'Farmers', 'fr': 'Agriculteurs exploitants'},
		'business owners and shop keepers': {'en': 'Business owners and shop keepers', 'fr': 'Artisans, commerçants et chefs d’entreprise'},
		'executives and professionals': {'en': 'Executives and professionals', 'fr': 'Cadres et professions intellectuelles supérieures'},
		'technicians and associate professionals':	{'en': 'Technicians and associate professionals', 'fr': 'Professions intermédiaires'},
		'employees': {'en': 'Employees' , 'fr': 'Employés'},
		'blue collar workers':{'en': 'Blue collar workers', 'fr': 'Ouvriers'},
		'no professional activity': {'en': 'No professional activity' , 'fr': 'Sans activité professionnelle'},
		'apprentis': {'en': 'Apprentis', 'fr': 'Apprentices'},
		'compulsory': {'en': 'Compulsory' , 'fr': 'Imposés'},
		'partially chosen': {'en': 'Partially chosen', 'fr': 'En partie choisis'},
		'totally free': {'en': 'Totally free' , 'fr': 'Totalement libres'},
		'day':{'en': 'Day' , 'fr': 'De jour'},
		'night': {'en': 'Night' , 'fr':	'De nuit'},
		'2x8': {'en': '2x8 shift' , 'fr': 'Poste en 2 x 8'},
		'3x8': {'en': '3x8 shift', 'fr': 'Poste en 3 x 8'},
		'everyday': {'en': 'Everyday' , 'fr': 'Tous les jours'},
		'twice-week':	{'en': 'Twice a week' , 'fr': '2 deplacements par semaine au minimum'},
		'twice-month': {'en': 'Twice a month', 'fr': '2 deplacements par mois au minimum'},
		'rarely': {'en': 'Rarely', 'fr': 'Exceptionnellement'},
		'never': {'en': 'Never' , 'fr': 'Jamais'},
		'car driver': {'en': 'car as driver', 'fr': 'VP conducteur'},
		'car passenger': {'en': 'car as passenger', 'fr': 'VP passager'},
		'other public transports': {'en': 'other public transports', 'fr': "d'autres transports en commun"},
		'tramway only': {'en': 'tramway only', 'fr': 'tramway uniquement'},
		'two-wheeled motorcycle': {'en': 'two-wheeled motorcycle', 'fr': '2 roues à moteur'},
		'work shift': {'en': 'Work Shift', 'fr': 'Poste de Travail'},
		'work hours': {'en': 'Work Hours', 'fr': 'Horaires de Travail'},
		'work status': {'en': 'Work Status', 'fr': 'Occupation'},
		'socioprofessional groups': {'en': 'Socioprofessional groups', 'fr': 'Professions et catégories socioprofessionalles'},
		'gender': {'en': 'Gender', 'fr': 'Genre'},
		
		'none': {'en': 'No Movement', 'fr': 'Aucun mouvement'},
		'move-stay': {'en': 'Moving / Stationary', 'fr': 'Mobile / Immobile'},
		'moving': {'en': 'Moving', 'fr': 'En déplacement'},
		'stationary': {'en': 'Stationary', 'fr': 'Immobile'},
		'controller': {'en': 'Control Unit', 'fr': 'Unité de Contrôle'},
		'dashboard': {'en': 'Dashboard', 'fr': 'Tableau de Bord'},
		'window': {'en': 'Window', 'fr': 'Fenêtre'},
		'environment': {'en': 'Environment', 'fr': 'Environnement'},
		'both': {'en': 'Activities and Modes', 'fr': 'Activités et Modes'},
		'reload_data': {'en': 'Reload Data', 'fr': 'Recharger le jeu de données'},
		'reset': {'en': 'Reset', 'fr': 'Réinitialiser'},
		'darkness': {'en': 'Floor Darkness', 'fr': 'Obscurité du plancher'},
		'semantic': {'en': 'Semantic', 'fr': 'Sémantique'},
		'dynamic_floor': {'en': 'Dynamic Map', 'fr': 'Carte Dynamique'},
		'select': {'en': 'Select trajectories', 'fr': 'Sélectionner des trajectoires'},
		'multiple': {'en': 'Select SEVERAL trajectories', 'fr': 'Sélectionnner PLUSIEURS trajectoires'},
		'unselectall': {'en': 'Unselect all trajectories', 'fr': 'Désélectionner toutes les trajectoires'},
		'filtering': {'en': 'Filter trajectories', 'fr': 'Filtrer les trajectoires'},
		'age': {'en': 'Age', 'fr': 'Âge'},
		'sex': {'en': 'Gender', 'fr': 'Genre'},
		'occupation': {'en': 'Work Status', 'fr': 'Occupation'},
		'criterion': {'en': 'Criterion', 'fr': 'Critère'},
		'show_all': {'en': 'Show All', 'fr': 'Tout afficher'},
		'hide_all': {'en': 'Hide All', 'fr': 'Tout cacher'},
		'translate': {'en': 'Translate', 'fr': 'Faire translater'},
		'rotate': {'en': 'Rotate', 'fr': 'Faire tourner'},
		'freq': {'en': 'Sequence Frequency', 'fr': 'Fréquence'},
//		'density': {'en': 'Neighborhood Density', 'fr': 'Densité du voisinage'},
		'dist': {'en': 'Centrality', 'fr': 'Centralité'},
		'prob': {'en': 'Sequence Likelihood', 'fr': 'Probabilité'},
		'background': {'en': 'Show background', 'fr': "Afficher l'arrière-plan"},
		'labels': {'en': 'Show district names', 'fr': 'Afficher les noms'},
		'history': {'en': 'History', 'fr': 'Histoire'},
		'loading': {'en': 'Loading...', 'fr': 'Chargement...'}
}



function getLabel(d){
	if (typeof d != 'string' && !d.value) return '';
	
	const value = d.value || d;
	
	if (value && value.split('.')[0] == 'classe') return labels['class'][menu.language] + ' ' + value.split('.')[1];
	else if (['individual', 'aggregate'].includes(value)) {
		const parent = d3.select(this.parentNode.parentNode).datum().value;
		return labels[value][parent][menu.language];
	}
	
	return labels[value] ? labels[value][menu.language] : value.charAt(0).toUpperCase() + value.slice(1)
}

const coords = {
	'lyon': {'lat': 45.79, 'lng' : 4.94},
	'grenoble': {'lat': 45.08, 'lng': 5.5},
	'rennes': {'lat': 48.10, 'lng': -1.89}	
}

// convert string to array buffer to send through the server
function stringToUint(string) {
    var string = btoa(unescape(encodeURIComponent(string))),
        charList = string.split(''),
        uintArray = [];
    for (var i = 0; i < charList.length; i++) {
        uintArray.push(charList[i].charCodeAt(0));
    }
    return new Uint8Array(uintArray);
}

// convert an array buffer back to string
function uintToString(uintArray) {
    var encodedString = String.fromCharCode.apply(null, uintArray),
        decodedString = decodeURIComponent(escape(atob(encodedString)));
    return decodedString;
}

///// return an object with the new message /////
//type: message type, which can be: period, focusview
//value: the value to be sended, which can be a time period, a view id

function createJSONMessage(key, data){
	return {key: key, data: data};
}

/**
 * This file contains all the common functions managing the environment
 */

function openDropdown(){
	let element = typeof arguments[0] != 'undefined' ? arguments[0] : this;
	if (typeof element.nodeName == 'undefined') element = this;
	
	let grandpa = element.parentNode.parentNode;
	let sibling = element.firstChild;
	while(sibling){
		if (sibling.className == 'dropdown')
			d3.select(sibling).selectAll("ul.dropdown-menu").style('display', 'none');
		sibling = sibling.nextSibling;
	}
	
	const dropdownContent = element.nextElementSibling;
	
	if(dropdownContent.style.display == "block")
		dropdownContent.style.display = "none";
	else
		dropdownContent.style.display = "block"; 
}

function formatHour(value, language){
	const hour = value >= 24 ? value - 24 : value;
	return language == 'fr' ? hour : (hour > 12 ? hour - 12 : hour)
}

function getTimeSufix(value){
	const hour = value >= 24 ? value - 24 : value;
	return menu.language == 'en' ? (hour < 12 ? 'am' : 'pm') : 'h'; 
}

function getTimeString(value){
	const hour = formatHour(value, menu.language);
	return hour + getTimeSufix(value)
}

function calcRadius(value, scale){
	return Math.sqrt(Math.abs(value * scale)/Math.PI)*2;
}

function makeid() {
	var text = "";
	var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
	
	for (var i = 0; i < 5; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	
	return text;
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  
  return color;
}

function generateRandomPalette(n){
	var palette = [];
	var i = 0;
	while(i < n){
		var color = getRandomColor(palette);
		if(palette.includes(color)) continue; 
		else { 
			var valid = true;
			for (var j = 0; j < palette.length; j++){
				var distance = getColorDistance(hexToRgb(palette[j]), hexToRgb(color));
				if (distance < 50){
					valid = false;
					break;
				}
			}
			if(valid){
				palette.push(color);
				i++;
			}
		}
	}
	
	return palette;
}

function getColorDistance(rgb1, rgb2){
	var distance = Math.sqrt(Math.pow(rgb2.r - rgb1.r, 2) + Math.pow(rgb2.g - rgb1.g, 2) + Math.pow(rgb2.b - rgb1.b, 2));
	return distance;
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}


function transformString() {
    var args = Array.prototype.slice.call(arguments);
    return args.shift() + '(' + args.join(',') + ')';
}

function polarToCartesian(angle, radius) {
    return [
        radius * Math.cos(angle),
        radius * Math.sin(angle)
    ];
}

function mod(a, b) {
    return ((a % b) + b) % b;
}

function wrap(text, width, x, step) {
	text.each(function() {
		let text = d3.select(this),
			words = text.text().split(/\s+/).reverse(),
			word,
			line = [],
			lineNumber = 1,
			lineHeight = 1.1, // ems
			y = text.attr("y"),
			dy = parseFloat(text.attr("dy")) || 0,	
			tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
		
		width = (typeof width === "function") ? width.call(this) : width;
		
		while (word = words.pop()) {
			line.push(word);
			tspan.text(line.join(" "));
			if (tspan.node().getComputedTextLength() > width) {
				line.pop();
				tspan.text(line.join(" "));
				line = [word];
				tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", (step ? lineNumber * lineHeight + "em" : lineHeight + 'em')).text(word);
				lineNumber++;
			}
		}
	});
}

function exportToCsv(filename, rows) {
    var processRow = function (row) {
        var finalVal = '';
        for (var j = 0; j < row.length; j++) {
            var innerValue = row[j] === null ? '' : row[j].toString();
            if (row[j] instanceof Date) {
                innerValue = row[j].toLocaleString();
            };
            var result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            if (j > 0)
                finalVal += ',';
            finalVal += result;
        }
        return finalVal + '\n';
    };

    var csvFile = '';
    for (var i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i]);
    }

    var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

function getSVGString( svgNode ) {
	svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
	var cssStyleText = getCSSStyles( svgNode );
	appendCSS( cssStyleText, svgNode );

	var serializer = new XMLSerializer();
	var svgString = serializer.serializeToString(svgNode);
	svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
	svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix

	return svgString;

	function getCSSStyles( parentElement ) {
		var selectorTextArr = [];
		
		var extractedCSSText = "";
		
		// Add Parent element Id and Classes to the list
		selectorTextArr.push( '#'+parentElement.id );
		for (var c = 0; c < parentElement.classList.length; c++)
				if ( !contains('.'+parentElement.classList[c], selectorTextArr) )
					selectorTextArr.push( '.'+parentElement.classList[c] );
		
		// Add Children element Ids and Classes to the list
		var nodes = parentElement.getElementsByTagName("*");
		for (var i = 0; i < nodes.length; i++) {
			var id = nodes[i].id;
			if ( !contains('#'+id, selectorTextArr) )
				selectorTextArr.push( '#'+id );
			
			var classes = nodes[i].classList;
			for (var c = 0; c < classes.length; c++)
				if ( !contains('.'+classes[c], selectorTextArr) )
					selectorTextArr.push( '.'+classes[c] );
		}
		
		// Extract CSS Rules
		for (var i = 0; i < document.styleSheets.length; i++) {
			var s = document.styleSheets[i];
			
			try {
			    if(!s.cssRules) continue;
			} catch( e ) {
		    		if(e.name !== 'SecurityError') throw e; // for Firefox
		    		continue;
		    	}

			var cssRules = s.cssRules;
			for (var r = 0; r < cssRules.length; r++) {
				if ( !cssRules[r].selectorText ) continue;
				
				if ( contains( cssRules[r].selectorText, selectorTextArr ) || 
						contains(cssRules[r].selectorText.split(' ')[0], selectorTextArr) || 
						contains(cssRules[r].selectorText.split('.')[0], selectorTextArr) ) {
					extractedCSSText += cssRules[r].cssText;
				}
			}
		}
		
		return extractedCSSText;

		function contains(str, arr) {
			return arr.indexOf( str ) != -1;
		}

	}

	function appendCSS( cssText, element ) {
		var styleElement = document.createElement("style");
		styleElement.setAttribute("type","text/css"); 
		styleElement.innerHTML = cssText;
		var refNode = element.hasChildNodes() ? element.children[0] : null;
		element.insertBefore( styleElement, refNode );
	}
}


function svgString2Image( svgString, width, height, format, callback ) {
	var format = format ? format : 'png';

	var imgsrc = 'data:image/svg+xml;base64,'+ btoa( unescape( encodeURIComponent( svgString ) ) ); // Convert SVG string to data URL

	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");

	canvas.width = width;
	canvas.height = height;

	var image = new Image();
	image.onload = function() {
		context.clearRect ( 0, 0, width, height );
		context.drawImage(image, 0, 0, width, height);

		canvas.toBlob( function(blob) {
			var filesize = Math.round( blob.length/1024 ) + ' KB';
			if ( callback ) callback( blob, filesize );
		});

		
	};

	image.src = imgsrc;
}