# voxel-plugins

An API for plugins in voxel.js.

## Basic plugin API

To write a plugin supported by this API all you need to do is make an NPM module, and have it accept (game, opts) then return a new object:

    module.exports = function(game, opts) {
      return new Foo(game, opts)
    }

    function Foo(game, opts) {
        // initialization and setup here
        // game is the voxel-engine instance, opts is an optional {} for configuration
    }

That's it. Many voxel.js addon modules already support this convention. As long as they do, voxel-plugins will be able to load them.

## Advanced plugin API

But the real usefulness of voxel-plugins comes in the dynamic enabling/disabling functionality.
To support this feature, just implement enable() and disable() methods, and call enable() in your constructor:

    function Foo(game, opts) {
        // initialization and setup here

        // must call enable() in your constructor
        enable();
    }

    Foo.prototype.enable = function() {
        // enable your plugin, making changes to the gameplay as needed
    }

    Foo.prototype.disable = function() {
        // disable your plugin, returning the game to a state as if it was never enabled
    }

In enable() you register event handlers, in disable() remove them, and so on. Implementing enable/disable
support allows your plugin to be enabled and disabled using [voxel-plugins-ui](https://github.com/deathcap/voxel-plugins-ui),
or otherwise.

## Loading plugins

Once you have written a "plugin" conforming to this API, how do you use it? Plugins can be statically loaded, without voxel-plugins:

    var createFoo = require('foo')
    var foo = createFoo(game, opts)

But with voxel-plugins, you can instead use load(), enable(), disable(), toggle(), list(), etc. to easily manage your plugins
(see the source for details).

## License

MIT
