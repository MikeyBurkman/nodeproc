// Container used for spawning and managing external processes and wrapping them in promises.
// Will print out stdout and stderr automatically (can be configured)
// Keeps track of running processes and allows for easily killing them via the cancel() method.

var childProcess = require('child_process');
var util = require('util');
var Promise = require('promise');

module.exports = Nodeproc;

function Nodeproc(args) {

	args = args || {};

	// Whether this instance becomes invalid when an individual process hits an error
	var invalidateOnError = args.invalidateOnError;

	// Mapping of pid -> promise for spawned process -- so we can kill running processes on errors
	var runningProcs = {};

	var invalid = false; // If invalid, this instance can no longer spawn new processes

	var nodeproc = this;

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

		if (invalid) {
			var err = new ProcessError('Nodeproc instance has been invalidated, cannot spawn new process', {
				invalidated: true,
				procName: procName
			});

			return Promise.reject(err);
		}

		var stdin = args.stdin || 'ignore';
		var stdout = args.stdout || process.stdout;
		var stderr = args.stderr || process.stderr;

		var spawnArgs = {
			cwd: cwd,
			env: env,
			stdio: [stdin, 'pipe', 'pipe']
		};

		var proc = childProcess.spawn(command, commandArgs, spawnArgs);

		var procPid = proc.pid;

		var stderrStr = ''; // Keep track of stderr output
		var cancelled = false;

		var promise = new Promise(function(resolve, reject) {
				proc.on('error', function(err) {
						reject(new ProcessError('Error running [' + procName + ']\n' + err, {
							procName: procName,
							procId: procPid,
							cause: err
						}));

						if (invalidateOnError) {
							nodeproc.invalidate();
						}
					})
					.on('close', function(exitCode) {
						if (exitCode === 0 || ignoreExitCode) {
							// Happy path!
							resolve({
								exitCode: exitCode,
								procId: procPid
							});

						} else if (cancelled) {
							// Note: don't invalidate on cancel
							reject(new ProcessError('Process was cancelled: [' + procName + ']', {
								procName: procName,
								cancelled: true
							}));

						} else {
							reject(new ProcessError('Error running [' + procName + ']\n\tExit Code = ' + exitCode + '\n' + stderrStr, {
								procName: procName,
								exitCode: exitCode,
								procId: procPid,
								stderr: stderrStr
							}));

							if (invalidateOnError) {
								nodeproc.invalidate();
							}
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

			})
			.finally(function() {
				delete runningProcs[procPid];
			});

		runningProcs[procPid] = promise;

		promise.cancel = function() {
			cancelled = true;
			proc.kill('SIGKILL');
		};

		promise.procPid = procPid;
		promise.procName = procName;

		return promise;
	};

	this.invalidate = function() {
		invalid = true;
		return nodeproc.killRemaining();
	};

	this.killRemaining = function killRemaining() {
		Object.keys(runningProcs).forEach(function(procPid) {
			var proc = runningProcs[procPid];
			if (proc) {
				proc.cancel();
			}
		});

		return Promise.resolve();
	};

	this.running = function() {
		var res = {};
		Object.keys(runningProcs).forEach(function(procPid) {
			var proc = runningProcs[procPid];
			if (proc) {
				res[procPid] = proc.procName;
			}
		});
		return res;
	};
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