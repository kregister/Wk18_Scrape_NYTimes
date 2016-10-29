/* Showing Mongoose's "Populated" Method (18.3.8)
 * INSTRUCTOR ONLY
 * =============================================== */

// dependencies
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
// Notice: Our scraping tools are prepared, too
var request = require('request');
var cheerio = require('cheerio');

// use morgan and bodyparser with our app
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
  extended: false
}));

// make public a static dir
app.use(express.static('public'));

var exphbs = require('express-handlebars');
app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

// Database configuration with mongoose

mongoose.connect('mongodb://heroku_gwqpnlkh:q5vm75te4rmmoffticriqhq9uo@ds039000.mlab.com:39000/heroku_gwqpnlkh');
// mongoose.connect('mongodb://localhost/wk18-scrape-nytimes');
var db = mongoose.connection;

// show any mongoose errors
db.on('error', function(err) {
  console.log('Mongoose Error: ', err);
});

// once logged in to the db through mongoose, log a success message
db.once('open', function() {
  console.log('Mongoose connection successful.');
});


// And we bring in our Note and Article models
var Note = require('./models/note.js');
var Article = require('./models/article.js');


// Routes
// ======

// Index Route
app.get('/', function(req, res) {
  res.render('home');
});

// Post Fetch Route to fetch and store the desired data with cheerio
app.post('/fetch', function(req, res) {

// Requsts to grab the body of the HTML
  request('http://www.nytimes.com/', function(error, response, html) {

// Then that request is loaded into cheerio and saved into $ for easy selection later on.
    var $ = cheerio.load(html);

// now, we grab every h2 within an article tag, and do the following:
    $('article.story.theme-summary').each(function(i, element) {

      console.log(element);

    		// Empty object result
				var result = {};

				// add the text and href of every link,
				// and save them as properties of the result obj
				result.title = $(element).find('.story-heading').find('a').text();
				result.summary = $(element).find('p.summary').text();

        // result.title = $(this).children('h2 a').text();
				// result.summary = $(this).children('.summary').text();


				// using our Article model, create a new entry.
				// Notice the (result):
				// This effectively passes the result object to the entry (and the title and link)
				var entry = new Article (result);

				// now, save that entry to the db
				entry.save(function(err, doc) {
					// log any errors
				  if (err) {
				    //console.log(err);
				  }
				  // or log the doc
				  else {
				    //console.log(doc);
				  }
				});


    });
  });
  // tell the browser that we finished scraping the text.
  res.send("Scrape Complete");
});

// this will get the articles we scraped from the mongoDB
app.get('/check', function(req, res){

	//console.log("got to check");

	// grab every doc in the Articles array
	Article.find({}, function(err, doc){
		// log any errors
		if (err){
			console.log(err);
		}
		// or send the doc to the browser as a json object
		else {
			res.json(doc);
		}
	});
});

// this will get the articles we scraped from the mongoDB
app.post('/gather', function(req, res){

// Grabs all docs in the Articles array
	Note.find({'id': req.body.id}, function(err, doc){

// log errors if any
		if (err){
			console.log(err);
		}

// If no error the else sends the doc to the browser as a json object
		else {
			res.json(doc);
		}
	});
});


// replace the existing note of an article with a new one
// or if no note exists for an article, make the posted note it's note.
app.post('/save', function(req, res){
	// create a new note and pass the req.body to the entry.
	var newNote = new Note(req.body);

	// and save the new note the db
	newNote.save(function(err, doc){
		// log any errors
		if(err){
			console.log(err);
		}
		// otherwise
		else {
			// using the Article id passed in the id parameter of our url,
			// prepare a query that finds the matching Article in our db

      // and update it to make it's lone note the one we just saved
      Article.findOneAndUpdate({'id': req.params.id}, {'note':doc._id})
			// execute the above query
			.exec(function(err, doc2){
				// log any errors
				if (err){
					console.log(err);
				} else {
					// or send the document to the browser
					res.send(doc);
				}
			});
		}
	});
});

app.delete('/delete', function(req, res){
//
	Note.remove({'id': req.body.id})

	// Executes the Query
	.exec(function(err, doc){

// Error Log
		if (err){
			console.log(err);
		}
		// otherwise, send the doc to the browser as a json object
		else {
			res.send(doc);
		}
	});
});


var PORT = process.env.PORT || 3000;


// listen on port 3000
app.listen(PORT, function() {
  console.log('App running on port 3000!');
});
