var gulp = require('gulp');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var watch = require('gulp-watch');

gulp.task('default', function() {
//    gulp.src(['**/*.ts', '!node_modules/**/*.ts', '!route_plotter/**/*.ts'])
    return gulp.src(['src/**/*.js'])
//        .pipe(changed('.', {extension: '.js'}))
        .pipe(sourcemaps.init())
//        .pipe(typescript({
//            target: 'ES6',
//            module: 'commonjs',
//            noEmitOnError: true,
//        }))
        .pipe(babel({
            presets: ['es2015', 'stage-3'],
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist'));
});


var process, processPromise, nextTask = () => null;

gulp.task('serve', ['default'], function() {
    var currentTask;
    console.warn('Restarting child process!');

    // run this task only when the previous promise has resolved
    currentTask = () => {
        console.warn('Starting child process!');
        var child_process = require('child_process')
            .spawn('node', ['index.js'], {
                detached: true 
            });
        var resolve;

        var p = new Promise(r => resolve = r);

        child_process.stdout.on('data', (data) => {
            console.log(data.toString());
        });
        child_process.stderr.on('data', (data) => {
            console.log(data.toString());
        });

        child_process.on('close', (code, signal) => {
            console.log(`Closed with code ${code} ${signal}`);
        });
        child_process.on('exit', (code) => {
            console.log(`Exited with code ${code}`);
            resolve();
        });

        child_process.on('error', (code) => {
            console.log(`Error with code ${code}`);
        });

        process = child_process;
        processPromise = p.then(() => {
            console.log('Process terminated');
            if (nextTask) {
                console.log('Starting next');
                nextTask();
                nextTask = null;
            }
            else {
                console.log('Waiting for changes to restart');
                processPromise = null;
                process = null;
            }
        })
        .then(null, err => console.log(err));
    };

    nextTask = currentTask;

    // process is not defined,
    if (processPromise) {
        if (process) {
            console.log('Killing process!');
            process.kill("SIGINT"); // kill the process only once...
            process.kill("SIGTERM"); // kill the process only once...
            process = null;
        }
        console.log('Waiting for process to terminate!');
    }
    else {
        nextTask();
    }
    return;
});


gulp.task('watch', ['serve'], function() {
    watch(['src/**/*.js'], {readDelay: 1000},
        () => gulp.start('serve'));
});

