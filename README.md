# process
Simpler way to handle NodeJs processes

```js
var Processes = require('processes');

var processes = new Processes();

// Most basic use
processes.spawn('npm ls').then(function() {
  console.log('Finished');
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
process.spawn({
  command: 'npm',
  args: 'ls' // Can either be an array or a space-delimited string
  stdout: captureStdout
}).then(funnction() {
  console.log('Finished');
});

// Can ignore error exit status codes, and always resolve the process
process.spawn({
  command: 'npm',
  args: ['doesnotexit'],
  ignoreExitStatusCode: true
}).then(function() {
  console.log('Finished');
});

// More docs to come
```
