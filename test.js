var createPlugins = require('./');
var test = require('tape');

function FakeGame() {
}


function createPluginFoo(game, opts) {
  function PluginFoo(game, opts) {
    console.log('PluginFoo loading');
  }

  return new PluginFoo(game, opts);
}


function createPluginBar(game, opts) {
  function PluginBar(game, opts) {
    console.log('PluginBar loading');

    this.myfoo = game.plugins.get('foo');
  }

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

  t.throws(function() {
    plugins.add('foo'); // options are mandatory
  });

  t.end();
});

test('enable/disable', function(t) {
  var plugins = createPlugins(new FakeGame(), {require:fakeRequire});

  plugins.add('foo', {});
  plugins.loadAll();

  t.equals(plugins.isEnabled('foo'), true); // starts enabled
  plugins.disable('foo');
  t.equals(plugins.isEnabled('foo'), false);
  plugins.enable('foo');
  t.equals(plugins.isEnabled('foo'), true);
  plugins.disable('foo');
  t.equals(plugins.isEnabled('foo'), false);

  t.end();
});

test('on demand', function(t) {
  var plugins = createPlugins(new FakeGame(), {require:fakeRequire});
 
  plugins.add('foo', {onDemand: true});
  plugins.loadAll();

  t.equals(plugins.get('foo') === undefined, true);  // doesn't exist yet

  plugins.enable('foo');
  t.equals(plugins.get('foo') !== undefined, true);
  t.equals(plugins.isEnabled('foo'), true);

  t.end();
});

test('loadAfter', function(t) {
  var plugins = createPlugins(new FakeGame(), {require:fakeRequire});

  plugins.add('foo', {});
  plugins.add('bar', {});
  plugins.loadAll();

  // try reversed too, should have same order because of loadAfter
  var rplugins = createPlugins(new FakeGame(), {require:fakeRequire});
  rplugins.add('bar', {});
  rplugins.add('foo', {});
  rplugins.loadAll();

  // ensure PluginBar was able to get its PluginFoo instance, as foo was loaded before bar
  t.equal(plugins.get('bar').myfoo, plugins.get('foo'));
  t.equal(rplugins.get('bar').myfoo, rplugins.get('foo'));

  t.end();
});


