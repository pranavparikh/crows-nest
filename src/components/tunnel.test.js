const sauceConnectLauncher = require('sauce-connect-launcher');

const Tunnel = require('./tunnel');

jest.mock('sauce-connect-launcher');

describe('tunnel', () => {
  describe('connect', () => {
    test('should connect to tunnel', async () => {
      const tunnel = new Tunnel({});

      sauceConnectLauncher.mockImplementation((config, callback) => {
        callback(null, {
          on: jest.fn(),
        });
      });

      const result = await tunnel.connect();
      expect(result).toBeUndefined();
    });

    test('should throw an error connect to tunnel', async () => {
      const tunnel = new Tunnel({});

      sauceConnectLauncher.mockImplementation((config, callback) => {
        callback(new Error('Fail'));
      });

      try {
        await tunnel.connect();
        fail('Should have failed');
      } catch (error) {
        expect(error).toEqual(new Error('Fail'));
      }
    });
  });

  describe('disconnect', () => {
    test('should return undefined', async () => {
      const tunnel = new Tunnel({});

      sauceConnectLauncher.mockImplementation((config, callback) => {
        callback(null, {
          on: jest.fn(),
          tunnelId: 123,
          close: cb => cb(),
        });
      });

      try {
        await tunnel.connect();
        const result = await tunnel.disconnect();
        expect(result).toBeUndefined();
      } catch (error) {
        fail(error);
      }
    });

    test('should throw error', async () => {
      const tunnel = new Tunnel({});

      sauceConnectLauncher.mockImplementation((config, callback) => {
        callback(null, {
          on: jest.fn(),
          tunnelId: 123,
          close: cb => cb(new Error('Failed')),
        });
      });

      try {
        await tunnel.connect();
        await tunnel.disconnect();
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toEqual(new Error('Failed'));
      }
    });
  });
});
