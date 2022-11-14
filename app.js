// import * as THREE from './libs/three125/three.module.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.125.2/build/three.module.js';
// import { GLTFLoader } from './libs/three125/GLTFLoader.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.125.2/examples/jsm/loaders/GLTFLoader.js';
// import { RGBELoader } from './libs/three125/RGBELoader.js';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.125.2/examples/jsm/loaders/RGBELoader.js';
import { ARButton } from './libs/ARButton.js';
import { LoadingBar } from './libs/LoadingBar.js';
import { Player } from './libs/Player.js';
import { ControllerGestures } from './libs/ControllerGestures.js'; 

class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
        this.clock = new THREE.Clock();
        
        this.loadingBar = new LoadingBar();

		this.assetsPath = './assets/';
        
		this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );
		this.camera.position.set( 0, 1.6, 3 );
        
		this.scene = new THREE.Scene();

		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 2);
        ambient.position.set( 0.5, 1, 0.25 );
		this.scene.add(ambient);
        
        const light = new THREE.DirectionalLight();
        light.position.set( 0.2, 1, 1);
        light.castShadow = true;
        this.scene.add(light);
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );
        this.setEnvironment();
        
        this.workingVec3 = new THREE.Vector3();
        
        this.initScene();
        this.setupXR();
        
        this.shadowMap();
		
		window.addEventListener('resize', this.resize.bind(this));
        
	}
    
    setEnvironment(){
        const loader = new RGBELoader().setDataType( THREE.UnsignedByteType );
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
        
        const self = this;
        
        loader.load( './assets/hdr/venice_sunset_1k.hdr', ( texture ) => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          self.scene.environment = envMap;

        }, undefined, (err)=>{
            console.error( 'An error occurred setting the environment');
        } );
    }

    shadowMap(){
        const loader_ = new THREE.TextureLoader();
        const shadowTexture = loader_.load('./assets/roundshadow.png');

        const planeSize = 1;
        const shadowGeo = new THREE.PlaneBufferGeometry(planeSize, planeSize);

        // add the shadow to the base
        // note: we make a new material for each sphere
        // so we can set that sphere's material transparency
        // separately.
        const shadowMat = new THREE.MeshBasicMaterial({
            map: shadowTexture,
            transparent: true,    // so we can see the ground
            depthWrite: false,    // so we don't have to sort
        });

        this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadowMesh.position.y = 0.001;  // so we're above the ground slightly
        this.shadowMesh.rotation.x = Math.PI * -.5;
        const shadowSize = 0.3;
        this.shadowMesh.scale.set(shadowSize, shadowSize, shadowSize);
        this.shadowMesh.material.opacity = 1.0;
        this.shadowMesh.visible = false;
        this.scene.add(this.shadowMesh);
    }
	
    resize(){ 
        this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }
    
    loadKnight(){
	    const loader = new GLTFLoader().setPath(this.assetsPath);
		const self = this;
		
		// Load a GLTF resource
		loader.load(
			// resource URL
			`scene.glb`,
			// called when the resource is loaded
			function ( gltf ) {
				// const object = gltf.scene.children[5];

                const object = gltf.scene;
				
				const options = {
					object: object,
					speed: 0.4,
					assetsPath: self.assetsPath,
					loader: loader,
                    animations: gltf.animations,
					clip: gltf.animations[0],
					app: self,
					name: 'knight',
					npc: false
				};
				
				self.knight = new Player(options);
                self.knight.object.visible = false;
				
				self.knight.action = '';
				const scale = 0.1;
				self.knight.object.scale.set(scale, scale, scale); 
				
                self.loadingBar.visible = false;
                self.renderer.setAnimationLoop( self.render.bind(self) );//(timestamp, frame) => { self.render(timestamp, frame); } );
			},
			// called while loading is progressing
			function ( xhr ) {

				self.loadingBar.progress = (xhr.loaded / xhr.total);

			},
			// called when loading has errors
			function ( error ) {

				console.log( 'An error happened' );

			}
		);
	}		
    
    initScene(){
        this.reticle = new THREE.Mesh(
            new THREE.RingBufferGeometry( 0.07, 0.09, 32 ).rotateX( - Math.PI / 2 ),
            new THREE.MeshBasicMaterial()
        );
        
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add( this.reticle );
        
        this.loadKnight();

        this.isMove = true;

        this.addButtonEvents();
    }

    addButtonEvents(){
        const self = this;
        
        function onClick(){

            if (self.isMove === true) {
                self.isMove = false;
                self.btn.style.display = 'block';
            }

            else {
                self.isMove = true;
                self.btn.style.display = 'none';
            }
            // console.log(self.isMove);
        }

        self.btn = document.getElementById('hitt');
        self.btn.addEventListener('click', onClick);
          
    }
    
    setupXR(){
        this.renderer.xr.enabled = true;
        
        const btn = new ARButton( this.renderer, { sessionInit: { requiredFeatures: [ 'hit-test' ], optionalFeatures: [ 'dom-overlay' ], domOverlay: { root: document.body } } } );
    
        const self = this;

        this.gestures = new ControllerGestures( this.renderer );

        this.hitTestSourceRequested = false;
        this.hitTestSource = null;

        let isIdle, isJump, isAttack;
        
        function onSelect() {
            if (self.knight===undefined) return;
            
            if (self.reticle.visible){
                if (self.knight.object.visible){
                    self.workingVec3.setFromMatrixPosition( self.reticle.matrix );
                    self.knight.newPath(self.workingVec3);
                    document.getElementById('hitt').click();
                }else{
                    self.knight.object.position.setFromMatrixPosition( self.reticle.matrix );
                    self.shadowMesh.position.setFromMatrixPosition( self.reticle.matrix );
                    self.knight.object.visible = true;
                    self.shadowMesh.visible = true;
                    self.knight.action = '03_sphere_bot_open';
                    document.getElementById('hitt').click();
                    isIdle = true;
                    isJump = false;
                    isAttack = false;
                }
            }
        }

        this.gestures.addEventListener( 'tap', (ev)=>{
            if (isIdle == false) {
                // self.knight.mixer.stopAllAction();
                self.knight.action = '06_sphere_bot_run_attack';
                isIdle = true;
                isJump = false;
                isAttack = false;
                this.btn.disabled = false;
            }
        });

        this.gestures.addEventListener( 'doubletap', (ev)=>{
            // console.log('doubletap');
            // self.knight.action = '07_sphere_bot_jump';

            if(isAttack == false){
                self.knight.action = '04_sphere_bot_attack';
                isJump = false;
                isIdle = false;
                isAttack = true;
                this.btn.disabled = true;
            }
        });

        this.gestures.addEventListener( 'swipe', (ev)=>{
            console.log( ev.direction );

            if (ev.direction == 'UP' && isJump == false) {
                self.knight.action = '07_sphere_bot_jump';
                isJump = true;
                isIdle = false;
                isAttack = false;
                this.btn.disabled = true;
            }
        });

        this.gestures.addEventListener( 'pan', (ev)=>{
            //console.log( ev );
            if (self.isMove === true) {return}

            if (ev.initialise !== undefined){
                self.startPosition = self.knight.object.position.clone();
            }else{
                self.knight.object.rotateY( ev.delta.x * 3 );
            } 
        });

        this.gestures.addEventListener( 'pinch', (ev)=>{
            if (self.isMove === true) {return}

            if (ev.initialise !== undefined){
                self.startScale = self.knight.object.scale.clone();
            }else{
                const scale = self.startScale.clone().multiplyScalar(ev.scale);
                self.knight.object.scale.copy( scale );
            }
        });

        this.controller = this.renderer.xr.getController( 0 );
        this.controller.addEventListener( 'select', onSelect );
        
        this.scene.add( this.controller );  
    }
    
    requestHitTestSource(){
        const self = this;
        
        const session = this.renderer.xr.getSession();

        session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {
            
            session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {

                self.hitTestSource = source;

            } );

        } );

        session.addEventListener( 'end', function () {

            self.hitTestSourceRequested = false;
            self.hitTestSource = null;
            self.referenceSpace = null;

        } );

        this.hitTestSourceRequested = true;

    }
    
    getHitTestResults( frame ){

        const hitTestResults = frame.getHitTestResults( this.hitTestSource );

        // console.log(this.isMove);

        if ( hitTestResults.length && this.isMove === true ) {
            
            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const hit = hitTestResults[ 0 ];
            const pose = hit.getPose( referenceSpace );

            this.reticle.visible = true;
            this.reticle.matrix.fromArray( pose.transform.matrix );

        }
        else {

            this.reticle.visible = false;
        }

    }

    render( timestamp, frame ) {
        const dt = this.clock.getDelta();

        // console.log(this.isMove);

        if ( this.renderer.xr.isPresenting ){
            this.gestures.update();
            // this.ui.update();
        }

        if (this.knight) this.knight.update(dt);

        this.shadowMesh.position.setFromMatrixPosition( this.knight.object.matrix );
        // this.shadowMesh.material.opacity = Math.abs(1.5/this.knight.object.position.y);
        // console.log(Math.abs(this.knight.object.));

        if ( frame ) {

            if ( this.hitTestSourceRequested === false ) this.requestHitTestSource( )

            if ( this.hitTestSource ) this.getHitTestResults( frame );

        }

        this.renderer.render( this.scene, this.camera );
    }
}

export { App };
