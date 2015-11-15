var Processes = require('../index');
var path = require('path');

var node = process.argv[0];
var successFile = 'success.js';
var failureFile = 'failure.js';

describe('Processes', function() {
  var processes = new Processes();
  
  it('Should handle basic arguments', function() {
    return processes.spawn({
      command: node,
      args: [path.resolve(__dirname, successFile)]
    })
  });
  
  it('Should handle cwd', function() {
    return processes.spawn({
      command: node,
      args: 'success.js',
      cwd: __dirname
    })
  });
  
  it('Should handle a process that returns an error exit code', function() {
    return processes.spawn({
      command: node,
      args: path.resolve(__dirname, failureFile)
    }).then(function() {
      throw new Error('Did not fail like it should have')
    }).catch(function(err) {
      if (err.exitCode !== 1) {
        throw err;
      }
    })
  });
  
});

// Use this as a stdout or stderr destination to record process output
function StreamToString() {
  this.str = '';
  this.write = function(data, encoding) {
      this.str += data.toString(encoding);
  };
  this.toString = function() {
    return this.str;
  };
}