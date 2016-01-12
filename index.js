// Container used for spawning and managing external processes and wrapping them in promises.
// Will print out stdout and stderr automatically (will be configurable in the future)
// Keeps track of running processes and allows for easily killing them.
// Promises are bluebird promises and can be canclled to kill the process, but only if Bluebird was configured to enable cancelling

var child_process = require('child_process');
var util = require('util');
var Promise = require('bluebird');
  
module.exports = Processes;

function Processes() {

  // Mapping of pid -> process object -- so we can kill running processes on errors
  var runningProcs = {};

  this.spawn = function spawn(args) {
  
    if (typeof args === 'string') {
      var split = args.split(' ');
      args = {
        command: split[0],
        args: split.slice(1)
      };
    }
    
    var command = args.command;
    var commandArgs = args.args || [];
    if (typeof commandArgs === 'string') {
      commandArgs = commandArgs.split(' ');
    }
    
    var cwd = args.cwd;
    var env = args.env || process.env;
    var ignoreExitCode = args.ignoreExitCode;
    var procName = args.procName || command + commandArgs.join(' ');
    
    var stdin = args.stdin || 'ignore';
    var stdout = args.stdout || process.stdout;
    var stderr = args.stderr || process.stderr;
    
    var spawnArgs = {
      cwd: cwd,
      env: env,
      stdio: [stdin, 'pipe', 'pipe']
    };

    var proc = child_process.spawn(command, commandArgs, spawnArgs);
    
    var procPid = proc.pid;
    runningProcs[procPid] = proc;

    var stderrStr = ''; // Keep track of stderr output
    var cancelled = false;

    return new Promise(function(resolve, reject, onCancel) {
      proc.on('error', function(err) {
        reject(new ProcessError('Error running [' + procName + ']\n' + err, {
          procName: procName,
          procId: procPid,
          cause: err
        }));
      })
      .on('close', function(exitCode) {
        if (exitCode == 0 || ignoreExitCode) {
          resolve({
            exitCode: exitCode,
            procId: procPid
          });
        } else if (!cancelled) {
          reject(new ProcessError('Error running [' + procName + ']\n\tExit Code = ' + exitCode + '\n' + stderrStr, {
            procName: procName,
            exitCode: exitCode,
            procId: procPid,
            stderr: stderrStr
          }));
        }
      });
      
      proc.stdout.on('data', function(data, encoding) {
        // Make sure we don't keep sending data to stdout if we've "killed" this process already
        if (runningProcs[procPid]) {
          stdout.write(data, encoding);
        }
      });
      
      proc.stderr.on('data', function(data, encoding) {
        stderr.write(data, encoding);
        stderrStr += data.toString(encoding);
      });

      if (onCancel) {
        onCancel(function() {
          cancelled = true;
          delete runningProcs[procPid];
          proc.kill('SIGKILL');
        });
      }

    })
    .finally(function() {
      delete runningProcs[procPid];
    });
  }

  this.killRemaining = function killRemaining(signal) {
    signal = signal || 'SIGKILL';
    return new Promise(function(resolve) {
      Object.keys(runningProcs).forEach(function(procPid) {
        var proc = runningProcs[procPid];
        if (proc) {
          proc.kill(signal);
          delete runningProcs[procPid];
        }
      });
      resolve();
    });
  }
  
  this.spawnedPids = function() {
    return Object.keys(runningProcs);
  }
}

function ProcessError(message, data) {
  var self = this;
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  data = data || {};
  Object.keys(data).map(function(key) {
    self[key] = data[key];
  });
}
util.inherits(ProcessError, Error);

