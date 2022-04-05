var loc;
var upgrades;
var units;
var mappedUnits = {};
var sortedUnitNames = [];

var forceSection;
var addSection;
var capsSection;
var previewSection;
var previewElement;

var lastTextFieldValue;
var addSectionOpen;

var totalCaps;
var faction;
var force;

var settlementMode;

var appliedFilters = [];
var possibleFilters = [
	"bos",
	"lgn",
	"crt",
	"enc",
	"ins",
	"ncr",
	"rdr",
	"rbt",
	"mut",
	"srv"
]

var wear_slots = ["power_armor", "armor", "clothing"]; //Exclusive choice
var carry_slots = ["heavy_weapons", "rifles", "pistols", "melee"]; //Multiple-choice single-instance
var consumable_slots = [ "thrown", "mines", "chems", "alcohol", "food_and_drink", "gear"]; //Multiple-choice multiple-instance

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
		};
	});
}

function upgradesLoaded(json)
{
	upgrades = json;
	console.log("upgrades loaded");
	var unitsLoadPromise = loadURL("data/units.json");
	unitsLoadPromise.then(unitsLoaded);
	unitsLoadPromise.catch(function(){alert("units load failed");});
}

function unitsLoaded(json){
	units = json;
	console.log("units loaded");
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
	console.log("loca loaded");

	var missingKeys = "";
	var missingPreview = "";

	var checkPreview = false; //Only enable for debugging
	var badPreview = "";
	var missingDefaults = "";

	units.forEach(function(character){
		if(!loc.hasOwnProperty(character.name)){
			missingKeys += character.name + ", ";
		}else{

			if(mappedUnits.hasOwnProperty(character.name)){
				console.log("Multiple character entry: " + character.name);
			}

			if(!character.hasOwnProperty("factions")){
				console.log("" + character.name + " has no factions");
			}

			mappedUnits[character.name] = character;
		}

		if(!character.hasOwnProperty("preview")){
			missingPreview += character.name+",";
		}else if (checkPreview){
			if(!urlExists("images/" + character["preview"] + ".png")) {
				badPreview += character["preview"] + " ";
			}
		}

		if(!character.hasOwnProperty("battle_mode_packs")){
			console.log(character.name + "has no battle mode packs");
			return;
		}

		if(!character.hasOwnProperty("default_equipment") && !character.hasOwnProperty("must_carry")){
			missingDefaults += character.name + " ";
			return;
		}

		character.battle_mode_packs.forEach(function(pack){
			if(!upgrades.battle_mode_packs.hasOwnProperty(pack)){
				console.log(character.name + " has bad pack name " + pack);
			}
		})
	});

	console.log("Missing default equipment: " + missingDefaults);

	Object.keys(upgrades).forEach(function(section){
		if(!loc.hasOwnProperty(section)){
			missingKeys += section + ", ";
		}
		if(section == "battle_mode_packs"){
			return;
		}
		upgrades[section].forEach(function(upgrade){
			if(!loc.hasOwnProperty(upgrade.name)){
				missingKeys += upgrade.name + ", ";
			}
			if(!upgrade.hasOwnProperty("preview")){
				missingPreview += upgrade.name+",";
			}else if (checkPreview){
			if(!urlExists("images/" + upgrade["preview"] + ".png")) {
				badPreview += upgrade["preview"] + " ";
			}
		}
		});
	});

	var missingItems = "";
	Object.keys(upgrades.battle_mode_packs).forEach(function(pack){
		upgrades.battle_mode_packs[pack].forEach(function(item){
			var split = item.split('.');
			var upgrade = getUpgrade(split[0], split[1]);
			if(upgrade == null){
				missingItems += pack.name + ": " + item + ",";
			}
		});
	});

	console.log("Missing LOC keys: " + missingKeys);
	console.log("Missing Previews: " + missingPreview);
	console.log("Missing Items: " + missingItems);
	if(checkPreview){
		console.log("Bad preview links: " + badPreview);
	}

	units.sort(orderUnitsByLocalizedName);

	initListeners();
}

function urlExists(url)
{
    var http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    return http.status!=404;
}

function orderUnitsByLocalizedName(unitOne, unitTwo){
	if(!loc.hasOwnProperty(unitOne.name))
	{
		console.log("Missing localization for " + unitOne.name);
	}
	if(!loc.hasOwnProperty(unitTwo.name))
	{
		console.log("Missing localization for " + unitTwo.name);
	}
	return loc[unitOne.name].localeCompare(loc[unitTwo.name]);
}

