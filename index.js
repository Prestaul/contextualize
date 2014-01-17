var async = require('async'),
	crypto = require('crypto'),
	http = require('http'),
	stackr = require('stackr');

module.exports = function() {
	var cache = {},
		userware = stackr.substack(),
		ourware = stackr.substack(),
		stack = stackr(userware, ourware),
		server,
		fnContext,
		fnBootstrap;


	function getKey(context) {
		return crypto.createHash('sha1')
					.update(JSON.stringify(context))
					.digest('base64');
	}

	function getContextualized(context, done) {
		var key = getKey(context),
			cached = cache[key];

		// Add to the array of deferreds
		if(cached && cached instanceof Array) return cached.push(done);

		// Just return the contextualized app
		if(cached) return done(null, cached);

		// Create array of deferreds
		cached = cache[key] = [done];
		fnBootstrap(context, function(err, contextualized) {
			if(!err && !(typeof contextualized === 'function' || typeof contextualized.handleRequest === 'function'))
				err = new Error('The function provided to contextualized.bootstrap must return a function or an object with a handleRequest method.');

			// Replace deferreds list with contextualized app
			cache[key] = contextualized;

			// Call the deferreds
			cached.forEach(function(cb) {
				if(err)
					cb(err);
				else
					cb(null, contextualized);
			});
		});
	}


	function contextualize(req, res) {
		return stack(req, res);
	}

	contextualize.use = function() {
		if(server) {
			throw new Error('contextualize.use cannot be called after contextualize.listen');
		}

		userware.use.apply(userware, arguments);

		return this;
	};

	contextualize.context = function(fn) {
		if(fnContext) {
			throw new Error('contexualize.context cannot be called multiple times');
		}

		fnContext = fn;

		ourware.use(function(req, res, next) {
			fnContext(req, function(err, context) {
				if(err) return next(err);
				if(!context) return next();

				getContextualized(context, function(err, contextualized) {
					if(err) return next(err);

					if(typeof contextualized === 'function') {
						contextualized(req, res, next);
					} else if(typeof contextualized.handleRequest === 'function') {
						contextualized.handleRequest(req, res, next);
					}
				});
			});
		});

		return this;
	};

	contextualize.bootstrap = function(fn) {
		if(fnBootstrap) {
			throw new Error('contexualize.bootstrap cannot be called multiple times');
		}

		fnBootstrap = fn;

		return this;
	};

	contextualize.preload = function(contexts) {
		async.eachSeries(contexts, getContextualized, function(err) {
			if(err) throw err;
		});

		return this;
	};

	contextualize.getServer = function() {
		if(server) return server;

		return server = http.createServer(stack);
	}

	contextualize.listen = function(fn) {
		if(!(fnContext && fnBootstrap)) {
			throw new Error('contexualize.listen cannot be called before contexualize.context and contexualize.bootstrap');
		}

		this.getServer();
		server.listen.apply(server, arguments);

		return server;
	};

	return contextualize;
};
