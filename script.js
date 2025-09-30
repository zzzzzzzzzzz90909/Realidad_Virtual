/* global AFRAME, TWEEN, THREE */

AFRAME.registerComponent('robot-controller', {
  init: function () {
    this.robot = null;
    this.box = document.querySelector('#box-to-move').object3D;
    this.isAnimationRunning = false;
    this.joints = []; // Usaremos un array para mantener el orden

    const robotEntity = document.querySelector('#robot');
    robotEntity.addEventListener('model-loaded', this.onModelLoaded.bind(this));
  },

  onModelLoaded: function (e) {
    this.robot = e.detail.model;
    console.log("Modelo del robot cargado. Buscando articulaciones...");

    // --- BÚSQUEDA AUTOMÁTICA DE ARTICULACIONES ---
    // Este método es más robusto porque no depende de nombres fijos.
    // Busca los objetos principales que contienen las mallas (la geometría visible)
    // en el orden en que aparecen en el archivo GLB.
    this.robot.traverse(node => {
      if (node.isMesh && node.parent.name.includes('Link')) {
         // Evita duplicados y añade el nodo padre que es el que se debe rotar
         if (!this.joints.includes(node.parent)) {
            this.joints.push(node.parent);
         }
      }
    });

    console.log(`Se encontraron ${this.joints.length} articulaciones.`);
    this.joints.forEach((joint, index) => {
        console.log(`Articulación ${index}: ${joint.name}`);
    });

    // Validar que se encontraron suficientes articulaciones
    if (this.joints.length < 6) {
      console.error("¡Alerta! No se encontraron suficientes articulaciones. El modelo puede tener una estructura inesperada.");
      return;
    }
    
    // Inicia la animación automáticamente después de 1 segundo
    console.log("Iniciando secuencia de animación automática en 1 segundo...");
    setTimeout(() => {
      this.startFullSequence();
    }, 1000);
  },

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
  
  startFullSequence: function () {
    if (this.isAnimationRunning) return;
    this.isAnimationRunning = true;

    // Asignamos las articulaciones encontradas a variables para mayor claridad
    const [base, link1, link2, link3, link4, link5, gripper] = this.joints;

    // --- Secuencia de movimientos ---
    const moveToBox = this.createTween(base, { y: -65 })
      .chain(this.createTween(link1, { x: -45 }))
      .chain(this.createTween(link2, { x: 70 }))
      .chain(this.createTween(link4, { x: -115 }));

    const grabBox = this.createTween(link1, { x: -30 })
      .chain(this.createTween(link2, { x: 45 }));

    const moveToDropzone = this.createTween(base, { y: 65 }, 2000)
      .chain(this.createTween(link1, { x: -45 }))
      .chain(this.createTween(link2, { x: 70 }));
    
    const releaseBox = this.createTween(link1, { x: -30 })
      .chain(this.createTween(link2, { x: 45 }));

    const returnToHome = this.createTween(base, { y: 0 }, 2000)
      .chain(this.createTween(link1, { x: 0 }))
      .chain(this.createTween(link2, { x: 0 }))
      .chain(this.createTween(link4, { x: 0 }));

    // --- Encadenar todas las secuencias ---
    moveToBox.chain(grabBox);
    grabBox.chain(moveToDropzone);
    moveToDropzone.chain(releaseBox);
    releaseBox.chain(returnToHome);
    
    // --- Acciones especiales ---
    grabBox.onStart(() => {
      console.log("Agarrando la caja...");
      gripper.attach(this.box);
    });
    
    releaseBox.onStart(() => {
      console.log("Soltando la caja...");
      this.el.sceneEl.object3D.attach(this.box);
    });
    
    returnToHome.onComplete(() => {
        console.log("Secuencia completada.");
        this.isAnimationRunning = false;
    });

    moveToBox.start();
  },
  
  tick: function (time, timeDelta) {
    TWEEN.update(time);
  }
});
