process.stdout.write('Running long');

setTimeout(function() {
	process.stdout.write('Finished long running');
	process.exit(0);
}, 1900);