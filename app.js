import * as THREE from './libs/three125/three.module.js';
import { GLTFLoader } from './libs/three125/GLTFLoader.js';
import { RGBELoader } from './libs/three125/RGBELoader.js';
import { ARButton } from './libs/ARButton.js';
import { LoadingBar } from './libs/LoadingBar.js';
import { Player } from './libs/Player.js';
import { ControllerGestures } from './libs/three125/ControllerGestures.js'; 

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
        this.scene.add(light);
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );
        this.setEnvironment();
        
        this.workingVec3 = new THREE.Vector3();

        // this.isMove = true;

        // this.isMove = this.addButtonEvents(this.isMove);
        
        this.initScene();
        this.setupXR();
        // this.addButtonEvents();
		
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
	
    resize(){ 
        this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }

    // set speed(name){
    //     if (this.actionName == name) return;
        
    //     const clip = this.animations[name];
        
    //     if (clip!==undefined){
    //         const action = this.mixer.clipAction( clip );
            
    //         if (name=='Die'){
    //             action.loop = THREE.LoopOnce;
    //             action.clampWhenFinished = true;
    //         }
            
    //         this.actionName = name;
    //         if (this.curAction) this.curAction.crossFadeTo(action, 0.5);
            
    //         action.enabled = true;
    //         action.play();
            
    //         this.curAction = action;
    //     }
    // }

    // addButtonEvents(){

    //     function onClick(){
    //         const self = this;

    //         function onClick(){
    //             self.speed = this.innerHTML;    
    //         }
    //     }

    //     const btn = document.getElementById('dir');
    //     btn.addEventListener('click', onClick);
        
    //     // for(let i=1; i<=4; i++){
    //     //     const btn = document.getElementById(`btn${i}`);
    //     //     btn.addEventListener( 'click', onClick );
    //     // }    
    // }
    
    loadKnight(){
	    const loader = new GLTFLoader().setPath(this.assetsPath);
		const self = this;
		
		// Load a GLTF resource
		loader.load(
			// resource URL
			`spiderbot.glb`,
			// called when the resource is loaded
			function ( gltf ) {
				// const object = gltf.scene.children[5];

                const object = gltf.scene;
				
				const options = {
					object: object,
					speed: 0.5,
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
				
				self.knight.action = 'armature|rummage';
				const scale = 0.6;
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
            new THREE.RingBufferGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
            new THREE.MeshBasicMaterial()
        );
        
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add( this.reticle );
        
        this.loadKnight();

        // this.addButtonEvents();

        this.isMove = true;
        // this.isMove = this.addButtonEvents(this.isMove);
        // console.log(this.isMove);

        this.addButtonEvents();
    }

    addButtonEvents(){
        const self = this;
        
        function onClick(){
            // console.log(self.isMove);
            // self.isMove = !self.isMove;
            // btn.style.display = "block";

            if (self.isMove === true) {
                self.isMove = false;
                btn.style.display = 'block';
            }

            else {
                self.isMove = true;
                btn.style.display = 'none';
            }
            // console.log(self.isMove);
        }

        const btn = document.getElementById('hitt');
        btn.addEventListener('click', onClick);
        
        // for(let i=1; i<=4; i++){
        //     const btn = document.getElementById(`btn${i}`);
        //     btn.addEventListener( 'click', onClick );
        // }    
    }
    
    setupXR(){
        this.renderer.xr.enabled = true;
        
        const btn = new ARButton( this.renderer, { sessionInit: { requiredFeatures: [ 'hit-test' ], optionalFeatures: [ 'dom-overlay' ], domOverlay: { root: document.body } } } );
    
        const self = this;

        this.gestures = new ControllerGestures( this.renderer );

        this.hitTestSourceRequested = false;
        this.hitTestSource = null;

        let isIdle = true;
        
        function onSelect() {
            if (self.knight===undefined) return;
            
            if (self.reticle.visible){
                if (self.knight.object.visible){
                    self.workingVec3.setFromMatrixPosition( self.reticle.matrix );
                    self.knight.newPath(self.workingVec3);
                    document.getElementById('hitt').click();
                    isIdle = true;
                }else{
                    self.knight.object.position.setFromMatrixPosition( self.reticle.matrix );
                    // self.knight.object.position.y = 0.1;
                    self.knight.object.visible = true;
                    document.getElementById('hitt').click();
                    // this.btn.click();
                }
            }
        }

        this.gestures.addEventListener( 'doubletap', (ev)=>{
            // console.log('doubletap');

            if(isIdle == true){
                self.knight.action = 'armature|flight';
                self.knight.object.position.y += 0.1;
                isIdle = false;
            }
            else{
                self.knight.action = 'armature|rummage'
                self.knight.object.position.y -= 0.1;
                isIdle = true;
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

        // let isMove = false;

        // dirButton.onclick = function switchMode(){
        //     if (isMove == false) {
        //         isMove = true;
        //         dirButton.textContent = 'Stop Directions';
        //     }
        //     else {
        //         isMove = false;
        //         console.log("isMove change")
        //         dirButton.textContent = 'Give Directions';
        //     }
        // }

        if ( hitTestResults.length && this.isMove == true ) {
            
            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const hit = hitTestResults[ 0 ];
            const pose = hit.getPose( referenceSpace );

            // console.log(this.isMove);

            this.reticle.visible = true;
            this.reticle.matrix.fromArray( pose.transform.matrix );

            // if (this.knight.object.visible == false) {
            //     const referenceSpace = this.renderer.xr.getReferenceSpace();
            //     const hit = hitTestResults[ 0 ];
            //     const pose = hit.getPose( referenceSpace );

            //     this.reticle.visible = true;
            //     this.reticle.matrix.fromArray( pose.transform.matrix );
            // }

            // if (this.knight.object.visible == true) {
            //     if (isMove == true) {
            //         const referenceSpace = this.renderer.xr.getReferenceSpace();
            //         const hit = hitTestResults[ 0 ];
            //         const pose = hit.getPose( referenceSpace );

            //         this.reticle.visible = true;
            //         this.reticle.matrix.fromArray( pose.transform.matrix );
            //     }
            //     else {
            //         this.reticle.visible = false;
            //     }
            // }

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
        
        if ( frame ) {

            // console.log(this.isMove);
            // this.isMove = true;
            // this.isMove = this.addButtonEvents(this.isMove);
            if ( this.hitTestSourceRequested === false ) this.requestHitTestSource( )

            // if ( this.isMove == true ) this.requestHitTestSource( );

            if ( this.hitTestSource ) this.getHitTestResults( frame );

        }

        this.renderer.render( this.scene, this.camera );
        
        /*if (this.knight.calculatedPath && this.knight.calculatedPath.length>0){
            console.log( `path:${this.knight.calculatedPath[0].x.toFixed(2)}, ${this.knight.calculatedPath[0].y.toFixed(2)}, ${this.knight.calculatedPath[0].z.toFixed(2)} position: ${this.knight.object.position.x.toFixed(2)}, ${this.knight.object.position.y.toFixed(2)}, ${this.knight.object.position.z.toFixed(2)}`);
        }*/
    }
}

export { App };
