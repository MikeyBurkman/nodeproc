var Processes = require('../index');
var path = require('path');

// TODO: Mocha! Also, flesh out the tests more.

var processes = new Processes();

var node = process.argv[0];
var successFile = 'success.js';
var failureFile = 'failure.js';

// Test success
processes.spawn({
  command: node,
  args: [path.resolve(__dirname, successFile)]
}).then(function() {
  console.log('Finished basic args test');
});

processes.spawn({
  command: node,
  args: 'success.js',
  cwd: __dirname
}).then(function() {
  console.log('Finished with cwd test');
});

// Test failure
processes.spawn({
  command: node,
  args: path.resolve(__dirname, failureFile)
}).then(function() {
  throw new Error('Did not fail like it should have')
}).catch(function(err) {
  if (err.exitCode === 1) {
    console.log('Finished basic exit code failure test');
  } else {
    throw err;
  }
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