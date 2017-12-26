(function(){
	'use strict';

	// Configurations used by the translator API (visite https://translate.yandex.net/api/ to get your API key)
	var apiKey = '';
	var languagePair = '';

	var subtitleReader = function(text) {

		var
			arrText = [],
			lineIndex = -1,
			status = 0,
			sleepTime = 0,
			speed = .6,
			timeoutVariable = undefined,
			self = this;

		this.setText = function(text) {
			if(text == undefined)
				return;
			lineIndex = 0;
			arrText = clear(text).split('\n');
		}

		this.setSpeed = function(s) {
			if(isNaN(s))
				return;
			speed = s;
		}

		this.getSpeed = function() {
			return speed;
		}

		this.getRemainingTime = function() {
			var remainingTime = 0;
			for(var i=lineIndex; i < arrText.length - 1; i++) // do not count the time of the last one (this is the reason for arrText.length)
				remainingTime += parseInt(60 * arrText[i].length / speed);
			return remainingTime;
		}

		this.setDisplayTextFunction = function(f) {
			displayText = f;
		}

		this.goTo = function(n) {
			lineIndex = n;
			displayText(arrText[lineIndex], lineIndex);
		}

		this.getCurrentText = function() {
			return arrText[lineIndex];
		}

		this.previous = function() {
			if(lineIndex == 0)
				return;
			lineIndex--;
			displayText(arrText[lineIndex], lineIndex);
		}

		this.next = function() {
			if(lineIndex == arrText.length-1)
				return;
			lineIndex++;
			displayText(arrText[lineIndex], lineIndex);
		}

		this.toggle = function() {
			if(status == 1)
				self.stop();
			else
				self.start();
		}

		this.start = function () {
			status = 1;
			timeoutFunction();
		}

		this.stop = function() {
			if(timeoutVariable !== undefined)
				clearTimeout(timeoutVariable);
			status = 0;
		}

		this.getTotal = function() {
			return arrText.length;
		}

		this.getTextArray = function() {
			return arrText;
		}

		this.getIndex = function() {
			return lineIndex;
		}

		this.getStatus = function() {
			return status;
		}

		var timeoutFunction = function() {
			if(lineIndex >= arrText.length) {
				self.stop();
				return;
			}
			lineIndex++;
			var line = arrText[lineIndex];
			displayText(line, lineIndex);
			sleepTime = parseInt(60 * line.length / speed);
			if(status == 1)
				timeoutVariable = setTimeout(timeoutFunction, sleepTime);
		}

		var displayText = function(text, index) {
			console.log(text);
		}

		var clear = function(text) {
			var text = strip_tags(text);

			// remove times and numbers
			text = text.split('\n').map(function(e){
				return e.replace(/^([0-9].*)/, '');
			});

			// remove blank lines
			text = text.filter(function(e){
				return e.length > 0;
			});

			// join
			text = text.join('\n');

			return text;
		}

		var strip_tags = function(input, allowed) {
			allowed = (((allowed || '') + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('')
		 	var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi
		 	var commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi
		 	return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
				return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : ''
		 	})
		}

		this.setText(text);
	}

	var translateApi = function(apiKey, languagePair) {

		var _apiKey, _languagePair;

		var constructor = function(apiKey, languagePair) {

			// Get your developer key at https://tech.yandex.com/translate/
			_apiKey = apiKey;

			// Get the language pair consulting the documentation of yandex API
			_languagePair = languagePair;

		}

		var getUrl = function(text) {
			var url = 'https://translate.yandex.net/api/v1.5/tr.json/translate?';
			url += 'key=' + _apiKey;
			url += '&text=' + text;
			url += '&lang=' + _languagePair;
			return url;
		}

		this.translate = function(text, callback) {
			//console.log(getUrl(text));
			//return;
			var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
				if (this.readyState == 4 && this.status == 200) {
					callback(JSON.parse(this.responseText).text);
				}
			};
			xhttp.open("POST", getUrl(text), true);
			xhttp.send();
		}

		constructor(apiKey, languagePair);

	}

	document.addEventListener('DOMContentLoaded', function(){
		var r = new subtitleReader();
		var display = document.getElementById('display');
		var info = document.getElementById('info');
		var gt = document.getElementById('goto');
		var hisElement = document.getElementById('history');
		var speedElement = document.getElementById('speed');

		gt.addEventListener('blur', function(){
			r.goTo(gt.value);
		});

		speedElement.value = r.getSpeed();
		speedElement.addEventListener('blur', function(){
			r.setSpeed(speedElement.value);
		});

		var clearElement = function(node) {
			while (node.firstChild)
				node.removeChild(node.firstChild);
		}

		r.setDisplayTextFunction(function(t, index) {
			var totalNumber = r.getTotal();

			// update the statistics
			info.innerHTML = (index+1) + '/' + totalNumber + ' (' + (Math.round(((index+1)/totalNumber) * 100 * 100) / 100) + '%) ';
			info.innerHTML += (Math.round(r.getRemainingTime() / 1000 / 60 * 100) / 100) + ' minutes remaining';
			gt.value = index;

			// upate the text
			display.innerHTML = t;

			// update the history
			var arrText = r.getTextArray();
			clearElement(hisElement);
			var position = 0;
			var historySize = 10;
			for(var i=(parseInt(historySize/2) * -1); i <= parseInt(historySize/2); i++) {
				position = index + i;
				if(position < 0 || position >= r.getTotal())
					continue;

				var newElement = document.createElement('div');
				newElement.setAttribute('class', (position == index) ? 'itemselected' : 'item');
				newElement.appendChild(document.createTextNode(arrText[position]));
				hisElement.appendChild(newElement);
			}

		});

		// Used to translate
		var translate = function() {
			var previousStatus = r.getStatus();
			if(previousStatus == 1)
				r.stop();
			var t = new translateApi(apiKey, languagePair);
			t.translate(r.getCurrentText(), function(t){
				alert(t);
				if(previousStatus == 1)
					r.start();
			});
		}

		document.addEventListener('keypress', function(e){
			switch(e.key) {
				case 'p':
					r.toggle();
					break;
				case '.':
					r.next();
					break;
				case ',':
					r.previous();
					break;
				case 't':
					translate();
					break;
			}
		});

		document.getElementById('btn-play').addEventListener('click', r.toggle);
		document.getElementById('btn-previous').addEventListener('click', r.previous);
		document.getElementById('btn-next').addEventListener('click', r.next);
		document.getElementById('btn-translate').addEventListener('click', translate);

		document.getElementById('text').addEventListener('blur', function(){
			r.setText(this.value);
			r.start();
		});

	}, false);

})();