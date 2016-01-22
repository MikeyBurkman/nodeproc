# nodeproc
Simpler way to handle spawning processes in NodeJs

[![Dependency Status](https://david-dm.org/MikeyBurkman/nodeproc.svg)](https://david-dm.org/MikeyBurkman/nodeproc)

```js
var Nodeproc = require('nodeproc');

var processes = new Nodeproc();

// Most basic use
processes.spawn('npm ls').then(function(results) {
  console.log('Finished');
  console.log('Process ID: ', results.procId);
  console.log('Exit code: ', results.exitCode);
});

// Slightly more complicated
processes.spawn({
  command: 'npm',
  args: ['ls'],
  cwd: '/home/joe' // Specify where the command should be run from
}).then(function() {
  console.log('Finished');
});

// Control stdout and/or stderr from the process.
// These can be anything that supports the write(data, encoding) method.
// These default to process.stdout and process.stderr respectively
var captureStdout = {
  write: function(data, encoding) {
    console.log('Got data: ', data.toString(encoding));
  }
};
processes.spawn({
  command: 'npm',
  args: 'ls' // Can either be an array or a space-delimited string
  stdout: captureStdout
}).then(funnction() {
  console.log('Finished');
});

// Catch errors using a Promise catch function
processes.spawn({
  command: 'npm',
  args: ['doesnotexit'],
  ignoreExitCode: true
}).catch(function(err) {
  console.log('Got error! ', err);
  console.log('Process ID: ', err.procId);
  console.log('Exit code: ', err.exitCode);
  console.log('Stderr: ', err.stderr);
});

// Can ignore error exit status codes, and always resolve the process
processes.spawn({
  command: 'npm',
  args: ['doesnotexit'],
  ignoreExitStatusCode: true
}).then(function() {
  console.log('Finished');
});

```

See the tests for more examples
