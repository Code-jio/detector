// import * as THREE from "three";

// const DRACOLoader = function (manager) {
//   this.timeLoaded = 0;
//   this.manager = manager || THREE.DefaultLoadingManager;
//   this.materials = null;
//   this.verbosity = 0;
//   this.attributeOptions = {};
//   this.drawMode = THREE.TrianglesDrawMode;
//   // Native Draco attribute type to Three.JS attribute type.
//   this.nativeAttributeMap = {
//     position: "POSITION",
//     normal: "NORMAL",
//     color: "COLOR",
//     uv: "TEX_COORD",
//   };
// };

// DRACOLoader.prototype = {
//   constructor: DRACOLoader,

//   load: function (url, onLoad, onProgress, onError) {
//     let scope = this;
//     let loader = new THREE.FileLoader(scope.manager);
//     loader.setPath(this.path);
//     loader.setResponseType("arraybuffer");
//     loader.load(
//       url,
//       function (blob) {
//         scope.decodeDracoFile(blob, onLoad);
//       },
//       onProgress,
//       onError
//     );
//   },

//   setPath: function (value) {
//     this.path = value;
//     return this;
//   },

//   setVerbosity: function (level) {
//     this.verbosity = level;
//     return this;
//   },

//   /**
//    *  Sets desired mode for generated geometry indices.
//    *  Can be either:
//    *      THREE.TrianglesDrawMode
//    *      THREE.TriangleStripDrawMode
//    */
//   setDrawMode: function (drawMode) {
//     this.drawMode = drawMode;
//     return this;
//   },

//   /**
//    * Skips dequantization for a specific attribute.
//    * |attributeName| is the THREE.js name of the given attribute type.
//    * The only currently supported |attributeName| is 'position', more may be
//    * added in future.
//    */
//   setSkipDequantization: function (attributeName, skip) {
//     let skipDequantization = true;
//     if (typeof skip !== "undefined") skipDequantization = skip;
//     this.getAttributeOptions(attributeName).skipDequantization =
//       skipDequantization;
//     return this;
//   },

//   /**
//    * Decompresses a Draco buffer. Names of attributes (for ID and type maps)
//    * must be one of the supported three.js types, including: position, color,
//    * normal, uv, uv2, skinIndex, skinWeight.
//    *
//    * @param {ArrayBuffer} rawBuffer
//    * @param {Function} callback
//    * @param {Object|undefined} attributeUniqueIdMap Provides a pre-defined ID
//    *     for each attribute in the geometry to be decoded. If given,
//    *     `attributeTypeMap` is required and `nativeAttributeMap` will be
//    *     ignored.
//    * @param {Object|undefined} attributeTypeMap Provides a predefined data
//    *     type (as a typed array constructor) for each attribute in the
//    *     geometry to be decoded.
//    */
//   decodeDracoFile: function (
//     rawBuffer,
//     callback,
//     attributeUniqueIdMap,
//     attributeTypeMap
//   ) {
//     let scope = this;
//     DRACOLoader.getDecoderModule().then(function (module) {
//       scope.decodeDracoFileInternal(
//         rawBuffer,
//         module.decoder,
//         callback,
//         attributeUniqueIdMap,
//         attributeTypeMap
//       );
//     });
//   },

//   decodeDracoFileInternal: function (
//     rawBuffer,
//     dracoDecoder,
//     callback,
//     attributeUniqueIdMap,
//     attributeTypeMap
//   ) {
//     /*
//      * Here is how to use Draco Javascript decoder and get the geometry.
//      */
//     let buffer = new dracoDecoder.DecoderBuffer();
//     buffer.Init(new Int8Array(rawBuffer), rawBuffer.byteLength);
//     let decoder = new dracoDecoder.Decoder();

//     /*
//      * Determine what type is this file: mesh or point cloud.
//      */
//     let geometryType = decoder.GetEncodedGeometryType(buffer);
//     if (geometryType == dracoDecoder.TRIANGULAR_MESH) {
//       if (this.verbosity > 0) {
//         console.log("Loaded a mesh.");
//       }
//     } else if (geometryType == dracoDecoder.POINT_CLOUD) {
//       if (this.verbosity > 0) {
//         console.log("Loaded a point cloud.");
//       }
//     } else {
//       let errorMsg = "DRACOLoader: Unknown geometry type.";
//       console.error(errorMsg);
//       throw new Error(errorMsg);
//     }
//     callback(
//       this.convertDracoGeometryTo3JS(
//         dracoDecoder,
//         decoder,
//         geometryType,
//         buffer,
//         attributeUniqueIdMap,
//         attributeTypeMap
//       )
//     );
//   },

//   addAttributeToGeometry: function (
//     dracoDecoder,
//     decoder,
//     dracoGeometry,
//     attributeName,
//     attributeType,
//     attribute,
//     geometry,
//     geometryBuffer
//   ) {
//     if (attribute.ptr === 0) {
//       let errorMsg = "DRACOLoader: No attribute " + attributeName;
//       console.error(errorMsg);
//       throw new Error(errorMsg);
//     }

//     let numComponents = attribute.num_components();
//     let numPoints = dracoGeometry.num_points();
//     let numValues = numPoints * numComponents;
//     let attributeData;
//     let TypedBufferAttribute;

//     switch (attributeType) {
//       case Float32Array:
//         attributeData = new dracoDecoder.DracoFloat32Array();
//         decoder.GetAttributeFloatForAllPoints(
//           dracoGeometry,
//           attribute,
//           attributeData
//         );
//         geometryBuffer[attributeName] = new Float32Array(numValues);
//         TypedBufferAttribute = THREE.Float32BufferAttribute;
//         break;

//       case Int8Array:
//         attributeData = new dracoDecoder.DracoInt8Array();
//         decoder.GetAttributeInt8ForAllPoints(
//           dracoGeometry,
//           attribute,
//           attributeData
//         );
//         geometryBuffer[attributeName] = new Int8Array(numValues);
//         TypedBufferAttribute = THREE.Int8BufferAttribute;
//         break;

//       case Int16Array:
//         attributeData = new dracoDecoder.DracoInt16Array();
//         decoder.GetAttributeInt16ForAllPoints(
//           dracoGeometry,
//           attribute,
//           attributeData
//         );
//         geometryBuffer[attributeName] = new Int16Array(numValues);
//         TypedBufferAttribute = THREE.Int16BufferAttribute;
//         break;

//       case Int32Array:
//         attributeData = new dracoDecoder.DracoInt32Array();
//         decoder.GetAttributeInt32ForAllPoints(
//           dracoGeometry,
//           attribute,
//           attributeData
//         );
//         geometryBuffer[attributeName] = new Int32Array(numValues);
//         TypedBufferAttribute = THREE.Int32BufferAttribute;
//         break;

