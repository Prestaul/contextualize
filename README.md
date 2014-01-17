contextualize
=============

A simple tool for lazily bootstrapping any nodejs app into each application context.


Basic Usage
-----------
contextualize creates an http server for you and provides a mechanism for defining the context for each request, and a mechanism
for bootstrapping an application for each unique context.
```js
var contextualize = require('contextualize');

contextualize()
    .context(function(request, done) {
        // Set the context for this request
        done(null, { foo:'bar' });
    })
    .bootstrap(function(context, done) {
        // Bootstrap an application for a context
        done(null, function(req, res) {
            res.end('Hello World');
        });
    })
    .listen(80);
```


Practical Use
-----------
Here is an example of how you might switch contexts based on environment and locale code in the host name:
```js
contextualize()
    .context(function(request, done) {
        // Extract the environment and locale code from the host name (e.g. prod.en-US.foobar.com)
        var m = request.host.match(/^(\w+)\.([a-z]{2}-[A-Z]{2})\./);
        
        // Return the context
        done(null, {
            environment: m[1],
            locale: m[2]
        });
    })
    .bootstrap(function(context, done) {
        // Bootstrap an application for each unique context
        done(null, new Application(context));
    })
    .listen(80);
```


Preloading Contexts at Startup
------------------------------
By default the first request in a context will take the hit of bootstrapping the application for that context. If you want to 
preload known contexts to avoid that latency on the first request then you can use the `preload` method:
```js
contextualize()
    .context(getContext)
    .bootstrap(bootstrapApp)
    .preload([{
        locale: 'en-US',
        environment: 'prod'
    }, {
        locale: 'pt-BR',
        environment: 'prod'
    }])
    .listen(80);
```


Pre-Context Switch Middleware
--------------------------------
You may want to apply some middleware (e.g. static file serving, cookie parsing, body parsing, user authentication, etc.) prior
to setting the context for a request. 
```js
contextualize()
    // Attach middleware here
    .use(staticMiddleware('./public', './static'))
    .use(authMiddleware())
    .context(function(request, done) {
        // Use result of authentication middleware in the context
        done(null, {
            authorized: request.authorized,
        });
    })
    .bootstrap(function(context, done) {
        // Bootstrap seperate apps for logged in or not logged in users
        done(null, context.authorized ? new PublicApplication() : new PrivateApplication());
    })
    .listen(80);
```


Applications
------------
Applications returned by your bootstrap function are either a `Function` or an `Object` with a `handleRequest` method.
```js
contextualizer()
    .context(getContext)
    .bootstrap(function(context, done) {
        done(null, function(req, res) {
            res.end('Hello World');
        });
    });
    .listen(80);
```

or:
```js
contextualizer()
    .context(getContext)
    .bootstrap(function(context, done) {
        done(null, {
            handleRequest: function(req, res) {
                res.end('Hello World');
            }
        });
    })
    .listen(80);
```

Note that *express* and *connect* applications are already functions with this interface so this will work as well:
```js
contextualizer()
    .context(getContext)
    .bootstrap(function(context, done) {
        var app = require('express')();

        app.get('/sup', function(req, res){
            res.send(200, 'Hello World');
        });

        done(null, app);
    })
    .listen(80);
```
