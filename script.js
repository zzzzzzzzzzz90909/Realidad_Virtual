/* global AFRAME, TWEEN */

AFRAME.registerComponent('robot-controller', {
  init: function () {
    this.robot = null;
    this.box = document.querySelector('#box-to-move').object3D;
    this.isHoldingBox = false;

    // --- ¡IMPORTANTE! Nombres de las articulaciones ---
    // Estos nombres pueden variar dependiendo de tu archivo .glb.
    // Si la animación no funciona, tendrás que encontrar los nombres correctos.
    // Mira la sección "Cómo encontrar los nombres" más abajo.
    this.jointNames = [
      'Base_Link', // Gira en Y
      'Link_1',    // Gira en X
      'Link_2',    // Gira en X
      'Link_3',    // Gira en Y
      'Link_4',    // Gira en X
      'Link_5',    // Gira en Y
      'Link_6_Flange' // La "pinza" o punto final
    ];
    this.joints = {};

    const robotEntity = document.querySelector('#robot');
    robotEntity.addEventListener('model-loaded', this.onModelLoaded.bind(this));

    // Funcionalidad de los botones
    document.querySelector('#btn-pickup').addEventListener('click', this.startAnimation.bind(this));
    document.querySelector('#btn-reset').addEventListener('click', this.resetPosition.bind(this));
  },

  onModelLoaded: function (e) {
    this.robot = e.detail.model; // THREE.Group
    console.log("Modelo del robot cargado.", this.robot);

    // Buscar y guardar las articulaciones por su nombre
    this.robot.traverse(node => {
      if (this.jointNames.includes(node.name)) {
        console.log(`Articulación encontrada: ${node.name}`);
        this.joints[node.name] = node;
      }
    });

    // Validar que se encontraron las articulaciones
    if (Object.keys(this.joints).length !== this.jointNames.length) {
      console.error("¡Alerta! No se encontraron todas las articulaciones. Verifica los nombres en `this.jointNames`.");
    }
  },

  // Función para crear una animación (un "tween")
  createTween: function (joint, to, duration = 1000) {
    const from = { x: joint.rotation.x, y: joint.rotation.y, z: joint.rotation.z };
    const toRad = {
      x: THREE.MathUtils.degToRad(to.x ?? THREE.MathUtils.radToDeg(from.x)),
      y: THREE.MathUtils.degToRad(to.y ?? THREE.MathUtils.radToDeg(from.y)),
      z: THREE.MathUtils.degToRad(to.z ?? THREE.MathUtils.radToDeg(from.z)),
    };

    return new TWEEN.Tween(from)
      .to(toRad, duration)
      .onUpdate(() => {
        joint.rotation.set(from.x, from.y, from.z);
      })
      .easing(TWEEN.Easing.Quadratic.InOut);
  },
  
  // Secuencia principal de animación
  startAnimation: function () {
    if (!this.robot || this.isHoldingBox) return;
    
    // --- Definición de la secuencia de movimientos ---
    // 1. Moverse sobre la caja
    const moveToBox = [
      this.createTween(this.joints.Base_Link, { y: -65 }),
      this.createTween(this.joints.Link_1, { x: -45 }),
      this.createTween(this.joints.Link_2, { x: 70 }),
      this.createTween(this.joints.Link_3, { y: 0 }),
      this.createTween(this.joints.Link_4, { x: -115 }),
      this.createTween(this.joints.Link_5, { y: 0 }),
    ];

    // 2. Bajar para recoger
    const grabBox = [
      this.createTween(this.joints.Link_1, { x: -30 }),
      this.createTween(this.joints.Link_2, { x: 45 }),
    ];

    // 3. Moverse a la zona de destino
    const moveToDropzone = [
      this.createTween(this.joints.Base_Link, { y: 65 }),
      this.createTween(this.joints.Link_1, { x: -45 }),
      this.createTween(this.joints.Link_2, { x: 70 }),
    ];
    
    // 4. Bajar para soltar
    const releaseBox = [
        this.createTween(this.joints.Link_1, { x: -30 }),
        this.createTween(this.joints.Link_2, { x: 45 }),
    ];

    // --- Encadenar todas las animaciones ---
    const allTweens = [...moveToBox, ...grabBox, ...moveToDropzone, ...releaseBox];
    
    // Conectar "onComplete" para que se ejecuten en orden
    for (let i = 0; i < allTweens.length - 1; i++) {
        allTweens[i].chain(allTweens[i + 1]);
    }
    
    // Acciones especiales en puntos clave de la animación
    grabBox[0].onStart(() => {
      console.log("Agarrando la caja...");
      const gripper = this.joints['Link_6_Flange'];
      gripper.attach(this.box); // ¡La magia ocurre aquí!
      this.isHoldingBox = true;
    });
    
    releaseBox[0].onStart(() => {
      console.log("Soltando la caja...");
      this.el.sceneEl.object3D.attach(this.box); // La devolvemos a la escena
      this.isHoldingBox = false;
    });

    // Iniciar la primera animación de la cadena
    moveToBox[0].start();
  },
  
  resetPosition: function () {
    if (!this.robot) return;
    
    // Mover caja a su posición original si no la estamos sujetando
    if (!this.isHoldingBox) {
        this.box.position.set(-1.5, 0.25, 1);
        this.box.rotation.set(0, 0, 0);
    }
    
    // Crear tweens para volver a la posición inicial (0, 0, 0)
    const resetTweens = Object.values(this.joints).map(joint => 
        this.createTween(joint, { x: 0, y: 0, z: 0 }, 1500)
    );
    
    // Iniciar todas las animaciones de reseteo a la vez
    resetTweens.forEach(tween => tween.start());
  },
  
  // Necesario para que TWEEN funcione en cada frame
  tick: function (time, timeDelta) {
    TWEEN.update(time);
  }
});
