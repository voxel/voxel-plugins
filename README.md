# voxel-plugins

An API for loading and enabling plugins in voxel.js with support for soft dependencies.

For a list of available plugins, see [the wiki](https://github.com/deathcap/voxel-plugins/wiki).

[![Build Status](https://travis-ci.org/deathcap/voxel-plugins.png)](https://travis-ci.org/deathcap/voxel-plugins)

## Loading plugins

First construct the plugin system:

    var createPlugins = require('voxel-plugins');
    var plugins = createPlugins(game, {require:require});

You can now add as many plugins as you want, as follows:

    plugins.add('foo', {});

giving the plugin name and an options object. The name should be `require()`-able module, and
the options are plugin-specific. Adding plugins will perform the require,
examine the optional pluginInfo for dependency ordering, build up the loading graph, and save the
options, but not yet instantiate the plugin objects.

Once plugins are added, they can all be loaded (in the proper order,
uses [tsort](https://github.com/eknkc/tsort) with the optional dependency info) by calling `loadAll()`:

    plugins.loadAll();

At any time, plugins can be disabled and re-enabled (they start out enabled at load),
as long as they implement a simple API (see next section):

    plugins.enable('foo');
    plugins.disable('foo');
    plugins.toggle('foo')
    var flag = plugins.isEnabled('foo');

and the plugins can be queried like so:

    console.log(plugins.list());
    var pluginInstance = plugins.get('foo');


## Plugin development

### Construction

To write a plugin supported by this API all you need to do is make an NPM module, and have it accept (game, opts) then return a new object:

    module.exports = function(game, opts) {
      return new Foo(game, opts)
    }

    function Foo(game, opts) {
        // initialization and setup here
        // game is the voxel-engine instance, opts is an optional {} for configuration
    }

That's it. Many voxel.js addon modules already support this convention. As long as they do, voxel-plugins will be able to load them.

### Enabling and disabling

voxel-plugins supports dynamically enabling/disabling plugins, if the individual plugin supports it.
To support it, just implement enable() and disable() methods, and call enable() in your constructor:

    function Foo(game, opts) {
        // initialization and setup here

        // must call enable() in your constructor
        this.enable();
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

### Soft dependencies & load order

Often it is useful to call into another plugin instance during initialization, but in order 
for this to work the other plugin must be loaded before yours. To do this, set the `pluginInfo` property
on the exported object to contain the `loadAfter` property with a list of plugins to load first, for example
(from [voxel-workbench](https://github.com/deathcap/voxel-workbench)):

    module.exports.pluginInfo = {
        loadAfter: ['voxel-registry', 'craftingrecipes']
    }

Since the above plugins will be loaded first, you can now safely execute `game.plugins.get('voxel-registry')`
(etc.) in your constructor or `enable()` method.

voxel-plugins performs a topological sort to determine the correct load order. For a more
complex dependency tree, check out
[voxel-reach](https://github.com/deathcap/voxel-reach),
[voxel-mine](https://github.com/deathcap/voxel-mine),
[voxel-use](https://github.com/deathcap/voxel-use), and
[voxel-harvest](https://github.com/deathcap/voxel-harvest).

### Adding game content

voxel-plugins only handles loading and enabling/disabling plugins. 

To implement the actual functionality of your plugin (modifying the game, etc.), you 
can use the voxel-engine APIs (instance passed in the `game` parameter), or other plugin APIs.
voxel-plugins itself is available in `game.plugins` and can be used to lookup other plugins
for this purpose. See also [voxel-registry](https://github.com/deathcap/voxel-registry).



## License

MIT
