/* global AFRAME, THREE */

AFRAME.registerComponent('robot-controller', {
  init: function () {
    const robotEntity = document.querySelector('#robot');
    console.log("Esperando a que el modelo del robot se cargue para inspeccionarlo...");

    robotEntity.addEventListener('model-loaded', (e) => {
      const model = e.detail.model;
      console.log("¡Modelo cargado! Abajo está la estructura completa. Busca los nombres de las partes móviles (deberían llamarse 'Link', 'Joint', 'Axis' o similar).");

      // Esta línea imprime el objeto 3D completo en la consola.
      // Es interactivo, puedes hacer clic para expandir y ver todas las partes.
      console.log(model);

      console.log("\n--- LISTA DE TODAS LAS PARTES ---");
      let hierarchy = '';
      model.traverse(node => {
        let indent = '';
        let current = node;
        while (current.parent) {
          indent += '  ';
          current = current.parent;
        }
        hierarchy += `${indent}- Nombre: "${node.name}", Tipo: "${node.type}"\n`;
      });
      console.log(hierarchy);
      console.log("--- FIN DE LA LISTA ---");
      console.log("\nINSTRUCCIÓN: Copia la lista de arriba y pégamela en el chat para poder reparar la animación.");
    });
  },
});
