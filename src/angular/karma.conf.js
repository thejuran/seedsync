// Karma configuration file, see link for more information
// https://karma-runner.github.io/2.0/config/configuration-file.html

// Fix for Node 18+ where Error objects have inspect method that Karma can't serialize
// Patch util.inspect.custom symbol on Error prototype to return actual error message
const util = require('util');
if (util.inspect.custom) {
    Error.prototype[util.inspect.custom] = function() {
        return this.stack || this.message || this.toString();
    };
}

module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', '@angular/cli'],
        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-jasmine-html-reporter'),
            require('karma-coverage-istanbul-reporter'),
            require('@angular/cli/plugins/karma'),
            require('karma-mocha-reporter')
        ],
        client: {
            clearContext: false, // leave Jasmine Spec Runner output visible in browser
            captureConsole: false
        },
        coverageIstanbulReporter: {
            reports: ['html', 'lcovonly'],
            fixWebpackSourcePaths: true
        },
        angularCli: {
            environment: 'dev'
        },
        reporters: ['mocha', 'kjhtml'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_DEBUG,
        autoWatch: true,
        browsers: ['Chrome'],
        singleRun: false,

        // Timeout settings for CI/Docker environments
        browserDisconnectTimeout: 10000,
        browserDisconnectTolerance: 3,
        browserNoActivityTimeout: 60000,
        captureTimeout: 60000,

        customLaunchers: {
            ChromeHeadless: {
                base: 'Chrome',
                flags: [
                    '--headless',
                    '--disable-gpu',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--remote-debugging-port=9222'
                ]
            }
        },
        mochaReporter: {
            output: 'full'
        }
    });
};
