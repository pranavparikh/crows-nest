const logic = require('./monitor.logic');

const retrieval = require('./active-tunnels-retrieval');
const shutdown = require('../shutdown');

jest.mock('./active-tunnels-retrieval');
jest.mock('../shutdown');

describe('monitor.logic', () => {
  beforeEach(jest.resetAllMocks);

  describe('heartBeatInterval', () => {
    test('should return undefined when the tunnel is still active', async () => {
      retrieval.getActiveTunnels.mockResolvedValue([123]);

      const tunnel = {
        connection: {
          tunnelId: 123,
        },
      };

      const result = await logic.heartBeatInterval(tunnel);
      expect(result).toBeUndefined();
    });

    test('should call shutdown once and return undefined', async () => {
      retrieval.getActiveTunnels.mockResolvedValue([123]);
      const mock = jest.fn();
      shutdown.mockImplementation(() => { mock(); });

      const tunnel = {
        connection: {
          tunnelId: 456,
          exitCode: 0,
        },
      };

      const result = await logic.heartBeatInterval(tunnel);
      expect(result).toBeUndefined();
      expect(mock).toBeCalled();
    });

    test('should call shutdown once, tunnel disconnect once and return undefined', async () => {
      retrieval.getActiveTunnels.mockResolvedValue([123]);
      const mock = jest.fn();
      shutdown.mockImplementation(() => { mock(); });

      const tunnel = {
        connection: {
          tunnelId: 456,
        },
        disconnect: jest.fn(),
      };

      const result = await logic.heartBeatInterval(tunnel);
      expect(result).toBeUndefined();
      expect(mock).toBeCalled();
      expect(tunnel.disconnect).toBeCalled();
    });

    test('should call shutdown when getting active tunnels throws an error', async () => {
      retrieval.getActiveTunnels.mockRejectedValue(new Error('Failed'));

      const mock = jest.fn();
      shutdown.mockImplementation(() => { mock(); });

      const result = await logic.heartBeatInterval();
      expect(result).toBeUndefined();
      expect(mock).toBeCalled();
    });
  });

  describe('restartInterval', () => {
    test('should call tunnel disconnect and shutdown', async () => {
      const mock = jest.fn();
      shutdown.mockImplementation(() => { mock(); });

      const tunnel = {
        disconnect: jest.fn(),
      };

      const result = await logic.restartInterval(tunnel);
      expect(result).toBeUndefined();
      expect(mock).toBeCalled();
      expect(tunnel.disconnect).toBeCalled();
    });

    test('should call and shutdown when tunnel disconnect throws an error', async () => {
      const mock = jest.fn();
      shutdown.mockImplementation(() => { mock(); });

      const tunnel = {
        disconnect: jest.fn().mockRejectedValue(new Error('Fail')),
      };

      const result = await logic.restartInterval(tunnel);
      expect(result).toBeUndefined();
      expect(mock).toBeCalled();
      expect(tunnel.disconnect).toBeCalled();
    });
  });
});
