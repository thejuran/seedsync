// Karma configuration file, see link for more information
// https://karma-runner.github.io/2.0/config/configuration-file.html

module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', '@angular/cli'],
        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-jasmine-html-reporter'),
            require('karma-coverage'),
            require('@angular/cli/plugins/karma'),
            require('karma-spec-reporter')
        ],
        client: {
            clearContext: false, // leave Jasmine Spec Runner output visible in browser
            captureConsole: false
        },
        coverageReporter: {
            type: 'html',
            dir: 'coverage/'
        },
        angularCli: {
            environment: 'dev'
        },
        reporters: ['spec', 'kjhtml'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ['Chrome'],
        singleRun: false,

        customLaunchers: {
            ChromeHeadless: {
                base: 'Chrome',
                flags: [
                    '--headless=new',
                    '--disable-gpu',
                    '--remote-debugging-port=9222',
                    '--no-sandbox',
                    '--disable-dev-shm-usage'
                ]
            },
            ChromeHeadlessCI: {
                base: 'Chrome',
                flags: [
                    '--headless=new',
                    '--disable-gpu',
                    '--remote-debugging-port=9222',
                    '--no-sandbox',
                    '--disable-dev-shm-usage'
                ]
            }
        }
    });
};
