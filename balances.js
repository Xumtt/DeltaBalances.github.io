{

	// shorthands
	var _delta = bundle.EtherDelta;
	var _util = bundle.utility;
	
	// initiation
	var initiated = false;
	var autoStart = false;
	
	var requestID = 0;
	
	// loading states
    var table1Loaded = false;
	var table2Loaded = false;
	var loadedED = 0;
    var loadedW = 0;
	var loadedBid = 0;
	var displayedED = false;
	var displayedW = false;
	var displayedBid = false;
	
	var loadedCustom = false;
	var trigger_1 = false;
	var trigger_2 = false;
	var running = false;
	
	var etherscanFallback = false;
	
	// settings
	var hideZero = true;
    var decimals = false;
	var fixedDecimals = 3; 
    var remember = false;
	var useAsk = false;
	
	var showTransactions = true;
    var showBalances = true;	
	var showCustomTokens = false;
	var showDollars = true;
	

    // user input & data
	var publicAddr = '';
    var lastResult = undefined;
	var lastResult2 = undefined;
	var lastResult3 = undefined;
	
	// config
	var tokenCount = 0; //auto loaded
	var blocktime = 14;
	var blocknum = -1;
	var startblock = 0;
	var endblock = 'latest';	
	var transactionDays = 1;
	var walletWarningBalance = 0.003;
	
	var uniqueTokens = {};
	var balances= {};
	var etherPrice = 0;
	
	

	
	// placeholder
    var balancesPlaceholder = { 
        "0x0000000000000000000000000000000000000000" : 
		{
            Name: 'ETH',
            Wallet: 0,
            EtherDelta: 0,
            Total: 0,
			Unlisted: false,
			Address:'',
			Bid: '',
			Ask: '',
			'Est. ETH': '',
        },
    };
	
	// placeholder
	var transactionsPlaceholder = [
		{
			Status:true,
			Type: 'Deposit',
			Name: 'ETH',
			Value: 0,
			Price: 0,
			'ETH': 0,
			Hash: '',
			Date: toDateTimeNow(),
			Details: (window.location.origin + window.location.pathname).replace('index.html','') + 'tx.html',
			Unlisted: false,
			TokenAddr: ''
		}
	];
		

	init();
	
    $(document).ready(function() 
	{
		readyInit();  
    });
	
	function init()
	{			
		// borrow some ED code for compatibility
        _delta.startEtherDelta(() => 
		{	
			if(!autoStart)
			{
				if(blocknum > -1)
				{
					startblock = getStartBlock(blocknum, transactionDays);
				}
				else {
					_util.blockNumber(_delta.web3, (err, num) => 
					{
						if(!err && num)
						{
							blocknum = num;
							startblock = getStartBlock(blocknum, transactionDays);
						}
					});
				}
			}
			//import of etherdelta config
			if(etherDeltaConfig && etherDeltaConfig.tokens)
			{
				_delta.config.tokens = etherDeltaConfig.tokens;
			}
			else 
			{
				showError('failed to load token data');
				return;
			}
			
			// note all listed tokens
			for(var i = 0; i < _delta.config.tokens.length; i++)
			{
				var token = _delta.config.tokens[i];
				if(token)
				{
					token.name = escapeHtml(token.name); // escape nasty stuff in token symbol/name
					token.addr = token.addr.toLowerCase();
					token.unlisted = false;
					_delta.config.tokens[i] = token;
					if(!tokenBlacklist[token.addr] && !uniqueTokens[token.addr]) 
					{	
						uniqueTokens[token.addr] = token;
					}
				}
			}
			
			//format MEW tokens like ED tokens
			offlineCustomTokens = offlineCustomTokens.map((x) => { return {"name": escapeHtml(x.symbol),
																		   "addr": x.address.toLowerCase(),
																		   "unlisted": true,
																		   "decimals":x.decimal,
																		  };
																 });
			//filter out custom tokens that have been listed by now
			_delta.config.customTokens = offlineCustomTokens.filter((x) => {return !(uniqueTokens[x.addr])});
			// note custom tokens
			for(var i = 0; i < _delta.config.customTokens.length; i++)
			{
				var token = _delta.config.customTokens[i];
				if(token && !tokenBlacklist[token.addr] && !uniqueTokens[token.addr]) {
					uniqueTokens[token.addr] = token;
				}
			}
			
			// treat tokens listed as staging as unlisted custom tokens
			if(stagingTokens && stagingTokens.tokens)
			{
				//filter tokens that we already know
				var stageTokens = stagingTokens.tokens.filter((x) => {return !(uniqueTokens[x.addr])});
				for(var i = 0; i < stageTokens.length; i++)
				{
					var token = stageTokens[i];
					if(token)
					{
						token.name = escapeHtml(token.name); // escape nasty stuff in token symbol/name
						token.addr = token.addr.toLowerCase();
						token.unlisted = true;
						if(!tokenBlacklist[token.addr] && !uniqueTokens[token.addr]) 
						{	
							uniqueTokens[token.addr] = token;
							_delta.config.customTokens.push(token);
						}
					}
				}
			}
			
			if(allShitCoins)
			{
				//filter tokens that we already know
				var shitCoins = allShitCoins.filter((x) => {return !(uniqueTokens[x.addr]) && true;});
				for(var i = 0; i < shitCoins.length; i++)
				{
					var token = shitCoins[i];
					if(token)
					{
						token.name = escapeHtml(token.name); // escape nasty stuff in token symbol/name
						token.addr = token.addr.toLowerCase();
						token.unlisted = true;
						if(!tokenBlacklist[token.addr] && !uniqueTokens[token.addr]) 
						{	
							uniqueTokens[token.addr] = token;
							_delta.config.customTokens.push(token);
						}
					}
				}
			}
			checkCustom();
			initiated = true;
			if(autoStart)
				myClick();
		});
	}
	
	function readyInit()
	{		
			getStorage();
		setAddrImage('0x0000000000000000000000000000000000000000');
		createSelect();
		//hideError();
		//hideHint();
		//$('#loadingBalances').hide();
		//$('#loadingTransactions').hide();
		
		$('#zero').prop('checked', hideZero);
        $('#decimals').prop('checked', decimals);
		$('#custom').prop('checked', showCustomTokens);
		$('#remember').prop('checked', remember);
		$('#dollars').prop('checked', showDollars);
		
		// detect enter & keypresses in input
        $('#address').keypress(function(e) 
		{
            if (e.keyCode == 13) {
                $('#refreshButton').click();
                return false;
            } else {
				hideError();
				return true;
			}
        });
		
		$(window).resize(function () { 
			$("#transactionsTable").trigger("applyWidgets"); 
			$("#transactionsTable2").trigger("applyWidgets"); 
			$("#resultTable").trigger("applyWidgets"); 
		});
		
				// tab change
		$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
			if(!lastResult && !lastResult2)
				placeholderTable();
			else {
				if(lastResult)
					makeTable(lastResult, hideZero);
				if(lastResult2)
					makeTable2(lastResult2);
			}
			
			
			// fix scroller on tab change
			$("#transactionsTable").trigger("applyWidgets"); 
			$("#transactionsTable2").trigger("applyWidgets"); 
			$("#resultTable").trigger("applyWidgets"); 
			
		});
		
		// contract change
		$('#contractSelect').change(e => {
			_delta.changeContract(e.target.selectedIndex);
			if(document.getElementById('address').value !== '')
				myClick();
		});
		
		

        placeholderTable();
		
		// url parameter ?addr=0x... /#0x..
		var addr = getParameterByName('addr');
		if(! addr)
		{
			var hash = window.location.hash;  // url parameter /#0x...
			if(hash)
				addr = hash.slice(1);
		}
		if(addr)
		{
			addr = getAddress(addr);
			if(addr)
			{
				publicAddr = addr;
				autoStart = true;
				// auto start loading
				myClick();
			}
		} 
		else if(publicAddr) //autoload when remember is active
		{
			autoStart = true;
			// auto start loading
			myClick();
		}
		else if(!addr && !publicAddr)
		{
			_delta.connectSocket();
			$('#address').focus();
		}
	}
		
	// zero balances checkbox
	var changeZero = false;
    function checkZero() 
	{
		changeZero = true;
        hideZero = $('#zero').prop('checked');
        if (lastResult) {
            $('#resultTable tbody').empty();
            makeTable(lastResult, hideZero);
        } 
		changeZero = false;
    }
	
	function checkAsk()
	{
		useAsk = $('#ask').prop('checked');

		$("#resultTable").trigger("destroy");
		 $('#resultTable tbody').html('');
		 $('#resultTable thead').html('');
		table1Loaded = false;
		
		if (lastResult) {
			finishedBalanceRequest();
			makeTable(lastResult, hideZero);
		} else {
			placeholderTable();
		}
	}
	
	function checkDollars()
	{
		showDollars = $('#dollars').prop('checked');

		$('#ethbalancePrice').html('');
		$('#tokenbalancePrice').html('');
		$('#totalbalancePrice').html('');
		
		if(showDollars && lastResult)
		{
			finishedBalanceRequest();
		}
		 setStorage();
	}

	// remember me checkbox
    function checkRemember()
	{
        remember = $('#remember').prop('checked');
		if(!remember)
		{
			window.location.hash = "";
		}
        setStorage();
    }

	// more decimals checbox
	var changedDecimals = false;
    function checkDecimal() 
	{
		changedDecimals = true;
        decimals = $('#decimals').prop('checked');
		
		fixedDecimals = decimals ? 8 : 3;
		
		$('#resultTable tbody').empty();
        $('#resultTable thead').empty();
		
		$('#transactionsTable tbody').empty();
        $('#transactionsTable thead').empty();
		
		$('#transactionsTable2 tbody').empty();
        $('#transactionsTable2 thead').empty();
        
        if (lastResult) {
			//table1Loaded = false;
		//	table2Loaded = false;
           makeTable(lastResult, hideZero);
		   makeTable2(lastResult2);
        } else {
			placeholderTable();
		}
		changedDecimals = false;
    }

	function checkCustom()
	{
		showCustomTokens = $('#custom').prop('checked');
		let maxcount = Object.keys(uniqueTokens).length;
		if(showCustomTokens) 
		{
			tokenCount = maxcount;
			if(lastResult && lastResult2 && loadedCustom)
			{

				makeTable(lastResult, hideZero);
				makeTable2(lastResult2);

			}
			else if(publicAddr) {
				myClick();
			}
				
		}
		else
		{
			tokenCount = _delta.config.tokens.length;

			if(lastResult)
				makeTable(lastResult, hideZero);
			if(lastResult2)
				makeTable2(lastResult2);
		}
		$('#tokencount').html(" " + tokenCount + "/" + maxcount);
	}
	
	
	function disableInput(disable)
	{
		$('#refreshButton').prop('disabled', disable);
       // $("#address").prop("disabled", disable);
		$("#loadingBalances").prop("disabled", disable);
		$('#loadingBalances').addClass('dim');
		$('#loadingTransactions').addClass('dim');
		$("#loadingTransactions").prop("disabled", disable);
		$('#loadingTransactions2').addClass('dim');
		$("#loadingTransactions2").prop("disabled", disable);
	
	}
	
	function showLoading(balance, trans)
	{
		if(balance)
		{
			$('#loadingBalances').addClass('fa-spin');
			$('#loadingBalances').addClass('dim');
			$('#loadingBalances').prop('disabled', true);
			$('#loadingBalances').show();
			$('#refreshButtonLoading').show();
			$('#refreshButtonSearch').hide();
		}
		if(trans)
		{
			$('#loadingTransactions').addClass('fa-spin');
			$('#loadingTransactions').addClass('dim');
			$('#loadingTransactions').prop('disabled', true);
			$('#loadingTransactions').show();
			$('#loadingTransactions2').addClass('fa-spin');
			$('#loadingTransactions2').addClass('dim');
			$('#loadingTransactions2').prop('disabled', true);
			$('#loadingTransactions2').show();
			$('#refreshButtonLoading').show();
			$('#refreshButtonSearch').hide();
		}
		if(!trans && !balance)
		{
			$('#refreshButtonLoading').hide();
			$('#refreshButtonSearch').show();
		}
	}
	
	function buttonLoading(balance, trans)
	{
		if(!publicAddr)
		{			
			hideLoading(balance,trans);
			return;
		}
		if(balance)
		{
			$('#loadingBalances').removeClass('fa-spin');
			$('#loadingBalances').removeClass('dim');
			$('#loadingBalances').prop('disabled', false);
			$('#loadingBalances').show();
			$('#refreshButtonLoading').show();
			$('#refreshButtonSearch').hide();
		}
		if(trans)
		{
			$('#loadingTransactions').removeClass('fa-spin');
			$('#loadingTransactions').removeClass('dim');
			$('#loadingTransactions').prop('disabled', false);
			$('#loadingTransactions').show();
			$('#loadingTransactions2').removeClass('fa-spin');
			$('#loadingTransactions2').removeClass('dim');
			$('#loadingTransactions2').prop('disabled', false);
			$('#loadingTransactions2').show();
			$('#refreshButtonLoading').show();
			$('#refreshButtonSearch').hide();
		}
		if(trans && balance)
		{
			$('#refreshButtonLoading').hide();
			$('#refreshButtonSearch').show();
		}
	}

	function hideLoading(balance, trans)
	{
		if(!publicAddr)
		{			
			balance = true;
			trans = true;
			$('#refreshButtonLoading').hide();
			$('#refreshButtonSearch').show();
		}
		if(balance)
		{
			if(!trans)
				$('#loadingBalances').removeClass('fa-spin');		
			else
				$('#loadingBalances').hide();
		}
		if(trans) 
		{
			if(!balance)
			{
				$('#loadingTransactions2').removeClass('fa-spin');		
				$('#loadingTransactions').removeClass('fa-spin');		
			}
			else
			{
				$('#loadingTransactions2').hide();
				$('#loadingTransactions').hide();
			}
		}
		
		if(trans && balance)
		{
			$('#refreshButtonLoading').hide();
			$('#refreshButtonSearch').show();
		}
	}
	
	function myClick()
	{
		if(running)
			requestID++;
		if(!initiated)
		{
			autoStart = true;
			return;
		}
		
		hideError();
		hideHint();
		//disableInput(true);
		$('#downloadBalances').html('');
		$('#downloadDeposits').html('');
		// validate address
		if(!autoStart)
			publicAddr = getAddress();
		
		autoStart = false;
		if(publicAddr)
		{
			window.location.hash = publicAddr;
			getAll(false, requestID);

		}
		else
		{
			//placeholder();
			console.log('invalid input');
            disableInput(false);
			hideLoading(true,true);
		}
	}
	
	function getAll(autoload, rqid)
	{
		//if(running)
		//	return;
		
		running = true;
		
		trigger_1 = true;
		trigger_2 = true;
		
        lastResult = undefined;
		lastResult2 = undefined;
		lastResult3 = undefined;
		
        if (publicAddr) 
		{	
			setStorage();
			window.location.hash = publicAddr;
			getTrans(rqid);
			getBalances(rqid);
		
        } else {
			running = false;
        }
	}
	
	function getBalances(rqid)
	{
		if(!rqid)
			rqid = requestID;
		if(!trigger_1)
			return;
		
		
		if(showBalances)
		{
			balances = {};
			
			$('#ethbalance').html('');
			$('#tokenbalance').html('');
			$('#totalbalance').html('');
			
			$('#ethbalancePrice').html('');
			$('#tokenbalancePrice').html('');
			$('#totalbalancePrice').html('');
			
			$('#downloadBalances').html('');
			
			trigger_1 = false;
			//disableInput(true);
			loadedW = 0; // wallet async load progress
			loadedED = 0; // etherdelta async load progress
			loadedBid = 0;
			displayedED = false;
			displayedW = false;
			displayedBid = false;
			
			loadedCustom = false;
			$('#resultTable tbody').empty();
			showLoading(true,false);
			
			var allCount = Object.keys(uniqueTokens).length;
			var allTokens = Object.values(uniqueTokens);
			if(!showCustomTokens){
				tokenCount = allTokens.filter((x) => {return !x.unlisted}).length;
			} else {
				tokenCount = allCount;
			}

			for (var i = 0; i < allCount; i++) 
			{
				var token = allTokens[i];
				if(token)
					initBalance(token);					
			}
				
				//getAllBalances(rqid);
				getAllBalances(rqid, 'EtherDelta');
				getAllBalances(rqid, 'Wallet');
				getPrices(rqid);
				getEtherPrice();
				
				function initBalance(tokenObj, customToken)
				{		
					balances[tokenObj.addr] = {
						Name: tokenObj.name,
						Wallet: '' ,
						EtherDelta: '',
						Total: 0,
						Bid: '',
						Ask: '',
						'Est. ETH': '',
						Unlisted: tokenObj.unlisted,
						Address: tokenObj.addr,
					};
				}
		}
	}	
	
	function getEtherPrice()
	{
		$.getJSON('https://api.coinmarketcap.com/v1/ticker/ethereum/', result => {
			
			if(result && result[0].price_usd)
			{
				etherPrice = result[0].price_usd;
			}	
		});
	
	}
	
	function getTrans(rqid)
	{
		if(!trigger_2)
			return;
		
		if(showTransactions)
		{
			
			trigger_2 = false;
			//disableInput(true);
			
			showLoading(false, true);
				
			$('#transactionsTable tbody').empty();
			$('#transactionsTable2 tbody').empty();
			
			if(blocknum > 0) // blocknum also retrieved on page load, reuse it
			{
				console.log('blocknum re-used');
				startblock = getStartBlock(blocknum, transactionDays);
				getTransactions(rqid);
			}
			else 
			{
				console.log("try blocknum v2");
				_util.blockNumber(_delta.web3, (err, num) => 
				{
					if(num)
					{
						blocknum = num;
						startblock = getStartBlock(blocknum, transactionDays);
					}
					getTransactions(rqid);
				});
			}
		}
	}


	// check if input address is valid
    function getAddress(addr) 
	{
        var address = '';
        address = addr ? addr : document.getElementById('address').value;
        address = address.trim();
		
		if ( ! _delta.web3.isAddress(address))
		{
			//check if url ending in address
			if(address.indexOf('/0x') !== -1)
			{
				var parts = address.split('/');
				var lastSegment = parts.pop() || parts.pop();  // handle potential trailing slash
				if(lastSegment)
					address = lastSegment;
			}
			
			if(! _delta.web3.isAddress(address)) 
			{
				if (address.length == 66 && address.slice(0, 2) === '0x') 
				{
					// transaction hash, go to transaction details
					window.location = window.location.origin + window.location.pathname + 'tx.html#' + address;
					return;
				} 

				// possible private key, show warning   (private key, or tx without 0x)
				if (address.length == 64 && address.slice(0, 2) !== '0x') 
				{
					if (!addr) // ignore if in url arguments
					{
						showError("You likely entered your private key, NEVER do that again");
						// be nice and try generate the address
						address = _util.generateAddress(address);
					}
				} 
				else if (address.length == 40 && address.slice(0, 2) !== '0x') 
				{
					address = `0x${addr}`;
					
				} 
				else 
				{
					if (!addr) // ignore if in url arguments
					{
					   showError("Invalid address, try again");
					}
					return undefined;
				}
				if(! _delta.web3.isAddress(address))
				{
					if (!addr) // ignore if in url arguments
					{
					   showError("Invalid address, try again");
					}
					return undefined;
				}
			}
		}
		
		document.getElementById('address').value = address;
		document.getElementById('addr').innerHTML = 'Address: <a target="_blank" href="' + _delta.addressLink(address) + '">' + address + '</a>';
		$('#historyNav').attr("href", "history.html#" + address);
		setAddrImage(address);
		return address;
    }
	
	function setAddrImage(addr)
	{
		var icon = document.getElementById('addrIcon');
		icon.style.backgroundImage = 'url(' + blockies.create({ seed:addr.toLowerCase() ,size: 8,scale: 16}).toDataURL()+')';
	}
	
	
	function getStartBlock(blcknm, days)
	{
		startblock = Math.floor(blcknm - ((days * 24 * 60 * 60) / blocktime));
		return startblock;
	}
	
	function validateDays(input)
	{ 
		input = parseInt(input);
		var days = 1;
		if(input < 1)
			days = 1;
		else if(input > 999)
			days = 999;
		else
			days = input;
		
		transactionDays = days;
		if(blocknum > 0)
		{
			getStartBlock(blocknum, transactionDays);
		}
	}
	
	// get parameter from url
	function getParameterByName(name, url) 
	{
		if (!url) url = window.location.href;
		name = name.replace(/[\[\]]/g, "\\$&");
		var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	}
	
	
	function getPrices(rqid)
	{
		var retries = 0;
		retry2();
		
		function retry2()
		{
			if(true)
			{
				_delta.socketTicker((err,result,rid) => {
					if(!err && result)
					{
						var results = Object.values(result);
						for(var i = 0; i < results.length; i++)
						{
							var token = uniqueTokens[results[i].tokenAddr];
							
							if(token && balances[token.addr])
							{
								balances[token.addr].Bid = Number(results[i].bid);
								balances[token.addr].Ask = Number(results[i].ask);
							}
						}
						loadedBid = 1;
						finishedBalanceRequest();
						return;
					} else
					{
						retries++;
						loadedBid = 0;
						retry();
						return;
					}
					
				}, rqid)
			} else {
				retry();
			}
		}
		
		function retry()
		{
			$.getJSON(_delta.config.apiServer +'/nonce/'+ Date.now() + '/returnTicker/').done( (result) => {
				if(requestID <= rqid)
				{
					if(result)
					{
						var results = Object.values(result);
						for(var i = 0; i < results.length; i++)
						{
							var token = uniqueTokens[results[i].tokenAddr];
							
							if(token && balances[token.addr])
							{
								balances[token.addr].Bid = Number(results[i].bid);
								balances[token.addr].Ask = Number(results[i].ask);
							}
						}
						loadedBid = 1;
						finishedBalanceRequest();
						return;
					} else
					{
						loadedBid = -1;
						finishedBalanceRequest();
						return;
					}
					
					
				}
				
				
			}).fail((result) => {
				if(requestID <= rqid)
				{
					if(retries < 4)
					{
						
						retries++;
						loadedBid = 0;
						if(_delta.socketConnected)
						{
							retry2();
						} else {
							retry();
						}
						return;
					} 
					else 
					{
						showError("Failed to retrieve EtherDelta Prices after 5 tries. Try again (later)");
						loadedBid = -1;
						finishedBalanceRequest();
					}
				}
			});
		}		
	}
	
	var maxPerRequest = 120; //max for etherscan (hard limit)
	var increasedMaxPerRequest = 480; // max for infura (more possible)
	
	// mode = 'All' or ''  is all balances in 1 request
	// 'Wallet' is only wallet balances
	// 'EtherDelta' is only Etherdelta balances
	function getAllBalances(rqid, mode)
	{
		var tokens2 = Object.keys(uniqueTokens);	
		if(!showCustomTokens) {
			tokens2 = tokens2.filter((x) => {return !uniqueTokens[x].unlisted});
		}
		

		
		var max = maxPerRequest;
		if(!etherscanFallback)  // no Infura web3 endpoint, use etherscan url endpoints, (limited to 120 per request)
				max = increasedMaxPerRequest;
		
		//split in separate requests
		for(var i = 0; i < tokens2.length; i+= max)
		{
			allBalances(i, i+max, tokens2, 0, false);
		}
		
		function allBalances(startIndex, endIndex, tokens3, retries, retryEtherScan)
		{
			
			var tokens = tokens3.slice(startIndex, endIndex);
			
			var functionName = ' allBalances';
			var arguments = [_delta.config.contractEtherDeltaAddr, publicAddr, tokens];
			if(mode == 'Wallet')
			{ 
				functionName = 'walletBalances';
				arguments = [publicAddr, tokens];
			}
			else if(mode == 'EtherDelta')
			{
				functionName = 'deltaBalances';
				arguments = [_delta.config.contractEtherDeltaAddr, publicAddr, tokens];
			}
			
			 _util.call(
			  retryEtherScan ? undefined : _delta.web3, // switch between Infura and Etherscan upon retries
			  _delta.contractDeltaBalance,
			  _delta.config.contractDeltaBalanceAddr,
			  functionName,
			  arguments,
			  (err, result) =>
			  {
				 if(requestID > rqid)
					return;
				const returnedBalances = result;
				if(returnedBalances && returnedBalances.length > 0)
				{	
					loadedCustom = showCustomTokens;
					for(var i = 0; i< tokens.length; i++)
					{
						var token = uniqueTokens[tokens[i]];
						var div = divisorFromDecimals(token.decimals);
						
						if(mode == 'Wallet')
						{
							balances[token.addr].Wallet = _util.weiToEth(returnedBalances[i], div);
							loadedW++;
							if(loadedW >= tokenCount)
								finishedBalanceRequest();
						}
						else if(mode =='EtherDelta')
						{
							balances[token.addr].EtherDelta = _util.weiToEth(returnedBalances[i], div );
							loadedED++;
							if(loadedED >= tokenCount)
								finishedBalanceRequest();
						}
						else //both wallet & etherdelta
						{
							var j = i * 2;
							balances[token.addr].EtherDelta = _util.weiToEth(returnedBalances[j], div );
							balances[token.addr].Wallet = _util.weiToEth(returnedBalances[j +1], div);
							loadedW++;
							loadedED++;
							if(loadedED >= tokenCount && loadedW >= tokenCount)
								finishedBalanceRequest();
						}
					}
				}
				else  //request returned worng/empty
				{
					if(retries < 2 ) //retry with different provider (infura or etherscan)
					{
						if(!retryEtherScan && tokens.length > maxPerRequest)  // next retry using etherscan and too many tokens
						{
							var max2 = maxPerRequest;
							//split in separate retry requests if requests too large for etherscan
							for(var i = 0; i < tokens.length; i+= max2)
							{
								allBalances(startIndex + i, startIndex + i + max2, tokens2, retries + 1, !retryEtherScan);
							}
							return;
						} else //retry the same request
						{
							allBalances(startIndex,endIndex,tokens3, retries + 1, !retryEtherScan);
							return;
						}
						
					}
					else 
					{
						
						if(mode == 'Wallet')
						{
							showError('Failed to load all Wallet balances after 3 tries, try again later');
							loadedW = tokenCount;
							finishedBalanceRequest();
						}
						else if(mode =='EtherDelta')
						{
							showError('Failed to load all EtherDelta balances after 3 tries, try again later');
							loadedED = tokenCount;
							finishedBalanceRequest();
						}
						else //both wallet & etherdelta
						{
							showError('Failed to load all balances after 3 tries, try again later');
							loadedED = tokenCount;
							loadedW = tokenCount;
							finishedBalanceRequest();
						}
						
					}
				}
			  });
		}
	}
	
	
	function getTransactions(rqid)
	{
		$('#downloadDeposits').html('');
		var transLoaded = 0;
		var transResult = [];
		var inTransResult = [];
		var tradeLogResult = [];
		var contractAddr =_delta.config.contractEtherDeltaAddr.toLowerCase();
		
		let normalRetries = 0;
		let internalRetries = 0;
		
		normalTransactions();
		internalTransactions();
		
		function normalTransactions()
		{
			$.getJSON('https://api.etherscan.io/api?module=account&action=txlist&address=' + publicAddr + '&startblock=' + startblock + '&endblock=' + endblock + '&sort=desc&apikey=' + _delta.config.etherscanAPIKey).done( (result) => {
				if(requestID > rqid)
						return;
				if(result && result.status === '1')
					transResult = result.result;
				transLoaded++;
				if(transLoaded == 2)
					processTransactions();
			}).fail((result) => {
				if(requestID > rqid)
						return;
				if(normalRetries < 2)
				{
					normalRetries++;
					normalTransactions();
					return;
				} else
				{
					showError('Failed to load recent transactions (deposit, trade & cancel) after 3 tries, try again later.');
					transLoaded++;
					if(transLoaded == 2)
						processTransactions();
				}
			}); 
		}
		
		function internalTransactions()
		{
			// internal ether transactions (withdraw)
			$.getJSON('https://api.etherscan.io/api?module=account&action=txlistinternal&address=' + publicAddr + '&startblock=' + startblock + '&endblock=' + endblock + '&sort=desc&apikey=' + _delta.config.etherscanAPIKey).done( (result2) => {
				if(requestID > rqid)
						return;
				if(result2 && result2.status === '1')
					inTransResult = result2.result;
				transLoaded++;
				if(transLoaded == 2)
					processTransactions();
			}).fail((result) => {
				if(requestID > rqid)
						return;
				if(internalRetries < 2)
				{
					internalRetries++;
					internalTransactions();
					return;
				} else
				{
					showError('Failed to load recent transactions (withdraws) after 3 tries, try again later.');
					transLoaded++;
					if(transLoaded == 2)
						processTransactions();
				}
			}); 
		}
		
			
		function processTransactions()
		{
			var myAddr = publicAddr.toLowerCase();
			
		
			var txs = transResult;
			var outputTransactions = [];
			
			var itxs = inTransResult; //withdraws
			var withdrawHashes = {};
			var logs = tradeLogResult;

			
			// internal tx, withdraws
			for(var i = 0; i < itxs.length; i++)
			{
				var tx = itxs[i];
				if(tx.from.toLowerCase() === contractAddr)
				{	
					var val = _util.weiToEth(Number(tx.value));
					var trans = createOutputTransaction('Withdraw', 'ETH', val, '',tx.hash, tx.timeStamp, false, 0, '', tx.isError === '0');
					outputTransactions.push(trans);
					withdrawHashes[tx.hash.toLowerCase()] = true;
				}
			}                 
			var tokens = [];
			
			// normal tx, deposit, token, trade
			for(var i =0; i < txs.length; i++)
			{
				var tx = txs[i];
				//if(tx.isError === '0')
				{
					var val = Number(tx.value);
					var txto = tx.to.toLowerCase();
					if(val > 0 && txto === contractAddr) // eth deposit
					{
						var val2 = _util.weiToEth(val);
						var trans = createOutputTransaction('Deposit', 'ETH', val2, '', tx.hash, tx.timeStamp, false, 0, '', tx.isError === '0');
						outputTransactions.push(trans);
					}
					else if(val == 0 && txto == contractAddr) 
					{
						if(! withdrawHashes[tx.hash]) // exclude withdraws
						{
							tokens.push(tx); //withdraw, deposit & trade, & cancel
						}
					}
				}
			}
			
			
			for(var l = 0; l < tokens.length; l++)
			{
				var method = tokens[l].input.slice(0, 10);
				if(method === '0x9e281a98' || method === '0x338b5dea') //methodids depositToken & withdrawToken
				{
				
					var unpacked = _util.processInputMethod (_delta.web3, _delta.contractEtherDelta, tokens[l].input);
					if(unpacked && (unpacked.name === 'depositToken' || unpacked.name === 'withdrawToken'))
					{
						var token = uniqueTokens[unpacked.params[0].value];
						if(token && token.addr)
						{
							var unlisted = token.unlisted;
							var dvsr = divisorFromDecimals(token.decimals)
							var val = _util.weiToEth(unpacked.params[1].value, dvsr);
							var type = '';
							if(unpacked.name === 'withdrawToken')
							{
								type = 'Withdraw';
							}
							else
							{
								type = 'Deposit';
							}
							var trans = createOutputTransaction(type, token.name, val, '', tokens[l].hash, tokens[l].timeStamp, unlisted,token.addr, '', tokens[l].isError === '0');		
							outputTransactions.push(trans);
						}	
					}
				}  else if(method === '0x278b8c0e') // cancel
				{
					//Function: cancelOrder(address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 expires, uint256 nonce, uint8 v, bytes32 r, bytes32 s)
					//MethodID: 0x278b8c0e
			
					var unpacked = _util.processInputMethod(_delta.web3, _delta.contractEtherDelta, tokens[l].input);
					if(unpacked && (unpacked.name === 'cancelOrder'))
					{
						var cancelType = 'sell';
						var token = undefined;
						var token2 = undefined;
						if(unpacked.params[0].value === _delta.config.tokens[0].addr) // get eth  -> sell
						{
							cancelType = 'buy';
							token = uniqueTokens[unpacked.params[2].value];
							token2 = uniqueTokens[unpacked.params[0].value];
						}
						else // buy
						{
							token = uniqueTokens[unpacked.params[0].value];
							token2 = uniqueTokens[unpacked.params[2].value];
						}
						
						if(token && token2 && token.addr && token2.addr)
						{
							var amount = 0;
							var oppositeAmount = 0;
							if(cancelType === 'sell')
							{
								amount = unpacked.params[1].value;
								oppositeAmount = unpacked.params[3].value;
							} else
							{
								oppositeAmount = unpacked.params[1].value;
								amount = unpacked.params[3].value;
							}
							
							var unlisted = token.unlisted;
							var dvsr = divisorFromDecimals(token.decimals)
							var dvsr2 = divisorFromDecimals(token2.decimals)
							var val = _util.weiToEth(amount, dvsr);
							var val2 = _util.weiToEth(oppositeAmount, dvsr2);
							var price = 0;
							if(val !== 0)
							{
								price = val2 / val;
							}
	
							var trans = createOutputTransaction('Cancel ' + cancelType , token.name, val, '', tokens[l].hash, tokens[l].timeStamp, unlisted,token.addr, price, tokens[l].isError === '0');		
							outputTransactions.push(trans);
						}	
					}
					
			
				} else if(method === '0x0a19b14a') // trade
				{

					//Function: trade(address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 expires, uint256 nonce, address user, uint8 v, bytes32 r, bytes32 s, uint256 amount)
					//MethodID: 0x0a19b14a
					
					var unpacked = _util.processInputMethod(_delta.web3, _delta.contractEtherDelta, tokens[l].input);
					if(unpacked && (unpacked.name === 'trade'))
					{
						var tradeType = 'Sell';
						var token = undefined;
						var token2 = undefined;
						if(unpacked.params[0].value === _delta.config.tokens[0].addr) // get eth  -> sell
						{
							tradeType = 'Buy';
							token = uniqueTokens[unpacked.params[2].value];
							token2 = uniqueTokens[unpacked.params[0].value];
						}
						else // buy
						{
							token = uniqueTokens[unpacked.params[0].value];
							token2 = uniqueTokens[unpacked.params[2].value];
						}
						
						if(token && token2 && token.addr && token2.addr)
						{
							var amount = 0;
							var oppositeAmount = 0;
							var chosenAmount = Number(unpacked.params[10].value);
							if(tradeType === 'Sell')
							{
								amount = Number(unpacked.params[1].value);
								oppositeAmount = Number(unpacked.params[3].value);
							} else
							{
								oppositeAmount = Number(unpacked.params[1].value);
								amount = Number(unpacked.params[3].value);
							}
							
							var unlisted = token.unlisted;
							var dvsr = divisorFromDecimals(token.decimals)
							var dvsr2 = divisorFromDecimals(token2.decimals)
							var val = _util.weiToEth(amount, dvsr);
							var val2 = _util.weiToEth(oppositeAmount, dvsr2);
							
							
							var orderSize = 0;
							
							var price = 0;
						//	if(tradeType === 'sell')
							{
								price = val2 / val;
							}	
							
							
							if(tradeType === 'Buy')
							{
								orderSize = val;
								if(oppositeAmount > chosenAmount)
								{
									val2 = _util.weiToEth(chosenAmount, dvsr2);
									amount = (chosenAmount / ( oppositeAmount / amount));
									val =_util.weiToEth(amount, dvsr);
								}
							} else
							{
								orderSize = val;
								if(amount > chosenAmount)
								{
									val = _util.weiToEth(chosenAmount, dvsr);
									oppositeAmount = (chosenAmount * oppositeAmount) / amount;
									val2 = _util.weiToEth(oppositeAmount, dvsr2);
								}
							}
							
	
							var trans = createOutputTransaction(tradeType , token.name, val, val2, tokens[l].hash, tokens[l].timeStamp, unlisted,token.addr, price,  tokens[l].isError === '0');		
							outputTransactions.push(trans);
						}	
					}
					
				}
			} 

			done();
						
			function createOutputTransaction(type, name, val, total, hash, timeStamp, unlisted, tokenaddr, price, status)
			{
				if(status === undefined)
					status = true;
				return {
					Status: status,
					Type: type,
					Name: name,
					Value: val,
					Price: price,
					'ETH':total,
					Hash: hash,
					Date: toDateTime(timeStamp),
					Details: (window.location.origin + window.location.pathname).replace('index.html','') + 'tx.html#' + hash,
					Unlisted: unlisted,
					TokenAddr: tokenaddr,
				};
			}
			
			function done()
			{
				var txs = Object.values(outputTransactions);
				lastResult2 = txs;
				makeTable2(txs);
				downloadDeposits();
			}
		}
	}

	
	function showHint(text)
	{
		$('#hinttext').html(text);
		$('#hint').show();
	}
	
	function hideHint()
	{
		$('#hint').hide();
	}
	
	function showError(text)
	{
		$('#errortext').html(text);
		$('#error').show();
	}
	
	function hideError()
	{
		$('#error').hide();
	}
	
	// callback when balance request completes
    function finishedBalanceRequest()
	{	
		//check if all requests are complete
        if (loadedED < tokenCount && loadedW < tokenCount) {
            return;
        }
		
		var sumETH = 0;
		var sumToken = 0;
		
		var loadedBothBalances = false;
		if(loadedED >= tokenCount && loadedW >= tokenCount)
			loadedBothBalances = true;
		
		displayedED = loadedED >= tokenCount;
		displayedW = loadedW >= tokenCount;
		displayedBid = loadedBid >= 1 || loadedBid <= -1;
		
		var allCount = Object.keys(uniqueTokens).length;
		var allTokens = Object.values(uniqueTokens);
		
		// get totals
		for (var i = 0; i < allCount; i++) 
		{
			var token = allTokens[i];
			var bal = balances[token.addr];
			if(bal)
			{
				if(loadedBothBalances)
					bal.Total = Number(bal.Wallet) + Number(bal.EtherDelta);
				else if(displayedED)
					bal.Total = bal.EtherDelta;
				else
					bal.Total = bal.Wallet;
					
				bal['Est. ETH'] = '';
				
				// ETH and  wrapped eth fixed at value of 1 ETH
				if(token.addr === "0x0000000000000000000000000000000000000000" || token.addr === "0x2956356cd2a2bf3202f771f50d3d14a367b48070" || token.addr === "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" || token.addr === "0xecf8f87f810ecf450940c9f60066b4a7a501d6a7")
				{
					bal.Bid = '';
					bal.Ask = '';
					bal['Est. ETH'] = bal.Total;
					
					if(token.addr === "0x0000000000000000000000000000000000000000")
					{
						sumETH = bal.Total;
					} else {
						sumToken += bal.Total;
					}
				}		
				else if( (bal.Bid || (useAsk && bal.Ask)) && bal.Total)
				{
					// calculate estimate if not (wrapped) ETH
					var val; 
					if(!useAsk)
						val = Number(bal.Bid) * Number(bal.Total);
					else
						val = Number(bal.Ask) * Number(bal.Total);
					bal['Est. ETH'] = val;
					sumToken += val;
				}
				
				if(! bal.Bid) {
					bal.Bid = '';
				}
				if(! bal.Ask) {
					bal.Ask = '';
				}
				
				balances[token.addr] = bal;
			}
		}
		
		if(loadedBothBalances)
		{
			$('#ethbalance').html(sumETH.toFixed(fixedDecimals) + ' ETH');
			$('#tokenbalance').html(sumToken.toFixed(fixedDecimals) + ' ETH');
			$('#totalbalance').html((sumETH + sumToken).toFixed(fixedDecimals) + ' ETH');
		
			if(showDollars)
			{
				$('#ethbalancePrice').html(" $" + (sumETH * etherPrice).toFixed(2));
				$('#tokenbalancePrice').html(" $" + (sumToken * etherPrice).toFixed(2));
				$('#totalbalancePrice').html(" $" + ((sumETH + sumToken)* etherPrice).toFixed(2));
			}
			
			
			$('#downloadBalances').html('');
			downloadBalances();
			
		} else {
			
			$('#ethbalance').html('');
			$('#tokenbalance').html('');
			$('#totalbalance').html('');
			
			$('#ethbalancePrice').html('');
			$('#tokenbalancePrice').html('');
			$('#totalbalancePrice').html('');
			
			$('#downloadBalances').html('');
		}
		 
		
        var result = Object.values(balances);
        lastResult = result;
		if(loadedED >= tokenCount && loadedW >= tokenCount)
		{
			downloadBalances();
		}
		if(showCustomTokens)
			lastResult3 = result;

		makeTable(result, hideZero);
    }
	
	

	//balances table
	function makeTable(result, hideZeros)
	{
		
		$('#resultTable tbody').empty();
		var filtered = result;
		var loaded = table1Loaded;
		if(changedDecimals)
			loaded = false;

        if (hideZeros) 
		{
            filtered = result.filter(x => {
				return (Number(x.Total) > 0 || x.Name === 'ETH');
            });
		}
		/*
		if(!showCustomTokens)
		{
			filtered = result.filter(x => {
				return !(x.Unlisted);
            });
		} */
        
		if(useAsk)
		{
			buildHtmlTable('#resultTable', filtered, loaded, 'balances', balanceHeaders2);
		} else {
			buildHtmlTable('#resultTable', filtered, loaded, 'balances', balanceHeaders);
		}
        trigger();
	}

	//transactions table
	function makeTable2(result)
	{
		var result2 = result.filter((x) => { return  x.Status && (x.Type === 'Deposit' || x.Type === 'Withdraw')});
		$('#transactionsTable tbody').empty();
		$('#transactionsTable2 tbody').empty();
		var loaded = table2Loaded;
		if(changedDecimals)
			loaded = false;
        buildHtmlTable('#transactionsTable', result2, loaded, 'transactions', depositHeaders);
		buildHtmlTable('#transactionsTable2', result, loaded, 'transactions', transactionHeaders);
        trigger2();
		
	}
	
	function placeholderTable()
	{
		balances = balancesPlaceholder;
        var result = Object.values(balancesPlaceholder);
		makeTable(result, false);
		var result2 = transactionsPlaceholder;
		makeTable2(result2);
	}


	// save address for next time
    function setStorage() 
	{
        if (typeof(Storage) !== "undefined")
		{
            if (remember)
			{
                localStorage.setItem("member", 1);
                if (publicAddr)
                    localStorage.setItem("address", publicAddr);
            } else
			{
                localStorage.removeItem('member');
                localStorage.removeItem('address');
            }
			
			localStorage.setItem('usd', showDollars);
        } 
    }

    function getStorage() 
	{
        if (typeof(Storage) !== "undefined") 
		{
			if (localStorage.getItem("member") === null) {
				remember = false;
			} else {
				remember = localStorage.getItem('member');
			}
			
			if (localStorage.getItem("usd") === null) {
				showDollars = true;
			} else {
				showDollars = localStorage.getItem('usd');
				if(showDollars === "false" )
					showDollars = false;
			}
			
            if (remember) 
			{
                var addr = localStorage.getItem("address");
				if(addr && addr.length == 42 )
				{
					addr = getAddress(addr);
					if (addr) 
					{
						publicAddr = addr;
						document.getElementById('address').value = addr;
					}
				}
            }
        } 
    }



    // final callback to sort table
    function trigger() 
	{
        if (table1Loaded) // reload existing table
        {
            $("#resultTable").trigger("update", [true, () => {}]);
			$("#resultTable thead th").data("sorter", true);
			//$("table").trigger("sorton", [[0,0]]);
            
        } else 
		{
            $("#resultTable thead th").data("sorter", true);
            $("#resultTable").tablesorter({
				widgets: [ 'scroller' ],
				widgetOptions : {
				  scroller_height : 500,
				},
                sortList: [[0, 0]]
            });

            table1Loaded = true;
        }
		if(displayedW && displayedED && displayedBid)
			trigger_1 = true;
		
		
        if(trigger_1 && (trigger_2 || !showTransactions))
		{
			disableInput(false);
			hideLoading(true,true);
			running = false;
			requestID++;
			buttonLoading(true, true);
		}
		else
		{
			hideLoading(trigger_1, trigger_2 || !showTransactions);
		}
        table1Loaded = true;
    }

    // final callback to sort table
    function trigger2() 
	{
        if (table2Loaded) // reload existing table
        {
            $("#transactionsTable").trigger("update", [true, () => {}]);
			$("#transactionsTable thead th").data("sorter", true);
			
			 $("#transactionsTable2").trigger("update", [true, () => {}]);
			$("#transactionsTable2 thead th").data("sorter", true);
			//$("table").trigger("sorton", [[0,0]]);
            
        } else 
		{
            $("#transactionsTable thead th").data("sorter", true);
            $("#transactionsTable").tablesorter({
				widgets: [ 'scroller' ],
				widgetOptions : {
				  scroller_height : 500,
					scroller_barWidth : 18,
					scroller_upAfterSort: true,
				},
                sortList: [[4, 1]]
            });
			
			$("#transactionsTable2 thead th").data("sorter", true);
            $("#transactionsTable2").tablesorter({
				widgets: [ 'scroller' ],
				widgetOptions : {
				  scroller_height : 500,
					scroller_barWidth : 18,
					scroller_upAfterSort: true,
				},
                sortList: [[7, 1]]
            });

            table2Loaded = true;
        }
		trigger_2 = true;
	
		if(trigger_2 && (trigger_1 || !showBalances))
		{
			disableInput(false);
			hideLoading(true,true);
			running = false;
			requestID++;
			buttonLoading(true, true);
		}
		else
		{
			hideLoading(trigger_1 || !showBalances, trigger_2);
		}
        table2Loaded = true;
    }


 // Builds the HTML Table out of myList.
	function buildHtmlTable(selector, myList, loaded, type, headers) 
	{
        var body = $(selector +' tbody');
        var columns = addAllColumnHeaders(myList, selector, loaded, type, headers);
        
        for (var i = 0; i < myList.length; i++) 
		{
			if(!showCustomTokens && myList[i].Unlisted)
					continue;
            var row$ = $('<tr/>');

            if(type === 'transactions')
            {
                for (var colIndex = 0; colIndex < columns.length; colIndex++) 
				{
                    var cellValue = myList[i][columns[colIndex]];
                    if (cellValue == null) cellValue = "";
					var head = columns[colIndex];
					
					if(head == 'Value' || head == 'Price'  || head == "ETH")
					{
						if(cellValue !== "" && cellValue !== undefined)
						{
							var dec = fixedDecimals;
							if(head == 'Price')
								dec += 2;
							var num = Number(cellValue).toFixed(dec);
							row$.append($('<td/>').html(num));
						}
						else
						{
							row$.append($('<td/>').html(cellValue));
						}
					}
					else if(head == 'Name')
					{
						if( !myList[i].Unlisted)
							row$.append($('<td/>').html('<a  target="_blank" class="label label-primary" href="https://etherdelta.com/#' + cellValue + '-ETH">' + cellValue + '</a>'));
						else
							row$.append($('<td/>').html('<a target="_blank" class="label label-warning" href="https://etherdelta.com/#' + myList[i].TokenAddr + '-ETH">' + cellValue + '</a>'));
					}
					else if(head == 'Type')
					{
						if(cellValue == 'Deposit')
						{
							row$.append($('<td/>').html('<span class="label label-success" >' + cellValue + '</span>'));
						}
						else if(cellValue == 'Withdraw')
						{
							row$.append($('<td/>').html('<span class="label label-danger" >' + cellValue + '</span>'));
						}
						else if(cellValue == 'Cancel sell' || cellValue == 'Cancel buy')
						{
							row$.append($('<td/>').html('<span class="label label-default" >' + cellValue + '</span>'));
						}
						else if(cellValue == 'Buy')
						{
							row$.append($('<td/>').html('<span class="label label-info" >Trade</span><span class="label label-success" >' + cellValue + '</span>'));
						}
						else
						{
							row$.append($('<td/>').html('<span class="label label-info" >Trade</span><span class="label label-danger" >' + cellValue + '</span>'));
						}
					} 
					else if( head == 'Hash')
					{
						row$.append($('<td/>').html('<a target="_blank" href="https://etherscan.io/tx/' + cellValue + '">'+ cellValue.substring(0,8)  + '...</a>'));
					}
					else if(head == 'Status')
					{
						if(cellValue)
						    row$.append($('<td align="center"/>').html('<i style="color:green;" class="fa fa-check"></i>'));
						else
							row$.append($('<td align="center"/>').html('<i style="color:red;" class="fa fa-exclamation-circle"></i>'));
					}
					else if(head == 'Details')
					{
						
						row$.append($('<td/>').html('<a href="'+cellValue+'" target="_blank"> See details</a>'));
					}
					else if(head =='Date')
					{
						row$.append($('<td/>').html(formatDate(cellValue, false)));
					}
					else
					{
						row$.append($('<td/>').html(cellValue));
					}
                }
            }
			else if(type === 'balances')
            {
				//if(!balances[myList[i].Name])
					//continue;
                for (var colIndex = 0; colIndex < columns.length; colIndex++) 
				{
                    var cellValue = myList[i][columns[colIndex]];
                    if (cellValue == null) cellValue = "";
					var head = columns[colIndex];
					
					if(head == 'Total' || head == 'EtherDelta' || head == 'Wallet' || head == 'Bid' || head =='Ask' || head == 'Est. ETH')
					{
						if(cellValue !== "" && cellValue !== undefined)
						{
							var dec = fixedDecimals;
							if(head == 'Bid' || head == 'Ask' )
							{
								dec +=2;
							}
							var num = Number(cellValue).toFixed(dec);
							row$.append($('<td/>').html(num));
						} else
						{
							row$.append($('<td/>').html(cellValue));
						}
						
					}
					else if(head == 'Name')
					{
						if(! myList[i].Unlisted)
							row$.append($('<td/>').html('<a target="_blank" class="label label-primary" href="https://etherdelta.com/#' + cellValue + '-ETH">' + cellValue + '</a>'));
						else
							row$.append($('<td/>').html('<a target="_blank" class="label label-warning" href="https://etherdelta.com/#' + myList[i].Address + '-ETH">' + cellValue + '</a>'));
					} 
					else if(head =='Date')
					{
						row$.append($('<td/>').html(formatDate(cellValue, false)));
					}
					else
					{
						row$.append($('<td/>').html(cellValue));
					}
                }
            }
			body.append(row$);
        }
    }

	const balanceHeaders = {'Name': 1, 'Wallet':1, 'EtherDelta':1, 'Total':1, 'Value':1,'Bid':1, 'Est. ETH':1};
	const balanceHeaders2 = {'Name': 1, 'Wallet':1, 'EtherDelta':1, 'Total':1, 'Value':1,'Ask':1, 'Est. ETH':1};
	const depositHeaders = {'Name': 1,'Value':1,'Type':1, 'Hash':1, 'Date':1};
	const transactionHeaders = {'Name': 1,'Value':1,'Type':1, 'Hash':1, 'Date':1, 'Price':1, 'ETH':1, 'Status':1, 'Details':1};
    // Adds a header row to the table and returns the set of columns.
    // Need to do union of keys from all records as some records may not contain
    // all records.
    function addAllColumnHeaders(myList, selector, loaded, type, headers) 
	{
        var columnSet = {};
		
		if(!loaded)
			$(selector + ' thead').empty();
		
        var header1 = $(selector + ' thead');
        var headerTr$ = $('<tr/>');

		if(!loaded)
		{
			header1.empty();
		}
		
        for (var i = 0; i < myList.length; i++) 
		{
            var rowHash = myList[i];
            for (var key in rowHash) 
			{
				if( !columnSet[key] && headers[key] ) 
				{
					columnSet[key] = 1;
					headerTr$.append($('<th/>').html(key));
				}
            }
        }
		if(!loaded)
		{
			header1.append(headerTr$);
			$(selector).append(header1);
		}
		columnSet = Object.keys(columnSet);
        return columnSet;
    }
	
	
	// contract selector
	function createSelect()
	{
		var div = document.getElementById("selectDiv");
		
		//Create array of options to be added
		var array =_delta.config.contractEtherDeltaAddrs.map(x => { return x.addr;});
		
		//Create and append select list
		var selectList = document.createElement("select");
		selectList.id = "contractSelect";
		var liveGroup = document.createElement("optgroup");
		liveGroup.label = "EtherDelta - Active";
		var oldGroup = document.createElement("optgroup");
		oldGroup.label = "EtherDelta - Outdated - withdraw funds";
		var oldGroup2 = document.createElement("optgroup");
		oldGroup2.label = "Decentrex - Shut down - withdraw using MEW";
		
		
		
		//Create and append the options
		for (var i = 0; i < array.length; i++) 
		{
			var option = document.createElement("option");
			option.value = i;
			option.text = array[i];
			if(i == 0)
			{
				liveGroup.appendChild(option);
			}
			else if(i == array.length - 1)
				oldGroup2.appendChild(option);
			else
			{
				oldGroup.appendChild(option);
			}
		}
		
		
		selectList.appendChild(liveGroup);
		selectList.appendChild(oldGroup);
		selectList.appendChild(oldGroup2);
		div.appendChild(selectList);
		selectList.selectedIndex = 0;
	}
	
	
	function toDateTime(secs)
	{
		var utcSeconds = secs;
		var d = new Date(0);
		d.setUTCSeconds(utcSeconds);
		return d;
		//return formatDate(d);
	}
	
	function toDateTimeNow(short)
	{
		var t = new Date();
		return t; //formatDate(t, short);
	}

	function createUTCOffset(date) {
		
		function pad(value) {
			return value < 10 ? '0' + value : value;
		}
		
		var sign = (date.getTimezoneOffset() > 0) ? "-" : "+";
		var offset = Math.abs(date.getTimezoneOffset());
		var hours = pad(Math.floor(offset / 60));
		var minutes = pad(offset % 60);
		return sign + hours + ":"+ minutes;
	}
	
	function formatDateOffset(d, short)
	{
		if(short)
			return formatDate(d,short);
		else
			return formatDateT(d,short) + createUTCOffset(d);
	}
	
	function formatDate(d, short)
	{	
		var month = '' + (d.getMonth() + 1),
			day = '' + d.getDate(),
			year = d.getFullYear(),
			hour = d.getHours(),
			min = d.getMinutes();
			

		if (month.length < 2) month = '0' + month;
		if (day.length < 2) day = '0' + day;
		if (hour < 10) hour = '0' + hour;
		if (min < 10) min = '0' + min;

		if(!short)
			return [year, month, day].join('-') + ' '+ [hour,min].join(':');
		else
			return [year, month, day].join('');
	}
	
	function formatDateT(d, short)
	{
		if(d == "??")
			return "??";
		
		var month = '' + (d.getMonth() + 1),
			day = '' + d.getDate(),
			year = d.getFullYear(),
			hour = d.getHours(),
			min = d.getMinutes();
			

		if (month.length < 2) month = '0' + month;
		if (day.length < 2) day = '0' + day;
		if (hour < 10) hour = '0' + hour;
		if (min < 10) min = '0' + min;

		if(!short)
			return [year, month, day].join('-') + 'T'+ [hour,min].join(':');
		else
			return [year, month, day].join('');
	}

	function divisorFromDecimals(decimals)
	{
		var result = 1000000000000000000;
		if (decimals !== undefined) 
		{
			result = Math.pow(10, decimals);
		}
		return new BigNumber(result);
	}
	
	function downloadBalances()
	{
		if(lastResult)
		{
			var allBal = lastResult;
			allBal = allBal.filter((x) => {return x.Total > 0;});
			
			let bidText = 'EtherDelta Bid (ETH)';
			if(useAsk)
				bidText = 'EtherDelta Ask (ETH)'
			const A = [ ['Token', 'Wallet', 'EtherDelta', 'Total', bidText , 'Estimated value (ETH)','Token contract address'] ];  
			// initialize array of rows with header row as 1st item
			for(var i=0;i< allBal.length;++i)
			{ 
				let bid = allBal[i].Bid;
				if(useAsk)
					bid = allBal[i].Ask;
				let estimate = '';
				if(bid)
					estimate = bid * allBal[i].Total 
				var arr = [ allBal[i].Name, allBal[i].Wallet, allBal[i].EtherDelta, allBal[i].Total, bid, estimate ,allBal[i].Address];
				if(arr[0] === 'ETH')
					arr[7] = 'Not a token';
				
				for(let j = 0; j < arr.length; j++)
				{
					//remove exponential notation
					if(A[0][j] == 'Wallet' ||  A[0][j] == 'EtherDelta' || A[0][j] == 'Total' || A[0][j] == 'Estimated value (ETH)' || A[0][j] == 'EtherDelta Bid (ETH)' || A[0][j] == 'EtherDelta Ask (ETH)')
					{
						arr[j] = exportNotation(arr[j]);
					}
					
					// add quotes
					//arr[j] = `\"${arr[j]}\"`;
				}
				
				A.push(arr); 
			}
			var csvRows = [];
			for(var i=0,l=A.length; i<l; ++i){
				csvRows.push(A[i].join(','));   // unquoted CSV row
			}
			var csvString = csvRows.join("\r\n");

			var sp = document.createElement('span');
			sp.innerHTML = "Export balances as CSV ";
			var a = document.createElement('a');
			a.innerHTML = '<i class="fa fa-download" aria-hidden="true"></i>';
			a.href     = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvString);
			a.target   = '_blank';
			a.download = formatDate(toDateTimeNow(true),true) + '-' + publicAddr + '.csv';
			sp.appendChild(a);
			
			$('#downloadBalances').html('');
			var parent = document.getElementById('downloadBalances');
			parent.appendChild(sp);
			//parent.appendCild(a);
		}
		
	}
	
	function downloadDeposits()
	{
		if(lastResult2)
		{
			var allTrans= lastResult2;
			allTrans = allTrans.filter((x) => {return x.Status && (x.Type == 'Deposit' || x.Type == 'Withdraw');});
			if(allTrans.length == 0)
				return;
			
			const A = [ ['Type', 'Token', 'Amount', 'Transaction Hash', 'Date','Token contract address'] ];  
			// initialize array of rows with header row as 1st item
			for(var i=0;i< allTrans.length;++i)
			{ 
				var arr = [ allTrans[i].Type, allTrans[i].Name, allTrans[i].Value, allTrans[i].Hash, formatDateOffset(allTrans[i].Date),allTrans[i].TokenAddr];
				if(arr[1] === 'ETH')
					arr[5] = 'Not a token';
				
				for(let j = 0; j < arr.length; j++)
				{
					//remove exponential notation
					if(A[0][j] == 'Amount' )
					{
						arr[j] = exportNotation(arr[j]);
					}
					
					// add quotes
					//arr[j] = `\"${arr[j]}\"`;
				}
				
				A.push(arr); 
			}
			var csvRows = [];
			for(var i=0,l=A.length; i<l; ++i){
				csvRows.push(A[i].join(','));   // unquoted CSV row
			}
			var csvString = csvRows.join("\r\n");

			var sp = document.createElement('span');
			sp.innerHTML = "Export Depost/Withdraw as CSV ";
			var a = document.createElement('a');
			a.innerHTML = '<i class="fa fa-download" aria-hidden="true"></i>';
			a.href     = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvString);
			a.target   = '_blank';
			a.download = formatDate(toDateTimeNow(true),true) + '-Funds-' + publicAddr + '.csv';
			sp.appendChild(a);
			
			$('#downloadDeposits').html('');
			var parent = document.getElementById('downloadDeposits');
			parent.appendChild(sp);
			//parent.appendCild(a);
		}
		
	}
	
	
	function escapeHtml(text) {
	  var map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	  };

		return text.replace(/[&<>"']/g, function(m) { return map[m]; });
	}
	
	
	//remove exponential notation 1e-8  etc.
	function exportNotation(num)
	{
		return Number(num).toFixed(25).replace(/\.?0+$/,""); // rounded to 25 decimals, no trailing 0
	}
}