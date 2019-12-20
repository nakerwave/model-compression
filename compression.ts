
'use strict';

import { gltfToGlb } from 'gltf-pipeline';
import * as obj2gltf from 'obj2gltf';
import * as gulp from 'gulp';
import imageminPngquant from 'imagemin-pngquant';
// import imageminPngquant from 'imagemin-pngquant';
import * as imageminMozJpeg from 'imagemin-mozjpeg';

import * as glob from 'glob';
import * as progress from 'progress-stream';
import * as imagemin from 'gulp-imagemin';
import * as fse from 'fs-extra';

export default class CompressionClass {
	/**
	 *
	 * @param {*} _src => source_file.gltf
	 * @param {*} _dest => dest_file.glb
	 * @param {*} _ressources => source folder
	 */
	convertGltfToGlb = (src, dest, ressources, callback) => {
        // Conversion can make the app crash so we add try to avoid that
        try {
            let gltf = fse.readJsonSync(src);
            gltfToGlb(gltf, { resourceDirectory: ressources }).then((results) => {
                fse.writeFileSync(dest, results.glb);
            }).then(() => {
                return callback();
            }).catch((err) => {
                console.log(err);
                return callback('Error compressing GLTF to GLB.');
            });
        } catch (e) {
            console.log(e);
            return callback('Error compressing GLTF to GLB.');
        }
	}

	/**
	 *
	 * @param {*} _src => source_file.obj
	 * @param {*} _dest => dest_file.glb
	 */
	converObjToGlb = (src, dest, ressources, callback) => {
        // Conversion can make the app crash so we add try to avoid that
        try {
            obj2gltf(src).then(function (gltf) {
                gltfToGlb(gltf, { resourceDirectory: ressources }).then((results) => {
                    fse.writeFileSync(dest, results.glb);
                }).then(() => {
                    return callback();
                }).catch((err) => {
                    console.log(err);
                    return callback('Error compressing GLTF to GLB.');
                });
            }).catch((err) => {
                console.log(err);
                return callback('Error compressing OBJ to GLTF.');
            });
        } catch(e) {
            console.log(e);
            return callback('Error compressing OBJ to GLB.');
        }
	}

	compressToGlb = (mainFile, returnedNameFile, callback) => {
		let ressources = mainFile.substring(0, mainFile.length - (mainFile.length - mainFile.lastIndexOf('/')));
		if (mainFile.indexOf('.obj') == mainFile.length - 4) {
			let dest = mainFile.substring(0, mainFile.length - 4) + '.glb';
			let returned = returnedNameFile.substring(0, returnedNameFile.length - 4) + '.glb';
			this.converObjToGlb(mainFile, dest, ressources, (err) => {
				if (err) return callback(err);
				callback(null, returned);
			});
		} else if (mainFile.indexOf('.gltf') == mainFile.length - 5) {
			let dest = mainFile.substring(0, mainFile.length - 5) + '.glb';
			let returned = returnedNameFile.substring(0, returnedNameFile.length - 5) + '.glb';
			this.convertGltfToGlb(mainFile, dest, ressources, (err) => {
				if (err) return callback(err);
				callback(null, returned);
			});
		} else {
			callback(null, returnedNameFile);
		}
	}

	/**
	 *
	 * @param {*} _src => src folder -> Adding \/** \/* in order to take every sub-directories into parameter
	 * @param {*} _dest => dest folder
	 */

	compressImages = (_src, _dest, callback) => {
		let src = _src + '/**/*.{jpg,jpeg,png}';
		let dest = _dest || 'dest';
		let folder_size = 0;

		let getDirectories = function (src, callback) {
			glob(src + '/**/*.{jpg,jpeg,png}', callback);
		};
		getDirectories(_src, function (err, res) {
			if (err) {
				console.log('Error', err);
			} else {
				folder_size = res.length;
			}
		});

		let progressStream = progress({
			length: folder_size,
			time: 100,
			objectMode: true
		});

		progressStream.on('progress', (stats) => {
			if (folder_size === 0) {
				console.log({ message: 'No textures to compress', percentage: 85 });
			} else {
				console.log({ message: 'Compressing textures ' + stats.transferred + '/' + folder_size, percentage: (Math.round((stats.transferred / folder_size) * 80) + 5) });
			}
		});

        return gulp.src([src])
            .pipe(imagemin([
                imageminPngquant({ quality: [0.35, 0.60] }),
                imageminMozJpeg({ quality: [35, 60] })
            ]))
            .pipe(progressStream).on('error', (err) => {
                callback(err);
            })
            .pipe(gulp.dest(dest)).on('end', callback)
	};
}