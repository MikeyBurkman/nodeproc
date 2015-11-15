var Processes = require('../index');
var path = require('path');
require('should');

var node = process.argv[0];
var successFile = 'success.js';
var failureFile = 'failure.js';

describe('Processes', function() {
  var processes = new Processes();
  
  it('Should handle a simple command string', function() {
    var file = path.resolve(__dirname, successFile);
    var command = node + ' ' + file;
    return processes.spawn(command).then(function(results) {
      results.should.have.property('exitCode', 0);
    });
  });
  
  if('Should handle a single argument string', function() {
    return processes.spawn({
      command: node,
      args: path.resolve(__dirname, successFile)
    }).then(function(results) {
      results.should.have.property('exitCode', 0);
    });
  });
  
  it('Should handle multiple arguments', function() {
    return processes.spawn({
      command: node,
      args: [path.resolve(__dirname, successFile), 'hello']
    }).then(function(results) {
      results.should.have.property('exitCode', 0);
    });
  });
  
  it('Should handle cwd', function() {
    return processes.spawn({
      command: node,
      args: 'success.js',
      cwd: __dirname
    }).then(function(results) {
      results.should.have.property('exitCode', 0);
    });
  });
  
  it('Should capture stdout', function() {
    var out = new StreamToString();
    return processes.spawn({
      command: node,
      args: [path.resolve(__dirname, successFile), 'hello'],
      stdout: out
    }).then(function(results) {
      results.should.have.property('exitCode', 0);
      out.str.should.eql('success hello');
    });
  });
  
  it('Should capture stderr', function() {
    var out = new StreamToString();
    return processes.spawn({
      command: node,
      args: [path.resolve(__dirname, successFile), 'hello'],
      stderr: out
    }).catch(function(err) {
      out.str.should.eql('error');
    });
  });
  
  it('Should handle a process that returns an error exit code', function() {
    return processes.spawn({
      command: node,
      args: path.resolve(__dirname, failureFile)
    }).then(function() {
      throw new Error('Did not fail like it should have')
    }).catch(function(err) {
      err.should.have.property('exitCode', 1);
      err.should.have.property('stderr', 'error');
    });
  });
  
  it('Should ignore the error status code if the correct argument is set', function() {
    var out = new StreamToString();
    return processes.spawn({
      command: node,
      args: [path.resolve(__dirname, failureFile)],
      ignoreExitCode: true,
      stderr: out // So we can capture it
    }).then(function(results) {
      results.should.have.property('exitCode', 1);
      out.str.should.eql('error');
    });
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