//       case Uint8Array:
//         attributeData = new dracoDecoder.DracoUInt8Array();
//         decoder.GetAttributeUInt8ForAllPoints(
//           dracoGeometry,
//           attribute,
//           attributeData
//         );
//         geometryBuffer[attributeName] = new Uint8Array(numValues);
//         TypedBufferAttribute = THREE.Uint8BufferAttribute;
//         break;

//       case Uint16Array:
//         attributeData = new dracoDecoder.DracoUInt16Array();
//         decoder.GetAttributeUInt16ForAllPoints(
//           dracoGeometry,
//           attribute,
//           attributeData
//         );
//         geometryBuffer[attributeName] = new Uint16Array(numValues);
//         TypedBufferAttribute = THREE.Uint16BufferAttribute;
//         break;

//       case Uint32Array:
//         attributeData = new dracoDecoder.DracoUInt32Array();
//         decoder.GetAttributeUInt32ForAllPoints(
//           dracoGeometry,
//           attribute,
//           attributeData
//         );
//         geometryBuffer[attributeName] = new Uint32Array(numValues);
//         TypedBufferAttribute = THREE.Uint32BufferAttribute;
//         break;

//       default:
//         let errorMsg = "DRACOLoader: Unexpected attribute type.";
//         console.error(errorMsg);
//         throw new Error(errorMsg);
//     }

//     // Copy data from decoder.
//     for (let i = 0; i < numValues; i++) {
//       geometryBuffer[attributeName][i] = attributeData.GetValue(i);
//     }
//     // Add attribute to THREEJS geometry for rendering.
//     geometry.addAttribute(
//       attributeName,
//       new TypedBufferAttribute(geometryBuffer[attributeName], numComponents)
//     );
//     dracoDecoder.destroy(attributeData);
//   },

//   convertDracoGeometryTo3JS: function (
//     dracoDecoder,
//     decoder,
//     geometryType,
//     buffer,
//     attributeUniqueIdMap,
//     attributeTypeMap
//   ) {
//     // TODO: Should not assume native Draco attribute IDs apply.
//     if (this.getAttributeOptions("position").skipDequantization === true) {
//       decoder.SkipAttributeTransform(dracoDecoder.POSITION);
//     }
//     let dracoGeometry;
//     let decodingStatus;
//     let start_time = performance.now();
//     if (geometryType === dracoDecoder.TRIANGULAR_MESH) {
//       dracoGeometry = new dracoDecoder.Mesh();
//       decodingStatus = decoder.DecodeBufferToMesh(buffer, dracoGeometry);
//     } else {
//       dracoGeometry = new dracoDecoder.PointCloud();
//       decodingStatus = decoder.DecodeBufferToPointCloud(buffer, dracoGeometry);
//     }
//     if (!decodingStatus.ok() || dracoGeometry.ptr == 0) {
//       let errorMsg = "DRACOLoader: Decoding failed: ";
//       errorMsg += decodingStatus.error_msg();
//       console.error(errorMsg);
//       dracoDecoder.destroy(decoder);
//       dracoDecoder.destroy(dracoGeometry);
//       throw new Error(errorMsg);
//     }

//     let decode_end = performance.now();
//     dracoDecoder.destroy(buffer);
//     /*
//      * Example on how to retrieve mesh and attributes.
//      */
//     let numFaces;
//     if (geometryType == dracoDecoder.TRIANGULAR_MESH) {
//       numFaces = dracoGeometry.num_faces();
//       if (this.verbosity > 0) {
//         console.log("Number of faces loaded: " + numFaces.toString());
//       }
//     } else {
//       numFaces = 0;
//     }

//     let numPoints = dracoGeometry.num_points();
//     let numAttributes = dracoGeometry.num_attributes();
//     if (this.verbosity > 0) {
//       console.log("Number of points loaded: " + numPoints.toString());
//       console.log("Number of attributes loaded: " + numAttributes.toString());
//     }

//     // Verify if there is position attribute.
//     // TODO: Should not assume native Draco attribute IDs apply.
//     let posAttId = decoder.GetAttributeId(dracoGeometry, dracoDecoder.POSITION);
//     if (posAttId == -1) {
//       let errorMsg = "DRACOLoader: No position attribute found.";
//       console.error(errorMsg);
//       dracoDecoder.destroy(decoder);
//       dracoDecoder.destroy(dracoGeometry);
//       throw new Error(errorMsg);
//     }
//     let posAttribute = decoder.GetAttribute(dracoGeometry, posAttId);

//     // Structure for converting to THREEJS geometry later.
//     let geometryBuffer = {};
//     // Import data to Three JS geometry.
//     let geometry = new THREE.BufferGeometry();

//     // Do not use both the native attribute map and a provided (e.g. glTF) map.
//     if (attributeUniqueIdMap) {
//       // Add attributes of user specified unique id. E.g. GLTF models.
//       for (let attributeName in attributeUniqueIdMap) {
//         let attributeType = attributeTypeMap[attributeName];
//         let attributeId = attributeUniqueIdMap[attributeName];
//         var attribute = decoder.GetAttributeByUniqueId(
//           dracoGeometry,
//           attributeId
//         );
//         this.addAttributeToGeometry(
//           dracoDecoder,
//           decoder,
//           dracoGeometry,
//           attributeName,
//           attributeType,
//           attribute,
//           geometry,
//           geometryBuffer
//         );
//       }
//     } else {
//       // Add native Draco attribute type to geometry.
//       for (let attributeName in this.nativeAttributeMap) {
//         var attId = decoder.GetAttributeId(
//           dracoGeometry,
//           dracoDecoder[this.nativeAttributeMap[attributeName]]
//         );
//         if (attId !== -1) {
//           if (this.verbosity > 0) {
//             console.log("Loaded " + attributeName + " attribute.");
//           }
//           let attribute = decoder.GetAttribute(dracoGeometry, attId);
//           this.addAttributeToGeometry(
//             dracoDecoder,
//             decoder,
//             dracoGeometry,
//             attributeName,
//             Float32Array,
//             attribute,
//             geometry,
//             geometryBuffer
//           );
//         }
//       }
//     }

//     // For mesh, we need to generate the faces.
//     if (geometryType == dracoDecoder.TRIANGULAR_MESH) {
//       if (this.drawMode === THREE.TriangleStripDrawMode) {
//         var stripsArray = new dracoDecoder.DracoInt32Array();
//         var numStrips = decoder.GetTriangleStripsFromMesh(
//           dracoGeometry,
//           stripsArray
//         );
//         geometryBuffer.indices = new Uint32Array(stripsArray.size());
//         for (var i = 0; i < stripsArray.size(); ++i) {
//           geometryBuffer.indices[i] = stripsArray.GetValue(i);
//         }
//         dracoDecoder.destroy(stripsArray);
//       } else {
//         var numIndices = numFaces * 3;
//         geometryBuffer.indices = new Uint32Array(numIndices);
//         var ia = new dracoDecoder.DracoInt32Array();
//         for (let i = 0; i < numFaces; ++i) {
//           decoder.GetFaceFromMesh(dracoGeometry, i, ia);
//           var index = i * 3;
//           geometryBuffer.indices[index] = ia.GetValue(0);
//           geometryBuffer.indices[index + 1] = ia.GetValue(1);
//           geometryBuffer.indices[index + 2] = ia.GetValue(2);
//         }
//         dracoDecoder.destroy(ia);
//       }
//     }

