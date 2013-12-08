# voxel-plugins

Dynamically enable and disable addons for voxel-engine.

Supported plugins are NPM modules with the following conventions:

    module.exports = function(game, opts) {
      return new Foo(game, opts)
    }

    function Foo(game, opts) {
        // initialization and setup (but do not make any changes to the game)
        // game is the voxel-engine instance, opts is an optional {} for configuration
    }

    Foo.prototype.enable = function() {
        // enable your plugin, making changes to the gameplay as needed
    }

    Foo.prototype.disable = function() {
        // disable your plugin, returning the game to a state as if it was never enabled
    }

Plugins can be statically loaded, without voxel-plugins:

    var createFoo = require('foo')
    var foo = createFoo(game, opts)
    foo.enable()

With voxel-plugins, you can instead use load(), enable(), disable(), toggle(), list(), etc. to easily manage the plugins.

## License

MIT
