var loc;
var upgrades;
var bos;
var raiders;
var survivors;
var mutants;
var characters;

var forceSection;
var addButton;
var closeAddButton;
var addSection;
var capsSection;

var lastTextFieldValue;
var addSectionOpen;

var totalCaps;
var faction;
var force;

function getUrl(url){
	var req = new XMLHttpRequest();
	req.open("GET",url,true);
	return req;
}

function loadURL(url){
	var req = getUrl(url);
	req.send();
	return new Promise(function(resolve, reject) {
		req.onreadystatechange = function() {
			if(req.readyState === 4)
			{
				if(req.status === 200)
				{
					resolve(JSON.parse(req.response));
				}else{
					reject();
				}
			}
		}
	});
}

function upgradesLoaded(json)
{
	upgrades = json;
	var bosLoadPromise = loadURL("data/brotherhood_of_steel.json");
	bosLoadPromise.then(bosLoaded);
	bosLoadPromise.catch(function(){alert("bos load failed");});
}

function bosLoaded(json){
	bos = json;
	var raiderLoadPromise = loadURL("data/raiders.json");
	raiderLoadPromise.then(raidersLoaded);
	raiderLoadPromise.catch(function(){alert("raider load failed");});
}

function raidersLoaded(json){
	raiders = json;	
	var survivorLoadPromise = loadURL("data/survivors.json");
	survivorLoadPromise.then(survivorsLoaded);
	survivorLoadPromise.catch(function(){alert("survivor load failed");});
}

function survivorsLoaded(json){
	survivors = json;
	var mutantLoadPromise = loadURL("data/super_mutants.json");
	mutantLoadPromise.then(mutantsLoaded);
	mutantLoadPromise.catch(function(){alert("mutants load failed");});
}

function mutantsLoaded(json){
	mutants = json;
	loadLocalization();
}

function loadLocalization(){

	var language = "en";
	if(document.cookie != null && decodeURIComponent(document.cookie) != null && decodeURIComponent(document.cookie).length > 0){
		var decodedCookie = decodeURIComponent(document.cookie);
    	language = decodedCookie.split(';')[0].split("=")[1];
	}else if (navigator != null && navigator.hasOwnProperty("language") && navigator.language != language){
		language = navigator.language.split('-')[0];
	}

	document.getElementById("languageSelection").value = language;

	var locLoadPromise = loadURL("localization/"+language+".json");
	locLoadPromise.then(localizationLoaded);
	locLoadPromise.catch(function(){
		alert("Localization load failed, defaulting to english");
		var engLoadPromise = loadURL("localization/en.json");
		document.getElementById("languageSelection").value = "en";
		engLoadPromise.then(localizationLoaded);
		engLoadPromise.catch(function(){alert("English localization load failed. Now you're really hosed!");});
	});
}

function localizationLoaded(json){
	loc = json;
	initListeners();
}

function initListeners(){
	document.getElementById("switch-bos").addEventListener("click", switchBos, true);
	document.getElementById("switch-mutants").addEventListener("click", switchMutants, true);
	document.getElementById("switch-survivors").addEventListener("click", switchSurvivors, true);
	document.getElementById("switch-raiders").addEventListener("click", switchRaiders, true);

	document.getElementById("languageSelection").addEventListener("change", switchLanguage, true);
	document.getElementById("listNameArea").addEventListener("change", updateCaps, true);

	forceSection = document.getElementById("force");
	addSection = document.getElementById("addSection");
	addButton = document.getElementById("addButton");
	closeAddButton = document.getElementById("closeAddButton");
	capsSection = document.getElementById("caps");
	addButton.addEventListener("click", openAddSection);
	closeAddButton.addEventListener("click", closeAddSection);

	addSectionOpen = true;

	var queryString = window.location.href.split("?");
	if(queryString.length > 1){
		loadForceFromString(queryString[1]);
	}else{
		switchBos();
	}
}

function switchLanguage(){
	var newlang = document.getElementById("languageSelection").value;
	document.cookie = "language="+newlang+"; expires=Sat, 23 Oct 2077 12:00:00 UTC";
	reloadLanguage(newlang);
}

function reloadLanguage(langCode){
	var locLoadPromise = loadURL("localization/"+langCode+".json");
	locLoadPromise.then(updateLanguage);
	locLoadPromise.catch(function(){
		alert("Localization load failed, defaulting to english");
		var engLoadPromise = loadURL("localization/en.json");
		engLoadPromise.then(updateLanguage);
		engLoadPromise.catch(function(){alert("English localization load failed. Now you're really hosed!");});
	});
}

