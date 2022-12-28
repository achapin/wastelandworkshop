function setVisitorCount(){
    var footerSection = document.getElementById("footerCounter");
    var randomNumber = Math.floor(Math.random() * 2077);
    var digits = randomNumber.toString().split('');
    var realDigits = digits.map(Number);
    for(var totalDigits = 0 ; totalDigits < 7 - realDigits.length; totalDigits++){
        footerSection.innerHTML += "<img src=\"images/nixie-0.png\" />";
    }
    realDigits.forEach(function(digit){
        footerSection.innerHTML += "<img src=\"images/nixie-" + digit + ".png\" />";
    });
}