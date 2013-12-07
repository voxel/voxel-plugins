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
  this.pluginMap[name] = plugin;
  plugin.pluginEnabled = false;

  console.log("loaded plugin ",name,plugin);
  // TODO: maybe we should enable by default?


  return plugin;
};

// Get a loaded plugin instance by name
Plugins.prototype.get = function(name) {
  return this.pluginMap[name];
};

Plugins.prototype.isEnabled = function(plugin) {
  return plugin && plugin.pluginEnabled;
};

Plugins.prototype.enable = function(plugin) {
  if (typeof plugin === "string")
    plugin = this.get(plugin);
  console.log("enabling plugin ",plugin);

  if (!plugin) {
    console.log("no such plugin loaded to enable: ",plugin);
    return false;
  } else {
    if (plugin.pluginEnabled) {
      console.log("already enabled: ",plugin);
      return false;
    }

    if (plugin.enable) {
      try {
        plugin.enable();
      } catch(e) {
        console.log("failed to enable:",plugin,e);
        return false;
      }
    }
    plugin.pluginEnabled = true;
  }
  return true;
};

Plugins.prototype.disable = function(plugin) {
  console.log("disabling plugin ",plugin);
  if (typeof plugin === "string")
    plugin = this.get(plugin);

  if (!plugin) {
    console.log("no such plugin loaded to disable: ",plugin);
    return false;
  }
  if (!this.isEnabled(plugin)) {
    console.log("already disabled: ",plugin);
    return false;
  }

  if (plugin.disable) {
    try {
      plugin.disable(); 
    } catch (e) {
      console.log("failed to disable:",plugin,e);
      return false;
    }
  }

  console.log("disabling X",plugin);
  plugin.pluginEnabled = false;

  // TODO: recursively disable dependants? or refuse to disable if has enabled dependants?
  return true;
};

Plugins.prototype.unload = function(name) {
  if (!this.pluginMap[name]) {
    console.log("no such plugin to unload: ",name);
    return false;
  }

  if (this.isEnabled(plugin))
    this.disable(name);

  delete this.pluginMap[name];
  console.log("unloaded ",name);

  return true;
};