function updateLanguage(json){
	loc = json;
	var forceString = "";
	var queryString = window.location.href.split("?");
	if(queryString.length > 1){
		forceString = queryString[1];
	}
	clearForce();
	loadForceFromString(forceString);
}

function switchBos() {
	characters = bos;
	faction = "bos";
	clearForce();
}

function switchMutants() {
	characters = mutants;
	faction = "mut";
	clearForce();
}

function switchSurvivors() {
	characters = survivors;
	faction = "srv";
	clearForce();
}

function switchRaiders() {
	characters = raiders;
	faction = "rdr";
	clearForce();	
}

function clearForce(){
	forceSection.innerHTML = "";

	force = {};
	force.leader = {};
	force.leader.leaderIndex = -1;
	force.leader.perkIndex = 0;
	force.characters = [];

	buildAddSection();

	totalCaps = 0;
	updateCaps();
}

function buildAddSection() {
	addSection.innerHTML = "";
	var list = document.createElement("ul");
	characters.forEach(function(characterElement){

		var can_add = true;

		if(characterElement.hasOwnProperty("unique_code")){
			force.characters.forEach(function(otherChar){
				var otherCharElement = getCharacterById(otherChar.id)
				if(otherCharElement.hasOwnProperty("unique_code") 
					&& otherCharElement.unique_code == characterElement.unique_code){
					can_add = false;
				}
			})
		}

		var classTypes = can_add ? "btn btn-background choice" : "btn btn-background-off choice";

		var para = document.createElement("li");
		var button = document.createElement("button");
		button.setAttribute("class", classTypes);
		var nameSpan = document.createElement("span");
		var nameNode = document.createTextNode(loc[characterElement.name]);
		nameSpan.appendChild(nameNode);
		var pointsSpan = document.createElement("span");
		pointsSpan.setAttribute("class", "cost");
		var pointsNode = document.createTextNode("(" + characterElement.cost + ")");
		pointsSpan.appendChild(pointsNode);
		if(can_add){
			button.addEventListener("click", function() { addCharacter(characterElement, new Object());});
		}
		button.appendChild(nameSpan);
		button.appendChild(pointsSpan);
		para.appendChild(button);
		list.appendChild(para);
	});

	var descriptionSpan = document.createElement("span");
	descriptionSpan.appendChild(document.createTextNode(loc["characters"]));
	addSection.appendChild(descriptionSpan);
	addSection.appendChild(list);
	if(addSectionOpen){
		openAddSection();
	}else{
		closeAddSection();
	}
}

function closeAddSection(){
	addSectionOpen = false;
	addSection.style.display = "none";
	addButton.style.display = "block";
	closeAddButton.style.display = "none";
}

function openAddSection(){
	addSectionOpen = true;
	addButton.style.display = "none";
	addSection.style.display = "block";
	closeAddButton.style.display = "block";
}

function getUpgrade(elementType, elementName){
	if(upgrades[elementType] == null){
		return null;
	}
	var toReturn = null;
	upgrades[elementType].forEach(function(element){
		if(element.name == elementName){
			toReturn = element;
		}
	});

	if(toReturn == null){
		alert("No upgrade " + elementName + " found for type " + elementType);
	}

	return toReturn;
}

function addEquipmentToggleButton(character, slotType, carryInfo, section, isSelected) {
	var equipmentToggle =  document.createElement("div");

	var optionNameSection = document.createElement("span");
	optionNameSection.appendChild(document.createTextNode(loc[carryInfo.name]));
	var optionCostSection = document.createElement("span");
	optionCostSection.setAttribute("class", "cost");
	optionCostSection.appendChild(document.createTextNode("(" + carryInfo.cost + ")"));

	var equipButton = document.createElement("button");
	equipButton.setAttribute("class", "btn btn-unequipped");
	equipButton.appendChild(optionNameSection);
	equipButton.appendChild(optionCostSection);
	equipmentToggle.appendChild(equipButton);

	var optionNameSection2 = document.createElement("span");
	optionNameSection2.appendChild(document.createTextNode("■ " + loc[carryInfo.name]));
	var optionCostSection2 = document.createElement("span");
	optionCostSection2.setAttribute("class", "cost");
	optionCostSection2.appendChild(document.createTextNode("(" + carryInfo.cost + ")"));

	var removeButton = document.createElement("button");
	removeButton.setAttribute("class", "btn btn-equipped");
	removeButton.appendChild(optionNameSection2);
	removeButton.appendChild(optionCostSection2);
	equipmentToggle.appendChild(removeButton);

	if(isSelected){
		equipButton.style.display = "none";
	}else{
		removeButton.style.display = "none";
	}

	equipButton.addEventListener("click", function() {
		removeButton.style.display = "block";
		equipButton.style.display = "none";
		if(character[slotType] == null){
			character[slotType] = [];
		}
		character[slotType].push(carryInfo.name);
		updateCaps();
	});

	removeButton.addEventListener("click", function() {
		equipButton.style.display = "block";
		removeButton.style.display = "none";
		character[slotType] = character[slotType].filter(
			function(value, index, arr){
				value != carryInfo.name;
		});
		updateCaps();
	});

	section.appendChild(equipmentToggle);
}

