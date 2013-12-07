module.exports = function(game, opts) {
  return new Plugins(game, opts);
};

// for quick testing in browser
window.p=module.exports(2,{});
window.require=function(game,opts){ return function(game,opts){return 1}}; // TODO: require-bin?

function Plugins(game, opts) {
  this.game = game;
  game.plugins = this;

  // map plugin name to instances
  this.pluginMap = {};

  // map plugin name to whether they are enabled (plugins can be disabled,
  // but their instance remain in pluginsMap to be reenabled later)
  this.enableStates = {};
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
  this.enableStates[name] = false;

  console.log("loaded plugin ",name,plugin);
  // TODO: maybe we should enable by default?


  return plugin;
};

// Get a loaded plugin instance
Plugins.prototype.get = function(name) {
  return this.pluginMap[name];
};

Plugins.prototype.isEnabled = function(name) {
  return this.enableStates[name];
};

Plugins.prototype.enable = function(name) {
  console.log("enabling plugin ",name);
  var plugin = this.get(name);
  var success = false;

  if (!plugin) {
    console.log("no such plugin loaded to enable: ",name);
    success = false;
  } else {
    if (this.enableStates[name]) {
      console.log("already enabled: ",name);
      return false;
    }

    success = plugin.enable ? plugin.enable() : true; // enable() is optional
    this.enableStates[name] = success;
  }
  return success;
};

Plugins.prototype.disable = function(name) {
  console.log("disabling plugin ",name);
  var plugin = this.get(name);
  if (!plugin) {
    console.log("no such plugin loaded to disable: ",name);
    return false;
  }
  if (!this.isEnabled(name)) {
    console.log("already disabled: ", name);
    return false;
  }

  if (plugin.disable)
    plugin.disable(); 

  this.enableStates[name] = false;

  // TODO: recursively disable dependants? or refuse to disable if has enabled dependants?
  return true;
};

Plugins.prototype.unload = function(name) {
  if (!this.pluginMap[name]) {
    console.log("no such plugin to unload: ",name);
    return false;
  }

  if (this.isEnabled(name))
    this.disable(name);

  delete this.pluginMap[name];
  delete this.enableStates[name];
  console.log("unloaded ",name);

  return true;
};
