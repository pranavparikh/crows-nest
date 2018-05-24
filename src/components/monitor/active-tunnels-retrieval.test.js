const fs = require('fs');

const retrieval = require('./active-tunnels-retrieval');

jest.mock('fs');

describe('active-tunnels-retrieval', () => {
  beforeEach(jest.resetAllMocks);
  
  describe('getActiveTunnels', () => {
    test('should retrieve tunnels', async () => {
      fs.readFile.mockImplementation((file, encoding, callback) =>
        callback(null, JSON.stringify([1, 2])));
      const tunnels = await retrieval.getActiveTunnels();
      expect(tunnels).toEqual([1, 2]);
    });

    test('should retrieve an empty array when no data is found', async () => {
      fs.readFile.mockImplementation((file, encoding, callback) => callback(null, JSON.stringify('')));
      const tunnels = await retrieval.getActiveTunnels();
      expect(tunnels).toEqual([]);
    });

    test('should retrieve an empty array when the retrieved data can not be parsed', async () => {
      fs.readFile.mockImplementation((file, encoding, callback) => callback(null, [1, 2]));
      const tunnels = await retrieval.getActiveTunnels();
      expect(tunnels).toEqual([]);
    });
  });
});