function addCharacter(characterElement, presetInfo){
	var character = presetInfo;
	character.id = characterElement.id;

	var charaSection = document.createElement("div");
	charaSection.setAttribute("class", "characterElement");
	
	var headerSection = document.createElement("div");
	headerSection.setAttribute("class", "header-section");
	
	var close = document.createElement("button");
	var closeButton = document.createTextNode("X");
	close.setAttribute("class", "btn btn-background-off");
	close.appendChild(closeButton);
	headerSection.appendChild(close);

	if(!characterElement.hasOwnProperty("unique_code")){
		var copy = document.createElement("button");
		var copyButton = document.createTextNode("+");
		copy.setAttribute("class", "btn btn-background");
		copy.appendChild(copyButton);
		headerSection.appendChild(copy);
	}

	var nameSection = document.createElement("h1");
	nameSection.setAttribute("class", "float-left");
	var name = document.createTextNode(loc[characterElement.name]);
	nameSection.appendChild(name);
	headerSection.appendChild(nameSection);

	var costSection = document.createElement("div");
	var cost = document.createElement("span");
	cost.appendChild(document.createTextNode("("+characterElement.cost+")"));
	cost.setAttribute("class", "cost");
	costSection.appendChild(cost);
	headerSection.appendChild(costSection);

	charaSection.appendChild(headerSection);

	var specialSection = document.createElement("div");
	specialSection.setAttribute("class", "row");

	if(characterElement.heroic){
		var heroicSection = document.createElement("div");
		heroicSection.setAttribute("class", "col-sm-2 float-left");
		var heroicCheckBox = document.createElement('input');
		heroicCheckBox.type = 'checkbox';
		heroicCheckBox.checked = character.heroic;
		var heroicCostSection = document.createElement("span");
		var heroicDescription = document.createTextNode(loc["heroic"] + " (" + upgrades.heroes_and_leaders[0].cost +") ");
		heroicSection.appendChild(heroicDescription);
		heroicSection.appendChild(heroicCheckBox);
		heroicSection.appendChild(heroicCostSection);
		heroicCheckBox.addEventListener("click", function(){
			if(heroicCheckBox.checked){
				character.heroic = true;
			}else{
				delete character["heroic"];
			}
			updateCaps();
		});
		specialSection.appendChild(heroicSection);
	}
	addLeaderSection(specialSection, character);

	if(characterElement.must_wear){
		var mustWearSection = document.createElement("div");
		mustWearSection.setAttribute("class", "col-sm-5 float-left");
		characterElement.must_wear.forEach(function(element){
			var elements = element.split(".");
			var upgrade = getUpgrade(elements[0], elements[1]);
			if(upgrade == null){
				alert("No upgrade " + elements[1] + " of type " + elements[0] + " found");
			}else{
				var mustWearElement = document.createElement("div");
				var mustWearDescription = document.createTextNode(loc[elements[1]]);
				mustWearElement.appendChild(mustWearDescription);
				mustWearSection.appendChild(mustWearElement);
			}
		});
		specialSection.appendChild(mustWearSection);
	}

	if(characterElement.must_carry){
		var mustCarrySection = document.createElement("div");
		mustCarrySection.setAttribute("class", "col-sm-5 float-left");
		characterElement.must_carry.forEach(function(element){
			var elements = element.split(".");
			var upgrade = getUpgrade(elements[0], elements[1]);
			if(upgrade == null){
				alert("No upgrade " + elements[1] + " of type " + elements[0] + " found");
			}else{
				var mustCarryElement = document.createElement("div");
				var mustCarryDescription = document.createTextNode(loc[elements[1]]);
				mustCarryElement.appendChild(mustCarryDescription);
				mustCarrySection.appendChild(mustCarryElement);
			}
		});
		specialSection.appendChild(mustCarrySection);
	}

	var perkSection = getPerkSection(character);
	specialSection.appendChild(perkSection);

	charaSection.appendChild(specialSection);

	if(characterElement.carry_slots != null || characterElement.consumables != null){
		var equipmentToggle = document.createElement("div");
		equipmentToggle.id = "equipmentToggle";
		equipmentToggle.setAttribute("class", "row");
		
		var showEquipment = document.createElement("button");
		showEquipment.setAttribute("class", "btn btn-background");
		showEquipment.appendChild(document.createTextNode(loc["show_upgrades"]));
		equipmentToggle.appendChild(showEquipment);
		showEquipment.style.display = "none";

		var hideEquipment = document.createElement("button");
		hideEquipment.setAttribute("class", "btn btn-background");
		hideEquipment.appendChild(document.createTextNode(loc["hide_upgrades"]));
		equipmentToggle.appendChild(hideEquipment);

		charaSection.appendChild(equipmentToggle);
		var equipmentSection = document.createElement("div");
		equipmentSection.setAttribute("class", "");
	}

	if(characterElement.wear_slots != null){
		Object.keys(characterElement.wear_slots).forEach(function (slotType) {
			var wearSection = document.createElement("div");
			wearSection.setAttribute("class", "carry-section");

			var carryHeader = document.createElement("h2");
			carryHeader.setAttribute("class", "header");
			var carryHeaderText = document.createTextNode(loc[slotType]);
			carryHeader.appendChild(carryHeaderText);
			wearSection.appendChild(carryHeader)

			var slotOption = characterElement.wear_slots[slotType];

			var slotDropdown = document.createElement("SELECT");
			var emptyOption = new Option(loc["none"], null);
			slotDropdown.add(emptyOption);
			var optionSelectedIndex = 0;
			var optionIndex = 0;

			slotOption.forEach(function(option) {
				var optionElement = getUpgrade(slotType, option);

				var option = new Option(loc[optionElement.name] + " (" + optionElement.cost + ")", optionElement.name);
				slotDropdown.add(option);
				optionIndex++;
				if(character[slotType] == optionElement.name){
					optionSelectedIndex = optionIndex;
				}
			});
			slotDropdown.selectedIndex = optionSelectedIndex;
			slotDropdown.onchange = function(){
				if(slotDropdown.value == null || slotDropdown.value == "null"){
					delete character[slotType];
				}else{
					character[slotType] = slotDropdown.value;
				}
				updateCaps();
			};
			wearSection.appendChild(slotDropdown);
			equipmentSection.appendChild(wearSection);
		});
	}

	if(characterElement.carry_slots != null){
		Object.keys(characterElement.carry_slots).forEach(function (slotType) {
			var carrySection = document.createElement("div");
			carrySection.setAttribute("class", "carry-section");
			var carryHeader = document.createElement("h2");
			var carryHeaderText = document.createTextNode(loc[slotType]);
			carryHeader.setAttribute("class", "header");
			carryHeader.appendChild(carryHeaderText);
			carrySection.appendChild(carryHeader);
			var slotOption = characterElement.carry_slots[slotType];
			slotOption.forEach(function(option) {
				var optionElement = getUpgrade(slotType, option);
				var isEquipped = false;
				if(character.hasOwnProperty(slotType)){
					isEquipped = character[slotType].includes(optionElement.name);
				}
				addEquipmentToggleButton(character, slotType, optionElement, carrySection, isEquipped)
			});
			equipmentSection.appendChild(carrySection);
		});
	}

	if(characterElement.consumables != null){
		Object.keys(characterElement.consumables).forEach(function (slotType) {
			var consumeableSection = document.createElement("div");
			consumeableSection.setAttribute("class", "carry-section");
			var consumeableHeader = document.createElement("h2");
			var consumeableHeaderText = document.createTextNode(loc[slotType]);
			consumeableHeader.appendChild(consumeableHeaderText);
			consumeableSection.appendChild(consumeableHeader);

			var slotOption = characterElement.consumables[slotType];
			slotOption.forEach(function(option) {
				var optionElement = getUpgrade(slotType, option);
				var optionSection = document.createElement("div");
				optionSection.setAttribute("class", "consumable");
				var optionNameSection = document.createElement("span");
				optionNameSection.appendChild(document.createTextNode(loc[optionElement.name]));
				var optionCostSection = document.createElement("span");
				optionCostSection.setAttribute("class", "cost");
				optionCostSection.appendChild(document.createTextNode("(" + optionElement.cost + ")"));

				var getOptionQtySection = getNumericCounterFor(character, slotType, optionElement.name);

				optionSection.appendChild(optionNameSection);
				optionSection.appendChild(optionCostSection);
				optionSection.appendChild(getOptionQtySection);

				consumeableSection.appendChild(optionSection);
			});

			equipmentSection.appendChild(consumeableSection);
		});
	}

	var chemsSection = getChemsSection(character);
	equipmentSection.appendChild(chemsSection);

	if(characterElement.carry_slots != null || characterElement.consumables != null){
		showEquipment.addEventListener("click", function() {
			showEquipment.style.display = "none";
			equipmentSection.style.display = "block";
			hideEquipment.style.display = "block";
		});
		hideEquipment.addEventListener("click", function() {
			equipmentSection.style.display = "none";
			showEquipment.style.display = "block";
			hideEquipment.style.display = "none";
		});
		charaSection.appendChild(equipmentSection);
	}

	close.addEventListener("click", function() 
		{
			forceSection.removeChild(charaSection);
			var index = getCharacterIndex(character);
			if(index != -1){
				force.characters.splice(index,1);
			}
			if(force.hasOwnProperty("leader")){
				if(force.leader.leaderIndex > index){
					force.leader.leaderIndex -= 1;
				}
			}
			updateCaps();
			if(characterElement.hasOwnProperty("unique_code")){
				buildAddSection();
			}
		}
	);
	if(!characterElement.hasOwnProperty("unique_code")){
		copy.addEventListener("click", function() {
			addCharacter(characterElement, character);	
		});
	}

	forceSection.appendChild(charaSection);

	if(!force.hasOwnProperty("characters")){
		force.characters = [];
	}
	force.characters.push(character);

	totalCaps += characterElement.cost;
	updateCaps();
	buildAddSection();
	return charaSection;
}