//     geometry.drawMode = this.drawMode;
//     if (geometryType == dracoDecoder.TRIANGULAR_MESH) {
//       geometry.setIndex(
//         new (geometryBuffer.indices.length > 65535
//           ? THREE.Uint32BufferAttribute
//           : THREE.Uint16BufferAttribute)(geometryBuffer.indices, 1)
//       );
//     }

//     // TODO: Should not assume native Draco attribute IDs apply.
//     // TODO: Can other attribute types be quantized?
//     var posTransform = new dracoDecoder.AttributeQuantizationTransform();
//     if (posTransform.InitFromAttribute(posAttribute)) {
//       // Quantized attribute. Store the quantization parameters into the
//       // THREE.js attribute.
//       geometry.attributes["position"].isQuantized = true;
//       geometry.attributes["position"].maxRange = posTransform.range();
//       geometry.attributes["position"].numQuantizationBits =
//         posTransform.quantization_bits();
//       geometry.attributes["position"].minValues = new Float32Array(3);
//       for (let i = 0; i < 3; ++i) {
//         geometry.attributes["position"].minValues[i] =
//           posTransform.min_value(i);
//       }
//     }
//     dracoDecoder.destroy(posTransform);
//     dracoDecoder.destroy(decoder);
//     dracoDecoder.destroy(dracoGeometry);

//     this.decode_time = decode_end - start_time;
//     this.import_time = performance.now() - decode_end;

//     if (this.verbosity > 0) {
//       console.log("Decode time: " + this.decode_time);
//       console.log("Import time: " + this.import_time);
//     }
//     return geometry;
//   },

//   isVersionSupported: function (version, callback) {
//     DRACOLoader.getDecoderModule().then(function (module) {
//       callback(module.decoder.isVersionSupported(version));
//     });
//   },

//   getAttributeOptions: function (attributeName) {
//     if (typeof this.attributeOptions[attributeName] === "undefined")
//       this.attributeOptions[attributeName] = {};
//     return this.attributeOptions[attributeName];
//   },
// };

// DRACOLoader.decoderPath = "./";
// DRACOLoader.decoderConfig = {};
// DRACOLoader.decoderModulePromise = null;

// /**
//  * Sets the base path for decoder source files.
//  * @param {string} path
//  */
// DRACOLoader.setDecoderPath = function (path) {
//   DRACOLoader.decoderPath = path;
// };

// /**
//  * Sets decoder configuration and releases singleton decoder module. Module
//  * will be recreated with the next decoding call.
//  * @param {Object} config
//  */
// DRACOLoader.setDecoderConfig = function (config) {
//   var wasmBinary = DRACOLoader.decoderConfig.wasmBinary;
//   DRACOLoader.decoderConfig = config || {};
//   DRACOLoader.releaseDecoderModule();

//   // Reuse WASM binary.
//   if (wasmBinary) DRACOLoader.decoderConfig.wasmBinary = wasmBinary;
// };

// /**
//  * Releases the singleton DracoDecoderModule instance. Module will be recreated
//  * with the next decoding call.
//  */
// DRACOLoader.releaseDecoderModule = function () {
//   DRACOLoader.decoderModulePromise = null;
// };

// /**
//  * Gets WebAssembly or asm.js singleton instance of DracoDecoderModule
//  * after testing for browser support. Returns Promise that resolves when
//  * module is available.
//  * @return {Promise<{decoder: DracoDecoderModule}>}
//  */
// DRACOLoader.getDecoderModule = function () {
//   var scope = this;
//   var path = DRACOLoader.decoderPath;
//   var config = DRACOLoader.decoderConfig;
//   var promise = DRACOLoader.decoderModulePromise;

//   if (promise) return promise;

//   // Load source files.
//   if (typeof DracoDecoderModule !== "undefined") {
//     // Loaded externally.
//     promise = Promise.resolve();
//   } else if (typeof WebAssembly !== "object" || config.type === "js") {
//     // Load with asm.js.
//     promise = DRACOLoader._loadScript(path + "draco_decoder.js");
//   } else {
//     // Load with WebAssembly.
//     config.wasmBinaryFile = path + "draco_decoder.wasm";
//     promise = DRACOLoader._loadScript(path + "draco_wasm_wrapper.js")
//       .then(function () {
//         return DRACOLoader._loadArrayBuffer(config.wasmBinaryFile);
//       })
//       .then(function (wasmBinary) {
//         config.wasmBinary = wasmBinary;
//       });
//   }

//   // Wait for source files, then create and return a decoder.
//   promise = promise.then(function () {
//     return new Promise(function (resolve) {
//       config.onModuleLoaded = function (decoder) {
//         scope.timeLoaded = performance.now();
//         // Module is Promise-like. Wrap before resolving to avoid loop.
//         resolve({ decoder: decoder });
//       };
//       DracoDecoderModule(config);
//     });
//   });

//   DRACOLoader.decoderModulePromise = promise;
//   return promise;
// };

// /**
//  * @param {string} src
//  * @return {Promise}
//  */
// DRACOLoader._loadScript = function (src) {
//   var prevScript = document.getElementById("decoder_script");
//   if (prevScript !== null) {
//     prevScript.parentNode.removeChild(prevScript);
//   }
//   var head = document.getElementsByTagName("head")[0];
//   var script = document.createElement("script");
//   script.id = "decoder_script";
//   script.type = "text/javascript";
//   script.src = src;
//   return new Promise(function (resolve) {
//     script.onload = resolve;
//     head.appendChild(script);
//   });
// };

// /**
//  * @param {string} src
//  * @return {Promise}
//  */
// DRACOLoader._loadArrayBuffer = function (src) {
//   var loader = new THREE.FileLoader();
//   loader.setResponseType("arraybuffer");
//   return new Promise(function (resolve, reject) {
//     loader.load(src, resolve, undefined, reject);
//   });
// };

// export default DRACOLoader;

// import {
// 	BufferAttribute,
// 	BufferGeometry,
// 	FileLoader,
// 	Loader
// } from 'three';

// const _taskCache = new WeakMap();

// class DRACOLoader extends Loader {

// 	constructor( manager ) {

// 		super( manager );

// 		this.decoderPath = '';
// 		this.decoderConfig = {};
// 		this.decoderBinary = null;
// 		this.decoderPending = null;

// 		this.workerLimit = 4;
// 		this.workerPool = [];
// 		this.workerNextTaskID = 1;
// 		this.workerSourceURL = '';

