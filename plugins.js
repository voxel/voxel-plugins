'use strict';
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var tsort = require('tsort');

module.exports = function(game, opts) {
  return new Plugins(game, opts);
};

function Plugins(game, opts) {
  this.game = game;
  if (this.game) this.game.plugins = this;

  opts = opts || {};
  this.require = opts.require || require;
  this.catchExceptions = false;
  this.masterPluginName = opts.masterPluginName || 'voxel-engine'; // synthetic 'plugin' created as parent of all

  // map plugin name to instances
  this.all = {};

  this.savedOpts = {};
  this.graph = tsort();
}

Plugins.prototype.wrapExceptions = function(f) {
  var ret;

  if (!this.catchExceptions) {
    ret = f();
    return ret === undefined ? true : ret; // undefined ok
  }

  try {
    ret = f();
  } catch (e) {
    console.log('caught exception:',e,'calling',f);
    console.trace();
    return false;
  }
  return ret === undefined ? true : ret;
}

// Require the plugin module and return its factory constructor
// This does not construct the plugin instance, for that see instantiate()
Plugins.prototype.scan = function(name) {
  var createPlugin = this.require(name);   // factory for constructor

  return createPlugin;
};

// Scan then instantiate a plugin by name, creating its instance (starts out enabled)
Plugins.prototype.scanAndInstantiate = function(name, opts) {
  if (this.get(name)) {
    console.log("plugin already instantiated: ", name);
    return false;
  }

  opts = opts || {};
 
  var createPlugin = this.scan(name);

  if (createPlugin.pluginInfo && createPlugin.pluginInfo.clientOnly) {
    if (!this.game.isClient) {
      console.log("Skipping client-only plugin ("+name+"), in non-client environment");
      return false;
    }
  }

  if (this.game && this.masterPluginName === name) {
    console.log("Skipping already-loaded master plugin: " + this.masterPluginName);
    return false;
  }

  if (!createPlugin) {
    console.log("plugin not found: ",name);
    return false;
  }

  var self = this;
  if (!this.wrapExceptions(function() {
    return self.instantiate(createPlugin, name, opts);
  })) {
    console.log("failed to instantiate ",name);
  }

  return true;
};

// Instantiate a plugin given factory constructor, creating its instance (starts out enabled)
Plugins.prototype.instantiate = function(createPlugin, name, opts) {
  var plugin;
  if (!this.game && name === this.masterPluginName) {
    // the 'master' plugin is the game object itself
    this.game = plugin = createPlugin(opts);
    this.game.plugins = this;
    if (process.browser && this.game.notCapable()) {
      if (window.document) window.document.body.appendChild(this.game.notCapableMessage()); // TODO: find out why notCapable() isn't showing up
      throw new Error('[voxel-plugins] fatal error: your system is not capable of running voxel-engine (game.notCapable)');
    }
  } else {
    plugin = createPlugin(this.game, opts); // requires (game, opts) convention
    if (!plugin) {
      console.log("create plugin failed:",name,createPlugin,plugin);
      return false;
    }
  }

  plugin.pluginName = name;
  this.emit('new plugin', name);

  // plugins are enabled on instantiation -- assumed constructor calls its own enable() method (if present)
  plugin.pluginEnabled = true;
  this.emit('plugin enabled', name);

  this.all[name] = plugin;

  //console.log("Instantiated plugin:",name,plugin);
  console.log("Instantiated plugin:",name);


  return plugin;
};

// Mark a plugin for on-demand loading in enable(), with given preconfigured options
// (The plugin does not have to exist yet)
// The saved configuration is also used in add(), if available
Plugins.prototype.preconfigure = function(name, opts) {
  this.savedOpts[name] = opts;
  
  if (!this.get(name)) 
    this.emit('new plugin', name);
};

// Add a plugin for loading: scan for ordered loading and preconfigure with given options
// Special case: if the 'onDemand' option is set, the plugin won't be scanned at all, instead the pass configuration will be saved
Plugins.prototype.add = function(name, opts) {
  if (!opts && !this.savedOpts[name]) throw new Error('voxel-plugins preload('+name+'): missing required options and not preconfigured');
  if (opts.onDemand) return this.preconfigure(name, opts);

  var createPlugin = this.scan(name);
  if (!createPlugin)
    return false;

  this.buildGraph(createPlugin, name);

  // save options to load with
  this.preconfigure(name, opts);
};