function getNumericCounterFor(character, slotType, field){

	var counterDiv = document.createElement("div");

	var optionIncreaseCount = document.createElement("button");
	optionIncreaseCount.setAttribute("class", "btn btn-equipped btn-left-sm");
	optionIncreaseCount.appendChild(document.createTextNode("+"));
	optionIncreaseCount.addEventListener("click", function(){
		var value = parseInt(optionInput.value);
		if(isNaN(value)){
			optionInput.value = "0";
		}else{
			var newCount = value + 1;
			optionInput.value = newCount;
			if(character[slotType] == null){
				character[slotType] = {};
			}
			character[slotType][field] = newCount;
			updateCaps();
		}
	});

	var optionDecreaseCount = document.createElement("button");
	optionDecreaseCount.setAttribute("class", "btn btn-equipped btn-right-sm");
	optionDecreaseCount.appendChild(document.createTextNode("-"));
	optionDecreaseCount.addEventListener("click", function(){
		var value = parseInt(optionInput.value);
		if(isNaN(value)){
			optionInput.value = "0";
		}else if(value > 0){
			var newCount = value - 1;
			optionInput.value = newCount;
			character[slotType][field] = newCount;
			updateCaps();
		}
	});

	var optionInput = document.createElement('input');
	optionInput.setAttribute("class", "consumeableCount");
	optionInput.size = 2;
	optionInput.type = 'text';

	if(character.hasOwnProperty(slotType) && character[slotType].hasOwnProperty(field)){
		optionInput.value = character[slotType][field];					
	}else{
		optionInput.value = "0";
	}
	optionInput.addEventListener("focusin", function(){
		var value = parseInt(optionInput.value);
		if(isNaN(value)){
			lastTextFieldValue = 0;
		}else{
			lastTextFieldValue = value;
		}
	})
	optionInput.addEventListener("change", function(){
		var value = parseInt(optionInput.value);
		if(isNaN(value)){
			optionInput.value = lastTextFieldValue;
		}else{
			if(value < lastTextFieldValue){
				value = 0;
				optionInput.value = "0";
			}
			if(character[slotType] == null){
				character[slotType] = {};
			}
			character[slotType][field] = value;
			updateCaps();
		}
	});

	counterDiv.appendChild(optionDecreaseCount);
	counterDiv.appendChild(optionInput);
	counterDiv.appendChild(optionIncreaseCount);

	return counterDiv;
}

