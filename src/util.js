'use strict';

const delay = function delay(timeout) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), timeout);
  });
};

module.exports = { delay };
