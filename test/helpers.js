var assert = require('chai').assert;

var nextAppId = 1;

var REGEX_LOCALE_ROUTE = /^\/([a-zA-Z0-9]+\-[a-zA-Z0-9]+)(\/.*)$/,
	RESPONDERS = {
		jsonContext: function(context) {
			var appId = nextAppId++;
			return function(req, res, next) {
				process.nextTick(function() {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						appId: appId,
						url: req.url,
						context: context
					}));
				});
			};
		},

		slow: function(context) {
			var appId = nextAppId++;
			return function(req, res, next) {
				setTimeout(function() {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						appId: appId,
						url: req.url,
						context: context
					}));
				}, 250);
			};
		}
	};

module.exports = {
	locales: [{
		locale: 'en-US'
	}, {
		locale: 'pt-BR'
	}],

	context: {
		locale: function(req, done) {
			process.nextTick(function() {
				var route = req.url.match(REGEX_LOCALE_ROUTE);
				if(!route) return done();

				req.url = route[2];
				done(null, {
					locale: route[1]
				});
			});
		},

		invalid: function(req, done) {
			process.nextTick(function() {
				done(new Error('Simulating error while identifying context.'));
			});
		}
	},

	bootstrap: {
		func: function(context, done) {
			process.nextTick(function() {
				done(null, RESPONDERS.jsonContext(context));
			});
		},

		object: function(context, done) {
			process.nextTick(function() {
				done(null, {
					handleRequest: RESPONDERS.jsonContext(context)
				});
			});
		},

		slow: function(context, done) {
			setTimeout(function() {
				done(null, RESPONDERS.jsonContext(context));
			}, 250);
		},

		slowRequest: function(context, done) {
			process.nextTick(function() {
				done(null, RESPONDERS.slow(context));
			});
		},

		invalid: function(context, done) {
			process.nextTick(function() {
				done(null, {
					"it'll": "never work..."
				});
			});
		}
	},

	middleware: {
		text: function(text) {
			return function(req, res, next) {
				res.writeHead(200, { 'Content-Type': 'text/plain' });
				res.end(text || 'Hello World');
			};
		},

		auth: function(authorized) {
			return function(req, res, next) {
				req.authorized = arguments.length ? !!authorized : true;
				next();
			};
		},

		error: function(message) {
			return function(req, res, next) {
				next(new Error(message || 'Simulating error in middleware.'));
			};
		}
	},

	validate: {
		locale: function(response, locale, done) {
			response
				.expect(200)
				.expect('Content-Type', 'application/json')
				.end(function(err, res) {
					if(err) return done(err);

					assert.isObject(res.body);
					assert.isNumber(res.body.appId);
					delete res.body.appId;
					assert.deepEqual(res.body, {
						url: '/home',
						context: {
							locale: locale
						}
					});

					done();
				});
		},

		text: function(response, text, done) {
			if(typeof text === 'function') {
				done = text;
				text = null;
			}

			response
				.expect(200)
				.expect('Content-Type', 'text/plain')
				.expect(text || 'Hello World', done);
		}
	}
};