function getChemsSection(character){
	var chemSection = document.createElement("div");
	var addChemButton = document.createElement("button");
	var ownedChems = document.createElement("div");
	var chemDropdown = document.createElement("SELECT");
	
	upgrades.chems.forEach(function(chem){
		var option = new Option(loc[chem.name] + " (" + chem.cost + ")", chem.name);
		chemDropdown.add(option);
	});

	var hasFirstChem = false;

	if(character.hasOwnProperty("chems")){
		Object.getOwnPropertyNames(character.chems).forEach(function(chem){

			if(chem == upgrades.chems[0].name){
				hasFirstChem = true;
			}
			addChemEntry(ownedChems, chem, character, chemDropdown, addChemButton);
		});
	}

	chemSection.appendChild(ownedChems);
	var chemSelection = document.createElement("div");

	chemDropdown.onchange = function(){
		var chemFound = false;
		if(character.hasOwnProperty("chems")){
			chemFound = character.chems.hasOwnProperty(chemDropdown.value);
		}
		addChemButton.disabled = chemFound;
	};
	
	chemSection.appendChild(chemDropdown);
	addChemButton.appendChild(document.createTextNode(loc["addChem"]));
	addChemButton.setAttribute("class", "btn btn-background");
	addChemButton.addEventListener("click", function() {
		if(!character.hasOwnProperty("chems")){
			character.chems = {};
		}
		character["chems"][chemDropdown.value] = 1;
		addChemEntry(ownedChems, chemDropdown.value, character, chemDropdown, addChemButton);
		addChemButton.disabled = true;
		updateCaps();
	});
	addChemButton.disabled = hasFirstChem;
	chemSection.appendChild(addChemButton);
	return chemSection;
}

