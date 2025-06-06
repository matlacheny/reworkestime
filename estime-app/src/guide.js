

class Guide{
	constructor(){
		
	}
	
	setTourGuides(){
		const en = menu.language == 'en';
		
		this.controlGuide = introJs().setOptions({
			steps: [
				{
					element: '#header-tutorial-button',
					intro: en ? 'Welcome to eSTIMe! Let me show you around.' : "Bienvenue dans eSTIMe ! Faisons une visite de l'application",
					position: 'bottom'
				},
				{
					element: '#header-datasets-dropdown	',
					intro: en ? 'Here you can choose which dataset you want to explore. This action affects every connected dashboard.' :
						"Ici vous pouvez sélectionner le jeu de données que vous voulez explorer. Cette action s’applique à tous les tableaux de bord connectés.",
					position: 'right'
				},
				{
					element: '#header-partition-dropdown',
					intro: en ? 'Here you can change the territorial partition. This action affects every connected dashboard.' :
						"Ici vous pouvez changer le découpage territorial. Cette action s’applique à tous les tableaux de bord connectés.",
					position: 'right'
			    },
			    {
			    	element: '#header-indicator-dropdown',
			    	intro : en ? 'Here you select the indicator to display on the map below.' : "Ici s'effectue la sélection de l'indicateur à afficher sur la carte ci-dessous",
			    	position: 'right'
			    },
			    {
			    	element: '#header-fluctuation',
					intro: en ? 'The fluctuation represents the difference between present people on each district and its residents.' :
						"La fluctuation représente la différence entre les individus présents dans chaque secteur et ses résidents.",
					position: 'right'
			    },
			    {
			    	element: '#header-density',
					intro: en ? 'The presence density represents the ratio of present people in the district and the district surface in square kilometers.' :
						"La densité de présence est définie par le rapport entre le nombre des personnes présentes dans un secteur et sa surface en kilomètres carrés.",
					position: 'right'
			    },
			    {
			    	element: '#header-presence',
					intro: en ? 'The presence represents the number of people present on each district, either in general or for a particular activity.' :
						"La présence réprésente le volume d’individus présents dans chaque secteur, soit globalement soit pour une activité spécifique.",
					position: 'right'
			    },
			    {
			    	element: '#header-attractiveness',
					intro: en ? 'The attractiveness index represents the most attractive districts over 24 hours.' : 
						"L’indice d’attractivité représente les secteurs les plus attractifs sur 24 heures.",
					position: 'right'
			    },
			    {
					element: '#header-rep-dropdown',
					intro: en ? 'Here you can choose how to represent data.' : "Ici vous pouvez choisir comment représenter les données." ,
					position: 'right'
			    },
			    {
			    	element: '#header-number',
					intro: en ? "For fluctuation, quantity indicates the number of people over or under the district's population. For presence, it indicates the counting of people present at each district." :
						"Migration : quantité indique l’écart (positif / négatif) par rapport à la population du secteur. Présence : indique le nombre d’individus présents dans chaque secteur.",
					position: 'right'
			    },
			    {
			    	element: '#header-ratio',
					intro: en ? "For fluctuation, proportion indicates the under or overpopulation through the ratio of the difference between present people and population and the district's population. For presence, it presents the proportion of the region's population present in each district." :
						"Migration : proportion représente l’écart de population (positif / négatif) via la part de la différence entre les individus présents et la population du secteur. Présence : représente la proportion de la population de la région présente dans chaque secteur.",
					position: 'right'
			    },
			    {
					element: '#header-time-dropdown',
					intro: en ? 'Here you can choose whether to explore the indicator aggregate over 24 hours or per time interval.' :
						"Ici vous pouvez choisir d’explorer l'indicateur agrégée sur 24 heures ou sur une période de temps au choix.",
					position: 'right'
			    },
			    {
					element: '#header-activity-dropdown',
					intro: en ? 'Here you can choose to explore the presence indicator for a particular activity.' :
						"Ici vous pouvez choisir d’explorer l’indice de présence pour une activité spécifique.",
					position: 'right'
			    },
			    {
					element: '#header-customize-dropdown',
					intro: en ? 'Here you can customize the view.' : "Ici vous pouvez personnaliser la vue.",
					position: 'right'
			    },
			    {
					element: '#header-legend',
					intro: en ? 'You can choose whether to display the map legend.' : 
						"Vous pouvez choisir d’afficher ou non la légende de la carte.",
					position: 'right'
			    },
			    {
					element: '#header-ftime',
					intro: en ? 'You can freeze the temporal dimension of this view at the current time interval.' :
						"Vous pouvez figer la dimension temporelle de cette vue sur la période de temps actuel.",
					position: 'right'
			    },
			    {
					element: '#header-background',
					intro: en ? 'When no indicator is displayed, you can choose whether to display the background color in each district.' :
						"Quand aucun indicateur n’est sélectionné, vous pouvez choisir d’afficher ou non le fond coloré de chaque secteur.",
					position: 'right'
			    },
			    {
					element: '#header-labels',
					intro: en ? 'You can choose whether to display the district names.' : "Vous pouvez choisir d’afficher ou non le quartier.",
					position: 'right'
			    },
			    {
					element: '#header-clear',
					intro: en ? 'By clicking here you remove the indicator and keep the interactive map.' :
						"En cliquant ici vous enlevez l'indicateur et conserver la carte interactive.",
					position: 'right'
			    },
			    {
					element: '#header-download',
					intro: en ? 'By clicking here you download the view as an image.' : 
						"En cliquant ici vous téléchargez la vue dans un format image.",
					position: 'right'
			    },
			    {
					element: '#header-information',
					intro: en ? 'By clicking here you obtain more information on the displayed indicator.' :
						"En cliquant ici vouz obtenez plus d’informations sur l’indicateur affiché.",
					position: 'right'
			    },
			    {
					element: '#right',
					intro: en ? 'By clicking here you switch between the map and the space-time cube.' :
						"En cliquant ici, vous alternez entre la carte et le cube spatio-temporel.",
					position: 'bottom'
			    },
			    {
					element: '#menu-button',
					intro: en ? 'By clicking here you open the menu to interact with the dashboards.' :
						"En cliquant ici vouz ouvrez le menu permettant d’interagir avec les tableaux de bord.",
					position: 'right'
			    },
			    {
					element: '#history-button',
					intro: en ? 'By clicking here you access your usage history.' :
						"En cliquant ici vous accéder votre historique d'utilisation.",
					position: 'right'
			    }
			],
			overlayOpacity: 0.3,
			showBullets: false,
			showProgress: true
		})
		
		this.controlGuide.onchange(function(targetElement) {   
			
			if (!targetElement.id.includes('tutorial') && targetElement.id.includes('header-') && targetElement.id.split('-')[2] == 'dropdown'){
				const id = '#'+targetElement.id.replace('dropdown', 'button')
				const e = d3.select(id).node();
				
				openDropdown(e)
				
				let sibling = e.parentNode.parentNode.firstChild;
				while(sibling){
					if (sibling.className && sibling.className.includes('dropdown') && sibling !== e.parentNode)
						d3.select(sibling).selectAll('ul.dropdown-menu').style('display', 'none')
					sibling = sibling.nextSibling;
				}	
			}
			else if (targetElement.id == 'right'){
				d3.select('#ddmenu-customize-header').style('display', 'none')
			}
		})
		
		const initialSteps = [{
							element: '#dash-tutorial',
							intro: en ? 'Hi! You will use this menu to control the views on the dashboard(s). Let me show you how it works!' :
								"Bonjour ! Vous allez utiliser ce menu pour contrôler les vues sur le(s) tableau(x) de bord. Je vais vous montrer comment faire.",
							position: 'bottom'
						},
						{
					    	element: '#add-dash',
							intro: en ? 'By clicking here you can add a dashboard.' : "En cliquant ici vous pouvez ajouter un tableau de bord.",
							position: 'bottom'
					    }]
		
		// --------------------------------------------------------
		this.dashGuide = introJs().setOptions({
			steps: initialSteps,
			overlayOpacity: 0.3
		})
		
		this.completeDashGuide = introJs().setOptions({
			steps: [
				initialSteps[0],
				initialSteps[1],
	    		{
			    	element: '.slide',
					intro: en ? 'This menu is divided into four windows to represent the windows on each dashboard.' :
						"Les quatre fenêtres de ce menu représentent les fenêtres de chaque tableau de bord.",
					position: 'bottom'
			    },
			    {
			    	element: '.tab',
					intro: en ? 'When you have more than one dashboard connected, be sure that the right one is selected by clicking on its corresponding tab.' :
						"Lors que vous avez plus qu'un tableau de bord connecté, assurez-vous de choisir le bon tableau de bord en cliquant sur l'onglet correspondante.",
					position: 'bottom'
			    },
			    {
			    	element: '#cont_1',
					intro: en ? 'Choose the sub-menu on the window you want to manipulate. For instance, the interactions in this sub-menu and symbols will directly affect the top-left window on the selected dashboard.' :
						"Choisissez le sous-menu dans la fenêtre concernée. Par exemple, les interactions de ce sous-menu et les symboles vont directement impacter la fenêtre située en haut à gauche.", 
					position: 'bottom'
			    },
			    {
			    	element: '#cont_1-view-button',
					intro: en ? 'Start by choosing a view.' : "Pour débuter, choisissez une vue.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-map',
					intro: en ? 'The map view displays presence indicators per district.' : 
						"La vue cartographique affiche les indicateurs de présence par secteur.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-stacked-view',
					intro: en ? 'The event distribution view presents the distribution of population per activity or mode of transport over 24 hours.' :
						"Le chronogramme présente la répartition de la population par activité ou par mode de transport sur un intervalle de 24 heures.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-chord-diagram',
					intro: en ? 'The flow view helps you to explore the volume of trips between pairs of districts. You can explore the flows within the whole region, or within a selection of up to 10 districts. By selecting only one district, you can display all flows connected to it and the involved districts.' :
						"Le diagramme de flux permet de visualiser le volume de trajets entre les secteurs. Vous pouvez représenter les flux pour l’ensemble de la région ou au sein d’une sélection allant jusqu’à 10 secteurs. En ne sélectionnant qu’un seul secteur, vous pouvez afficher tous les trajets auquel il est connecté ainsi que tous les secteurs correspondant.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-clock',
					intro: en ? 'The mobility wheel enables the exploration of mobility intensity of population and its distribution per trip purposes and modes of transport' :
						"La roue de la mobilité permet de comparer l’intensité de la mobilité conjointement à la distribution des modes de transports et des motifs.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-index',
					intro: en ? 'The sequences view serves to explore the activity schedules of individuals over time.' :
						"L’actogramme permet d’explorer les emploi du temps des individus au cours du temps.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-stc',
					intro: en ? 'The space-time cube represents the individual trajectories over space and time.' :
						"Le cube spatio-temporel représente les trajectoires individuelles à travers l’espace et le temps.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-indicator-button',
					intro: en ? 'Here you chose the indicator.' : "Ici s’effectue le choix de l’indicateur.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-fluctuation',
					intro: en ? 'The fluctuation represents the difference between present people on each district and the district population.' :
						"La migration représente la différence entre les individus présents dans chaque secteur et ses résidents.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-density',
					intro: en ? 'The presence density represents the ratio of present people in the district and the district surface in square kilometers.' :
						"La densité de présence représente le rapport entre le nombre des personnes présentes dans un secteur et sa surface en kilomètres carrés.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-presence',
					intro: en ? 'It gives the amount of people present on each district, either in general or for a particular activity.' :
						"La présence réprésente le volume d’individus présents dans chaque secteur, soit globalement soit pour une activité spécifique.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-attractiveness',
					intro: en ? 'The attractiveness index represents the most attractive districts over 24 hours.' :
						"L’indice d’attractivité représente les secteurs les plus attractifs sur 24 heures.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-activity',
					intro: en ? 'Except for maps, it displays the chosen view per activity or trip purpose.' :
						"Affiche la vue sélectionnée par activité ou par motif du déplacement (sauf pour la vue cartographique).", 
					position: 'right'
			    },
			    {
			    	element: '#cont_1-modes',
					intro: en ? 'Except for maps, it displays the chosen view per mode of transport.' :
						"Affiche la vue sélectionnée par mode de transport (sauf pour la vue cartographique).",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-rep-button',
					intro: en ? 'For map views, you can choose how to represent the data.' :
						"Pour la vue cartographique, vous pouvez choisir comment représenter les données.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-number',
					intro: en ? "In a fluctuation map, it gives the number of people over or under the district's population. For presence, it gives the counting of people present at each district." :
						"Migration : représente l’écart de population (positif / négatif) via la part de la différence entre les individus présents et la population du secteur. Présence : représente la proportion de la population de la région présente dans chaque secteur.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-ratio',
					intro: en ? "In a fluctuation map, it represents the under or overpopulation through the ratio of the difference between present people and population and the district's population. For presence, it presents the proportion of the region's population present in each district." :
						"Migration : représente l’écart de population (positif / négatif) via la part de la différence entre les individus présents et la population du secteur. Présence : représente la proportion de la population de la région présente dans chaque secteur.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-space-button',
					intro: en ? 'Here you choose whether to explore the indicator aggregate over the whole region or per district.' :
						"Ici vous pouvez choisir d'explorer l'indicateur aggrégée sur toute la région ou par secteur.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-time-button',
					intro: en ? 'Here you choose whether to explore the indicator aggregate over 24 hours or per time interval.' :
						"Ici vous pouvez choisir d’explorer l'indicateur agrégée sur 24 heures ou sur une période de temps au choix.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-activity-button',
					intro: en ? 'Here you choose a particular activity or trip purpose for which display the indicator.' :
						"Ici vous pouvez choisir une activité ou un objectif du déplacement pour lequel afficher cet indicateur.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-modes-button',
					intro: en ? 'Here you choose a particular mode of transport for which display the indicator (valid for flow views).' :
						"Ici vous pouvez choisir un mode de transport particulier pour lequel afficher l’indicateur (valable sur les diagrammes de flux).",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-typology-button',
					intro: en ? 'Here you choose a typology of individual trajectories for which display the indicator.' :
						"Ici vous pouvez choisir une typologie de trajectoires pour laquelle afficher l’indicateur.",
					position: 'right'
			    },
			    {
			    	element: '#cont_1-customize-button',
					intro: en ? 'Here you can customize the view by adding details, legend (for maps) or making it full screen (for the STC).' :
						"Ici vous pouvez personnaliser la vue en ajoutant des détails, la légende des cartes ou en l’affichant en plein écran (le dernier est valable sur le cube espace-temps uniquement).",
					position: 'right'
			    },
			    {
			    	element: '#information-symbol',
					intro: en ? 'Here you can get more information on the displayed indicator.' :
						"Ici vous pouvez obtenir plus d’information sur l’indicateur affiché.",
					position: 'bottom'
			    },
			    {
			    	element: '#clear-symbol',
					intro: en ? 'By clicking here you remove the view from this window.' :
						"En cliquant ici vous enlevez la vue de cette fenêtre.",
					position: 'bottom'
			    },
			    {
			    	element: '#download-symbol',
					intro: en ? 'By clicking here you download this view as image.' :
						"En cliquant ici vous téléchargez la vue dans un format image.",
					position: 'bottom'
			    },
			    {
			    	element: '#ftime-symbol',
					intro: en ? 'By clicking here you can freeze the temporal dimension of this view at the current time interval, while exploring the remaining views for different time intervals.' :
						"En cliquant ici vous pouvez bloquer la dimension temporelle de cette vue sur l’intervalle de temps actuel tout en explorant les vues restantes pour d’autres créneaux temporels.",
					position: 'bottom'
			    },
			    {
			    	element: '#fspace-symbol',
					intro: en ? 'By clicking here you can freeze the spatial dimension of this view at the current district, while exploring the remaining views for different districts (only available for flows views).' :
						"En cliquant ici vous pouvez bloquer la dimension spatiale de la vue dans le secteur actuel tout en explorant les vues restantes pour d’autres secteurs (disponible sur les diagrammes de flux uniquement).",
					position: 'bottom'
			    },
			    {
			    	element: '#fzoom-symbol',
					intro: en ? 'By clicking here you can freeze zooming action of this view at the current zoom level (only available for map views).' : 
						"En cliquant ici vous pouvez bloquer le zoom sur le niveau de zoom actuel (disponible sur les cartes uniquement).",
					position: 'bottom'
			    },
			    {
			    	element: '#selectspace-symbol',
					intro: en ? 'By clicking here you can set new(s) district(s) for the current indicator.' :
						"En cliquant ici vous pouvez choisir un/des nouveau(x) pour l'indicateur actuel.",
					position: 'bottom'
			    }
	    	],
	    	overlayOpacity: 0.3,
	    	showProgress: true,
	    	showBullets: false
		})
		
		this.completeDashGuide.onchange(function(targetElement) {   
			
			if (targetElement.id.includes('cont_1-') && targetElement.id.split('-')[2] == 'button'){
				const e = d3.select('#'+targetElement.id).node();
				
				openDropdown(e)
				
				let sibling = e.parentNode.parentNode.firstChild;
				while(sibling){
					if (sibling.className == 'dropdown' && sibling !== e.parentNode)
						d3.select(sibling).selectAll('ul.dropdown-menu').style('display', 'none')
					sibling = sibling.nextSibling;
				}	
			}
		})
	}
}

