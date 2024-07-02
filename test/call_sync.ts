// @ts-nocheck
import 'should';
import { plugandplay } from '../lib/index.ts';

describe('plugandplay.call_sync', () => {
  describe('api', () => {
    it('no aguments', async () => {
      let count = 0;
      const plugins = plugandplay();
      plugins.register({
        name: 'my_plugin',
        hooks: {
          'my:hook': (args) => {
            count++;
            return;
          },
        },
      });
      await plugins.call_sync({
        name: 'my:hook',
        handler: () => {},
        args: {},
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
        name: 'my_plugin',
        hooks: {
          'my:hook': function (test) {
            // Alter `test` with `a_key`
            test.a_key = 'a value';
            return;
          },
        },
      });
      const test = {} as Test;
      plugins.call_sync({
        name: 'my:hook',
        args: test,
        handler: function () {},
      });
      test.a_key.should.eql('a value');
    });

    it('synch handler with handler argument', function () {
      interface Test {
        a_key: string;
      }
      const plugins = plugandplay();
      plugins.register({
        name: 'my_plugin',
        hooks: {
          'my:hook': function (test, handler) {
            test.a_key = 'a value';
            return handler;
          },
        },
      });
      const test = {} as Test;
      plugins.call_sync({
        name: 'my:hook',
        args: test,
        handler: function () {},
      });
      test.a_key.should.eql('a value');
    });
  });

  describe('stop with null', function () {
    it('when `null` is returned, sync mode', function () {
      const plugins = plugandplay();
      plugins.register({
        name: 'my_plugin_1',
        hooks: {
          'my:hook': function (ar, handler) {
            ar.push('hook 1');
            return handler;
          },
        },
      });
      plugins.register({
        name: 'my_plugin_2',
        hooks: {
          'my:hook': function (ar, handler) {
            // eslint-disable-line
            ar.push('hook 2');
            return null;
          },
        },
      });
      plugins.register({
        name: 'my_plugin_3',
        hooks: {
          'my:hook': function (ar, handler) {
            ar.push('hook 3');
            return handler;
          },
        },
      });
      plugins.register({
        name: 'my_plugin_4',
        hooks: {
          'my:hook': function (ar, handler) {
            ar.push('hook 4');
            return handler;
          },
        },
      });
      const ar: string[] = [];
      plugins.call_sync({
        name: 'my:hook',
        args: ar,
        handler: function (ar) {
          return ar.push('origin');
        },
      });
      ar.should.eql(['hook 1', 'hook 2']);
    });
  });

  return describe('alter result', function () {
    it('sync', function () {
      const plugins = plugandplay();
      plugins.register({
        name: 'my_plugin_1',
        hooks: {
          'my:hook': function (test, handler) {
            return function () {
              let res = handler.apply(null, arguments);
              res.push('alter_1');
              return res;
            };
          },
        },
      });
      plugins.register({
        name: 'my_plugin_2',
        hooks: {
          'my:hook': function (test, handler) {
            return function () {
              let res = handler.apply(null, arguments);
              res.push('alter_2');
              return res;
            };
          },
        },
      });
      const result = plugins.call_sync({
        name: 'my:hook',
        args: ['origin'],
        handler: function (args: string[]): string[] {
          return args;
        },
      });
      result.should.eql(['origin', 'alter_1', 'alter_2']);
    });
  });
});