function addChemEntry(ownedChems, chem, character, chemDropdown, addChemButton){
	var selectedChem = document.createElement("div");
	var chemData = getUpgrade("chems", chem);
	selectedChem.appendChild(document.createTextNode(loc[chemData.name] + " (" + chemData.cost + ")"));
	
	var chemCounter = getNumericCounterFor(character, "chems", chem);
	selectedChem.appendChild(chemCounter)

	addRemoveChemButton(selectedChem, character, chemData, ownedChems, chemDropdown, addChemButton);
	ownedChems.appendChild(selectedChem);
}

function addRemoveChemButton(selectedChem, character, chemData, ownedChems, chemDropdown, addChemButton) {
	var removeButton = document.createElement("button");
	removeButton.appendChild(document.createTextNode("X"));
	removeButton.setAttribute("class", "btn btn-background-off");
	removeButton.addEventListener("click", function() {
		delete character.chems[chemData.name]
		ownedChems.removeChild(selectedChem);
		if(chemDropdown.value == chemData.name){
			addChemButton.disabled = false;
		}
		updateCaps();
	});
	selectedChem.appendChild(removeButton);
}

function getPerkSection(character){
	var perkSection = document.createElement("div");
	var addPerkButton = document.createElement("button");
	var ownedPerks = document.createElement("div");
	var perkDropdown = document.createElement("SELECT");
	
	upgrades.perks.forEach(function(perk){
		var option = new Option(loc[perk.name] + " (" + perk.cost + ")", perk.name);
		perkDropdown.add(option);
	});

	var hasFirstPerk = false;

	if(character.hasOwnProperty("perks")){
		character.perks.forEach(function(perk){
			if(perk == upgrades.perks[0].name){
				
				hasFirstPerk = true;
			}
			addPerkEntry(ownedPerks, perk, character, perkDropdown, addPerkButton);
		});
	}

	perkSection.appendChild(ownedPerks);
	var perkSelection = document.createElement("div");

	perkDropdown.onchange = function(){
		var perkIndex = -1;
		if(character.hasOwnProperty("perks")){
			perkIndex = character.perks.findIndex(function(otherPerk){
				return perkDropdown.value === otherPerk;
			});
		}
		addPerkButton.disabled = perkIndex >= 0;
	};
	
	perkSection.appendChild(perkDropdown);
	addPerkButton.appendChild(document.createTextNode(loc["addPerk"]));
	addPerkButton.setAttribute("class", "btn btn-background");
	addPerkButton.addEventListener("click", function() {
		if(!character.hasOwnProperty("perks")){
			character.perks = [];
		}
		character.perks.push(perkDropdown.value);
		addPerkEntry(ownedPerks, perkDropdown.value, character, perkDropdown, addPerkButton);
		addPerkButton.disabled = true;
		updateCaps();
	});
	addPerkButton.disabled = hasFirstPerk;
	perkSection.appendChild(addPerkButton);
	return perkSection;
}

