/* global AFRAME, TWEEN, THREE */

AFRAME.registerComponent('robot-controller', {
  init: function () {
    this.robot = null;
    this.box = document.querySelector('#box-to-move').object3D;
    this.isAnimationRunning = false;

    // --- ¡IMPORTANTE! Nombres de las articulaciones ---
    // Estos nombres deben coincidir con los de tu archivo .glb
    this.jointNames = [
      'Base_Link',     // Gira en Y
      'Link_1',        // Gira en X
      'Link_2',        // Gira en X
      'Link_3',        // Gira en Y
      'Link_4',        // Gira en X
      'Link_5',        // Gira en Y
      'Link_6_Flange'  // La "pinza" o punto final
    ];
    this.joints = {};

    const robotEntity = document.querySelector('#robot');
    // Esperamos a que el modelo se cargue para iniciar todo el proceso
    robotEntity.addEventListener('model-loaded', this.onModelLoaded.bind(this));
  },

  onModelLoaded: function (e) {
    this.robot = e.detail.model;
    console.log("Modelo del robot cargado.");

    // Buscar y guardar las articulaciones por su nombre
    this.robot.traverse(node => {
      if (this.jointNames.includes(node.name)) {
        console.log(`Articulación encontrada: ${node.name}`);
        this.joints[node.name] = node;
      }
    });

    // Validar que se encontraron las articulaciones
    if (Object.keys(this.joints).length < this.jointNames.length) {
      console.error("¡Alerta! No se encontraron todas las articulaciones. Revisa los nombres en `this.jointNames`.");
      return;
    }
    
    // Inicia la animación automáticamente después de 1 segundo
    console.log("Iniciando secuencia de animación automática en 1 segundo...");
    setTimeout(() => {
      this.startFullSequence();
    }, 1000);
  },

  // Función para crear una animación (un "tween") para una articulación
  createTween: function (joint, to, duration = 1500) {
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
  
  // Secuencia principal de animación: recoger y soltar
  startFullSequence: function () {
    if (!this.robot || this.isAnimationRunning) return;
    this.isAnimationRunning = true;
    
    // --- Definición de la secuencia de movimientos ---
    // 1. Moverse sobre la caja
    const moveToBox = this.createTween(this.joints.Base_Link, { y: -65 })
      .chain(this.createTween(this.joints.Link_1, { x: -45 }))
      .chain(this.createTween(this.joints.Link_2, { x: 70 }))
      .chain(this.createTween(this.joints.Link_4, { x: -115 }));

    // 2. Bajar para recoger
    const grabBox = this.createTween(this.joints.Link_1, { x: -30 })
      .chain(this.createTween(this.joints.Link_2, { x: 45 }));

    // 3. Moverse a la zona de destino
    const moveToDropzone = this.createTween(this.joints.Base_Link, { y: 65 }, 2000)
      .chain(this.createTween(this.joints.Link_1, { x: -45 }))
      .chain(this.createTween(this.joints.Link_2, { x: 70 }));
    
    // 4. Bajar para soltar
    const releaseBox = this.createTween(this.joints.Link_1, { x: -30 })
      .chain(this.createTween(this.joints.Link_2, { x: 45 }));

    // 5. Volver a la posición de reposo
    const returnToHome = this.createTween(this.joints.Base_Link, { y: 0 }, 2000)
      .chain(this.createTween(this.joints.Link_1, { x: 0 }))
      .chain(this.createTween(this.joints.Link_2, { x: 0 }))
      .chain(this.createTween(this.joints.Link_4, { x: 0 }));

    // --- Encadenar todas las secuencias ---
    moveToBox.chain(grabBox);
    grabBox.chain(moveToDropzone);
    moveToDropzone.chain(releaseBox);
    releaseBox.chain(returnToHome);
    
    // --- Acciones especiales en puntos clave ---
    grabBox.onStart(() => {
      console.log("Agarrando la caja...");
      const gripper = this.joints['Link_6_Flange'];
      gripper.attach(this.box); // La caja se hace hija de la pinza
    });
    
    releaseBox.onStart(() => {
      console.log("Soltando la caja...");
      this.el.sceneEl.object3D.attach(this.box); // La caja vuelve a ser hija de la escena
    });
    
    returnToHome.onComplete(() => {
        console.log("Secuencia completada.");
        this.isAnimationRunning = false;
    });

    // Iniciar la primera animación de toda la cadena
    moveToBox.start();
  },
  
  // Necesario para que TWEEN se actualice en cada frame
  tick: function (time, timeDelta) {
    TWEEN.update(time);
  }
});