// 		this.defaultAttributeIDs = {
// 			position: 'POSITION',
// 			normal: 'NORMAL',
// 			color: 'COLOR',
// 			uv: 'TEX_COORD'
// 		};
// 		this.defaultAttributeTypes = {
// 			position: 'Float32Array',
// 			normal: 'Float32Array',
// 			color: 'Float32Array',
// 			uv: 'Float32Array'
// 		};

// 	}

// 	setDecoderPath( path ) {

// 		this.decoderPath = path;

// 		return this;

// 	}

// 	setDecoderConfig( config ) {

// 		this.decoderConfig = config;

// 		return this;

// 	}

// 	setWorkerLimit( workerLimit ) {

// 		this.workerLimit = workerLimit;

// 		return this;

// 	}

// 	load( url, onLoad, onProgress, onError ) {

// 		const loader = new FileLoader( this.manager );

// 		loader.setPath( this.path );
// 		loader.setResponseType( 'arraybuffer' );
// 		loader.setRequestHeader( this.requestHeader );
// 		loader.setWithCredentials( this.withCredentials );

// 		loader.load( url, ( buffer ) => {

// 			const taskConfig = {
// 				attributeIDs: this.defaultAttributeIDs,
// 				attributeTypes: this.defaultAttributeTypes,
// 				useUniqueIDs: false
// 			};

// 			this.decodeGeometry( buffer, taskConfig )
// 				.then( onLoad )
// 				.catch( onError );

// 		}, onProgress, onError );

// 	}

// 	/** @deprecated Kept for backward-compatibility with previous DRACOLoader versions. */
// 	decodeDracoFile( buffer, callback, attributeIDs, attributeTypes ) {

// 		const taskConfig = {
// 			attributeIDs: attributeIDs || this.defaultAttributeIDs,
// 			attributeTypes: attributeTypes || this.defaultAttributeTypes,
// 			useUniqueIDs: !! attributeIDs
// 		};

// 		this.decodeGeometry( buffer, taskConfig ).then( callback );

// 	}

// 	decodeGeometry( buffer, taskConfig ) {

// 		// TODO: For backward-compatibility, support 'attributeTypes' objects containing
// 		// references (rather than names) to typed array constructors. These must be
// 		// serialized before sending them to the worker.
// 		for ( const attribute in taskConfig.attributeTypes ) {

// 			const type = taskConfig.attributeTypes[ attribute ];

// 			if ( type.BYTES_PER_ELEMENT !== undefined ) {

// 				taskConfig.attributeTypes[ attribute ] = type.name;

// 			}

// 		}

// 		//

// 		const taskKey = JSON.stringify( taskConfig );

// 		// Check for an existing task using this buffer. A transferred buffer cannot be transferred
// 		// again from this thread.
// 		if ( _taskCache.has( buffer ) ) {

// 			const cachedTask = _taskCache.get( buffer );

// 			if ( cachedTask.key === taskKey ) {

// 				return cachedTask.promise;

// 			} else if ( buffer.byteLength === 0 ) {

// 				// Technically, it would be possible to wait for the previous task to complete,
// 				// transfer the buffer back, and decode again with the second configuration. That
// 				// is complex, and I don't know of any reason to decode a Draco buffer twice in
// 				// different ways, so this is left unimplemented.
// 				throw new Error(

// 					'THREE.DRACOLoader: Unable to re-decode a buffer with different ' +
// 					'settings. Buffer has already been transferred.'

// 				);

// 			}

// 		}

// 		//

// 		let worker;
// 		const taskID = this.workerNextTaskID ++;
// 		const taskCost = buffer.byteLength;

// 		// Obtain a worker and assign a task, and construct a geometry instance
// 		// when the task completes.
// 		const geometryPending = this._getWorker( taskID, taskCost )
// 			.then( ( _worker ) => {

// 				worker = _worker;

// 				return new Promise( ( resolve, reject ) => {

// 					worker._callbacks[ taskID ] = { resolve, reject };

// 					worker.postMessage( { type: 'decode', id: taskID, taskConfig, buffer }, [ buffer ] );

// 					// this.debug();

// 				} );

// 			} )
// 			.then( ( message ) => this._createGeometry( message.geometry ) );

// 		// Remove task from the task list.
// 		// Note: replaced '.finally()' with '.catch().then()' block - iOS 11 support (#19416)
// 		geometryPending
// 			.catch( () => true )
// 			.then( () => {

// 				if ( worker && taskID ) {

// 					this._releaseTask( worker, taskID );

// 					// this.debug();

// 				}

// 			} );

// 		// Cache the task result.
// 		_taskCache.set( buffer, {

// 			key: taskKey,
// 			promise: geometryPending

// 		} );

// 		return geometryPending;

// 	}

// 	_createGeometry( geometryData ) {

// 		const geometry = new BufferGeometry();

// 		if ( geometryData.index ) {

// 			geometry.setIndex( new BufferAttribute( geometryData.index.array, 1 ) );

// 		}

// 		for ( let i = 0; i < geometryData.attributes.length; i ++ ) {

// 			const attribute = geometryData.attributes[ i ];
// 			const name = attribute.name;
// 			const array = attribute.array;
// 			const itemSize = attribute.itemSize;

// 			geometry.setAttribute( name, new BufferAttribute( array, itemSize ) );

// 		}

// 		return geometry;

// 	}

// 	_loadLibrary( url, responseType ) {

// 		const loader = new FileLoader( this.manager );
// 		loader.setPath( this.decoderPath );
// 		loader.setResponseType( responseType );
// 		loader.setWithCredentials( this.withCredentials );

// 		return new Promise( ( resolve, reject ) => {

// 			loader.load( url, resolve, undefined, reject );

// 		} );

// 	}

// 	preload() {

// 		this._initDecoder();

// 		return this;

// 	}

// 	_initDecoder() {

// 		if ( this.decoderPending ) return this.decoderPending;

// 		const useJS = typeof WebAssembly !== 'object' || this.decoderConfig.type === 'js';
// 		const librariesPending = [];

// 		if ( useJS ) {

// 			librariesPending.push( this._loadLibrary( 'draco_decoder.js', 'text' ) );

// 		} else {

// 			librariesPending.push( this._loadLibrary( 'draco_wasm_wrapper.js', 'text' ) );
// 			librariesPending.push( this._loadLibrary( 'draco_decoder.wasm', 'arraybuffer' ) );

// 		}

// 		this.decoderPending = Promise.all( librariesPending )
// 			.then( ( libraries ) => {

// 				const jsContent = libraries[ 0 ];

// 				if ( ! useJS ) {

// 					this.decoderConfig.wasmBinary = libraries[ 1 ];

// 				}

// 				const fn = DRACOWorker.toString();

