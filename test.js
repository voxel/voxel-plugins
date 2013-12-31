var createPlugins = require('./');
var test = require('tape');

function FakeGame() {
}

function PluginFoo(game, opts) {
  console.log('PluginFoo loading');
}

function createPluginFoo(game, opts) {
  return new PluginFoo(game, opts);
}


function PluginBar(game, opts) {
  console.log('PluginBar loading');
}

function createPluginBar(game, opts) {
  return new PluginBar(game, opts);
}
createPluginBar.pluginInfo = {
  loadAfter: ['foo']
};

function fakeRequire(name) {
  console.log('require '+name);
  return {foo: createPluginFoo, bar: createPluginBar}[name];
}


test('game.plugins set', function(t) {
  var game = new FakeGame();
  var plugins = createPlugins(game, {require:fakeRequire});

  t.equals(game.plugins, plugins);
  t.end();
});

test('plugin add simple', function(t) {
  var plugins = createPlugins(new FakeGame(), {require:fakeRequire});

  plugins.add('foo', {});
  plugins.loadAll();

  t.equals(plugins.list()[0], 'foo');

  t.end();
});

test('plugin add fail missing opts', function(t) {
  var plugins = createPlugins(new FakeGame(), {require:fakeRequire});

  var caughtError;
  try {
    plugins.add('foo'); // options are mandatory
  } catch (e) {
    caughtError = e;
  }

  t.equals(caughtError !== undefined, true);
  t.end();
});

