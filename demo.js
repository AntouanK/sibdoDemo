/************************************
*	node short demo for sibdocity 	*
*	Antonis Karamitros July 2013	*
************************************/

//	main demo namespace
var sDemo = (function(){
	
	//	importing modules
	var	http = require('http'),
		fs = require('fs'),
		cheerio = require('cheerio');
		////////////////////

	//	our object to keep the articles titles and their tags
	var globalIndex = {
		articles: {}, // every article will have--> title: tags[]
		totalTags: 0
	};

	//	function to make queries to wikipedia
	var searchWiki = function (query) {

		/* memoization pattern */
		if(searchWiki.cache[query]){	//	check if query is cached
			console.log('searchWiki> result is cached');
			//	we resume the process with the cached result
			processArticle(searchWiki.cache[query]);
			return ;
		}

		//	change spaces to underscore for wiki normalization
		var normQuery = query.replace(/\s+/g,'_'),
		//	our options for 'getting' wikipedia
			options = {
			host: 'en.wikipedia.org',
			port: 80,
			path: '/wiki/' + normQuery
		};

		//	we could also use the search page of wikipedia, for example :
		//	http://en.wikipedia.org/w/index.php?search=New+York+City&title=Special%3ASearch

		console.log('searchWiki> Trying to get ' + options.host + options.path + ' ...');

		//	get the wikipedia page...
		http.get(options, function(res) {
			var htmlData = '';	//	our get data buffer

			res.on('data', function (tmpData) {
				htmlData+=tmpData;	//	append every chunk here
			}).on('end',function(){	//	on end...
				if(htmlData){
					searchWiki.cache[query] = htmlData;	//	we supposedly keep a cache here
					processArticle(htmlData);
				}
			});
		}).on('error', function(e) {
			console.log("searchWiki> Got error: " + e.message);
		});

	};
	searchWiki.cache = {};	//	set up the cache /* memoization pattern */


	//	helper function to save files
	//	if force is true, overwrite current file
	var saveToFile = function (fileName, text, force) {

		var basePath = "./wikiPages/";	//	our path to save files
		
		//	check if file already exists
		fs.exists(basePath+fileName, function (exists) {

			if(exists && !force){
				console.log('saveToFile> file already exists!');
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
	//	retuns boolean according to success or failure
	var processArticle = function (htmlData) {

		if(!htmlData){
			console.log('processArticle> nothing to process')
			return false;
		}
		
		var $ = cheerio.load(htmlData),	//	use cheerio to handle 'DOM' elements
			//	make regExp for no article cases
			noArticle = /noarticletext_technical/g,
			refersTo = / (usually|most commonly|may also) refer[s] to:/g,
			headTitle = $('head title').text().replace(/ - Wikipedia, the free encyclopedia/,''),
			body = $('#bodyContent').text();

		//	first check if article is valid
		if(body.match(noArticle) !== null){
			console.log('processArticle> no article is found!!');
			return false;
		} else if(body.match(refersTo) !== null){
			console.log('processArticle> found a referrer!');
			return false;
		}

		//	if article is valid...
		var tags = [];	//	make tags array

		console.log('processArticle> head title: '+headTitle);

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
	var indexThisArticle = function (articleName,tags) {
		
		if(globalIndex.articles[articleName]){
			console.log('indexThisArticle> ' + articleName + ' is already indexed');
			return false;
		}

		globalIndex.articles[articleName] = tags;
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

			var loadedJSON = JSON.parse(data);

			if(loadedJSON.articles){
				globalIndex.articles = loadedJSON.articles;
				globalIndex.totalTags = loadedJSON.totalTags;
				console.log('loadIndex> index loaded');
			}
		});

		return true;
	};

	//	search our global index by tag(s) to find articles that contain this tag(s)
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
			console.log('searchByTag> Found ' + success.join(',') + ' with these tags');
		} else {
			console.log('searchByTag> Sorry, this tag was not found');
		}

		return true;
	};

	//	expose our functions
	return {
		searchWiki: searchWiki,
		globalIndex: globalIndex,
		loadIndex: loadIndex,
		searchByTag: searchByTag
	};

}());
///////////////////////////////////////

//	initially load from index.json
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