// 				const body = [
// 					'/* draco decoder */',
// 					jsContent,
// 					'',
// 					'/* worker */',
// 					fn.substring( fn.indexOf( '{' ) + 1, fn.lastIndexOf( '}' ) )
// 				].join( '\n' );

// 				this.workerSourceURL = URL.createObjectURL( new Blob( [ body ] ) );

// 			} );

// 		return this.decoderPending;

// 	}

// 	_getWorker( taskID, taskCost ) {

// 		return this._initDecoder().then( () => {

// 			if ( this.workerPool.length < this.workerLimit ) {

// 				const worker = new Worker( this.workerSourceURL );

// 				worker._callbacks = {};
// 				worker._taskCosts = {};
// 				worker._taskLoad = 0;

// 				worker.postMessage( { type: 'init', decoderConfig: this.decoderConfig } );

// 				worker.onmessage = function ( e ) {

// 					const message = e.data;

// 					switch ( message.type ) {

// 						case 'decode':
// 							worker._callbacks[ message.id ].resolve( message );
// 							break;

// 						case 'error':
// 							worker._callbacks[ message.id ].reject( message );
// 							break;

// 						default:
// 							console.error( 'THREE.DRACOLoader: Unexpected message, "' + message.type + '"' );

// 					}

// 				};

// 				this.workerPool.push( worker );

// 			} else {

// 				this.workerPool.sort( function ( a, b ) {

// 					return a._taskLoad > b._taskLoad ? - 1 : 1;

// 				} );

// 			}

// 			const worker = this.workerPool[ this.workerPool.length - 1 ];
// 			worker._taskCosts[ taskID ] = taskCost;
// 			worker._taskLoad += taskCost;
// 			return worker;

// 		} );

// 	}

// 	_releaseTask( worker, taskID ) {

// 		worker._taskLoad -= worker._taskCosts[ taskID ];
// 		delete worker._callbacks[ taskID ];
// 		delete worker._taskCosts[ taskID ];

// 	}

// 	debug() {

// 		console.log( 'Task load: ', this.workerPool.map( ( worker ) => worker._taskLoad ) );

// 	}

// 	dispose() {

// 		for ( let i = 0; i < this.workerPool.length; ++ i ) {

// 			this.workerPool[ i ].terminate();

// 		}

// 		this.workerPool.length = 0;

// 		return this;

// 	}

// }

// /* WEB WORKER */

// function DRACOWorker() {

// 	let decoderConfig;
// 	let decoderPending;

// 	onmessage = function ( e ) {

// 		const message = e.data;

// 		switch ( message.type ) {

// 			case 'init':
// 				decoderConfig = message.decoderConfig;
// 				decoderPending = new Promise( function ( resolve/*, reject*/ ) {

// 					decoderConfig.onModuleLoaded = function ( draco ) {

// 						// Module is Promise-like. Wrap before resolving to avoid loop.
// 						resolve( { draco: draco } );

// 					};

// 					DracoDecoderModule( decoderConfig ); // eslint-disable-line no-undef

// 				} );
// 				break;

// 			case 'decode':
// 				const buffer = message.buffer;
// 				const taskConfig = message.taskConfig;
// 				decoderPending.then( ( module ) => {

// 					const draco = module.draco;
// 					const decoder = new draco.Decoder();
// 					const decoderBuffer = new draco.DecoderBuffer();
// 					decoderBuffer.Init( new Int8Array( buffer ), buffer.byteLength );

// 					try {

// 						const geometry = decodeGeometry( draco, decoder, decoderBuffer, taskConfig );

// 						const buffers = geometry.attributes.map( ( attr ) => attr.array.buffer );

// 						if ( geometry.index ) buffers.push( geometry.index.array.buffer );

// 						self.postMessage( { type: 'decode', id: message.id, geometry }, buffers );

// 					} catch ( error ) {

// 						console.error( error );

// 						self.postMessage( { type: 'error', id: message.id, error: error.message } );

// 					} finally {

// 						draco.destroy( decoderBuffer );
// 						draco.destroy( decoder );

// 					}

// 				} );
// 				break;

// 		}

// 	};

// 	function decodeGeometry( draco, decoder, decoderBuffer, taskConfig ) {

// 		const attributeIDs = taskConfig.attributeIDs;
// 		const attributeTypes = taskConfig.attributeTypes;

// 		let dracoGeometry;
// 		let decodingStatus;

// 		const geometryType = decoder.GetEncodedGeometryType( decoderBuffer );

// 		if ( geometryType === draco.TRIANGULAR_MESH ) {

// 			dracoGeometry = new draco.Mesh();
// 			decodingStatus = decoder.DecodeBufferToMesh( decoderBuffer, dracoGeometry );

// 		} else if ( geometryType === draco.POINT_CLOUD ) {

// 			dracoGeometry = new draco.PointCloud();
// 			decodingStatus = decoder.DecodeBufferToPointCloud( decoderBuffer, dracoGeometry );

// 		} else {

// 			throw new Error( 'THREE.DRACOLoader: Unexpected geometry type.' );

// 		}

// 		if ( ! decodingStatus.ok() || dracoGeometry.ptr === 0 ) {

// 			throw new Error( 'THREE.DRACOLoader: Decoding failed: ' + decodingStatus.error_msg() );

// 		}

// 		const geometry = { index: null, attributes: [] };

// 		// Gather all vertex attributes.
// 		for ( const attributeName in attributeIDs ) {

// 			const attributeType = self[ attributeTypes[ attributeName ] ];

// 			let attribute;
// 			let attributeID;

// 			// A Draco file may be created with default vertex attributes, whose attribute IDs
// 			// are mapped 1:1 from their semantic name (POSITION, NORMAL, ...). Alternatively,
// 			// a Draco file may contain a custom set of attributes, identified by known unique
// 			// IDs. glTF files always do the latter, and `.drc` files typically do the former.
// 			if ( taskConfig.useUniqueIDs ) {

// 				attributeID = attributeIDs[ attributeName ];
// 				attribute = decoder.GetAttributeByUniqueId( dracoGeometry, attributeID );

// 			} else {

// 				attributeID = decoder.GetAttributeId( dracoGeometry, draco[ attributeIDs[ attributeName ] ] );

// 				if ( attributeID === - 1 ) continue;

// 				attribute = decoder.GetAttribute( dracoGeometry, attributeID );

// 			}

// 			geometry.attributes.push( decodeAttribute( draco, decoder, dracoGeometry, attributeName, attributeType, attribute ) );

// 		}

// 		// Add index.
// 		if ( geometryType === draco.TRIANGULAR_MESH ) {

// 			geometry.index = decodeIndex( draco, decoder, dracoGeometry );

// 		}

// 		draco.destroy( dracoGeometry );

// 		return geometry;

// 	}

// 	function decodeIndex( draco, decoder, dracoGeometry ) {

// 		const numFaces = dracoGeometry.num_faces();
// 		const numIndices = numFaces * 3;
// 		const byteLength = numIndices * 4;

