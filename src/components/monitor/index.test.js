const index = require('./index');
const logic = require('./monitor.logic');

jest.mock('node-schedule', () => ({
  scheduleJob: (val, callback) => callback(),
}));

jest.mock('./monitor.logic');

describe('monitor/index', () => {
  describe('heartbeat', () => {
    test('should call heartBeatInterval', () => {
      logic.heartBeatInterval = jest.fn();
      index.heartbeat({}, 123);
      expect(logic.heartBeatInterval).toBeCalledWith({});
    });
  });

  describe('restart', () => {
    test('should call restart', () => {
      logic.restartInterval = jest.fn();
      index.restart({}, 123);
      expect(logic.restartInterval).toBeCalledWith({});
    });
  });
});
