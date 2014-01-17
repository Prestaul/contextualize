var assert = require('chai').assert,
	supertest = require('supertest'),
	helpers = require('./helpers'),
	contextualize = require('../index');

describe('contextualize', function() {

	function commonTests(description, validator, testNoContext, server) {
		if(typeof validator !== 'string') {
			testNoContext = validator;
			server = testNoContext;
			validator = 'locale';
		}

		if(typeof testNoContext !== 'boolean') {
			server = testNoContext;
			testNoContext = true;
		}

		describe(description, function() {

			it('should handle basic requests', function(done) {
				helpers.validate[validator](server.get('/en-US/home'), validator === 'locale' ? 'en-US' : 'Hello World', done);
			});

			it('should handle basic requests for multiple contexts', function(done) {
				helpers.validate[validator](server.get('/pt-BR/home'), validator === 'locale' ? 'pt-BR' : 'Hello World', done);
			});

			if(testNoContext) {
				it('should return a 404 for unrecognized contexts', function(done) {
					server.get('/home')
						.expect(404, done);
				});
			}

		});
	}

	commonTests('bootstrapped with a function', supertest(contextualize()
		.context(helpers.context.locale)
		.bootstrap(helpers.bootstrap.func)
	));

	commonTests('bootstrapped with an object', supertest(contextualize()
		.context(helpers.context.locale)
		.bootstrap(helpers.bootstrap.object)
	));

	commonTests('with middleware', supertest(contextualize()
		.use(helpers.middleware.auth())
		.context(helpers.context.locale)
		.bootstrap(helpers.bootstrap.func)
	));

	commonTests('with interrupting middleware', 'text', false, supertest(contextualize()
		.use(helpers.middleware.text())
		.context(helpers.context.locale)
		.bootstrap(helpers.bootstrap.func)
	));

	commonTests('with preloaded contexts', supertest(contextualize()
		.context(helpers.context.locale)
		.bootstrap(helpers.bootstrap.slow)
		.preload(helpers.locales)
	));


	describe('with an invalid context function', function() {

		var server = supertest(contextualize()
			.context(helpers.context.invalid)
			.bootstrap(helpers.bootstrap.func)
		);

		it('should return a 500', function(done) {
			server.get('/en-US/home')
				.expect(500, done);
		});

	});


	describe('with an invalid bootstrap function', function() {

		var server = supertest(contextualize()
			.context(helpers.context.locale)
			.bootstrap(helpers.bootstrap.invalid)
		);

		it('should return a 500', function(done) {
			server.get('/en-US/home')
				.expect(500, done);
		});

	});


	function multipleCallTests(description, server) {
		describe(description, function() {

			it('in same context should get the same contextualized app', function(done) {
				var appId;

				server.get('/en-US/home')
					.end(function(err, res) {
						if(err) return done(err);

						assert.isObject(res.body);
						assert.isNumber(res.body.appId);
						appId = res.body.appId;

						server.get('/en-US/about')
							.end(function(err, res) {
								if(err) return done(err);

								assert.isObject(res.body);
								assert.isNumber(res.body.appId);
								assert.equal(res.body.appId, appId);

								done();
							});
					});
			});

			it('in different contexts should get different contextualized apps', function(done) {
				var appId;

				server.get('/en-US/home')
					.end(function(err, res) {
						if(err) return done(err);

						assert.isObject(res.body);
						assert.isNumber(res.body.appId);
						appId = res.body.appId;

						server.get('/pt-BR/about')
							.end(function(err, res) {
								if(err) return done(err);

								assert.isObject(res.body);
								assert.isNumber(res.body.appId);
								assert.notEqual(res.body.appId, appId);

								done();
							});
					});
			});

		});
	}

	multipleCallTests('with multiple calls', supertest(contextualize()
		.context(helpers.context.locale)
		.bootstrap(helpers.bootstrap.slowRequest)
	));

	multipleCallTests('with preloaded contexts and multiple calls', supertest(contextualize()
		.context(helpers.context.locale)
		.bootstrap(helpers.bootstrap.slowRequest)
		.preload(helpers.locales)
	));

});