function addPerkEntry(ownedPerks, perk, character, perkDropdown, addPerkButton){
	var selectedPerk = document.createElement("div");
	var perkData = getUpgrade("perks", perk);
	selectedPerk.appendChild(document.createTextNode(loc[perkData.name] + " (" + perkData.cost + ")"));
	addRemovePerkButton(selectedPerk, character, perkData, ownedPerks, perkDropdown, addPerkButton);
	ownedPerks.appendChild(selectedPerk);
}

function addRemovePerkButton(selectedPerk, character, perkData, ownedPerks, perkDropdown, addPerkButton) {
	var removeButton = document.createElement("button");
	removeButton.appendChild(document.createTextNode("X"));
	removeButton.setAttribute("class", "btn btn-background-off");
	removeButton.addEventListener("click", function() {
		var perkIndex = character.perks.findIndex(function(otherPerk){
			return perkData.name === otherPerk;
		});
		character.perks.splice(perkIndex, 1);
		ownedPerks.removeChild(selectedPerk);

		var upgradePerkIndex = upgrades.perks.findIndex(function (otherPerk){
			return perkData.name === otherPerk.name;
		});
		if(perkDropdown.selectedIndex == upgradePerkIndex){
			addPerkButton.disabled = false;
		}
		updateCaps();
	});
	selectedPerk.appendChild(removeButton);
}

function addLeaderSection(domElement, character){
	var characterIndex = getCharacterIndex(character);
	if(characterIndex == -1){
		characterIndex = force.characters.length;
	}

	var activeLeaderSection = document.createElement("div");
	activeLeaderSection.setAttribute("class", "activeLeaderSection");
	activeLeaderSection.appendChild(document.createTextNode(loc["leader"] + " "));
	var perkDropdown = document.createElement("SELECT");
	perkDropdown.setAttribute("class", "leaderPerkSelection");
	var emptyOption = new Option(loc["none"], null);
	perkDropdown.add(emptyOption);

	for(var index = 1; index < upgrades.heroes_and_leaders.length; index++) {
		var optionElement = upgrades.heroes_and_leaders[index];
		var option = new Option(loc[optionElement.name] + " (" + optionElement.cost + ")", optionElement.name);
		perkDropdown.add(option);
	}

	perkDropdown.onchange = function(){
		if(!force.hasOwnProperty("leader")){
			force.leader = {};
		}
		if(perkDropdown.value == null || perkDropdown.value == "null"){
			force.leader.perkIndex = 0;
		}else{
			force.leader.perkIndex = perkDropdown.selectedIndex;
		}
		var dropDowns = document.getElementsByClassName("leaderPerkSelection");
		for(var dropDownIndex = 0; dropDownIndex < dropDowns.length; dropDownIndex++){
			dropDowns[dropDownIndex].selectedIndex = force.leader.perkIndex;
		}
		updateCaps();
	};
	activeLeaderSection.appendChild(perkDropdown);


	var inactiveLeaderSection = document.createElement("div");
	inactiveLeaderSection.setAttribute("class", "inactiveLeaderSection");
	var setLeaderButton = document.createElement("button");
	setLeaderButton.setAttribute("class", "btn btn-background");
	setLeaderButton.appendChild(document.createTextNode("Set as leader"));
	setLeaderButton.addEventListener("click", function() { setLeader(character)});
	inactiveLeaderSection.appendChild(setLeaderButton);

	if(force.hasOwnProperty("leader")){
		perkDropdown.selectedIndex = force.leader.perkIndex
		var isLeader = force.leader.leaderIndex == characterIndex;
		inactiveLeaderSection.style.display = isLeader ? "none" : "block";
		activeLeaderSection.style.display = isLeader ? "block" : "none";
	}else{
		perkDropdown.selectedIndex = 0;
		inactiveLeaderSection.style.display = "block";
		activeLeaderSection.style.display = "none";
	}

	
	domElement.appendChild(inactiveLeaderSection);
	domElement.appendChild(activeLeaderSection);
}

function setLeader(character){
	var newLeaderIndex = getCharacterIndex(character);
	if(!force.hasOwnProperty("leader")){
		force.leader = {};
	}
	force.leader.leaderIndex = newLeaderIndex;

	var activeSections = document.getElementsByClassName("activeLeaderSection");
	var inactiveSections = document.getElementsByClassName("inactiveLeaderSection");

	for(var index = 0; index < activeSections.length; index++){
		activeSections[index].style.display = index == force.leader.leaderIndex ? "block" : "none";
		inactiveSections[index].style.display = index == force.leader.leaderIndex ? "none" : "block";
	}

	updateCaps();
}

