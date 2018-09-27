var upgrades;
var bos;
var survivors;
var mutants;
var characters;

var forceSection;
var addButton;
var addSection;
var capsSection;

var totalCaps;

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
	initListeners();
}

function initListeners(){
	document.getElementById("switch-bos").addEventListener("click", switchBos, true);
	document.getElementById("switch-mutants").addEventListener("click", switchMutants, true);
	document.getElementById("switch-survivors").addEventListener("click", switchSurvivors, true);

	forceSection = document.getElementById("force");
	addSection = document.getElementById("addSection");
	addButton = document.getElementById("addButton");
	capsSection = document.getElementById("caps");
	addButton.addEventListener("click", openAddSection);

	switchBos();
}

function switchBos() {
	characters = bos;
	clearForce();
}

function switchMutants() {
	characters = mutants;
	clearForce();
}

function switchSurvivors() {
	characters = survivors;
	clearForce();
}

function clearForce(){
	forceSection.innerHTML = "";
	addSection.innerHTML = "";
	var list = document.createElement("ul");
	characters.forEach(function(characterElement){
		var para = document.createElement("li");
		var node = document.createTextNode(characterElement.name);
		para.addEventListener("click", function() { addCharacter(characterElement);});
		para.appendChild(node);
		list.appendChild(para);
	});
	addSection.appendChild(list);
	var close = document.createElement("p");
	var closeButton = document.createTextNode("X");
	close.addEventListener("click", closeAddSection);
	close.appendChild(closeButton);
	addSection.appendChild(close);
	closeAddSection();
	totalCaps = 0;
	updateCaps();
}

function closeAddSection(){
	addSection.style.display = "none";
	addButton.style.display = "block";
}

function openAddSection(){
	addButton.style.display = "none";
	addSection.style.display = "block";
}

function addCharacter(characterElement){
	var charaSection = document.createElement("div");
	var nameSection = document.createElement("h1");
	var name = document.createTextNode(characterElement.name);
	nameSection.appendChild(name);
	charaSection.appendChild(nameSection);

	var costSection = document.createElement("p");
	var cost = document.createTextNode(characterElement.cost);
	costSection.appendChild(cost);
	charaSection.appendChild(costSection);

	var close = document.createElement("p");
	var closeButton = document.createTextNode("X");
	close.addEventListener("click", function() 
		{
			forceSection.removeChild(charaSection);
			totalCaps -= characterElement.cost; //TODO: include equipment
			updateCaps();
		}
	);
	close.appendChild(closeButton);
	charaSection.appendChild(close);
	forceSection.appendChild(charaSection);

	totalCaps += characterElement.cost;
	updateCaps();
}

function updateCaps(){
	capsSection.innerHTML = totalCaps;
}

function initialize(){
	var upgradeLoadPromise = loadURL("data/upgrades.json");
	upgradeLoadPromise.then(upgradesLoaded);
	upgradeLoadPromise.catch(function(){alert("upgrade load failed");});
}