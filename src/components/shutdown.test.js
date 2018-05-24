const shutdown = require('./shutdown');

describe('shutdown', () => {
  test('should call exit with value 1', () => {
    const proc = {
      exit: jest.fn(),
    };

    shutdown(proc);
    expect(proc.exit).toBeCalledWith(1);
  });
});
