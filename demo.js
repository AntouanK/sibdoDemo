//	node short demo for sibdocity
//	Antonis Karamitros July 2013

//	main demo namespace
var sDemo = (function(){
	
	//	importing modules
	var	http = require('http'),
		url = require('url'),
		fs = require('fs'),
		cheerio = require('cheerio');
		////////////////////

	var globalIndex = {
		articles: {}, // every article will have--> title: tags[]
		totalTags: 0
	};

	//	function to make queries to wikipedia
	var searchWiki = function (query) {

		
		//	change spaces to underscore for wiki normalization
		var normQuery = query.replace(/\s+/g,'_'),
		//	our options for 'getting' wikipedia
			options = {
			host: 'en.wikipedia.org',
			port: 80,
			path: '/wiki/' + normQuery
		};

		console.log('Trying to get ' + options.host + options.path + ' ...');

		http.get(options, function(res) {
			var htmlData = '';	//	our get data buffer

			res
			.on('data', function (tmpData) {
					htmlData+=tmpData;	//	append every chunk here
				})
				.on('end',function(){	//	on end...

					processArticle(htmlData);
				});

		}).on('error', function(e) {
			console.log("Got error: " + e.message);
		});
	};


	//	helper function to save files
	var saveToFile = function (fileName, text, force) {

		var basePath = "./wikiPages/";	//	our path to save files
		
		//	check if file already exists
		fs.exists(basePath+fileName, function (exists) {
			console.log(exists ? "it's there" : "ready to write...");

			if(exists && !force){
				return false;
			}
		});

		fs.writeFile(basePath+fileName, text, function(err) {
		    if(err) {
		        console.log(err);
		    } else {
		        console.log(fileName+" was saved!");
		    }
		}); 
	};

	//	function to check whether a valid article was found, and process it
	//	retuns boolean
	var processArticle = function (htmlData) {
		
		var $ = cheerio.load(htmlData),	//	use cheerio to handle 'DOM' elements
			//	make regExp for no article cases
			noArticle = /noarticletext_technical/g,
			refersTo = / (usually|most commonly|may also) refer[s] to:/g,
			headTitle = $('head title').text().replace(/ - Wikipedia, the free encyclopedia/,''),
			body = $('#bodyContent').text();

		//	first check if article is valid
		if(body.match(noArticle) !== null){
			console.log('no article is found!!');
			return false;
		} else if(body.match(refersTo) !== null){
			console.log('found a referrer!');
			return false;
		}

		//	if article is valid...
		var tags = [];	//	make tags array

		console.log('head title: '+headTitle);

		//	search for categories
		$('#mw-normal-catlinks li').each(function(i,ele){
			var thisCategory = $(this).text().toLowerCase();

			tags.push(thisCategory);	//	save this tag
			console.log(i+': '+thisCategory);
		});

		//	save original HTML file with title as a file name
		if(indexThisArticle(headTitle,tags)){
			saveToFile(headTitle, htmlData);
		}
		
		return true;
	}

	//	make index for this article and it's tags
	var indexThisArticle = function (name,tags) {
		
		if(globalIndex.articles[name]){
			console.log(name+' is already indexed');
			return false;
		}

		globalIndex.articles[name] = tags;
		globalIndex.totalTags+=tags.length;

		saveToFile('index.json',JSON.stringify(globalIndex), true);

		return true;
	};

	//	load global indexes
	var loadIndex = function(){
		fs.readFile('wikiPages/index.json', function (err, data) {
			if (err){
				return false;
			}

			globalIndex = JSON.parse(data);
			if(data){
				console.log('index loaded '+JSON.stringify(globalIndex));
			}
		});
	};

	var searchByTag = function (tag) {
		var tags = tag.toLowerCase().split(','),
			success = [];

		for(var i in tags){

			for(var name in globalIndex.articles){

				//	check if this article has this tag
				if(globalIndex.articles[name].indexOf(tags[i]) !== -1){
					success.push(name);	//	found a tag here
				}
			}
		}

		if(success.length){
			console.log('Found ' + success.join(',') + ' with these tags');
		} else {
			console.log('Sorry, this tag was not found');
		}

	};

	//	expose our functions
	return {
		searchWiki: searchWiki,
		globalIndex: globalIndex,
		loadIndex: loadIndex,
		searchByTag: searchByTag
	};

}());

sDemo.loadIndex();

//////////////////////////////
// show demo on REPL
var repl = require('repl');

repl.start({
  prompt: "sibdocity_demo>",
  input: process.stdin,
  output: process.stdout
})
.context.sDemo = sDemo;	//	make sDemo accessible
