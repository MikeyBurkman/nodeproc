// Container used for spawning and managing external processes and wrapping them in promises.
// Will print out stdout and stderr automatically (will be configurable in the future)
// Keeps track of running processes and allows for easily killing them.
// Promises are bluebird promises and can be canclled to kill the process, but only if Bluebird was configured to enable cancelling

module.exports = Processes;

function Processes() {
  var child_process = require('child_process');
  var Promise = require('bluebird');

  // Mapping of pid -> process object -- so we can kill running processes on errors
  var runningProcs = {};

  this.spawn = function spawn(args) {
    var command = args.command;
    var commandArgs = args.commandArgs || [];
    var cwd = args.cwd;
    var ignoreExitStatusCode = args.ignoreExitStatusCode;
    var spawnArgs = args.spawnArgs || {
      cwd: cwd,
      env: process.env
    };
    
    spawnArgs.stdio = [process.stdin, 'pipe', 'pipe'] // Pipe stdout and stderr so we can handle those separately
    var procName = args.procName || command + commandArgs.join(' ');

    var proc = child_process.spawn(command, commandArgs, spawnArgs);
    var procPid = proc.pid;
    runningProcs[procPid] = proc;

    var stderr = ''; // Keep track of stderr output

    return new Promise(function(resolve, reject, onCancel) {
      proc.on('error', function(err) {
        reject(new Error({
          procName: procName,
          error: err,
          toString: function() {
            return 'Error running [' + this.procName + ']\n' + this.error;
          }
        }));
      })
      .on('close', function(exitCode) {
        if (exitCode == 0 || ignoreExitStatusCode) {
          resolve(exitCode);
        } else {
          //var errMsg = 'Error running [' + procName + ']\n\tExit Code = ' + exitCode + '\n' + stderr;
          reject(new Error({
            procName: procName,
            exitCode: exitCode,
            stderr: stderr,
            toString: function() {
              return 'Error running [' + this.procName + ']\n\tExit Code = ' + this.exitCode + '\n' + this.stderr;
            }
          }));
        }
      });
      
      proc.stdout.on('data', function(data, encoding) {
        // Make sure we don't keep sending data to stdout if we've "killed" this process already
        if (runningProcs[procPid]) {
          process.stdout.write(data, encoding);
        }
      });
      
      proc.stderr.on('data', function(data, encoding) {
        process.stderr.write(data, encoding);
        stderr += data.toString(encoding);
      });

      if (onCancel) {
        onCancel(function() {
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
}
