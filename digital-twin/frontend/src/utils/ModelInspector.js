// Lightweight ModelInspector utilities used by TruckScene components.
// These provide non-breaking, console-friendly inspection helpers.

export function inspectModel(gltfOrScene) {
  const scene = gltfOrScene?.scene || gltfOrScene;
  const nodes = [];
  if (scene && typeof scene.traverse === 'function') {
    scene.traverse((child) => {
      nodes.push({ name: child.name || child.type, type: child.type, uuid: child.uuid });
    });
  }
  return { nodes, nodeCount: nodes.length };
}

export function logModelStructure(gltfOrScene) {
  const scene = gltfOrScene?.scene || gltfOrScene;
  if (!scene) {
    console.log('logModelStructure: no scene provided');
    return;
  }

  function walk(obj, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}${obj.name || obj.type}`);
    (obj.children || []).forEach((c) => walk(c, depth + 1));
  }

  walk(scene, 0);
}

export function printSceneTree(gltfOrScene) {
  // Alias for logModelStructure to match existing usage in the codebase.
  logModelStructure(gltfOrScene);
}