// 		const ptr = draco._malloc( byteLength );
// 		decoder.GetTrianglesUInt32Array( dracoGeometry, byteLength, ptr );
// 		const index = new Uint32Array( draco.HEAPF32.buffer, ptr, numIndices ).slice();
// 		draco._free( ptr );

// 		return { array: index, itemSize: 1 };

// 	}

// 	function decodeAttribute( draco, decoder, dracoGeometry, attributeName, attributeType, attribute ) {

// 		const numComponents = attribute.num_components();
// 		const numPoints = dracoGeometry.num_points();
// 		const numValues = numPoints * numComponents;
// 		const byteLength = numValues * attributeType.BYTES_PER_ELEMENT;
// 		const dataType = getDracoDataType( draco, attributeType );

// 		const ptr = draco._malloc( byteLength );
// 		decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, dataType, byteLength, ptr );
// 		const array = new attributeType( draco.HEAPF32.buffer, ptr, numValues ).slice();
// 		draco._free( ptr );

// 		return {
// 			name: attributeName,
// 			array: array,
// 			itemSize: numComponents
// 		};

// 	}

// 	function getDracoDataType( draco, attributeType ) {

// 		switch ( attributeType ) {

// 			case Float32Array: return draco.DT_FLOAT32;
// 			case Int8Array: return draco.DT_INT8;
// 			case Int16Array: return draco.DT_INT16;
// 			case Int32Array: return draco.DT_INT32;
// 			case Uint8Array: return draco.DT_UINT8;
// 			case Uint16Array: return draco.DT_UINT16;
// 			case Uint32Array: return draco.DT_UINT32;

// 		}

// 	}

// }

// export { DRACOLoader };


// Copyright 2016 The Draco Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict';

import {
	DefaultLoadingManager,
	TrianglesDrawMode,
	FileLoader,
	Float32BufferAttribute,
	Int8BufferAttribute,
	Int16BufferAttribute,
	Int32BufferAttribute,
	Uint8BufferAttribute,
	Uint16BufferAttribute,
	Uint32BufferAttribute,
	BufferGeometry,
	TriangleStripDrawMode
} from 'three';

/**
 * @param {LoadingManager} manager
 */
var DRACOLoader = function(manager) {
    this.timeLoaded = 0;
    this.manager = manager || DefaultLoadingManager;
    this.materials = null;
    this.verbosity = 0;
    this.attributeOptions = {};
    this.drawMode = TrianglesDrawMode;
    // Native Draco attribute type to Three.JS attribute type.
    this.nativeAttributeMap = {
      'position' : 'POSITION',
      'normal' : 'NORMAL',
      'color' : 'COLOR',
      'uv' : 'TEX_COORD'
    };
};