function updateCaps(){

	totalCaps = 0;

	var wear_slots = ["armor"];
	var carry_slots = ["heavy_weapons", "rifles", "pistols", "melee"];
	var consumable_slots = [ "thrown", "mines", "chems"];

	if(force.hasOwnProperty("leader") && force.leader.perkIndex > 0){
		totalCaps += upgrades.heroes_and_leaders[force.leader.perkIndex].cost;
	}

	if(force.hasOwnProperty("characters")){
		force.characters.forEach(function(character){
			totalCaps += getCharacterById(character.id).cost;
	
			var upgradeCaps = 0;
			if(character.heroic){
				upgradeCaps += upgrades.heroes_and_leaders[0].cost; //Heroic is the first entry
			}

			if(character.hasOwnProperty("perks")){
				character.perks.forEach(function(perk){
					upgradeCaps += getUpgrade("perks", perk).cost;
				})
			}
	
			wear_slots.forEach(function (slotType) {
				if(character[slotType] != null){
					upgradeCaps += getUpgrade(slotType, character[slotType]).cost;
				}
			});
	
			carry_slots.forEach(function (slotType) {
				if(character[slotType] != null){
					character[slotType].forEach(function(item){
						upgradeCaps += getUpgrade(slotType,item).cost;
					});
				}
			});
	
			consumable_slots.forEach(function (slotType) {
				if(character[slotType] != null){
					Object.keys(character[slotType]).forEach(function (item) { 
						upgradeCaps += getUpgrade(slotType, item).cost * character[slotType][item];
					});
				}
			});
			totalCaps += upgradeCaps;
		});
	}

	capsSection.innerHTML = loc["total_caps"] + ": " + totalCaps;
	if (history.pushState) {
		var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + getStringForForce();
		window.history.pushState({path:newurl},'',newurl);
	}
}

function getStringForForce(){
	var forceString = "f=" + faction + ";";
	forceString += "n=" + document.getElementById("listNameArea").value + ";";
	if(force.hasOwnProperty("leader")){
		forceString += "l=" + force.leader.leaderIndex + "," + force.leader.perkIndex + ";";
	}else{
		forceString += "l=-1,0;";
	}
	if(force.hasOwnProperty("characters")){
		force.characters.forEach(function(character) {
			var charString = replaceAll(JSON.stringify(character),'"',"!");
			charString += ";";
			forceString += charString;
		});
	}
	return forceString;
}

function replaceAll(str, find, replace) {
	return str.replace(new RegExp(find, 'g'), replace);
}

function loadForceFromString(forceString){
	var objects = forceString.split(";");

	var forceValue = objects[0].split("=")[1];

	if(forceValue == "bos"){
		switchBos();
	}
	if(forceValue == "mut"){
		switchMutants();
	}
	if(forceValue == "srv"){
		switchSurvivors();
	}
	if(forceValue == "rdr"){
		switchRaiders();
	}

	var listName = "";

	if(objects[1].length > 2){
		listName = decodeURIComponent(objects[1].split("=")[1]);
	}		
	document.getElementById("listNameArea").value = listName;

	force = {};
	force.leader = {};
	force.characters = [];

	var startIndex = 2;

	var leaderInfo = objects[2].split("=")[1].split(",");
	if(leaderInfo.length == 2){
		startIndex = 3;
		force.leader.leaderIndex = parseInt(leaderInfo[0]);
		force.leader.perkIndex = parseInt(leaderInfo[1]);
	}else{
		force.leader.leaderIndex = -1;
		force.leader.perkIndex = 0;
	}

	for(var index = startIndex; index < objects.length - 1; index++){
		var toParse = replaceAll(objects[index], "!","\"");
		var characterData = JSON.parse(toParse);
		addCharacter(getCharacterById(characterData.id),characterData);
	}
}

function getCharacterById(characterId){
	for(var index = 0; index < characters.length; index++){
		if(characters[index].id == characterId){
			return characters[index];
		}
	}
	return null;
}

function getCharacterIndex(character){
	if(force == null || !force.hasOwnProperty("characters") || force.characters == null){
		return -1;
	}
	var characterIndex = force.characters.findIndex(function(otherChar){
		return otherChar === character;
	});
	return characterIndex;
}

function initialize(){
	var upgradeLoadPromise = loadURL("data/upgrades.json");
	upgradeLoadPromise.then(upgradesLoaded);
	upgradeLoadPromise.catch(function(){alert("upgrade load failed");});
}