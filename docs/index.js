
'use strict';

(function() {

	// Inputs.
	var income = 0;
	var filingStatus = 'single';
	var maxISOs = 0;

	// Outputs
	var bargainElement = 0;
	var amti = 0;
	var amtexemption = 0;
	var amtbase = 0;
	var amt = 0;
	var ordinaryTax = 0;
	var payableTax = 0;
	var longTermGains = 0;
	var shortTermGains = 0;

	// Constants for 2016.
	var exemption = {
		'single': {
			amount: 71700,
			phaseout: 510300,
			break: 194800
		},
		'married': {
			amount: 111700,
			phaseout: 1020600,
			break: 194800
		},
		'mfs': {
			amount: 54700,
			phaseout: 500000,
			break: 95750
		}
	};
	var standardDeductions = {
		'single': 12200,
		'married': 24400,
		'mfs': 12200
	}
	var ordinaryTaxRates = {
		'single': {
			'10': 0,
			'12': 9700,
			'22': 39475,
			'24': 84200,
			'32': 160725,
			'35': 204100,
			'37': 510300
		},
		'married': {
			'10': 0,
			'12': 19400,
			'22': 78950,
			'24': 168400,
			'32': 321450,
			'35': 408200,
			'37': 612350
		},
		'mfs': {
			'10': 0,
			'12': 9525,
			'22': 38700,
			'24': 82500,
			'32': 157500,
			'35': 200000,
			'37': 300000
		}
	}

	var exercises = [];

	// Calculate bargain element.
	// (fmv - strike price) * ISOs exercised
	// We pass `isos` into the function to allow for newton's method
	function calculateBargainElement(isos, strike, fmv) {
		return (num(fmv) - num(strike)) * num(isos);
	}

	// Calculate amt exemption.
	function calculateAmtExemption(amti) {
		var ex = exemption[filingStatus];
		var amount = ex.amount;
		var deduct = 0;
		if (num(amti) > ex.phaseout) deduct += (num(amti) - ex.phaseout) * 0.25;
		amount -= deduct;
		if (amount > 0) return amount;
		return 0;
	}

	// Calculate amt.
	function calculateAmt(amtbase) {
		var ex = exemption[filingStatus];
		if (num(amtbase) > ex.break) return ex.break * 0.26 + (num(amtbase) - ex.break) * 0.28;
		if (isNaN(amtbase)) amtbase = 0;
		return num(amtbase) * 0.26;
	}

	// Calculate ordinary tax.
	function calculateOrdinaryTax() {
		var inc = num(income) - standardDeductions[filingStatus] + num(shortTermGains);
		var ord = ordinaryTaxRates[filingStatus];
		var keys = Object.keys(ord);
		var bracket = 0;
		var tax = 0;

		// Figure out which bracket we're in.
		var i = 0;
		while (inc > ord[keys[i]]) {
			i++;
		}
		i--;

		// Calculate it.
		tax += (inc - ord[keys[i]]) * num(keys[i]) / 100
		i--;
		while (i >= 0) {
			tax += (ord[keys[i + 1]] - ord[keys[i]]) * num(keys[i]) / 100
			i--;
		}

		var ltg = num(longTermGains);
		var ltgTax = 0;
		if (num(income) < 39375) {
			ltgTax = 0
		} else if (num(income) < 434550) {
			ltgTax = ltg * 0.15;
		} else {
			ltgTax = ltg * 0.2;
		}

		tax = ltgTax + tax;

		return tax;
	}

	// Set the filing status.
	document.querySelectorAll('a.filing-status').forEach(function(el) {
		el.addEventListener('click', function(e) {
			var arr = document.querySelectorAll('a.filing-status');
			var status = e.target.id;
			for (var i = 0; i < arr.length; i++) {
				if (arr[i].id !== status) removeClass(arr[i], 'active')
				else {
					addClass(arr[i], 'active');
					filingStatus = status;
				}
			}
			calculate();
			updateHtml();
		})
	})

	// Calculate everything.
	function calculate() {
		let totalBargain = 0;
		exercises.forEach(exercise => {
			const exerciseBargainElement = exercise['bargainElement'];
			totalBargain = totalBargain + exerciseBargainElement;
		});
		amti = num(income) + num(longTermGains) + num(shortTermGains) + num(totalBargain);
		amtexemption = calculateAmtExemption(num(amti));
		amtbase = num(amti) - num(amtexemption);
		amt = calculateAmt(num(amtbase));
		ordinaryTax = calculateOrdinaryTax();
		payableTax = Math.max(num(amt), num(ordinaryTax))
	}

	// Collect inputs.
	function getInputs() {
		income = document.getElementById('income').value
		longTermGains = document.getElementById('long-term-gains').value;
		shortTermGains = document.getElementById('short-term-gains').value;
	}

	// Format inputs.
	function formatInputs() {
		document.getElementById('income').value = document.getElementById('income').value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		// document.getElementById('isos').value = document.getElementById('isos').value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		// document.getElementById('strike').value = document.getElementById('strike').value.replace(/\D\./g, "");
		// document.getElementById('fmv').value = document.getElementById('fmv').value.replace(/\D\./g, "");
	}

	function clearIsoInputs() {
		document.getElementById('isos').value = ''
		document.getElementById('strike').value = ''
		document.getElementById('fmv').value = ''
	}

	function addExerciseToTable(isos, strike, fmv, bargainElement) {
		const exerciseTable = document.getElementById('exercises-list');
		const exerciseRow = exerciseTable.insertRow();
		const isosItem = exerciseRow.insertCell();
		const strikeItem = exerciseRow.insertCell();
		const fmvItem = exerciseRow.insertCell();
		const bargainElementItem = exerciseRow.insertCell();
		isosItem.innerText = isos
		strikeItem.innerText = strike;
		fmvItem.innerText = fmv;
		bargainElementItem.innerText = bargainElement;
	}

	function addExercise() {
		const isos = document.getElementById('isos').value;
		const strike = document.getElementById('strike').value;
		const fmv = document.getElementById('fmv').value;
		const bargainElement = calculateBargainElement(isos, strike, fmv);

		exercises.push({ 'isos': isos, 'strike': strike, 'fmv': fmv, 'bargainElement': bargainElement });
		addExerciseToTable(isos, strike, fmv, bargainElement);
		clearIsoInputs();
		calculate();
		maxISOs = findISOs();
		updateHtml();
	}

	// Send outputs to HTML elements.
	function updateHtml() {
		document.getElementById('bargainElement').innerText = numberFormat(bargainElement, ',');
		document.getElementById('amti').innerText = numberFormat(amti, ',');
		document.getElementById('amtexemption').innerText = numberFormat(amtexemption, ',');
		document.getElementById('amtbase').innerText = numberFormat(amtbase, ',');
		document.getElementById('amt').innerText = numberFormat(amt, ',');
		document.getElementById('ordinaryTax').innerText = numberFormat(ordinaryTax, ',');
		document.getElementById('income-output').innerText = document.getElementById('income').value;
		document.getElementById('payable-tax').innerText = numberFormat(payableTax, ',');
		if (amt > ordinaryTax) {
			removeClass(document.getElementById('max-isos-wrapper'), 'dn');
			document.getElementById('max-isos').innerText = numberFormat(maxISOs, ',');
		} else {
			addClass(document.getElementById('max-isos-wrapper'), 'dn');
		}
	}

	// Whenever user key ups on the form.
	document.querySelector('form').addEventListener('keyup', function(e) {
		getInputs();
		formatInputs();
		calculate();
		maxISOs = findISOs();
		updateHtml();
	})

	document.getElementById('add-exercise').onclick = addExercise;

	// Format numbers.
	function numberFormat(number, _sep) {
		var _number = number;
	  _number = typeof _number != "undefined" && _number > 0 ? _number : "";
	  _number = '' + Math.round(_number);
	  _number = _number.replace(new RegExp("^(\\d{" + (_number.length%3? _number.length%3:0) + "})(\\d{3})", "g"), "$1 $2").replace(/(\d{3})+?/gi, "$1 ").trim();
	  if (typeof _sep != "undefined" && _sep != " ") _number = _number.replace(/\s/g, _sep);
	  return _number;
	}

	// Turn string to number.
	function num(string) {
		if (typeof string === 'undefined') return 0;
		if (typeof string === 'number') return string;
		string = string.replace(/\,/g,'');
		return parseFloat(string, 10);
	}

	/**
	 * Netown's method to approximate ISO shares where Ordinary Tax equals AMT
	 */

	function findISOs() {
		if (exercises.length == 0) {
			return;
		}
		var lastExercise = exercises[exercises.length-1];
		var isos = lastExercise['isos'];
		var fmv = lastExercise['fmv'];
		var strike = lastExercise['strike'];
		var tempMaxISOs = num(isos);
		var discrepancy = amt - ordinaryTax;

		var counter = 0;

		var upper = num(isos);
		var lower = 0;

		// Iterate until discrepancy is less than 100.
		while (Math.abs(discrepancy) > 10) {
			// Not the most intelligent routing of seeding ISOs.
			if (discrepancy > 0) {
				upper = tempMaxISOs;
				tempMaxISOs = (upper + lower) / 2;
			}
			if (discrepancy < 0) {
				lower = tempMaxISOs;
				tempMaxISOs = (upper + lower) / 2;
			}

			var bargainElement = calculateBargainElement(tempMaxISOs, strike, fmv);
			var amti = num(income) + num(bargainElement);
			var amtexemption = calculateAmtExemption(num(amti));
			var amtbase = num(amti) - num(amtexemption);
			var newAmt = calculateAmt(num(amtbase));

			discrepancy = newAmt - ordinaryTax;

			// console.log('counter %d, discrepancy %d, isos %d', counter, discrepancy, tempMaxISOs)

			counter++;
			if (counter > 100) break;
		}

		return tempMaxISOs;
	}

	/**
	 * Add class once.
	 */

	function addClass(el, c) {
		if (el.classList.contains(c)) return;
		return el.classList.add(c);
	}

	/**
	 * Remove class once.
	 */

	function removeClass(el, c) {
		if (el.classList.contains(c)) return el.classList.remove(c);
	}

})()
