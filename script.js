/* global AFRAME, TWEEN, THREE */

AFRAME.registerComponent('robot-controller', {
  init: function () {
    this.sceneEl = this.el;
    this.robot = null;
    this.joints = [];
    this.boxQueue = [];
    this.placedBoxCount = 0;
    this.isProcessRunning = false;
    
    // --- PUNTOS CLAVE DE LA ESCENA ---
    this.pickupPosition = new THREE.Vector3(-1.8, 0.9, 0); // Donde el robot recoge la caja
    this.conveyorStartPosition = new THREE.Vector3(-1.8, 0.9, 1.4); // Donde aparece la caja
    
    // Posiciones en el palé para apilar 4 cajas
    this.palletPositions = [
        new THREE.Vector3(1.5, 0.22, -1.2),
        new THREE.Vector3(2.1, 0.22, -1.2),
        new THREE.Vector3(1.5, 0.22, -1.8),
        new THREE.Vector3(2.1, 0.22, -1.8),
    ];

    const robotEntity = document.querySelector('#robot');
    robotEntity.addEventListener('model-loaded', this.onModelLoaded.bind(this));
  },

  onModelLoaded: function (e) {
    this.robot = e.detail.model;
    console.log("Modelo del robot cargado. Buscando articulaciones...");

    this.robot.traverse(node => {
      if (node.isMesh && node.parent.name.includes('Link')) {
         if (!this.joints.includes(node.parent)) {
            this.joints.push(node.parent);
         }
      }
    });

    console.log(`Se encontraron ${this.joints.length} articulaciones.`);
    if (this.joints.length < 6) {
      console.error("No se encontraron suficientes articulaciones.");
      return;
    }
    
    console.log("Iniciando proceso industrial...");
    this.startProcess();
  },
  
  startProcess: function() {
    if (this.placedBoxCount >= this.palletPositions.length) {
        console.log("Proceso completado. Palé lleno.");
        return;
    }
    this.isProcessRunning = true;
    this.spawnAndMoveBoxOnConveyor();
  },

  spawnAndMoveBoxOnConveyor: function() {
    const boxEl = document.createElement('a-box');
    boxEl.setAttribute('color', '#B5651D');
    boxEl.setAttribute('width', 0.4);
    boxEl.setAttribute('height', 0.4);
    boxEl.setAttribute('depth', 0.4);
    boxEl.setAttribute('position', this.conveyorStartPosition);
    boxEl.setAttribute('shadow', 'cast: true');
    this.sceneEl.appendChild(boxEl);
    this.boxQueue.push(boxEl);

    // Animar la caja moviéndose por la cinta
    new TWEEN.Tween(boxEl.object3D.position)
      .to(this.pickupPosition, 3000) // 3 segundos de viaje
      .easing(TWEEN.Easing.Linear.None)
      .onComplete(() => {
        // Cuando la caja llega, el robot la recoge
        this.pickupAndPlaceBox();
      })
      .start();
  },

  pickupAndPlaceBox: function() {
    const [base, link1, link2, link3, link4, link5, gripper] = this.joints;
    const targetPalletPos = this.palletPositions[this.placedBoxCount];
    const currentBox = this.boxQueue.shift();

    // 1. Moverse sobre la caja en la cinta
    const moveToPickup = this.createTween(base, { y: -90 })
        .chain(this.createTween(link1, { x: -35 }))
        .chain(this.createTween(link2, { x: 50 }))
        .chain(this.createTween(link4, { x: -90 }));

    // 2. Bajar para recoger
    const grab = this.createTween(link1, { x: -20 })
        .chain(this.createTween(link2, { x: 35 }));
        
    // 3. Moverse a la zona del palé
    const moveToPallet = this.createTween(base, { y: 90 }, 2000)
        .chain(this.createTween(link1, { x: -35 }))
        .chain(this.createTween(link2, { x: 50 }));

    // 4. Bajar para soltar
    const release = this.createTween(link1, { x: -20 })
        .chain(this.createTween(link2, { x: 35 }));
        
    // 5. Volver a casa
    const returnHome = this.createTween(base, { y: 0 })
        .chain(this.createTween(link1, { x: 0 }))
        .chain(this.createTween(link2, { x: 0 }))
        .chain(this.createTween(link4, { x: 0 }));

    // --- Encadenar secuencias y acciones ---
    moveToPickup.chain(grab);
    grab.chain(moveToPallet);
    moveToPallet.chain(release);
    release.chain(returnHome);

    grab.onStart(() => gripper.attach(currentBox.object3D));
    release.onStart(() => {
        this.sceneEl.object3D.attach(currentBox.object3D);
        currentBox.object3D.position.copy(targetPalletPos); // Posición final precisa
    });
    returnHome.onComplete(() => {
        this.placedBoxCount++;
        this.startProcess(); // Inicia el ciclo para la siguiente caja
    });
    
    moveToPickup.start();
  },

  createTween: function (joint, to, duration = 1200) {
    const from = { x: joint.rotation.x, y: joint.rotation.y, z: joint.rotation.z };
    const toRad = {
      x: THREE.MathUtils.degToRad(to.x ?? THREE.MathUtils.radToDeg(from.x)),
      y: THREE.MathUtils.degToRad(to.y ?? THREE.MathUtils.radToDeg(from.y)),
      z: THREE.MathUtils.degToRad(to.z ?? THREE.MathUtils.radToDeg(from.z)),
    };
    return new TWEEN.Tween(from)
      .to(toRad, duration)
      .onUpdate(() => { joint.rotation.set(from.x, from.y, from.z); })
      .easing(TWEEN.Easing.Quadratic.InOut);
  },
  
  tick: function (time) {
    TWEEN.update(time);
  }
});