Plugins.prototype.buildGraph = function(createPlugin, name) {
  var loadAfter = [];

  if (createPlugin.pluginInfo) {
    loadAfter = createPlugin.pluginInfo.loadAfter;

    if (!loadAfter) loadAfter = [];
  }

  // special master plugin, everything always loads after
  // (mainly added so all plugins are in the graph, even with empty loadAfter)
  if (name !== this.masterPluginName) loadAfter.unshift(this.masterPluginName);

  // add edges for each plugin required to load before us
  for (var i = 0; i < loadAfter.length; ++i)
    this.graph.add(loadAfter[i], name);
};

// Load add()'d plugins in order sorted by pluginInfo
Plugins.prototype.loadAll = function() {
  // topological sort by loadAfter dependency order
  var sortedPluginNames = this.graph.sort();

  console.log('sortedPluginNames:'+JSON.stringify(sortedPluginNames));
  for (var i = 0; i < sortedPluginNames.length; ++i) {
    var name = sortedPluginNames[i];

    if (!this.isEnabled(name))
      this.enable(name); // will instantiate() since preconfigured
  }
};


// Get an instantiated plugin instance by name or instance
Plugins.prototype.get = function(name) {
  if (typeof name === "string")
    return this.all[name];
  else
    // assume it is a plugin instance already, return as-is
    return name;
};

Plugins.prototype.isEnabled = function(name) {
  var plugin = this.get(name);

  return !!(plugin && plugin.pluginEnabled);
};

Plugins.prototype.isLoaded = function(name) {
  var plugin = this.get(name);

  return !!(plugin && plugin.pluginName && this.all[plugin.pluginName]);
};

// Get list of enabled plugins
Plugins.prototype.list = function() {
  return this.listAll().filter(this.isEnabled.bind(this));
};

// Get list of all plugins
Plugins.prototype.listAll = function() {
  var loaded = Object.keys(this.all);
  var unloaded = Object.keys(this.savedOpts).filter(function(x) {
    return loaded.indexOf(x) == -1;
  });

  return loaded.concat(unloaded);
};


Plugins.prototype.enable = function(name) {
  var plugin = this.get(name);

  if (!plugin) {
    if (this.savedOpts[name]) {
      // on-demand instantiation, with prespecified options
      return this.scanAndInstantiate(name, this.savedOpts[name]);
    } else {
      if (name !== this.masterPluginName) // ignore missing master plugin, as it is optional
        console.log("no such plugin loaded to enable: ",plugin,name);
    }

    return false;
  } else {
    if (plugin.pluginEnabled) {
      console.log("already enabled: ",plugin,name);
      return false;
    }

    if (plugin.enable) {
      if (!this.wrapExceptions(function() {
        plugin.enable();
      })) {
        console.log("failed to enable:",plugin,name);
        return false;
      }
    }
    plugin.pluginEnabled = true;
    this.emit('plugin enabled', name);
  }
  return true;
};

Plugins.prototype.disable = function(name) {
  console.log("disabling plugin ",name);
  var plugin = this.get(name);

  if (!plugin) {
    console.log("no such plugin loaded to disable: ",plugin,name);
    return false;
  }
  if (!this.isEnabled(plugin)) {
    console.log("already disabled: ",plugin,name);
    return false;
  }

  if (plugin.disable) {
    if (!this.wrapExceptions(function() {
      plugin.disable(); 
    })) {
      console.log("failed to disable:",plugin,name);
      return false;
    }
  }

  plugin.pluginEnabled = false;
  this.emit('plugin disabled', name);

  // TODO: recursively disable dependants? or refuse to disable if has enabled dependants?
  return true;
};

Plugins.prototype.toggle = function(name) {
  if (this.isEnabled(name)) {
    return this.disable(name);
  } else {
    return this.enable(name);
  }
};

Plugins.prototype.destroy = function(name) {
  var plugin = this.get(name);

  if (!plugin) {
    console.log("no plugin",plugin,name);
    return false;
  }

  if (!this.all[plugin.pluginName]) {
    console.log("no such plugin to destroy: ",plugin);
    return false;
  }

  if (this.isEnabled(plugin))
    this.disable(plugin);

  delete this.all[plugin.pluginName];
  console.log("destroyed  ",plugin);

  return true;
};

inherits(Plugins, EventEmitter);
