// @ts-nocheck
import { plugandplay } from '../lib/index';

/*
 * TODO: uncomment the code below, on line 18, and
 * remove the `@ts-nocheck` comment at the top of the file to get type hinting for hooks
 */
// type Hooks = {
//   'my:hook': {
//     test: number;
//   };
// };

describe('plugandplay.call_sync', function () {
  describe('api', function () {
    it('no arguments', async function () {
      let count = 0;
      // const plugins = plugandplay<Hooks>();
      const plugins = plugandplay();
      plugins.register({
        hooks: {
          'my:hook': function (args) {
            count++;
            return;
          },
        },
        name: 'my_plugin',
      });
      await plugins.call_sync({
        args: { test: 2 },
        handler: () => {},
        name: 'my:hook',
      });
      count.should.eql(1);
    });
  });

  describe('handler alter args', function () {
    it('synch handler without handler argument', function () {
      interface Test {
        a_key: string;
      }
      const plugins = plugandplay();
      plugins.register({
        hooks: {
          'my:hook': function (test) {
            // Alter `test` with `a_key`
            test.a_key = 'a value';
            return;
          },
        },
        name: 'my_plugin',
      });
      const test = {} as Test;
      plugins.call_sync({
        args: test,
        handler: function () {},
        name: 'my:hook',
      });
      test.a_key.should.eql('a value');
    });

    it('synch handler with handler argument', function () {
      interface Test {
        a_key: string;
      }
      const plugins = plugandplay();
      plugins.register({
        hooks: {
          'my:hook': function (test, handler) {
            test.a_key = 'a value';
            return handler;
          },
        },
        name: 'my_plugin',
      });
      const test = {} as Test;
      plugins.call_sync({
        args: test,
        handler: function () {},
        name: 'my:hook',
      });
      test.a_key.should.eql('a value');
    });
  });

  describe('stop with null', function () {
    it('when `null` is returned, sync mode', function () {
      const plugins = plugandplay();
      plugins.register({
        hooks: {
          'my:hook': function (ar, handler) {
            ar.push('hook 1');
            return handler;
          },
        },
        name: 'my_plugin_1',
      });
      plugins.register({
        hooks: {
          'my:hook': function (ar, handler) {
            ar.push('hook 2');
            return null;
          },
        },
        name: 'my_plugin_2',
      });
      plugins.register({
        hooks: {
          'my:hook': function (ar, handler) {
            ar.push('hook 3');
            return handler;
          },
        },
        name: 'my_plugin_3',
      });
      plugins.register({
        hooks: {
          'my:hook': function (ar, handler) {
            ar.push('hook 4');
            return handler;
          },
        },
        name: 'my_plugin_4',
      });
      const ar: string[] = [];
      plugins.call_sync({
        args: ar,
        handler: function (ar) {
          return ar.push('origin');
        },
        name: 'my:hook',
      });
      ar.should.eql(['hook 1', 'hook 2']);
    });
  });

  return describe('alter result', function () {
    it('sync', function () {
      const plugins = plugandplay();
      plugins.register({
        hooks: {
          'my:hook': function (test, handler) {
            return function () {
              const res = Reflect.apply(handler, null, arguments);
              res.push('alter_1');
              return res;
            };
          },
        },
        name: 'my_plugin_1',
      });
      plugins.register({
        hooks: {
          'my:hook': function (test, handler) {
            return function () {
              const res = Reflect.apply(handler, null, arguments);
              res.push('alter_2');
              return res;
            };
          },
        },
        name: 'my_plugin_2',
      });
      const result = plugins.call_sync({
        args: ['origin'],
        handler: function (args: string[]): string[] {
          return args;
        },
        name: 'my:hook',
      });
      result.should.eql(['origin', 'alter_1', 'alter_2']);
    });
  });
});
