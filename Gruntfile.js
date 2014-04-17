module.exports = function(grunt) {

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            all: 'modules/Snapshot.js',
            options: {
                jshintrc: '.jshintrc'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> by <%= pkg.author %> created on <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: ['modules/Snapshot.js'],
                dest: 'dist/<%= pkg.buildName %>.min.js'
            }
        },
        copy: {
            main: {
                files: [
                    { flatten: true, src: ['modules/Snapshot.js'], dest: 'dist/snapshot.js' }
                ]
            }
        },
        rename: {
            main: {
                files: [
                    { src: ['dist/Snapshot.js'], dest: 'dist/<%= pkg.buildName %>.js' }
                ]
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['tests/*.js']
            }
        },
        ngconstant: {
            options: {
                space: '  ',
                wrap: '(function() {\n\n"use strict";\n\n {%= __ngModule %} }());',
                name: 'config'
            },
            development: {
                options: {
                    dest: 'example/client/js/environment.js'
                },
                constants: {
                    ENV: {
                        name: 'development',
                        socketEndpoint: 'http://localhost:3001/'
                    }
                }
            },
            production: {
                options: {
                    dest: 'example/client/js/environment.js'
                },
                constants: {
                    ENV: {
                        name: 'production',
                        socketEndpoint: 'http://node-snapshot.herokuapp.com/'
                    }
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-ng-constant');

    grunt.registerTask('build', ['ngconstant:development', 'copy', 'uglify']);
    grunt.registerTask('build:development', ['ngconstant:development', 'copy', 'uglify']);
    grunt.registerTask('build:production', ['ngconstant:production', 'copy', 'uglify']);
    grunt.registerTask('test', ['mochaTest', 'jshint']);
    grunt.registerTask('default', ['mochaTest', 'jshint', 'copy', 'uglify']);

};