DRACOLoader.prototype = {

    constructor: DRACOLoader,

    load: function(url, onLoad, onProgress, onError) {
        var scope = this;
        var loader = new FileLoader(scope.manager);
        loader.setPath(this.path);
        loader.setResponseType('arraybuffer');
        loader.load(url, function(blob) {
            scope.decodeDracoFile(blob, onLoad);
        }, onProgress, onError);
    },

    setPath: function(value) {
        this.path = value;
        return this;
    },

    setVerbosity: function(level) {
        this.verbosity = level;
        return this;
    },

    /**
     *  Sets desired mode for generated geometry indices.
     *  Can be either:
     *      THREE.TrianglesDrawMode
     *      THREE.TriangleStripDrawMode
     */
    setDrawMode: function(drawMode) {
        this.drawMode = drawMode;
        return this;
    },

    /**
     * Skips dequantization for a specific attribute.
     * |attributeName| is the THREE.js name of the given attribute type.
     * The only currently supported |attributeName| is 'position', more may be
     * added in future.
     */
    setSkipDequantization: function(attributeName, skip) {
        var skipDequantization = true;
        if (typeof skip !== 'undefined')
          skipDequantization = skip;
        this.getAttributeOptions(attributeName).skipDequantization =
            skipDequantization;
        return this;
    },

    /**
     * Decompresses a Draco buffer. Names of attributes (for ID and type maps)
     * must be one of the supported three.js types, including: position, color,
     * normal, uv, uv2, skinIndex, skinWeight.
     *
     * @param {ArrayBuffer} rawBuffer
     * @param {Function} callback
     * @param {Object|undefined} attributeUniqueIdMap Provides a pre-defined ID
     *     for each attribute in the geometry to be decoded. If given,
     *     `attributeTypeMap` is required and `nativeAttributeMap` will be
     *     ignored.
     * @param {Object|undefined} attributeTypeMap Provides a predefined data
     *     type (as a typed array constructor) for each attribute in the
     *     geometry to be decoded.
     */
    decodeDracoFile: function(rawBuffer, callback, attributeUniqueIdMap,
                              attributeTypeMap) {
      var scope = this;
      DRACOLoader.getDecoderModule()
          .then( function ( module ) {
            scope.decodeDracoFileInternal( rawBuffer, module.decoder, callback,
              attributeUniqueIdMap, attributeTypeMap);
          });
    },

    decodeDracoFileInternal: function(rawBuffer, dracoDecoder, callback,
                                      attributeUniqueIdMap, attributeTypeMap) {
      /*
       * Here is how to use Draco Javascript decoder and get the geometry.
       */
      var buffer = new dracoDecoder.DecoderBuffer();
      buffer.Init(new Int8Array(rawBuffer), rawBuffer.byteLength);
      var decoder = new dracoDecoder.Decoder();

      /*
       * Determine what type is this file: mesh or point cloud.
       */
      var geometryType = decoder.GetEncodedGeometryType(buffer);
      if (geometryType == dracoDecoder.TRIANGULAR_MESH) {
        if (this.verbosity > 0) {
          console.log('Loaded a mesh.');
        }
      } else if (geometryType == dracoDecoder.POINT_CLOUD) {
        if (this.verbosity > 0) {
          console.log('Loaded a point cloud.');
        }
      } else {
        var errorMsg = 'THREE.DRACOLoader: Unknown geometry type.';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      callback(this.convertDracoGeometryTo3JS(dracoDecoder, decoder,
          geometryType, buffer, attributeUniqueIdMap, attributeTypeMap));
    },

    addAttributeToGeometry: function(dracoDecoder, decoder, dracoGeometry,
                                     attributeName, attributeType, attribute,
                                     geometry, geometryBuffer) {
      if (attribute.ptr === 0) {
        var errorMsg = 'THREE.DRACOLoader: No attribute ' + attributeName;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      var numComponents = attribute.num_components();
      var numPoints = dracoGeometry.num_points();
      var numValues = numPoints * numComponents;
      var attributeData;
      var TypedBufferAttribute;

      switch ( attributeType ) {

        case Float32Array:
          attributeData = new dracoDecoder.DracoFloat32Array();
          decoder.GetAttributeFloatForAllPoints(
            dracoGeometry, attribute, attributeData);
          geometryBuffer[ attributeName ] = new Float32Array( numValues );
          TypedBufferAttribute = Float32BufferAttribute;
          break;

        case Int8Array:
          attributeData = new dracoDecoder.DracoInt8Array();
          decoder.GetAttributeInt8ForAllPoints(
            dracoGeometry, attribute, attributeData );
          geometryBuffer[ attributeName ] = new Int8Array( numValues );
          TypedBufferAttribute = Int8BufferAttribute;
          break;

        case Int16Array:
          attributeData = new dracoDecoder.DracoInt16Array();
          decoder.GetAttributeInt16ForAllPoints(
            dracoGeometry, attribute, attributeData);
          geometryBuffer[ attributeName ] = new Int16Array( numValues );
          TypedBufferAttribute = Int16BufferAttribute;
          break;

        case Int32Array:
          attributeData = new dracoDecoder.DracoInt32Array();
          decoder.GetAttributeInt32ForAllPoints(
            dracoGeometry, attribute, attributeData);
          geometryBuffer[ attributeName ] = new Int32Array( numValues );
          TypedBufferAttribute = Int32BufferAttribute;
          break;

        case Uint8Array:
          attributeData = new dracoDecoder.DracoUInt8Array();
          decoder.GetAttributeUInt8ForAllPoints(
            dracoGeometry, attribute, attributeData);
          geometryBuffer[ attributeName ] = new Uint8Array( numValues );
          TypedBufferAttribute = Uint8BufferAttribute;
          break;

        case Uint16Array:
          attributeData = new dracoDecoder.DracoUInt16Array();
          decoder.GetAttributeUInt16ForAllPoints(
            dracoGeometry, attribute, attributeData);
          geometryBuffer[ attributeName ] = new Uint16Array( numValues );
          TypedBufferAttribute = Uint16BufferAttribute;
          break;

        case Uint32Array:
          attributeData = new dracoDecoder.DracoUInt32Array();
          decoder.GetAttributeUInt32ForAllPoints(
            dracoGeometry, attribute, attributeData);
          geometryBuffer[ attributeName ] = new Uint32Array( numValues );
          TypedBufferAttribute = Uint32BufferAttribute;
          break;

        default:
          let errorMsg = 'THREE.DRACOLoader: Unexpected attribute type.';
          console.error( errorMsg );
          throw new Error( errorMsg );

      }

      // Copy data from decoder.
      for (let i = 0; i < numValues; i++) {
        geometryBuffer[attributeName][i] = attributeData.GetValue(i);
      }
      // Add attribute to THREEJS geometry for rendering.
      geometry.addAttribute(attributeName,
          new TypedBufferAttribute(geometryBuffer[attributeName],
            numComponents));
      dracoDecoder.destroy(attributeData);
    },

    convertDracoGeometryTo3JS: function(dracoDecoder, decoder, geometryType,
                                        buffer, attributeUniqueIdMap,
                                        attributeTypeMap) {
        // TODO: Should not assume native Draco attribute IDs apply.
        if (this.getAttributeOptions('position').skipDequantization === true) {
          decoder.SkipAttributeTransform(dracoDecoder.POSITION);
        }
        var dracoGeometry;
        var decodingStatus;
        var start_time = performance.now();
        if (geometryType === dracoDecoder.TRIANGULAR_MESH) {
          dracoGeometry = new dracoDecoder.Mesh();
          decodingStatus = decoder.DecodeBufferToMesh(buffer, dracoGeometry);
        } else {
          dracoGeometry = new dracoDecoder.PointCloud();
          decodingStatus =
              decoder.DecodeBufferToPointCloud(buffer, dracoGeometry);
        }
        if (!decodingStatus.ok() || dracoGeometry.ptr == 0) {
          var errorMsg = 'THREE.DRACOLoader: Decoding failed: ';
          errorMsg += decodingStatus.error_msg();
          console.error(errorMsg);
          dracoDecoder.destroy(decoder);
          dracoDecoder.destroy(dracoGeometry);
          throw new Error(errorMsg);
        }

        var decode_end = performance.now();
        dracoDecoder.destroy(buffer);
        /*
         * Example on how to retrieve mesh and attributes.
         */
        var numFaces;
        if (geometryType == dracoDecoder.TRIANGULAR_MESH) {
          numFaces = dracoGeometry.num_faces();
          if (this.verbosity > 0) {
            console.log('Number of faces loaded: ' + numFaces.toString());
          }
        } else {
          numFaces = 0;
        }

        var numPoints = dracoGeometry.num_points();
        var numAttributes = dracoGeometry.num_attributes();
        if (this.verbosity > 0) {
          console.log('Number of points loaded: ' + numPoints.toString());
          console.log('Number of attributes loaded: ' +
              numAttributes.toString());
        }

        // Verify if there is position attribute.
        // TODO: Should not assume native Draco attribute IDs apply.
        var posAttId = decoder.GetAttributeId(dracoGeometry,
                                              dracoDecoder.POSITION);
        if (posAttId == -1) {
          let errorMsg = 'THREE.DRACOLoader: No position attribute found.';
          console.error(errorMsg);
          dracoDecoder.destroy(decoder);
          dracoDecoder.destroy(dracoGeometry);
          throw new Error(errorMsg);
        }
        var posAttribute = decoder.GetAttribute(dracoGeometry, posAttId);

        // Structure for converting to THREEJS geometry later.
        var geometryBuffer = {};
        // Import data to Three JS geometry.
        var geometry = new BufferGeometry();

        // Do not use both the native attribute map and a provided (e.g. glTF) map.
        if ( attributeUniqueIdMap ) {

          // Add attributes of user specified unique id. E.g. GLTF models.
          for (var attributeName in attributeUniqueIdMap) {
            var attributeType = attributeTypeMap[attributeName];
            var attributeId = attributeUniqueIdMap[attributeName];
            var attribute = decoder.GetAttributeByUniqueId(dracoGeometry,
                                                           attributeId);
            this.addAttributeToGeometry(dracoDecoder, decoder, dracoGeometry,
                attributeName, attributeType, attribute, geometry, geometryBuffer);
          }

        } else {

          // Add native Draco attribute type to geometry.
          for (let attributeName in this.nativeAttributeMap) {
            var attId = decoder.GetAttributeId(dracoGeometry,
                dracoDecoder[this.nativeAttributeMap[attributeName]]);
            if (attId !== -1) {
              if (this.verbosity > 0) {
                console.log('Loaded ' + attributeName + ' attribute.');
              }
              let attribute = decoder.GetAttribute(dracoGeometry, attId);
              this.addAttributeToGeometry(dracoDecoder, decoder, dracoGeometry,
                  attributeName, Float32Array, attribute, geometry, geometryBuffer);
            }
          }

        }

        // For mesh, we need to generate the faces.
        if (geometryType == dracoDecoder.TRIANGULAR_MESH) {
          if (this.drawMode === TriangleStripDrawMode) {
            var stripsArray = new dracoDecoder.DracoInt32Array();
            var numStrips = decoder.GetTriangleStripsFromMesh(
                dracoGeometry, stripsArray);
            geometryBuffer.indices = new Uint32Array(stripsArray.size());
            for (var i = 0; i < stripsArray.size(); ++i) {
              geometryBuffer.indices[i] = stripsArray.GetValue(i);
            }
            dracoDecoder.destroy(stripsArray);
          } else {
            var numIndices = numFaces * 3;
            geometryBuffer.indices = new Uint32Array(numIndices);
            var ia = new dracoDecoder.DracoInt32Array();
            for (let i = 0; i < numFaces; ++i) {
              decoder.GetFaceFromMesh(dracoGeometry, i, ia);
              var index = i * 3;
              geometryBuffer.indices[index] = ia.GetValue(0);
              geometryBuffer.indices[index + 1] = ia.GetValue(1);
              geometryBuffer.indices[index + 2] = ia.GetValue(2);
            }
            dracoDecoder.destroy(ia);
         }
        }

        geometry.drawMode = this.drawMode;
        if (geometryType == dracoDecoder.TRIANGULAR_MESH) {
          geometry.setIndex(new(geometryBuffer.indices.length > 65535 ?
                Uint32BufferAttribute : Uint16BufferAttribute)
              (geometryBuffer.indices, 1));
        }

        // TODO: Should not assume native Draco attribute IDs apply.
        // TODO: Can other attribute types be quantized?
        var posTransform = new dracoDecoder.AttributeQuantizationTransform();
        if (posTransform.InitFromAttribute(posAttribute)) {
          // Quantized attribute. Store the quantization parameters into the
          // THREE.js attribute.
          geometry.attributes['position'].isQuantized = true;
          geometry.attributes['position'].maxRange = posTransform.range();
          geometry.attributes['position'].numQuantizationBits =
              posTransform.quantization_bits();
          geometry.attributes['position'].minValues = new Float32Array(3);
          for (let i = 0; i < 3; ++i) {
            geometry.attributes['position'].minValues[i] =
                posTransform.min_value(i);
          }
        }
        dracoDecoder.destroy(posTransform);
        dracoDecoder.destroy(decoder);
        dracoDecoder.destroy(dracoGeometry);

        this.decode_time = decode_end - start_time;
        this.import_time = performance.now() - decode_end;

        if (this.verbosity > 0) {
          console.log('Decode time: ' + this.decode_time);
          console.log('Import time: ' + this.import_time);
        }
        return geometry;
    },

    isVersionSupported: function(version, callback) {
        DRACOLoader.getDecoderModule()
            .then( function ( module ) {
              callback( module.decoder.isVersionSupported( version ) );
            });
    },

    getAttributeOptions: function(attributeName) {
        if (typeof this.attributeOptions[attributeName] === 'undefined')
          this.attributeOptions[attributeName] = {};
        return this.attributeOptions[attributeName];
    }
};

DRACOLoader.decoderPath = './';
DRACOLoader.decoderConfig = {};
DRACOLoader.decoderModulePromise = null;

/**
 * Sets the base path for decoder source files.
 * @param {string} path
 */
DRACOLoader.setDecoderPath = function ( path ) {
  DRACOLoader.decoderPath = path;
};

/**
 * Sets decoder configuration and releases singleton decoder module. Module
 * will be recreated with the next decoding call.
 * @param {Object} config
 */
DRACOLoader.setDecoderConfig = function ( config ) {
  let wasmBinary = DRACOLoader.decoderConfig.wasmBinary;
  DRACOLoader.decoderConfig = config || {};
  DRACOLoader.releaseDecoderModule();

  // Reuse WASM binary.
  if ( wasmBinary ) DRACOLoader.decoderConfig.wasmBinary = wasmBinary;
};

/**
 * Releases the singleton DracoDecoderModule instance. Module will be recreated
 * with the next decoding call.
 */
DRACOLoader.releaseDecoderModule = function () {
  DRACOLoader.decoderModulePromise = null;
};

/**
 * Gets WebAssembly or asm.js singleton instance of DracoDecoderModule
 * after testing for browser support. Returns Promise that resolves when
 * module is available.
 * @return {Promise<{decoder: DracoDecoderModule}>}
 */
DRACOLoader.getDecoderModule = function () {
  let scope = this;
  let path = DRACOLoader.decoderPath;
  let config = DRACOLoader.decoderConfig;
  let promise = DRACOLoader.decoderModulePromise;

  if ( promise ) return promise;

  // Load source files.
  if ( typeof DracoDecoderModule !== 'undefined' ) {
    // Loaded externally.
    promise = Promise.resolve();
  } else if ( typeof WebAssembly !== 'object' || config.type === 'js' ) {
    // Load with asm.js.
    promise = DRACOLoader._loadScript( path + 'draco_decoder.js' );
  } else {
    // Load with WebAssembly.
    config.wasmBinaryFile = path + 'draco_decoder.wasm';
    promise = DRACOLoader._loadScript( path + 'draco_wasm_wrapper.js' )
        .then( function () {
          return DRACOLoader._loadArrayBuffer( config.wasmBinaryFile );
        } )
        .then( function ( wasmBinary ) {
          config.wasmBinary = wasmBinary;
        } );
  }

  // Wait for source files, then create and return a decoder.
  promise = promise.then( function () {
    return new Promise( function ( resolve ) {
      config.onModuleLoaded = function ( decoder ) {
        scope.timeLoaded = performance.now();
        // Module is Promise-like. Wrap before resolving to avoid loop.
        resolve( { decoder: decoder } );
      };
      // eslint-disable-next-line no-undef
      DracoDecoderModule( config );
    } );
  } );

  DRACOLoader.decoderModulePromise = promise;
  return promise;
};

/**
 * @param {string} src
 * @return {Promise}
 */
DRACOLoader._loadScript = function ( src ) {
  let prevScript = document.getElementById( 'decoder_script' );
  if ( prevScript !== null ) {
    prevScript.parentNode.removeChild( prevScript );
  }
  let head = document.getElementsByTagName( 'head' )[ 0 ];
  let script = document.createElement( 'script' );
  script.id = 'decoder_script';
  script.type = 'text/javascript';
  script.src = src;
  return new Promise( function ( resolve ) {
    script.onload = resolve;
    head.appendChild( script );
  });
};

/**
 * @param {string} src
 * @return {Promise}
 */
DRACOLoader._loadArrayBuffer = function ( src ) {
  let loader = new FileLoader();
  loader.setResponseType( 'arraybuffer' );
  return new Promise( function( resolve, reject ) {
    loader.load( src, resolve, undefined, reject );
  });
};

export { DRACOLoader };