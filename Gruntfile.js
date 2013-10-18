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
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('build', ['uglify']);
    grunt.registerTask('test', ['jshint']);
    grunt.registerTask('default', ['jshint', 'uglify']);

};