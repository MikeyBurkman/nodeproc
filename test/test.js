var Nodeproc = require('../index');
var path = require('path');
require('should');

var node = process.argv[0];
var successFile = 'scripts/success.js';
var failureFile = 'scripts/failure.js';
var longRunningFile = 'scripts/longRunning.js';

describe('Basic functionality', function() {
  var processes = new Nodeproc();
  
  it('Should handle a simple command string', function() {
    var command = buildCommand(successFile);
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
      args: successFile,
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
});

describe('Error handling functionality', function() {
  
  var processes = new Nodeproc();
  
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
      throw new Error('Did not fail like it should have');
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

describe('Process invalidation functionality', function() {
  
    it('Should kill other processes on error if configured to', function() {
      var processes = new Nodeproc({invalidateOnError: true});
      
      // Create a long running process, and then create another process that dies.
      // The long-running process should be killed
      
      var longRunning = processes.spawn(buildCommand(longRunningFile))
        .then(function() {
          throw new Error('Long running process should have been killed when the other process died');
        })
        .catch(function(err) {
          err.should.have.property('cancelled', true);
        });
      
      processes.spawn(buildCommand(failureFile)).catch(function() {
        // Expected
      });
      
      return longRunning;
      
    });
    
    it('Should not allow new processes to be created once invalidated', function() {
      var processes = new Nodeproc({invalidateOnError: true});
      
      return processes.spawn(buildCommand(failureFile))
        .catch(function() {
          // Expected
          
          return processes.spawn(buildCommand(successFile));
        })
        .then(function() {
          throw new Error('Should have gotten an error trying to spawn a new process after being invalidated')
        })
        .catch(function(err) {
          err.should.have.property('cancelled', true);
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

function buildCommand(scriptFile) {
  return node + ' ' + path.resolve(__dirname, scriptFile);
}