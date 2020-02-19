'use strict';

const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const sass = require('gulp-dart-sass');
const sassGlob = require('gulp-sass-glob');

// Compile sass into CSS & auto-inject into browsers
gulp.task('sass', function() {
  return gulp.src('./nfs-tree.scss')
    .pipe(sassGlob())
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./public'))
    .pipe(browserSync.stream());
});

gulp.task('serve', function() {
  browserSync.init({
    server: "./public"
  });

  gulp.watch("*.scss", gulp.series('sass'));
  gulp.watch("*.{html,js}").on('change', browserSync.reload);
});

gulp.task('default', gulp.series('serve'));