function initListeners(){
	document.getElementById("listNameArea").addEventListener("change", updateCaps, true);

	forceSection = document.getElementById("force");
	addSection = document.getElementById("addSection");
	capsSection = document.getElementById("caps");
	previewSection = document.getElementById("preview");

	var queryString = window.location.href.split("?");
	if(queryString.length > 1){
		loadForceFromString(queryString[1]);
	}else{
		clearForce();
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

function clearForce(){
	forceSection.innerHTML = "";

	force = {};
	force.leader = {};
	force.leader.leaderIndex = -1;
	force.leader.perkIndex = 0;
	force.characters = [];

	settlementMode = false;

	buildAddSection();

	totalCaps = 0;
	updateCaps();
}

function setSettlementMode(nowSettlementMode){
	settlementMode = nowSettlementMode;
}

function buildAddSection() {
	addSection.innerHTML = "";
	var filters = buildFiltersSection();

	var characterList = document.createElement("div");
	characterList.setAttribute("class", "characters row");
	var list = document.createElement("ul");
	characterList.appendChild(list);
	units.forEach(function(characterElement){
		var can_add = true;

		if(appliedFilters.length > 0 && characterElement.hasOwnProperty("factions") && !characterElement.factions.includes(appliedFilters[0])){
			return;
		}

		if(characterElement.hasOwnProperty("unique_code")){
			force.characters.forEach(function(otherChar){
				var otherCharElement = getCharacterById(otherChar.name)
				if(otherCharElement.hasOwnProperty("unique_code") 
					&& otherCharElement.unique_code == characterElement.unique_code){
					can_add = false;
				}
			});
		}

		var classTypes = can_add ? "btn btn-background choice" : "btn btn-background-off choice";

		var para = document.createElement("li");
		var button = document.createElement("button");

		addPreviewTooltip(characterElement, button);

		button.setAttribute("class", classTypes);
		var nameSpan = document.createElement("span");
		var nameNode = document.createTextNode(loc[characterElement.name]);
		nameSpan.appendChild(nameNode);
		var pointsSpan = document.createElement("span");
		pointsSpan.setAttribute("class", "cost");
		var pointsNode = document.createTextNode("(" + characterElement.cost + ")");
		pointsSpan.appendChild(pointsNode);
		if(can_add){
			var defaultEquipment = new Object();
			if(characterElement.hasOwnProperty("default_equipment")){
				defaultEquipment = characterElement.default_equipment;
			}
			button.addEventListener("click", function() { addCharacter(characterElement, defaultEquipment);});
		}
		button.appendChild(nameSpan);
		button.appendChild(pointsSpan);
		para.appendChild(button);
		list.appendChild(para);
	});

	addSection.appendChild(filters);
	addSection.appendChild(characterList);
}

function buildFiltersSection(){
	var filtersSection = document.createElement("div");
	filtersSection.setAttribute("class", "filters row");
	var list = document.createElement("ul");
	possibleFilters.forEach(function(filter){
		var filterEntry = document.createElement("li");
		filterEntry.setAttribute("class", appliedFilters.includes(filter) ? "filter-active" : "filter-inactive");
		filterEntry.appendChild(document.createTextNode(loc[filter]));
		filterEntry.addEventListener("click", function() {
			toggleFilter(filter);
			if(typeof(faction) === "undefined" || !force.hasOwnProperty("characters") || force.characters.length <= 0){
				faction = filter;
				updateCaps();
			}
		});
		list.appendChild(filterEntry);
	});
	filtersSection.appendChild(list);

	var settlementModeButton = document.createElement("button");
	if(settlementMode){
		settlementModeButton.setAttribute("class", "settlement_mode_enabled");
		settlementModeButton.appendChild(document.createTextNode(loc["settlement_mode"]));
	}else{
		settlementModeButton.setAttribute("class", "settlement_mode_disabled");
		settlementModeButton.appendChild(document.createTextNode(loc["battle_mode"]));
	}
	settlementModeButton.addEventListener("click", function(){
		settlementMode = !settlementMode;
		loadForceFromString(getStringForForce());
	})

	list.appendChild(settlementModeButton);

	return filtersSection;
}

function toggleFilter(filter){
	if(appliedFilters.includes(filter)){
		appliedFilters = [];
	}else{
		appliedFilters = [filter];
	}
	buildAddSection();
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

	var modSection = getModSectionFor(character, slotType, carryInfo);

	equipmentToggle.appendChild(removeButton);
	equipmentToggle.appendChild(modSection);

	if(isSelected){
		equipButton.style.display = "none";
		modSection.style.display = "block";
	}else{
		removeButton.style.display = "none"
		modSection.style.display = "none";
	}

	equipButton.addEventListener("click", function() {
		removeButton.style.display = "block";
		modSection.style.display = "block";
		equipButton.style.display = "none";
		if(character[slotType] == null){
			character[slotType] = [];
		}
		character[slotType].push(carryInfo.name);
		updateCaps();
	});

	removeButton.addEventListener("click", function() {
		equipButton.style.display = "block";
		modSection.style.display = "none";
		modSection.querySelector("SELECT").selectedIndex = 0;
		removeButton.style.display = "none";
		character[slotType] = character[slotType].filter(
			function(value, index, arr){
				value != carryInfo.name;
		});
		removeModFromCharacter(character, carryInfo.name)
		updateCaps();
	});

	section.appendChild(equipmentToggle);
}

function getModSectionFor(character, slotType, carryInfo){
	var modSection = document.createElement("div");

	var modText = document.createElement("span");
	modText.appendChild(document.createTextNode(loc["mod_section"]));

	var modDropdown = document.createElement("SELECT");
	var emptyOption = new Option(loc["none"], null);
	modDropdown.add(emptyOption);
	var optionSelectedIndex = 0;
	var optionIndex = 0;

	upgrades.mods.forEach(function(mod){
		if(mod.hasOwnProperty("types") && mod.types.includes(slotType)){
			var option = new Option(loc[mod.name] + " (" + mod.cost + ")", mod.name);

			modDropdown.add(option);
			optionIndex++;
			if(character.hasOwnProperty("mods")){
				if((carryInfo == null && character.mods.hasOwnProperty(slotType) && character.mods[slotType] == mod.name)
					|| (carryInfo != null && character.mods.hasOwnProperty(carryInfo.name) && character.mods[carryInfo.name] == mod.name)){
					optionSelectedIndex = optionIndex;
				}
			}
		}
	});

	if(modDropdown.options.length <= 1){
		return modSection;
	}
	modSection.appendChild(modText);

	modDropdown.selectedIndex = optionSelectedIndex;
	modDropdown.onchange = function(){
		if(modDropdown.value == null || modDropdown.value == "null"){
			if(carryInfo == null){
				removeModFromCharacter(character, slotType)
			}else{
				removeModFromCharacter(character, carryInfo.name)
			}
		}else{
			if(carryInfo == null){
				setModForCharacter(character, slotType, modDropdown.value)
			}else{
				setModForCharacter(character, carryInfo.name, modDropdown.value)
			}
		}
		updateCaps();
	};
	modSection.appendChild(modDropdown);
	addPreviewTooltipForMod(modDropdown);
	return modSection;
}

function setModForCharacter(character, modSlot, modValue){
	if(!character.hasOwnProperty("mods")){
		character.mods = {};
	}
	character.mods[modSlot] = modValue;
}

function removeModFromCharacter(character, modSlot){
	if(character.hasOwnProperty("mods")
			&& character.mods.hasOwnProperty(modSlot)){
		delete character.mods[modSlot];
		if(Object.keys(character.mods).length <= 0){
			delete character.mods;
		}
	}
}

function addCharacter(characterElement, presetInfo){
	var character = Object.assign({}, presetInfo);

	character.name = characterElement.name;

	var charaSection = document.createElement("div");
	charaSection.setAttribute("class", "characterElement");
	
	var headerSection = document.createElement("div");
	headerSection.setAttribute("class", "header-section");
	
	var headerLeftSection = document.createElement("div");
	headerLeftSection.setAttribute("class", "header-section-left");
	headerSection.appendChild(headerLeftSection);

	var headerRightSection = document.createElement("div");
	headerRightSection.setAttribute("class", "header-section-right");
	headerSection.appendChild(headerRightSection);

	var unitCost = document.createElement("span");
	unitCost.setAttribute("class", "unit-cost");
	headerLeftSection.appendChild(unitCost);

	var close = document.createElement("button");
	var closeButton = document.createTextNode("X");
	close.setAttribute("class", "btn btn-background-off unit-button");
	close.appendChild(closeButton);
	headerLeftSection.appendChild(close);

	if(!characterElement.hasOwnProperty("unique_code")){
		var copy = document.createElement("button");
		var copyButton = document.createTextNode("+");
		copy.setAttribute("class", "btn btn-background unit-button");
		copy.appendChild(copyButton);
		headerLeftSection.appendChild(copy);
	}

	var nameSection = document.createElement("div");
	nameSection.setAttribute("class", "unitName");
	var nameHeader = document.createElement("h1");
	var name = document.createTextNode(loc[characterElement.name]);
	nameHeader.appendChild(name);
	addPreviewTooltip(characterElement, nameHeader);
	nameSection.appendChild(nameHeader);
	headerRightSection.appendChild(nameSection);

	if(!characterElement.hasOwnProperty("unique_code")){
		var qtySection = document.createElement("div");
		qtySection.setAttribute("class", "modelCount");

		var description = document.createElement("span");
		description.appendChild(document.createTextNode(loc["model_count"]));
		qtySection.appendChild(description);

		var qtyCounter = getNumericCounterForField(character, "modelCount", 1);
		qtySection.appendChild(qtyCounter);
		headerRightSection.appendChild(qtySection);
	}

	addLeaderSection(headerRightSection, character);

	if(character.hasOwnProperty("battle_mode_packs") && characterElement.battle_mode_packs.includes("upgrades")){
		var heroicSection = document.createElement("div");
		heroicSection.setAttribute("class", "heroic");
		var heroicCheckBox = document.createElement('input');
		heroicCheckBox.type = 'checkbox';
		heroicCheckBox.checked = character.heroic;
		var heroicDescription = document.createElement("span");
		heroicDescription.setAttribute("class", "heroicDescription");
		heroicDescription.appendChild(document.createTextNode(loc["heroic"] + " (" + upgrades.heroic[1].cost +")"));
		heroicSection.appendChild(heroicDescription);
		heroicSection.appendChild(heroicCheckBox);
		heroicCheckBox.addEventListener("click", function(){
			if(heroicCheckBox.checked){
				character.heroic = true;
			}else{
				delete character["heroic"];
			}
			updateCaps();
		});
		addPreviewTooltip(upgrades.heroic[1], heroicSection);
		headerRightSection.appendChild(heroicSection);
	}

	var costSection = document.createElement("div");
	costSection.setAttribute("class","cost-section");

	var equipmentToggle = document.createElement("div");
	equipmentToggle.setAttribute("class", "equipmentToggle");
	
	var showEquipment = document.createElement("button");
	showEquipment.setAttribute("class", "btn btn-background");
	showEquipment.appendChild(document.createTextNode(loc["show_upgrades"]));
	equipmentToggle.appendChild(showEquipment);
	showEquipment.style.display = "none";

	var hideEquipment = document.createElement("button");
	hideEquipment.setAttribute("class", "btn btn-background");
	hideEquipment.appendChild(document.createTextNode(loc["hide_upgrades"]));
	equipmentToggle.appendChild(hideEquipment);
	costSection.appendChild(equipmentToggle);

	var costTable = document.createElement("table");
	costTable.setAttribute("class", "cost-table");
	var descriptionRow = document.createElement("tr");
	var pointsRow = document.createElement("tr");
	
	var modelCostDesc = document.createElement("td");
	modelCostDesc.appendChild(document.createTextNode(loc["model_cost"]));
	descriptionRow.appendChild(modelCostDesc);

	var modelCost = document.createElement("td");
	modelCost.appendChild(document.createTextNode(characterElement.cost));
	pointsRow.appendChild(modelCost);

	var modelUpgradeCostDesc = document.createElement("td");
	modelUpgradeCostDesc.appendChild(document.createTextNode(loc["model_upgrade_cost"]));
	descriptionRow.appendChild(modelUpgradeCostDesc);

	var modelUpdadeCost = document.createElement("td");
	modelUpdadeCost.setAttribute("class", "modelUpdadeCost");
	pointsRow.appendChild(modelUpdadeCost);

	var unitUpgradeCostDesc = document.createElement("td");
	unitUpgradeCostDesc.appendChild(document.createTextNode(loc["unit_upgrade_cost"]));
	descriptionRow.appendChild(unitUpgradeCostDesc);

	var unitUpgradeCost = document.createElement("td");
	unitUpgradeCost.setAttribute("class", "unitUpgradeCost");
	pointsRow.appendChild(unitUpgradeCost);

	costTable.appendChild(descriptionRow);
	costTable.appendChild(pointsRow);
	costSection.appendChild(costTable);

	var warningSection = document.createElement("div");
	warningSection.setAttribute("class", "warning");
	headerSection.appendChild(warningSection);

	var equipmentSection = document.createElement("div");
	equipmentSection.setAttribute("class", "equipment-section");

	var modelUpgradesHeader = document.createElement("h1");
	modelUpgradesHeader.appendChild(document.createTextNode(loc["model_upgrades"]));
	equipmentSection.appendChild(modelUpgradesHeader);

	if(characterElement.has_perk){
		var hasPerkSection = document.createElement("div");

		hasPerkSection.setAttribute("class", "must-wear");
		characterElement.has_perk.forEach(function(element){
			var upgrade = getUpgrade("perks", element);
			if(upgrade == null){
				alert("No upgrade " + element + " of type perks found");
			}else{
				var hasPerkElement = document.createElement("div");
				var hasPerkDescription = document.createTextNode(loc[element]);
				hasPerkElement.appendChild(hasPerkDescription);
				addPreviewTooltip(upgrade, hasPerkElement);
				hasPerkSection.appendChild(hasPerkElement);
			}
		});

		equipmentSection.appendChild(hasPerkSection);
	}

	if(characterElement.must_wear){
		var mustWearSection = document.createElement("div");
		mustWearSection.setAttribute("class", "must-wear");
		characterElement.must_wear.forEach(function(element){
			var elements = element.split(".");
			var upgrade = getUpgrade(elements[0], elements[1]);
			if(upgrade == null){
				alert("No upgrade " + elements[1] + " of type " + elements[0] + " found");
			}else{
				var mustWearElement = document.createElement("div");
				var mustWearDescription = document.createTextNode(loc[elements[1]]);
				addPreviewTooltip(upgrade, mustWearElement);
				mustWearElement.appendChild(mustWearDescription);
				mustWearSection.appendChild(mustWearElement);

				var modSecton = getModSectionFor(character, elements[0], null)
				mustWearSection.appendChild(modSecton);
			}
		});
		equipmentSection.appendChild(mustWearSection);
	}

	if(characterElement.must_carry){
		var mustCarrySection = document.createElement("div");
		mustCarrySection.setAttribute("class", "must-carry");
		characterElement.must_carry.forEach(function(element){
			var elements = element.split(".");
			var upgrade = getUpgrade(elements[0], elements[1]);
			if(upgrade == null){
				alert("No upgrade " + elements[1] + " of type " + elements[0] + " found");
			}else{
				var mustCarryElement = document.createElement("div");
				var mustCarryDescription = document.createTextNode(loc[elements[1]]);
				addPreviewTooltip(upgrade, mustCarryElement);
				mustCarryElement.appendChild(mustCarryDescription);
				mustCarrySection.appendChild(mustCarryElement);

				if(!characterElement.hasOwnProperty("mods_allowed") || characterElement.mods_allowed){
					var modSecton = getModSectionFor(character, elements[0], upgrade)
					mustCarrySection.appendChild(modSecton);
				}
			}
		});
		equipmentSection.appendChild(mustCarrySection);
	}

	if(characterElement.hasOwnProperty("tags") && (characterElement.tags.includes("robot") || characterElement.tags.includes("creature"))){
		addModdedCharacterSlots(characterElement, character, equipmentSection, settlementMode);
	} else if(!characterElement.hasOwnProperty("perks") || characterElement.perks) {
		var perkSection = getPerkSection(character);
		equipmentSection.appendChild(perkSection);
	}

	if(characterElement.name != "liberty_prime") {
		if(settlementMode){
			addSettlementModeSlots(characterElement, character, equipmentSection);
		}else{
			addBattleModeSlots(characterElement, character, equipmentSection);
		}
	}

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

	close.addEventListener("click", function() {
		forceSection.removeChild(charaSection);
		var index = getCharacterIndex(character);
		if(index != -1){
			force.characters.splice(index,1);
		}
		if(force.hasOwnProperty("leader")){
			if(force.leader.leaderIndex > index){
				force.leader.leaderIndex -= 1;
			}
			if(force.leader.leaderIndex == index){
				delete(force.leader)
			}
		}
		updateCaps();
		if(characterElement.hasOwnProperty("unique_code")){
			buildAddSection();
		}
	});
	if(!characterElement.hasOwnProperty("unique_code")){
		copy.addEventListener("click", function() {
			addCharacter(characterElement, character);	
		});
	}

	charaSection.appendChild(headerSection);
	charaSection.appendChild(costSection);
	charaSection.appendChild(equipmentSection);

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

function addModdedCharacterSlots(characterElement, character, equipmentSection, isSettlementMode){
	var perkIndex1 = 0;
	var perkIndex2 = 0;
	if(character.hasOwnProperty("char_mods"))
	{
		if(character.char_mods.length > 0) {
			perkIndex1 = character.char_mods[0];
		}
		if(character.char_mods.length > 1) {
			perkIndex2 = character.char_mods[1];
		}
	}

	var slotDropdown1 = document.createElement("SELECT");
	var slotDropdown2 = document.createElement("SELECT");
	var emptyOption1 = new Option(loc["none"], null);
	var emptyOption2 = new Option(loc["none"], null);
	slotDropdown1.add(emptyOption1);
	slotDropdown2.add(emptyOption2);
	upgrades.mods.forEach(function(mod){
		if(canEquip(mod, characterElement.tags)){
			var option1 = new Option(loc[mod.name] + " (" + mod.cost + ")", mod.name);
			var option2 = new Option(loc[mod.name] + " (" + mod.cost + ")", mod.name);
			slotDropdown1.add(option1);
			slotDropdown2.add(option2);
		}
	});

	slotDropdown1.onchange = function(){
		character.char_mods = [];
		if(slotDropdown1.selectedIndex != 0){
			character.char_mods.push(slotDropdown1.value);
		}
		if(slotDropdown2.selectedIndex != 0){
			character.char_mods.push(slotDropdown2.value);
		}
		updateCaps();
	};

	slotDropdown2.onchange = function(){
		character.char_mods = [];
		if(slotDropdown1.selectedIndex != 0){
			character.char_mods.push(slotDropdown1.value);
		}
		if(slotDropdown2.selectedIndex != 0){
			character.char_mods.push(slotDropdown2.value);
		}
		updateCaps();
	};

	var moddedCharacterSlots = document.createElement("div");
	var locKey = "mods_"+characterElement.tags[0];
	console.log(locKey)
	moddedCharacterSlots.appendChild(document.createTextNode(loc[locKey]));
	moddedCharacterSlots.appendChild(slotDropdown1);
	moddedCharacterSlots.appendChild(slotDropdown2);

	addPreviewTooltipForDropdown(slotDropdown1, "mods");
	addPreviewTooltipForDropdown(slotDropdown2, "mods");

	equipmentSection.appendChild(moddedCharacterSlots);
}

function addSettlementModeSlots(characterElement, character, equipmentSection){
	var firstConsumableSection = true;

	var characterTags = [];
	if(characterElement.hasOwnProperty("tags")){
		characterTags = characterElement.tags;
	}

	if(!characterElement.hasOwnProperty("tags") || !characterElement.tags.includes("synth"))
	{
		wear_slots.forEach(function(slotType) {
			var wearSection = getWearSection(character, false, slotType, characterTags);
				equipmentSection.appendChild(wearSection);
		});
	}

	if(characterElement.hasOwnProperty("tags") 
		&& (characterElement.tags.includes("robot") || characterElement.tags.includes("creature")) 
		&& characterElement.hasOwnProperty("must_carry")){
		//Skip all carry slots, bc this character cannot carry other weapons.
		//They can't carry other equipment other, besides specific gear
		var consumeableSection = getConsumeableSection(character, characterElement, "gear", characterTags, false);
		equipmentSection.appendChild(consumeableSection);
	}else{
		carry_slots.forEach(function(slotType) {
			var carrySection = getCarrySection(character, false, slotType, characterTags);
			equipmentSection.appendChild(carrySection);
		});

		consumable_slots.forEach(function(slotType) {
			if(firstConsumableSection){
				addUnitUpgradesHeader(equipmentSection);
				firstConsumableSection = false;
			}
			var consumeableSection = getConsumeableSection(character, characterElement, slotType, characterTags, false);
			equipmentSection.appendChild(consumeableSection);
		});
	}

	
}

function addBattleModeSlots(characterElement, character, equipmentSection){

	var characterTags = [];
	if(characterElement.hasOwnProperty("tags")){
		characterTags = characterElement.tags;
	}

	if(!characterElement.hasOwnProperty("tags") || !characterElement.tags.includes("synth"))
	{
		wear_slots.forEach(function(slotType) {
			if(slotType != "power_armor" || (character.hasOwnProperty("battle_mode_packs") && characterElement.battle_mode_packs.includes("power_armor"))){
				var wearSection = getWearSection(character, false, slotType, characterTags);
					equipmentSection.appendChild(wearSection);
			}
		});
	}

	if(characterElement.hasOwnProperty("tags") 
		&& (characterElement.tags.includes("robot") || characterElement.tags.includes("creature")) 
		&& characterElement.hasOwnProperty("must_carry")){
		//Skip all carry slots, bc this character cannot carry other weapons.
		//They can't carry other equipment other, besides specific gear
		var consumeableSection = getConsumeableSection(character, characterElement, "gear", characterTags, false);
		equipmentSection.appendChild(consumeableSection);
	}else{
		carry_slots.forEach(function (slotType) {
			var carrySection = getCarrySection(character, true, slotType, characterTags);
			equipmentSection.appendChild(carrySection);
		});

		addUnitUpgradesHeader(equipmentSection);

		consumable_slots.forEach(function (slotType) {
			var consumeableSection = getConsumeableSection(character, characterElement, slotType, characterTags, true);
			equipmentSection.appendChild(consumeableSection);
		});
	}
}

function addUnitUpgradesHeader(equipmentSection){
	var unitUpgradesHeader = document.createElement("h1");
	unitUpgradesHeader.appendChild(document.createTextNode(loc["unit_upgrades"]));
	equipmentSection.appendChild(unitUpgradesHeader);
}

function getConsumeableSection(character, characterElement, slotType, characterTags, isBattleMode){
	var consumeableSection = document.createElement("div");
	consumeableSection.setAttribute("class", "carry-section");
	var consumeableHeader = document.createElement("h2");
	var consumeableHeaderText = document.createTextNode(loc[slotType]);
	consumeableHeader.appendChild(consumeableHeaderText);

	var slotOption = null;
	if(characterElement.consumables != null){
		slotOption = characterElement.consumables[slotType];
	}

	var slotDropdown = document.createElement("SELECT");
	var emptyOption = new Option(loc["dropdown_"+slotType], null);
	slotDropdown.add(emptyOption);
	var optionSelectedIndex = 0;
	var optionIndex = 0;

	var optionSection = document.createElement("div"); 

	//console.log(slotType);
	upgrades[slotType].forEach(function(optionElement){
		if(optionElement.cost != 0 && canEquip(optionElement, characterTags) && (!isBattleMode || inBattleModeKit(optionElement, character, slotType))){
			if(character.hasOwnProperty(slotType) && character[slotType].hasOwnProperty(optionElement.name)){
				optionSection.appendChild(getConsumableEntry(optionElement, character, slotType, optionSection, slotDropdown));
			}else{
				slotDropdown.add(new Option(loc[optionElement.name] + " (" + optionElement.cost + ")", optionElement.name));
			}
		}
	});

	slotDropdown.onchange = function(){
		if(slotDropdown.value != null && slotDropdown.value != "null"){
			var upgrade = getUpgrade(slotType, slotDropdown.value);
			if(!character.hasOwnProperty(slotType)){
				character[slotType] = {};
			}
			character[slotType][slotDropdown.value] = 1;
			slotDropdown.remove(slotDropdown.selectedIndex);
			slotDropdown.selectedIndex = 0;
			var newItemEntry = getConsumableEntry(upgrade, character, slotType, optionSection, slotDropdown);
			optionSection.appendChild(newItemEntry);
		}
		updateCaps();
	};

	if(slotDropdown.length > 1)
	{
		consumeableSection.appendChild(consumeableHeader);
		consumeableSection.appendChild(optionSection);
		consumeableSection.appendChild(slotDropdown);
	}

	return consumeableSection;
}

function getConsumableEntry(optionElement, character, slotType, optionSection, slotDropdown){
	var entrySection = document.createElement("div");
	entrySection.setAttribute("class", "consumable");
	var optionNameSection = document.createElement("span");
	optionNameSection.appendChild(document.createTextNode(loc[optionElement.name]));
	var optionCostSection = document.createElement("span");
	optionCostSection.setAttribute("class", "cost");
	optionCostSection.appendChild(document.createTextNode("(" + optionElement.cost + ")"));

	var getOptionQtySection = getNumericCounterFor(character, slotType, optionElement.name, 1);

	var removeButton = document.createElement("button");
	removeButton.appendChild(document.createTextNode("X"));
	removeButton.setAttribute("class", "btn btn-background-off");
	
	entrySection.appendChild(removeButton);
	entrySection.appendChild(optionNameSection);
	entrySection.appendChild(optionCostSection);
	entrySection.appendChild(getOptionQtySection);

	addPreviewTooltip(optionElement, entrySection);

	removeButton.addEventListener("click", function() {
		delete character[slotType][optionElement.name];
		if(Object.keys(character[slotType]).length <= 0){
			delete character[slotType];
		}
		optionSection.removeChild(entrySection);
		updateCaps();

		var option = new Option(loc[optionElement.name] + " (" + optionElement.cost + ")", optionElement.name);
		var optionIndex = 0;
		for(index = 1; index < slotDropdown.options.length; index++){
			if(optionElement.name > slotDropdown.options[index].value){
				optionIndex = index;
			}
		}
		slotDropdown.add(option, optionIndex + 1);
	});
	

	return entrySection;
}

function inBattleModeKit(optionElement, character, slotType) {

	var characterElement = getCharacterById(character.name);

	if(!characterElement.hasOwnProperty("battle_mode_packs") ){
		//console.log(character.name + " has no battle mode packs assigned");
		return false;
	}

	if(optionElement.name.includes("power_armor") && !characterElement.battle_mode_packs.includes("power_armor")){
		return false;
	}

	//console.log(slotType + " " + optionElement);

	var searchName = slotType + "." + optionElement.name;

	//console.log("search " + searchName);

	var foundItem = false;

	characterElement.battle_mode_packs.forEach(function(pack){
		if(foundItem){
			return;
		}
		if(upgrades.battle_mode_packs[pack].includes(searchName)){
			foundItem = true;
			//console.log("FOUND! " + searchName);
		}
	});
	return foundItem;
}

function canEquip(optionElement, characterTags) {
	var allowed = true;

	if(characterTags.includes("dog")){
		if(!optionElement.hasOwnProperty("restrictions")
			|| !optionElement.restrictions.includes("dog")){
			return false;
		}
	}

	if(characterTags.includes("creature")){
		if(optionElement.hasOwnProperty("types")
			&& optionElement.types.includes("creature")){
			return true;
		}
		if(!optionElement.hasOwnProperty("restrictions")
			|| !optionElement.restrictions.includes("creature")){
			return false;
		}
	}

	if(characterTags.includes("robot")){
		if(optionElement.hasOwnProperty("types")
			&& optionElement.types.includes("robot")){
			return true;
		}
		if(!optionElement.hasOwnProperty("restrictions")
			|| !optionElement.restrictions.includes("robot")){
			return false;
		}
	}

	if(optionElement.hasOwnProperty("restrictions")){
		optionElement.restrictions.forEach(function(restriction){
			var tag = restriction;
			var mustHave = true;
			if(restriction.substring(0,1) == "!"){
				tag = restriction.substring(1, restriction.length);
				mustHave = false;
			}

			//console.log("find " + tag);

			if(characterTags.includes(tag)){
				if(!mustHave){
					//console.log("cannot equip " + optionElement.name + " because it has tag " + tag);
					allowed = false;
				}
			}else{
				if(mustHave){
					//console.log("cannot equip " + optionElement.name + " because it doesn't have tag " + tag);
					allowed = false;
				}
			}
		});
	}
	//if(allowed) console.log("can equip " + optionElement.name);
	return allowed;
}

function getWearSection(character, isBattleMode, slotType, characterTags){
	var wearSection = document.createElement("div");
	wearSection.setAttribute("class", "carry-section");

	var carryHeader = document.createElement("h2");
	carryHeader.setAttribute("class", "header");
	var carryHeaderText = document.createTextNode(loc[slotType]);
	carryHeader.appendChild(carryHeaderText);

	var slotDropdown = document.createElement("SELECT");
	slotDropdown.setAttribute("class", "wear_dropdown");
	var emptyOption = new Option(loc["none"], null);
	slotDropdown.add(emptyOption);
	var optionSelectedIndex = 0;
	var optionIndex = 0;

	var modSection = getModSectionFor(character, slotType, null);

	upgrades[slotType].forEach(function(optionElement){

		if(optionElement.cost != 0 && canEquip(optionElement, characterTags) && (!isBattleMode || inBattleModeKit(optionElement, character, slotType))){
			var option = new Option(loc[optionElement.name] + " (" + optionElement.cost + ")", optionElement.name);
			slotDropdown.add(option);
			optionIndex++;
			if(character[slotType] == optionElement.name){
				optionSelectedIndex = optionIndex;
			}
		}
	});

	slotDropdown.selectedIndex = optionSelectedIndex;
	modSection.style.display = optionSelectedIndex == 0 ? "none" : "inline-block";

	slotDropdown.onchange = function(){
		if(slotDropdown.value == null || slotDropdown.value == "null"){
			delete character[slotType];
			modSection.style.display = "none";
			removeModFromCharacter(character, slotType);
			if(modSection.querySelector("SELECT") != null){
				modSection.querySelector("SELECT").selectedIndex = 0;
			}
		}else{
			character[slotType] = slotDropdown.value;
			modSection.style.display = "inline-block";
		}
		updateCaps();
	};

	addPreviewTooltipForSlot(character, slotType, slotDropdown);

	if(slotDropdown.length > 1)
	{
		wearSection.appendChild(carryHeader);
		wearSection.appendChild(slotDropdown);
		wearSection.appendChild(modSection);
	}

	return wearSection;
}

function getCarrySection(character, isBattleMode, slotType, characterTags){
	var carrySection = document.createElement("div");
	carrySection.setAttribute("class", "carry-section");
	var carryHeader = document.createElement("h2");
	var carryHeaderText = document.createTextNode(loc[slotType]);
	carryHeader.setAttribute("class", "header");
	carryHeader.appendChild(carryHeaderText);

	var slotDropdown = document.createElement("SELECT");
	slotDropdown.setAttribute("class","blockdisplay");
	var emptyOption = new Option(loc["dropdown_"+slotType], null);
	slotDropdown.add(emptyOption);
	var optionSelectedIndex = 0;
	var optionIndex = 0;

	var equippedItems = document.createElement("div");
	equippedItems.setAttribute("class","equippedItems");

	var hasEquippedItem = false;

	upgrades[slotType].forEach(function(option){
		if(option.cost != 0 && canEquip(option, characterTags) && (!isBattleMode || inBattleModeKit(option, character, slotType))){
			var isEquipped = false;
			if(character.hasOwnProperty(slotType)){
				isEquipped = character[slotType].includes(option.name);
			}
			if(isEquipped){
				var entrySection = addEquipEntry(character, slotType, option, equippedItems, slotDropdown);
				equippedItems.appendChild(entrySection);
				hasEquippedItem = true;
			}else{
				var optionElement = new Option(loc[option.name] + " (" + option.cost + ")", option.name);
				slotDropdown.add(optionElement);
			}
		}
	});
	
	slotDropdown.onchange = function(){
		if(slotDropdown.value != null && slotDropdown.value != "null"){
			var upgrade = getUpgrade(slotType, slotDropdown.value);
			var newItemEntry = addEquipEntry(character, slotType, upgrade, equippedItems, slotDropdown);
			equippedItems.appendChild(newItemEntry);
			if(!character.hasOwnProperty(slotType)){
				character[slotType] = [];
			}
			character[slotType].push(slotDropdown.value);
			slotDropdown.remove(slotDropdown.selectedIndex);
			slotDropdown.selectedIndex = 0;
		}
		updateCaps();
	};

	if(slotDropdown.length > 1 || hasEquippedItem)
	{
		carrySection.appendChild(carryHeader);
		carrySection.appendChild(equippedItems);
		carrySection.appendChild(slotDropdown);
	}

	return carrySection;
}

function addEquipEntry(character, slotType, optionElement, equippedItems, slotDropdown){
	var equipmentEntry = document.createElement("div");
	equipmentEntry.setAttribute("class","equippedItem");

	var removeButton = document.createElement("button");
	removeButton.appendChild(document.createTextNode("X"));
	removeButton.setAttribute("class", "btn btn-background-off");
	equipmentEntry.appendChild(removeButton);

	var equipmentName = document.createElement("span");
	equipmentName.appendChild(document.createTextNode(loc[optionElement.name]));
	addPreviewTooltip(optionElement, equipmentName);
	equipmentEntry.appendChild(equipmentName);

	var equipmentCost = document.createElement("span");
	equipmentCost.appendChild(document.createTextNode("(" + optionElement.cost + ")"));
	equipmentEntry.appendChild(equipmentCost);

	var modSection = getModSectionFor(character, slotType, optionElement);
	equipmentEntry.appendChild(modSection);

	removeButton.addEventListener("click", function() {
		character[slotType] = character[slotType].filter(evalItem => evalItem != optionElement.name);
		if(character[slotType].length <= 0){
			delete character[slotType];
		}
		removeModFromCharacter(character, optionElement.name)
		equippedItems.removeChild(equipmentEntry);
		updateCaps();

		var option = new Option(loc[optionElement.name] + " (" + optionElement.cost + ")", optionElement.name);
		var optionIndex = 0;
		for(index = 1; index < slotDropdown.options.length; index++){
			if(optionElement.name > slotDropdown.options[index].value){
				optionIndex = index;
			}
		}
		slotDropdown.add(option, optionIndex + 1);
	});

	return equipmentEntry;
}

function getNumericCounterForField(character, field, minVal){
	var counterDiv = document.createElement("div");
	counterDiv.setAttribute("class", "numeric");

	var optionIncreaseCount = document.createElement("button");
	optionIncreaseCount.setAttribute("class", "btn btn-equipped btn-right-sm");
	optionIncreaseCount.appendChild(document.createTextNode("+"));
	optionIncreaseCount.addEventListener("click", function(){
		var value = parseInt(optionInput.value);
		if(isNaN(value)){
			optionInput.value = "0";
		}else{
			var newCount = value + 1;
			optionInput.value = newCount;
			character[field] = newCount;
			updateCaps();
		}
	});

	var optionDecreaseCount = document.createElement("button");
	optionDecreaseCount.setAttribute("class", "btn btn-equipped btn-left-sm");
	optionDecreaseCount.appendChild(document.createTextNode("-"));
	optionDecreaseCount.addEventListener("click", function(){
		var value = parseInt(optionInput.value);
		if(isNaN(value)){
			optionInput.value = "0";
			delete character[field];
		}else{
			var newCount = value - 1;
			if(newCount > minVal){
				optionInput.value = newCount;
				character[field] = newCount;
			}else{
				optionInput.value = minVal;
				character[field] = minVal;
			}
		}
		updateCaps();
	});

	var optionInput = document.createElement('input');
	optionInput.setAttribute("class", "consumeableCount");
	optionInput.size = 2;
	optionInput.type = 'text';

	if(character.hasOwnProperty(field)){
		optionInput.value = character[field];					
	}else{
		optionInput.value = "1";
		character[field] = 1;
		updateCaps();
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
			character[field] = value;
			updateCaps();
		}
	});

	counterDiv.appendChild(optionDecreaseCount);
	counterDiv.appendChild(optionInput);
	counterDiv.appendChild(optionIncreaseCount);

	return counterDiv;
}


function getNumericCounterFor(character, slotType, field){

	var counterDiv = document.createElement("div");

	var optionIncreaseCount = document.createElement("button");
	optionIncreaseCount.setAttribute("class", "btn btn-equipped btn-right-sm");
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
	optionDecreaseCount.setAttribute("class", "btn btn-equipped btn-left-sm");
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

	//TODO: NEW FILTERED UPDATE

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
	
	var chemCounter = getNumericCounterFor(character, "chems", chem, 1);
	selectedChem.appendChild(chemCounter)

	addRemoveChemButton(selectedChem, character, chemData, ownedChems, chemDropdown, addChemButton);
	addPreviewTooltip(chemData, selectedChem);
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
	perkSection.setAttribute("class", "carry-section");

	var header = document.createElement("h2");
	var headerText = document.createTextNode(loc["perks"]);
	header.appendChild(headerText);
	perkSection.appendChild(header);

	var ownedPerks = document.createElement("div");
	var perkDropdown = document.createElement("SELECT");
	perkDropdown.add(new Option(loc["dropdown_perks"], null));
	
	var characterElement = getCharacterById(character.name);

	upgrades.perks.forEach(function(perk){
		var hasPerk = false;

		var characterTags = [];
		if(getCharacterById(character.name).hasOwnProperty("tags"))
		{
			characterTags = getCharacterById(character.name).tags;
		}
		if(!canEquip(perk, characterTags))
		{
			return;
		}

		if(character.hasOwnProperty("perks")){
			character.perks.forEach(function(ownedPerk){
				if(perk.name == ownedPerk){
					hasPerk = true;
				}
			});
		}

		if(characterElement.hasOwnProperty("has_perk")
			&& characterElement.has_perk.includes(perk.name)){
			return;
		}

		if(hasPerk){
			addPerkEntry(ownedPerks, perk.name, character, perkDropdown);
		}else{
			var option = new Option(loc[perk.name] + " (" + perk.cost + ")", perk.name);
			perkDropdown.add(option);
		}
	});

	perkSection.appendChild(ownedPerks);
	var perkSelection = document.createElement("div");

	perkDropdown.onchange = function(){
		if(perkDropdown.selectedIndex != 0){
			if(!character.hasOwnProperty("perks")){
				character.perks = [];
			}
			character.perks.push(perkDropdown.value);
			addPerkEntry(ownedPerks, perkDropdown.value, character, perkDropdown);
			perkDropdown.remove(perkDropdown.selectedIndex);
			updateCaps();
		}
		perkDropdown.selectedIndex = 0;
	};
	perkSection.appendChild(perkDropdown);
	return perkSection;
}

function addPerkEntry(ownedPerks, perk, character, perkDropdown){
	var selectedPerk = document.createElement("div");
	var perkData = getUpgrade("perks", perk);
	selectedPerk.appendChild(document.createTextNode(loc[perkData.name] + " (" + perkData.cost + ")"));
	addPreviewTooltip(perkData, selectedPerk);
	addRemovePerkButton(selectedPerk, character, perkData, ownedPerks, perkDropdown);
	ownedPerks.appendChild(selectedPerk);
}

function addRemovePerkButton(selectedPerk, character, perkData, ownedPerks, perkDropdown) {
	var removeButton = document.createElement("button");
	removeButton.appendChild(document.createTextNode("X"));
	removeButton.setAttribute("class", "btn btn-background-off");
	removeButton.addEventListener("click", function() {

		if(character.perks.length <= 1){
			delete character.perks
		}else{
			var perkIndex = character.perks.findIndex(function(otherPerk){
				return perkData.name === otherPerk;
			});
			character.perks.splice(perkIndex, 1);
		}
		ownedPerks.removeChild(selectedPerk);

		var perkOption = new Option(loc[perkData.name] + " (" + perkData.cost + ")", perkData.name);
		var optionIndex = 0;
		for(index = 1; index < perkDropdown.options.length; index++){
			if(perkOption.value > perkDropdown.options[index].value){
				optionIndex = index;
			}
		}
		perkDropdown.add(perkOption, optionIndex + 1);

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
	var leaderText = document.createElement("span");
	leaderText.setAttribute("class", "leaderText");
	leaderText.appendChild(document.createTextNode(loc["leader"]));
	activeLeaderSection.appendChild(leaderText);
	var perkDropdown = document.createElement("SELECT");
	perkDropdown.setAttribute("class", "leaderPerkSelection");
	var emptyOption = new Option(loc["none"], null);
	perkDropdown.add(emptyOption);

	for(var index = 0; index < upgrades.leader.length; index++) {
		var optionElement = upgrades.leader[index];
		var characterTags = [];
		if(getCharacterById(character.name).hasOwnProperty("tags")){
			characterTags = getCharacterById(character.name).tags;
		}

		if(canEquip(optionElement, characterTags)){
			var option = new Option(loc[optionElement.name] + " (" + optionElement.cost + ")", optionElement.name);
			perkDropdown.add(option);
		}
	}

	perkDropdown.onchange = function(){
		if(!force.hasOwnProperty("leader")){
			force.leader = {};
		}
		force.leader.perkIndex = perkDropdown.selectedIndex;
		var dropDowns = document.getElementsByClassName("leaderPerkSelection");
		for(var dropDownIndex = 0; dropDownIndex < dropDowns.length; dropDownIndex++){
			dropDowns[dropDownIndex].selectedIndex = force.leader.perkIndex;
		}

		updateCaps();
	};

	activeLeaderSection.addEventListener("mousemove", function(e) {
		if(force.leader.perkIndex > 0){
			var upgrade = upgrades.leader[force.leader.perkIndex - 1];
			if(upgrade.hasOwnProperty("preview")){
				setPreview(upgrade.preview, e, true);
			}
		}
	});
	activeLeaderSection.addEventListener("mouseout", clearPreview);

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
		inactiveLeaderSection.style.display = isLeader ? "none" : "inline-block";
		activeLeaderSection.style.display = isLeader ? "inline-block" : "none";
	}else{
		perkDropdown.selectedIndex = 0;
		inactiveLeaderSection.style.display = "inline-block";
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

	faction = getCharacterById(character.name).factions[0];

	var activeSections = document.getElementsByClassName("activeLeaderSection");
	var inactiveSections = document.getElementsByClassName("inactiveLeaderSection");

	for(var index = 0; index < activeSections.length; index++){
		activeSections[index].style.display = index == force.leader.leaderIndex ? "inline-block" : "none";
		inactiveSections[index].style.display = index == force.leader.leaderIndex ? "none" : "inline-block";
	}

	updateCaps();
}

function updateCaps(){

	totalCaps = 0;

	var filtered_factions = [];

	if(force.hasOwnProperty("leader") 
		&& force.leader.leaderIndex >= 0 
		&& force.characters.length > force.leader.leaderIndex
		&& force.leader.perkIndex > 0) {
		var leaderCharacter = getCharacterById(force.characters[force.leader.leaderIndex].name);
		filtered_factions.push(leaderCharacter.factions[0]);
		faction = leaderCharacter.factions[0];
		var leaderPerk = upgrades.leader[force.leader.perkIndex - 1];
		if(leaderPerk.name == "creature_controller"){
			filtered_factions.push("crt");
		}
		if(leaderPerk.name == "robot_controller"){
			filtered_factions.push("rbt");
		}
	}

	if(force.hasOwnProperty("characters")){
		var unitIndex = 0;
		force.characters.forEach(function(character){
			var unitDisplay = forceSection.children[unitIndex];

			var modelCount = 1;
			if(character.hasOwnProperty("modelCount")){
				modelCount = character.modelCount;
			}

			var unitCost = 0;

			var characterTemplate = getCharacterById(character.name);

			var baseCost = characterTemplate.cost;

			unitCost += baseCost * modelCount;

			var modelUpdadeCost = 0;
			var unitUpgradeCost = 0;

			if(force.hasOwnProperty("leader") 
				&& force.leader.leaderIndex == unitIndex
				&& force.leader.perkIndex > 0){
				var leaderCost = upgrades.leader[force.leader.perkIndex-1].cost;
				unitCost += leaderCost;
				unitUpgradeCost += leaderCost;
			}

			if(character.hasOwnProperty("perks")){
				character.perks.forEach(function(perk){
					var perkCost = getUpgrade("perks", perk).cost;
					unitCost += perkCost;
					modelUpdadeCost += perkCost;
				})
			}

			if(character.hasOwnProperty("char_mods")){
				character.char_mods.forEach(function(perk){
					var perkCost = getUpgrade("mods", perk).cost;
					unitCost += perkCost * modelCount;
					modelUpdadeCost += perkCost;
				})
			}

			if(character.heroic){
				unitCost += upgrades.heroic[1].cost;
				unitUpgradeCost += upgrades.heroic[1].cost;
			}

			var warningSection = unitDisplay.querySelector(".warning");
			warningSection.innerHTML = "";

			if(modelCount > 1 && (character.heroic || character.hasOwnProperty("perks"))){
				var mmwarning = document.createTextNode("MULTI-MODEL UNITS CANNOT BE Heroic OR HAVE PERKS");
				warningSection.appendChild(mmwarning);
			}


			if(false){ //TODO" Faction checking
				var faction_warning = document.createTextNode("THIS UNIT IS NOT ALLOWED IN THE CURRENT FACTION");
				warningSection.appendChild(faction_warning);
			}
	
			wear_slots.forEach(function (slotType) {
				if(character[slotType] != null){
					var wearCost = getUpgrade(slotType, character[slotType]).cost;
					unitCost += wearCost * modelCount;
					modelUpdadeCost += wearCost;
				}
			});
	
			carry_slots.forEach(function (slotType) {
				if(character.hasOwnProperty(slotType)){
					character[slotType].forEach(function(item){
						var carryCost = getUpgrade(slotType,item).cost;
						unitCost += carryCost * modelCount;
						modelUpdadeCost += carryCost;
					});
				}
			});

			if(character.hasOwnProperty("mods")){
				var applied_free_mod = false;
				Object.getOwnPropertyNames(character.mods).forEach(function(moddedItem){
					var modType = character.mods[moddedItem];
					var modCost = getUpgrade("mods", modType).cost;

					var applyModCost = true;

					if(characterTemplate.hasOwnProperty("free_mod") && !applied_free_mod){

						if(characterTemplate.free_mod.mod == modType
							&& (characterTemplate.free_mod.restriction == moddedItem
								|| getUpgrade(characterTemplate.free_mod.restriction, moddedItem) != null)){
							applyModCost = false;
						}
					}

					if(applyModCost){
						unitCost += modCost * modelCount;
						modelUpdadeCost += modCost;
					}else{
						applied_free_mod = true;
					}
				})
			}

			//Consumables are shared across the entire unit, they're not per-model
			consumable_slots.forEach(function (slotType) {
				if(character[slotType] != null){
					Object.keys(character[slotType]).forEach(function (item) { 
						var consumeableCost = getUpgrade(slotType, item).cost * character[slotType][item];
						unitCost += consumeableCost;
						unitUpgradeCost += consumeableCost;
					});
				}
			});

			unitDisplay.querySelector(".unit-cost").innerHTML = unitCost;
			unitDisplay.querySelector(".modelUpdadeCost").innerHTML = modelUpdadeCost;
			unitDisplay.querySelector(".unitUpgradeCost").innerHTML = unitUpgradeCost;
			totalCaps += unitCost;
			unitIndex++;
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
	if(settlementMode){
		forceString += "s=y;";
	}else{
		forceString += "s=n;";
	}
	if(force.hasOwnProperty("leader")){
		forceString += "l=" + force.leader.leaderIndex + "," + force.leader.perkIndex + ";";
	}else{
		forceString += "l=-1,0;";
	}
	if(force.hasOwnProperty("characters")){
		force.characters.forEach(function(character) {
			var stringifiedChar = JSON.stringify(character);
			var charString = replaceAll(stringifiedChar,'"',"!");
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

	if(typeof(forceValue) !== undefined){
		appliedFilters = [forceValue];
	}

	clearForce();

	var listName = "";

	if(objects[1].length > 2){
		listName = decodeURIComponent(objects[1].split("=")[1]);
	}
	document.getElementById("listNameArea").value = listName;

	settlementMode = objects[2].split("=")[1] == "y";

	force = {};
	force.leader = {};
	force.characters = [];

	var startIndex = 3;

	var leaderInfo = objects[3].split("=")[1].split(",");
	if(leaderInfo.length == 2){
		startIndex = 4;
		force.leader.leaderIndex = parseInt(leaderInfo[0]);
		force.leader.perkIndex = parseInt(leaderInfo[1]);
	}else{
		force.leader.leaderIndex = -1;
		force.leader.perkIndex = 0;
	}

	for(var index = startIndex; index < objects.length - 1; index++){
		var toParse = replaceAll(objects[index], "!","\"");
		var characterData = JSON.parse(toParse);
		addCharacter(getCharacterById(characterData.name),characterData);

		if(force.leader.leaderIndex == index){
			faction = characterData.factions[0];
		}
	}
}

function getCharacterById(characterId){

	if(mappedUnits.hasOwnProperty(characterId)){
		return mappedUnits[characterId];
	}

	for(var index = 0; index < units.length; index++){
		if(units[index].name == characterId){
			return units[index];
		}
	}
	console.log("Could not find character type with ID " + characterId);
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

function setPreview(image, event){
	if(image != previewElement){
		previewSection.innerHTML = "<img src='images/" + image + ".png' />";
	}
	previewElement = image;

	var xPos = event.clientX;
	if(xPos + previewSection.offsetWidth > window.innerWidth){
		xPos -= xPos + previewSection.offsetWidth - window.innerWidth;
	}
	previewSection.style.left = xPos + "px";
	var yPos = event.clientY;
	if(yPos + previewSection.offsetHeight > window.innerHeight){
		yPos -= yPos + previewSection.offsetHeight - window.innerHeight;
	}
	previewSection.style.top = yPos + "px";
}

function clearPreview(){
	previewSection.innerHTML = "";
	previewElement = "";
}

function addPreviewTooltip(element, target){
	if(element.hasOwnProperty("preview")){
		target.addEventListener("mousemove", function(e) { setPreview(element.preview, e, true);});
		target.addEventListener("mouseout", clearPreview);
	}
}

function addPreviewTooltipForSlot(character, slotType, target){
	target.addEventListener("mousemove", function(e) {
		if(character.hasOwnProperty(slotType)){
			var upgrade = getUpgrade(slotType, character[slotType])
			if(upgrade != null && upgrade.hasOwnProperty("preview")){
				setPreview(upgrade.preview, e, true);
			}
		}
	});
	target.addEventListener("mouseout", clearPreview);
}

function addPreviewTooltipForMod(target){
	addPreviewTooltipForDropdown(target, "mods");
}

function addPreviewTooltipForDropdown(target, slot){
	target.addEventListener("mousemove", function(e) {
		if(target.selectedIndex != 0){
			var upgrade = getUpgrade(slot, target.value);
			if(upgrade != null && upgrade.hasOwnProperty("preview")){
				setPreview(upgrade.preview, e, true);
			}
		}
	});
	target.addEventListener("mouseout", clearPreview);
}

function initialize(){
	var upgradeLoadPromise = loadURL("data/upgrades.json");
	console.log("load upgrades");
	upgradeLoadPromise.then(upgradesLoaded);
	upgradeLoadPromise.catch(function(){alert("upgrade load failed");});
}