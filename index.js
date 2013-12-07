module.exports = function(game, opts) {
  return new Plugins(game, opts);
};

// for quick testing in browser
window.p=module.exports(2,{});
window.require=function(game,opts){ return function(game,opts){
  this.enable = function() { console.log("ENABLE"); };
  this.disable = function() { console.log("DISABLE"); };
  return this;
}}; // TODO: require-bin?

function Plugins(game, opts) {
  this.game = game;
  game.plugins = this;

  // map plugin name to instances
  this.pluginMap = {};
}

// Loads a plugin instance (does not enable)
Plugins.prototype.load = function(name, opts) {
  console.log("loading plugin ",name,opts);
  
  if (this.get(name)) {
    console.log("plugin already loaded: ", name);
    return false;
  }

  opts = opts || {};

  var createPlugin = require(name);   // factory for constructor
  if (!createPlugin) {
    console.log("plugin not found: ",name);
    return false;
  }

  var plugin = createPlugin(this.game, opts); // requires (game, opts) convention
  if (!plugin) {
    console.log("create plugin failed:",name,createPlugin,plugin);
    return false;
  }
  plugin.pluginName = name;
  plugin.pluginEnabled = false;
  this.pluginMap[name] = plugin;

  console.log("loaded plugin ",name,plugin);
  // TODO: maybe we should enable by default?


  return plugin;
};

// Get a loaded plugin instance by name or instance
Plugins.prototype.get = function(name) {
  if (typeof name === "string")
    return this.pluginMap[name];
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

  return !!(plugin && plugin.pluginName && this.pluginMap[plugin.pluginName]);
};

// Get list of enabled plugins
Plugins.prototype.list = function() {
  var self = this;
  return this.listAll().filter(function(plugin) { return self.isEnabled(plugin); });
};

// Get list of all plugins
Plugins.prototype.listAll = function() {
  return Object.keys(this.pluginMap);
};


Plugins.prototype.enable = function(name) {
  console.log("enabling plugin ",name);
  var plugin = this.get(name);

  if (!plugin) {
    console.log("no such plugin loaded to enable: ",plugin,name);
    return false;
  } else {
    if (plugin.pluginEnabled) {
      console.log("already enabled: ",plugin,name);
      return false;
    }

    if (plugin.enable) {
      try {
        plugin.enable();
      } catch(e) {
        console.log("failed to enable:",plugin,name,e);
        return false;
      }
    }
    plugin.pluginEnabled = true;
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
    try {
      plugin.disable(); 
    } catch (e) {
      console.log("failed to disable:",plugin,name,e);
      return false;
    }
  }

  console.log("disabling X",plugin);
  plugin.pluginEnabled = false;

  // TODO: recursively disable dependants? or refuse to disable if has enabled dependants?
  return true;
};

Plugins.prototype.unload = function(name) {
  var plugin = this.get(name);

  if (!plugin) {
    console.log("no plugin",plugin,name);
    return false;
  }

  if (!this.pluginMap[plugin.pluginName]) {
    console.log("no such plugin to unload: ",plugin);
    return false;
  }

  if (this.isEnabled(plugin))
    this.disable(plugin);

  delete this.pluginMap[plugin.pluginName];
  console.log("unloaded ",plugin);

  return true;
};
